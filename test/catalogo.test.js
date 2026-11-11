import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { validateFicha } from '../src/engine/ficha.js';
import { PANTALLAS, PILOTO, ESTADOS, EN_UNA_LINEA, ESQUEMAS, esPiloto, requiereModoExperto, cargarCatalogo, grupos } from '../src/catalogo.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const { actividades } = leer('fichas/catalogo.json');
const conPrototipo = actividades.filter((a) => a.prototipo);
const ficha = (id) => leer(`fichas/${id}.json`);
const POSTERIORES = ['ACT-03', 'ACT-06', 'ACT-08', 'ACT-09', 'ACT-11', 'ACT-14'];

// fetch de mentira: sirve los archivos del repositorio y deja cambiar o quitar algunos.
const servir = (cambios = {}) => async (url) => {
  if (url in cambios) return cambios[url] === null ? { ok: false, status: 404 } : { ok: true, json: async () => cambios[url] };
  return { ok: true, json: async () => leer(url) };
};

test('el índice tiene las 17 actividades del Catálogo, en orden y con su estado', () => {
  assert.deepEqual(actividades.map((a) => a.id), Array.from({ length: 17 }, (_, k) => `ACT-${String(k + 1).padStart(2, '0')}`));
  for (const a of actividades) {
    assert.ok(ESTADOS.includes(a.estado), `${a.id}: estado «${a.estado}»`);
    assert.ok(a.nombre && a.paradigma, `${a.id}: nombre y paradigma`);
  }
  const de = (estado) => actividades.filter((a) => a.estado === estado).map((a) => a.id);
  assert.deepEqual(de('Piloto'), PILOTO);
  assert.deepEqual(de('Investigación'), ['ACT-12', 'ACT-13']);
  assert.equal(de('Uso posterior').length, 12);
});

test('las actividades de investigación no tienen prototipo, y las que no lo tienen dicen qué falta', () => {
  for (const a of actividades) {
    if (a.estado === 'Investigación') assert.equal(a.prototipo, false, `${a.id} no debe usarse todavía`);
    if (a.prototipo) assert.equal(a.falta, undefined, a.id);
    else assert.ok(typeof a.falta === 'string' && a.falta.trim(), `${a.id}: falta decir qué falta`);
  }
  assert.deepEqual(conPrototipo.map((a) => a.id), [...PILOTO, ...POSTERIORES, 'ACT-17'].sort());
});

test('cada actividad con prototipo tiene su ficha, con el mismo nombre que el Catálogo', () => {
  for (const a of conPrototipo) {
    assert.ok(existsSync(new URL(`../fichas/${a.id}.json`, import.meta.url)), `falta fichas/${a.id}.json`);
    const f = ficha(a.id);
    assert.equal(f.id, a.id);
    assert.equal(f.nombre, a.nombre, a.id);
    if (!esPiloto(a.id)) assert.equal(f.estado, a.estado, `${a.id}: estado de la ficha`);
  }
});

test('las fichas de uso posterior están completas y nombran una pantalla que existe', () => {
  for (const id of POSTERIORES) {
    const f = ficha(id);
    assert.deepEqual(validateFicha(f), [], id);
    assert.ok(PANTALLAS[f.pantalla], `${id}: pantalla «${f.pantalla}»`);
    // Lo que el Catálogo pide a toda ficha, más de dónde salió cada dato del prototipo.
    for (const k of ['evidencia', 'mecanica', 'notaPrototipo']) assert.ok(f[k]?.trim(), `${id}: falta «${k}»`);
    assert.deepEqual(f.revisionClinica, { revisor: '', fecha: '' }, `${id}: todavía sin revisión clínica`);
    assert.match(f.resumen, /\{aciertos\}.*\{ensayos\}/, `${id}: el resumen solo cuenta`);
  }
});

test('las actividades de uso posterior solo se abren en modo experto; las del piloto no lo exigen', () => {
  for (const id of PILOTO) assert.equal(requiereModoExperto(ficha(id)), false, id);
  for (const id of POSTERIORES) assert.equal(requiereModoExperto(ficha(id)), true, id);
});

