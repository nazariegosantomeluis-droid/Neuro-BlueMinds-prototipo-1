// Salida de datos del piloto (decisión D6): lotes cifrados, importación idempotente con recibo
// firmado, borrado en la tableta solo con el recibo y configuración firmada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simularSesiones } from '../tools/simular-sesiones.mjs';
import { createLog, comoSeExporta, SESION_COLUMNS } from '../src/engine/logger.js';
import { paraExportar } from '../src/engine/quality.js';
import { crearAuditoria, AUDITORIA_COLUMNS, nuevaEntrada } from '../src/auditoria.js';
import { NINO_COLUMNS } from '../src/ninos.js';
import { registrosDe, armarLote, verificarLote, conIds, COLUMNAS_HISTORIAL, verificarConfiguracion, FORMATO_CONFIGURACION, VERSION_LOTE } from '../src/transporte/formato.js';
import { cifrarLote, descifrarLote, firmar, verificarFirma, generarLlaves, aBase64, deBase64 } from '../src/transporte/cripto.js';
import { importarLote, baseVacia, filasDe } from '../src/transporte/importacion.js';
import { crearSalida, esDeNino } from '../src/transporte/salida.js';
import { crearTransporte } from '../src/transporte/index.js';
import { historialDelNino } from '../src/panel/panel.js';
import { lineaBaseRegulacion } from '../src/adaptacion.js';
import { unidadesDominadas } from '../src/indicadores/dominio.js';
import { calcularIndicadores } from '../src/indicadores/exportar.js';
import { prepararConfiguracion } from '../tools/configuracion.mjs';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const publicas = leer('config/investigador.json');
const privadas = leer('test/fixtures/llaves-prueba.json');
const LLAVES = { cifrado: { privada: privadas.cifrado }, firma: { privada: privadas.firma } };
const PUBLICAS = { cifrado: publicas.cifrado, firma: publicas.firma };
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, leer(`fichas/${id}.json`)]));
const items = leer('items/items.json').items;

const historia = await simularSesiones({ ninos: 2, semilla: 3, secuencia: [['familiarizacion', 1], ['fase1', 5], ['fase3', 3]] });
const exportar = (rows) => paraExportar(comoSeExporta(rows), { sinTiempos: [] });

function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

// Una tableta en memoria con la historia simulada (más una sesión de demostración y una en curso).
function tableta({ transporte, ahora = () => Date.parse('2026-11-30T12:00:00Z'), enCurso = null, extraSesiones = [], extraEnsayos = [] } = {}) {
  const storage = memoria();
  const log = createLog(storage, { key: 'r' });
  const sesiones = createLog(storage, { key: 's', columns: SESION_COLUMNS });
  const historial = createLog(storage, { key: 'h', columns: COLUMNAS_HISTORIAL });
  const ninos = createLog(storage, { key: 'n', columns: NINO_COLUMNS });
  const registroAud = createLog(storage, { key: 'a', columns: AUDITORIA_COLUMNS });
  for (const r of [...historia.ensayos, ...extraEnsayos]) log.add(r);
  for (const s of [...historia.sesiones, ...extraSesiones]) sesiones.add(s);
  for (const e of historia.auditoria) registroAud.add(e);
  const auditoria = crearAuditoria(registroAud);
  const descargas = [];
  const t = transporte ?? crearTransporte('archivo', { descargar: (nombre, texto) => descargas.push({ nombre, texto }) });
  const salida = crearSalida({ storage, log, historial, sesiones, auditoria, ninos, llaves: PUBLICAS, transporte: t, exportables: () => exportar(log.rows()), enCurso: () => enCurso, ahora, version: () => ({ version: '0.1.0', commit: null }) });
  return { storage, log, sesiones, historial, ninos, auditoria, salida, descargas, transporte: t };
}

const demo = { sesion_id: 'DEMO-abcd1234', codigo_nino: 'DEMO', modo_fase: 'prototipo', inicio: '2026-11-20T10:00:00.000Z' };
const filaDemo = { ...historia.ensayos[0], sesion_id: 'DEMO-abcd1234', codigo_nino: 'DEMO' };

// ---------- Cifrado ----------

