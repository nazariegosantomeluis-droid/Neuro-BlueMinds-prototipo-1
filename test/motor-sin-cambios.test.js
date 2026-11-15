// Lo que ya se registraba no cambia (tanda 2). test/fixtures/registro-piloto.json guarda los
// registros de bloques simulados de ACT-01, ACT-02 y ACT-07, en V y en AV, hechos con el motor
// antes de agregar t_muestra_fin (ACT-09). El motor de ahora debe dar exactamente lo mismo en
// cada columna anterior, y dejar vacía la columna nueva.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simularPiloto } from '../tools/simular-piloto.mjs';
import { COLUMNS, toCSV } from '../src/engine/logger.js';

const antes = JSON.parse(readFileSync(new URL('./fixtures/registro-piloto.json', import.meta.url), 'utf8'));

test('la referencia cubre las tres actividades del piloto en V y en AV, con errores, omisiones y fallos de audio', () => {
  const bloques = new Set(antes.map((r) => `${r.actividad} ${r.modalidad}`));
  assert.deepEqual([...bloques], ['ACT-01 V', 'ACT-01 AV', 'ACT-02 V', 'ACT-02 AV', 'ACT-07 V', 'ACT-07 AV']);
  assert.ok(antes.some((r) => r.omision));
  assert.ok(antes.some((r) => !r.acierto && !r.omision));
  assert.ok(antes.some((r) => r.audio_fin_por_tope));
  assert.ok(antes.some((r) => r.audio_fuente === 'ninguna'));
  assert.ok(antes.some((r) => r.toques_repetidos > 0));
  assert.ok(!('t_muestra_fin' in antes[0]), 'la referencia es de antes de la columna nueva');
});

test('el motor da los mismos registros del piloto que antes de t_muestra_fin', async () => {
  const ahora = await simularPiloto();
  assert.equal(ahora.length, antes.length);
  ahora.forEach((fila, i) => {
    for (const c of Object.keys(antes[i])) assert.deepEqual(fila[c], antes[i][c], `fila ${i + 1}, ${c}`);
    assert.equal(fila.t_muestra_fin, null, `fila ${i + 1}: el piloto no tiene muestra que se quite`);
  });
});

test('las columnas anteriores siguen en el mismo lugar; la nueva va al final', () => {
  assert.deepEqual(COLUMNS.slice(0, -1), Object.keys(antes[0]));
  assert.equal(COLUMNS.at(-1), 't_muestra_fin');
  // En el CSV del piloto, la columna nueva queda vacía.
  const [cabecera, fila] = toCSV(antes.slice(0, 1)).replace('﻿', '').split('\r\n');
  assert.ok(cabecera.endsWith(',t_muestra_fin'));
  assert.ok(fila.endsWith(','));
});
