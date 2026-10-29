import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from '../src/engine/quality.js';

const read = (id) => JSON.parse(readFileSync(new URL(`../fichas/${id}.json`, import.meta.url), 'utf8'));
const row = (o = {}) => ({ acierto: true, omision: false, interrumpido: false, anticipatoria: false, tr_bruto_ms: 1000, ...o });

// 10 ensayos: 9 aciertos, 1 omisión, más un ensayo interrumpido que no cuenta.
const rows = [
  ...Array.from({ length: 8 }, (_, i) => row({ tr_bruto_ms: 900 + i * 100 })),
  row({ acierto: true, tr_bruto_ms: 120, anticipatoria: true }),
  row({ acierto: false, omision: true, tr_bruto_ms: null }),
  row({ acierto: false, interrumpido: true, tr_bruto_ms: null }),
];

test('el resumen de ACT-01 usa la frase del catálogo y describe omisiones y mediana', () => {
  const lines = summarize(rows, read('ACT-01'));
  assert.equal(lines[0], 'Emparejó imágenes iguales en 9 de 10 ensayos.');
  assert.equal(lines[1], 'Sin respuesta: 1 de 10 ensayos.');
  assert.match(lines[2], /^Mediana del tiempo de respuesta: 1\.25 s, en 8 ensayos/);
  assert.ok(lines.includes('Ensayos interrumpidos por pausa: 1.'));
  assert.ok(lines.includes('Respuestas anticipatorias (menos de 150 ms): 1.'));
});

test('el resumen nunca usa lecturas no permitidas ni lenguaje de puntaje o diagnóstico', () => {
  for (const id of ['ACT-01', 'ACT-02', 'ACT-07']) {
    const ficha = read(id);
    const text = summarize(rows, ficha).join(' ').toLowerCase();
    for (const l of ficha.lecturasNoPermitidas) assert.ok(!text.includes(l.toLowerCase()), `${id}: «${l}»`);
    assert.doesNotMatch(text, /puntaje|nivel|diagn[oó]stic|incorrect|vocabulario|estilo|aprende|normal/, id);
  }
});
