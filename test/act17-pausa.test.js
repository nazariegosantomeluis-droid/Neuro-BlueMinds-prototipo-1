// ACT-17 «Pausa guiada» (tanda 2): solo en modo experto y nunca durante una sesión del piloto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pausaGuiadaPermitida, PAUSA_SOLO_EXPERTO } from '../src/pausa-permiso.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = (id) => JSON.parse(leer(`fichas/${id}.json`));

test('solo se permite en una sesión en modo experto y fuera de los bloques del piloto', () => {
  const experto = { id: 'EXP-1', experto: true };
  const conNino = { id: 'NB-0001-1', experto: false };
  const demo = { id: 'DEMO-1', experto: false };
  assert.equal(pausaGuiadaPermitida(), false, 'sin sesión');
  assert.equal(pausaGuiadaPermitida({ sesion: conNino }), false, 'sesión del piloto con niño');
  assert.equal(pausaGuiadaPermitida({ sesion: demo }), false, 'demostración');
  assert.equal(pausaGuiadaPermitida({ sesion: experto }), true);
  for (const id of ['ACT-01', 'ACT-02', 'ACT-07']) {
    assert.equal(pausaGuiadaPermitida({ sesion: experto, ficha: ficha(id) }), false, `bloque de ${id}`);
    assert.equal(pausaGuiadaPermitida({ sesion: conNino, ficha: ficha(id) }), false, `${id} con niño`);
  }
  assert.equal(pausaGuiadaPermitida({ sesion: experto, ficha: ficha('ACT-03') }), true);
  assert.equal(pausaGuiadaPermitida({ sesion: conNino, ficha: ficha('ACT-03') }), false);
  assert.match(PAUSA_SOLO_EXPERTO, /solo se abre en una sesión en modo experto, y nunca durante una sesión del piloto/);
});

test('el panel de pausa, la página «Pausa guiada» y el inicio usan la misma regla', () => {
  const app = leer('src/app.js');
  // Menú del terapeuta: solo si está permitida, nunca en la referencia motora ni en las rutinas.
  assert.match(app, /\$\{state\.pausa && !enReferencia && pausaGuiadaPermitida\(\{ sesion: s, ficha \}\) \? pausaOpcionesHTML\(true\) : ''\}/);
  assert.match(app, /await abrirMenu\(wrap, \{ s, ficha, ensayo, aviso \}\)/);
  assert.match(app, /await abrirMenu\(wrap, \{ s, enReferencia: true, ensayo: aparicion \}\)/);
  assert.match(app, /abrirMenu\(wrap, \{ s, enRutina: true \}\)/);
  // Página #pausa: sin permiso, solo el aviso y ningún botón.
  assert.match(app, /const permitida = pausaGuiadaPermitida\(\{ sesion: state\.session \}\);/);
  assert.match(app, /: `<p class="aviso" role="status">\$\{esc\(PAUSA_SOLO_EXPERTO\)\}<\/p>`/);
  assert.match(app, /if \(!permitida\) return;\n  app\.querySelector\('\[data-guiada\]'\)\.onclick/);
  // El inicio solo enlaza la pausa si está permitida.
  const inicio = leer('src/inicio.js');
  assert.match(inicio, /pausaGuiadaPermitida\(\{ sesion: state\.session \}\)\s+\? '<div class="acciones"><a class="boton" href="#pausa">Abrir la pausa guiada<\/a><\/div>'\s+: `<p class="ayuda">\$\{esc\(PAUSA_SOLO_EXPERTO\)\}<\/p>`/);
});

test('la ficha lo dice', () => {
  const p = ficha('ACT-17');
  assert.match(p.notaPrototipo, /solo se abre en una sesión en modo experto, y nunca durante una sesión del piloto/);
  assert.equal(p.estado, 'Uso posterior');
});
