import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRuleSequences, cajaCorrecta, maxRun } from '../tools/build-items.mjs';
import { pickComposed, rng } from '../src/engine/selector.js';
import { toTrials } from '../src/activities/cambia-regla.js';
import { startBlock } from '../src/engine/trial.js';
import { createLog } from '../src/engine/logger.js';
import { simEnv } from '../tools/sim-env.mjs';

const ficha = JSON.parse(readFileSync(new URL('../fichas/ACT-07.json', import.meta.url), 'utf8'));
const { items } = JSON.parse(readFileSync(new URL('../items/items.json', import.meta.url), 'utf8'));
const seqs = items.filter((i) => i.actividad === 'ACT-07');
const band = (id) => seqs.filter((s) => s.banda === id);
const reglas = (s) => s.ensayos.map((e) => e.regla);
const switchRate = (rs) => rs.slice(1).filter((r, i) => r !== rs[i]).length / (rs.length - 1);
const bandaFicha = (id) => ficha.bandas.find((b) => b.id === id);

test('10 secuencias de 10 ensayos por banda, con su código', () => {
  for (const b of ficha.bandas) {
    const s = band(b.id);
    assert.equal(s.length, ficha.itemsPorBanda, b.id);
    s.forEach((seq, i) => {
      assert.equal(seq.codigo, `ACT07-${b.id}-${String(i + 1).padStart(2, '0')}`);
      assert.equal(seq.ensayos.length, ficha.ensayosPorSecuencia);
      seq.ensayos.forEach((e, k) => assert.equal(e.codigo, `${seq.codigo}-${String(k + 1).padStart(2, '0')}`));
    });
  }
});

test('cada tarjeta coincide con una caja en forma y con la otra en color, y la caja correcta sigue la regla', () => {
  for (const seq of seqs) {
    for (const e of seq.ensayos) {
      assert.notEqual(e.tarjeta.forma, e.tarjeta.color, e.codigo);
      assert.equal(e.caja, cajaCorrecta(e.tarjeta, e.regla), e.codigo);
      assert.equal(e.caja, e.regla === 'forma' ? e.tarjeta.forma : e.tarjeta.color);
      assert.equal(e.consigna.texto, ficha.consignaAV[e.regla]);
      assert.equal(e.consigna.audio, e.regla === 'color' ? 'por-color' : 'por-forma');
    }
    const cajas = seq.ensayos.map((e) => e.caja);
    assert.ok(maxRun(cajas) <= 3, `${seq.codigo}: más de 3 veces seguidas la misma caja`);
    const izquierda = cajas.filter((c) => c === 1).length;
    assert.ok(izquierda >= 4 && izquierda <= 6, `${seq.codigo}: caja 1 correcta ${izquierda} veces`);
  }
});

test('B1: una sola regla en cada secuencia, 5 por color y 5 por forma', () => {
  for (const s of band('B1')) assert.equal(new Set(reglas(s)).size, 1, s.codigo);
  assert.equal(band('B1').filter((s) => s.tipo === 'color').length, 5);
  assert.equal(band('B1').filter((s) => s.tipo === 'forma').length, 5);
});

test('B2: el bloque tiene 15 ensayos con una regla y 15 con la otra, en ambos órdenes', () => {
  for (const orden of [['color', 'forma'], ['forma', 'color']]) {
    for (let seed = 1; seed <= 20; seed++) {
      const bloque = pickComposed(band('B2'), bandaFicha('B2').composicion, orden, rng(seed)).flatMap(reglas);
      assert.equal(bloque.length, 30);
      assert.deepEqual(bloque, [...Array(15).fill(orden[0]), ...Array(15).fill(orden[1])], `orden ${orden}, semilla ${seed}`);
    }
  }
});

