import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const flujo = readFileSync(new URL('../.github/workflows/verificacion.yml', import.meta.url), 'utf8');
const paquete = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('H8.1: la verificación corre en cada envío y en cada pull request', () => {
  assert.match(flujo, /^on:\s*\n\s+push:\s*\n\s+pull_request:/m);
  assert.doesNotMatch(flujo, /branches:/, 'sin filtro de ramas: también las de Miguel');
  assert.match(flujo, /permissions:\s*\n\s+contents: read/, 'solo lectura');
});

test('H8.1: corre las pruebas, check-items y la regeneración del banco en Node 20 y 22', () => {
  assert.match(flujo, /node: \[20, 22\]/);
  assert.match(flujo, /run: npm test/);
  assert.match(flujo, /run: npm run check-items/);
  assert.match(flujo, /node tools\/build-items\.mjs[\s\S]*git status --porcelain -- items assets[\s\S]*exit 1/);
  assert.equal(paquete.scripts.test, 'node --test');
  assert.ok(paquete.scripts['check-items']);
  assert.ok(!paquete.dependencies && !paquete.devDependencies, 'no hay nada que instalar');
});

test('H8.1: el flujo no usa tabuladores (YAML)', () => {
  assert.doesNotMatch(flujo, /\t/);
});
