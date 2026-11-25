// Transporte «servidor» contra el servidor de prueba (decisión D6; Arquitectura 9.4 y 13.1,
// prueba de sincronización): cero pérdidas y cero duplicados con cortes de red al azar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simularSesiones } from '../tools/simular-sesiones.mjs';
import { createLog, comoSeExporta, SESION_COLUMNS } from '../src/engine/logger.js';
import { paraExportar } from '../src/engine/quality.js';
import { crearAuditoria, AUDITORIA_COLUMNS } from '../src/auditoria.js';
import { NINO_COLUMNS } from '../src/ninos.js';
import { COLUMNAS_HISTORIAL } from '../src/transporte/formato.js';
import { crearSalida } from '../src/transporte/salida.js';
import { crearTransporte } from '../src/transporte/index.js';
import { esperaDeIntento, ESPERA_MAXIMA_MS } from '../src/transporte/servidor.js';
import { filasDe } from '../src/transporte/importacion.js';
import { prepararConfiguracion } from '../tools/configuracion.mjs';
import { crearServidorPrueba } from './servidor-prueba.mjs';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const publicas = leer('config/investigador.json');
const privadas = leer('test/fixtures/llaves-prueba.json');
const LLAVES = { cifrado: { privada: privadas.cifrado }, firma: { privada: privadas.firma } };
const historia = await simularSesiones({ ninos: 2, semilla: 5, secuencia: [['fase1', 4], ['fase3', 4]] });
const ids = [...new Set(historia.sesiones.map((s) => s.sesion_id))];
const exportar = (rows) => paraExportar(comoSeExporta(rows), { sinTiempos: [] });

// fetch con cortes de red al azar (con semilla): el pedido se pierde antes de llegar, o llega y se
// pierde la respuesta (el caso difícil: el servidor ya guardó el lote y la tableta no lo sabe).
function redInestable(semilla, { perderPedido = 0.25, perderRespuesta = 0.2 } = {}) {
  let x = semilla >>> 0;
  const azar = () => ((x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 2 ** 32);
  const cortes = { pedido: 0, respuesta: 0 };
  const f = async (url, opciones) => {
    if (f.estable) return fetch(url, opciones);
    if (azar() < perderPedido) {
      cortes.pedido++;
      throw new TypeError('fetch failed (corte de red antes de llegar)');
    }
    const r = await fetch(url, opciones);
    await r.clone().text();
    if (azar() < perderRespuesta) {
      cortes.respuesta++;
      throw new TypeError('fetch failed (se perdió la respuesta)');
    }
    return r;
  };
  f.cortes = cortes;
  f.estable = false;
  return f;
}

function tableta(url, red) {
  const m = new Map();
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const log = createLog(storage, { key: 'r' });
  const sesiones = createLog(storage, { key: 's', columns: SESION_COLUMNS });
  const historial = createLog(storage, { key: 'h', columns: COLUMNAS_HISTORIAL });
  const ninos = createLog(storage, { key: 'n', columns: NINO_COLUMNS });
  const auditoria = crearAuditoria(createLog(storage, { key: 'a', columns: AUDITORIA_COLUMNS }));
  const obj = { log, sesiones, historial, ninos, auditoria };
  // El transporte se crea con el id de la tableta (lo da la propia salida).
  let transporte = null;
  const intermedio = { tipo: 'servidor', entregar: (s) => transporte.entregar(s), recibir: () => transporte.recibir() };
  obj.salida = crearSalida({ storage, log, historial, sesiones, auditoria, ninos, llaves: { cifrado: publicas.cifrado, firma: publicas.firma }, transporte: intermedio, exportables: () => exportar(log.rows()) });
  transporte = crearTransporte('servidor', { url, dispositivo: obj.salida.dispositivo(), token: 'tableta-1', fetch: red, esperar: async () => {}, reintentos: 3 });
  return obj;
}

test('espera creciente entre reintentos, con tope', () => {
  assert.deepEqual([0, 1, 2, 3].map(esperaDeIntento), [500, 1000, 2000, 4000]);
  assert.equal(esperaDeIntento(20), ESPERA_MAXIMA_MS);
});

for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test(`cortes de red al azar (semilla ${semilla}): cero pérdidas y cero duplicados`, async () => {
    const srv = crearServidorPrueba({ llaves: LLAVES, publicaFirma: publicas.firma, tokens: new Set(['tableta-1']) });
    const url = await srv.iniciar();
    try {
      const red = redInestable(semilla);
      const t = tableta(url, red);
      // Las sesiones llegan de dos en dos; después de cada par, la tableta intenta exportar y recibir.
      for (let k = 0; k < ids.length; k += 2) {
        const nuevas = new Set(ids.slice(k, k + 2));
        for (const r of historia.ensayos.filter((x) => nuevas.has(x.sesion_id))) t.log.add(r);
        for (const s of historia.sesiones.filter((x) => nuevas.has(x.sesion_id))) t.sesiones.add(s);
        await t.salida.exportar().catch(() => {});
        await t.salida.recibir().catch(() => {});
      }
      // Vuelve la red: una exportación y una recepción terminan de sincronizar.
      red.estable = true;
      if (t.log.rows().length) await t.salida.exportar();
      await t.salida.recibir();
      assert.ok(red.cortes.pedido + red.cortes.respuesta > 0, 'hubo cortes');
      // Servidor: cada ensayo y cada sesión una sola vez, ninguno perdido.
      const ensayos = filasDe(srv.base, 'ensayo');
      const clave = (r) => `${r.sesion_id}|${r.bloque}|${r.ensayo}|${r.actividad}|${r.item}|${r.t_opciones}`;
      assert.equal(ensayos.length, historia.ensayos.length, 'cero pérdidas');
      assert.equal(new Set(ensayos.map(clave)).size, ensayos.length, 'cero duplicados');
      assert.deepEqual(ensayos.map(clave).sort(), exportar(historia.ensayos).map(clave).sort());
      assert.equal(filasDe(srv.base, 'sesion').length, historia.sesiones.length);
      // Tableta: todo con recibo, borrado del registro y una sola vez en el historial.
      assert.equal(t.log.rows().length, 0);
      assert.equal(t.historial.rows().length, historia.ensayos.length);
      assert.equal(t.salida.estado().pendientes.length, 0);
      assert.equal(t.auditoria.verificar().ok, true);
    } finally {
      await srv.cerrar();
    }
  });
}

