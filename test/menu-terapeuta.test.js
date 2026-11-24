// Menú del terapeuta (tanda 3, H2.4): pulsación prolongada en la esquina; cada acción con dos
// toques como máximo, y cada orden en el registro con su hora y el estado de la sesión.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearMenu, TOQUES, PULSACION_MS, bloqueoDe, ordenRegistro, menuHTML, mantenerPulsado } from '../src/menu-terapeuta.js';
import { MOTIVOS_TERMINACION } from '../src/terminacion.js';
import { SESION_COLUMNS } from '../src/engine/logger.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const config = JSON.parse(leer('fichas/sesion.json'));
const BANDAS = ['B1', 'B2', 'B3', 'B4'];
const contexto = (modo) => ({ modo, config, actividad: 'ACT-02', banda: 'B2', adaptacion: modo === 'fase3' });

// Cuenta los toques de una secuencia hasta que el menú devuelve lo que se buscaba.
function toques(menu, secuencia) {
  let ultimo = null;
  for (const [control, valor] of secuencia) ultimo = menu.tocar(control, valor);
  return { n: menu.estado.toques, ultimo };
}

test('cada acción se hace con dos toques como máximo desde el menú abierto', () => {
  assert.ok(Object.values(TOQUES).every((n) => n <= 2));
  const casos = {
    reanudar: [['continuar']],
    terminar_bloque: [['motivo', MOTIVOS_TERMINACION[0]], ['terminar-bloque']],
    terminar_sesion: [['motivo', 'Decisión clínica'], ['terminar-sesion']],
    fijar_banda: [['banda', 'B3']],
    desactivar_adaptacion: [['adaptacion']],
    episodio_desregulacion: [['episodio']],
  };
  for (const [accion, secuencia] of Object.entries(casos)) {
    const { n, ultimo } = toques(crearMenu(contexto('fase3')), secuencia);
    assert.equal(ultimo.orden.accion, accion);
    assert.equal(n, TOQUES[accion], accion);
  }
  // Anular: un toque, después de un cambio de banda.
  const menu = crearMenu(contexto('fase3'));
  menu.tocar('banda', 'B4');
  const r = menu.tocar('anular');
  assert.deepEqual(r.orden, { accion: 'anular_cambio_banda', detalle: { actividad: 'ACT-02', de: 'B2', a: 'B4' }, bloqueada: null });
  assert.equal(menu.estado.banda, 'B2');
  assert.equal(menu.estado.toques - 1, TOQUES.anular_cambio_banda);
  // Reactivar la adaptación también es un toque.
  assert.equal(menu.tocar('adaptacion').orden.accion, 'desactivar_adaptacion');
  assert.equal(menu.tocar('adaptacion').orden.accion, 'reactivar_adaptacion');
});

test('terminar pide el motivo; reanudar y terminar cierran el menú con su alcance', () => {
  const menu = crearMenu(contexto('fase1'));
  assert.equal(menu.tocar('terminar-sesion').cerrar, undefined);
  menu.tocar('motivo', 'Cansancio o falta de interés');
  assert.deepEqual(menu.tocar('terminar-sesion').cerrar, { accion: 'terminar', alcance: 'sesion', motivo: 'Cansancio o falta de interés' });
  assert.deepEqual(crearMenu(contexto('fase1')).tocar('continuar').cerrar, { accion: 'continuar' });
  // Un motivo que no está en la lista no cuenta.
  const otro = crearMenu(contexto('fase1'));
  otro.tocar('motivo', 'otra cosa');
  assert.equal(otro.tocar('terminar-bloque').cerrar, undefined);
});

