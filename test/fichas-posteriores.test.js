// Reglas generales de las fichas de uso posterior y en investigación (tanda 2): su contenido
// clínico es una propuesta con decisiones pendientes, los bloques siguen la Arquitectura (20 a
// 40 ensayos, 30 por defecto) o dicen por qué no, y nunca se usan fuera del modo experto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requiereModoExperto, esPiloto, problemasDeFicha } from '../src/catalogo.js';
import { maxEnsayos } from '../src/inicio.js';
import { ACTIVIDADES_F3 } from '../src/f3-datos.js';
import { itemsDeRevision } from '../src/revision-datos.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const IDS = ['ACT-03', 'ACT-04', 'ACT-05', 'ACT-06', 'ACT-08', 'ACT-09', 'ACT-10', 'ACT-11', 'ACT-12', 'ACT-13', 'ACT-14', 'ACT-15', 'ACT-16', 'ACT-17'];
const fichas = Object.fromEntries(IDS.map((id) => [id, leer(`fichas/${id}.json`)]));
const CON_ENSAYOS = IDS.filter((id) => id !== 'ACT-17');

test('cada ficha lista sus decisiones clínicas pendientes y dice que su contenido es una propuesta', () => {
  for (const id of IDS) {
    const f = fichas[id];
    assert.ok(Array.isArray(f.pendientesClinicos) && f.pendientesClinicos.length >= 2, id);
    for (const p of f.pendientesClinicos) assert.ok(typeof p === 'string' && p.trim().endsWith('.'), `${id}: «${p}»`);
    assert.match(f.notaPrototipo, /propuesta/, id);
  }
});

test('ninguna ficha tiene revisión clínica, y todas son de uso posterior o de investigación', () => {
  for (const id of IDS) {
    assert.deepEqual(fichas[id].revisionClinica, { revisor: '', fecha: '' }, id);
    assert.ok(['Uso posterior', 'Investigación'].includes(fichas[id].estado), id);
    assert.equal(esPiloto(id), false, id);
    assert.equal(requiereModoExperto(fichas[id]), true, id);
  }
});

test('ninguna entra en el formulario F3 ni en la revisión clínica', () => {
  assert.deepEqual(ACTIVIDADES_F3, ['ACT-01', 'ACT-02', 'ACT-07']);
  const posteriores = leer('items/items-posteriores.json').items;
  assert.ok(posteriores.length > 0);
  assert.deepEqual(itemsDeRevision(posteriores), []);
});

test('los bloques tienen de 20 a 40 ensayos, o la ficha dice por qué no', () => {
  for (const id of CON_ENSAYOS) {
    const f = fichas[id];
    if (f.ensayosExcepcion) {
      assert.match(f.ensayosExcepcion, /Arquitectura 4\.5/, `${id}: el motivo cita la Arquitectura`);
      assert.ok(f.pendientesClinicos.some((p) => p.includes('ensayosExcepcion')), `${id}: la excepción queda como pendiente clínico`);
    } else {
      assert.ok(f.ensayosPorBloque >= 20 && f.ensayosPorBloque <= 40, `${id}: ${f.ensayosPorBloque} ensayos`);
    }
    for (const b of f.bandas) assert.ok(maxEnsayos(f, b) >= f.ensayosPorBloque, `${id} ${b.id}: cabe el bloque propuesto`);
    assert.deepEqual(problemasDeFicha(f), [], id);
  }
  // Las excepciones son las que pide la mecánica: secuencias y la pausa.
  assert.deepEqual(IDS.filter((id) => fichas[id].ensayosExcepcion), ['ACT-10', 'ACT-16', 'ACT-17']);
  // 30 por defecto; ACT-12 (40 elecciones) y ACT-14 (40: 10 por emoción en B2 y B3) lo dicen en su ficha.
  const distintos = CON_ENSAYOS.filter((id) => !fichas[id].ensayosExcepcion && fichas[id].ensayosPorBloque !== 30);
  assert.deepEqual(distintos, ['ACT-12', 'ACT-14']);
});

test('ACT-06, ACT-08 y ACT-11 no copian la contraindicación de ACT-01: queda pendiente', () => {
  for (const id of ['ACT-06', 'ACT-08', 'ACT-11']) {
    assert.deepEqual(fichas[id].contraindicaciones, ['Pendiente de decisión clínica.'], id);
    assert.doesNotMatch(fichas[id].notaPrototipo, /se copió/, id);
    assert.ok(fichas[id].pendientesClinicos.some((p) => p.startsWith('Fijar las contraindicaciones')), id);
  }
  // Donde la copia sigue, queda como pendiente de confirmar.
  for (const id of IDS.filter((x) => fichas[x].contraindicaciones.includes('Discapacidad visual no corregida.'))) {
    assert.ok(fichas[id].pendientesClinicos.some((p) => p.includes('«Discapacidad visual no corregida»')), id);
  }
});

test('la verificación de GitHub regenera los dos bancos antes de comparar', () => {
  const flujo = readFileSync(new URL('../.github/workflows/verificacion.yml', import.meta.url), 'utf8');
  assert.match(flujo, /node tools\/build-items\.mjs\s+node tools\/build-posteriores\.mjs\s+cambios="\$\(git status --porcelain -- items assets\)"/);
});
