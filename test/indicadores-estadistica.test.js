// Utilidades estadísticas de los indicadores (H3.1). Cada valor esperado dice de dónde sale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zDe, wilson, binomialCDF, rangosMediana, medianaIC, mediana, mad, theilSen, bootstrap, betaCDF, cuantilTipo1 } from '../src/indicadores/estadistica.js';

const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} frente a ${b}`);

test('cuantil normal: valores tabulados de la normal estándar', () => {
  // Tablas de la normal: z(0.90) = 1.644854, z(0.95) = 1.959964, z(0.99) = 2.575829.
  cerca(zDe(0.9), 1.644854, 1e-6);
  cerca(zDe(0.95), 1.959964, 1e-6);
  cerca(zDe(0.99), 2.575829, 1e-6);
});

test('Wilson: los cuatro ejemplos de Newcombe (1998, tabla I, método de puntuación)', () => {
  // Newcombe, R. G. (1998). Two-sided confidence intervals for the single proportion: comparison of
  // seven methods. Statistics in Medicine, 17(8), 857-872. Tabla I, método 3 (Wilson).
  const casos = [
    [81, 263, 0.2553, 0.3662],
    [15, 148, 0.0624, 0.1605],
    [0, 20, 0.0, 0.1611],
    [1, 29, 0.0061, 0.1718],
  ];
  for (const [x, n, lo, hi] of casos) {
    const [a, b] = wilson(x, n);
    cerca(a, lo, 5e-5, `${x}/${n} inferior`);
    cerca(b, hi, 5e-5, `${x}/${n} superior`);
  }
  assert.equal(wilson(0, 0), null);
  assert.deepEqual(wilson(12, 12).map((v) => +v.toFixed(4)), [0.7575, 1], 'con p = 1 el límite superior es 1 (fórmula de Wilson a mano)');
});

test('mediana con intervalo por estadísticos de orden: rangos calculados a mano con la binomial', () => {
  // n = 20: P(B ≤ 5) = (1 + 20 + 190 + 1140 + 4845 + 15504)/2^20 = 21700/1048576 = 0.0207 ≤ 0.025 y
  // P(B ≤ 6) = 0.0577 > 0.025, con B ~ Bin(20, 1/2): rangos 6 y 15, cobertura 1 − 2·0.0207 = 0.9586.
  cerca(binomialCDF(5, 20, 0.5), 21700 / 1048576, 1e-12);
  const r20 = rangosMediana(20);
  assert.deepEqual([r20.l, r20.u], [6, 15]);
  cerca(r20.cobertura, 1 - 2 * (21700 / 1048576), 1e-12);
  // n = 10: P(B ≤ 1) = 11/1024 = 0.0107 y P(B ≤ 2) = 56/1024 = 0.0547: rangos 2 y 9.
  assert.deepEqual([rangosMediana(10).l, rangosMediana(10).u], [2, 9]);
  // n = 5: P(B ≤ 0) = 1/32 = 0.031 > 0.025: no hay intervalo de 95 %.
  assert.equal(rangosMediana(5), null);
  const xs = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);
  assert.deepEqual(medianaIC(xs.reverse()), [60, 150]);
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
});

test('MAD escalada: ejemplo a mano', () => {
  // x = 1, 2, 3, 4, 100: mediana 3; |x − 3| = 2, 1, 0, 1, 97; su mediana es 1; MAD = 1.4826.
  assert.equal(mad([1, 2, 3, 4, 100], 1.4826), 1.4826);
});

test('Theil-Sen con intervalo por tau de Kendall: ejemplos a mano', () => {
  // Recta exacta y = 2x + 1: todas las pendientes valen 2.
  const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const r = theilSen(x, x.map((v) => 2 * v + 1));
  assert.equal(r.pendiente, 2);
  assert.equal(r.ordenada, 1);
  assert.deepEqual(r.ic, [2, 2]);
  // Un valor atípico no mueve la pendiente: y = 2x salvo y(9) = 100.
  const atip = theilSen(x, x.map((v) => (v === 9 ? 100 : 2 * v)));
  assert.equal(atip.pendiente, 2);
  // x = 1..5, y = 1, 3, 2, 5, 4. Las 10 pendientes ordenadas: −1, −1, 1/3, 1/2, 3/4, 1, 1, 4/3, 2, 3;
  // mediana (3/4 + 1)/2 = 0.875. Var(S) = 5·4·15/18 = 16.67; C = 1.96·4.08 = 8.00; M1 = 1.00 y
  // M2 + 1 = 10.00: el intervalo va de la 1.ª a la 10.ª pendiente, [−1, 3].
  const c = theilSen([1, 2, 3, 4, 5], [1, 3, 2, 5, 4]);
  assert.equal(c.pendiente, 0.875);
  assert.equal(c.N, 10);
  cerca(c.C, 1.959964 * Math.sqrt(50 / 3), 1e-5);
  assert.deepEqual(c.ic, [-1, 3]);
});

test('bootstrap: con semilla fija se repite exactamente; datos constantes dan un intervalo puntual', () => {
  const xs = [5, 1, 4, 2, 8, 7, 3, 9, 6, 10];
  const a = bootstrap([xs], mediana, { remuestras: 500, semilla: 'S1:ACT-02:A3' });
  const b = bootstrap([xs], mediana, { remuestras: 500, semilla: 'S1:ACT-02:A3' });
  assert.deepEqual(a, b);
  assert.ok(a[0] <= mediana(xs) && mediana(xs) <= a[1]);
  assert.deepEqual(bootstrap([[7, 7, 7]], mediana, { semilla: 'x' }), [7, 7]);
  // Cuantil tipo 1: el ⌈p·B⌉-ésimo valor ordenado; con B = 2000, los rangos 50 y 1950.
  const s = Array.from({ length: 2000 }, (_, i) => i + 1);
  assert.deepEqual([cuantilTipo1(s, 0.025), cuantilTipo1(s, 0.975)], [50, 1950]);
});

test('función Beta con parámetros enteros: formas cerradas', () => {
  // Beta(a + 1, 1): P(θ ≤ x) = x^(a + 1).
  cerca(betaCDF(0.7, 9, 1), 0.7 ** 9, 1e-14);
  // Beta(1, b): P(θ ≤ x) = 1 − (1 − x)^b.
  cerca(betaCDF(0.3, 1, 4), 1 - 0.7 ** 4, 1e-14);
  // Beta(2, 2): P(θ ≤ x) = 3x² − 2x³; en 0.5 vale 0.5.
  cerca(betaCDF(0.5, 2, 2), 0.5, 1e-14);
  assert.throws(() => betaCDF(0.5, 1.5, 1), /enteros/);
});
