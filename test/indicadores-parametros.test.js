// Los umbrales y mínimos de datos viven en src/indicadores/parametros.js, cada uno con su sección
// de origen, y no repartidos en el código (tanda 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARAMETROS, VERSIONES, NOMBRES } from '../src/indicadores/parametros.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('cada parámetro dice de qué sección sale', () => {
  const revisar = (obj, ruta) => {
    if ('seccion' in obj) return assert.ok(obj.seccion.length > 3, ruta);
    for (const [k, v] of Object.entries(obj)) {
      assert.ok(v && typeof v === 'object', `${ruta}.${k} no tiene sección`);
      revisar(v, `${ruta}.${k}`);
    }
  };
  revisar(PARAMETROS, 'PARAMETROS');
  assert.ok(Object.isFrozen(PARAMETROS));
});

test('valores del Modelo 4.1 y de las decisiones D2 y D5', () => {
  const m = Object.fromEntries(Object.entries(PARAMETROS.minimos).map(([k, v]) => [k, v.valor]));
  assert.deepEqual(m, { A1: 20, A2: 20, A3: 30, A4: 20, A5: 20, A6: 30, A7: 10, A8: 10, A10: 10 });
  assert.equal(PARAMETROS.calidadMinima.valor, 0.8);
  assert.equal(PARAMETROS.a6MinutosMinimos.valor, 5);
  assert.equal(PARAMETROS.dominio.thetaEstrella, 0.7);
  assert.equal(PARAMETROS.dominio.confianza, 0.95);
  assert.equal(PARAMETROS.bootstrap.remuestras, 2000);
  for (const id of Object.keys(VERSIONES)) assert.ok(NOMBRES[id], id);
});

test('el código de los indicadores no tiene umbrales propios', () => {
  for (const f of ['src/indicadores/nucleo.js', 'src/indicadores/dominio.js']) {
    const sinComentarios = leer(f).replace(/\/\/.*$/gm, '');
    for (const n of ['0.8', '0.95', '0.7', '2000', '1.4826', '150']) assert.ok(!sinComentarios.includes(n), `${f} tiene ${n}`);
    assert.ok(!/\b(20|30|10|5)\b(?! *\))/.test(sinComentarios.replace(/1e-9/g, '')), `${f} tiene un mínimo escrito a mano`);
  }
});
