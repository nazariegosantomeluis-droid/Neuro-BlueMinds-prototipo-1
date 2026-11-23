// Tema de imágenes (tanda 3, H2.7; Arquitectura 4.8): el tema cambia las imágenes y nada más, y
// queda en el registro de cada ensayo y de la sesión.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aplicarTema, validarTemas, temaPorId, selectorTemaHTML, TEMA_GENERAL } from '../src/temas.js';
import { PANTALLAS } from '../src/catalogo.js';
import { SESION_COLUMNS, COLUMNS } from '../src/engine/logger.js';
import { planNinoHTML } from '../src/plan-pantalla.js';
import { crearNino } from '../src/ninos.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const temas = JSON.parse(leer('fichas/temas.json'));
const items = JSON.parse(leer('items/items.json')).items ?? JSON.parse(leer('items/items.json'));
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`fichas/${id}.json`))]));
const config = JSON.parse(leer('fichas/sesion.json'));

// Ensayos reales del piloto: los de una banda de ACT-02 y de ACT-07, con su pantalla.
function ensayos(id, banda, cuantos = 6) {
  const ficha = fichas[id];
  const b = ficha.bandas.find((x) => x.id === banda);
  const deBanda = items.filter((i) => i.actividad === id && i.banda === banda).slice(0, cuantos);
  return PANTALLAS[ficha.pantalla].toTrials(deBanda, { ficha, banda: b, pareja: ficha.parejas?.[0], modalidad: 'AV' });
}
const imagenes = (trials) => trials.flatMap((t) => [t.consigna?.src, ...(t.opciones ?? []).map((o) => o.src), ...(t.imagenes ?? [])]).filter(Boolean);
const sinImagenes = (trials) => JSON.parse(JSON.stringify(trials, (k, v) => (k === 'src' || k === 'imagenes' ? undefined : v)));

test('fichas/temas.json es válido y por ahora solo tiene el tema general, que no cambia nada', () => {
  const banco = new Set(['ACT-01', 'ACT-02'].flatMap((id) => fichas[id].bandas.flatMap((b) => imagenes(ensayos(id, b.id, Infinity)))));
  assert.ok(banco.size > 50);
  assert.deepEqual(validarTemas(temas, banco), []);
  assert.deepEqual(temas.temas.map((t) => t.id), [TEMA_GENERAL]);
  const t = ensayos('ACT-02', 'B2');
  assert.equal(aplicarTema(t, temaPorId(temas, TEMA_GENERAL)), t, 'general devuelve los mismos ensayos');
  assert.equal(temaPorId(temas, 'no-existe'), null);
  assert.ok(temas.pendientes.length >= 1);
});

test('un tema cambia las imágenes, no las opciones, su orden, la respuesta correcta ni la banda', () => {
  for (const [id, banda] of [['ACT-01', 'B2'], ['ACT-02', 'B1'], ['ACT-02', 'B3']]) {
    const originales = ensayos(id, banda);
    const copia = JSON.parse(JSON.stringify(originales));
    const srcs = [...new Set(imagenes(originales))];
    assert.ok(srcs.length, `${id} ${banda} tiene imágenes`);
    const tema = { id: 'prueba', nombre: 'Prueba', imagenes: Object.fromEntries(srcs.map((s) => [s, `temas/prueba/${s}`])) };
    const conTema = aplicarTema(originales, tema);
    assert.deepEqual(originales, copia, 'los ensayos originales no cambian');
    assert.deepEqual(sinImagenes(conTema), sinImagenes(originales), `${id} ${banda}: todo igual salvo las imágenes`);
    assert.equal(conTema.length, originales.length);
    conTema.forEach((t, k) => {
      assert.equal(t.opciones.length, originales[k].opciones.length);
      assert.deepEqual(t.opciones.map((o) => o.correcta), originales[k].opciones.map((o) => o.correcta));
    });
    assert.ok(imagenes(conTema).every((s) => s.startsWith('temas/prueba/')), 'todas las imágenes son del tema');
  }
  // ACT-07 dibuja sus tarjetas sin imágenes del banco: ningún tema la cambia.
  const act07 = ensayos('ACT-07', 'B2');
  assert.deepEqual(imagenes(act07), []);
  assert.deepEqual(aplicarTema(act07, { imagenes: { 'assets/img/perro/1.svg': 'x.svg' } }), act07);
  // Un tema que nombra una imagen que no está en el banco no es válido.
  assert.match(validarTemas({ temas: [...temas.temas, { id: 'x', nombre: 'X', imagenes: { 'assets/no.png': 'a.png' } }] }, new Set())[0], /no es una imagen del banco/);
  assert.match(validarTemas({ temas: [{ id: 'general', nombre: 'G', imagenes: { a: 'b' } }] }, new Set(['a']))[0], /no cambia ninguna imagen/);
});

test('el tema se elige en el inicio de la sesión con un niño y queda en el registro', () => {
  assert.ok(COLUMNS.includes('tema_imagenes'));
  assert.ok(SESION_COLUMNS.includes('tema_imagenes'));
  const html = planNinoHTML({ nino: crearNino({ edad_meses: 70 }), config, fichas, temas });
  assert.match(html, /<select name="tema"><option value="general" selected>General<\/option><\/select>/);
  assert.match(selectorTemaHTML({ temas: [...temas.temas, { id: 'animales', nombre: 'Animales' }] }, 'animales'), /value="animales" selected/);
  const app = leer('src/app.js');
  assert.match(app, /tema: temaPorId\(state\.temas, state\.form\.tema\)\?\.id \?\? TEMA_GENERAL/);
  assert.match(app, /trials = aplicarTema\(trials, temaPorId\(state\.temas, s\.tema\)\);\n\s+const srcs =/, 'el tema se aplica antes de precargar las imágenes');
  assert.match(app, /tema_imagenes: s\.tema \?\? 'general'/);
  assert.match(app, /tema_imagenes: s\.tema,\n/);
});
