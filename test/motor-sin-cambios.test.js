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
const versiones = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(readFileSync(new URL(`../fichas/${id}.json`, import.meta.url), 'utf8')).version]));

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
    // version_ficha es la de la ficha de ahora: sube cuando cambia su contenido (tanda 4).
    for (const c of Object.keys(antes[i])) if (c !== 'version_ficha') assert.deepEqual(fila[c], antes[i][c], `fila ${i + 1}, ${c}`);
    assert.equal(fila.version_ficha, versiones[fila.actividad], `fila ${i + 1}: version_ficha`);
    assert.equal(fila.t_muestra_fin, null, `fila ${i + 1}: el piloto no tiene muestra que se quite`);
    assert.equal(fila.mitad_fase2, null, `fila ${i + 1}: fuera de la fase 2 no hay mitad`);
  });
});

test('las columnas anteriores siguen en el mismo lugar; las nuevas van al final', () => {
  const n = Object.keys(antes[0]).length;
  assert.deepEqual(COLUMNS.slice(0, n), Object.keys(antes[0]));
  assert.deepEqual(COLUMNS.slice(n), ['t_muestra_fin', 'mitad_fase2']);
  // En el CSV del piloto, la columna nueva queda vacía.
  const [cabecera, fila] = toCSV(antes.slice(0, 1)).replace('﻿', '').split('\r\n');
  assert.ok(cabecera.endsWith(',t_muestra_fin,mitad_fase2'));
  assert.ok(fila.endsWith(',,'));
});