test('el lote cifrado solo se abre con la llave privada del investigador; la tableta no puede leerlo', async () => {
  const lote = armarLote({ dispositivo: 'a'.repeat(32), numero: 1, creado: '2026-11-30T12:00:00.000Z', registros: registrosDe({ ensayos: exportar(historia.ensayos.slice(0, 30)) }), huella_auditoria: '0'.repeat(64) });
  const sobre = await cifrarLote(lote, publicas.cifrado);
  assert.ok(!JSON.stringify(sobre).includes(historia.ensayos[0].codigo_nino), 'nada del lote va en claro');
  assert.deepEqual(await descifrarLote(sobre, privadas.cifrado), lote);
  const otra = await generarLlaves();
  await assert.rejects(descifrarLote(sobre, otra.cifrado.privada), /otra llave/);
  // La tableta solo tiene la llave pública: no le sirve para descifrar.
  await assert.rejects(descifrarLote(sobre, { ...publicas.cifrado }), /./);
  // Cambiar un byte de los datos o de la cabecera rompe la etiqueta de AES-GCM.
  const bytes = deBase64(sobre.datos);
  bytes[100] ^= 1;
  await assert.rejects(descifrarLote({ ...sobre, datos: aBase64(bytes) }, privadas.cifrado), /alterado/);
  await assert.rejects(descifrarLote({ ...sobre, creado: '2026-12-01T00:00:00.000Z' }, privadas.cifrado), /alterado/);
});

test('firma ECDSA P-256: válida con la llave del investigador; inválida si cambia un dato o es otra llave', async () => {
  const f = await firmar({ a: 1, b: [2, 3] }, privadas.firma);
  assert.equal(await verificarFirma(f, publicas.firma), true);
  assert.equal(await verificarFirma({ ...f, a: 2 }, publicas.firma), false);
  const otra = await generarLlaves();
  assert.equal(await verificarFirma(await firmar({ a: 1, b: [2, 3] }, otra.firma.privada), publicas.firma), false);
  assert.equal(await verificarFirma({ a: 1 }, publicas.firma), false, 'sin firma');
});

test('cada registro tiene id único, versión y suma; un registro alterado invalida el lote', () => {
  const regs = registrosDe({ ensayos: exportar(historia.ensayos), sesiones: historia.sesiones, auditoria: historia.auditoria });
  assert.equal(new Set(regs.map((r) => r.id)).size, regs.length);
  for (const r of regs) assert.ok(r.id && r.version && /^[0-9a-f]{64}$/.test(r.suma));
  const lote = armarLote({ dispositivo: 'b'.repeat(32), numero: 2, creado: 'x', registros: regs, huella_auditoria: 'h' });
  assert.deepEqual(verificarLote(lote), { ok: true, motivo: null });
  const malo = structuredClone(lote);
  malo.registros[5].datos.acierto = !malo.registros[5].datos.acierto;
  assert.match(verificarLote(malo).motivo, /suma/);
});

// ---------- Exportación, importación y recibo ----------

test('exportar: solo datos de niños (nunca demostración ni la sesión en curso); importar con recibo y borrar solo al cargarlo', async () => {
  const enCurso = historia.sesiones.at(-1).sesion_id;
  const t = tableta({ enCurso, extraSesiones: [demo], extraEnsayos: [filaDemo] });
  const totalNino = exportar(t.log.rows()).filter((r) => esDeNino(r.sesion_id) && r.sesion_id !== enCurso).length;
  const r = await t.salida.exportar();
  assert.equal(r.ensayos, totalNino);
  assert.equal(t.descargas.length, 1);
  assert.match(t.descargas[0].nombre, /^lote-autipal-[0-9a-f]{32}-1\.json$/);
  // Antes del recibo, la tableta no borró nada.
  assert.equal(t.log.rows().length, historia.ensayos.length + 1);

  const base = baseVacia();
  const imp = await importarLote(base, t.descargas[0].texto, LLAVES);
  const lote = await descifrarLote(JSON.parse(t.descargas[0].texto), privadas.cifrado);
  assert.ok(lote.registros.every((x) => x.tipo === 'auditoria' || esDeNino(x.datos.sesion_id)), 'nada de la demostración');
  assert.ok(!lote.registros.some((x) => x.datos.sesion_id === enCurso), 'nada de la sesión en curso');
  assert.equal(filasDe(base, 'ensayo').length, totalNino);
  assert.equal(await verificarFirma(imp.recibo, publicas.firma), true);

  const antes = t.log.rows().length;
  const ap = await t.salida.aplicarRecibo(imp.recibo);
  assert.equal(ap.borrados, totalNino);
  assert.equal(t.log.rows().length, antes - totalNino, 'quedan la demostración y la sesión en curso');
  assert.ok(t.log.rows().every((x) => !esDeNino(x.sesion_id) || x.sesion_id === enCurso));
  assert.equal(t.historial.rows().length, totalNino);
  assert.equal(t.salida.estado().pendientes.length, 0);
  // Cargar otra vez el mismo recibo no hace nada.
  assert.deepEqual(await t.salida.aplicarRecibo(imp.recibo), { borrados: 0, repetido: true });
  assert.deepEqual(t.auditoria.verificar().ok, true);
});

