// Genera docs/ejemplo-registro.csv: una sesión simulada de 10 ensayos de ACT-01
// (banda B3, modalidad AV), para revisar el formato del registro sin correr la aplicación.
// Incluye a propósito un error, una omisión, un toque fuera, un toque repetido, una
// respuesta anticipatoria, una pausa, un audio sin evento de fin y un fallo de audio.
// Uso: node tools/ejemplo-registro.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { simEnv } from './sim-env.mjs';
import { startBlock } from '../src/engine/trial.js';
import { createLog, toCSV, VERSION_APP } from '../src/engine/logger.js';
import { rng } from '../src/engine/selector.js';

const ficha = JSON.parse(readFileSync(new URL('../fichas/ACT-01.json', import.meta.url), 'utf8'));
const FRAME = 1000 / 60;
const SCREEN = { w: 1180, h: 820 };
const rand = rng(13);

// Los 10 ítems de ACT-01 B3 del banco, en orden.
const { items } = JSON.parse(readFileSync(new URL('../items/items.json', import.meta.url), 'utf8'));
const trials = items
  .filter((it) => it.actividad === 'ACT-01' && it.banda === 'B3')
  .map(({ codigo, consigna, opciones }) => ({ codigo, consigna, opciones }));

// Qué hace el niño en cada ensayo (tiempos desde la aparición de las opciones).
const PLAN = [
  { rt: 1450 },
  { rt: 1120 },
  { rt: 2380, error: true },
  { omision: true },
  { fuera: 640, rt: 1890 },
  { rt: 980, repetido: 45 },
  { rt: 120 },
  { pausa: 3000 },
  { rt: 1610, audio: 'sin-fin' },
  { rt: 1330, audio: 'falla' },
];

// Un cambio pedido en t aparece en el segundo cuadro siguiente (60 Hz), con 0.1 ms de resolución.
const paint = (t) => Math.round((Math.floor(t / FRAME) + 2) * FRAME * 10) / 10;

let n = -1; // ensayo en curso, lo avanza showPrompt
const env = simEnv({
  start: 15234.6,
  paint,
  frames: (ms) => ({ total: Math.round(ms / FRAME), late: rand() < 0.3 ? 1 : 0 }),
  audio: {
    available: async () => true,
    play: async () => {
      if (PLAN[n].audio === 'falla') throw new Error('la voz del navegador no respondió');
      const tInicio = Math.round((env.now() + 2.4) * 10) / 10;
      const fin =
        PLAN[n].audio === 'sin-fin'
          ? new Promise(() => {})
          : new Promise((resolve) => env.at(2.4 + 1180, () => resolve(env.now())));
      return { tInicio, fuente: 'sintesis', latenciaMs: null, fin };
    },
  },
});

const at = (pos) => ({
  x: Math.round(((pos - 0.5) * SCREEN.w) / 4 + (rand() - 0.5) * 40),
  y: Math.round(560 + (rand() - 0.5) * 40),
});

let block;
const view = {
  clear() {},
  showPrompt() {
    n++;
  },
  showOptions(opciones) {
    const p = PLAN[n];
    const correcta = opciones.findIndex((o) => o.correcta) + 1;
    const pos = p.error ? (correcta % opciones.length) + 1 : correcta;
    const paintDelay = paint(env.now()) - env.now();
    const tap = (ms, where) => env.at(paintDelay + ms, () => block.pointer({ t: env.now(), ...where }));
    if (p.pausa) env.at(paintDelay + p.pausa, () => block.pause());
    if (p.fuera) tap(p.fuera, { x: 590, y: 790, pos: null });
    if (p.rt) tap(p.rt, { ...at(pos), pos });
    if (p.repetido) tap(p.rt + p.repetido, { ...at(pos), pos });
  },
  showFeedback() {},
};
const sesion = `EXP-${Math.floor(rand() * 2 ** 32).toString(16).padStart(8, '0')}`;
block = startBlock({
  ficha,
  modalidad: 'AV',
  trials,
  base: {
    sesion_id: sesion,
    bloque: 1,
    codigo_nino: 'DEMO',
    dispositivo: `Simulación en Node.js, sin navegador | ${SCREEN.w}x${SCREEN.h}`,
    banda: 'B3',
    version_app: VERSION_APP,
  },
  env,
  view,
  log: createLog(null),
  rand,
  onPause: async () => 'continuar',
});

const rows = await env.run(block.done);
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/ejemplo-registro.csv', import.meta.url), toCSV(rows));
console.log(`docs/ejemplo-registro.csv: ${rows.length} ensayos (${sesion})`);
