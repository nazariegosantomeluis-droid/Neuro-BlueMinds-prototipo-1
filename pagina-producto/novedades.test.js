// Pruebas de lo que la página de producto dice sobre las actividades en preparación y sobre
// el propio prototipo: los números salen del Catálogo y de las pruebas, no se escriben a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const html = leer('./index.html');
const { actividades } = JSON.parse(leer('../fichas/catalogo.json'));
const textoDe = (atributo, valor) => [...html.matchAll(new RegExp(`<([a-z0-9]+)\\b[^>]*\\b${atributo}="${valor}"[^>]*>([^<]*)</\\1>`, 'g'))].map((m) => m[2].trim());

test('la sección «En preparación» lista las actividades de uso posterior que tienen prototipo, con su nombre', () => {
  const conPrototipo = actividades.filter((a) => a.estado === 'Uso posterior' && a.prototipo);
  const enPagina = [...html.matchAll(/data-posterior="(ACT-\d{2})"/g)].map((m) => m[1]);
  assert.deepEqual(enPagina, conPrototipo.map((a) => a.id));
  for (const a of conPrototipo) {
    assert.deepEqual(textoDe('data-posterior', a.id), [a.id]);
    assert.deepEqual(textoDe('data-nombre', a.id), [a.nombre], a.id);
    // Cada una lleva su captura, salvo que se llame distinto (la pausa guiada).
    const captura = a.id === 'ACT-17' ? 'pausa-guiada' : a.id.toLowerCase();
    assert.ok(html.includes(`../assets/pagina-producto/${captura}.webp`), `${a.id}: captura`);
    assert.ok(existsSync(new URL(`../assets/pagina-producto/${captura}.webp`, import.meta.url)), `${a.id}: archivo`);
  }
});

test('los totales del Catálogo que dice la página son los de fichas/catalogo.json', () => {
  const EN_LETRA = { 0: 'cero', 1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce' };
  const cuantas = (estado) => actividades.filter((a) => a.estado === estado).length;
  assert.deepEqual(textoDe('data-catalogo', 'total'), [String(actividades.length)]);
  assert.deepEqual(textoDe('data-catalogo', 'sin-prototipo'), [String(actividades.filter((a) => !a.prototipo).length)]);
  assert.deepEqual(textoDe('data-catalogo', 'piloto'), [EN_LETRA[cuantas('Piloto')]]);
  assert.deepEqual(textoDe('data-catalogo', 'posterior'), [EN_LETRA[cuantas('Uso posterior')]]);
  assert.deepEqual(textoDe('data-catalogo', 'investigacion'), [EN_LETRA[cuantas('Investigación')]]);
  // El título cuenta las que no son del piloto.
  const fuera = actividades.length - cuantas('Piloto');
  assert.match(html, new RegExp(`>${EN_LETRA[fuera][0].toUpperCase()}${EN_LETRA[fuera].slice(1)} actividades más\\.`));
});

test('las actividades en investigación van aparte, con su nombre y su captura', () => {
  const enInvestigacion = actividades.filter((a) => a.estado === 'Investigación');
  const enPagina = [...html.matchAll(/data-investigacion="(ACT-\d{2})"/g)].map((m) => m[1]);
  assert.deepEqual(enPagina, enInvestigacion.filter((a) => a.prototipo).map((a) => a.id));
  for (const a of enInvestigacion) {
    assert.deepEqual(textoDe('data-investigacion', a.id), [a.id]);
    assert.deepEqual(textoDe('data-nombre', a.id), [a.nombre], a.id);
    assert.ok(html.includes(`../assets/pagina-producto/${a.id.toLowerCase()}.webp`), `${a.id}: captura`);
    assert.ok(existsSync(new URL(`../assets/pagina-producto/${a.id.toLowerCase()}.webp`, import.meta.url)), `${a.id}: archivo`);
  }
  // Nunca con la insignia de uso posterior.
  assert.doesNotMatch(html, /Uso posterior · <span data-investigacion/);
});

test('la página dice que las actividades en preparación solo se abren en modo experto', () => {
  const seccion = html.match(/<section id="en-preparacion"[\s\S]*?<\/section>/)[0];
  assert.match(seccion, /Se abren solo en modo experto/);
  assert.match(seccion, /no se usan con niños/);
  // Y nunca las presenta como parte del piloto.
  assert.doesNotMatch(seccion, /piloto<\/span>|Piloto ·/);
});

test('el número de pruebas automáticas que dice la página es el de la carpeta test/', () => {
  const carpeta = new URL('../test/', import.meta.url);
  const total = readdirSync(carpeta)
    .filter((f) => f.endsWith('.test.js'))
    .reduce((n, f) => n + (readFileSync(new URL(f, carpeta), 'utf8').match(/^test\(/gm) ?? []).length, 0);
  const enPagina = [...html.matchAll(/<[a-z]+\b[^>]*\bdata-pruebas[^>]*>(\d+)</g)].map((m) => Number(m[1]));
  assert.ok(enPagina.length >= 2, 'la cifra grande y la frase');
  for (const n of enPagina) assert.equal(n, total);
});

test('ninguna página nombra la captura que se reemplazó', () => {
  for (const ruta of ['./index.html', './pagina.css', './pagina.js', '../README.md', '../items/licencias.csv']) {
    assert.doesNotMatch(leer(ruta), /inicio-registro\.webp/, ruta);
  }
});
