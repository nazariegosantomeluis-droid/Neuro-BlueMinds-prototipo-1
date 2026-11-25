// Señales de alerta temprana (H4.4; RF-11; Modelo 10.1 y 13.7; INV-9; decisión R13). SOLO OBSERVACIÓN.
//
// Se calculan al cerrar la sesión y se guardan en sesiones.csv (alerta_temprana) para evaluarlas
// después contra los episodios que registra el terapeuta sin conocerlas (Modelo 10.1). Nunca se
// muestran (ni al terapeuta ni al niño) y ninguna acción depende de ellas: ningún módulo de la
// aplicación importa este archivo salvo app.js, que solo escribe el resultado en el registro.
//
// Decisión R18 (24 nov 2026): se acepta su poca potencia en sesiones de 60 ensayos; el componente
// solo se evalúa en observación, y medir su sensibilidad y sus falsas alertas es lo que pide el
// Modelo 10.1 (y 13.7; INV-9).
//
// Decisión R13 (23 nov 2026; Dakos et al., 2012):
// - x: residuo del tiempo de respuesta = ln(TR) menos la media y la tendencia lineal (mínimos
//   cuadrados contra el orden del ensayo) de la actividad en la sesión, con los ensayos válidos
//   para latencia.
// - Ventana móvil de la mitad de esos ensayos (mínimo 10). En cada ventana: ρ1(t) = corr(x_k,
//   x_{k−1}) y V(t) = var(x_k); τ de Kendall de cada serie contra el tiempo.
// - Umbrales c_ρ y c_V calibrados con series sin transición: permutaciones al azar de los propios
//   residuos (semilla fija). Se usa el mismo cuantil q para las dos τ, el menor q de la rejilla con
//   el que la proporción de permutaciones con las dos τ por encima de su umbral es de 5 % o menos
//   (falsas alertas por sesión). La señal es τ_ρ > c_ρ y τ_V > c_V.
// - Sensibilidad a la ventana: lo mismo con ventanas de 1/4 y 3/4 de los ensayos (mínimo 10).
// - Al lado, la regla simple: 3 errores seguidos (respuestas incorrectas entre los ensayos
//   utilizables; las omisiones cortan la racha), para compararlas (Modelo 10.1).
import { PARAMETROS, VERSIONES } from './indicadores/parametros.js';
import { validoLatencia, rtDe, utilizable } from './indicadores/nucleo.js';
import { rng, seedOf } from './engine/selector.js';

const AT = PARAMETROS.alertaTemprana;

// Residuos de ln TR sin la media ni la tendencia lineal (contra el orden 0, 1, 2…).
export function quitarTendencia(ys) {
  const n = ys.length;
  if (n < 2) return ys.map(() => 0);
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  ys.forEach((y, i) => {
    sxy += (i - mx) * (y - my);
    sxx += (i - mx) ** 2;
  });
  const b = sxy / sxx;
  return ys.map((y, i) => y - my - b * (i - mx));
}

export const residuos = (rows) => quitarTendencia(rows.filter(validoLatencia).map((r) => Math.log(rtDe(r))));

// Ventana de la decisión R13: la mitad de los residuos (o la fracción dada), mínimo 10.
export const ventanaDe = (n, fraccion = AT.fraccionVentana) => Math.max(AT.ventanaMinima, Math.floor(n * fraccion));

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
export function seriesEnVentana(x, W) {
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

const percentil7 = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
};

const taus = (x, W) => {
  const { rho, v } = seriesEnVentana(x, W);
  return [kendallContraTiempo(rho), kendallContraTiempo(v)];
};

// Permutación de Fisher-Yates con el generador dado.
function permutar(xs, u) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(u() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Rejilla de cuantiles para el umbral común: 0.50, 0.51, …, 0.99, 0.995, 0.999.
const REJILLA = [...Array.from({ length: 50 }, (_, i) => 0.5 + i / 100), 0.995, 0.999];

// Umbrales calibrados con permutaciones de los residuos x (series sin transición), semilla fija.
export function calibrarPermutando(x, W, { permutaciones = AT.permutaciones, falsas = AT.falsasAlertas, semilla = AT.semilla } = {}) {
  const u = rng(seedOf(`${semilla}:${x.length}:${W}`));
  const pares = [];
  for (let p = 0; p < permutaciones; p++) {
    const [a, b] = taus(permutar(x, u), W);
    if (a !== null && b !== null) pares.push([a, b]);
  }
  if (!pares.length) return { c_rho: null, c_v: null, cuantil: null, falsas: null };
  // Ordenadas una vez (percentil7 ordena una copia; con los valores ya en orden da lo mismo).
  const rhos = pares.map((p) => p[0]).sort((a, b) => a - b);
  const vs = pares.map((p) => p[1]).sort((a, b) => a - b);
  for (const q of REJILLA) {
    const c_rho = percentil7(rhos, q);
    const c_v = percentil7(vs, q);
    const tasa = pares.filter(([a, b]) => a > c_rho && b > c_v).length / pares.length;
    if (tasa <= falsas) return { c_rho, c_v, cuantil: q, falsas: tasa };
  }
  return { c_rho: null, c_v: null, cuantil: null, falsas: null };
}

// Mínimo de ventanas para calcular τ: 3 (con menos, τ no tiene sentido).
const MINIMO_VENTANAS = 3;

function senalCon(x, W) {
  const ventanas = Math.max(0, x.length - W + 1);
  if (ventanas < MINIMO_VENTANAS) return { ventana: W, ventanas, tau_rho: null, tau_v: null, c_rho: null, c_v: null, cuantil: null, senal: null };
  const [tauRho, tauV] = taus(x, W);
  const c = calibrarPermutando(x, W);
  const senal = tauRho !== null && tauV !== null && c.c_rho !== null ? tauRho > c.c_rho && tauV > c.c_v : null;
  return { ventana: W, ventanas, tau_rho: tauRho, tau_v: tauV, c_rho: c.c_rho, c_v: c.c_v, cuantil: c.cuantil, senal };
}

// Regla simple (Modelo 10.1): 3 errores seguidos entre los ensayos utilizables.
export function erroresSeguidos(rows, n = AT.erroresSeguidos) {
  let racha = 0;
  for (const r of rows.filter(utilizable)) {
    racha = !r.omision && !r.acierto ? racha + 1 : 0;
    if (racha >= n) return { senal: true, ensayo: r.ensayo, bloque: r.bloque };
  }
  return { senal: false, ensayo: null, bloque: null };
}

// Señal de una actividad en una sesión. rows: sus ensayos, en orden.
export function alertaDeActividad(rows) {
  const x = residuos(rows);
  const principal = senalCon(x, ventanaDe(x.length));
  return {
    actividad: rows[0]?.actividad ?? null,
    residuos: x.length,
    ...principal,
    sensibilidad: AT.fraccionesSensibilidad.map((f) => ({ fraccion: f, ...senalCon(x, ventanaDe(x.length, f)) })),
    tres_errores_seguidos: erroresSeguidos(rows),
    version: VERSIONES.alerta,
    solo_observacion: true,
  };
}

// Todas las actividades de una sesión. rows: el registro por ensayo de la sesión.
export const alertaDeSesion = (rows) => [...new Set(rows.map((r) => r.actividad))].map((a) => alertaDeActividad(rows.filter((r) => r.actividad === a)));
