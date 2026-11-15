// ACT-13 «Espera la señal» (tanda 2): el estímulo de «sí» ya no es un globo, para que no se
// parezca al globo de la pausa guiada (ACT-17).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESTIMULOS, PLURAL, resumen, galeriaHTML } from '../src/activities/senal.js';
import { indiceDeItems } from '../src/sesiones.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-13.json'));
const { items } = JSON.parse(leer('items/items-posteriores.json'));
const series = items.filter((i) => i.actividad === 'ACT-13');

// Trazos (atributo d) de un SVG.
const trazos = (svg) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);

test('el estímulo de «sí» es un pez, no el globo de la pausa guiada', () => {
  assert.deepEqual(ficha.estimulos, { si: 'pez', no: 'nube' });
  assert.deepEqual(Object.keys(ESTIMULOS).sort(), ['nube', 'pez']);
  const pausa = leer('src/pausa-guiada.js');
  const globo = pausa.slice(pausa.indexOf('const GLOBO'), pausa.indexOf('</svg>', pausa.indexOf('const GLOBO')));
  for (const d of trazos(ESTIMULOS.pez)) assert.ok(!trazos(globo).includes(d), 'no comparte trazos con el globo');
  // Ni el color del globo de la pausa ni su forma de globo con cuerda.
  assert.doesNotMatch(ESTIMULOS.pez, /#7fb8a8/i);
  assert.doesNotMatch(leer('src/activities/senal.js').replace(/\/\/.*$/gm, ''), /globo/);
  assert.doesNotMatch(JSON.stringify({ ...ficha, notaPrototipo: '' }), /globo/);
  assert.match(ficha.notaPrototipo, /pausa guiada \(ACT-17\)/);
});

test('el banco y los textos usan el pez', () => {
  assert.ok(series.length > 0);
  for (const s of series) {
    for (const e of s.ensayos) {
      const [o] = e.opciones;
      assert.equal(o.estimulo, e.tipo === 'si' ? 'pez' : 'nube', e.codigo);
    }
  }
  assert.equal(ficha.consignaAV, 'Toca el pez.');
  assert.match(ficha.mecanica, /el niño toca el pez y deja la nube sin tocar/);
  assert.match(galeriaHTML(series[0], { ficha }), /\d+ peces y \d+ nubes, en este orden/);
  assert.deepEqual(PLURAL, { pez: 'peces', nube: 'nubes' });
  const byCode = indiceDeItems(series);
  const filas = series[0].ensayos.map((e) => ({ item: e.codigo, opcion_elegida: e.tipo === 'si' ? 1 : null, tr_bruto_ms: e.tipo === 'si' ? 600 : null, anticipatoria: false, interrumpido: false }));
  assert.match(resumen(filas, byCode, ficha)[0], /^Ante el pez \(«sí»\): tocó \d+ de \d+; sin tocar, 0 \(omisiones\)\.$/);
});
