// Vectores de prueba de los indicadores (tanda 5, H3.6): test/vectores/indicadores.json debe bastar
// para reimplementar A1 a A12 en R (H3.7). Aquí se comprueba que el archivo coincide con lo que da
// la aplicación y que el generador descrito en él se puede reimplementar sin el código.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generarVectores, RUTA_VECTORES, COLUMNAS_ENTRADA } from '../tools/vectores-indicadores.mjs';
import { calcularIndicadores, INDICADORES_COLUMNS, indicadoresCSV } from '../src/indicadores/exportar.js';

const archivo = JSON.parse(readFileSync(RUTA_VECTORES, 'utf8'));

test('el archivo coincide con lo que generan las funciones de hoy (corre node tools/vectores-indicadores.mjs si cambian)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(generarVectores())), archivo);
});

test('trae entradas, salidas, parámetros, versiones, semillas y generador', () => {
  for (const k of ['descripcion', 'version_indicadores', 'versiones_definicion', 'parametros', 'generador', 'columnas_entrada', 'columnas_salida', 'casos']) assert.ok(k in archivo, k);
  assert.deepEqual(archivo.columnas_salida, INDICADORES_COLUMNS);
  assert.deepEqual(archivo.columnas_entrada, COLUMNAS_ENTRADA);
  const ids = new Set(archivo.casos.flatMap((c) => c.salidas.filter((s) => s.disponible).map((s) => s.indicador)));
  for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12']) assert.ok(ids.has(id), `algún caso tiene ${id} disponible`);
  assert.ok(archivo.casos.some((c) => c.salidas.every((s) => !s.disponible && /calidad de la sesión/.test(s.motivo))), 'un caso con calidad baja');
  // Las salidas se recalculan desde las entradas del archivo.
  for (const c of archivo.casos) assert.deepEqual(JSON.parse(JSON.stringify(calcularIndicadores(c.entradas.ensayos, c.entradas.sesiones))), c.salidas, c.nombre);
});

test('el generador descrito se reimplementa con enteros grandes y da los mismos números', () => {
  // Reimplementación independiente de FNV-1a y mulberry32 con BigInt, a partir del texto del archivo.
  const M = 2n ** 32n;
  const fnv = (texto) => {
    let h = 0x811c9dc5n;
    for (const ch of texto) h = ((h ^ BigInt(ch.codePointAt(0))) * 0x01000193n) % M;
    return h;
  };
  const imul = (a, b) => (a * b) % M; // multiplicación de 32 bits truncada (sin signo es equivalente módulo 2^32)
  const mulberry = (semilla) => {
    let a = semilla;
    return () => {
      a = (a + 0x6d2b79f5n) % M;
      let t = a;
      t = imul(t ^ (t >> 15n), t | 1n);
      t = t ^ ((t + imul(t ^ (t >> 7n), t | 61n)) % M);
      return Number((t ^ (t >> 14n)) % M) / 2 ** 32;
    };
  };
  const g = archivo.generador.comprobacion;
  assert.equal(Number(fnv(g.texto)), g.semilla);
  const u = mulberry(fnv(g.texto));
  assert.deepEqual([u(), u(), u(), u(), u()], g.primeros);
});

test('A11 y A12 del caso de historia: valores a mano', () => {
  // Seis sesiones de un bloque; en la 3 se terminó el bloque y en la 5 la sesión. En la sesión 5:
  // 5 actividades, 3 completadas (IPF = 0.6); 5 sesiones, 1 terminada antes (IA = 0.2).
  const c = archivo.casos.find((x) => x.nombre === 'historia-seis-sesiones');
  const de = (s, id) => c.salidas.find((x) => x.sesion_id === s && x.indicador === id);
  assert.deepEqual([de('S-v4-5', 'A11').valor, de('S-v4-5', 'A12').valor], [0.6, 0.2]);
  assert.deepEqual([de('S-v4-6', 'A11').valor, de('S-v4-6', 'A12').valor], [4 / 6, 1 / 6]);
  assert.equal(de('S-v4-4', 'A11').disponible, false, 'con 4 actividades no se alcanza el mínimo de 5');
});

test('indicadores.csv: una fila por sesión, actividad e indicador, con detalle en JSON', () => {
  const c = archivo.casos.find((x) => x.nombre === 'sesion-tipica');
  const csv = indicadoresCSV(c.salidas).replace('﻿', '');
  const [cabecera, ...filas] = csv.trim().split('\r\n');
  assert.equal(cabecera, INDICADORES_COLUMNS.join(','));
  assert.equal(filas.length, 2 * 10 + 2, 'ACT-02 y ACT-07 con A1 a A10, más A11 y A12 de la sesión');
  assert.match(csv, /"\{""nuevos"":\[\],""dominados"":0/);
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-descargar="indicadores"/);
  assert.match(app, /calcularIndicadores\(paraExportar\(log\.rows\(\), \{ sinTiempos: sinTiempos\(\) \}\), sesiones\.rows\(\), \{ fichas: state\.fichas, items: state\.items \}\)/);
});
