// A9, dominio de ítem (H3.4; Modelo 4.3; decisión D5). Reproduce la tabla del Modelo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probabilidadDominio, dominado, aciertosNecesarios, estadoDeDominio, a9, criterioDe, unidadDe } from '../src/indicadores/dominio.js';
import { PARAMETROS } from '../src/indicadores/parametros.js';
import { filas, omision, errorCon } from '../tools/filas-prueba.mjs';

const cerca = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} frente a ${b}`);
const D5 = { thetaEstrella: 0.7, confianza: 0.95 };
const SENS = { thetaEstrella: 0.8, confianza: 0.95 };

test('D5: θ* = 0.70 con 95 % por defecto; 0.80 solo como sensibilidad', () => {
  assert.deepEqual(criterioDe(null), D5);
  assert.equal(PARAMETROS.dominio.sensibilidad, 0.8);
  assert.deepEqual(criterioDe({ dominio: { thetaEstrella: 0.8 } }), SENS, 'la ficha puede cambiarlo');
});

test('tabla del Modelo 4.3: aciertos consecutivos necesarios, sin errores', () => {
  // Sin errores, θ ~ Beta(1 + a, 1) y P(θ > θ*) = 1 − θ*^(a + 1).
  // θ* = 0.70: a = 7 da 1 − 0.7^8 = 0.9424 y a = 8 da 1 − 0.7^9 = 0.9596 > 0.95 → 8 (Modelo 4.3).
  cerca(probabilidadDominio(8, 0, 0.7), 1 - 0.7 ** 9, 1e-12);
  cerca(probabilidadDominio(7, 0, 0.7), 1 - 0.7 ** 8, 1e-12);
  assert.equal(aciertosNecesarios(D5), 8);
  // θ* = 0.80: a = 12 da 1 − 0.8^13 = 0.9450 y a = 13 da 1 − 0.8^14 = 0.9560 → 13 (Modelo 4.3).
  assert.equal(aciertosNecesarios(SENS), 13);
});

test('Modelo 4.3: con θ* = 0.80, 28 de 30 alcanza el criterio (0.96) y 27 de 30 no (0.89)', () => {
  // 28 aciertos y 2 errores: Beta(29, 3); P(θ > 0.8) = P(Bin(31, 0.8) ≤ 28) = 0.9626, que el Modelo
  // redondea a 0.96. 27 y 3: Beta(28, 4); P(Bin(31, 0.8) ≤ 27) = 0.8930, que redondea a 0.89.
  const p28 = probabilidadDominio(28, 2, 0.8);
  const p27 = probabilidadDominio(27, 3, 0.8);
  assert.equal(p28.toFixed(2), '0.96');
  assert.equal(p27.toFixed(2), '0.89');
  cerca(p28, 0.962552, 1e-6);
  cerca(p27, 0.892996, 1e-6);
  assert.ok(dominado(28, 2, SENS));
  assert.ok(!dominado(27, 3, SENS));
});

test('el estado se acumula entre sesiones y guarda la presentación en que se alcanzó', () => {
  // Sesión 1: 7 aciertos del concepto «perro». Sesión 2: el 8.º acierto lo alcanza (θ* = 0.70).
  const s1 = filas(7, (k) => ({ sesion_id: 'S1', item: `ACT02-B2-0${k}`, concepto: 'perro' }));
  const s2 = filas(5, (k) => ({ sesion_id: 'S2', item: `ACT02-B2-1${k}`, concepto: k === 1 ? 'perro' : `c${k}` }));
  const unidad = unidadDe({ dominio: { unidad: 'concepto' } });
  const estado = estadoDeDominio([...s1, ...s2], { unidad, criterio: D5 });
  assert.deepEqual(estado.get('perro').alcanzado, { sesion_id: 'S2', bloque: 1, ensayo: 1 });
  assert.equal(estado.get('perro').a, 8);
  // Ritmo de la sesión 2: 1 concepto nuevo en 5 presentaciones = 20 por cada 100.
  const r = a9(s2, { previas: s1, unidad, criterio: D5, calidad: 1 });
  assert.equal(r.valor, 20);
  assert.deepEqual(r.nuevos, ['perro']);
  assert.equal(r.dominados, 1);
  assert.equal(r.ic, null);
  // Una vez alcanzado, un error después no lo borra.
  const despues = estadoDeDominio([...s1, ...s2, ...filas(1, () => ({ sesion_id: 'S3', concepto: 'perro', ...errorCon() }))], { unidad, criterio: D5 });
  assert.ok(despues.get('perro').alcanzado);
  assert.equal(despues.get('perro').dominado, false, '8 aciertos y 1 error: P = 0.85, ya no supera 0.95 ahora');
});

test('las omisiones cuentan como presentaciones sin acierto; las sondas y las interrupciones no cuentan', () => {
  assert.equal(PARAMETROS.omisionCuentaComoErrorEnDominio.valor, true);
  const rows = filas(4, (k) => ({ item: 'X', ...(k === 1 ? omision : k === 2 ? { sonda: true } : k === 3 ? { interrumpido: true } : {}) }));
  const s = estadoDeDominio(rows).get('X');
  assert.deepEqual([s.a, s.e], [1, 1]);
  assert.equal(a9(filas(3), { calidad: 0.5 }).disponible, false);
});
