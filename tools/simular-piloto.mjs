// Simula bloques de las tres actividades del piloto (ACT-01, ACT-02 y ACT-07, en V y en AV) con
// el entorno simulado y devuelve sus registros. Sirve para comprobar que un cambio en
// src/engine/ no cambia lo que ya se registraba: test/fixtures/registro-piloto.json guarda lo que
// daba el motor antes del cambio, y test/motor-sin-cambios.test.js lo compara.
// Uso: node tools/simular-piloto.mjs > test/fixtures/registro-piloto.json (solo si el cambio en
// el registro del piloto es intencional y se documenta).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simEnv } from './sim-env.mjs';
import { startBlock } from '../src/engine/trial.js';
import { createLog } from '../src/engine/logger.js';
import { rng } from '../src/engine/selector.js';
import * as seleccion from '../src/activities/seleccion.js';
import * as cambiaRegla from '../src/activities/cambia-regla.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const { items } = leer('items/items.json');
const FRAME = 1000 / 60;
const paint = (t) => Math.round((Math.floor(t / FRAME) + 2) * FRAME * 10) / 10;
const ENSAYOS = 8;

function ensayos(ficha, banda) {
  const deBanda = items.filter((it) => it.actividad === ficha.id && it.banda === banda.id);
  if (ficha.pantalla === 'cambia-regla') {
    const pareja = [{ forma: 'estrella', color: 'azul' }, { forma: 'flor', color: 'amarillo' }];
    return cambiaRegla.toTrials(deBanda.slice(0, 1), { banda, pareja }).slice(0, ENSAYOS);
  }
  return seleccion.toTrials(deBanda.slice(0, ENSAYOS));
}

async function bloque(id, modalidad) {
  const ficha = leer(`fichas/${id}.json`);
  const banda = ficha.bandas[ficha.bandas.length > 1 ? 1 : 0];
  const trials = ensayos(ficha, banda);
  const rand = rng(7);
  let n = -1;
  const env = simEnv({
    start: 10000,
    paint,
    frames: (ms) => ({ total: Math.round(ms / FRAME), late: n % 3 === 0 ? 1 : 0, periodo: FRAME }),
    audio: {
      available: async () => true,
      play: async () => {
        if (n === 5) throw new Error('sin voz');
        const fin = n === 4 ? new Promise(() => {}) : new Promise((res) => env.at(900, () => res(env.now())));
        return { tInicio: env.now() + 3, fuente: n % 2 ? 'grabada' : 'sintesis', latenciaMs: n % 2 ? 12 : null, fin };
      },
    },
  });
  let block;
  const view = {
    clear() {},
    showPrompt() {
      n++;
    },
    prepareOptions: async () => {},
    showOptions(opciones) {
      const correcta = opciones.findIndex((o) => o.correcta) + 1;
      const pos = n === 2 ? (correcta % opciones.length) + 1 : correcta;
      const d = paint(env.now()) - env.now();
      const tap = (ms, p) => env.at(d + ms, () => block.pointer({ t: env.now(), ...p }));
      if (n === 3) return; // omisión
      if (n === 1) tap(500, { x: 5, y: 5, pos: null });
      tap(700 + 137 * n, { x: 100 * pos, y: 400, pos });
      if (n === 6) tap(700 + 137 * n + 40, { x: 100 * pos, y: 400, pos });
      if (n === 7) tap(150, { x: 100 * pos, y: 400, pos }); // anticipatoria: la primera cuenta
    },
    showFeedback() {},
    showAnnouncement() {},
  };
  const log = createLog(null);
  const base = { sesion_id: `sim-${id}-${modalidad}`, bloque: 1, codigo_nino: 'NB-0001', dispositivo: 'simulado', banda: banda.id, version_app: '0.1.0', modo_fase: 'linea_base', tema_imagenes: 'claro', latencia_dispositivo_ms: 40 };
  block = startBlock({ ficha, modalidad, trials, base, env, view, log, rand });
  return env.run(block.done);
}

export async function simularPiloto() {
  const filas = [];
  for (const id of ['ACT-01', 'ACT-02', 'ACT-07']) for (const m of ['V', 'AV']) filas.push(...(await bloque(id, m)));
  return filas;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(await simularPiloto(), null, 2) + '\n');
}