test('cada pantalla sabe armar ensayos y dibujarse; las nuevas, además, mostrarse en la galería', () => {
  for (const [nombre, mod] of Object.entries(PANTALLAS)) {
    assert.equal(typeof mod.toTrials, 'function', `${nombre}: toTrials`);
    assert.equal(typeof mod.createView, 'function', `${nombre}: createView`);
  }
  for (const id of POSTERIORES) {
    const mod = PANTALLAS[ficha(id).pantalla];
    for (const k of ['consignaHTML', 'opcionHTML', 'consignaTexto']) assert.equal(typeof mod[k], 'function', `${id}: ${k}`);
  }
});

test('cada actividad con prototipo tiene su línea y su esquema para la tarjeta del inicio', () => {
  for (const a of conPrototipo) {
    assert.ok(EN_UNA_LINEA[a.id]?.trim(), `${a.id}: línea`);
    assert.match(ESQUEMAS[a.id] ?? '', /^<svg [^>]*aria-hidden="true"/, `${a.id}: esquema`);
    assert.match(ESQUEMAS[a.id], /currentColor/, `${a.id}: el esquema toma el color del tema`);
  }
});

test('la pausa guiada (ACT-17) no es una actividad con ensayos: dura de 1 a 2 minutos y solo deja constancia', () => {
  const p = ficha('ACT-17');
  assert.equal(p.tipo, 'pausa');
  assert.equal(p.bandas, undefined);
  assert.ok(p.duracionesS.length >= 1 && p.duracionesS.every((s) => s >= 60 && s <= 120), 'de 1 a 2 minutos');
  for (const r of p.ritmos) {
    assert.ok(r.id && r.nombre, 'cada ritmo tiene nombre');
    // Ritmo lento: cada ciclo dura varios segundos y desinflar toma más que inflar.
    assert.ok(r.inflarMs >= 3000 && r.desinflarMs >= r.inflarMs, `${r.id}: ritmo lento`);
  }
  assert.ok(p.contraindicaciones.length >= 3 && p.lecturasNoPermitidas.length >= 2);
  assert.match(p.registro, /ocurrió/);
});

test('cargarCatalogo entrega el índice, las fichas válidas y la pausa por separado', async () => {
  const { catalogo, fichas, pausa, problemas } = await cargarCatalogo(servir());
  assert.equal(catalogo.length, 17);
  assert.deepEqual(Object.keys(fichas).sort(), [...PILOTO, ...POSTERIORES].sort());
  assert.equal(pausa.id, 'ACT-17');
  assert.deepEqual(problemas, {});
});

test('una ficha incompleta no se habilita: queda en la lista de problemas', async () => {
  const rota = { ...ficha('ACT-11') };
  delete rota.contraindicaciones;
  const { fichas, problemas } = await cargarCatalogo(servir({ 'fichas/ACT-11.json': rota }));
  assert.equal(fichas['ACT-11'], undefined);
  assert.ok(problemas['ACT-11'].some((p) => p.includes('contraindicaciones')));
  assert.ok(fichas['ACT-01'], 'las demás siguen disponibles');
});

test('sin el índice del Catálogo, la aplicación sigue con las tres actividades del piloto', async () => {
  const { catalogo, fichas, pausa } = await cargarCatalogo(servir({ 'fichas/catalogo.json': null }));
  assert.deepEqual(catalogo.map((a) => a.id), PILOTO);
  assert.deepEqual(Object.keys(fichas).sort(), PILOTO);
  assert.equal(pausa, null);
});

test('el inicio agrupa las actividades en piloto y uso posterior; la pausa no es una de ellas', async () => {
  const { catalogo, fichas, problemas } = await cargarCatalogo(servir());
  const [piloto, posterior] = grupos(catalogo, fichas, problemas);
  assert.deepEqual(piloto.actividades.map((a) => a.id), PILOTO);
  assert.deepEqual(posterior.actividades.map((a) => a.id), POSTERIORES);
  // Una ficha con problemas sigue en su grupo, para que el aviso se vea al elegirla.
  const [, conProblemas] = grupos(catalogo, { ...fichas, 'ACT-08': undefined }, { 'ACT-08': ['Falta el campo «bandas».'] });
  assert.ok(conProblemas.actividades.some((a) => a.id === 'ACT-08'));
});
