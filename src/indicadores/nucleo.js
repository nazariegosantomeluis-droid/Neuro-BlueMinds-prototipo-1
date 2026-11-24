// Indicadores del núcleo por sesión y actividad: A1 a A8 y A10 (H3.2 y H3.3; Modelo 3 y 4;
// Arquitectura 6). A9 está en dominio.js. Funciones puras: reciben filas del registro por ensayo
// (las columnas del README) y devuelven, por indicador, { id, nombre, valor, ic, n, disponible,
// motivo, version }. Sin disponibilidad, valor e intervalo quedan en null y motivo dice por qué.
//
// Arquitectura 6.1: se calculan al cerrar cada bloque y la sesión, por actividad (Catálogo 8: cada
// indicador por separado en ACT-02 y en ACT-07).
import { PARAMETROS as P, VERSIONES, NOMBRES } from './parametros.js';
import { mediana, mad, wilson, medianaIC, theilSen, bootstrap } from './estadistica.js';

const CONF = P.confianza.valor;

// La calidad es una media de números con decimales: 24/30 puede quedar en 0.7999999999999999. Se
// compara con una tolerancia de 1e-9 para que una calidad de 0.80 exacta cuente como 0.80.
export const calidadBaja = (calidad) => calidad + 1e-9 < P.calidadMinima.valor;

// ---------- Ensayos que entran ----------

// Interrupción técnica (Modelo 3.3; Arquitectura 5.2; decisión R7): pausa, pérdida de foco o fallo
// técnico. Esos ensayos no entran en ningún indicador, pero se conservan en el registro. Los cuadros
// perdidos ya no excluyen el ensayo: bajan su peso de calidad (Modelo 3.4) y, si retrasaron la
// aparición de las opciones, lo sacan de las latencias (aparicionTardia).
export const interrupcionTecnica = (r) => Boolean(r.interrumpido || r.perdida_foco || r.fallo_tecnico);

// Cuadros entre la inserción de las opciones y su aparición en pantalla.
export function cuadrosHastaAparicion(r) {
  if (r.t_opciones == null || r.t_opciones_insercion == null) return null;
  return Math.round((r.t_opciones - r.t_opciones_insercion) / (r.periodo_cuadro_ms || P.periodoCuadroSupuestoMs.valor));
}

// Las opciones aparecieron tarde por cuadros perdidos: más de 2 cuadros (decisión R7).
export const aparicionTardia = (r) => (cuadrosHastaAparicion(r) ?? 0) > P.cuadrosAparicionMaximos.valor;

// Ensayo que entra en los indicadores de la sesión: sin interrupción técnica y, salvo que el
// parámetro diga otra cosa, que no sea una sonda de generalización (Catálogo 7.3).
export const utilizable = (r) => !interrupcionTecnica(r) && (P.sondasEnIndicadoresDeSesion.valor || !r.sonda);

// Tiempo de respuesta del ensayo: corregido si hay latencia del dispositivo; si no, el bruto.
export const rtDe = (r) => r.tr_corregido_ms ?? r.tr_bruto_ms;

// Válido para la latencia (A2, A3, A6 y A7): con respuesta, no anticipatorio, no fuera de tarea y
// con las opciones a tiempo (decisión R7)
// (Modelo 3.3). fuera_de_tarea vacío (menos de 10 ensayos válidos) no excluye.
export const validoLatencia = (r) => utilizable(r) && !r.omision && rtDe(r) > 0 && !r.anticipatoria && r.fuera_de_tarea !== true && !aparicionTardia(r);

const respondio = (r) => r.opcion_elegida !== null && r.opcion_elegida !== undefined && !r.omision;
const error = (r) => respondio(r) && !r.acierto;

// Calidad media de la sesión: media de peso_calidad de sus ensayos (Modelo 3.4). Los ensayos
// interrumpidos por la pausa del terapeuta no entran: la pausa no es un problema de la señal.
export function calidadDeSesion(rows) {
  const ws = rows.filter((r) => !r.interrumpido).map((r) => r.peso_calidad ?? 0);
  return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
}

// ---------- Forma del resultado ----------

function resultado(id, { valor = null, ic = null, n, minimo, calidad, motivoExtra = null, extra = {} }) {
  const motivos = [];
  if (calidad === null || calidad === undefined) motivos.push('la sesión no tiene ensayos para calcular su calidad');
  else if (calidadBaja(calidad)) motivos.push(`calidad de la sesión ${calidad.toFixed(2)}, menor de ${P.calidadMinima.valor.toFixed(2)}`);
  if (minimo && n < minimo.valor) motivos.push(`${n} ${minimo.unidad}; el mínimo es ${minimo.valor}`);
  if (motivoExtra) motivos.push(motivoExtra);
  if (valor === null && !motivos.length) motivos.push('no se pudo calcular');
  const disponible = motivos.length === 0;
  return {
    id,
    nombre: NOMBRES[id],
    valor: disponible ? valor : null,
    ic: disponible ? ic : null,
    n,
    disponible,
    motivo: disponible ? null : motivos.join('; '),
    version: VERSIONES[id],
    ...extra,
  };
}

