// Modos de fase y plan de la sesión (tanda 3: H2.3 y Catálogo 7.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MODOS, VERSIONES_FASE2, primeraModalidadFase2, bloqueFase2, modalidadDeMitad, mitadDeModalidad,
  bandaDelModo, planDeSesion, itemsDeMitad, limiteAlcanzado, historialFase2,
} from '../src/fases.js';
import { rng } from '../src/engine/selector.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const config = leer('fichas/sesion.json');
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, leer(`fichas/${id}.json`)]));
const items = leer('items/items.json').items;

test('la configuración tiene los cinco modos de la Arquitectura 14 y los tiempos del Catálogo 7.1', () => {
  assert.deepEqual(Object.keys(config.modos), MODOS);
  assert.equal(config.transicionMs, 5000);
  assert.equal(config.limiteMinutos, 15);
  for (const m of ['fase1', 'fase2', 'cierre']) assert.equal(config.modos[m].dificultad, 'fija', m);
  assert.equal(config.modos.familiarizacion.dificultad, 'minima');
  assert.equal(config.modos.fase3.adaptacion, true);
  assert.equal(config.modos.fase3.registroDecisiones, true);
  // En el piloto, ACT-02 y después ACT-07 (Catálogo 7.1).
  for (const m of ['fase1', 'fase2', 'fase3', 'cierre']) assert.deepEqual(config.modos[m].actividades, ['ACT-02', 'ACT-07'], m);
  assert.deepEqual(Object.keys(config.fase2.versiones), VERSIONES_FASE2);
  assert.equal(fichas['ACT-02'].fase2.version, 'protocolo');
  assert.deepEqual(fichas['ACT-02'].fase2.alternativas, ['catalogo']);
  assert.ok(config.pendientes.some((p) => p.startsWith('Alinear el Catálogo 5.2 con el Protocolo 3.3')));
});

test('fase 2: ninguna modalidad abre más de 2 sesiones seguidas, y el orden es al azar', () => {
  for (let semilla = 1; semilla <= 300; semilla++) {
    const r = rng(semilla);
    const previas = [];
    for (let k = 0; k < 12; k++) previas.push(primeraModalidadFase2(previas, r));
    for (let k = 2; k < previas.length; k++) assert.ok(!(previas[k] === previas[k - 1] && previas[k] === previas[k - 2]), `semilla ${semilla}: ${previas.join(' ')}`);
  }
  // Con las dos últimas iguales, siempre la otra; si no, cualquiera de las dos.
  assert.equal(primeraModalidadFase2(['V', 'V'], () => 0), 'AV');
  assert.equal(primeraModalidadFase2(['AV', 'AV'], () => 0.9), 'V');
  assert.equal(primeraModalidadFase2(['V', 'AV'], () => 0.1), 'V');
  assert.equal(primeraModalidadFase2(['V', 'AV'], () => 0.9), 'AV');
  const abre = new Set(Array.from({ length: 40 }, (_, k) => primeraModalidadFase2([], rng(k + 1))));
  assert.deepEqual([...abre].sort(), ['AV', 'V']);
});

test('fase 2: las mitades A y B se invierten entre las sesiones 1 a 6 y 7 a 12', () => {
  assert.deepEqual([1, 6, 7, 12].map((n) => bloqueFase2(n)), [1, 1, 2, 2]);
  assert.equal(modalidadDeMitad('A', 1), 'V');
  assert.equal(modalidadDeMitad('B', 1), 'AV');
  assert.equal(modalidadDeMitad('A', 2), 'AV');
  assert.equal(modalidadDeMitad('B', 2), 'V');
  assert.equal(mitadDeModalidad('V', 2), 'B');
  // Las mitades son las de conceptos.json: 30 y 30, 5 y 5 por categoría.
  const deBanda = items.filter((i) => i.actividad === 'ACT-02' && i.banda === 'B2');
  assert.equal(itemsDeMitad(deBanda, 'A').length, deBanda.length / 2);
  assert.ok(itemsDeMitad(deBanda, 'A').every((i) => i.mitad === 'A'));
});

