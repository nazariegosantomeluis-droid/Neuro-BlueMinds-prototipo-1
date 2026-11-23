// Regla de adaptación (C8, H4.1; Modelo 9.1; Arquitectura 7.2) y señal de regulación (H4.2;
// Modelo 9.2; Arquitectura 7.3). Lógica pura, sin DOM.
//
// La regla solo PROPONE. Según Arquitectura 7.1, una propuesta se ejecuta solo si la envolvente de
// seguridad (C9, H4.3) la permite; mientras la envolvente no exista, ninguna propuesta cambia la
// banda: cada una queda en el registro (adaptacion_propuestas en sesiones.csv) con la regla que la
// produjo, los valores que la activaron y ejecutada = false. Los parámetros vienen de
// src/indicadores/parametros.js y no cambian durante la sesión (Modelo 9.3).
import { PARAMETROS as P, VERSIONES } from './indicadores/parametros.js';
import { utilizable, calidadDeSesion, calidadBaja } from './indicadores/nucleo.js';

const A = P.adaptacion;
const R = P.regulacion;

// Ventanas consecutivas de `tam` ensayos válidos (sin interrupción técnica), en el orden del
// registro. La última, si queda incompleta, no es ventana.
export function ventanas(rows, tam = A.ventana) {
  const vs = rows.filter(utilizable);
  const out = [];
  for (let k = 0; k + tam <= vs.length; k += tam) out.push(vs.slice(k, k + tam));
  return out;
}

const proporciones = (v) => ({
  precision: v.filter((r) => r.acierto).length / v.length,
  omisiones: v.filter((r) => r.omision).length / v.length,
  prematuras: v.filter((r) => r.anticipatoria).length / v.length,
});

// Percentil de tipo 7 (interpolación lineal entre estadísticos de orden; quantile(x, p) en R).
export function percentil(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
}

// Línea base de la señal de regulación de un niño en una actividad: las primeras 5 sesiones válidas
// de la fase 1 (calidad de 0.80 o más), y el percentil 90 de la proporción de omisiones y de
// prematuras en sus ventanas. historial: filas del niño en la actividad, en orden. Sin 5 sesiones
// válidas, null (sin línea base).
export function lineaBaseRegulacion(historial) {
  const ids = [...new Set(historial.filter((r) => r.modo_fase === P.lineaBase.modo).map((r) => r.sesion_id))];
  const validas = ids.filter((id) => !calidadBaja(calidadDeSesion(historial.filter((r) => r.sesion_id === id)) ?? 0)).slice(0, P.lineaBase.sesiones);
  if (validas.length < P.lineaBase.sesiones) return null;
  const vs = validas.flatMap((id) => ventanas(historial.filter((r) => r.sesion_id === id))).map(proporciones);
  return {
    sesiones: validas,
    ventanas: vs.length,
    omisiones: percentil(vs.map((v) => v.omisiones), R.percentil),
    prematuras: percentil(vs.map((v) => v.prematuras), R.percentil),
  };
}

// Señal de regulación en una ventana: 'omisiones', 'prematuras' o null. Con línea base, la
// proporción de la ventana supera el percentil 90 de la línea base; sin ella, 3 o más de 10.
export function senalEnVentana(v, base) {
  const p = proporciones(v);
  if (base) {
    if (p.omisiones > base.omisiones) return 'omisiones';
    if (p.prematuras > base.prematuras) return 'prematuras';
    return null;
  }
  if (v.filter((r) => r.omision).length >= R.sinLineaBaseOmisiones) return 'omisiones';
  if (v.filter((r) => r.anticipatoria).length >= R.sinLineaBasePrematuras) return 'prematuras';
  return null;
}

// Órdenes del terapeuta que son señal de regulación en cualquier caso: un episodio de
// desregulación marcado, o terminar el bloque o la sesión por malestar del niño.
export const ordenDeMalestar = (o) =>
  o.accion === 'episodio_desregulacion' || ((o.accion === 'terminar_bloque' || o.accion === 'terminar_sesion') && o.detalle === R.motivoMalestar);

const REGLA = {
  subir: `Precisión mayor de ${A.subirSiMayorDe} en ${A.ventanasParaSubir} ventanas consecutivas de ${A.ventana} ensayos válidos (Modelo 9.1)`,
  bajar: `Precisión menor de ${A.bajarSiMenorDe} en una ventana de ${A.ventana} ensayos válidos (Modelo 9.1)`,
  mantener: `Precisión entre ${A.bajarSiMenorDe} y ${A.subirSiMayorDe} (Modelo 9.1)`,
  pausa_y_bajar: 'Señal de regulación: ofrecer pausa y bajar una banda; no subir en el resto de la sesión (Modelo 9.2; Arquitectura 7.2 y 7.3)',
};

