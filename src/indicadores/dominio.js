// A9. Dominio de ítem (H3.4; Modelo 4.3; Arquitectura 4.7 y 6.1; decisión D5).
// Con a aciertos y e presentaciones sin acierto de una unidad (ítem o concepto) y previa uniforme,
// θ | datos ~ Beta(1 + a, 1 + e); la unidad está dominada si P(θ > θ*) > confianza.
// θ* y la confianza vienen de parametros.js y la ficha puede cambiarlos («dominio»).
// Se calcula al cerrar la sesión, acumulando las sesiones previas del niño.
import { PARAMETROS as P, VERSIONES, NOMBRES } from './parametros.js';
import { betaCDF } from './estadistica.js';
import { utilizable, calidadBaja } from './nucleo.js';

// Criterio de la ficha, o el de parametros.js.
export const criterioDe = (ficha) => ({
  thetaEstrella: ficha?.dominio?.thetaEstrella ?? P.dominio.thetaEstrella,
  confianza: ficha?.dominio?.confianza ?? P.dominio.confianza,
});

// Unidad del dominio: el concepto (ACT-02, «dominio.unidad»: "concepto") o el ítem.
export function unidadDe(ficha, itemsPorCodigo = new Map()) {
  if (ficha?.dominio?.unidad === 'concepto') return (r) => itemsPorCodigo.get(r.item)?.concepto ?? r.concepto ?? r.item;
  return (r) => r.item;
}

export const probabilidadDominio = (a, e, thetaEstrella) => 1 - betaCDF(thetaEstrella, 1 + a, 1 + e);

export const dominado = (a, e, { thetaEstrella, confianza }) => probabilidadDominio(a, e, thetaEstrella) > confianza;

// Aciertos consecutivos sin errores necesarios para el criterio (tabla del Modelo 4.3):
// el menor a con P(θ > θ*) = 1 − θ*^(a + 1) > confianza.
export function aciertosNecesarios({ thetaEstrella, confianza }) {
  let a = 0;
  while (!dominado(a, 0, { thetaEstrella, confianza })) a++;
  return a;
}

// Presentaciones que cuentan para el dominio: utilizables y con respuesta (o sin ella, si las
// omisiones cuentan como presentación sin acierto), sin sondas (Catálogo 7.3).
const cuenta = (r) => utilizable(r) && !r.sonda && (P.omisionCuentaComoErrorEnDominio.valor || !r.omision);

// Estado de cada unidad tras las filas dadas, en orden cronológico (las del niño en una actividad).
// Devuelve Map unidad → { a, e, probabilidad, dominado, alcanzado: { sesion_id, bloque, ensayo } | null }.
// «alcanzado» es la primera presentación con la que la unidad cumplió el criterio; una vez
// alcanzado se conserva aunque después haya errores (el ritmo cuenta unidades que lo alcanzan).
export function estadoDeDominio(rows, { unidad = (r) => r.item, criterio = criterioDe(null) } = {}) {
  const estado = new Map();
  for (const r of rows) {
    if (!cuenta(r)) continue;
    const u = unidad(r);
    const s = estado.get(u) ?? { a: 0, e: 0, probabilidad: 0, dominado: false, alcanzado: null };
    if (r.acierto) s.a++;
    else s.e++;
    s.probabilidad = probabilidadDominio(s.a, s.e, criterio.thetaEstrella);
    s.dominado = s.probabilidad > criterio.confianza;
    if (s.dominado && !s.alcanzado) s.alcanzado = { sesion_id: r.sesion_id, bloque: r.bloque, ensayo: r.ensayo };
    estado.set(u, s);
  }
  return estado;
}

// Indicador A9 de una sesión: ritmo de dominio = unidades que alcanzan el criterio en la sesión por
// cada 100 presentaciones contadas de la sesión (Modelo 4.3). previas: filas anteriores del niño en
// la actividad. El mínimo de datos es el propio criterio (Modelo 4.1): el ritmo se reporta con
// cualquier número de presentaciones si la calidad de la sesión alcanza 0.80. Sin intervalo.
export function a9(rows, { previas = [], unidad, criterio, calidad }) {
  const sesion = rows[0]?.sesion_id;
  const estado = estadoDeDominio([...previas, ...rows], { unidad, criterio });
  const nuevos = [...estado.entries()].filter(([, s]) => s.alcanzado?.sesion_id === sesion).map(([u]) => u);
  const n = rows.filter(cuenta).length;
  const motivos = [];
  if (calidad === null || calidad === undefined || calidadBaja(calidad)) motivos.push(calidad == null ? 'la sesión no tiene ensayos para calcular su calidad' : `calidad de la sesión ${calidad.toFixed(2)}, menor de ${P.calidadMinima.valor.toFixed(2)}`);
  if (!n) motivos.push('ninguna presentación cuenta para el dominio');
  const disponible = !motivos.length;
  return {
    id: 'A9',
    nombre: NOMBRES.A9,
    valor: disponible ? (nuevos.length / n) * P.dominio.porCada : null,
    ic: null,
    n,
    disponible,
    motivo: disponible ? null : motivos.join('; '),
    version: VERSIONES.A9,
    nuevos,
    dominados: [...estado.values()].filter((s) => s.alcanzado).length,
    thetaEstrella: criterio?.thetaEstrella ?? P.dominio.thetaEstrella,
    confianza: criterio?.confianza ?? P.dominio.confianza,
  };
}

// Unidades que ya alcanzaron el criterio en las filas dadas (para las sondas y la presentación
// distribuida), con la sesión en que lo alcanzaron.
export const unidadesDominadas = (rows, opciones) =>
  new Map([...estadoDeDominio(rows, opciones).entries()].filter(([, s]) => s.alcanzado).map(([u, s]) => [u, s.alcanzado.sesion_id]));
