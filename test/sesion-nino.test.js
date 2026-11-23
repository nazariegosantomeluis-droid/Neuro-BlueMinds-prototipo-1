// Sesión con un niño (tanda 3, H2.3): el modo de fase lo fija el investigador en el padrón, el plan
// sale del modo, la fase 2 sortea la modalidad que abre y todo queda en el registro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planNinoHTML } from '../src/plan-pantalla.js';
import { crearNino, modoDe, cambiarModo, fijarBanda, MODOS_FASE } from '../src/ninos.js';
import { startBlock } from '../src/engine/trial.js';
import { createLog, SESION_COLUMNS, COLUMNS } from '../src/engine/logger.js';
import { simEnv } from '../tools/sim-env.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const config = JSON.parse(leer('fichas/sesion.json'));
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`fichas/${id}.json`))]));

test('el padrón guarda el modo de fase y la banda fija; un niño nuevo empieza en la familiarización', () => {
  const n = crearNino({ edad_meses: 70 });
  assert.equal(n.modo_fase, 'familiarizacion');
  assert.deepEqual(n.bandas, {});
  assert.equal(modoDe({}), 'familiarizacion', 'los inscritos antes de la tanda 3');
  assert.equal(modoDe({ modo_fase: 'fase2' }), 'fase2');
  assert.deepEqual(MODOS_FASE, Object.keys(config.modos));
  assert.equal(cambiarModo('fase3'), 'fase3');
  assert.throws(() => cambiarModo('uso_clinico'), /Modo de fase desconocido/);
  assert.deepEqual(fijarBanda({}, fichas['ACT-02'], 'B3'), { 'ACT-02': 'B3' });
  assert.throws(() => fijarBanda({}, fichas['ACT-02'], 'B9'), /no existe/);
});

test('el inicio muestra la sesión completa del modo del niño', () => {
  const nino = { ...crearNino({ edad_meses: 70 }), modo_fase: 'fase2', bandas: { 'ACT-02': 'B2', 'ACT-07': 'B3' } };
  const html = planNinoHTML({ nino, config, fichas, historial: ['V', 'AV', 'AV', 'V', 'V', 'AV', 'V'] });
  assert.match(html, /Fase 2: comparación de modalidades/);
  assert.match(html, /ACT-02 Pictograma e imagen: banda B2, 15 ensayos en una modalidad \(mitad [AB]\)/);
  assert.match(html, /ACT-07 Cambia la regla: banda B3, con voz \(AV\), 30 ensayos/);
  assert.match(html, /Sesión 8 de la fase 2 \(bloque 2 del análisis\), versión «protocolo»/);
  assert.match(html, /Rutina de inicio y referencia motora/);
  const fam = planNinoHTML({ nino: { ...nino, modo_fase: 'familiarizacion' }, config, fichas });
  assert.match(fam, /ACT-01 Igual a la muestra: banda B1/);
  assert.doesNotMatch(fam, /fase 2/);
});

test('un bloque puede mezclar V y AV por ensayo (fase 2, versión del Catálogo 5.2)', async () => {
  const env = simEnv({
    audio: { available: async (keys) => (env.pedidas = keys) && true, play: async () => ({ tInicio: env.now(), fuente: 'archivo', latenciaMs: 5, fin: Promise.resolve(env.now()) }) },
  });
  let b;
  const view = { clear() {}, showPrompt() {}, showOptions: (ops) => env.at(16 + 700, () => b.pointer({ t: env.now(), pos: ops.findIndex((o) => o.correcta) + 1 })), showFeedback() {} };
  const opciones = [{ id: 'a', correcta: true }, { id: 'b', correcta: false }];
  const trials = ['V', 'AV', 'AV', 'V'].map((m, k) => ({ codigo: `T${k}`, modalidad: m, consigna: { audio: `voz-${k}`, src: 'x' }, opciones }));
  b = startBlock({ ficha: fichas['ACT-02'], modalidad: 'mixta', trials, base: { sesion_id: 's', banda: 'B1' }, env, view, log: createLog(null), rand: () => 0.3 });
  const filas = await env.run(b.done);
  assert.deepEqual(filas.map((r) => r.modalidad), ['V', 'AV', 'AV', 'V']);
  assert.deepEqual(env.pedidas, ['voz-1', 'voz-2'], 'solo se pide el audio de los ensayos AV');
  assert.deepEqual(filas.map((r) => r.audio_fuente), [null, 'archivo', 'archivo', null]);
});

test('el registro guarda el modo de fase, la versión y la modalidad que abrió la fase 2', () => {
  for (const c of ['modo_fase', 'fase2_version', 'fase2_sesion', 'fase2_bloque', 'fase2_primera', 'plan_sesion']) assert.ok(SESION_COLUMNS.includes(c), c);
  assert.ok(COLUMNS.includes('mitad_fase2'));
  const app = leer('src/app.js');
  assert.match(app, /const previas = historialFase2\(sesiones\.rows\(\), p\.codigo\);/);
  assert.match(app, /primeraModalidadFase2\(previas, rng\(seedOf\(`\$\{s\.id\}:fase2`\)\), cfg\.fase2\.maxSeguidasMismaModalidad\)/);
  assert.match(app, /const version = state\.fichas\[cfg\.fase2\.actividad\]\?\.fase2\?\.version \?\? 'protocolo';/);
  assert.match(app, /modo_fase: s\.modo \?\? 'prototipo'/);
  assert.match(app, /r\.mitad_fase2 = mitad\.get\(r\.item\) \?\? null/);
  // Con un niño, el inicio empieza la sesión completa; sin él, un bloque suelto.
  const inicio = leer('src/inicio.js');
  assert.match(inicio, /if \(conNino\) ctx\.empezarSesion\(form\);\s+else ctx\.empezar\(form\);/);
});
