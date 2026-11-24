// Envolvente de seguridad (H4.3; Arquitectura 7.1 y 7.4) y huella de los parámetros (H4.5; INV-6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearEnvolvente, INVARIANTES, parametrosDeLaRegla, huellaDeParametros } from '../src/envolvente.js';
import { huellaDe } from '../src/huella.js';
import { contextoDeRegla, proponerVentana } from '../src/adaptacion.js';
import { PARAMETROS } from '../src/indicadores/parametros.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const BANDAS = ['B1', 'B2', 'B3', 'B4'];
const nueva = (extra = {}) => crearEnvolvente({ bandas: { 'ACT-02': BANDAS, 'ACT-07': BANDAS }, iniciales: { 'ACT-02': 'B2', 'ACT-07': 'B2' }, ...extra });
const sube = (env, ensayosValidos, extra = {}) => env.evaluar({ tipo: 'subir', actividad: 'ACT-02', hasta: BANDAS[BANDAS.indexOf(env.estado.bandas['ACT-02']) + 1], ensayosValidos, usoMs: 60000, ...extra });
const baja = (env, ensayosValidos, extra = {}) => env.evaluar({ tipo: 'bajar', actividad: 'ACT-02', hasta: BANDAS[BANDAS.indexOf(env.estado.bandas['ACT-02']) - 1], ensayosValidos, usoMs: 60000, ...extra });

// ---------- INV-6 (H4.5) ----------

test('la huella cubre los parámetros de la regla, de la señal, de la línea base y de la envolvente', () => {
  const p = parametrosDeLaRegla();
  assert.deepEqual(Object.keys(p).sort(), ['adaptacion', 'envolvente', 'lineaBase', 'regulacion', 'versiones']);
  const otra = structuredClone(p);
  otra.envolvente.subidasPorSesion = 5;
  assert.notEqual(huellaDe(otra), huellaDeParametros());
  assert.match(huellaDeParametros(), /^[0-9a-f]{64}$/);
});

test('INV-6: si un parámetro de la regla cambia a mitad de la sesión, la subida se bloquea', () => {
  const vigentes = structuredClone(parametrosDeLaRegla());
  const env = nueva({ parametros: () => vigentes });
  assert.equal(sube(env, 20).ejecutada, true, 'con los parámetros cargados, sube');
  vigentes.adaptacion.subirSiMayorDe = 0.6; // alguien cambia un umbral durante la sesión
  const r = sube(env, 40);
  assert.equal(r.ejecutada, false);
  assert.equal(r.invariante, 'INV-6');
  assert.equal(env.estado.bandas['ACT-02'], 'B3');
  // La bajada no la bloquea INV-6 (solo INV-5 e INV-7 bloquean una bajada).
  assert.equal(baja(env, 50).ejecutada, true);
  // Volver a los valores cargados vuelve a permitir subir (después de los 30 ensayos de INV-4).
  vigentes.adaptacion.subirSiMayorDe = PARAMETROS.adaptacion.subirSiMayorDe;
  assert.equal(sube(env, 80).ejecutada, true);
});

// ---------- Cada invariante ----------

test('INV-1: un nivel por vez y al menos 10 ensayos válidos entre cambios', () => {
  const env = nueva();
  assert.equal(env.evaluar({ tipo: 'subir', actividad: 'ACT-02', hasta: 'B4', ensayosValidos: 20 }).invariante, 'INV-1', 'saltar dos niveles');
  assert.equal(env.evaluar({ tipo: 'subir', actividad: 'ACT-02', hasta: 'B9', ensayosValidos: 20 }).invariante, 'INV-1', 'banda inexistente');
  assert.equal(sube(env, 20).ejecutada, true);
  assert.equal(sube(env, 29).invariante, 'INV-1', 'otro cambio en la misma ventana');
  assert.equal(sube(env, 30).ejecutada, true);
});

test('INV-2: después de una señal de regulación no sube en el resto de la sesión (en ninguna actividad)', () => {
  const env = nueva();
  env.evaluar({ tipo: 'pausa_y_bajar', actividad: 'ACT-07', hasta: 'B1', ensayosValidos: 10, senal: true });
  assert.equal(sube(env, 100).invariante, 'INV-2');
  const env2 = nueva();
  env2.terapeuta({ accion: 'episodio_desregulacion' });
  assert.equal(sube(env2, 100).invariante, 'INV-2', 'también con el episodio marcado por el terapeuta');
});

