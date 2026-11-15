// ACT-15 «Sonidos de las palabras» (tanda 2): requiere la voz grabada. Con la voz del navegador
// solo se abre con un aviso, y nunca registra como válido un ensayo con audio_fuente = sintesis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startBlock } from '../src/engine/trial.js';
import { createLog } from '../src/engine/logger.js';
import { fueraDeTarea } from '../src/engine/quality.js';
import { createAudio } from '../src/engine/audio.js';
import { resumen } from '../src/activities/fonologia.js';
import { AVISO_VOZ_GRABADA, lineasSinVozGrabada } from '../src/voz-grabada.js';
import { simEnv } from '../tools/sim-env.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-15.json'));
const opciones = [
  { id: 'pato', correcta: true },
  { id: 'perro', correcta: false },
];

// Un bloque de n ensayos en AV con la voz dada; el niño toca la opción correcta a los 800 ms.
async function bloque(f, fuente, n = 3) {
  const env = simEnv({
    audio: {
      available: async () => true,
      play: async () => ({ tInicio: env.now() + 2, fuente, latenciaMs: fuente === 'archivo' ? 10 : null, fin: new Promise((res) => env.at(700, () => res(env.now()))) }),
    },
  });
  let b;
  const view = {
    clear() {},
    showPrompt() {},
    showOptions: (ops) => env.at(16 + 800, () => b.pointer({ t: env.now(), pos: ops.findIndex((o) => o.correcta) + 1 })),
    showFeedback() {},
  };
  const trials = Array.from({ length: n }, (_, k) => ({ codigo: `ACT15-B1-0${k + 1}`, consigna: { audio: 'cual-rima-con-gato', texto: '¿Cuál rima con gato?' }, opciones }));
  b = startBlock({ ficha: f, modalidad: 'AV', trials, base: { sesion_id: 's', banda: 'B1' }, env, view, log: createLog(null), rand: () => 0.1 });
  return env.run(b.done);
}

test('la ficha dice que requiere la voz grabada', () => {
  assert.equal(ficha.requiereVozGrabada, true);
  assert.deepEqual(ficha.modalidades, ['AV']);
  assert.match(ficha.notaPrototipo, /ningún ensayo queda como válido/);
  assert.ok(ficha.pendientesClinicos.some((p) => p.startsWith('Grabar la voz de una persona hablante nativa')));
});

test('con la voz del navegador, ningún ensayo queda como válido', async () => {
  const filas = await bloque(ficha, 'sintesis');
  assert.equal(filas.length, 3);
  for (const r of filas) {
    assert.equal(r.audio_fuente, 'sintesis');
    assert.equal(r.fallo_tecnico, true);
    assert.equal(r.peso_calidad, 0);
    // La respuesta se registra igual: solo cambia que no es válida.
    assert.equal(r.acierto, true);
    assert.equal(r.tr_bruto_ms, 800);
  }
  // Tampoco cuenta para «fuera de tarea».
  assert.ok(fueraDeTarea(filas).every((v) => v === null));
});

test('con la voz grabada, los ensayos son válidos', async () => {
  const filas = await bloque(ficha, 'archivo');
  for (const r of filas) {
    assert.equal(r.audio_fuente, 'archivo');
    assert.equal(r.fallo_tecnico, false);
    assert.ok(r.peso_calidad > 0);
  }
});

test('sin «requiereVozGrabada», la voz del navegador sigue como antes', async () => {
  const { requiereVozGrabada, ...sinMarca } = ficha;
  const filas = await bloque(sinMarca, 'sintesis');
  for (const r of filas) assert.equal(r.fallo_tecnico, false);
});

test('el resumen del bloque no cuenta los ensayos con la voz del navegador', async () => {
  const sint = await bloque(ficha, 'sintesis', 2);
  const grab = await bloque(ficha, 'archivo', 4);
  const lineas = resumen([...sint, ...grab], new Map(), ficha);
  assert.equal(lineas[0], '2 ensayos se hicieron con la voz del navegador: no son válidos porque esta actividad requiere la voz grabada, y no se cuentan abajo.');
  assert.match(lineas[1], /^Tocó la respuesta en 4 de 4 ensayos/);
  // Solo con la voz del navegador, no hay conteos.
  assert.deepEqual(resumen(sint, new Map(), ficha), lineasSinVozGrabada(sint));
  assert.deepEqual(lineasSinVozGrabada(grab), []);
});

test('sin archivos de voz, la voz no está grabada', async () => {
  const audio = createAudio({ base: 'file:///no-existe/' });
  assert.equal(await audio.grabada(['cual-rima-con-gato']), false);
  assert.equal(await audio.grabada([]), false);
});

test('el inicio pide confirmar el aviso antes de abrirla con la voz del navegador', () => {
  const app = leer('src/app.js');
  assert.match(app, /if \(f\.modalidad === 'AV' && ficha\.requiereVozGrabada && !\(await audio\.grabada\(trials\.map\(\(t\) => t\.consigna\.audio\)\)\)\) \{\s+if \(!\(await confirmarVozGrabada\(\)\)\) return renderInicio\(\);/);
  // El aviso va antes de la sesión: si el adulto vuelve, no se crea nada.
  assert.ok(app.indexOf('await confirmarVozGrabada()') < app.indexOf('if (!state.session) {\n    state.session = s;'));
  assert.match(app, /<h1>Requiere la voz grabada<\/h1>/);
  assert.match(app, /Abrir para revisar la mecánica/);
  assert.match(AVISO_VOZ_GRABADA, /requiere la voz grabada.*ningún ensayo queda como válido/);
  assert.match(leer('src/engine/trial.js'), /if \(ficha\.requiereVozGrabada && a\.fuente === 'sintesis'\) r\.fallo_tecnico = true;/);
});
