// Herramienta de reproducción (H6.4; Arquitectura 10.2; RNF-08): 20 de 20 sesiones simuladas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simularSesiones } from '../tools/simular-sesiones.mjs';
import { reproducir, reproducirSesion } from '../tools/reproducir.mjs';

// 2 niños: familiarización (con su escalera), 4 sesiones de la fase 1 y 5 de la fase 3 cada uno.
const historia = await simularSesiones({ ninos: 2, semilla: 1, secuencia: [['familiarizacion', 1], ['fase1', 4], ['fase3', 5]] });
const datos = { registro: historia.ensayos, sesiones: historia.sesiones, auditoria: historia.auditoria };
const copia = () => JSON.parse(JSON.stringify(datos));

test('las sesiones simuladas tienen de todo: familiarización, fases 1 y 3, cambios de banda, bloqueos y órdenes del terapeuta', () => {
  assert.equal(historia.sesiones.length, 20);
  const props = historia.sesiones.flatMap((s) => s.adaptacion_propuestas ?? []);
  assert.ok(props.some((p) => p.ejecutada && p.banda_actual !== p.banda_propuesta), 'cambios de banda ejecutados');
  assert.ok(props.some((p) => p.invariante), 'acciones bloqueadas por un invariante');
  const ordenes = historia.sesiones.flatMap((s) => s.ordenes_terapeuta ?? []).map((o) => o.accion);
  assert.ok(ordenes.length >= 3, `órdenes del terapeuta: ${ordenes.join(', ')}`);
  assert.ok(new Set(historia.ensayos.map((r) => `${r.sesion_id}:${r.bloque}`)).size > 40, 'hay bloques partidos por un cambio de banda');
});

test('reproduce exactamente 20 de 20 sesiones elegidas al azar', () => {
  const r = reproducir(datos, { n: 20, semilla: 7 });
  assert.equal(r.elegidas, 20);
  assert.deepEqual(r.resultados.filter((x) => !x.reproducida).map((x) => [x.sesion_id, x.diferencias]), []);
  assert.equal(r.reproducidas, 20);
});

test('detecta un ensayo, una decisión o un indicador que no cuadra', () => {
  const s3 = historia.sesiones.find((s) => (s.adaptacion_propuestas ?? []).length > 2).sesion_id;
  // Un acierto cambiado en el registro.
  const a = copia();
  const fila = a.registro.find((r) => r.sesion_id === s3 && !r.omision);
  fila.acierto = !fila.acierto;
  assert.equal(reproducirSesion(s3, a).reproducida, false);
  // Una decisión registrada como ejecutada que no lo fue.
  const b = copia();
  const p = b.sesiones.find((s) => s.sesion_id === s3).adaptacion_propuestas[1];
  p.ejecutada = !p.ejecutada;
  const rb = reproducirSesion(s3, b);
  assert.equal(rb.reproducida, false);
  assert.match(rb.diferencias.join(' '), /decisión 2, ejecutada/);
  // Un indicador cambiado en la auditoría.
  const c = copia();
  const e = c.auditoria.filter((x) => x.tipo === 'indicadores' && x.datos.sesion_id === s3).at(-1);
  e.datos.resultado[0].valor = 0.123;
  assert.match(reproducirSesion(s3, c).diferencias.join(' '), /indicadores distintos/);
  // Otra versión de los parámetros.
  const dd = copia();
  dd.sesiones.find((s) => s.sesion_id === s3).huella_parametros = '0'.repeat(64);
  assert.equal(reproducirSesion(s3, dd).otra_version, true);
});