test('plan de la fase 2, versión del Protocolo: dos bloques de 15, uno por modalidad, en la misma banda', () => {
  const plan = planDeSesion({ modo: 'fase2', fichas, config, bandasNino: { 'ACT-02': 'B3', 'ACT-07': 'B2' }, fase2: { version: 'protocolo', numero: 8, primera: 'AV' } });
  assert.deepEqual(plan.map((p) => p.tipo), ['rutina-inicio', 'referencia', 'bloque', 'transicion', 'bloque', 'transicion', 'bloque', 'rutina-cierre']);
  const bloques = plan.filter((p) => p.tipo === 'bloque');
  assert.deepEqual(bloques.map((b) => [b.actividad, b.modalidad, b.ensayos, b.banda, b.mitad]), [
    ['ACT-02', 'AV', 15, 'B3', 'A'], // sesión 8: bloque 2, la mitad A va en AV
    ['ACT-02', 'V', 15, 'B3', 'B'],
    ['ACT-07', 'AV', 30, 'B2', undefined],
  ]);
  assert.deepEqual(plan[0].actividades, ['ACT-02', 'ACT-02', 'ACT-07']);
  assert.deepEqual(plan.filter((p) => p.tipo === 'transicion').map((p) => p.siguiente), ['ACT-02', 'ACT-07']);
});

test('plan de la fase 2, versión del Catálogo 5.2: un bloque de 30 con las dos modalidades', () => {
  const plan = planDeSesion({ modo: 'fase2', fichas, config, bandasNino: { 'ACT-02': 'B2' }, fase2: { version: 'catalogo', numero: 3, primera: 'V' } });
  const [b] = plan.filter((p) => p.tipo === 'bloque');
  assert.deepEqual(b, { tipo: 'bloque', actividad: 'ACT-02', banda: 'B2', modalidad: 'mixta', ensayos: 30, mitades: { V: 'A', AV: 'B' } });
});

test('planes de los otros modos: orden fijo, bandas y modalidad por defecto', () => {
  const bandas = { 'ACT-02': 'B4', 'ACT-07': 'B3' };
  for (const modo of ['fase1', 'fase3', 'cierre']) {
    const bloques = planDeSesion({ modo, fichas, config, bandasNino: bandas }).filter((p) => p.tipo === 'bloque');
    assert.deepEqual(bloques.map((b) => [b.actividad, b.banda, b.modalidad, b.ensayos]), [['ACT-02', 'B4', 'AV', 30], ['ACT-07', 'B3', 'AV', 30]], modo);
  }
  // Familiarización: banda mínima y ACT-01 primero, con sus 10 ensayos.
  const fam = planDeSesion({ modo: 'familiarizacion', fichas, config, bandasNino: bandas }).filter((p) => p.tipo === 'bloque');
  assert.deepEqual(fam.map((b) => [b.actividad, b.banda, b.ensayos]), [['ACT-01', 'B1', 10], ['ACT-02', 'B1', 30], ['ACT-07', 'B1', 30]]);
  // Sin banda fijada, la mínima; una banda que no existe tampoco se usa.
  assert.equal(bandaDelModo('fase1', fichas['ACT-02'], {}, config), 'B1');
  assert.equal(bandaDelModo('fase1', fichas['ACT-02'], { 'ACT-02': 'B9' }, config), 'B1');
  assert.throws(() => planDeSesion({ modo: 'uso_clinico', fichas, config }), /Modo de fase desconocido/);
  // Siempre empieza y termina igual (Catálogo 7.1).
  for (const modo of MODOS) {
    const plan = planDeSesion({ modo, fichas, config, fase2: { version: 'protocolo', numero: 1, primera: 'V' } });
    assert.deepEqual([plan[0].tipo, plan[1].tipo, plan.at(-1).tipo], ['rutina-inicio', 'referencia', 'rutina-cierre'], modo);
  }
});

test('límite de 15 minutos con el reloj de la sesión', () => {
  assert.equal(limiteAlcanzado(1000, 1000 + 15 * 60_000 - 1), false);
  assert.equal(limiteAlcanzado(1000, 1000 + 15 * 60_000), true);
  assert.equal(limiteAlcanzado(0, 5 * 60_000, 5), true);
});

test('el historial de la fase 2 sale de las sesiones del niño', () => {
  const sesiones = [
    { codigo_nino: 'x', modo_fase: 'fase2', fase2_primera: 'V' },
    { codigo_nino: 'y', modo_fase: 'fase2', fase2_primera: 'AV' },
    { codigo_nino: 'x', modo_fase: 'fase1', fase2_primera: null },
    { codigo_nino: 'x', modo_fase: 'fase2', fase2_primera: 'AV' },
  ];
  assert.deepEqual(historialFase2(sesiones, 'x'), ['V', 'AV']);
});
