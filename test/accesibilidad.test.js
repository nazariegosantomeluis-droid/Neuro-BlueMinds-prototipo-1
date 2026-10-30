import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const js = ['app.js', 'paginas.js', 'activities/seleccion.js', 'activities/cambia-regla.js']
  .map((f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'))
  .join('\n');

test('RNF-05: nada destella; solo transiciones suaves de 200 a 300 ms', () => {
  assert.doesNotMatch(css, /@keyframes|animation\s*:(?!\s*none)/, 'sin animaciones en bucle');
  assert.doesNotMatch(js, /setInterval|\.animate\(/, 'sin parpadeos programados');
  const durations = [...css.matchAll(/transition\s*:[^;]*?(\d+)ms/g)].map((m) => Number(m[1]));
  assert.ok(durations.length > 0);
  for (const ms of durations) assert.ok(ms >= 200 && ms <= 300, `transición de ${ms} ms`);
});

test('las opciones aparecen completas en un cuadro: sin opacidad ni animación de entrada', () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, sel]) => /\.opcion|\.stage img/.test(sel));
  assert.ok(rules.length >= 3);
  for (const [, sel, body] of rules) {
    assert.doesNotMatch(body, /opacity|animation|visibility/, sel.trim());
    for (const m of body.matchAll(/transition\s*:\s*([^;]+)/g)) assert.match(m[1], /^box-shadow\b/, `${sel.trim()}: solo el marco`);
  }
});

test('las transiciones se desactivan con prefers-reduced-motion', () => {
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(block, /transition:\s*none\s*!important/);
  assert.match(block, /animation:\s*none\s*!important/);
});

test('RNF-04: cada opción mide al menos 2 cm y hay al menos 0.5 cm entre opciones', () => {
  assert.match(css, /--opcion:\s*clamp\(\s*calc\(var\(--cm\) \* 2\)/, 'mínimo de 2 cm por opción');
  const gaps = [...css.matchAll(/--separacion:\s*calc\(var\(--cm\) \* ([\d.]+)\)/g)].map((m) => Number(m[1]));
  assert.ok(gaps.length > 0);
  for (const g of gaps) assert.ok(g >= 0.5, `separación de ${g} cm`);
});

test('la pantalla del niño no carga recursos de terceros ni analítica', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const source of [html, css, js, ...readdirSync(new URL('../src/engine/', import.meta.url)).map((f) => readFileSync(new URL(`../src/engine/${f}`, import.meta.url), 'utf8'))]) {
    assert.doesNotMatch(source, /<script[^>]+src="https?:|@import|fetch\(\s*['"`]https?:|gtag|analytics/i);
  }
});
