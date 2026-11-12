import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simEnv } from '../tools/sim-env.mjs';
import { rng, seedOf } from '../src/engine/selector.js';
import { ANTICIPATORIA_MS, VERSION_PARAMETROS } from '../src/engine/quality.js';
import { SESION_COLUMNS, createLog, toCSV } from '../src/engine/logger.js';
import {
  REF_MIN_APARICIONES, REF_MAX_APARICIONES, REF_ESPERA_MIN_MS, REF_ESPERA_MAX_MS, REF_PERMANENCIA_MS,
  REF_MIN_VALIDOS, REF_ANTICIPATORIA_MS, REF_COLUMNAS, REF_FILAS, planReferencia, resumirReferencia, iniciarReferencia,
} from '../src/engine/referencia.js';

const PINTADO = 16; // el sim pinta 16 ms después de pedir el cambio
const plan = (n, { espera = 1000, permanenciaMs = REF_PERMANENCIA_MS } = {}) => ({
  apariciones: Array.from({ length: n }, (_, i) => ({ pos: (i % 12) + 1, espera_ms: espera })),
  permanenciaMs,
});

// Ejecuta la referencia con tiempo virtual. toques[i]: tiempo de respuesta (ms desde que se pinta el
// objetivo) del toque a la aparición i, o null si el niño no toca. Los eventos del escenario son
// funciones (ref, env) → void programadas respecto del cuadro de aparición.
async function correr(p, toques, { extra = {}, onPause } = {}) {
  const env = simEnv();
  const eventos = []; // { aparicion, t_cambio }
  let ref;
  let i = 0;
  const view = {
    clear: () => eventos.push({ tipo: 'clear', t: env.now() }),
    showTarget(pos) {
      const k = i++;
      eventos.push({ tipo: 'objetivo', pos, t: env.now() });
      const rt = toques[k];
      if (typeof rt === 'number') env.at(PINTADO + rt, () => ref.pointer({ t: env.now(), x: 100 + k, y: 200, pos }));
      extra[k]?.(ref, env);
    },
  };
  ref = iniciarReferencia({ plan: p, env, view, onPause });
  const res = await env.run(ref.done);
  return { res, eventos, ref, env };
}

// ---------- Plan ----------

test('el plan tiene de 6 a 8 apariciones, con esperas de 800 a 1,500 ms y celdas de la pantalla', () => {
  const cuentas = new Set();
  for (let s = 0; s < 300; s++) {
    const { apariciones } = planReferencia(rng(seedOf(`S-${s}:referencia`)));
    cuentas.add(apariciones.length);
    assert.ok(apariciones.length >= REF_MIN_APARICIONES && apariciones.length <= REF_MAX_APARICIONES);
    for (const a of apariciones) {
      assert.ok(a.espera_ms >= REF_ESPERA_MIN_MS && a.espera_ms <= REF_ESPERA_MAX_MS, `espera ${a.espera_ms}`);
      assert.ok(Number.isInteger(a.pos) && a.pos >= 1 && a.pos <= REF_COLUMNAS * REF_FILAS);
    }
  }
  assert.deepEqual([...cuentas].sort(), [6, 7, 8], 'salen los tres tamaños');
  assert.equal(REF_ESPERA_MIN_MS, 800);
  assert.equal(REF_ESPERA_MAX_MS, 1500);
});

test('el objetivo nunca cae dos veces seguidas en la misma celda', () => {
  for (let s = 0; s < 300; s++) {
    const { apariciones } = planReferencia(rng(s));
    apariciones.slice(1).forEach((a, k) => assert.notEqual(a.pos, apariciones[k].pos));
  }
});

test('el plan es reproducible con la misma semilla y cambia con otra', () => {
  const a = planReferencia(rng(seedOf('S-1:referencia')));
  assert.deepEqual(a, planReferencia(rng(seedOf('S-1:referencia'))));
  assert.notDeepEqual(a, planReferencia(rng(seedOf('S-2:referencia'))));
});

test('la permanencia es de 5 s por defecto y se puede cambiar', () => {
  assert.equal(REF_PERMANENCIA_MS, 5000);
  assert.equal(planReferencia(rng(1)).permanenciaMs, 5000);
  assert.equal(planReferencia(rng(1), { permanenciaMs: 3000 }).permanenciaMs, 3000);
});