test('INV-3: no más de 4 subidas por sesión; las bajadas no se limitan', () => {
  const env = crearEnvolvente({ bandas: { A: BANDAS, B: BANDAS, C: BANDAS } });
  let n = 10;
  for (const a of ['A', 'B']) for (const h of ['B2', 'B3']) assert.equal(env.evaluar({ tipo: 'subir', actividad: a, hasta: h, ensayosValidos: (n += 10) }).ejecutada, true);
  const quinta = env.evaluar({ tipo: 'subir', actividad: 'C', hasta: 'B2', ensayosValidos: 100 });
  assert.equal(quinta.invariante, 'INV-3');
  for (let k = 0; k < 6; k++) env.evaluar({ tipo: 'bajar', actividad: 'A', hasta: BANDAS[Math.max(0, BANDAS.indexOf(env.estado.bandas.A) - 1)], ensayosValidos: 200 + k });
  assert.equal(env.estado.bandas.A, 'B1');
  assert.ok(env.estado.bloqueos.every((b) => b.tipo !== 'bajar'), 'ninguna bajada bloqueada');
});

test('INV-4: después de una bajada no sube antes de 30 ensayos válidos', () => {
  const env = nueva();
  assert.equal(baja(env, 10).ejecutada, true);
  assert.equal(sube(env, 39).invariante, 'INV-4');
  assert.equal(sube(env, 40).ejecutada, true);
});

test('INV-5: con la banda fijada por el terapeuta o la adaptación desactivada, nada automático la cambia; la pausa sigue', () => {
  const env = nueva();
  env.terapeuta({ accion: 'desactivar_adaptacion' });
  assert.equal(sube(env, 20).invariante, 'INV-5');
  assert.equal(baja(env, 30).invariante, 'INV-5', 'INV-5 sí bloquea una bajada');
  const p = env.evaluar({ tipo: 'pausa_y_bajar', actividad: 'ACT-02', hasta: 'B1', ensayosValidos: 40, senal: true });
  assert.equal(p.pausa, true, 'la pausa no se bloquea');
  assert.equal(p.invariante, 'INV-5');
  env.terapeuta({ accion: 'reactivar_adaptacion' });
  assert.equal(baja(env, 50).ejecutada, true);
  env.terapeuta({ accion: 'fijar_banda', detalle: { actividad: 'ACT-02', de: 'B1', a: 'B3' } });
  assert.equal(env.estado.bandas['ACT-02'], 'B3');
  assert.equal(baja(env, 60).invariante, 'INV-5');
  assert.equal(env.evaluar({ tipo: 'bajar', actividad: 'ACT-07', hasta: 'B1', ensayosValidos: 60 }).ejecutada, true, 'fijar una actividad no fija la otra');
});

test('INV-7: en los modos con dificultad fija ninguna acción cambia la banda; solo pausa', () => {
  for (const dificultad of ['fija', 'escalera', 'minima']) {
    const env = nueva({ dificultad, adaptacion: false });
    assert.equal(sube(env, 20).invariante, 'INV-7');
    assert.equal(baja(env, 20).invariante, 'INV-7');
    const p = env.evaluar({ tipo: 'pausa_y_bajar', actividad: 'ACT-02', hasta: 'B1', ensayosValidos: 30, senal: true });
    assert.equal(p.pausa, true);
    assert.equal(env.estado.bandas['ACT-02'], 'B2');
  }
});

test('INV-8: a los 15 minutos de uso no sube; la bajada sí', () => {
  const env = nueva();
  assert.equal(sube(env, 20, { usoMs: 15 * 60000 }).invariante, 'INV-8');
  assert.equal(baja(env, 30, { usoMs: 16 * 60000 }).ejecutada, true);
});

test('INV-9: una acción cuya evidencia incluye señales de alerta temprana no se ejecuta', () => {
  const env = nueva();
  assert.equal(sube(env, 20, { evidencia: { precision: 0.9, tau_rho: 0.6 } }).invariante, 'INV-9');
  assert.equal(baja(env, 20, { evidencia: { alerta_temprana: true } }).invariante, 'INV-9');
  // Ni la regla ni la envolvente importan el módulo de alerta temprana.
  for (const f of ['src/adaptacion.js', 'src/envolvente.js', 'src/menu-terapeuta.js']) assert.doesNotMatch(leer(f), /alerta\.js/, f);
});

