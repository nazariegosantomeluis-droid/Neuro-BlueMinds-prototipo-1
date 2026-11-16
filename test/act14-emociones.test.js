// ACT-14 «Reconoce la emoción» (tandas 2 y 2b): las opciones son pictogramas de la emoción con
// rostro, como dice el Catálogo, pero en un estilo claramente distinto del estímulo (rostro con
// rasgos realistas frente a un esquema de trazos), para que no se resuelva copiando la boca. Las
// figuras de postura quedan como alternativa y el estilo final, como pendiente clínico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMOCIONES, PERSONAJES, ESTILOS_PICTOGRAMA, CABEZA_POSTURA, pictoEmocionSVG, rostroSVG } from '../src/activities/rostros.js';
import { opcionHTML } from '../src/activities/emociones.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-14.json'));

// Colores de un SVG (fill y stroke), sin «none» ni las referencias a degradados.
const colores = (svg) => new Set([...svg.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase()));
const NEGRO = '#2b2b2b';
const FONDO = '#fff6cf';

test('la ficha usa el esquema, deja la postura como alternativa y el estilo final como pendiente', () => {
  assert.deepEqual(ficha.estilosPictograma.map((e) => e.id), ESTILOS_PICTOGRAMA);
  assert.deepEqual(ESTILOS_PICTOGRAMA, ['esquema', 'postura']);
  assert.equal(ficha.estiloPictograma, 'esquema');
  for (const e of ficha.estilosPictograma) assert.ok(e.descripcion.endsWith('.'), e.id);
  assert.match(ficha.estilosPictograma[0].descripcion, /«elige el pictograma de la emoción»/);
  assert.match(ficha.estilosPictograma[1].descripcion, /alternativa.*cambia lo que se mide/);
  assert.ok(ficha.pendientesClinicos.some((p) => p.startsWith('Elegir el estilo final de los pictogramas de respuesta («estilosPictograma»)')));
  assert.match(ficha.notaPrototipo, /«estiloPictograma»: «esquema»/);
  assert.match(ficha.notaPrototipo, /alternativa \(«postura»\)/);
});

test('el pictograma es un esquema de trazos negros, sin color ni relleno en la boca', () => {
  for (const e of EMOCIONES) {
    const svg = pictoEmocionSVG(e, 'esquema');
    assert.deepEqual([...colores(svg)].sort(), [NEGRO, FONDO].sort(), e);
    // La boca es el último trazo: sin relleno.
    const ultimo = svg.match(/<(path|ellipse)[^>]*\/>\s*<\/svg>$/)[0];
    assert.match(ultimo, /fill="none"/, `${e}: boca sin relleno`);
  }
  assert.equal(new Set(EMOCIONES.map((e) => pictoEmocionSVG(e, 'esquema'))).size, 4);
});

test('el rostro del estímulo es realista: piel con sombra, nariz y labios de color, sin trazos negros en la boca', () => {
  for (const [id, p] of Object.entries(PERSONAJES)) {
    for (const e of EMOCIONES) {
      for (const intensidad of ['alta', 'baja']) {
        const svg = rostroSVG(id, e, intensidad);
        assert.match(svg, /<radialGradient id="piel-/, `${id} ${e}: piel con sombra`);
        assert.match(svg, /fill="url\(#piel-/, id);
        // Colores propios del rostro que el pictograma nunca usa.
        const propios = [...colores(svg)].filter((c) => c !== NEGRO && c !== FONDO);
        assert.ok(propios.length >= 6, `${id} ${e}`);
        assert.ok(propios.includes(p.piel.toLowerCase()), id);
      }
    }
  }
  // La boca del rostro nunca es un trazo negro: va en el color de los labios.
  const bocaNegra = new RegExp(`stroke="${NEGRO}"[^>]*/>\\s*(<path[^>]*/>\\s*)?\\$\\{`);
  assert.doesNotMatch(leer('src/activities/rostros.js').slice(0, leer('src/activities/rostros.js').indexOf('// Nariz')), bocaNegra);
  const fuente = leer('src/activities/rostros.js');
  const boca = fuente.slice(fuente.indexOf('function boca('), fuente.indexOf('// Nariz'));
  assert.doesNotMatch(boca, /\$\{trazo\(/, 'la boca del rostro no usa el trazo negro');
});

test('la pantalla y la galería usan el estilo de la ficha, y la postura sigue disponible', () => {
  assert.equal(opcionHTML({ emocion: 'enojo' }, { ficha }), `<span class="dib dib-figura">${pictoEmocionSVG('enojo', 'esquema')}</span>`);
  assert.equal(opcionHTML({ emocion: 'enojo' }, { ficha: { ...ficha, estiloPictograma: 'postura' } }), `<span class="dib dib-figura">${pictoEmocionSVG('enojo', 'postura')}</span>`);
  assert.equal(opcionHTML({ emocion: 'enojo' }), `<span class="dib dib-figura">${pictoEmocionSVG('enojo', 'esquema')}</span>`);
  assert.throws(() => pictoEmocionSVG('alegria', 'cara'), /Estilo de pictograma desconocido/);
  // Postura: una sola cabeza sin rasgos.
  for (const e of EMOCIONES) {
    const cabezas = [...pictoEmocionSVG(e, 'postura').matchAll(/<g class="cabeza" transform="[^"]+">([\s\S]*?)<\/g>/g)].map((m) => m[1]);
    assert.deepEqual(cabezas, [CABEZA_POSTURA]);
  }
  const vista = leer('src/activities/emociones.js');
  assert.match(vista, /const estilo = ficha\?\.estiloPictograma;/);
  assert.match(vista, /pictoEmocionSVG\(o\.emocion, estilo\)/);
  assert.match(leer('src/paginas.js'), /mod\.opcionHTML\(o, \{ ficha \}\)/);
});

test('la ficha anota que falta la banda de la emoción a partir de una situación', () => {
  assert.deepEqual(ficha.bandas.map((b) => b.id), ['B1', 'B2', 'B3']);
  assert.match(ficha.bandasPendientes[0], /^B4: la emoción a partir de una situación/);
  assert.ok(ficha.pendientesClinicos.some((p) => p.startsWith('Falta la banda B4, la emoción a partir de una situación')));
  assert.match(ficha.notaPrototipo, /Falta la banda B4/);
});
