// Rutinas de la sesión con un niño (tanda 3, Catálogo 7.1): inicio con pictogramas siempre igual,
// transición de 5 s con el pictograma de la siguiente y cierre igual en todas las sesiones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rutinaInicioHTML, transicionHTML, cierreHTML, PICTO_REFERENCIA } from '../src/rutinas.js';
import { ESQUEMAS } from '../src/catalogo.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const config = JSON.parse(leer('fichas/sesion.json'));
const FIN = 'assets/picto/terminar.png';
// Texto visible: lo que queda fuera de las etiquetas.
const texto = (html) => html.replace(/<[^>]+>/g, '').trim();

test('la rutina de inicio muestra la secuencia con pictogramas: referencia, actividades y fin', () => {
  const html = rutinaInicioHTML(['ACT-02', 'ACT-07'], FIN);
  const orden = [PICTO_REFERENCIA, ESQUEMAS['ACT-02'], ESQUEMAS['ACT-07'], `<img src="${FIN}" alt="">`].map((x) => html.indexOf(x));
  assert.ok(orden.every((i) => i >= 0), 'están los cuatro pictogramas');
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, 'en orden');
  assert.equal((html.match(/rutina-flecha/g) ?? []).length, 3);
  assert.equal(texto(html), '', 'sin texto');
  // La fase 2 repite ACT-02, pero la rutina es la misma que en las demás fases.
  assert.equal(rutinaInicioHTML(['ACT-02', 'ACT-02', 'ACT-07'], FIN), html);
});

test('la transición muestra solo el pictograma de la actividad que sigue, y el cierre siempre es igual', () => {
  assert.equal(texto(transicionHTML('ACT-07')), '');
  assert.ok(transicionHTML('ACT-07').includes(ESQUEMAS['ACT-07']));
  assert.equal(cierreHTML(FIN), cierreHTML(FIN));
  assert.match(cierreHTML(FIN), /rutina-aparece/);
  assert.equal(texto(cierreHTML(FIN)), '');
});

test('los tiempos vienen de fichas/sesion.json: la transición dura 5 s', () => {
  assert.equal(config.transicionMs, 5000);
  const app = leer('src/app.js');
  assert.match(app, /await mostrarRutina\(rutinaInicioHTML\(paso\.actividades, PICTO_FIN\), cfg\.rutinaInicioMs\);/);
  assert.match(app, /await mostrarRutina\(transicionHTML\(paso\.siguiente\), cfg\.transicionMs\);/);
  assert.match(app, /await mostrarRutina\(cierreHTML\(PICTO_FIN\), cfg\.rutinaCierreMs\);/);
  // El cierre se muestra aunque la sesión termine antes: no depende del desempeño.
  assert.match(app, /\} else if \(paso\.tipo === 'rutina-cierre'\) \{\n\s+\/\/ Igual en todas las sesiones/);
  assert.doesNotMatch(app.slice(app.indexOf("paso.tipo === 'rutina-cierre'"), app.indexOf("paso.tipo === 'referencia'")), /terminar\)/);
});

test('la animación del cierre es una transición de 300 ms, sin parpadeo ni repetición (RNF-05)', () => {
  const css = leer('src/styles.css');
  assert.match(css, /\.rutina-aparece \{\n\s+transition: opacity 300ms ease-out, transform 300ms ease-out;/);
  assert.doesNotMatch(css, /@keyframes/);
});