test('a los 3 bloqueos en una sesión, aviso al terapeuta; cada bloqueo queda con su invariante', () => {
  const env = nueva({ dificultad: 'fija' });
  assert.equal(sube(env, 10).aviso, false);
  assert.equal(sube(env, 20).aviso, false);
  assert.equal(sube(env, 30).aviso, true);
  assert.deepEqual(env.estado.bloqueos.map((b) => b.invariante), ['INV-7', 'INV-7', 'INV-7']);
  assert.equal(Object.keys(INVARIANTES).length, 9);
});

test('«Anular el último cambio» revierte el último cambio de banda, sea de la regla o del terapeuta', () => {
  const env = nueva();
  sube(env, 20);
  assert.equal(env.estado.bandas['ACT-02'], 'B3');
  const anulado = env.terapeuta({ accion: 'anular_cambio_banda', ensayosValidos: 25 });
  assert.deepEqual([anulado.de, anulado.a, anulado.origen], ['B2', 'B3', 'regla']);
  assert.equal(env.estado.bandas['ACT-02'], 'B2');
  assert.equal(sube(env, 40).invariante, 'INV-4', 'la vuelta atrás cuenta como bajada para INV-4');
  assert.equal(env.terapeuta({ accion: 'anular_cambio_banda' }), null, 'nada más que anular');
  // Decisión R14: la subida anulada sigue contando para INV-3, y la decisión se cita en el código.
  assert.equal(env.estado.subidas, 1);
  const src = leer('src/envolvente.js');
  assert.match(src, /Decisión R14 \(23 nov 2026\): si la banda baja \(anular una subida\), cuenta como/);
  assert.match(src, /Decisión R14: la subida anulada sigue contando entre las 4 de INV-3/);
});

// ---------- Prueba por propiedades (H4.3) ----------

