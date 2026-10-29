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
  return { tr_bruto_ms: tr, anticipatoria, peso_calidad: foco * aTiempo * plausibilidad };
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