test('con el historial que queda en la tableta, el panel, los indicadores, la regulación y el dominio dan lo mismo', async () => {
  const t = tableta();
  const completo = exportar(t.log.rows());
  await t.salida.exportar();
  const base = baseVacia();
  const { recibo } = await importarLote(base, t.descargas[0].texto, LLAVES);
  await t.salida.aplicarRecibo(recibo);
  assert.equal(t.log.rows().length, 0);
  const corto = [...t.historial.rows(), ...exportar(t.log.rows())];
  for (const codigo of [...new Set(historia.sesiones.map((s) => s.codigo_nino))]) {
    const a = historialDelNino({ codigo, sesiones: t.sesiones.rows(), ensayos: completo, fichas, items });
    const b = historialDelNino({ codigo, sesiones: t.sesiones.rows(), ensayos: corto, fichas, items });
    assert.deepEqual(b.map((h) => h.indicadores), a.map((h) => h.indicadores), 'indicadores del panel');
    for (const act of ['ACT-02', 'ACT-07']) {
      const de = (rows) => rows.filter((r) => r.codigo_nino === codigo && r.actividad === act);
      assert.deepEqual(lineaBaseRegulacion(de(corto)), lineaBaseRegulacion(de(completo)), 'línea base de la señal de regulación');
      assert.deepEqual([...unidadesDominadas(de(corto), { unidad: (r) => r.item, criterio: { umbral: 0.7, probabilidad: 0.95 } })], [...unidadesDominadas(de(completo), { unidad: (r) => r.item, criterio: { umbral: 0.7, probabilidad: 0.95 } })], 'dominio');
    }
  }
  assert.deepEqual(calcularIndicadores(corto, t.sesiones.rows(), { fichas, items }), calcularIndicadores(completo, t.sesiones.rows(), { fichas, items }));
  // Lo que queda no tiene tiempos de la consigna ni del audio, posiciones, toques ni la tableta.
  assert.deepEqual(Object.keys(t.historial.rows()[0]).sort(), [...COLUMNAS_HISTORIAL].sort());
  for (const c of ['dispositivo', 't_consigna_inicio', 't_audio_inicio', 'pos_correcta', 'toques_fuera', 'version_app']) assert.ok(!COLUMNAS_HISTORIAL.includes(c));
});

