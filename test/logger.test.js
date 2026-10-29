import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLog, toCSV, toJSON, COLUMNS } from '../src/engine/logger.js';
import { derive } from '../src/engine/quality.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test('el registro tiene todas las columnas en el orden acordado', () => {
  assert.deepEqual(COLUMNS, [
    'sesion_id', 'bloque', 'ensayo', 'codigo_nino', 'dispositivo', 'version_app', 'actividad',
    'version_ficha', 'item', 'banda', 'modalidad', 'n_opciones', 'disposicion', 'pos_correcta', 'pos_distractores',
    't_consigna_inicio', 't_consigna_fin', 't_audio_inicio', 't_audio_fin', 'audio_fuente',
    'audio_latencia_ms', 'audio_fin_por_tope',
    't_opciones_insercion', 't_opciones', 't_toque', 't_retro_inicio', 't_retro_fin',
    'opcion_elegida', 'acierto', 'omision', 'toques_fuera', 'toques_repetidos', 'perdida_foco',
    'cuadros_perdidos', 'cuadros_total', 'interrumpido', 'fallo_tecnico', 'tr_bruto_ms', 'anticipatoria',
    'peso_calidad',
  ]);
});

test('el registro de ejemplo de docs/ tiene las columnas actuales', () => {
  const csv = readFileSync(new URL('../docs/ejemplo-registro.csv', import.meta.url), 'utf8');
  assert.equal(csv.replace('﻿', '').split('\r\n')[0], COLUMNS.join(','));
});

test('el registro nunca guarda nombre, fecha de nacimiento ni otros datos que identifiquen', () => {
  for (const c of COLUMNS) assert.doesNotMatch(c, /nombre|name|nacimiento|birth|correo|email|telefono/i);
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
  assert.ok(line.includes(',1234.5678,'));
  assert.ok(line.includes('"[{""t"":1.5,""x"":10,""y"":20}]"'));
  assert.deepEqual(JSON.parse(toJSON(log.rows()))[0].toques_fuera, [{ t: 1.5, x: 10, y: 20 }]);
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
