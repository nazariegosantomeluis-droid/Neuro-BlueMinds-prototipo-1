import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrial, startBlock, STATES, AUDIO_CAP_MS, DECODE_CAP_MS, NO_AUDIO_MSG } from '../src/engine/trial.js';
import { createLog, COLUMNS } from '../src/engine/logger.js';
import { rng } from '../src/engine/selector.js';
import { simEnv } from '../tools/sim-env.mjs';

const ficha = JSON.parse(readFileSync(new URL('../fichas/ACT-01.json', import.meta.url), 'utf8'));
const PAINT_MS = 16; // en el entorno simulado, cada cambio se pinta 16 ms después de pedirlo

function fakeView(hooks = {}) {
  const calls = [];
  return {
    calls,
    clear: () => calls.push(['clear']),
    showPrompt: (c) => calls.push(['prompt', c]),
    showOptions: (o, d) => {
      calls.push(['options', o, d]);
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

// Audio simulado: play() se comporta según la función que recibe el entorno.
const fakeAudio = (play, available = true) => ({ available: async () => available, play });

function setup({ modalidad = 'V', audio, onOptions, frames, focusLost } = {}) {
  const env = simEnv({ audio: audio && fakeAudio((...a) => audio(env, ...a)), frames, focusLost });
  const states = [];
  let trial;
  const view = fakeView({ onOptions: (o) => onOptions?.(env, trial, o) });
  trial = createTrial({ ficha, modalidad, consigna, opciones, posCorrecta: 2, disposicion: '1x2', env, view, onState: (s) => states.push(s) });
  return { env, view, states, trial, run: () => env.run(trial.run()) };
}

// Programa un toque a ms de la inserción de las opciones.
const touch = (env, trial, ms, p) => env.at(ms, () => trial.pointer({ t: env.now(), ...p }));

test('pasa por los seis estados en orden y mide el tiempo desde la aparición de las opciones', async () => {
  const { states, view, run } = setup({ onOptions: (env, trial) => touch(env, trial, 800, { x: 10, y: 10, pos: 2 }) });
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
  assert.equal(view.calls.find((c) => c[0] === 'options')[2], '1x2');
  assert.equal(r.opcion_elegida_id, 'gato-1');
  for (const c of ['t_audio_inicio', 't_audio_fin', 'audio_fuente', 'audio_latencia_ms', 'audio_fin_por_tope']) {
    assert.equal(r[c], null, `${c} vacío en V`);
  }
  assert.equal(r.decodificacion_ok, null, 'vacío si la pantalla no decodifica imágenes');
});

test('las imágenes de las opciones se decodifican durante la consigna; si fallan o tardan, se registra', async () => {
  const conDecodificacion = (prepare) => {
    const s = setup();
    s.view.prepareOptions = () => prepare(s.env);
    return s.run();
  };
  const ok = await conDecodificacion(async () => {});
  assert.equal(ok.decodificacion_ok, true);
  assert.equal(ok.t_consigna_fin - ok.t_consigna_inicio, ficha.consignaVMs, 'no alarga la consigna');
  const lenta = await conDecodificacion((env) => new Promise((res) => env.at(1800, res)));
  assert.equal(lenta.decodificacion_ok, true);
  assert.equal(lenta.t_consigna_fin - lenta.t_consigna_inicio, 1800, 'las opciones esperan a la decodificación');
  assert.equal((await conDecodificacion(async () => { throw new Error('EncodingError'); })).decodificacion_ok, false);
  const nunca = await conDecodificacion(() => new Promise(() => {}));
  assert.equal(nunca.decodificacion_ok, false);
  assert.equal(nunca.t_consigna_fin - nunca.t_consigna_inicio, ficha.consignaVMs + DECODE_CAP_MS, 'con tope');
});

test('registra omisión al llegar al límite y señala la opción correcta', async () => {
  const { states, view, run } = setup();
  const r = await run();
  assert.deepEqual(states, STATES);
  assert.equal(r.omision, true);
  assert.equal(r.acierto, false);
  assert.equal(r.opcion_elegida, null);
  assert.equal(r.opcion_elegida_id, null);
  assert.equal(r.t_toque, null);
  assert.equal(r.tr_bruto_ms, null);
  assert.equal(r.t_retro_inicio - r.t_opciones, ficha.limiteRespuestaMs + PAINT_MS);
  assert.deepEqual(view.calls.find((c) => c[0] === 'feedback'), ['feedback', 2]);
});

test('palma fuera de las opciones y dedo en una opción 60 ms después: cuenta como respuesta', async () => {
  const { run } = setup({
    onOptions: (env, trial) => {
      touch(env, trial, 600, { x: 5, y: 700, pos: null });
      touch(env, trial, 660, { x: 300, y: 400, pos: 2 });
    },
  });
  const r = await run();
  assert.equal(r.opcion_elegida, 2);
  assert.equal(r.acierto, true);
  assert.equal(r.tr_bruto_ms, 660 - PAINT_MS);
  assert.equal(r.toques_repetidos, 0);
  assert.deepEqual(r.toques_fuera.map(({ x, y }) => [x, y]), [[5, 700]]);
  assert.deepEqual(Object.keys(r.toques_fuera[0]), ['t', 'x', 'y']);
});

test('un segundo toque sobre una opción a menos de 100 ms de la respuesta es repetido; después de 100 ms se ignora', async () => {
  const { run } = setup({
    onOptions: (env, trial) => {
      touch(env, trial, 600, { pos: 1 });
      touch(env, trial, 650, { pos: 2 });
      touch(env, trial, 900, { pos: 2 });
    },
  });
  const r = await run();
  assert.equal(r.opcion_elegida, 1, 'cuenta el primer toque');
  assert.equal(r.opcion_elegida_id, 'perro-1');
  assert.equal(r.acierto, false);
  assert.equal(r.toques_repetidos, 1);
  assert.equal(r.toques_fuera.length, 0);
});

test('multitáctil: dos toques simultáneos en opciones distintas, cuenta el de event.timeStamp más temprano', async () => {
  // El navegador entrega primero el evento con timeStamp posterior.
  const { run } = setup({
    onOptions: (env, trial) =>
      env.at(700, () => {
        const t = env.now();
        trial.pointer({ t: t + 8, pos: 1 });
        trial.pointer({ t, pos: 2 });
      }),
  });
  const r = await run();
  assert.equal(r.opcion_elegida, 2);
  assert.equal(r.acierto, true);
  assert.equal(r.tr_bruto_ms, 700 - PAINT_MS);
  assert.equal(r.toques_repetidos, 1);
});

test('un toque antes de 150 ms es anticipatorio y su peso de calidad es 0', async () => {
  const { run } = setup({ onOptions: (env, trial) => touch(env, trial, 100, { pos: 2 }) });
  const r = await run();
  assert.equal(r.anticipatoria, true);
  assert.equal(r.peso_calidad, 0);
});

test('la pausa cierra el ensayo como interrumpido', async () => {
  const { states, run } = setup({ onOptions: (env, trial) => env.at(400, () => trial.interrupt()) });
  const r = await run();
  assert.equal(r.interrumpido, true);
  assert.equal(r.omision, false);
  assert.equal(r.t_toque, null);
  assert.equal(states.at(-1), 'cierre');
  assert.ok(!states.includes('retroalimentacion'));
});

test('AV: la consigna dura hasta que termina el audio', async () => {
  const audio = async (env) => ({
    tInicio: env.now(),
    fuente: 'archivo',
    latenciaMs: 12,
    fin: new Promise((res) => env.at(900, () => res(env.now()))),
  });
  const r = await setup({ modalidad: 'AV', audio }).run();
  assert.equal(r.audio_fuente, 'archivo');
  assert.equal(r.audio_latencia_ms, 12);
  assert.equal(r.t_audio_fin - r.t_audio_inicio, 900);
  assert.equal(r.t_consigna_fin, r.t_audio_fin);
  assert.equal(r.audio_fin_por_tope, false);
  assert.equal(r.fallo_tecnico, false);
});

test('AV: si no llega el fin del audio, t_audio_fin queda vacío y se marca el tope', async () => {
  const audio = async (env) => ({ tInicio: env.now(), fuente: 'sintesis', fin: new Promise(() => {}) });
  const r = await setup({ modalidad: 'AV', audio }).run();
  assert.equal(r.audio_fuente, 'sintesis');
  assert.equal(r.t_audio_fin, null);
  assert.equal(r.audio_fin_por_tope, true);
  assert.equal(r.t_consigna_fin - r.t_audio_inicio, AUDIO_CAP_MS);
  assert.equal(r.fallo_tecnico, false);
});

test('AV: si el audio no arranca o falla, el ensayo queda como fallo técnico con peso 0', async () => {
  const onOptions = (env, trial) => touch(env, trial, 800, { pos: 2 });
  const noArranca = await setup({ modalidad: 'AV', audio: async () => { throw new Error('sin voz'); }, onOptions }).run();
  assert.equal(noArranca.audio_fuente, 'ninguna');
  assert.equal(noArranca.fallo_tecnico, true);
  assert.equal(noArranca.peso_calidad, 0);
  assert.equal(noArranca.acierto, true, 'el ensayo continúa');
  assert.equal(noArranca.t_consigna_fin - noArranca.t_consigna_inicio, ficha.consignaVMs);

  const falla = await setup({
    modalidad: 'AV',
    audio: async (env) => ({ tInicio: env.now(), fuente: 'sintesis', fin: new Promise((_, rej) => env.at(300, () => rej(new Error('error')))) }),
    onOptions,
  }).run();
  assert.equal(falla.audio_fuente, 'sintesis');
  assert.equal(falla.t_audio_fin, null);
  assert.equal(falla.fallo_tecnico, true);
  assert.equal(falla.peso_calidad, 0);
});

test('pérdida de foco y cuadros perdidos se reflejan en el peso de calidad', async () => {
  const onOptions = (env, trial) => touch(env, trial, 800, { pos: 2 });
  const conCuadros = await setup({ onOptions, frames: () => ({ total: 100, late: 10 }) }).run();
  assert.equal(conCuadros.cuadros_perdidos, 10);
  assert.equal(conCuadros.cuadros_total, 100);
  assert.equal(conCuadros.peso_calidad, 0.9);
  const sinFoco = await setup({ onOptions, focusLost: () => true }).run();
  assert.equal(sinFoco.perdida_foco, true);
  assert.equal(sinFoco.peso_calidad, 0);
});

// Bloque de ACT-01 B1 con tres ensayos; plan[i] decide qué pasa en el ensayo i:
// 'acierto', 'error', 'pausa', 'salto' o un número (acierto a esos ms de la inserción).
function runBlock({ modalidad = 'V', audio, plan = [], log = createLog(null), base = {} } = {}) {
  const env = simEnv({ audio });
  const trials = ['ACT01-B1-01', 'ACT01-B1-02', 'ACT01-B1-03'].map((codigo) => ({ codigo, consigna, opciones }));
  let shown = 0;
  let block;
  const view = fakeView({
    onOptions: (o) => {
      const action = plan[shown++] ?? 'acierto';
      if (action === 'pausa') env.at(300, () => block.pause());
      else if (action === 'salto') env.at(300, () => block.skip());
      else {
        const correcta = o.findIndex((x) => x.correcta) + 1;
        const pos = action === 'error' ? (correcta % o.length) + 1 : correcta;
        env.at(typeof action === 'number' ? action : 500, () => block.pointer({ t: env.now(), pos }));
      }
    },
  });
  let pauses = 0;
  const started = [];
  block = startBlock({
    ficha,
    modalidad,
    trials,
    base: { sesion_id: 'EXP-prueba', bloque: 1, codigo_nino: 'DEMO', dispositivo: 'prueba', banda: 'B1', version_app: '0.1.0', ...base },
    env,
    view,
    log,
    rand: rng(1),
    onPause: async () => (pauses++, 'continuar'),
    onTrial: (t) => started.push(t.codigo),
  });
  return { done: env.run(block.done), log, pauses: () => pauses, started };
}

test('modo experto: «Siguiente» cierra el ensayo como interrumpido y pasa al siguiente sin pausa', async () => {
  const b = runBlock({ plan: ['salto', 'acierto', 'salto'] });
  const rows = await b.done;
  assert.equal(b.pauses(), 0);
  assert.deepEqual(rows.map((r) => r.interrumpido), [true, false, true]);
  assert.deepEqual(b.started, ['ACT01-B1-01', 'ACT01-B1-02', 'ACT01-B1-03'], 'avisa el código de cada ensayo');
});

test('el bloque guarda un registro completo por ensayo y no repite el ensayo pausado', async () => {
  const b = runBlock({ plan: ['acierto', 'pausa', 'acierto'] });
  const rows = await b.done;
  assert.equal(b.pauses(), 1);
  assert.deepEqual(rows.map((r) => r.item), ['ACT01-B1-01', 'ACT01-B1-02', 'ACT01-B1-03']);
  assert.deepEqual(rows.map((r) => r.ensayo), [1, 2, 3]);
  assert.deepEqual(rows.map((r) => r.interrumpido), [false, true, false]);
  assert.deepEqual(rows.map((r) => r.acierto), [true, false, true]);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row), COLUMNS);
    assert.equal(row.actividad, 'ACT-01');
    assert.equal(row.n_opciones, 2);
    assert.equal(row.disposicion, '1x2');
    assert.equal(row.pos_distractores.length, 1);
    assert.notEqual(row.pos_distractores[0].pos, row.pos_correcta);
  }
  assert.equal(b.log.rows().length, 3);
});