test('cero pérdidas y cero duplicados con lotes repetidos, cortados, alterados y en desorden', async () => {
  const sesionesNino = [...new Set(historia.sesiones.map((s) => s.sesion_id))];
  const corte = Math.floor(sesionesNino.length / 2);
  // Tableta 1: exporta la mitad de las sesiones (la otra mitad «en curso»: se simula agregándolas después).
  const t = tableta();
  const quitar = new Set(sesionesNino.slice(corte));
  const guardadas = t.log.rows().filter((r) => quitar.has(r.sesion_id));
  t.log.edit((all) => {
    const quedan = all.filter((r) => !quitar.has(r.sesion_id));
    all.length = 0;
    all.push(...quedan);
  });
  const l1 = await t.salida.exportar();
  // Más sesiones: el lote 2 lleva otra vez las de antes (sin recibo todavía) y las nuevas.
  for (const r of guardadas) t.log.add(r);
  const l2 = await t.salida.exportar();
  const [s1, s2] = t.descargas.map((d) => d.texto);

  const base = baseVacia();
  // Cortado: no se importa nada.
  await assert.rejects(importarLote(base, s2.slice(0, s2.length / 2), LLAVES), (e) => e.rechazo && /incompleto/.test(e.message));
  assert.deepEqual(base, baseVacia());
  // Alterado (un carácter del cifrado): rechazado entero.
  const alterado = JSON.parse(s2);
  alterado.datos = (alterado.datos[0] === 'A' ? 'B' : 'A') + alterado.datos.slice(1);
  await assert.rejects(importarLote(base, JSON.stringify(alterado), LLAVES), /alterado/);
  assert.deepEqual(base, baseVacia());
  // En desorden y repetidos: 2, 1, 2, 1.
  const a = await importarLote(base, s2, LLAVES);
  const b = await importarLote(base, s1, LLAVES);
  const copia = structuredClone(base);
  const a2 = await importarLote(base, s2, LLAVES);
  const b2 = await importarLote(base, s1, LLAVES);
  assert.deepEqual(base, copia, 'repetir no cambia la base');
  assert.ok(a2.repetido && b2.repetido);
  assert.deepEqual(a2.recibo, a.recibo, 'el mismo recibo');
  assert.equal(b.nuevos, 0, 'el lote 1 ya venía completo dentro del 2');
  const ensayos = filasDe(base, 'ensayo');
  assert.equal(ensayos.length, historia.ensayos.length, 'cero pérdidas');
  assert.equal(new Set(Object.keys(base.registros)).size, Object.keys(base.registros).length, 'cero duplicados');
  assert.deepEqual(ensayos.map((r) => `${r.sesion_id}|${r.bloque}|${r.ensayo}|${r.actividad}|${r.item}`).sort(), exportar(historia.ensayos).map((r) => `${r.sesion_id}|${r.bloque}|${r.ensayo}|${r.actividad}|${r.item}`).sort());
  // Recibos en desorden en la tableta: el del lote 2 borra todo y el del 1 ya no tiene nada pendiente.
  await t.salida.aplicarRecibo(a.recibo);
  assert.equal(t.log.rows().length, 0);
  assert.deepEqual(await t.salida.aplicarRecibo(b.recibo), { borrados: 0, repetido: false, superado: true });
  // Un recibo de un lote que la tableta nunca exportó sí se rechaza.
  const ajeno = await firmar({ ...b.recibo, lote_id: `${b.recibo.dispositivo}-99`, numero: 99 }, privadas.firma);
  await assert.rejects(t.salida.aplicarRecibo(ajeno), /no tiene pendiente/);
  assert.equal(l1.ensayos + guardadas.length, l2.ensayos);
});

test('lote con la auditoría rota, que no continúa la ya importada, o de otra llave: rechazado sin tocar la base', async () => {
  const t = tableta();
  await t.salida.exportar();
  const base = baseVacia();
  await importarLote(base, t.descargas[0].texto, LLAVES);
  const copia = structuredClone(base);
  // Otra tableta con la misma identidad pero una auditoría distinta.
  const lote = await descifrarLote(JSON.parse(t.descargas[0].texto), privadas.cifrado);
  const entradas = lote.registros.filter((r) => r.tipo === 'auditoria').map((r) => r.datos);
  const distinta = [];
  for (const e of entradas) distinta.push(nuevaEntrada(distinta, e.tipo, { ...e.datos, x: 1 }, e.hora));
  const regs = [...lote.registros.filter((r) => r.tipo !== 'auditoria'), ...registrosDe({ auditoria: distinta })];
  const otro = armarLote({ dispositivo: lote.dispositivo, numero: 9, creado: lote.creado, registros: regs, huella_auditoria: distinta.at(-1).huella });
  await assert.rejects(importarLote(base, await cifrarLote(otro, publicas.cifrado), LLAVES), /no continúa/);
  // Cadena rota dentro del lote.
  const rota = structuredClone(entradas);
  rota[2].datos = { cambiado: true };
  const regs2 = [...lote.registros.filter((r) => r.tipo !== 'auditoria'), ...registrosDe({ auditoria: rota })];
  const roto = armarLote({ dispositivo: 'c'.repeat(32), numero: 1, creado: lote.creado, registros: regs2, huella_auditoria: rota.at(-1).huella });
  await assert.rejects(importarLote(base, await cifrarLote(roto, publicas.cifrado), LLAVES), /auditoría está rota/);
  // Cifrado para otra llave.
  const otra = await generarLlaves();
  await assert.rejects(importarLote(base, await cifrarLote(lote, otra.cifrado.publica), LLAVES), /otra llave/);
  // Un ensayo que cambió después de exportarse.
  const cambiado = structuredClone(lote);
  const k = cambiado.registros.findIndex((r) => r.tipo === 'ensayo');
  cambiado.registros[k] = registrosDe({ ensayos: [{ ...cambiado.registros[k].datos, acierto: !cambiado.registros[k].datos.acierto }] })[0];
  const { suma, ...sin } = cambiado;
  const rehecho = armarLote({ ...sin, numero: 7 });
  await assert.rejects(importarLote(base, await cifrarLote(rehecho, publicas.cifrado), LLAVES), /otro contenido/);
  assert.deepEqual(base, copia);
});

