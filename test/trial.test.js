import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrial, startBlock, STATES, AUDIO_CAP_MS } from '../src/engine/trial.js';
import { createLog, COLUMNS } from '../src/engine/logger.js';
import { rng } from '../src/engine/selector.js';

const ficha = JSON.parse(readFileSync(new URL('../fichas/ACT-01.json', import.meta.url), 'utf8'));
const PAINT_MS = 16; // en el entorno simulado, cada cuadro se pinta 16 ms después de pedirlo

// Entorno con tiempo virtual: los temporizadores se disparan en orden cuando run() avanza el reloj.
function fakeEnv({ audio = null, frames = { total: 100, late: 0 }, focusLost = false } = {}) {
  let t = 0;
  const timers = [];
  const env = {
    now: () => t,
    at: (ms, fn) => timers.push({ at: t + ms, fn }),
    sleep: (ms) => new Promise((resolve) => env.at(ms, resolve)),
    nextPaint: () => new Promise((resolve) => env.at(PAINT_MS, () => resolve(t))),
    frames: { start() {}, stop: () => frames },
    focus: { start() {}, stop: () => focusLost },
    audio,
    async run(promise) {
      let finished = false;
      promise.then(() => (finished = true), () => (finished = true));
      for (;;) {
        await new Promise((resolve) => setImmediate(resolve));
        if (finished || !timers.length) break;
        timers.sort((a, b) => a.at - b.at);
        const next = timers.shift();
        t = next.at;
        next.fn();
      }
      return promise;
    },
  };
  return env;
}

function fakeView(hooks = {}) {
  const calls = [];
  return {
    calls,
    clear: () => calls.push(['clear']),
    showPrompt: (c) => calls.push(['prompt', c]),
    showOptions: (o) => {
      calls.push(['options', o]);
      hooks.onOptions?.(o);
    },
    showFeedback: (p) => calls.push(['feedback', p]),
  };
}

const opciones = [
  { id: 'perro-1', correcta: false },
  { id: 'gato-1', correcta: true },
];
const consigna = { audio: 'cual-es-igual', texto: '¿Cuál es igual?' };

function setup({ modalidad = 'V', audio, onOptions, frames, focusLost } = {}) {
  const env = fakeEnv({ audio, frames, focusLost });
  const states = [];
  let trial;
  const view = fakeView({ onOptions: (o) => onOptions?.(env, trial, o) });
  trial = createTrial({ ficha, modalidad, consigna, opciones, posCorrecta: 2, env, view, onState: (s) => states.push(s) });
  return { env, view, states, trial, run: () => env.run(trial.run()) };
}

test('pasa por los seis estados en orden y mide el tiempo desde la aparición de las opciones', async () => {
  const { states, run } = setup({
    onOptions: (env, trial) => env.at(800, () => trial.pointer({ t: env.now(), x: 10, y: 10, pos: 2 })),
  });
  const r = await run();
  assert.deepEqual(states, STATES);
  assert.equal(r.acierto, true);
  assert.equal(r.opcion_elegida, 2);
  assert.equal(r.t_consigna_fin - r.t_consigna_inicio, ficha.consignaVMs);
  assert.equal(r.t_opciones - r.t_opciones_insercion, PAINT_MS);
  assert.equal(r.tr_bruto_ms, 800 - PAINT_MS);
  assert.equal(r.tr_bruto_ms, r.t_toque - r.t_opciones);
  assert.equal(r.t_retro_fin - r.t_retro_inicio, ficha.retroalimentacionMs);
  assert.equal(r.omision, false);
  assert.equal(r.peso_calidad, 1);
});

test('registra omisión al llegar al límite y señala la opción correcta', async () => {
  const { states, view, run } = setup();
  const r = await run();
  assert.deepEqual(states, STATES);
  assert.equal(r.omision, true);
  assert.equal(r.acierto, false);
  assert.equal(r.opcion_elegida, null);
  assert.equal(r.t_toque, null);
  assert.equal(r.tr_bruto_ms, null);
  assert.equal(r.t_retro_inicio - r.t_opciones, ficha.limiteRespuestaMs + PAINT_MS);
  assert.deepEqual(view.calls.find((c) => c[0] === 'feedback'), ['feedback', 2]);
});

test('registra toques fuera de las opciones e ignora el segundo toque a menos de 100 ms', async () => {
  const { run } = setup({
    onOptions: (env, trial) => {
      env.at(300, () => trial.pointer({ t: env.now(), x: 5, y: 7, pos: null }));
      env.at(600, () => trial.pointer({ t: env.now(), x: 50, y: 60, pos: 1 }));
      env.at(650, () => trial.pointer({ t: env.now(), x: 300, y: 60, pos: 2 }));
    },
  });
  const r = await run();
  assert.equal(r.opcion_elegida, 1, 'cuenta el primer toque sobre una opción');
  assert.equal(r.acierto, false);
  assert.equal(r.toques_repetidos, 1);
  assert.equal(r.toques_fuera.length, 1);
  assert.deepEqual(Object.keys(r.toques_fuera[0]), ['t', 'x', 'y']);
  assert.equal(r.toques_fuera[0].x, 5);
});