// Generador propio con semilla (xorshift32), distinto del de la aplicación.
function generador(semilla) {
  let x = semilla >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

// Revisa que la secuencia de decisiones de una sesión cumpla todos los invariantes.
function revisar(eventos, { dificultad }) {
  const E = PARAMETROS.envolvente;
  let subidas = 0;
  let senal = false;
  let inactiva = false;
  const fijadas = new Set();
  const ultimoCambio = {};
  const ultimaBajada = {};
  for (const ev of eventos) {
    if (ev.terapeuta) {
      const o = ev.terapeuta;
      if (o.accion === 'desactivar_adaptacion') inactiva = true;
      if (o.accion === 'reactivar_adaptacion') inactiva = false;
      if (o.accion === 'episodio_desregulacion') senal = true;
      if (o.accion === 'fijar_banda') fijadas.add(o.detalle.actividad);
      if (o.accion === 'anular_cambio_banda' && ev.bajo) ultimaBajada[ev.actividad] = o.ensayosValidos;
      continue;
    }
    const { a, r, alterada } = ev;
    if (a.senal) senal = true;
    if (a.tipo === 'pausa' || a.tipo === 'pausa_y_bajar') assert.equal(r.pausa, true, 'una pausa nunca se bloquea');
    const cambio = r.ejecutada && r.banda !== r.desde;
    const bien = BANDAS.indexOf(a.hasta) - BANDAS.indexOf(r.desde) === (a.tipo === 'subir' ? 1 : -1) && !a.evidencia?.tau_rho;
    if (!r.ejecutada && bien && r.desde !== a.hasta && a.tipo !== 'subir' && a.tipo !== 'mantener') {
      assert.ok(['INV-5', 'INV-7'].includes(r.invariante), `una bajada solo la bloquean INV-5 e INV-7, no ${r.invariante}`);
    }
    if (!cambio) continue;
    const de = BANDAS.indexOf(r.desde);
    const a2 = BANDAS.indexOf(r.banda);
    assert.equal(Math.abs(a2 - de), 1, 'INV-1: un nivel por vez');
    if (ultimoCambio[a.actividad] !== undefined && a2 > de) assert.ok(a.ensayosValidos - ultimoCambio[a.actividad] >= E.ensayosEntreCambios, 'INV-1: una ventana entre cambios');
    assert.ok(!fijadas.has(a.actividad) && !inactiva, 'INV-5');
    assert.ok(!['fija', 'escalera', 'minima'].includes(dificultad), 'INV-7');
    assert.ok(!a.evidencia?.tau_rho, 'INV-9');
    if (a2 > de) {
      subidas++;
      assert.ok(!senal, 'INV-2');
      assert.ok(subidas <= E.subidasPorSesion, 'INV-3');
      if (ultimaBajada[a.actividad] !== undefined) assert.ok(a.ensayosValidos - ultimaBajada[a.actividad] >= E.ensayosTrasBajada, 'INV-4: ningún ciclo de bajada y subida en menos de 30 ensayos');
      assert.ok(a.usoMs < E.limiteMinutos * 60000, 'INV-8');
      assert.ok(!alterada, 'INV-6');
    } else {
      ultimaBajada[a.actividad] = a.ensayosValidos;
    }
    ultimoCambio[a.actividad] = a.ensayosValidos;
  }
}

// Una sesión simulada: acciones al azar, con ruido y con patrones extremos (propuestas que la regla
// no produce, órdenes del terapeuta, parámetros alterados, sesiones largas).
function simularSesion(u) {
  const dificultades = ['adaptativa', 'adaptativa', 'adaptativa', 'fija', 'escalera'];
  const dificultad = dificultades[Math.floor(u() * dificultades.length)];
  const vigentes = { ...parametrosDeLaRegla(), adaptacion: { ...PARAMETROS.adaptacion } };
  const env = crearEnvolvente({ bandas: { 'ACT-02': BANDAS, 'ACT-07': BANDAS }, iniciales: { 'ACT-02': BANDAS[Math.floor(u() * 4)], 'ACT-07': BANDAS[Math.floor(u() * 4)] }, dificultad, adaptacion: dificultad === 'adaptativa', parametros: () => vigentes });
  const patron = Math.floor(u() * 4); // 0 azar, 1 siempre sube, 2 alterna sube y baja, 3 extremos
  const eventos = [];
  const validos = { 'ACT-02': 0, 'ACT-07': 0 };
  let usoMs = 0;
  let alterada = false;
  const n = 4 + Math.floor(u() * 14);
  for (let k = 0; k < n; k++) {
    const actividad = u() < 0.5 ? 'ACT-02' : 'ACT-07';
    validos[actividad] += patron === 3 ? 1 + Math.floor(u() * 40) : 10;
    usoMs += 30000 + u() * 90000;
    const z = u();
    if (z < 0.06) {
      const acciones = ['desactivar_adaptacion', 'reactivar_adaptacion', 'episodio_desregulacion', 'fijar_banda', 'anular_cambio_banda'];
      const accion = acciones[Math.floor(u() * acciones.length)];
      const orden = { accion, ensayosValidos: validos[actividad], detalle: accion === 'fijar_banda' ? { actividad, a: BANDAS[Math.floor(u() * 4)] } : null };
      const antes = { ...env.estado.bandas };
      const anulado = env.terapeuta(orden);
      eventos.push({ terapeuta: orden, actividad: anulado?.actividad ?? actividad, bajo: anulado ? BANDAS.indexOf(env.estado.bandas[anulado.actividad]) < BANDAS.indexOf(antes[anulado.actividad]) : false });
      continue;
    }
    if (z < 0.08 && dificultad === 'adaptativa') {
      vigentes.adaptacion = { ...vigentes.adaptacion, subirSiMayorDe: u() };
      alterada = huellaDe(vigentes) !== env.huellaInicial;
    }
    const actual = env.estado.bandas[actividad];
    const i = BANDAS.indexOf(actual);
    let tipo;
    if (patron === 1) tipo = 'subir';
    else if (patron === 2) tipo = k % 2 ? 'bajar' : 'subir';
    else tipo = ['subir', 'bajar', 'mantener', 'pausa_y_bajar', 'pausa'][Math.floor(u() * 5)];
    let hasta = tipo === 'subir' ? BANDAS[Math.min(3, i + 1)] : tipo === 'mantener' || tipo === 'pausa' ? actual : BANDAS[Math.max(0, i - 1)];
    const evidencia = { precision: u() };
    if (patron === 3) {
      if (u() < 0.1) hasta = BANDAS[Math.floor(u() * 4)]; // saltos de varios niveles
      if (u() < 0.05) evidencia.tau_rho = u(); // evidencia con alerta temprana
      if (u() < 0.1) usoMs += 10 * 60000; // pasa de los 15 minutos
    }
    const a = { tipo, actividad, hasta, ensayosValidos: validos[actividad], usoMs, senal: tipo === 'pausa_y_bajar', evidencia };
    eventos.push({ a, r: env.evaluar(a), alterada });
  }
  return { eventos, dificultad };
}

test('propiedades: 1 millón de sesiones simuladas (azar, ruido y extremos) sin ninguna violación de INV-1 a INV-9', () => {
  const u = generador(20261124);
  let acciones = 0;
  let ejecutadas = 0;
  for (let s = 0; s < 1_000_000; s++) {
    const { eventos, dificultad } = simularSesion(u);
    revisar(eventos, { dificultad });
    acciones += eventos.length;
    ejecutadas += eventos.filter((e) => e.r?.ejecutada && e.r.banda !== e.r.desde).length;
  }
  assert.ok(acciones > 5_000_000, `pocas acciones: ${acciones}`);
  assert.ok(ejecutadas > 500_000, 'la envolvente también deja pasar cambios');
});

// Con la regla real (C8): ventanas de 10 ensayos de niños simulados (al azar, que siempre aciertan,
// que fallan todo, que alternan y con muchas omisiones) pasan por la regla y la envolvente.
test('propiedades con la regla de adaptación real: 20 000 sesiones sin violaciones ni ciclos en menos de 30 ensayos', () => {
  const u = generador(7);
  for (let s = 0; s < 20_000; s++) {
    const env = nueva();
    const ctx = contextoDeRegla({ bandas: BANDAS, estado: { sinSubir: false } });
    const tipoNino = s % 5;
    const eventos = [];
    let ensayo = 0;
    for (let w = 0; w < 10; w++) {
      const banda = env.estado.bandas['ACT-02'];
      const p = tipoNino === 0 ? u() : tipoNino === 1 ? 1 : tipoNino === 2 ? 0 : w % 2 ? 1 : 0.4;
      const v = Array.from({ length: 10 }, () => {
        ensayo++;
        const omision = tipoNino === 4 && u() < 0.35;
        return { actividad: 'ACT-02', bloque: 1, ensayo, banda, acierto: !omision && u() < p, omision, anticipatoria: false, interrumpido: false, perdida_foco: false, fallo_tecnico: false, sonda: false };
      });
      const prop = proponerVentana(v, w, ctx);
      const a = { tipo: prop.accion, actividad: 'ACT-02', hasta: prop.banda_propuesta, ensayosValidos: ensayo, usoMs: ensayo * 4000, senal: Boolean(prop.senal), evidencia: { precision: prop.precision } };
      eventos.push({ a, r: env.evaluar(a) });
    }
    revisar(eventos, { dificultad: 'adaptativa' });
  }
});

// ---------- Conexión con la aplicación (Arquitectura 7.1) ----------

test('app.js: cada propuesta pasa por la envolvente; el menú la desactiva, fija la banda y anula el último cambio', () => {
  const app = leer('src/app.js');
  assert.match(app, /s\.envolvente = crearEnvolvente\(\{/);
  assert.match(app, /huella_parametros: s\.envolvente\.huellaInicial,/);
  assert.match(app, /const res = s\.envolvente\.evaluar\(accion\);/);
  assert.match(app, /env\.terapeuta\(\{ \.\.\.res\.orden, ensayosValidos \}\);/);
  assert.match(app, /if \(env && res\.orden && !res\.orden\.bloqueada\)/);
  assert.match(app, /cambios: env \? env\.estado\.cambios : \(s\.cambiosBanda \?\? \[\]\)/);
  // El bloque siguiente (o el resto del bloque partido) usa la banda de la envolvente.
  assert.match(app, /const objetivo = s\.envolvente\?\.estado\.bandas\[paso\.actividad\] \?\? s\.bandaFijada\?\.\[paso\.actividad\];/);
  // La pausa se ofrece aunque la bajada se bloquee.
  assert.match(app, /if \(res\.pausa && \(await atenderPausa\(PAUSA_OFRECIDA_MSG\)\) === 'terminar'\) return true;/);
});