test('una sesión que cambia después de exportar llega como versión nueva, sin duplicarse', async () => {
  const t = tableta();
  await t.salida.exportar();
  const id = historia.sesiones[2].sesion_id;
  t.sesiones.edit((all) => (all.find((s) => s.sesion_id === id).participacion = 5));
  await t.salida.exportar();
  const base = baseVacia();
  await importarLote(base, t.descargas[0].texto, LLAVES);
  const r = await importarLote(base, t.descargas[1].texto, LLAVES);
  assert.equal(r.versiones, 1);
  assert.equal(r.nuevos > 0, true, 'las entradas nuevas de la auditoría');
  assert.equal(filasDe(base, 'sesion').find((s) => s.sesion_id === id).participacion, 5);
  assert.equal(base.registros[`S:${id}`].versiones.length, 1);
  assert.equal(filasDe(base, 'sesion').length, historia.sesiones.length);
});

test('recibo con firma inválida, de otra tableta o de otro lote: no se borra nada y queda en la auditoría', async () => {
  const t = tableta();
  await t.salida.exportar();
  const base = baseVacia();
  const { recibo } = await importarLote(base, t.descargas[0].texto, LLAVES);
  const n = t.log.rows().length;
  const otra = await generarLlaves();
  await assert.rejects(t.salida.aplicarRecibo(await firmar(recibo, otra.firma.privada)), /firma del recibo no es válida/);
  await assert.rejects(t.salida.aplicarRecibo({ ...recibo, ensayos: 1 }), /firma/);
  await assert.rejects(t.salida.aplicarRecibo(await firmar({ ...recibo, dispositivo: 'f'.repeat(32) }, privadas.firma)), /otra tableta/);
  await assert.rejects(t.salida.aplicarRecibo(await firmar({ ...recibo, suma_ensayos: '0'.repeat(64) }, privadas.firma)), /no corresponde/);
  assert.equal(t.log.rows().length, n);
  const tipos = t.auditoria.entradas().map((e) => e.tipo);
  assert.equal(tipos.filter((x) => x === 'recibo_rechazado').length, 4);
  assert.equal(t.auditoria.verificar().ok, true);
});

test('aviso a los 7 días sin exportar (Arquitectura 9.4)', async () => {
  let ahora = Date.parse('2026-11-08T12:00:00Z');
  const t = tableta({ ahora: () => ahora });
  // Sesiones simuladas del 1 al 9 de noviembre: la más antigua, hace 7 días.
  assert.equal(t.salida.aviso()?.dias, 7);
  await t.salida.exportar();
  assert.equal(t.salida.aviso(), null, 'recién exportado');
  ahora += 6 * 864e5;
  assert.equal(t.salida.aviso(), null);
  ahora += 864e5;
  assert.equal(t.salida.aviso()?.dias, 7, 'el lote sigue sin recibo y no se volvió a exportar');
  const { recibo } = await importarLote(baseVacia(), t.descargas[0].texto, LLAVES);
  await t.salida.aplicarRecibo(recibo);
  assert.equal(t.salida.aviso(), null, 'con el recibo ya no queda nada sin respaldo');
});

// ---------- Configuración firmada ----------

