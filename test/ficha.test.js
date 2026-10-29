import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFicha, loadFicha, FichaError, REQUIRED_FIELDS } from '../src/engine/ficha.js';

const read = (id) => JSON.parse(readFileSync(new URL(`../fichas/${id}.json`, import.meta.url), 'utf8'));
const FICHAS = ['ACT-01', 'ACT-02', 'ACT-07'];

test('las tres fichas están completas', () => {
  for (const id of FICHAS) assert.deepEqual(validateFicha(read(id)), [], id);
});

test('rechaza una ficha a la que le falta cualquier campo obligatorio', () => {
  const ficha = read('ACT-01');
  for (const k of REQUIRED_FIELDS) {
    const { [k]: _, ...incompleta } = ficha;
    const errors = validateFicha(incompleta);
    assert.ok(errors.some((e) => e.includes(`«${k}»`)), `debe señalar «${k}»`);
  }
});

test('rechaza bandas sin opciones, tipo de respuesta distinto y modalidades desconocidas', () => {
  const ficha = read('ACT-02');
  const errors = validateFicha({
    ...ficha,
    tipoRespuesta: 'multiple',
    modalidades: ['V', 'K'],
    bandas: [{ id: 'B1', descripcion: 'sin opciones' }],
  });
  assert.ok(errors.some((e) => e.includes('tipoRespuesta')));
  assert.ok(errors.some((e) => e.includes('modalidades')));
  assert.ok(errors.some((e) => e.includes('B1') && e.includes('opciones')));
});

test('la disposición de cada banda debe tener tantas posiciones como opciones', () => {
  const ficha = read('ACT-02');
  const conDisposicion = (d) => ({ ...ficha, bandas: [{ id: 'B4', opciones: 4, descripcion: 'x', disposicion: d }] });
  assert.deepEqual(validateFicha(conDisposicion('2x2')), []);
  assert.deepEqual(validateFicha(conDisposicion('1x4')), []);
  assert.ok(validateFicha(conDisposicion('1x3')).some((e) => e.includes('disposicion')));
  assert.ok(validateFicha(conDisposicion('cuatro')).some((e) => e.includes('disposicion')));
  for (const id of FICHAS) for (const b of read(id).bandas) assert.ok(b.disposicion, `${id} ${b.id} declara su disposición`);
});

test('loadFicha falla con la lista de problemas si la ficha está incompleta', async () => {
  const { objetivo, ...incompleta } = read('ACT-07');
  const fakeFetch = async () => ({ ok: true, json: async () => incompleta });
  await assert.rejects(loadFicha('fichas/ACT-07.json', fakeFetch), (e) => {
    assert.ok(e instanceof FichaError);
    assert.deepEqual(e.errors, ['Falta el campo «objetivo».']);
    return true;
  });
  const ok = async () => ({ ok: true, json: async () => read('ACT-07') });
  assert.equal((await loadFicha('fichas/ACT-07.json', ok)).id, 'ACT-07');
});
