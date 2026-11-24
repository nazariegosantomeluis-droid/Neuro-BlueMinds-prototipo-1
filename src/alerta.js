// Señales de alerta temprana (H4.4; RF-11; Modelo 10.1 y 13.7; INV-9). SOLO OBSERVACIÓN.
//
// Se calculan al cerrar la sesión y se guardan en sesiones.csv (alerta_temprana) para evaluarlas
// después contra los episodios que registra el terapeuta sin conocerlas (Modelo 10.1). Nunca se
// muestran (ni al terapeuta ni al niño) y ninguna acción depende de ellas: ningún módulo de la
// aplicación importa este archivo salvo app.js, que solo escribe el resultado en el registro.
//
// x: residuo del tiempo de respuesta = ln(TR) − media de ln(TR) de la actividad en la sesión, con
// los ensayos válidos para latencia. En cada ventana móvil W_t de W residuos consecutivos:
// ρ1(t) = corr(x_k, x_{k−1}) y V(t) = var(x_k). La señal es τ_K(ρ1, t) > c_ρ y τ_K(V, t) > c_V,
// con τ de Kendall contra el tiempo. c_ρ y c_V son el cuantil 1 − α de τ en series simuladas sin
// transición (ruido normal independiente del mismo largo), con semilla fija.
import { PARAMETROS, VERSIONES } from './indicadores/parametros.js';
import { validoLatencia, rtDe } from './indicadores/nucleo.js';
import { rng, seedOf } from './engine/selector.js';

const AT = PARAMETROS.alertaTemprana;

export function residuos(rows) {
  const ln = rows.filter(validoLatencia).map((r) => Math.log(rtDe(r)));
  if (!ln.length) return [];
  const media = ln.reduce((a, b) => a + b, 0) / ln.length;
  return ln.map((x) => x - media);
}

const varianza = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
};

function correlacion(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let k = 0; k < a.length; k++) {
    num += (a[k] - ma) * (b[k] - mb);
    da += (a[k] - ma) ** 2;
    db += (b[k] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}

// Series ρ1(t) y V(t) en ventanas móviles de W residuos (una por cada residuo desde el W-ésimo).
export function seriesEnVentana(x, W = AT.ventana) {
  const rho = [];
  const v = [];
  for (let t = W; t <= x.length; t++) {
    const w = x.slice(t - W, t);
    rho.push(correlacion(w.slice(1), w.slice(0, -1)));
    v.push(varianza(w));
  }
  return { rho, v };
}

// τ de Kendall (tau-b) de una serie contra el tiempo (su índice); los valores nulos se omiten.
export function kendallContraTiempo(serie) {
  const pts = serie.map((y, t) => [t, y]).filter(([, y]) => y !== null && Number.isFinite(y));
  let c = 0;
  let d = 0;
  let empY = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const s = Math.sign(pts[j][1] - pts[i][1]);
      if (s > 0) c++;
      else if (s < 0) d++;
      else empY++;
    }
  }
  const n0 = (pts.length * (pts.length - 1)) / 2;
  const den = Math.sqrt(n0 * (n0 - empY));
  return den > 0 ? (c - d) / den : null;
}

// Normal estándar por Box-Muller con el generador sembrado.
function normal(u) {
  const a = Math.max(u(), Number.MIN_VALUE);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u());
}

const percentil7 = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
};

// Umbrales c_ρ y c_V para n residuos: cuantil 1 − α de τ en series simuladas sin transición.
const cache = new Map();
export function calibrar(n, { W = AT.ventana, alfa = AT.alfa, simulaciones = AT.simulaciones } = {}) {
  const clave = `${n}:${W}:${alfa}:${simulaciones}`;
  if (cache.has(clave)) return cache.get(clave);
  const u = rng(seedOf(`alerta:${n - W + 1}`));
  const tr = [];
  const tv = [];
  for (let s = 0; s < simulaciones; s++) {
    const x = Array.from({ length: n }, () => normal(u));
    const { rho, v } = seriesEnVentana(x, W);
    const a = kendallContraTiempo(rho);
    const b = kendallContraTiempo(v);
    if (a !== null) tr.push(a);
    if (b !== null) tv.push(b);
  }
  const out = { c_rho: tr.length ? percentil7(tr, 1 - alfa) : null, c_v: tv.length ? percentil7(tv, 1 - alfa) : null };
  cache.set(clave, out);
  return out;
}

// Mínimo de ventanas para calcular τ: 3 (con menos, τ no tiene sentido).
const MINIMO_VENTANAS = 3;

// Señal de una actividad en una sesión. rows: sus ensayos, en orden.
export function alertaDeActividad(rows, { W = AT.ventana } = {}) {
  const x = residuos(rows);
  const nVentanas = Math.max(0, x.length - W + 1);
  const base = { actividad: rows[0]?.actividad ?? null, ventana: W, residuos: x.length, ventanas: nVentanas, version: VERSIONES.alerta, solo_observacion: true };
  if (nVentanas < MINIMO_VENTANAS) return { ...base, tau_rho: null, tau_v: null, c_rho: null, c_v: null, senal: null };
  const { rho, v } = seriesEnVentana(x, W);
  const tauRho = kendallContraTiempo(rho);
  const tauV = kendallContraTiempo(v);
  const { c_rho, c_v } = calibrar(x.length, { W });
  const senal = tauRho !== null && tauV !== null && c_rho !== null && c_v !== null ? tauRho > c_rho && tauV > c_v : null;
  return { ...base, tau_rho: tauRho, tau_v: tauV, c_rho, c_v, senal };
}

// Todas las actividades de una sesión. rows: el registro por ensayo de la sesión.
export const alertaDeSesion = (rows) => [...new Set(rows.map((r) => r.actividad))].map((a) => alertaDeActividad(rows.filter((r) => r.actividad === a)));