test('un toque antes de 150 ms es anticipatorio y su peso de calidad es 0', async () => {
  const { run } = setup({
    onOptions: (env, trial) => env.at(100, () => trial.pointer({ t: env.now(), pos: 2 })),
  });
  const r = await run();
  assert.equal(r.anticipatoria, true);
  assert.equal(r.peso_calidad, 0);
});

test('la pausa cierra el ensayo como interrumpido', async () => {
  const { states, run } = setup({
    onOptions: (env, trial) => env.at(400, () => trial.interrupt()),
  });
  const r = await run();
  assert.equal(r.interrumpido, true);
  assert.equal(r.omision, false);
  assert.equal(r.t_toque, null);
  assert.equal(states.at(-1), 'cierre');
  assert.ok(!states.includes('retroalimentacion'));
});

test('AV: la consigna dura hasta que termina el audio', async () => {
  const audio = {
    play: async () => {
      const tInicio = env.now();
      return { tInicio, fuente: 'archivo', latenciaMs: 12, fin: new Promise((res) => env.at(900, () => res(env.now()))) };
    },
  };
  const { env, run } = setup({ modalidad: 'AV', audio });
  const r = await run();
  assert.equal(r.audio_fuente, 'archivo');
  assert.equal(r.audio_latencia_ms, 12);
  assert.equal(r.t_audio_fin - r.t_audio_inicio, 900);
  assert.equal(r.t_consigna_fin, r.t_audio_fin);
  assert.equal(r.audio_fin_por_tope, false);
});

test('AV: si no llega el fin del audio, t_audio_fin queda vacío y se marca el tope', async () => {
  const audio = {
    play: async () => ({ tInicio: env.now(), fuente: 'sintesis', fin: new Promise(() => {}) }),
  };
  const { env, run } = setup({ modalidad: 'AV', audio });
  const r = await run();
  assert.equal(r.audio_fuente, 'sintesis');
  assert.equal(r.t_audio_fin, null);
  assert.equal(r.audio_fin_por_tope, true);
  assert.equal(r.t_consigna_fin - r.t_audio_inicio, AUDIO_CAP_MS);
});

test('pérdida de foco y cuadros perdidos se reflejan en el peso de calidad', async () => {
  const onOptions = (env, trial) => env.at(800, () => trial.pointer({ t: env.now(), pos: 2 }));
  const conCuadros = await setup({ onOptions, frames: { total: 100, late: 10 } }).run();
  assert.equal(conCuadros.cuadros_perdidos, 10);
  assert.equal(conCuadros.peso_calidad, 0.9);
  const sinFoco = await setup({ onOptions, focusLost: true }).run();
  assert.equal(sinFoco.perdida_foco, true);
  assert.equal(sinFoco.peso_calidad, 0);
});

test('el bloque guarda un registro completo por ensayo y no repite el ensayo pausado', async () => {
  const env = fakeEnv();
  const log = createLog(null);
  const trials = ['ACT01-B1-01', 'ACT01-B1-02', 'ACT01-B1-03'].map((codigo) => ({ codigo, consigna, opciones }));
  let shown = 0;
  let block;
  const view = fakeView({
    onOptions: (o) => {
      shown++;
      if (shown === 2) env.at(300, () => block.pause());
      else env.at(500, () => block.pointer({ t: env.now(), pos: o.findIndex((x) => x.correcta) + 1 }));
    },
  });
  let pauses = 0;
  block = startBlock({
    ficha,
    modalidad: 'V',
    trials,
    base: { sesion_id: 'S-prueba', bloque: 1, codigo_nino: 'DEMO', dispositivo: 'prueba', banda: 'B1', version_app: '0.1.0' },
    env,
    view,
    log,
    rand: rng(1),
    onPause: async () => (pauses++, 'continuar'),
  });
  const rows = await env.run(block.done);
  assert.equal(rows.length, 3);
  assert.equal(pauses, 1);
  assert.deepEqual(rows.map((r) => r.item), ['ACT01-B1-01', 'ACT01-B1-02', 'ACT01-B1-03']);
  assert.deepEqual(rows.map((r) => r.ensayo), [1, 2, 3]);
  assert.deepEqual(rows.map((r) => r.interrumpido), [false, true, false]);
  assert.deepEqual(rows.map((r) => r.acierto), [true, false, true]);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row), COLUMNS);
    assert.equal(row.actividad, 'ACT-01');
    assert.equal(row.n_opciones, 2);
    assert.equal(row.pos_distractores.length, 1);
    assert.notEqual(row.pos_distractores[0].pos, row.pos_correcta);
  }
  assert.equal(log.rows().length, 3);
});
