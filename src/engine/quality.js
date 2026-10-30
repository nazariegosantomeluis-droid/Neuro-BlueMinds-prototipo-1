// Reglas de calidad del ensayo. Son los únicos campos del registro que se
// calculan a partir de otros; todo lo demás se guarda tal como se midió.

// Versión de los umbrales del motor: los de este archivo y REPEAT_MS, AUDIO_CAP_MS y
// DECODE_CAP_MS (trial.js). Cambia cuando cambia alguno de ellos o la regla de fuera de tarea.
export const VERSION_PARAMETROS = '0.2.0';

// Un tiempo de respuesta menor a este valor se considera anticipatorio.
export const ANTICIPATORIA_MS = 150;

// Fuera de tarea (Modelo matemático, 3.2 y 3.3): ln(RT) a más de FUERA_MAD veces la MAD escalada
// (MAD_ESCALA × mediana de |ln RT − mediana|) de la mediana de su actividad en la sesión.
// Con menos de FUERA_MIN ensayos válidos de la actividad, queda vacío.
export const FUERA_MAD = 3;
export const MAD_ESCALA = 1.4826;
export const FUERA_MIN = 10;

// Un periodo de cuadro mayor a este valor (menos de 50 Hz) se avisa al adulto.
export const PERIODO_MAX_MS = 20;

export function derive(r) {
  const tr = r.t_toque != null && r.t_opciones != null ? r.t_toque - r.t_opciones : null;
  const anticipatoria = tr !== null && tr < ANTICIPATORIA_MS;
  const foco = r.perdida_foco ? 0 : 1;
  const aTiempo = r.cuadros_total > 0 ? (r.cuadros_total - r.cuadros_perdidos) / r.cuadros_total : 1;
  const plausibilidad = anticipatoria ? 0 : 1;
  const tecnico = r.fallo_tecnico ? 0 : 1; // el audio de la consigna AV no arrancó o falló
  return { tr_bruto_ms: tr, anticipatoria, peso_calidad: foco * aTiempo * plausibilidad * tecnico };
}

// RT del ensayo: tr_corregido_ms si hay latencia del dispositivo; si no, tr_bruto_ms.
const rt = (r) => r.tr_corregido_ms ?? r.tr_bruto_ms;
// Solo entran ensayos con respuesta, no anticipatorios, sin interrupción ni fallo técnico.
const valido = (r) => rt(r) > 0 && !r.anticipatoria && !r.interrumpido && !r.fallo_tecnico;

// rows: los ensayos de una sesión, de cualquier actividad. Devuelve, por fila, true/false,
// o null si el ensayo no es válido o su actividad tiene menos de FUERA_MIN ensayos válidos.
export function fueraDeTarea(rows) {
  const out = rows.map(() => null);
  for (const actividad of new Set(rows.map((r) => r.actividad))) {
    const idx = rows.flatMap((r, k) => (r.actividad === actividad && valido(r) ? [k] : []));
    if (idx.length < FUERA_MIN) continue;
    const xs = idx.map((k) => Math.log(rt(rows[k])));
    const med = median(xs);
    const mad = MAD_ESCALA * median(xs.map((x) => Math.abs(x - med)));
    idx.forEach((k, j) => (out[k] = Math.abs(xs[j] - med) > FUERA_MAD * mad));
  }
  return out;
}

// Marca fuera_de_tarea en los ensayos de una sesión: definitivo al cerrar la sesión
// (provisional = false) o provisional al exportar una sesión abierta. Un valor cerrado no cambia.
export function marcarFueraDeTarea(rows, provisional) {
  fueraDeTarea(rows).forEach((v, k) => {
    if (rows[k].fuera_de_tarea_provisional !== false) Object.assign(rows[k], { fuera_de_tarea: v, fuera_de_tarea_provisional: provisional });
  });
}

// Copia del registro para exportar: las sesiones abiertas llevan fuera_de_tarea provisional.
export function paraExportar(rows) {
  const copia = rows.map((r) => ({ ...r }));
  for (const id of new Set(copia.map((r) => r.sesion_id))) marcarFueraDeTarea(copia.filter((r) => r.sesion_id === id), true);
  return copia;
}

// Para sesiones.csv: frecuencia de la pantalla (mediana de periodo_cuadro_ms) y proporción
// de ensayos con periodo mayor a PERIODO_MAX_MS.
export function frecuenciaSesion(rows) {
  const ps = rows.map((r) => r.periodo_cuadro_ms).filter((p) => p > 0);
  const med = median(ps);
  return {
    frecuencia_hz: med === null ? null : Math.round(1000 / med),
    proporcion_periodo_lento: ps.length ? ps.filter((p) => p > PERIODO_MAX_MS).length / ps.length : null,
  };
}

const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// Resumen descriptivo del bloque para el adulto: conteos y mediana, sin interpretación.
// No incluye los ensayos interrumpidos. cambio(row): si en ese ensayo cambió la regla
// respecto al anterior (ACT-07); con él se describen por separado ambos tipos de ensayo.
export function summarize(rows, ficha, { cambio } = {}) {
  const validos = rows.filter((r) => !r.interrumpido);
  const n = validos.length;
  const aciertos = validos.filter((r) => r.acierto).length;
  const omisiones = validos.filter((r) => r.omision).length;
  const trs = validos.filter((r) => r.tr_bruto_ms !== null && !r.anticipatoria).map((r) => r.tr_bruto_ms);
  const med = median(trs);
  const lines = [
    `${fill(ficha.resumen, { aciertos, ensayos: n })}.`,
    `Sin respuesta: ${omisiones} de ${n} ensayos.`,
    med === null
      ? 'Mediana del tiempo de respuesta: no hubo respuestas para calcularla.'
      : `Mediana del tiempo de respuesta: ${(med / 1000).toFixed(2)} s, en ${trs.length} ensayos con respuesta (sin contar las anticipatorias).`,
  ];
  const extra = [
    ['interrumpido', 'Ensayos interrumpidos por pausa'],
    ['anticipatoria', 'Respuestas anticipatorias (menos de 150 ms)'],
    ['fallo_tecnico', 'Ensayos con fallo técnico de audio'],
    ['perdida_foco', 'Ensayos con pérdida de foco'],
  ];
  if (cambio && validos.some(cambio)) {
    const seconds = (rs) => {
      const m = median(rs.filter((r) => r.acierto && !r.anticipatoria).map((r) => r.tr_bruto_ms));
      return m === null ? 'sin aciertos' : `${(m / 1000).toFixed(2)} s`;
    };
    const describe = (label, rs) => {
      const errores = rs.filter((r) => r.opcion_elegida !== null && !r.acierto).length;
      return `Ensayos en que ${label}: ${rs.length}; errores: ${errores}; mediana del tiempo en aciertos: ${seconds(rs)}.`;
    };
    // El primer ensayo del bloque no tiene anterior: no cuenta como cambio ni como repetición.
    const [, ...resto] = rows;
    const conAnterior = resto.filter((r) => !r.interrumpido);
    lines.push(describe('cambió la regla', conAnterior.filter(cambio)));
    lines.push(describe('se repitió la regla', conAnterior.filter((r) => !cambio(r))));
  }
  for (const [k, label] of extra) {
    const c = rows.filter((r) => r[k]).length;
    if (c) lines.push(`${label}: ${c}.`);
  }
  return lines;
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