// ---------- Resumen ----------

const ap = (tr_ms, extra = {}) => ({ aparicion: 1, pos: 1, tr_ms, x: 0, y: 0, anticipatorio: false, omision: tr_ms === null, interrumpida: false, fuera: [], ...extra });

test('la mediana usa solo los toques válidos: impar y par', () => {
  assert.equal(resumirReferencia([300, 500, 400, 700, 600].map((t) => ap(t))).referencia_motora_ms, 500);
  assert.equal(resumirReferencia([300, 500, 400, 700, 600, 900].map((t) => ap(t))).referencia_motora_ms, 550);
});

test('los toques anticipatorios (menos de 150 ms) se registran y se cuentan aparte, pero no entran en la mediana', () => {
  assert.equal(REF_ANTICIPATORIA_MS, ANTICIPATORIA_MS);
  const aps = [ap(100, { anticipatorio: true }), ap(300), ap(400), ap(500), ap(600), ap(700)];
  const r = resumirReferencia(aps);
  assert.equal(r.referencia_motora_ms, 500); // mediana de 300, 400, 500, 600 y 700
  assert.equal(r.referencia_motora_n, 5);
  assert.equal(r.referencia_motora_anticipados, 1);
  assert.equal(r.referencia_motora_toques.length, 6, 'el anticipatorio queda en la lista');
});

test('con menos de 5 toques válidos la referencia no está disponible, pero se conservan los toques', () => {
  assert.equal(REF_MIN_VALIDOS, 5);
  const cuatro = resumirReferencia([300, 400, 500, 600, null, null].map((t) => ap(t)));
  assert.equal(cuatro.referencia_motora_ms, null);
  assert.equal(cuatro.referencia_motora_n, 4);
  assert.equal(cuatro.referencia_motora_toques.length, 6);
  const cinco = resumirReferencia([300, 400, 500, 600, 700, null].map((t) => ap(t)));
  assert.equal(cinco.referencia_motora_ms, 500);
});

test('el mínimo de 5 se cumple solo con toques válidos: los anticipatorios y las pausas no cuentan', () => {
  const aps = [ap(100, { anticipatorio: true }), ap(120, { anticipatorio: true }), ap(300), ap(400), ap(500), ap(600, { interrumpida: true })];
  const r = resumirReferencia(aps);
  assert.equal(r.referencia_motora_n, 3);
  assert.equal(r.referencia_motora_ms, null);
  assert.equal(r.referencia_motora_anticipados, 2);
});

// ---------- Ejecución con tiempo simulado ----------

test('mide el tiempo desde el cuadro en que aparece el objetivo hasta el toque, sin restar nada', async () => {
  const { res } = await correr(plan(7), [400, 500, 300, 600, 450, 350, 700]);
  assert.deepEqual(res.referencia_motora_toques.map((a) => a.tr_ms), [400, 500, 300, 600, 450, 350, 700]);
  assert.equal(res.referencia_motora_ms, 450);
  assert.equal(res.referencia_motora_n, 7);
  assert.equal(res.referencia_motora_anticipados, 0);
  assert.equal(res.terminada, false);
  assert.deepEqual(res.referencia_motora_toques.map((a) => a.x), [100, 101, 102, 103, 104, 105, 106]);
});

test('registra el toque anticipatorio con su marca y lo deja fuera de la mediana', async () => {
  const { res } = await correr(plan(6), [100, 300, 400, 500, 600, 700]);
  const [primero, ...resto] = res.referencia_motora_toques;
  assert.equal(primero.tr_ms, 100);
  assert.equal(primero.anticipatorio, true);
  assert.ok(resto.every((a) => !a.anticipatorio));
  assert.equal(res.referencia_motora_anticipados, 1);
  assert.equal(res.referencia_motora_n, 5);
  assert.equal(res.referencia_motora_ms, 500);
});

test('un toque de 150 ms exactos ya no es anticipatorio', async () => {
  const { res } = await correr(plan(6), [ANTICIPATORIA_MS, 300, 400, 500, 600, 700]);
  assert.equal(res.referencia_motora_toques[0].anticipatorio, false);
  assert.equal(res.referencia_motora_n, 6);
});

