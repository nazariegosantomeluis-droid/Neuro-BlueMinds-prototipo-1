import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItems, loadInputs } from '../tools/build-items.mjs';

const inputs = loadInputs();
const { conceptos, categorias, fichas } = inputs;
const { items } = JSON.parse(readFileSync(new URL('../items/items.json', import.meta.url), 'utf8'));
const byId = new Map(conceptos.map((c) => [c.id, c]));
// ACT-01 y ACT-02: ítems con opciones de imagen (ACT-07 tiene secuencias; ver act07.test.js).
const conOpciones = items.filter((i) => i.opciones);
const of = (actividad, banda) => items.filter((i) => i.actividad === actividad && (!banda || i.banda === banda));
const concepts = (it) => it.opciones.map((o) => byId.get(o.concepto));

test('cada mitad tiene 30 conceptos y 5 por categoría', () => {
  assert.equal(conceptos.length, 60);
  for (const m of ['A', 'B']) {
    const half = conceptos.filter((c) => c.mitad === m);
    assert.equal(half.length, 30, `mitad ${m}`);
    for (const cat of categorias) assert.equal(half.filter((c) => c.categoria === cat.id).length, 5, `mitad ${m}, ${cat.nombre}`);
  }
});

test('las exclusiones son simétricas y nombran conceptos existentes', () => {
  for (const c of conceptos) {
    for (const x of c.excluir) {
      assert.ok(byId.has(x), `${c.id} excluye a ${x}, que no existe`);
      assert.ok(byId.get(x).excluir.includes(c.id), `${x} también debe excluir a ${c.id}`);
    }
  }
  const pares = [['leche', 'vaso'], ['cabeza', 'ojo'], ['cabeza', 'nariz'], ['cabeza', 'boca'], ['cabeza', 'oreja'], ['cabeza', 'pelo'],
    ['cabeza', 'dientes'], ['boca', 'dientes'], ['pie', 'zapato'], ['pie', 'calcetin'], ['ojo', 'lentes']];
  for (const [a, b] of pares) assert.ok(byId.get(a).excluir.includes(b), `${a}-${b}`);
});

test('items.json está al día con conceptos.json y las fichas (regenerar con node tools/build-items.mjs)', () => {
  assert.deepEqual(buildItems(inputs), items);
});

test('los códigos son únicos y siguen el formato ACTxx-Bx-nn', () => {
  assert.equal(new Set(items.map((i) => i.codigo)).size, items.length);
  for (const it of items) {
    assert.match(it.codigo, /^ACT\d{2}-B\d-\d{2}$/);
    assert.ok(it.codigo.startsWith(`${it.actividad.replace('-', '')}-${it.banda}-`), it.codigo);
  }
});

test('cada banda genera el número de ítems y de opciones de su ficha', () => {
  for (const id of ['ACT-01', 'ACT-02']) {
    for (const b of fichas[id].bandas) {
      const band = of(id, b.id);
      assert.equal(band.length, fichas[id].itemsPorBanda, `${id} ${b.id}`);
      for (const it of band) {
        assert.equal(it.opciones.length, b.opciones, it.codigo);
        assert.equal(it.opciones.filter((o) => o.correcta).length, 1, it.codigo);
        assert.equal(new Set(it.opciones.map((o) => o.concepto)).size, b.opciones, `${it.codigo}: conceptos repetidos`);
      }
    }
  }
});

test('las bandas respetan las reglas de categoría y de color', () => {
  for (const id of ['ACT-01', 'ACT-02']) {
    for (const b of fichas[id].bandas) {
      for (const it of of(id, b.id)) {
        const [target, ...ds] = concepts(it);
        const same = ds.filter((d) => d.categoria === target.categoria);
        const other = ds.filter((d) => d.categoria !== target.categoria);
        assert.equal(same.length, b.distractoresMismaCategoria, `${it.codigo}: distractores de la misma categoría`);
        assert.equal(new Set(other.map((d) => d.categoria)).size, other.length, `${it.codigo}: otras categorías distintas entre sí`);
        if (b.distractorOtroColor) assert.ok(ds.every((d) => d.color !== target.color), `${it.codigo}: otro color`);
      }
    }
  }
});