// Propuestas de la regla para un bloque. rows: los ensayos del bloque, en orden. bandas: ids de la
// ficha, de la más fácil a la más difícil. estado: el de la sesión ({ sinSubir }), que se actualiza.
// base: lineaBaseRegulacion(…) o null. ordenes: órdenes del terapeuta del bloque.
// Después de una propuesta de cambio, la cuenta de ventanas empieza de nuevo (Arquitectura 7.2).
export function proponer(rows, { bandas, estado = { sinSubir: false }, base = null, ordenes = [] }) {
  const out = [];
  const vs = ventanas(rows);
  let seguidas = 0;
  const malestar = ordenes.filter(ordenDeMalestar);
  const usadas = new Set();
  vs.forEach((v, k) => {
    const banda = v[v.length - 1].banda;
    const i = bandas.indexOf(banda);
    const p = proporciones(v);
    const [desde, hasta] = [v[0].ensayo, v[v.length - 1].ensayo];
    const deTerapeuta = malestar.find((o) => !usadas.has(o) && o.ensayo !== null && o.ensayo !== undefined && o.ensayo <= hasta);
    if (deTerapeuta) usadas.add(deTerapeuta);
    const senal = deTerapeuta ? 'terapeuta' : senalEnVentana(v, base);
    let accion;
    let motivo = null;
    if (senal) {
      accion = 'pausa_y_bajar';
      estado.sinSubir = true;
      seguidas = 0;
    } else if (p.precision < A.bajarSiMenorDe) {
      accion = 'bajar';
      seguidas = 0;
    } else if (p.precision > A.subirSiMayorDe) {
      seguidas++;
      if (seguidas >= A.ventanasParaSubir && !estado.sinSubir) {
        accion = 'subir';
        seguidas = 0;
      } else {
        accion = 'mantener';
        motivo = estado.sinSubir ? 'después de una señal de regulación no se sube en esta sesión' : `ventana ${seguidas} de ${A.ventanasParaSubir} sobre ${A.subirSiMayorDe}`;
      }
    } else {
      accion = 'mantener';
      seguidas = 0;
    }
    let propuesta = banda;
    if (accion === 'subir') {
      if (i + 1 < bandas.length) propuesta = bandas[i + 1];
      else [accion, motivo] = ['mantener', 'ya está en la banda más alta'];
    }
    if (accion === 'bajar' || accion === 'pausa_y_bajar') {
      if (i > 0) propuesta = bandas[i - 1];
      else motivo = 'ya está en la banda más baja';
    }
    out.push({
      bloque: v[0].bloque,
      actividad: v[0].actividad,
      ventana: k + 1,
      ensayos: [desde, hasta],
      precision: p.precision,
      omisiones: p.omisiones,
      prematuras: p.prematuras,
      senal,
      criterio_senal: senal === 'terapeuta' ? 'orden del terapeuta' : base ? 'linea_base' : 'sin_linea_base',
      accion,
      motivo,
      regla: REGLA[accion],
      banda_actual: banda,
      banda_propuesta: propuesta,
      ejecutada: false,
      version_regla: VERSIONES.C8,
    });
  });
  // Una orden de malestar después de la última ventana completa (por ejemplo, al terminar el bloque)
  // también es señal: propone pausa y bajar, sin ventana.
  for (const o of malestar.filter((x) => !usadas.has(x))) {
    estado.sinSubir = true;
    const banda = rows[rows.length - 1]?.banda ?? null;
    const i = bandas.indexOf(banda);
    out.push({
      bloque: o.bloque ?? rows[0]?.bloque ?? null,
      actividad: rows[0]?.actividad ?? null,
      ventana: null,
      ensayos: null,
      precision: null,
      omisiones: null,
      prematuras: null,
      senal: 'terapeuta',
      criterio_senal: 'orden del terapeuta',
      accion: 'pausa_y_bajar',
      motivo: i > 0 ? null : 'ya está en la banda más baja',
      regla: REGLA.pausa_y_bajar,
      banda_actual: banda,
      banda_propuesta: i > 0 ? bandas[i - 1] : banda,
      ejecutada: false,
      version_regla: VERSIONES.C8,
    });
  }
  return out;
}

// Por qué una propuesta no se ejecutó: hasta H4.3 (envolvente de seguridad) ninguna se ejecuta.
export const MOTIVO_NO_EJECUTADA = 'La envolvente de seguridad (C9, H4.3) todavía no existe: la regla solo propone y nada cambia la banda.';