test('si el niño no toca, el objetivo permanece 5 s y se registra la omisión; el ciclo sigue', async () => {
  const { res, eventos } = await correr(plan(6), [400, null, 300, null, 500, 600]);
  const omitidas = res.referencia_motora_toques.filter((a) => a.omision);
  assert.deepEqual(omitidas.map((a) => a.aparicion), [2, 4]);
  assert.ok(omitidas.every((a) => a.tr_ms === null && !a.anticipatorio));
  const obj = eventos.filter((e) => e.tipo === 'objetivo');
  const siguiente = (k) => eventos.find((e) => e.tipo === 'clear' && e.t > obj[k].t);
  // Aparece en t, se pinta a los 16 ms y se retira 5,000 ms después de pintarse.
  assert.equal(siguiente(1).t - obj[1].t, PINTADO + REF_PERMANENCIA_MS);
  assert.equal(res.referencia_motora_n, 4);
  assert.equal(res.referencia_motora_ms, null, 'con 4 toques válidos no hay referencia');
});

test('respeta la espera antes de cada aparición y retira el objetivo al tocarlo', async () => {
  const { eventos } = await correr(plan(6, { espera: 1200 }), [400, 400, 400, 400, 400, 400]);
  const obj = eventos.filter((e) => e.tipo === 'objetivo');
  assert.equal(obj.length, 6);
  // Cada objetivo se retira en el mismo instante en que lo tocan (16 + 400 ms) y el siguiente llega 1,200 ms después.
  for (let k = 1; k < 6; k++) assert.equal(obj[k].t - obj[k - 1].t, PINTADO + 400 + 1200);
  const retirado = eventos.find((e) => e.tipo === 'clear' && e.t > obj[0].t);
  assert.equal(retirado.t - obj[0].t, PINTADO + 400);
});

test('un segundo toque sobre el objetivo no cambia el tiempo registrado', async () => {
  const doble = { 0: (ref, env) => env.at(PINTADO + 700, () => ref.pointer({ t: env.now(), x: 1, y: 1, pos: 1 })) };
  const { res } = await correr(plan(6), [400, 400, 400, 400, 400, 400], { extra: doble });
  assert.equal(res.referencia_motora_toques[0].tr_ms, 400);
  assert.deepEqual(res.referencia_motora_toques[0].fuera, []);
});

test('los toques fuera del objetivo, o antes de que aparezca, se registran y no cuentan', async () => {
  const extra = {
    1: (ref, env) => {
      env.at(PINTADO + 100, () => ref.pointer({ t: env.now(), x: 5, y: 6, pos: null })); // fuera, con el objetivo en pantalla
      env.at(PINTADO + 150, () => ref.pointer({ t: env.now(), x: 7, y: 8, pos: null }));
    },
  };
  // Toque antes de aparecer: se programa desde el escenario con la espera ya en curso.
  const env = simEnv();
  let ref;
  let i = 0;
  const view = {
    clear() {},
    showTarget(pos) {
      const k = i++;
      env.at(PINTADO + 300, () => ref.pointer({ t: env.now(), x: 100, y: 200, pos }));
      extra[k]?.(ref, env);
    },
  };
  ref = iniciarReferencia({ plan: plan(6), env, view });
  env.at(400, () => ref.pointer({ t: env.now(), x: 9, y: 9, pos: null })); // durante la primera espera de 1,000 ms
  const res = await env.run(ref.done);
  const [a1, a2] = res.referencia_motora_toques;
  assert.equal(a1.fuera.length, 1);
  assert.equal(a1.fuera[0].antes, true, 'el objetivo aún no había aparecido');
  assert.equal(a1.fuera[0].t_ms, 400, 'respecto del inicio de la espera');
  assert.equal(a2.fuera.length, 2);
  assert.deepEqual(a2.fuera.map((f) => [f.antes, f.t_ms, f.x, f.y]), [[false, 100, 5, 6], [false, 150, 7, 8]]);
  assert.equal(res.referencia_motora_n, 6, 'los toques fuera no cuentan ni anulan el toque al objetivo');
  assert.ok(res.referencia_motora_toques.every((a) => a.tr_ms === 300));
});

