// Modo experto de la aplicación (tanda 2b). Apagado por defecto: el inicio, la galería, las
// sesiones y el formulario F3 muestran solo ACT-01, ACT-02 y ACT-07, sin los grupos «En
// preparación» ni «En investigación» y sin la pausa guiada. Encendido, se ve todo.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarCatalogo, PILOTO } from '../src/catalogo.js';
import { CLAVE_MODO_EXPERTO, fijarModoExperto, leerModoExperto, modoExpertoActivo, actividadesVisibles, filasVisibles } from '../src/modo-experto.js';
import { renderGaleria, navHTML } from '../src/paginas.js';
import { renderInicio } from '../src/inicio.js';
import { renderSesiones } from '../src/sesiones.js';
import { renderF3 } from '../src/f3.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const fetchLocal = async (url) => ({ ok: true, json: async () => JSON.parse(leer(url)) });
const { catalogo, fichas, problemas, pausa } = await cargarCatalogo(fetchLocal);
const items = [...JSON.parse(leer('items/items.json')).items, ...JSON.parse(leer('items/items-posteriores.json')).items];
const conceptos = JSON.parse(leer('items/conceptos.json')).conceptos;
const TODAS = Object.keys(fichas).sort();
const FUERA = TODAS.filter((id) => !PILOTO.includes(id));

// DOM mínimo: la página escribe su HTML; lo demás (eventos, campos) se ignora.
const nada = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => '' : k === 'querySelectorAll' ? () => [] : k === 'then' || k === Symbol.iterator ? undefined : nada),
  apply: () => nada,
  set: () => true,
});
// Lo que lee el inicio de la ventana.
Object.assign(globalThis, { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, addEventListener: () => {}, removeEventListener: () => {}, getComputedStyle: () => ({ getPropertyValue: () => '59' }), document: { documentElement: {}, createElement: () => nada } });
const fakeApp = () => ({ innerHTML: '', querySelector: () => nada, querySelectorAll: () => [] });
const state = (extra = {}) => ({ catalogo, fichas, problemas, pausa, items, conceptos, form: {}, session: null, revision: null, ...extra });
const log = (rows) => ({ rows: () => rows });

function paginas() {
  const html = {};
  let app = fakeApp();
  renderInicio(app, {
    state: state(),
    volumen: () => 80,
    calibrada: true,
    padron: () => [],
    avisoSinRevision: () => '',
    registroHTML: () => '',
    bindRegistro: () => {},
    bindVolumen: () => {},
    cerrarSesion: () => {},
    empezar: () => {},
    desbloquearAudio: () => {},
  });
  html.inicio = app.innerHTML;
  html.galeria = TODAS.map((id) => {
    app = fakeApp();
    renderGaleria(app, state(), new URLSearchParams(`actividad=${id}`));
    return app.innerHTML;
  });
  // Una sesión con un bloque del piloto y otro de una actividad posterior.
  const filas = [
    { sesion_id: 'EXP-1', bloque: 1, actividad: 'ACT-02', item: 'x', banda: 'B1', modalidad: 'V', acierto: true },
    { sesion_id: 'EXP-1', bloque: 2, actividad: 'ACT-05', item: 'y', banda: 'B1', modalidad: 'AV', acierto: true },
  ];
  app = fakeApp();
  renderSesiones(app, { state: state(), log: log(filas), sesiones: log([{ sesion_id: 'EXP-1', inicio: '2026-11-15T10:00:00Z' }]), registroHTML: () => '', bindRegistro: () => {} });
  html.sesiones = app.innerHTML;
  app = fakeApp();
  renderF3(app, state());
  html.f3 = app.innerHTML;
  return html;
}

const radios = (html) => [...html.matchAll(/name="actividad" value="(ACT-\d\d)"/g)].map((m) => m[1]);

afterEach(() => fijarModoExperto(false));

