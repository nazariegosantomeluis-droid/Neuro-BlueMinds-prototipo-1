import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLog, toCSV, toJSON, COLUMNS, SESION_COLUMNS, SESION_KEY } from '../src/engine/logger.js';
import { derive, fueraDeTarea } from '../src/engine/quality.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test('el registro tiene todas las columnas en el orden acordado', () => {
  assert.deepEqual(COLUMNS, [
    'sesion_id', 'bloque', 'ensayo', 'codigo_nino', 'dispositivo', 'version_app', 'actividad',
    'version_ficha', 'version_parametros', 'item', 'banda', 'modalidad', 'modo_fase', 'tema_imagenes',
    'n_opciones', 'disposicion', 'pos_correcta', 'pos_distractores',
    't_consigna_inicio', 't_consigna_fin', 't_audio_inicio', 't_audio_fin', 'audio_fuente',
    'audio_latencia_ms', 'audio_fin_por_tope',
    't_opciones_insercion', 't_opciones', 'decodificacion_ok', 't_toque', 't_retro_inicio', 't_retro_fin',
    'opcion_elegida', 'opcion_elegida_id', 'acierto', 'omision', 'toques_fuera', 'toques_repetidos', 'perdida_foco',
    'cuadros_perdidos', 'cuadros_total', 'interrumpido', 'fallo_tecnico', 'tr_bruto_ms',
    'latencia_dispositivo_ms', 'tr_corregido_ms', 'anticipatoria', 'fuera_de_tarea', 'peso_calidad',
  ]);
  assert.deepEqual(SESION_COLUMNS, [
    'sesion_id', 'codigo_nino', 'dispositivo', 'inicio', 'fin', 'ensayos', 'pausas',
    'terminada_antes', 'motivo_terminacion', 'nivel_apoyo', 'referencia_motora_ms',
  ]);
});

test('el registro de ejemplo de docs/ tiene las columnas actuales', () => {
  const csv = readFileSync(new URL('../docs/ejemplo-registro.csv', import.meta.url), 'utf8');
  assert.equal(csv.replace('﻿', '').split('\r\n')[0], COLUMNS.join(','));
});

test('el registro nunca guarda nombre, fecha de nacimiento ni otros datos que identifiquen', () => {
  for (const c of [...COLUMNS, ...SESION_COLUMNS]) assert.doesNotMatch(c, /nombre|name|nacimiento|birth|correo|email|telefono/i);
  const log = createLog(null);
  const row = log.add({ sesion_id: 'S-1', codigo_nino: 'DEMO', nombre: 'Ana', fecha_nacimiento: '2019-01-01', correo: 'a@b.c' });
  assert.deepEqual(Object.keys(row), COLUMNS);
  assert.equal(row.codigo_nino, 'DEMO');
  assert.ok(!JSON.stringify(log.rows()).includes('Ana'));
});

test('el registro persiste en el almacenamiento del dispositivo', () => {
  const storage = memoryStorage();
  createLog(storage).add({ sesion_id: 'S-1', ensayo: 1 });
  const reloaded = createLog(storage);
  assert.equal(reloaded.rows().length, 1);
  assert.equal(reloaded.rows()[0].sesion_id, 'S-1');
  assert.equal(reloaded.stored, true);
});

test('si el almacenamiento falla, el registro sigue en memoria y lo avisa', () => {
  const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); } };
  const log = createLog(broken);
  log.add({ sesion_id: 'S-1' });
  assert.equal(log.rows().length, 1);
  assert.equal(log.stored, false);
});

