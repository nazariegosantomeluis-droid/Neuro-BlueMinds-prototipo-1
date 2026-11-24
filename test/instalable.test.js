// Aplicación instalable que funciona sin conexión (H6.1; RF-09, parte local; RNF-10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { listaDeArchivos } from '../tools/generar-sw.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const tamanoPNG = (ruta) => {
  const b = readFileSync(new URL(`../${ruta}`, import.meta.url));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test('manifest: nombre, inicio, pantalla completa e íconos de 192 y 512 px', () => {
  const m = JSON.parse(leer('manifest.webmanifest'));
  assert.equal(m.short_name, 'AutiPal');
  assert.equal(m.start_url, './#inicio');
  assert.equal(m.display, 'fullscreen');
  assert.equal(m.lang, 'es-MX');
  for (const [src, tam] of [['assets/marca/icono-192.png', 192], ['assets/marca/logo.png', 512]]) {
    assert.ok(m.icons.some((i) => i.src === src && i.sizes === `${tam}x${tam}`), src);
    assert.deepEqual(tamanoPNG(src), [tam, tam]);
  }
  assert.match(leer('index.html'), /<link rel="manifest" href="manifest\.webmanifest" \/>/);
});

test('el trabajador de servicio guarda todos los archivos de la aplicación (lista al día)', () => {
  const { archivos } = JSON.parse(leer('sw-archivos.json'));
  assert.deepEqual(archivos, listaDeArchivos(), 'corre node tools/generar-sw.mjs');
  for (const f of archivos.filter((x) => x !== './')) assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  for (const f of ['index.html', 'src/app.js', 'fichas/sesion.json', 'items/items.json', 'src/panel/plantillas.json', 'assets/marca/logo.png']) assert.ok(archivos.includes(f), f);
});

test('red primero, lo guardado sin red; solo archivos propios y nunca datos de niños', () => {
  const sw = leer('sw.js');
  assert.match(sw, /await cache\.addAll\(archivos\)/);
  assert.match(sw, /if \(req\.method !== 'GET' \|\| new URL\(req\.url\)\.origin !== self\.location\.origin\) return;/);
  assert.match(sw, /return \(await cache\.match\(req, \{ ignoreSearch: true \}\)\) \?\? Response\.error\(\);/);
  assert.doesNotMatch(sw.replace(/\/\/.*$/gm, ''), /indexedDB|localStorage/);
  assert.match(leer('src/app.js'), /navigator\.serviceWorker\.register\('sw\.js'\)/);
});