test('AV: sin audio en el dispositivo, el bloque no empieza y avisa al adulto', async () => {
  let asked;
  const audio = { available: async (keys) => ((asked = keys), false), play: async () => null };
  const b = runBlock({ modalidad: 'AV', audio });
  await assert.rejects(b.done, { message: NO_AUDIO_MSG });
  assert.equal(b.log.rows().length, 0);
  assert.deepEqual(asked, ['cual-es-igual', 'cual-es-igual', 'cual-es-igual'], 'comprueba las claves del bloque');
});

test('AV: si el audio falla a mitad del bloque, marca ese ensayo y el bloque continúa', async () => {
  let calls = 0;
  const env0 = { now: () => 0 };
  const audio = fakeAudio(async () => {
    calls++;
    if (calls === 2) throw new Error('la voz dejó de responder');
    return { tInicio: env0.now(), fuente: 'sintesis', fin: Promise.resolve(env0.now()) };
  });
  const rows = await runBlock({ modalidad: 'AV', audio }).done;
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.audio_fuente), ['sintesis', 'ninguna', 'sintesis']);
  assert.deepEqual(rows.map((r) => r.fallo_tecnico), [false, true, false]);
  assert.deepEqual(rows.map((r) => r.peso_calidad), [1, 0, 1]);
});

