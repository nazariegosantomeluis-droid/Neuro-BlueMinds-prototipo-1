import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickItems, rng, seedOf, shuffle } from '../src/engine/selector.js';

const band = (n, prefix = 'ACT01-B1') =>
  Array.from({ length: n }, (_, i) => ({ codigo: `${prefix}-${String(i + 1).padStart(2, '0')}` }));

test('elige sin reemplazo dentro de la banda', () => {
  const items = band(10);
  const picked = pickItems(items, 10, rng(7));
  assert.equal(new Set(picked.map((i) => i.codigo)).size, 10);
});

test('nunca repite un ítem en ensayos consecutivos, aunque haga varias pasadas', () => {
  const items = band(10);
  for (let seed = 1; seed <= 200; seed++) {
    const picked = pickItems(items, 25, rng(seed)).map((i) => i.codigo);
    for (let i = 1; i < picked.length; i++) assert.notEqual(picked[i], picked[i - 1], `semilla ${seed}`);
    // cada pasada de 10 es sin reemplazo
    assert.equal(new Set(picked.slice(0, 10)).size, 10);
    assert.equal(new Set(picked.slice(10, 20)).size, 10);
  }
});

test('sin repetición en la sesión: 30 conceptos distintos de 60 y excluye los ya usados', () => {
  const items = Array.from({ length: 60 }, (_, i) => ({ codigo: `ACT02-B3-${i + 1}`, concepto: `c${i + 1}` }));
  const first = pickItems(items, 30, rng(3), { repeat: false });
  assert.equal(new Set(first.map((i) => i.concepto)).size, 30);
  const used = new Set(first.map((i) => i.concepto));
  const second = pickItems(items, 30, rng(4), { repeat: false, exclude: used });
  assert.ok(second.every((i) => !used.has(i.concepto)));
  assert.throws(() => pickItems(items, 31, rng(5), { repeat: false, exclude: used }), /solo quedan 30/);
});

test('la misma semilla da la misma selección', () => {
  const items = band(10);
  const a = pickItems(items, 10, rng(seedOf('S-abc'))).map((i) => i.codigo);
  const b = pickItems(items, 10, rng(seedOf('S-abc'))).map((i) => i.codigo);
  const c = pickItems(items, 10, rng(seedOf('S-xyz'))).map((i) => i.codigo);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('shuffle no altera el arreglo original', () => {
  const arr = [1, 2, 3, 4];
  const out = shuffle(arr, rng(1));
  assert.deepEqual(arr, [1, 2, 3, 4]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4]);
});