test('configuración firmada: fija consentimiento y modo de fase, trae resultados y pone la tableta en modo de estudio', async () => {
  const t = tableta();
  t.ninos.add({ codigo: 'e'.repeat(32), icono: 'rombo', color: 'rojo', edad_meses: 60, consentimiento: 'vigente', video: false, modo_fase: 'fase1', bandas: { 'ACT-02': 'B3' } });
  assert.equal(t.salida.estudio, false);
  const dispositivo = t.salida.dispositivo();
  const codigo = 'e'.repeat(32);
  const { configuracion, nuevos } = await prepararConfiguracion(
    { numero: 1, dispositivos: [dispositivo], ninos: [{ codigo, edad_meses: 60, consentimiento: 'vigente', modo_fase: 'fase3' }, { edad_meses: 90, consentimiento: 'suspendido', modo_fase: 'fase1' }], resultados: { [codigo]: { mejor_modalidad: [{ actividad: 'ACT-02', modalidad: 'AV', fecha: '2026-11-20' }], nivel_b: [] } } },
    privadas,
  );
  assert.equal(nuevos.length, 1);
  t.transporte.depositar(JSON.stringify(configuracion));
  const [r] = await t.salida.recibir();
  assert.equal(r.tipo, 'configuracion');
  assert.equal(t.salida.estudio, true);
  const padron = t.ninos.rows();
  assert.equal(padron.length, 2);
  assert.equal(padron[0].modo_fase, 'fase3');
  assert.deepEqual(padron[0].bandas, { 'ACT-02': 'B3' }, 'se conserva la banda que fijó el terapeuta');
  assert.equal(padron[1].consentimiento, 'suspendido');
  assert.deepEqual(t.salida.estado().configuracion.resultados[codigo].mejor_modalidad[0].modalidad, 'AV');
  assert.equal(t.auditoria.entradas().at(-1).tipo, 'configuracion');

  // Misma configuración otra vez, o una más vieja: rechazada.
  await assert.rejects(t.salida.aplicarConfiguracion(configuracion), /ya tiene la 1/);
  // Firma inválida (o contenido cambiado después de firmar): rechazada y registrada.
  const cambiada = { ...configuracion, ninos: configuracion.ninos.map((n) => ({ ...n, consentimiento: 'vigente' })), numero: 2 };
  await assert.rejects(t.salida.aplicarConfiguracion(cambiada), /firma no es válida/);
  const otra = await generarLlaves();
  await assert.rejects(t.salida.aplicarConfiguracion(await firmar({ ...configuracion, numero: 3 }, otra.firma.privada)), /firma no es válida/);
  // Para otra tableta: rechazada.
  const ajena = (await prepararConfiguracion({ numero: 4, dispositivos: ['0'.repeat(32)], ninos: [] }, privadas)).configuracion;
  await assert.rejects(t.salida.aplicarConfiguracion(ajena), /no es para esta tableta/);
  assert.equal(t.auditoria.entradas().filter((e) => e.tipo === 'configuracion_rechazada').length, 4);
  assert.equal(t.ninos.rows()[1].consentimiento, 'suspendido', 'nada cambió');
});

test('la configuración no admite datos que identifiquen al niño', async () => {
  const base = { formato: FORMATO_CONFIGURACION, version: VERSION_LOTE, numero: 1, ninos: [{ codigo: 'a'.repeat(32), icono: 'rombo', color: 'rojo', edad_meses: 70, consentimiento: 'vigente', video: false, modo_fase: 'fase1' }] };
  assert.equal(verificarConfiguracion(base).ok, true);
  for (const campo of ['nombre', 'fecha_nacimiento', 'contacto', 'curp']) assert.match(verificarConfiguracion({ ...base, ninos: [{ ...base.ninos[0], [campo]: 'x' }] }).motivo, /no permitido/);
  await assert.rejects(prepararConfiguracion({ numero: 1, ninos: [{ edad_meses: 70, nombre: 'x' }] }, privadas), /no permitido/);
});

// ---------- Modo de estudio: ninguna descarga sin cifrar con datos de niños ----------