test('INV-7: en los modos con dificultad fija la banda y la adaptación no cambian; la orden queda bloqueada', () => {
  for (const modo of ['fase1', 'fase2', 'cierre']) {
    const menu = crearMenu(contexto(modo));
    const r = menu.tocar('banda', 'B4');
    assert.equal(r.orden.bloqueada, 'INV-7', modo);
    assert.match(r.mensaje, /INV-7/);
    assert.equal(menu.estado.banda, 'B2', `${modo}: la banda no cambió`);
    assert.equal(menu.tocar('adaptacion').orden.bloqueada, 'INV-7');
    assert.equal(menu.estado.adaptacion, false);
  }
  // En la fase 3 y la familiarización sí se puede; también en la demostración, sin modo.
  for (const modo of ['fase3', null]) assert.equal(bloqueoDe('fijar_banda', modo, config), null, String(modo));
  // En la familiarización la banda la mueve la escalera (decisión R6): tampoco se fija a mano.
  assert.equal(bloqueoDe('fijar_banda', 'familiarizacion', config), 'INV-7');
  // Pausar, reanudar, terminar y marcar un episodio nunca se bloquean.
  for (const accion of ['pausar', 'reanudar', 'terminar_bloque', 'terminar_sesion', 'episodio_desregulacion']) assert.equal(bloqueoDe(accion, 'fase1', config), null, accion);
});

test('cada orden del registro lleva la hora y el estado de la sesión', () => {
  const o = ordenRegistro({ accion: 'episodio_desregulacion' }, { hora: '2026-11-15T20:00:00.000Z', ms: 61234.5, bloque: 2, ensayo: 7, modo: 'fase1', banda: 'B2', adaptacion: false });
  assert.deepEqual(o, { hora: '2026-11-15T20:00:00.000Z', ms: 61234.5, accion: 'episodio_desregulacion', detalle: null, bloqueada: null, bloque: 2, ensayo: 7, modo: 'fase1', banda: 'B2', adaptacion: false, propuestas_previas: null, ensayos_validos: null, actividad: null });
  assert.deepEqual(ordenRegistro({ accion: 'desactivar_adaptacion' }, { propuestas_previas: 3 }).propuestas_previas, 3, 'para reproducir la sesión (Arquitectura 10.2)');
  assert.ok(SESION_COLUMNS.includes('ordenes_terapeuta'));
  const app = leer('src/app.js');
  assert.match(app, /registrar\(\{ accion: 'pausar' \}\);/, 'abrir el menú es una orden de pausar');
  assert.match(app, /r\.ordenes_terapeuta = \[\n\s+\.\.\.\(r\.ordenes_terapeuta \?\? \[\]\),\n\s+ordenRegistro\(orden, \{/);
});

test('el menú tiene un control por acción y se abre con una pulsación prolongada', () => {
  const html = menuHTML({ bandas: BANDAS, banda: 'B2', adaptacion: true, hayCambios: false, uso: '3 min 05 s' });
  for (const control of ['continuar', 'episodio', 'terminar-bloque', 'terminar-sesion', 'adaptacion', 'anular']) assert.match(html, new RegExp(`data-menu="${control}"`), control);
  assert.equal((html.match(/name="menu-motivo"/g) ?? []).length, MOTIVOS_TERMINACION.length);
  assert.equal((html.match(/name="menu-banda"/g) ?? []).length, 4);
  assert.match(html, /data-menu="anular" disabled/);
  assert.doesNotMatch(menuHTML({ donde: 'referencia' }), /terminar-bloque|menu-banda/);
  assert.doesNotMatch(menuHTML({ donde: 'rutina' }), /terminar-bloque/);
  assert.match(menuHTML({ aviso: 'Se llegaron a los 15 minutos' }), /role="alert">Se llegaron a los 15 minutos/);
  assert.ok(PULSACION_MS >= 500 && PULSACION_MS <= 1500);
  const app = leer('src/app.js');
  assert.match(app, /mantenerPulsado\(wrap\.querySelector\('#pausa'\), \(\) => block\.pause\(\)\);/);
  assert.match(app, /mantenerPulsado\(wrap\.querySelector\('#pausa'\), \(\) => ref\.pause\(\)\);/);
  assert.doesNotMatch(app, /twoTaps\(wrap\.querySelector\('#pausa'\)/, 'la pausa ya no es con dos toques');
});

test('la pulsación prolongada solo abre el menú si el dedo se queda el tiempo completo', async () => {
  const eventos = {};
  const boton = { classList: { add() {}, remove() {} }, addEventListener: (ev, fn) => (eventos[ev] = fn) };
  let abierto = 0;
  mantenerPulsado(boton, () => abierto++, 30);
  const ev = { preventDefault() {}, stopPropagation() {} };
  eventos.pointerdown(ev);
  eventos.pointerup(ev); // se soltó antes
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(abierto, 0);
  eventos.pointerdown(ev);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(abierto, 1);
});