test('ningún par excluido por las notas aparece en la misma pantalla', () => {
  const notas = [['pollito', 'gallina'], ['vaso', 'taza'], ['leche', 'agua']];
  for (const it of conOpciones) {
    const cs = concepts(it);
    for (const a of cs) for (const b of cs) assert.ok(!a.excluir.includes(b.id), `${it.codigo}: ${a.id} con ${b.id}`);
    const ids = cs.map((c) => c.id);
    for (const [a, b] of notas) assert.ok(!(ids.includes(a) && ids.includes(b)), `${it.codigo}: ${a} con ${b}`);
  }
});

test('ACT-02: un ítem por concepto y banda, sin el ejemplar 3 ni la imagen de la consigna entre las opciones', () => {
  for (const b of fichas['ACT-02'].bandas) {
    const band = of('ACT-02', b.id);
    assert.deepEqual(band.map((i) => i.concepto), conceptos.map((c) => c.id), b.id);
    band.forEach((it, k) => assert.ok(it.codigo.endsWith(String(k + 1).padStart(2, '0')), it.codigo));
  }
  for (const it of of('ACT-02')) {
    assert.equal(it.consigna.tipo, 'pictograma');
    for (const o of it.opciones) {
      assert.ok(fichas['ACT-02'].ejemplaresPractica.includes(o.ejemplar), `${it.codigo}: ejemplar ${o.ejemplar}`);
      assert.notEqual(o.src, it.consigna.src);
    }
  }
});

test('ACT-01: la muestra es el primer ejemplar y es idéntica a la opción correcta', () => {
  for (const it of of('ACT-01')) {
    const correcta = it.opciones.find((o) => o.correcta);
    assert.equal(correcta.src, it.consigna.src, it.codigo);
    assert.ok(it.opciones.every((o) => o.ejemplar === 1), it.codigo);
  }
});

test('muestra para expertos: 10 por banda, 1 o 2 por categoría y ambas mitades representadas', () => {
  for (const b of fichas['ACT-02'].bandas) {
    const sample = of('ACT-02', b.id).filter((i) => i.muestraExpertos).map((i) => byId.get(i.concepto));
    assert.equal(sample.length, 10, b.id);
    for (const cat of categorias) {
      const n = sample.filter((c) => c.categoria === cat.id).length;
      assert.ok(n === 1 || n === 2, `${b.id} ${cat.nombre}: ${n}`);
    }
    assert.equal(sample.filter((c) => c.mitad === 'A').length, 5, `${b.id} mitad A`);
    assert.equal(sample.filter((c) => c.mitad === 'B').length, 5, `${b.id} mitad B`);
  }
});

test('B4 y los conceptos pendientes quedan marcados para revisión clínica', () => {
  assert.ok(of('ACT-02', 'B4').every((i) => i.revisionPendiente));
  for (const it of conOpciones) {
    const pending = concepts(it).some((c) => c.pendiente);
    if (pending) assert.ok(it.revisionPendiente && it.motivosRevision.length, it.codigo);
    assert.equal(it.revisionPendiente, it.motivosRevision.length > 0, it.codigo);
  }
});

test('la consigna AV usa el artículo de cada concepto, en singular o plural', () => {
  const texto = (c) => of('ACT-02', 'B1').find((i) => i.concepto === c).consigna;
  assert.deepEqual(texto('perro'), { tipo: 'pictograma', src: 'assets/picto/perro.png', texto: '¿Dónde está el perro?', audio: 'donde-esta-el-perro' });
  assert.equal(texto('llaves').texto, '¿Dónde están las llaves?');
  assert.equal(texto('cepillo-de-dientes').audio, 'donde-esta-el-cepillo-de-dientes');
  assert.equal(of('ACT-01')[0].consigna.audio, 'cual-es-igual');
});
