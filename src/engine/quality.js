// Reglas de calidad del ensayo. Son los únicos campos del registro que se
// calculan a partir de otros; todo lo demás se guarda tal como se midió.

// Un tiempo de respuesta menor a este valor se considera anticipatorio.
export const ANTICIPATORIA_MS = 150;

export function derive(r) {
  const tr = r.t_toque != null && r.t_opciones != null ? r.t_toque - r.t_opciones : null;
  const anticipatoria = tr !== null && tr < ANTICIPATORIA_MS;
  const foco = r.perdida_foco ? 0 : 1;
  const aTiempo = r.cuadros_total > 0 ? (r.cuadros_total - r.cuadros_perdidos) / r.cuadros_total : 1;
  const plausibilidad = anticipatoria ? 0 : 1;
  const tecnico = r.fallo_tecnico ? 0 : 1; // el audio de la consigna AV no arrancó o falló
  return { tr_bruto_ms: tr, anticipatoria, peso_calidad: foco * aTiempo * plausibilidad * tecnico };
}

const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// Resumen descriptivo del bloque para el adulto: conteos y mediana, sin interpretación.
// No incluye los ensayos interrumpidos.
export function summarize(rows, ficha) {
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
