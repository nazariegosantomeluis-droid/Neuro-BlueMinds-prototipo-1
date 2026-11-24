// Prueba de integración (H8.3; Arquitectura 13.1; RF-02): ningún campo obligatorio vacío en 500
// sesiones simuladas (tarda cerca de un minuto).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { integracion, SECUENCIA } from '../tools/integracion.mjs';
import { camposVacios, OBLIGATORIOS_ENSAYO, OBLIGATORIOS_SESION } from '../tools/campos-obligatorios.mjs';
import { COLUMNS, SESION_COLUMNS } from '../src/engine/logger.js';

test('500 sesiones simuladas, de todos los modos de fase, sin campos obligatorios vacíos', async () => {
  const r = await integracion({ ninos: 25 });
  assert.equal(r.sesiones, 500);
  assert.deepEqual(r.porModo, { familiarizacion: 25, fase1: 125, fase2: 100, fase3: 200, cierre: 50 });
  assert.ok(r.ensayos > 25000 && r.decisiones > 500, `${r.ensayos} ensayos, ${r.decisiones} decisiones`);
  assert.deepEqual(r.ejemplos, [], 'campos obligatorios vacíos');
  assert.equal(r.vacios, 0);
  assert.equal(r.auditoria.ok, true, 'la cadena de auditoría de las 500 sesiones cuadra');
  assert.deepEqual(SECUENCIA.map(([m]) => m), ['familiarizacion', 'fase1', 'fase2', 'fase3', 'cierre']);
});

test('los campos obligatorios existen en el registro y la revisión detecta uno vacío', () => {
  for (const [c] of OBLIGATORIOS_ENSAYO) assert.ok(COLUMNS.includes(c), c);
  for (const [c] of OBLIGATORIOS_SESION) assert.ok(SESION_COLUMNS.includes(c), c);
  const ensayo = Object.fromEntries(COLUMNS.map((c) => [c, 1]));
  Object.assign(ensayo, { modalidad: 'V', omision: false, interrumpido: false, modo_fase: 'fase1', t_audio_inicio: null });
  assert.deepEqual(camposVacios({ ensayos: [ensayo], sesiones: [] }), [], 'en V el audio puede ir vacío');
  assert.deepEqual(camposVacios({ ensayos: [{ ...ensayo, tr_bruto_ms: null }], sesiones: [] }).map((x) => x.campo), ['tr_bruto_ms']);
  assert.deepEqual(camposVacios({ ensayos: [{ ...ensayo, omision: true, tr_bruto_ms: null, t_toque: null, opcion_elegida: null, opcion_elegida_id: null }], sesiones: [] }), [], 'en una omisión, sin respuesta');
  assert.deepEqual(camposVacios({ ensayos: [{ ...ensayo, modalidad: 'AV' }], sesiones: [] }).map((x) => x.campo), ['t_audio_inicio']);
});
