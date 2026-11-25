// Niño de demostración para los expertos (tanda 10): historia sembrada, panel con indicadores, nunca
// exportado con los datos reales y borrable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLog, comoSeExporta, SESION_COLUMNS } from '../src/engine/logger.js';
import { paraExportar } from '../src/engine/quality.js';
import { crearAuditoria, AUDITORIA_COLUMNS } from '../src/auditoria.js';
import { NINO_COLUMNS, NINO_DEMO, participante, conHistoria } from '../src/ninos.js';
import { COLUMNAS_HISTORIAL } from '../src/transporte/formato.js';
import { crearSalida, filtrarDescarga } from '../src/transporte/salida.js';
import { crearTransporte } from '../src/transporte/index.js';
import { crearDemo, borrarDemo, hayDemo } from '../src/demo.js';
import { historialDelNino, sesionHTML } from '../src/panel/panel.js';
import { historiaDemo } from '../tools/demo-historia.mjs';
import { prepararConfiguracion } from '../tools/configuracion.mjs';

const leer = (r) => JSON.parse(readFileSync(new URL(`../${r}`, import.meta.url), 'utf8'));
const historia = leer('config/demo-historia.json');
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, leer(`fichas/${id}.json`)]));
const config = leer('fichas/sesion.json');
const plantillas = leer('src/panel/plantillas.json');
const publicas = leer('config/investigador.json');
const privadas = leer('test/fixtures/llaves-prueba.json');

function tableta() {
  const m = new Map();
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const log = createLog(storage, { key: 'r' });
  const sesiones = createLog(storage, { key: 's', columns: SESION_COLUMNS });
  const historial = createLog(storage, { key: 'h', columns: COLUMNAS_HISTORIAL });
  const ninos = createLog(storage, { key: 'n', columns: NINO_COLUMNS });
  const auditoria = crearAuditoria(createLog(storage, { key: 'a', columns: AUDITORIA_COLUMNS }));
  const descargas = [];
  const transporte = crearTransporte('archivo', { descargar: (n, t) => descargas.push(t) });
  const salida = crearSalida({ storage, log, historial, sesiones, auditoria, ninos, llaves: { cifrado: publicas.cifrado, firma: publicas.firma }, transporte, exportables: () => paraExportar(comoSeExporta(log.rows()), { sinTiempos: [] }) });
  return { log, sesiones, historial, ninos, auditoria, salida, transporte, descargas };
}

test('config/demo-historia.json está al día con tools/demo-historia.mjs', async () => {
  const nueva = await historiaDemo();
  assert.deepEqual(nueva.sesiones.map((s) => [s.sesion_id, s.modo_fase]), historia.sesiones.map((s) => [s.sesion_id, s.modo_fase]));
  assert.equal(nueva.ensayos.length, historia.ensayos.length);
  assert.deepEqual(nueva.ensayos.slice(0, 5), historia.ensayos.slice(0, 5));
});

test('de la familiarización a la fase 3, todo ficticio (DN-, código demo-nino)', () => {
  assert.deepEqual([...new Set(historia.sesiones.map((s) => s.modo_fase))], ['familiarizacion', 'fase1', 'fase2', 'fase3']);
  assert.equal(historia.sesiones.filter((s) => s.modo_fase === 'fase1').length, 5, 'la línea base completa');
  assert.ok(historia.sesiones.every((s) => /^DN-\d\d$/.test(s.sesion_id) && s.codigo_nino === NINO_DEMO));
  assert.ok(historia.ensayos.every((r) => r.codigo_nino === NINO_DEMO && /^DN-/.test(r.sesion_id)));
});

test('con un botón: el panel del niño de demostración tiene indicadores y comparación con la línea base', () => {
  const t = tableta();
  const r = crearDemo(t, historia);
  assert.deepEqual(r, { sesiones: 12, ensayos: 720 });
  assert.ok(hayDemo(t.ninos));
  assert.deepEqual(crearDemo(t, historia), { sesiones: 0, ensayos: 0 }, 'no se duplica');
  const h = historialDelNino({ codigo: NINO_DEMO, sesiones: t.sesiones.rows(), ensayos: paraExportar(comoSeExporta(t.log.rows()), { sinTiempos: [] }), fichas, items: leer('items/items.json').items });
  assert.equal(h.length, 12);
  const html = sesionHTML(plantillas, h, 11, { config, fichas });
  for (const id of ['IND-01', 'ETQ-05']) assert.match(html, new RegExp(`data-plantilla="${id}"`), id);
  assert.match(html, /data-plantilla="CMP-0\d"/, 'comparación con la línea base');
  // Al iniciar una sesión con él, sus sesiones son DN-: tienen historia de niño, pero no son de un niño real.
  const p = participante(NINO_DEMO, false, t.ninos.rows());
  assert.equal(p.prefijo, 'DN');
  assert.ok(conHistoria('DN-abc'));
});

test('nunca sale en un lote; en modo de estudio se descarga como dato ficticio; la configuración no lo quita', async () => {
  const t = tableta();
  crearDemo(t, historia);
  assert.deepEqual(t.salida.porExportar(), { ensayos: 0, sesiones: 0 });
  await assert.rejects(t.salida.exportar(), /No hay datos de niños/);
  assert.equal(filtrarDescarga(t.log.rows(), true).length, 720);
  const { configuracion } = await prepararConfiguracion({ numero: 1, ninos: [{ edad_meses: 70, consentimiento: 'vigente', modo_fase: 'fase1' }] }, privadas);
  await t.salida.aplicarConfiguracion(configuracion);
  assert.ok(hayDemo(t.ninos));
  assert.equal(t.ninos.rows().length, 2);
});

test('se borra con un botón: el niño, sus sesiones y sus ensayos', () => {
  const t = tableta();
  t.sesiones.add({ sesion_id: 'S-real', codigo_nino: 'a'.repeat(32) });
  crearDemo(t, historia);
  t.log.add({ sesion_id: 'DN-ab12', codigo_nino: NINO_DEMO, actividad: 'ACT-02' });
  const r = borrarDemo(t);
  assert.deepEqual(r, { ensayos: 721, sesiones: 12 });
  assert.equal(hayDemo(t.ninos), false);
  assert.equal(t.log.rows().length, 0);
  assert.deepEqual(t.sesiones.rows().map((s) => s.sesion_id), ['S-real']);
});

test('el inicio tiene la sección «Revisión de expertos»: enlace al formulario de opinión y el niño de demostración', () => {
  const fuente = (r) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
  assert.match(fuente('src/app.js'), /href="#opinion"/);
  assert.match(fuente('src/app.js'), /data-crear-demo/);
  assert.match(fuente('src/inicio.js'), /ctx\.expertosHTML\?\.\(\)/);
});