test('el servidor rechaza un lote alterado y una configuración con firma inválida; la tableta recibe la configuración firmada', async () => {
  const srv = crearServidorPrueba({ llaves: LLAVES, publicaFirma: publicas.firma });
  const url = await srv.iniciar();
  try {
    const red = redInestable(1);
    red.estable = true;
    const t = tableta(url, red);
    for (const r of historia.ensayos.slice(0, 60)) t.log.add(r);
    t.sesiones.add(historia.sesiones[0]);
    const { sobre } = await t.salida.exportar();
    const alterado = { ...sobre, datos: (sobre.datos[0] === 'A' ? 'B' : 'A') + sobre.datos.slice(1) };
    const r = await fetch(`${url}/lotes/${alterado.lote_id}x`, { method: 'PUT', body: JSON.stringify(alterado) });
    assert.equal(r.status, 400, 'id de la ruta distinto');
    const r2 = await fetch(`${url}/lotes/${alterado.lote_id}`, { method: 'PUT', body: JSON.stringify(alterado) });
    assert.equal(r2.status, 422);
    assert.match((await r2.json()).motivo, /alterado/);
    assert.equal((await fetch(`${url}/lotes/${sobre.lote_id}`, { method: 'PUT', body: JSON.stringify(sobre) })).status, 200, 'el original otra vez: idempotente');

    const { configuracion } = await prepararConfiguracion({ numero: 1, ninos: [{ codigo: 'a'.repeat(32), edad_meses: 70, consentimiento: 'vigente', modo_fase: 'fase1' }] }, privadas);
    const mala = await fetch(`${url}/configuracion`, { method: 'PUT', body: JSON.stringify({ ...configuracion, numero: 2 }) });
    assert.equal(mala.status, 422);
    assert.equal((await fetch(`${url}/configuracion`, { method: 'PUT', body: JSON.stringify(configuracion) })).status, 200);
    const rs = await t.salida.recibir();
    assert.ok(rs.some((x) => x.tipo === 'configuracion' && x.numero === 1));
    assert.equal(t.salida.estudio, true);
    assert.equal(t.ninos.rows()[0].codigo, 'a'.repeat(32));
  } finally {
    await srv.cerrar();
  }
});

test('el contrato (docs/servidor/contrato.yaml) tiene los recursos del servidor de prueba y los campos del formato', async () => {
  const yaml = readFileSync(new URL('../docs/servidor/contrato.yaml', import.meta.url), 'utf8');
  assert.match(yaml, /^openapi: 3\.\d+\.\d+$/m);
  const rutas = [...yaml.matchAll(/^ {2}(\/[^:]+):$/gm)].map((m) => m[1]);
  assert.deepEqual(rutas, ['/lotes/{lote_id}', '/dispositivos/{dispositivo}/recibos', '/dispositivos/{dispositivo}/configuracion', '/configuracion']);
  const { armarRecibo, armarLote, registrosDe } = await import('../src/transporte/formato.js');
  const lote = armarLote({ dispositivo: 'a'.repeat(32), numero: 1, creado: 'x', registros: registrosDe({ ensayos: exportar(historia.ensayos.slice(0, 2)) }), huella_auditoria: 'h' });
  const requeridos = (nombre) => JSON.parse(`[${new RegExp(`^ {4}${nombre}:\\n(?: {6}.*\\n)*? {6}required: \\[([^\\]]+)\\]`, 'm').exec(yaml)[1].split(', ').map((x) => `"${x}"`).join(',')}]`);
  assert.deepEqual(requeridos('Recibo').sort(), [...Object.keys(armarRecibo(lote, { recibido: 'x', nuevos: 0, duplicados: 0 })), 'firma'].sort());
  assert.deepEqual(requeridos('Lote').sort(), Object.keys(lote).filter((k) => !['version_app', 'commit'].includes(k)).sort());
  assert.deepEqual(requeridos('Registro').sort(), Object.keys(lote.registros[0]).sort());
});
