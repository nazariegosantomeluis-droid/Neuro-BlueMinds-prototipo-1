// Sondas de generalización y presentación distribuida (tanda 4; Catálogo 5.2, 7.2 y 7.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ensayoDeSonda, conSondas, conReapariciones, reaparicionesDeHoy, sesionesEnOrden, indiceGeneralizacion, retencion, srcDeEjemplar, codigoBase, codigoDeSonda,
} from '../src/sondas.js';
import { startBlock } from '../src/engine/trial.js';
import { createLog, COLUMNS } from '../src/engine/logger.js';
import { rng } from '../src/engine/selector.js';
import { simEnv } from '../tools/sim-env.mjs';
import { filas } from '../tools/filas-prueba.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const act02 = JSON.parse(leer('fichas/ACT-02.json'));
const config = JSON.parse(leer('fichas/sesion.json'));

// Ensayo de práctica del concepto c, como lo arma la pantalla de selección.
const ensayo = (c, k = 1) => ({
  codigo: `ACT02-B2-${c}`,
  consigna: { tipo: 'pictograma', src: `assets/picto/${c}.png` },
  opciones: [
    { id: `${c}-${k}`, concepto: c, ejemplar: k, src: `assets/img/${c}/${k}.svg`, correcta: true },
    { id: 'vaso-1', concepto: 'vaso', ejemplar: 1, src: 'assets/img/vaso/1.svg', correcta: false },
  ],
});
const concepto = (t) => t.opciones.find((o) => o.correcta).concepto;

test('la ficha de ACT-02 y la sesión traen lo que dice el Catálogo', () => {
  assert.deepEqual(act02.sondas.desdeModos, ['fase3']);
  assert.equal(act02.sondas.cadaEnsayos, 10, '1 de cada 10 ensayos');
  assert.equal(act02.sondas.ejemplar, act02.ejemplarGeneralizacion);
  assert.equal(act02.dominio.unidad, 'concepto');
  assert.deepEqual(config.presentacionDistribuida.demorasSesiones, [1, 3, 7]);
  assert.deepEqual(config.presentacionDistribuida.activaEnModos, ['fase3'], 'desactivada hasta la fase 3');
});

test('una sonda presenta el ejemplar reservado del concepto, sin tocar lo demás', () => {
  assert.equal(srcDeEjemplar('assets/img/perro/1.svg', 3), 'assets/img/perro/3.svg');
  assert.equal(srcDeEjemplar('assets/img/perro/2.jpg', 3), 'assets/img/perro/3.jpg');
  const s = ensayoDeSonda(ensayo('perro', 2), 3);
  assert.equal(s.sonda, true);
  assert.equal(s.codigo, 'ACT02-B2-perro-S3');
  assert.equal(codigoBase(s.codigo), 'ACT02-B2-perro');
  assert.equal(codigoDeSonda('X', 3), 'X-S3');
  assert.deepEqual(s.opciones[0], { id: 'perro-3', concepto: 'perro', ejemplar: 3, src: 'assets/img/perro/3.svg', correcta: true });
  assert.deepEqual(s.opciones[1], ensayo('perro').opciones[1]);
  assert.deepEqual(s.consigna, ensayo('perro').consigna);
});

test('1 sonda por cada tramo de 10 ensayos, de conceptos dominados que no estén ya en el bloque', () => {
  const trials = Array.from({ length: 30 }, (_, k) => ensayo(`c${k}`));
  const out = conSondas(trials, ['c3', 'perro', 'gato', 'pato', 'oso'], { cada: 10, ejemplar: 3, deConcepto: (c) => ensayo(c), concepto, rand: rng(7) });
  assert.equal(out.length, 30, 'la sonda reemplaza un ensayo');
  const pos = out.flatMap((t, k) => (t.sonda ? [k] : []));
  assert.equal(pos.length, 3);
  assert.deepEqual(pos.map((k) => Math.floor(k / 10)), [0, 1, 2], 'una por tramo');
  assert.deepEqual(pos.map((k) => concepto(out[k])), ['perro', 'gato', 'pato'], 'c3 ya estaba en el bloque');
  // Sin candidatos no hay sondas; con uno, una sola.
  assert.deepEqual(conSondas(trials, [], { deConcepto: (c) => ensayo(c), concepto, rand: rng(1) }), trials);
  assert.equal(conSondas(trials, ['perro'], { deConcepto: (c) => ensayo(c), concepto, rand: rng(1) }).filter((t) => t.sonda).length, 1);
});

