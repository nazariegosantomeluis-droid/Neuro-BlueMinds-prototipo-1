// Versión visible (tanda 4): el pie de las pantallas del adulto muestra la versión y el commit
// publicados, y los CSV del F3 y de la revisión clínica los llevan en cada fila.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { commitDe, cargarVersion, textoVersion, commitCorto, versionActual } from '../src/version.js';
import { VERSION_APP } from '../src/engine/logger.js';
import { F3_COLUMNS, f3CSV, nuevaRespuesta } from '../src/f3-datos.js';
import { REVISION_COLUMNS } from '../src/revision-datos.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const SHA = 'be17d42d65c24d2fefc053466080d9ccc640b952';

test('version.json lo llena GitHub Pages con el commit publicado; sin llenar no hay commit', () => {
  const archivo = leer('version.json');
  assert.match(archivo, /^---\n/, 'lleva encabezado para que Jekyll lo procese');
  assert.match(archivo, /\{\{ site\.github\.build_revision \}\}/);
  assert.equal(commitDe(archivo), null, 'la copia local no tiene commit');
  assert.equal(commitDe(`{"commit": "${SHA}"}`), SHA);
  assert.equal(commitDe('{"commit": ""}'), null);
  assert.equal(commitCorto(SHA), 'be17d42');
});

test('cargarVersion lee el archivo publicado y, si falla, sigue sin commit', async () => {
  const publicado = await cargarVersion(async () => ({ ok: true, text: async () => `{"commit": "${SHA}"}` }));
  assert.deepEqual(publicado, { version: VERSION_APP, commit: SHA });
  assert.deepEqual(versionActual(), publicado);
  assert.equal(textoVersion(publicado), `AutiPal ${VERSION_APP} · commit be17d42`);
  const sinRed = await cargarVersion(async () => {
    throw new Error('sin red');
  });
  assert.equal(sinRed.commit, null);
  assert.match(textoVersion(sinRed), /copia local/);
});

test('el pie está fuera de la pantalla del niño y los CSV de expertos llevan versión y commit', () => {
  assert.match(leer('index.html'), /<footer class="pie-version" id="pie-version"><\/footer>/);
  assert.match(leer('src/styles.css'), /body:has\(#app > \.nino\) \.pie-version \{\n  display: none;/);
  for (const cols of [F3_COLUMNS, REVISION_COLUMNS]) assert.equal(cols[cols.indexOf('version_app') + 1], 'commit');
  const csv = f3CSV(nuevaRespuesta(), Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`fichas/${id}.json`))])), { fecha: '2026-11-23T00:00:00Z', version: VERSION_APP, commit: SHA });
  const [cabecera, ...filas] = csv.replace('﻿', '').trim().split('\r\n');
  const k = cabecera.split(',').indexOf('commit');
  assert.ok(filas.length > 10 && filas.every((f) => f.split(',')[k] === SHA), 'cada fila lleva el commit');
  assert.match(leer('src/f3.js'), /commit: versionActual\(\)\.commit/);
  assert.match(leer('src/revision.js'), /commit: versionActual\(\)\.commit/);
});
