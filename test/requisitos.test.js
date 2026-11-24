// Pruebas de requisitos que el informe de verificación (docs/verificacion/informe-verificacion.md)
// cita y que no tenían una prueba propia: RF-01 y RNF-01.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { simEnv } from '../tools/sim-env.mjs';
import { startBlock } from '../src/engine/trial.js';
import { createLog } from '../src/engine/logger.js';
import { rng } from '../src/engine/selector.js';
import * as seleccion from '../src/activities/seleccion.js';
import { calcularIndicadores } from '../src/indicadores/exportar.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('RF-01: una actividad nueva, solo con su ficha, se registra y se calcula sin código propio', async () => {
  // ACT-99: una ficha nueva (copia de ACT-02 con otro id y otros tiempos), con los ítems de ACT-02.
  const ficha = { ...JSON.parse(leer('fichas/ACT-02.json')), id: 'ACT-99', nombre: 'Actividad nueva de prueba', version: '0.0.1', retroalimentacionMs: 700 };
  const items = JSON.parse(leer('items/items.json')).items.filter((i) => i.actividad === 'ACT-02' && i.banda === 'B1').slice(0, 30);
  const trials = seleccion.toTrials(items);
  let block;
  let n = 0;
  const env = simEnv({ start: 1000, audio: { available: async () => true, play: async () => ({ tInicio: env.now(), fuente: 'archivo', latenciaMs: 5, fin: new Promise((r) => env.at(800, () => r(env.now()))) }) } });
  const view = {
    clear() {},
    showPrompt() {},
    showFeedback() {},
    showOptions(op) {
      const pos = op.findIndex((o) => o.correcta) + 1;
      n++;
      env.at(700 + (n % 7) * 40, () => block.pointer({ t: env.now(), x: 100 * pos, y: 300, pos: n % 5 ? pos : (pos % op.length) + 1 }));
    },
  };
  const log = createLog(null);
  block = startBlock({ ficha, modalidad: 'AV', trials, base: { sesion_id: 'S-rf01', bloque: 1, codigo_nino: 'N', dispositivo: 'simulado', banda: 'B1', version_app: '0.1.0', modo_fase: 'fase1', tema_imagenes: 'general' }, env, view, log, rand: rng(1) });
  const rows = await env.run(block.done);
  assert.equal(rows.length, 30);
  assert.ok(rows.every((r) => r.actividad === 'ACT-99' && r.version_ficha === '0.0.1'));
  assert.equal(rows[0].t_retro_fin - rows[0].t_retro_inicio, 700, 'los tiempos salen de la ficha');
  const ind = calcularIndicadores(rows, [{ sesion_id: 'S-rf01', codigo_nino: 'N', modo_fase: 'fase1' }], { fichas: { 'ACT-99': ficha } });
  assert.ok(ind.find((x) => x.actividad === 'ACT-99' && x.indicador === 'A1').disponible, 'A1 se calcula para la actividad nueva');
  // El registro y el cálculo no nombran actividades (solo las pantallas lo hacen).
  for (const f of ['src/engine/trial.js', 'src/engine/logger.js', 'src/indicadores/nucleo.js']) assert.doesNotMatch(leer(f).replace(/\/\/.*$/gm, ''), /'ACT-\d\d'/, f);
});

test('RNF-01: los tiempos salen de un reloj monótono (performance.now), nunca de Date', () => {
  assert.match(leer('src/engine/clock.js'), /export const now = \(\) => performance\.now\(\);/);
  const motor = readdirSync(new URL('../src/engine/', import.meta.url)).filter((f) => f.endsWith('.js'));
  for (const f of motor) assert.doesNotMatch(leer(`src/engine/${f}`).replace(/\/\/.*$/gm, ''), /Date\.now\(|new Date\(/, f);
});