test('en modo de estudio, ninguna descarga sin cifrar lleva datos de niños (Arquitectura 9.2)', async () => {
  const { filtrarDescarga } = await import('../src/transporte/salida.js');
  const filas = [...exportar(historia.ensayos.slice(0, 20)), filaDemo, { ...filaDemo, sesion_id: 'EXP-1' }];
  assert.equal(filtrarDescarga(filas, false).length, filas.length, 'en el prototipo, todo');
  assert.deepEqual(filtrarDescarga(filas, true).map((r) => r.sesion_id), ['DEMO-abcd1234', 'EXP-1']);
  // Todas las descargas del registro y de una sesión pasan por ese filtro; la auditoría no se descarga.
  const fuente = (r) => readFileSync(new URL(`../src/${r}`, import.meta.url), 'utf8');
  const app = fuente('app.js');
  const bind = app.slice(app.indexOf('function bindRegistro'), app.indexOf('function bindSalida'));
  const llamadas = bind.match(/download\([^\n]*/g);
  assert.equal(llamadas.length, 6);
  for (const l of llamadas) assert.match(l, /\b(filas|deSesiones|entrada|indicadores)\b|auditoria\.entradas/, l);
  assert.match(bind, /else if \(tipo === 'auditoria'\) \{\n\s+if \(enEstudio\(\)\) return;/);
  assert.match(bind, /const filas = descargables\(log\.rows\(\)\);/);
  assert.match(app, /const descargables = \(rows\) => filtrarDescarga\(rows, enEstudio\(\)\);/);
  assert.match(app, /puedeDescargar: \(id\) => !enEstudio\(\) \|\| !esDeNino\(id\)/);
  const ses = fuente('sesiones.js');
  assert.match(ses, /if \(!descargable\(id\)\) return;/);
  assert.match(ses, /const descargable = \(id\) => enRegistro\(id\)\.length > 0 && \(ctx\.puedeDescargar\?\.\(id\) \?\? true\);/);
  // Las demás descargas de la aplicación no tienen datos de niños: F3 y revisión clínica.
  for (const f of ['f3.js', 'revision.js']) assert.ok(!/log\.rows|sesiones\.rows/.test(fuente(f)), f);
});

test('tools/importar.mjs: base en archivos, recibos, rechazo de un archivo cortado e importación idempotente', async () => {
  const { mkdtempSync, writeFileSync, readFileSync: leerArchivo, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { importarArchivos } = await import('../tools/importar.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'nbm-importar-'));
  try {
    const t = tableta();
    await t.salida.exportar();
    const lote = join(dir, 'lote.json');
    const cortado = join(dir, 'cortado.json');
    writeFileSync(lote, t.descargas[0].texto);
    writeFileSync(cortado, t.descargas[0].texto.slice(0, 5000));
    const llaves = join(dir, 'privadas.json');
    writeFileSync(llaves, JSON.stringify(privadas));
    const base = join(dir, 'base');
    const r1 = await importarArchivos({ llaves, base, archivos: [cortado, lote] });
    assert.equal(r1[0].ok, false);
    assert.equal(r1[1].ok, true);
    const antes = leerArchivo(join(base, 'base.json'), 'utf8');
    const recibo = JSON.parse(leerArchivo(r1[1].recibo, 'utf8'));
    const r2 = await importarArchivos({ llaves, base, archivos: [lote] });
    assert.equal(r2[0].repetido, true);
    assert.equal(leerArchivo(join(base, 'base.json'), 'utf8'), antes, 'la base no cambia');
    assert.deepEqual(JSON.parse(leerArchivo(r2[0].recibo, 'utf8')), recibo, 'el mismo recibo');
    assert.equal(leerArchivo(join(base, 'ensayos.csv'), 'utf8').trim().split('\n').length, historia.ensayos.length + 1);
    // El recibo, cargado en la tableta como archivo, borra los ensayos del lote.
    t.transporte.depositar(JSON.stringify(recibo));
    const [ap] = await t.salida.recibir();
    assert.equal(ap.borrados, historia.ensayos.length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('después del recibo no queda nada por exportar; una sesión que cambia vuelve a salir sola', async () => {
  const t = tableta();
  await t.salida.exportar();
  const { recibo } = await importarLote(baseVacia(), t.descargas[0].texto, LLAVES);
  await t.salida.aplicarRecibo(recibo);
  assert.deepEqual(t.salida.porExportar(), { ensayos: 0, sesiones: 0 });
  await assert.rejects(t.salida.exportar(), /No hay datos/);
  const id = historia.sesiones[1].sesion_id;
  t.sesiones.edit((all) => (all.find((s) => s.sesion_id === id).participacion = 4));
  assert.deepEqual(t.salida.porExportar(), { ensayos: 0, sesiones: 1 });
  const r = await t.salida.exportar();
  assert.equal(r.sesiones, 1);
});
