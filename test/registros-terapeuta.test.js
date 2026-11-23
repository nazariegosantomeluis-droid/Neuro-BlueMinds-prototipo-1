// Registros del terapeuta al cerrar (tanda 3, H2.6; Arquitectura 8.4; Protocolo 5.4 y 8): una sola
// pantalla con participación, episodios, eventos adversos y, en la fase 3, las decisiones. Puede
// completarse después, pero la sesión queda incompleta hasta hacerlo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GRAVEDADES, RELACIONES, TIPOS_DECISION, episodiosMarcados, leerRegistros, faltantes, registrosHTML, eventoHTML, filaRegistros, registrosPendientes,
} from '../src/registros-terapeuta.js';
import { SESION_COLUMNS } from '../src/engine/logger.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const protocolo = { gravedades: ['leve', 'moderado', 'grave'], relaciones: ['no_relacionado', 'improbable', 'posible', 'probable'] };
const ordenes = [
  { hora: '2026-11-15T20:01:00.000Z', ms: 60000, accion: 'pausar', bloque: 1, ensayo: 4 },
  { hora: '2026-11-15T20:01:02.000Z', ms: 62000, accion: 'episodio_desregulacion', bloque: 1, ensayo: 4 },
  { hora: '2026-11-15T20:06:00.000Z', ms: 360000, accion: 'episodio_desregulacion', bloque: 2, ensayo: 9 },
];
const evento = { hora: '10:15', descripcion: 'Llanto al cambiar de actividad', actividad: 'ACT-07', banda: 'B2', duracion_min: '2', medidas: 'Pausa y apoyo verbal', gravedad: 'leve', relacion: 'posible' };

test('las categorías de gravedad, relación y decisión son las del Protocolo', () => {
  assert.deepEqual(Object.keys(GRAVEDADES), protocolo.gravedades);
  assert.deepEqual(Object.keys(RELACIONES), protocolo.relaciones);
  assert.deepEqual(TIPOS_DECISION, ['ajustar el objetivo', 'cambiar el material', 'cambiar el nivel de apoyo', 'cambiar la duración de la actividad', 'comentar con la familia', 'otra']);
});

test('los episodios marcados en el menú se confirman uno por uno; los no marcados se cuentan', () => {
  const marcados = episodiosMarcados(ordenes);
  assert.equal(marcados.length, 2);
  const reg = leerRegistros({ participacion: '4', confirmados: [1], no_marcados: '1', eventos: [] }, { marcados });
  assert.deepEqual(reg.episodios_confirmados.map((e) => e.confirmado), [false, true]);
  assert.equal(reg.episodios_confirmados[1].bloque, 2);
  assert.equal(reg.episodios_no_marcados, 1);
  assert.equal(reg.participacion, 4);
  assert.deepEqual(faltantes(reg, {}), []);
  // Fuera de la fase 3 no se guardan decisiones.
  assert.equal(reg.consulto_panel, null);
  assert.equal(reg.tipo_decision, null);
});

test('un evento adverso lleva hora, descripción, gravedad y relación; la descripción se recorta', () => {
  const reg = leerRegistros({ participacion: '3', no_marcados: '0', eventos: [evento, { descripcion: 'x'.repeat(300) }] }, {});
  assert.deepEqual(reg.eventos_adversos[0], { ...evento, duracion_min: 2 });
  assert.equal(reg.eventos_adversos[1].descripcion.length, 120);
  const f = faltantes(reg, {});
  assert.deepEqual(f, ['Evento adverso 2: elige la gravedad.', 'Evento adverso 2: elige la relación con la plataforma.', 'Evento adverso 2: anota la hora.']);
  assert.match(faltantes(leerRegistros({ no_marcados: '0' }, {}), {})[0], /participación/);
});