test('B3 y B4: la regla cambia en cerca del 30 % y del 50 % de los ensayos (±10 puntos)', () => {
  for (const [id, p] of [['B3', 0.3], ['B4', 0.5]]) {
    const rates = band(id).map((s) => switchRate(reglas(s)));
    for (const r of rates) assert.ok(Math.abs(r - p) <= 0.1, `${id}: secuencia con ${r.toFixed(2)}`);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    assert.ok(Math.abs(mean - p) <= 0.1, `${id}: promedio ${mean.toFixed(2)}`);
    // También en bloques completos de 30 ensayos, contando los cambios entre secuencias.
    for (let seed = 1; seed <= 50; seed++) {
      const bloque = pickComposed(band(id), bandaFicha(id).composicion, ficha.dimensiones, rng(seed)).flatMap(reglas);
      assert.ok(Math.abs(switchRate(bloque) - p) <= 0.1, `${id} bloque con semilla ${seed}: ${switchRate(bloque).toFixed(2)}`);
    }
  }
});

test('con la pareja de la sesión, la tarjeta y la caja correcta siguen la regla; B2 anuncia el cambio', () => {
  for (const pareja of ficha.parejas) {
    const banda = bandaFicha('B2');
    const bloque = pickComposed(band('B2'), banda.composicion, ['color', 'forma'], rng(3));
    const trials = toTrials(bloque, { banda, pareja });
    assert.equal(trials.length, 30);
    for (const t of trials) {
      const { forma, color } = t.consigna.tarjeta;
      const correcta = t.opciones.find((o) => o.correcta);
      const otra = t.opciones.find((o) => !o.correcta);
      if (t.regla === 'color') assert.ok(correcta.color === color && otra.forma === forma, t.codigo);
      else assert.ok(correcta.forma === forma && otra.color === color, t.codigo);
      assert.deepEqual(t.opciones.map((o) => o.id), pareja.map((c) => `${c.forma}-${c.color}`), 'las cajas no cambian de lugar');
    }
    assert.deepEqual(trials.flatMap((t, i) => (t.anuncio ? [i] : [])), [15], 'un solo anuncio, antes del ensayo 16');
    assert.deepEqual(trials[15].anuncio, { regla: 'forma', forma: trials[15].consigna.tarjeta.forma });
  }
  const b3 = toTrials(band('B3').slice(0, 3), { banda: bandaFicha('B3'), pareja: ficha.parejas[0] });
  assert.ok(b3.every((t) => !t.anuncio), 'B3 indica la regla en cada ensayo, sin anuncio');
  assert.ok(b3.some((t) => t.cambio));
});

test('el motor muestra el anuncio durante anuncioMs antes del ensayo y no lo registra', async () => {
  const env = simEnv();
  const calls = [];
  const view = {
    clear: () => calls.push(['clear', env.now()]),
    showPrompt: () => {},
    showOptions: () => {},
    showFeedback: () => {},
    showAnnouncement: (a) => calls.push(['anuncio', env.now(), a.regla]),
  };
  const opciones = [{ id: 'conejo-azul', correcta: true }, { id: 'barco-amarillo', correcta: false }];
  const trials = [
    { codigo: 'x-01', consigna: {}, opciones },
    { codigo: 'x-02', consigna: {}, opciones, anuncio: { regla: 'forma', forma: 'barco' } },
  ];
  const block = startBlock({ ficha, modalidad: 'V', trials, base: { banda: 'B2' }, env, view, log: createLog(null), rand: rng(1) });
  const rows = await env.run(block.done);
  assert.equal(rows.length, 2);
  const anuncio = calls.find((c) => c[0] === 'anuncio');
  const siguiente = calls.filter((c) => c[0] === 'clear')[1];
  assert.equal(anuncio[2], 'forma');
  assert.equal(siguiente[1] - anuncio[1], ficha.anuncioMs);
  assert.ok(rows.every((r) => r.disposicion === '1x2' && r.pos_correcta === 1), 'las cajas conservan su lugar');
});

test('las secuencias son reproducibles con la misma semilla y cambian con otra', () => {
  assert.deepEqual(buildRuleSequences(ficha), seqs);
  assert.deepEqual(buildRuleSequences(ficha, ficha.semilla), buildRuleSequences(ficha, ficha.semilla));
  assert.notDeepEqual(buildRuleSequences(ficha, ficha.semilla + 1), seqs);
});
