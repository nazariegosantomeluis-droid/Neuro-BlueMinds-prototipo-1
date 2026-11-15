// ACT-14 «Reconoce la emoción» (tanda 2): las opciones de respuesta no se pueden resolver
// copiando la forma de la boca del rostro. El estilo de los pictogramas queda como decisión
// clínica pendiente, y falta la banda de la emoción a partir de una situación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMOCIONES, PERSONAJES, ESTILOS_PICTOGRAMA, CABEZA_POSTURA, pictoEmocionSVG, rostroSVG } from '../src/activities/rostros.js';
import { opcionHTML } from '../src/activities/emociones.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-14.json'));

// Lo que dibuja la boca de los rostros: su color y los dientes o la lengua.
const BOCA_DEL_ROSTRO = /#6e2a2a|#e0807e/i;

test('la ficha propone estilos de pictograma y deja la elección como pendiente clínico', () => {
  assert.deepEqual(ficha.estilosPictograma.map((e) => e.id), ESTILOS_PICTOGRAMA);
  assert.ok(ESTILOS_PICTOGRAMA.includes(ficha.estiloPictograma));
  assert.equal(ficha.estiloPictograma, 'postura');
  for (const e of ficha.estilosPictograma) assert.ok(e.descripcion.endsWith('.'), e.id);
  assert.match(ficha.estilosPictograma.find((e) => e.id === 'cara').descripcion, /copiando la forma/);
  assert.ok(ficha.pendientesClinicos.some((p) => p.includes('«estilosPictograma»') && p.includes('copiando la forma de la boca')));
  assert.match(ficha.notaPrototipo, /«estiloPictograma»: «postura»/);
});

test('con el estilo en uso, los pictogramas no tienen cara que copiar', () => {
  const pictos = EMOCIONES.map((e) => pictoEmocionSVG(e, ficha.estiloPictograma));
  for (const svg of pictos) {
    assert.doesNotMatch(svg, BOCA_DEL_ROSTRO, 'sin la boca de los rostros');
    assert.doesNotMatch(svg, /<ellipse/, 'sin ojos ni bocas ovaladas');
    // Una sola cabeza, siempre la misma y sin rasgos: solo un círculo.
    const cabezas = [...svg.matchAll(/<g class="cabeza" transform="[^"]+">([\s\S]*?)<\/g>/g)].map((m) => m[1]);
    assert.deepEqual(cabezas, [CABEZA_POSTURA]);
    assert.match(CABEZA_POSTURA, /^<circle r="21" [^>]*\/>$/);
  }
  // Las bocas de los rostros sí tienen esas marcas, y las caras esquemáticas también las repetían.
  for (const p of Object.keys(PERSONAJES)) assert.match(rostroSVG(p, 'miedo', 'alta'), BOCA_DEL_ROSTRO);
  assert.match(pictoEmocionSVG('miedo', 'cara'), BOCA_DEL_ROSTRO);
});

test('la pantalla y la galería usan el estilo de la ficha', () => {
  assert.equal(opcionHTML({ emocion: 'enojo' }, { ficha }), `<span class="dib dib-figura">${pictoEmocionSVG('enojo', 'postura')}</span>`);
  assert.equal(opcionHTML({ emocion: 'enojo' }, { ficha: { ...ficha, estiloPictograma: 'cara' } }), `<span class="dib dib-figura">${pictoEmocionSVG('enojo', 'cara')}</span>`);
  // Sin ficha, nunca las caras.
  assert.equal(opcionHTML({ emocion: 'enojo' }), `<span class="dib dib-figura">${pictoEmocionSVG('enojo', 'postura')}</span>`);
  assert.throws(() => pictoEmocionSVG('alegria', 'otro'), /Estilo de pictograma desconocido/);
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