test('en la fase 3 se pide si consultó el panel y qué decisión informó', () => {
  const sin = leerRegistros({ participacion: '5', no_marcados: '0' }, { fase3: true });
  assert.equal(faltantes(sin, { fase3: true }).length, 2);
  const si = leerRegistros({ participacion: '5', no_marcados: '0', consulto_panel: 'si', decision: 'si' }, { fase3: true });
  assert.deepEqual(faltantes(si, { fase3: true }), ['Elige el tipo de decisión.']);
  const ok = leerRegistros({ participacion: '5', no_marcados: '0', consulto_panel: 'si', decision: 'si', tipo_decision: 'cambiar el material' }, { fase3: true });
  assert.deepEqual(faltantes(ok, { fase3: true }), []);
  assert.deepEqual([ok.consulto_panel, ok.decision_informada, ok.tipo_decision], [true, true, 'cambiar el material']);
  const no = leerRegistros({ participacion: '5', no_marcados: '0', consulto_panel: 'no', decision: 'no', tipo_decision: 'otra' }, { fase3: true });
  assert.equal(no.tipo_decision, null, 'sin decisión no hay tipo');
  // El formulario solo muestra esa parte en la fase 3.
  assert.match(registrosHTML({ fase3: true }), /¿Consultaste el panel\?/);
  assert.doesNotMatch(registrosHTML({}), /panel\?/);
});

test('una sola pantalla; «Completar después» deja la sesión incompleta', () => {
  const html = registrosHTML({ marcados: episodiosMarcados(ordenes), actividades: ['ACT-02', 'ACT-07'], bandas: ['B1', 'B2'] });
  assert.equal((html.match(/name="participacion"/g) ?? []).length, 5);
  assert.equal((html.match(/name="confirmado"/g) ?? []).length, 2);
  for (const id of ['agregar-evento', 'despues']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Guardar y terminar/);
  const ev = eventoHTML(0, { actividades: ['ACT-02'], bandas: ['B1'] });
  for (const k of ['hora', 'descripcion', 'actividad', 'banda', 'duracion', 'medidas', 'gravedad', 'relacion']) assert.match(ev, new RegExp(`name="ev-${k}-0"`), k);
  assert.match(ev, /Sin nombres ni datos personales/);
  // Lo guardado vuelve al formulario para completarlo después.
  const previo = filaRegistros(leerRegistros({ participacion: '2', no_marcados: '3', eventos: [evento] }, {}), { completos: false, hora: 'x' });
  const otra = registrosHTML({ previo, actividades: ['ACT-07'], bandas: ['B2'] });
  assert.match(otra, /value="2" checked/);
  assert.match(otra, /value="Llanto al cambiar de actividad"/);
  assert.equal(previo.registros_completos, false);
  assert.ok(registrosPendientes(previo));
  assert.ok(!registrosPendientes({}), 'una demostración no pide registros');
  assert.ok(!registrosPendientes(filaRegistros(previo, { completos: true, hora: 'y' })));
});

test('todo va al registro y «Sesiones» ofrece completar las incompletas', () => {
  for (const c of ['participacion', 'episodios_confirmados', 'episodios_no_marcados', 'eventos_adversos', 'consulto_panel', 'decision_informada', 'tipo_decision', 'registros_completos', 'registros_hora']) {
    assert.ok(SESION_COLUMNS.includes(c), c);
  }
  const app = leer('src/app.js');
  assert.match(app, /registros_completos: false,\n\s+plan_sesion/, 'la sesión con un niño nace incompleta');
  assert.match(app, /editSesion\(id, \(x\) => Object\.assign\(x, filaRegistros\(reg, \{ completos, hora: new Date\(\)\.toISOString\(\) \}\)\)\);/);
  assert.match(app, /completarRegistros: \(id\) => renderRegistros\(id, \{ volver: 'sesiones' \}\)/);
  const sesiones = leer('src/sesiones.js');
  assert.match(sesiones, /data-completar=/);
  assert.match(sesiones, /<span class="etiqueta incompleta">Incompleta<\/span>/);
  const readme = leer('README.md');
  for (const c of ['participacion', 'eventos_adversos', 'registros_completos']) assert.match(readme, new RegExp(`\\| \`${c}\` \\|`), `README: ${c}`);
});