test('una pausa descarta la aparición en curso, no la repite y la referencia continúa', async () => {
  let pausas = [];
  const extra = { 2: (ref, env) => env.at(PINTADO + 100, () => ref.pause()) };
  const { res } = await correr(plan(7), [400, 400, 400, 400, 400, 400, 400], {
    extra,
    onPause: async (aparicion) => (pausas.push(aparicion), 'continuar'),
  });
  assert.deepEqual(pausas, [3]);
  assert.equal(res.referencia_motora_toques.length, 7);
  assert.equal(res.referencia_motora_toques[2].interrumpida, true);
  assert.equal(res.referencia_motora_toques[2].tr_ms, null);
  assert.equal(res.referencia_motora_n, 6);
  assert.equal(res.terminada, false);
});

test('si el terapeuta termina desde la pausa, la referencia se corta y no se corren más apariciones', async () => {
  const extra = { 1: (ref, env) => env.at(PINTADO + 50, () => ref.pause()) };
  const { res, eventos } = await correr(plan(8), Array(8).fill(400), { extra, onPause: async () => 'terminar' });
  assert.equal(res.terminada, true);
  assert.equal(res.referencia_motora_toques.length, 2);
  assert.equal(eventos.filter((e) => e.tipo === 'objetivo').length, 2);
  assert.equal(res.referencia_motora_ms, null);
});

test('la misma sesión da el mismo plan y los mismos resultados con los mismos toques', async () => {
  const p = planReferencia(rng(seedOf('S-9:referencia')));
  const toques = p.apariciones.map((_, k) => 300 + 25 * k);
  const a = await correr(p, toques);
  const b = await correr(p, toques);
  assert.deepEqual(a.res, b.res);
});

// ---------- Columnas, parámetros y aplicación ----------

test('sesiones.csv guarda la mediana, los toques válidos, los anticipados y la lista completa', async () => {
  const cols = SESION_COLUMNS.slice(SESION_COLUMNS.indexOf('referencia_motora_ms'));
  assert.deepEqual(cols, ['referencia_motora_ms', 'referencia_motora_n', 'referencia_motora_anticipados', 'referencia_motora_toques']);
  const { res } = await correr(plan(6), [100, 300, 400, 500, 600, 700]);
  const { terminada, ...resumen } = res;
  const log = createLog(null, { key: 'x', columns: SESION_COLUMNS });
  const fila = log.add({ sesion_id: 'S-1', ...resumen });
  assert.equal(fila.referencia_motora_ms, 500);
  assert.equal(fila.referencia_motora_n, 5);
  assert.equal(fila.referencia_motora_anticipados, 1);
  const csv = toCSV(log.rows(), SESION_COLUMNS);
  assert.match(csv, /"\[\{""aparicion"":1,""pos"":1,""tr_ms"":100,/, 'la lista JSON va en una celda, con el tiempo redondeado');
  assert.match(csv, /""anticipatorio"":true/);
});

test('sin referencia disponible, referencia_motora_ms queda vacía en el CSV', () => {
  const r = resumirReferencia([300, 400].map((t) => ap(t)));
  const log = createLog(null, { key: 'x', columns: SESION_COLUMNS });
  log.add({ sesion_id: 'S-1', ...r });
  const [cab, fila] = toCSV(log.rows(), SESION_COLUMNS).replace('﻿', '').split('\r\n');
  const i = cab.split(',').indexOf('referencia_motora_ms');
  assert.equal(fila.split(',')[i], '');
});

test('la versión de los parámetros cambió al agregar los de la referencia motora', () => {
  assert.equal(VERSION_PARAMETROS, '0.3.0');
});

test('RNF-04 y RNF-05: el objetivo mide al menos 2 cm, sin animación ni transición', () => {
  const css = readFileSync(new URL('../src/referencia.css', import.meta.url), 'utf8');
  const cm = Number(css.match(/--objetivo:\s*calc\(var\(--cm\) \* ([\d.]+)\)/)?.[1]);
  assert.ok(cm >= 2, `${cm} cm`);
  assert.doesNotMatch(css, /@keyframes|animation|transition|opacity|visibility/);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /src\/referencia\.css/);
});

test('app.js corre la referencia una vez por sesión, en niño y demostración, y no en modo experto', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(!s\.referenciaHecha && s\.tipo !== 'experto'\)/);
  assert.match(app, /ejecutarReferencia\(s, periodo\)/);
  assert.match(app, /Object\.assign\(r, resumen\)/);
});