test('apagado por defecto, también sin nada guardado', () => {
  assert.equal(modoExpertoActivo(), false);
  assert.equal(leerModoExperto({ get: (_, d) => d }), false);
  assert.equal(leerModoExperto({ get: () => '1' }), true);
  assert.equal(leerModoExperto({ get: () => 'si' }), false);
  assert.equal(CLAVE_MODO_EXPERTO, 'nbm.modoExperto');
  assert.deepEqual(actividadesVisibles(TODAS), PILOTO);
  assert.deepEqual(filasVisibles([{ actividad: 'ACT-01' }, { actividad: 'ACT-12' }]), [{ actividad: 'ACT-01' }]);
});

test('apagado: solo ACT-01, ACT-02 y ACT-07, sin grupos fuera del piloto ni pausa guiada', () => {
  const html = paginas();
  // Inicio.
  assert.deepEqual(radios(html.inicio), PILOTO);
  assert.doesNotMatch(html.inicio, /En preparación|En investigación|grupo-posterior/);
  assert.doesNotMatch(html.inicio, /Pausa guiada|href="#pausa"/);
  assert.doesNotMatch(html.inicio, /name="experto"/, 'sin sesiones en modo experto');
  // Galería: solo el piloto en el selector, y una actividad fuera del piloto no se abre.
  for (const g of html.galeria) {
    assert.deepEqual(radios(g), PILOTO);
    assert.doesNotMatch(g, /En preparación|En investigación/);
    for (const id of FUERA) assert.ok(!g.includes(`${id} · ${fichas[id].nombre}`), id);
  }
  // Sesiones: el bloque de ACT-05 no se ve; se dice que hay ensayos ocultos.
  assert.match(html.sesiones, /ACT-02/);
  assert.doesNotMatch(html.sesiones, /ACT-05/);
  assert.match(html.sesiones, /Hay 1 ensayos de actividades fuera del piloto\. Se ven con el modo experto encendido\./);
  // F3: siempre solo el piloto.
  for (const id of FUERA) assert.doesNotMatch(html.f3, new RegExp(`${id}\\b`), id);
  // El interruptor está en el encabezado, apagado.
  assert.match(navHTML('inicio'), /<input type="checkbox" data-modo-experto >/);
});

test('encendido: se ve todo, como antes', () => {
  fijarModoExperto(true);
  const html = paginas();
  assert.deepEqual(radios(html.inicio).sort(), TODAS);
  assert.match(html.inicio, /En preparación: uso posterior/);
  assert.match(html.inicio, /En investigación/);
  assert.match(html.inicio, /<h2 id="pausa-titulo">Pausa guiada<\/h2>/);
  assert.match(html.inicio, /name="experto"/);
  for (const g of html.galeria) {
    assert.deepEqual(radios(g).sort(), TODAS);
  }
  assert.match(html.sesiones, /ACT-05/);
  assert.doesNotMatch(html.sesiones, /fuera del piloto\. Se ven con el modo experto/);
  for (const id of FUERA) assert.doesNotMatch(html.f3, new RegExp(`${id}\\b`), `F3 sigue solo con el piloto: ${id}`);
  assert.match(navHTML('inicio'), /<input type="checkbox" data-modo-experto checked>/);
});

test('la aplicación lee el modo al arrancar, lo guarda al cambiarlo y protege las rutas', () => {
  const app = leer('src/app.js');
  assert.match(app, /fijarModoExperto\(leerModoExperto\(prefs\)\);/);
  assert.match(app, /prefs\.set\(CLAVE_MODO_EXPERTO, e\.target\.checked \? '1' : '0'\);/);
  assert.match(app, /else if \(ruta === 'pausa' && state\.pausa && modoExpertoActivo\(\)\) renderPausa\(\);/);
  assert.match(app, /if \(!modoExpertoActivo\(\) && requiereModoExperto\(ficha\)\) return renderInicio\(/);
});