test('opcion_elegida_id: el id de la opción tocada, aunque las opciones se barajen', async () => {
  const rows = await runBlock({ plan: ['acierto', 'error', 'error'] }).done;
  assert.deepEqual(rows.map((r) => r.opcion_elegida_id), ['gato-1', 'perro-1', 'perro-1']);
  for (const r of rows.slice(1)) assert.equal(r.pos_distractores.find((d) => d.pos === r.opcion_elegida).id, r.opcion_elegida_id);
});

test('tr_corregido_ms descuenta la latencia del dispositivo; sin latencia queda vacío', async () => {
  const sin = await runBlock().done;
  assert.deepEqual(sin.map((r) => r.tr_corregido_ms), [null, null, null]);
  const con = await runBlock({ base: { latencia_dispositivo_ms: 40 } }).done;
  for (const r of con) assert.equal(r.tr_corregido_ms, r.tr_bruto_ms - 40);
});

test('al cerrar el bloque se marca fuera_de_tarea con todos los ensayos de la sesión', async () => {
  const log = createLog(null);
  for (const tr of [480, 500, 520, 470, 510]) log.add({ sesion_id: 'EXP-prueba', bloque: 0, tr_bruto_ms: tr });
  log.add({ sesion_id: 'S-otra', tr_bruto_ms: 9000 });
  const rows = await runBlock({ log, plan: [500, 4000, 'pausa'] }).done;
  assert.deepEqual(rows.map((r) => r.fuera_de_tarea), [false, true, null]);
  assert.deepEqual(log.rows().map((r) => r.fuera_de_tarea), [false, false, false, false, false, null, false, true, null]);
});
