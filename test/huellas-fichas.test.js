// Ninguna ficha cambia de contenido sin cambiar de versión (tanda 4). El registro de cada ensayo
// guarda version_ficha (Arquitectura 6.2), así que dos contenidos distintos con la misma versión
// harían indistinguibles sus ensayos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fichasActuales, huellaDeFicha, revisarHuellas, versionMayor, RUTA_HUELLAS } from '../tools/huellas-fichas.mjs';

const anotadas = JSON.parse(readFileSync(RUTA_HUELLAS, 'utf8'));

test('cada ficha coincide con su huella y su versión anotadas', () => {
  assert.deepEqual(revisarHuellas(fichasActuales(), anotadas), []);
});

test('ACT-02 subió a 0.2.0 por el campo fase2 de la tanda 3', () => {
  assert.equal(anotadas['ACT-02.json'].version, JSON.parse(readFileSync(new URL('../fichas/ACT-02.json', import.meta.url), 'utf8')).version);
  assert.ok(versionMayor(anotadas['ACT-02.json'].version, '0.1.0'));
});

test('un cambio de contenido con la misma versión se detecta; con versión nueva pide anotarla', () => {
  const ficha = { id: 'X', version: '1.0.0', nombre: 'Prueba', bandas: [{ id: 'B1', opciones: 2 }] };
  const base = { 'X.json': { version: '1.0.0', huella: huellaDeFicha(ficha) } };
  const cambiada = { ...ficha, bandas: [{ id: 'B1', opciones: 3 }] };
  assert.match(revisarHuellas({ 'X.json': { version: '1.0.0', huella: huellaDeFicha(cambiada) } }, base)[0], /el contenido cambió y la versión sigue en 1\.0\.0/);
  assert.match(revisarHuellas({ 'X.json': { version: '1.0.1', huella: huellaDeFicha(cambiada) } }, base)[0], /corre node tools\/huellas-fichas\.mjs/);
  assert.match(revisarHuellas({ 'X.json': { version: '0.9.0', huella: huellaDeFicha(cambiada) } }, base)[0], /no es mayor/);
  // El orden de las claves y la anotación de la revisión clínica no cambian la huella.
  const reordenada = { bandas: ficha.bandas, nombre: 'Prueba', id: 'X', version: '1.0.0', revisionClinica: { revisor: 'AB', fecha: '2026-11-14' } };
  assert.equal(huellaDeFicha(reordenada), huellaDeFicha(ficha));
  assert.deepEqual(revisarHuellas({ 'X.json': { version: '1.0.0', huella: huellaDeFicha(reordenada) } }, base), []);
});

test('versionMayor compara por número, no por texto', () => {
  assert.ok(versionMayor('0.10.0', '0.9.9'));
  assert.ok(!versionMayor('0.2.0', '0.2.0'));
  assert.ok(versionMayor('1.0.0', '0.99.0'));
});
