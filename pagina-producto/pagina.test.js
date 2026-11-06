// Pruebas de la página de producto (npm test las encuentra solas).
// - Los números marcados con data-ficha dicen lo mismo que fichas/.
// - El muro de columnas es el registro de src/engine/logger.js, en el mismo orden.
// - No carga nada de servidores externos y todo archivo local que usa existe.
// - Respeta las reglas de movimiento del prototipo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { COLUMNS } from '../src/engine/logger.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
// Los comentarios explican las reglas con las mismas palabras que se buscan; no cuentan.
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const html = leer('./index.html');
const css = sinComentarios(leer('./pagina.css'));
const js = sinComentarios(leer('./pagina.js'));
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`../fichas/${id}.json`))]));

const valor = (ruta) => ruta.split('.').reduce((v, clave) => (v == null ? v : v[clave]), fichas);
const FORMATOS = {
  '': (v) => String(v),
  '-s': (v) => `${v / 1000} s`,
  '-pct': (v) => `${v * 100} %`,
};

test('la página de producto dice lo mismo que las fichas', () => {
  const marcas = [...html.matchAll(/<([a-z0-9]+)\b[^>]*\bdata-ficha(-s|-pct)?="([^"]+)"[^>]*>([^<]*)<\/\1>/g)];
  assert.ok(marcas.length >= 40, `solo hay ${marcas.length} datos marcados`);
  for (const [, , formato = '', ruta, texto] of marcas) {
    const v = valor(ruta);
    assert.notEqual(v, undefined, `${ruta} no existe en las fichas`);
    assert.equal(texto.trim(), FORMATOS[formato](v), ruta);
  }
});

test('el muro de columnas es el registro por ensayo, en el mismo orden', () => {
  const muro = html.match(/<ul class="muro"[^>]*>([\s\S]*?)<\/ul>/)[1];
  const columnas = [...muro.matchAll(/<li[^>]*>([^<]+)<\/li>/g)].map((m) => m[1].trim());
  assert.deepEqual(columnas, COLUMNS);
  assert.match(html, new RegExp(`data-columnas-total>${COLUMNS.length}<`));
});

test('la página de producto no carga nada de servidores externos', () => {
  assert.doesNotMatch(html, /<script[^>]+src="https?:|<link[^>]+href="https?:|<img[^>]+src="https?:/i);
  assert.doesNotMatch(css, /@import|url\(\s*['"]?https?:/i);
  assert.doesNotMatch(js, /fetch\(|import\s*\(|https?:\/\//);
  assert.doesNotMatch(html + css + js, /googleapis|gstatic|gtag|analytics/i);
  // Roca Two y More Sugar no están en el repositorio: solo se buscan instaladas.
  for (const bloque of css.match(/@font-face\s*\{[^}]*\}/g)) {
    if (/Roca Two|More Sugar/.test(bloque)) assert.doesNotMatch(bloque, /url\(/, bloque);
  }
});

test('todo archivo local que usa la página existe', () => {
  const rutas = [
    ...[...html.matchAll(/\b(?:src|href|data-[a-z-]+)="(\.{1,2}\/[^"#?]*|[a-z][^":#?]*\.(?:css|js|png|svg|webp))"/g)].map((m) => m[1]),
    ...[...css.matchAll(/url\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]),
  ].filter((r) => r && r !== '../' && r !== './');
  assert.ok(rutas.length > 20);
  for (const r of rutas) assert.ok(existsSync(new URL(r, import.meta.url)), `falta ${r}`);
});

test('la página de producto respeta las reglas de movimiento', () => {
  assert.doesNotMatch(css, /@keyframes|animation\s*:(?!\s*none)/);
  assert.doesNotMatch(js, /setInterval|\.animate\(/);
  const duraciones = [...css.matchAll(/transition\s*:([^;]+);/g)].flatMap((m) => [...m[1].matchAll(/(\d+)ms/g)].map((d) => Number(d[1])));
  assert.ok(duraciones.length > 0);
  for (const d of duraciones) assert.ok(d >= 200 && d <= 300, `transición de ${d} ms`);
  assert.doesNotMatch(css, /transition\s*:[^;]*\d(\.\d+)?s\b/, 'duraciones en ms');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
