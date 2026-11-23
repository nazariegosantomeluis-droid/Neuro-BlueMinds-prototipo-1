// Utilidades estadísticas de los indicadores (H3.1; Modelo 3.2, 4.2, 4.3 y 7.1; decisión D2).
// Funciones puras, sin DOM. Cada una está descrita para que se pueda reimplementar en R (H3.7).
import { rng, seedOf } from '../engine/selector.js';

// Cuantil de la normal estándar para 1 − (1 − conf)/2. Para 0.95 da 1.959963984540054.
export function zDe(confianza) {
  // Aproximación racional de P. J. Acklam del cuantil normal; las pruebas comprueban el error
  // contra valores tabulados de la normal.
  const p = 1 - (1 - confianza) / 2;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const q0 = Math.sqrt(-2 * Math.log(1 - p));
  if (p > 0.97575) return -(((((c[0] * q0 + c[1]) * q0 + c[2]) * q0 + c[3]) * q0 + c[4]) * q0 + c[5]) / ((((d[0] * q0 + d[1]) * q0 + d[2]) * q0 + d[3]) * q0 + 1);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// Valor exacto para el caso usado en todo el prototipo.
const Z95 = 1.959963984540054;
const zConf = (confianza) => (confianza === 0.95 ? Z95 : zDe(confianza));

const ordenar = (xs) => [...xs].sort((a, b) => a - b);

export function mediana(xs) {
  if (!xs.length) return null;
  const s = ordenar(xs);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// MAD escalada: escala × mediana |x − mediana(x)| (Modelo 3.2).
export function mad(xs, escala) {
  const m = mediana(xs);
  return m === null ? null : escala * mediana(xs.map((x) => Math.abs(x - m)));
}

// Intervalo de Wilson para una proporción x/n (Wilson, 1927; Newcombe, 1998, método 3).
export function wilson(x, n, confianza = 0.95) {
  if (!n) return null;
  const z = zConf(confianza);
  const p = x / n;
  const den = 1 + (z * z) / n;
  const centro = p + (z * z) / (2 * n);
  const media = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centro - media) / den), Math.min(1, (centro + media) / den)];
}

// Función de distribución binomial P(B ≤ k), B ~ Bin(n, p), por suma directa.
export function binomialCDF(k, n, p) {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let total = 0;
  let termino = (1 - p) ** n; // P(B = 0)
  for (let j = 0; j <= k; j++) {
    total += termino;
    termino *= ((n - j) / (j + 1)) * (p / (1 - p));
  }
  return Math.min(1, total);
}

// Rangos (desde 1) del intervalo de la mediana por estadísticos de orden: el mayor l con
// P(B ≤ l − 1) ≤ (1 − conf)/2, B ~ Bin(n, 1/2), y u = n − l + 1. Cobertura ≥ conf, sin supuestos
// sobre la distribución. Con n muy chico (n < 6 para 95 %) no hay intervalo.
export function rangosMediana(n, confianza = 0.95) {
  const alfa = (1 - confianza) / 2;
  let l = 0;
  for (let r = 1; r <= n; r++) if (binomialCDF(r - 1, n, 0.5) <= alfa) l = r;
  return l >= 1 ? { l, u: n - l + 1, cobertura: 1 - 2 * binomialCDF(l - 1, n, 0.5) } : null;
}

export function medianaIC(xs, confianza = 0.95) {
  const r = rangosMediana(xs.length, confianza);
  if (!r) return null;
  const s = ordenar(xs);
  return [s[r.l - 1], s[r.u - 1]];
}

// Pendiente de Theil-Sen: mediana de las pendientes de todos los pares con x distinto (Sen, 1968).
// Intervalo por la tau de Kendall (Sen, 1968; Gilbert, 1987, cap. 16): con N pendientes ordenadas,
// C = z · √Var(S), Var(S) = n(n − 1)(2n + 5)/18 (sin empates en x; con empates se corrige por los
// grupos de y empatados), M1 = (N − C)/2, M2 = (N + C)/2; límites: el M1-ésimo y el (M2 + 1)-ésimo
// valor ordenado, interpolando linealmente si no son enteros y acotando a [1, N].
export function theilSen(x, y, confianza = 0.95) {
  const n = x.length;
  const pendientes = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (x[j] !== x[i]) pendientes.push((y[j] - y[i]) / (x[j] - x[i]));
  if (!pendientes.length) return null;
  const s = ordenar(pendientes);
  const N = s.length;
  const pendiente = mediana(s);
  const empates = new Map();
  for (const v of y) empates.set(v, (empates.get(v) ?? 0) + 1);
  const corr = [...empates.values()].reduce((t, g) => t + g * (g - 1) * (2 * g + 5), 0);
  const varS = (n * (n - 1) * (2 * n + 5) - corr) / 18;
  const C = zConf(confianza) * Math.sqrt(varS);
  const q = (r) => {
    const rr = Math.min(N, Math.max(1, r));
    const lo = Math.floor(rr);
    const f = rr - lo;
    return f === 0 || lo >= N ? s[lo - 1] : s[lo - 1] + f * (s[lo] - s[lo - 1]);
  };
  const ordenada = mediana(y.map((v, k) => v - pendiente * x[k]));
  return { pendiente, ordenada, ic: [q((N - C) / 2), q((N + C) / 2 + 1)], N, C };
}

// Cuantil tipo 1 (inverso de la distribución empírica): el ⌈p·B⌉-ésimo valor ordenado.
export const cuantilTipo1 = (ordenados, p) => ordenados[Math.min(ordenados.length, Math.max(1, Math.ceil(p * ordenados.length))) - 1];

// Bootstrap de percentiles con semilla fija (Modelo 7.1; decisión D2). grupos: una o varias listas;
// cada remuestra toma, de cada lista, tantos elementos como tiene, con reemplazo, en este orden:
// para cada lista, para cada elemento, índice = ⌊u · n⌋ con u del generador mulberry32 sembrado con
// FNV-1a del texto semilla. estadistico recibe las listas remuestreadas. Intervalo: cuantiles tipo 1
// de (1 − conf)/2 y 1 − (1 − conf)/2 de las B réplicas, ignorando las réplicas sin valor.
export function bootstrap(grupos, estadistico, { remuestras = 2000, semilla, confianza = 0.95 }) {
  const u = rng(seedOf(semilla));
  const reps = [];
  for (let b = 0; b < remuestras; b++) {
    const muestra = grupos.map((g) => {
      const out = new Array(g.length);
      for (let k = 0; k < g.length; k++) out[k] = g[Math.floor(u() * g.length)];
      return out;
    });
    const v = estadistico(...muestra);
    if (v !== null && Number.isFinite(v)) reps.push(v);
  }
  if (!reps.length) return null;
  const s = ordenar(reps);
  const alfa = (1 - confianza) / 2;
  return [cuantilTipo1(s, alfa), cuantilTipo1(s, 1 - alfa)];
}

// Función de distribución Beta con parámetros enteros: P(θ ≤ x | Beta(α, β)) = P(B ≥ α),
// B ~ Bin(α + β − 1, x). Con previa uniforme, los parámetros del dominio siempre son enteros.
export function betaCDF(x, alfa, beta) {
  if (!Number.isInteger(alfa) || !Number.isInteger(beta) || alfa < 1 || beta < 1) throw new Error('betaCDF: solo parámetros enteros positivos.');
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - binomialCDF(alfa - 1, alfa + beta - 1, x);
}