const semillaDe = (rows, id) => `${rows[0]?.sesion_id ?? ''}:${rows[0]?.actividad ?? ''}:${id}`;

// ---------- A1 a A5 ----------

// A1. Precisión ajustada: PA = (p − 1/G)/(1 − 1/G), intervalo de Wilson sobre p transformado con
// la misma fórmula (Modelo 4.2). Con G distinto entre ensayos, el azar es la media de 1/G.
// Decisión R3 (23 nov 2026): solo los ensayos con respuesta; las omisiones van a A5, que se
// reporta junto a A1 (en el detalle de A1 y en la fila siguiente de indicadores.csv).
export function a1(rows, calidad) {
  const omisiones = rows.filter(utilizable).filter((r) => r.omision).length;
  const us = rows.filter(utilizable).filter((r) => !r.omision);
  const n = us.length;
  const x = us.filter((r) => r.acierto).length;
  const azar = n ? us.reduce((t, r) => t + 1 / r.n_opciones, 0) / n : null;
  const pa = (p) => (p - azar) / (1 - azar);
  const ic = wilson(x, n, CONF);
  return resultado('A1', { valor: n ? pa(x / n) : null, ic: ic && ic.map(pa), n, minimo: P.minimos.A1, calidad, extra: { aciertos: x, azar, omisiones } });
}

// A2. Latencia robusta: LPR = exp(mediana ln RT) (Modelo 3.2). Intervalo por estadísticos de
// orden sobre ln RT, devuelto en ms.
export function a2(rows, calidad) {
  const ls = rows.filter(validoLatencia).map((r) => Math.log(rtDe(r)));
  const m = mediana(ls);
  const ic = medianaIC(ls, CONF);
  return resultado('A2', { valor: m === null ? null : Math.exp(m), ic: ic && ic.map(Math.exp), n: ls.length, minimo: P.minimos.A2, calidad });
}

// A3. Variabilidad: MAD escalada de ln RT (Modelo 3.2). Intervalo por bootstrap (D2).
export function a3(rows, calidad) {
  const ls = rows.filter(validoLatencia).map((r) => Math.log(rtDe(r)));
  const est = (xs) => mad(xs, P.madEscala.valor);
  const ok = ls.length >= P.minimos.A3.valor;
  const ic = ok ? bootstrap([ls], est, { remuestras: P.bootstrap.remuestras, semilla: semillaDe(rows, 'A3'), confianza: CONF }) : null;
  return resultado('A3', { valor: est(ls), ic, n: ls.length, minimo: P.minimos.A3, calidad });
}

function proporcion(id, rows, calidad, cuenta) {
  const us = rows.filter(utilizable);
  const x = us.filter(cuenta).length;
  return resultado(id, { valor: us.length ? x / us.length : null, ic: wilson(x, us.length, CONF), n: us.length, minimo: P.minimos[id], calidad, extra: { casos: x } });
}

// A4. Respuestas prematuras: proporción de ensayos con respuesta anticipatoria (< 150 ms).
export const a4 = (rows, calidad) => proporcion('A4', rows, calidad, (r) => r.anticipatoria);
// A5. Omisiones: proporción de ensayos sin respuesta antes del límite.
export const a5 = (rows, calidad) => proporcion('A5', rows, calidad, (r) => r.omision);

// ---------- A6 ----------

// A6. Pendiente intra-sesión: Theil-Sen de ln RT sobre el tiempo, en minutos desde el primer
// ensayo de la actividad (Modelo 4.2). Necesita 30 ensayos válidos en al menos 5 minutos y solo se
// calcula con la dificultad constante: si la banda cambió, no está disponible.
export function a6(rows, calidad) {
  const vs = rows.filter(validoLatencia).filter((r) => r.t_opciones !== null && r.t_opciones !== undefined);
  const n = vs.length;
  const t0 = n ? Math.min(...vs.map((r) => r.t_opciones)) : 0;
  const x = vs.map((r) => (r.t_opciones - t0) / 60000);
  const y = vs.map((r) => Math.log(rtDe(r)));
  const minutos = n ? Math.max(...x) : 0;
  const bandas = new Set(vs.map((r) => r.banda));
  const extras = [];
  if (n && minutos < P.a6MinutosMinimos.valor) extras.push(`los ensayos abarcan ${minutos.toFixed(1)} min; el mínimo es ${P.a6MinutosMinimos.valor}`);
  if (bandas.size > 1) extras.push('la banda cambió durante la sesión: la pendiente solo se calcula con dificultad constante');
  const ts = n >= 2 ? theilSen(x, y, CONF) : null;
  return resultado('A6', { valor: ts?.pendiente ?? null, ic: ts?.ic ?? null, n, minimo: P.minimos.A6, calidad, motivoExtra: extras.join('; ') || null, extra: { minutos, unidad: P.a6Unidad.valor } });
}