test('presentación distribuida: reaparece 1, 3 y 7 sesiones después del dominio, si se alcanzó con el mecanismo activo', () => {
  const sesiones = (k, modo = 'fase3') => Array.from({ length: k }, (_, i) => ({ sesion_id: `S${i + 1}`, modo_fase: modo }));
  const alcanzados = new Map([['perro', 'S1']]);
  const hoy = (k, modo) => reaparicionesDeHoy({ alcanzados, sesiones: sesiones(k, modo), demoras: [1, 3, 7], activaEnModos: ['fase3'] });
  // Con k sesiones anteriores, hoy es la sesión k + 1 y la demora desde S1 es k.
  assert.deepEqual([...hoy(1)], [['perro', 1]]);
  assert.deepEqual([...hoy(2)], []);
  assert.deepEqual([...hoy(3)], [['perro', 3]]);
  assert.deepEqual([...hoy(7)], [['perro', 7]]);
  assert.deepEqual([...hoy(8)], []);
  assert.deepEqual([...hoy(1, 'fase1')], [], 'un dominio de la fase 1 no se programa');
  // El orden de las sesiones sale del registro.
  const rows = [...filas(2, () => ({ sesion_id: 'S1', modo_fase: 'fase3' })), ...filas(2, () => ({ sesion_id: 'S2', modo_fase: 'fase3' }))];
  assert.deepEqual(sesionesEnOrden(rows), [{ sesion_id: 'S1', modo_fase: 'fase3' }, { sesion_id: 'S2', modo_fase: 'fase3' }]);
  // En el bloque: si el concepto ya está, solo se marca; si falta, reemplaza un ensayo.
  const trials = Array.from({ length: 30 }, (_, k) => ensayo(`c${k}`));
  const marcado = conReapariciones(trials, new Map([['c5', 3]]), { deConcepto: (c) => ensayo(c), concepto, rand: rng(2) });
  assert.equal(marcado[5].reaparicion, 3);
  assert.equal(marcado.filter((t) => t.reaparicion).length, 1);
  const puesto = conReapariciones(trials, new Map([['perro', 1]]), { deConcepto: (c) => ensayo(c), concepto, rand: rng(2) });
  assert.equal(puesto.length, 30);
  assert.deepEqual(puesto.filter((t) => t.reaparicion).map(concepto), ['perro']);
  // Una sonda no reemplaza una reaparición.
  const ambos = conSondas(puesto, ['gato', 'pato', 'oso'], { deConcepto: (c) => ensayo(c), concepto, rand: rng(3) });
  assert.equal(ambos.filter((t) => t.reaparicion).length, 1);
});

test('IG e IRet: cálculos a mano', () => {
  // Sondas en B2: 3 de 4 aciertos (0.75). Práctica en B2: 16 de 20 (0.8). IG = 0.75/0.8 = 0.9375.
  // Los 10 ensayos de B3 no entran: no hubo sondas en B3.
  const rows = [
    ...filas(4, (k) => ({ banda: 'B2', sonda: true, acierto: k !== 4 })),
    ...filas(20, (k) => ({ banda: 'B2', acierto: k <= 16 })),
    ...filas(10, () => ({ banda: 'B3', acierto: false })),
  ];
  const ig = indiceGeneralizacion(rows);
  assert.equal(ig.valor, 0.9375);
  assert.deepEqual([ig.sondas, ig.practica], [4, 20]);
  // Reapariciones: tras 1 sesión, 2 de 2; tras 3, 1 de 2; tras 7, 0 de 1. Total 3 de 5 = 0.6.
  const re = filas(5, (k) => ({ reaparicion: [1, 1, 3, 3, 7][k - 1], acierto: [true, true, true, false, false][k - 1] }));
  const r = retencion([...re, ...filas(3)]);
  assert.equal(r.valor, 0.6);
  assert.deepEqual(r.porDemora, { 1: { n: 2, precision: 1 }, 3: { n: 2, precision: 0.5 }, 7: { n: 1, precision: 0 } });
});

test('el motor no marca la opción correcta en una sonda y guarda sonda y reaparición', async () => {
  const env = simEnv();
  const marcos = [];
  let b;
  const view = { clear() {}, showPrompt() {}, showOptions: () => env.at(16 + 700, () => b.pointer({ t: env.now(), pos: 2 })), showFeedback: (pos) => marcos.push(pos) };
  const trials = [{ ...ensayo('perro'), reaparicion: 1 }, ensayoDeSonda(ensayo('gato'), 3)];
  b = startBlock({ ficha: { ...act02, barajarOpciones: false }, modalidad: 'V', trials, base: { sesion_id: 's', banda: 'B2' }, env, view, log: createLog(null), rand: () => 0.3 });
  const rows = await env.run(b.done);
  assert.deepEqual(marcos, [1, null], 'práctica: marco en la correcta; sonda: ningún marco');
  assert.deepEqual(rows.map((r) => [r.item, r.sonda, r.reaparicion]), [['ACT02-B2-perro', false, 1], ['ACT02-B2-gato-S3', true, null]]);
  assert.ok(rows.every((r) => r.t_retro_fin - r.t_retro_inicio >= act02.retroalimentacionMs - 20), 'la retroalimentación dura lo mismo');
  assert.deepEqual(COLUMNS.slice(-2), ['sonda', 'reaparicion']);
});

test('la aplicación las usa solo en los modos activos y antes de precargar las imágenes', () => {
  const app = leer('src/app.js');
  assert.match(app, /const sondas = Boolean\(s\.modo && cfgS\?\.desdeModos\?\.includes\(s\.modo\)\);/);
  assert.match(app, /const distribuida = Boolean\(s\.modo && cfgD\?\.activaEnModos\?\.includes\(s\.modo\) && cfgD\.actividades\?\.includes\(ficha\.id\)\);/);
  assert.match(app, /if \(!sondas && !distribuida\) return trials;/);
  assert.match(app, /if \(!mitades\) trials = conMecanismos\([\s\S]*?trials = aplicarTema\(trials, temaPorId\(state\.temas, s\.tema\)\);\n\s+const srcs =/);
  // La pantalla de selección no marca nada con showFeedback(null).
  assert.match(leer('src/activities/seleccion.js'), /querySelector\(`\[data-pos="\$\{posCorrecta\}"\]`\)\?\.classList\.add\('marco'\)/);
});

test('decisiones R4 y R5: su origen está en la ficha y ya no son pendientes clínicos', () => {
  assert.match(act02.sondas.origen, /Decisiones R4 y R5, 23 nov 2026/);
  assert.equal(act02.pendientesClinicos, undefined);
});