test('CSV: encabezado, valores vacíos, booleanos y campos con comas o JSON', () => {
  const log = createLog(null);
  log.add({
    sesion_id: 'S-1',
    dispositivo: 'Mozilla/5.0 (iPad; CPU OS 17_0), 1180x820',
    acierto: true,
    t_toque: 1234.5678,
    toques_fuera: [{ t: 1.5, x: 10, y: 20 }],
  });
  const csv = toCSV(log.rows());
  assert.ok(csv.startsWith('﻿'));
  const [header, line] = csv.slice(1).trim().split('\r\n');
  assert.equal(header, COLUMNS.join(','));
  assert.match(line, /^S-1,,,,"Mozilla\/5\.0 \(iPad; CPU OS 17_0\), 1180x820",/);
  assert.ok(line.includes(',true,'));
  assert.ok(line.includes(',1234.6,'));
  assert.ok(line.includes('"[{""t"":1.5,""x"":10,""y"":20}]"'));
  assert.deepEqual(JSON.parse(toJSON(log.rows()))[0].toques_fuera, [{ t: 1.5, x: 10, y: 20 }]);
});

test('exportación: los tiempos se redondean a 0.1 ms y en memoria quedan completos', () => {
  const log = createLog(null);
  log.add({
    t_opciones: 17449.100000000002,
    t_toque: 18916.666666,
    tr_bruto_ms: 1449.96,
    audio_latencia_ms: 12.34,
    peso_calidad: 0.9964664310954063,
    cuadros_total: 283,
    toques_fuera: [{ t: 46073.29999, x: 590, y: 790 }],
  });
  const line = toCSV(log.rows()).trim().split('\r\n')[1];
  for (const v of [',17449.1,', ',18916.7,', ',1450,', ',12.3,', ',283,', ',0.9964664310954063']) assert.ok(line.includes(v), v);
  assert.ok(line.includes('""t"":46073.3,""x"":590'));
  const json = JSON.parse(toJSON(log.rows()))[0];
  assert.equal(json.t_toque, 18916.7);
  assert.equal(json.peso_calidad, 0.9964664310954063, 'lo que no es tiempo no se redondea');
  assert.equal(log.rows()[0].t_toque, 18916.666666, 'en memoria, el valor completo');

  const sesiones = createLog(null, { key: SESION_KEY, columns: SESION_COLUMNS });
  sesiones.add({ sesion_id: 'S-1', pausas: [{ bloque: 1, ensayo: 4, duracion_ms: 5230.4567 }], nombre: 'Ana' });
  const [header, fila] = toCSV(sesiones.rows(), SESION_COLUMNS).slice(1).trim().split('\r\n');
  assert.equal(header, SESION_COLUMNS.join(','));
  assert.ok(fila.includes('""duracion_ms"":5230.5'));
  assert.ok(!fila.includes('Ana'));
});

test('fuera_de_tarea: logaritmo del tiempo a más de 3 MAD de la mediana de la sesión; vacío sin respuesta', () => {
  const trs = [1000, 1100, 900, 1050, 950, 1000, 5000, 120, null, -5];
  assert.deepEqual(fueraDeTarea(trs.map((tr_bruto_ms) => ({ tr_bruto_ms }))), [false, false, false, false, false, false, true, true, null, null]);
  assert.deepEqual(fueraDeTarea([]), []);
});

test('peso_calidad = foco × cuadros a tiempo × plausibilidad', () => {
  const base = { t_opciones: 1000, perdida_foco: false, cuadros_total: 100, cuadros_perdidos: 0 };
  assert.deepEqual(derive({ ...base, t_toque: 1800 }), { tr_bruto_ms: 800, anticipatoria: false, peso_calidad: 1 });
  assert.equal(derive({ ...base, t_toque: 1149 }).peso_calidad, 0);
  assert.equal(derive({ ...base, t_toque: 1800, cuadros_perdidos: 25 }).peso_calidad, 0.75);
  assert.equal(derive({ ...base, t_toque: 1800, perdida_foco: true }).peso_calidad, 0);
  assert.equal(derive({ ...base, t_toque: 1800, fallo_tecnico: true }).peso_calidad, 0);
  const omision = derive({ ...base, t_toque: null });
  assert.equal(omision.tr_bruto_ms, null);
  assert.equal(omision.anticipatoria, false);
});