// ---------- A7 y A8 ----------

// Pares de ensayos consecutivos del mismo bloque, ambos utilizables, en el orden del registro.
function pares(rows) {
  const out = [];
  for (let k = 1; k < rows.length; k++) {
    const [a, b] = [rows[k - 1], rows[k]];
    if (a.bloque === b.bloque && a.ensayo + 1 === b.ensayo && utilizable(a) && utilizable(b)) out.push([a, b]);
  }
  return out;
}

// A7. Enlentecimiento tras error: mediana del RT de los aciertos que siguen a un error menos la
// de los aciertos que siguen a un acierto (Modelo 4.2). Error = respuesta incorrecta (una omisión
// no es error). 10 ensayos de cada tipo. Intervalo por bootstrap estratificado (D2).
export function a7(rows, calidad) {
  const ps = pares(rows).filter(([, b]) => b.acierto && validoLatencia(b));
  const tras = (cond) => ps.filter(([a]) => cond(a)).map(([, b]) => rtDe(b));
  const te = tras(error);
  const ta = tras((a) => a.acierto);
  const n = Math.min(te.length, ta.length);
  const est = (e, c) => (e.length && c.length ? mediana(e) - mediana(c) : null);
  const ok = n >= P.minimos.A7.valor;
  const ic = ok ? bootstrap([te, ta], est, { remuestras: P.bootstrap.remuestras, semilla: semillaDe(rows, 'A7'), confianza: CONF }) : null;
  return resultado('A7', { valor: est(te, ta), ic, n, minimo: P.minimos.A7, calidad, extra: { tras_error: te.length, tras_acierto: ta.length } });
}

// A8. Precisión tras error: proporción de aciertos en el ensayo siguiente a un error.
export function a8(rows, calidad) {
  const ps = pares(rows).filter(([a]) => error(a));
  const x = ps.filter(([, b]) => b.acierto).length;
  return resultado('A8', { valor: ps.length ? x / ps.length : null, ic: wilson(x, ps.length, CONF), n: ps.length, minimo: P.minimos.A8, calidad, extra: { aciertos: x } });
}

// ---------- A10 ----------

// A10. Errores perseverativos (Modelo 4.2): una presentación de un ítem cuya presentación anterior
// del mismo ítem fue un error con retroalimentación correctiva es una oportunidad; es perseverativa
// si el niño vuelve a elegir la misma opción incorrecta (opcion_elegida_id). La presentación
// anterior puede ser de una sesión previa (previas: filas anteriores, en orden). Las sondas no tienen
// retroalimentación correctiva y no abren oportunidades. 10 oportunidades; intervalo de Wilson.
export function a10(rows, calidad, { previas = [] } = {}) {
  const ultima = new Map();
  for (const r of previas.filter(utilizable)) ultima.set(r.item, r);
  let oportunidades = 0;
  let perseverativos = 0;
  for (const r of rows.filter(utilizable)) {
    const antes = ultima.get(r.item);
    if (antes && error(antes) && !antes.sonda) {
      oportunidades++;
      if (error(r) && r.opcion_elegida_id === antes.opcion_elegida_id) perseverativos++;
    }
    ultima.set(r.item, r);
  }
  return resultado('A10', {
    valor: oportunidades ? perseverativos / oportunidades : null,
    ic: wilson(perseverativos, oportunidades, CONF),
    n: oportunidades,
    minimo: P.minimos.A10,
    calidad,
    extra: { perseverativos },
  });
}

// ---------- Todos ----------

// rows: los ensayos de una actividad en una sesión (o en un bloque), en orden. calidad: la de toda
// la sesión (calidadDeSesion). previas: ensayos anteriores de la misma actividad y niño (A10).
export function indicadoresDeSesion(rows, { calidad = calidadDeSesion(rows), previas = [] } = {}) {
  return [a1(rows, calidad), a2(rows, calidad), a3(rows, calidad), a4(rows, calidad), a5(rows, calidad), a6(rows, calidad), a7(rows, calidad), a8(rows, calidad), a10(rows, calidad, { previas })];
}
