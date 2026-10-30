// Reglas de calidad del ensayo. Son los únicos campos del registro que se
// calculan a partir de otros; todo lo demás se guarda tal como se midió.

// Versión de los umbrales del motor: ANTICIPATORIA_MS y FUERA_MAD (aquí), y REPEAT_MS,
// AUDIO_CAP_MS y DECODE_CAP_MS (trial.js). Cambia cuando cambia alguno de ellos.
export const VERSION_PARAMETROS = '0.1.0';

// Un tiempo de respuesta menor a este valor se considera anticipatorio.
export const ANTICIPATORIA_MS = 150;

// Fuera de tarea: el logaritmo del tiempo de respuesta queda a más de FUERA_MAD veces la MAD
// (desviación absoluta mediana, sin escalar) de la mediana de la sesión.
export const FUERA_MAD = 3;

export function derive(r) {
  const tr = r.t_toque != null && r.t_opciones != null ? r.t_toque - r.t_opciones : null;
  const anticipatoria = tr !== null && tr < ANTICIPATORIA_MS;
  const foco = r.perdida_foco ? 0 : 1;
  const aTiempo = r.cuadros_total > 0 ? (r.cuadros_total - r.cuadros_perdidos) / r.cuadros_total : 1;
  const plausibilidad = anticipatoria ? 0 : 1;
  const tecnico = r.fallo_tecnico ? 0 : 1; // el audio de la consigna AV no arrancó o falló
  return { tr_bruto_ms: tr, anticipatoria, peso_calidad: foco * aTiempo * plausibilidad * tecnico };
}

// rows: los ensayos de una sesión. Devuelve, por fila, true/false, o null si no hubo respuesta.
export function fueraDeTarea(rows) {
  const ln = (r) => (r.tr_bruto_ms > 0 ? Math.log(r.tr_bruto_ms) : null);
  const xs = rows.map(ln).filter((x) => x !== null);
  const med = median(xs);
  const mad = median(xs.map((x) => Math.abs(x - med)));
  return rows.map((r) => (ln(r) === null ? null : Math.abs(ln(r) - med) > FUERA_MAD * mad));
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
