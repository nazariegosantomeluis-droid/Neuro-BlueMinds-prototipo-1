// Regla de adaptación (tanda 5, H4.1; Modelo 9.1; Arquitectura 7.2) y señal de regulación (H4.2;
// Arquitectura 7.3). Cada rama con ventanas construidas a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ventanas, percentil, lineaBaseRegulacion, senalEnVentana, proponer, ordenDeMalestar, contextoDeRegla, proponerVentana } from '../src/adaptacion.js';
import { PARAMETROS } from '../src/indicadores/parametros.js';
import { filas, omision, errorCon } from '../tools/filas-prueba.mjs';

const BANDAS = ['B1', 'B2', 'B3', 'B4'];
// Una ventana de 10 ensayos con «aciertos» aciertos (los errores al final) y los cambios dados.
const ventana = (aciertos, extra = () => ({})) => filas(10, (k) => ({ ...(k > aciertos ? errorCon() : {}), ...extra(k) }));
// Varias ventanas seguidas, numeradas de 1 en adelante, en la banda dada.
const bloque = (ws, banda = 'B2') => ws.flat().map((r, i) => ({ ...r, ensayo: i + 1, banda }));
const acciones = (ps) => ps.map((p) => p.accion);

test('ventanas de 10 ensayos válidos; las interrupciones técnicas no cuentan y la última incompleta tampoco', () => {
  const rows = filas(25, (k) => (k === 3 ? { interrumpido: true } : {}));
  const vs = ventanas(rows);
  assert.equal(vs.length, 2);
  assert.deepEqual(vs[0].map((r) => r.ensayo), [1, 2, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(PARAMETROS.adaptacion.ventana, 10);
});

test('sube con dos ventanas consecutivas sobre 0.85; la cuenta empieza de nuevo tras proponer el cambio', () => {
  // 9/10 = 0.9 en cuatro ventanas: ventana 1 mantiene (1 de 2), 2 sube, 3 mantiene (cuenta nueva), 4 sube.
  const ps = proponer(bloque([ventana(9), ventana(9), ventana(9), ventana(9)]), { bandas: BANDAS });
  assert.deepEqual(acciones(ps), ['mantener', 'subir', 'mantener', 'subir']);
  assert.equal(ps[0].motivo, 'ventana 1 de 2 sobre 0.85');
  assert.deepEqual([ps[1].banda_actual, ps[1].banda_propuesta], ['B2', 'B3']);
  assert.deepEqual(ps[1].ensayos, [11, 20]);
  assert.equal(ps[1].precision, 0.9);
  assert.match(ps[1].regla, /mayor de 0\.85 en 2 ventanas consecutivas/);
  // 0.9, 0.8, 0.9: no son consecutivas, no sube.
  assert.deepEqual(acciones(proponer(bloque([ventana(9), ventana(8), ventana(9)]), { bandas: BANDAS })), ['mantener', 'mantener', 'mantener']);
  // Exactamente 0.85 no es mayor de 0.85: 0.85 no se puede con 10 ensayos; 8.5 no existe. 1.0 sí sube.
  assert.deepEqual(acciones(proponer(bloque([ventana(10), ventana(10)]), { bandas: BANDAS })), ['mantener', 'subir']);
});

test('mantiene entre 0.70 y 0.85 y baja con menos de 0.70 en una sola ventana', () => {
  // 0.7 y 0.8 mantienen (0.70 no es menor de 0.70); 0.6 baja.
  const ps = proponer(bloque([ventana(7), ventana(8), ventana(6)]), { bandas: BANDAS });
  assert.deepEqual(acciones(ps), ['mantener', 'mantener', 'bajar']);
  assert.deepEqual([ps[2].banda_actual, ps[2].banda_propuesta], ['B2', 'B1']);
});

test('en los extremos no hay banda a la cual moverse', () => {
  const arriba = proponer(bloque([ventana(10), ventana(10)], 'B4'), { bandas: BANDAS });
  assert.deepEqual([arriba[1].accion, arriba[1].banda_propuesta, arriba[1].motivo], ['mantener', 'B4', 'ya está en la banda más alta']);
  const abajo = proponer(bloque([ventana(5)], 'B1'), { bandas: BANDAS });
  assert.deepEqual([abajo[0].accion, abajo[0].banda_propuesta, abajo[0].motivo], ['bajar', 'B1', 'ya está en la banda más baja']);
});

test('señal sin línea base: 3 omisiones o 3 prematuras en la ventana; después no se sube en la sesión', () => {
  // Ventana 1: 7 aciertos y 3 omisiones (precisión 0.7) → señal por omisiones: pausa y bajar.
  // Ventanas 2 y 3: 0.9 → mantener, porque tras la señal no se sube en el resto de la sesión.
  const estado = { sinSubir: false };
  const ps = proponer(bloque([ventana(7, (k) => (k > 7 ? omision : {})), ventana(9), ventana(9)]), { bandas: BANDAS, estado });
  assert.deepEqual(acciones(ps), ['pausa_y_bajar', 'mantener', 'mantener']);
  assert.deepEqual([ps[0].senal, ps[0].criterio_senal, ps[0].banda_propuesta], ['omisiones', 'sin_linea_base', 'B1']);
  assert.equal(ps[2].motivo, 'después de una señal de regulación no se sube en esta sesión');
  assert.equal(estado.sinSubir, true);
  // El estado pasa al bloque siguiente de la misma sesión.
  assert.deepEqual(acciones(proponer(bloque([ventana(10), ventana(10)]), { bandas: BANDAS, estado })), ['mantener', 'mantener']);
  // 2 prematuras no son señal; 3 sí.
  assert.equal(senalEnVentana(ventana(10, (k) => (k <= 2 ? { anticipatoria: true } : {})), null), null);
  assert.equal(senalEnVentana(ventana(10, (k) => (k <= 3 ? { anticipatoria: true } : {})), null), 'prematuras');
});

test('señal con línea base: supera el percentil 90 de las ventanas de 5 sesiones válidas de la fase 1', () => {
  // Percentil de tipo 7 a mano: x = 1, 2, 3, 4; h = 3·0.9 = 2.7; x(3) + 0.7·(x(4) − x(3)) = 3.7.
  assert.equal(percentil([4, 1, 3, 2], 0.9), 3.7);
  // 5 sesiones de 30 ensayos (15 ventanas). Omisiones por ventana: 10 ventanas con 0, 3 con 1, una
  // con 2 y una con 3 → proporciones ordenadas 0 (×10), 0.1, 0.1, 0.1, 0.2, 0.3; h = 14·0.9 = 12.6;
  // p90 = 0.1 + 0.6·(0.2 − 0.1) = 0.16. Sin prematuras: p90 = 0.
  const omisionesPorVentana = [0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 3, 0, 0];
  const historial = Array.from({ length: 5 }, (_, s) =>
    [0, 1, 2].flatMap((w) => ventana(10, (k) => (k <= omisionesPorVentana[s * 3 + w] ? omision : {})).map((r) => ({ ...r, sesion_id: `F${s + 1}`, modo_fase: 'fase1' }))),
  ).flat();
  const base = lineaBaseRegulacion(historial);
  assert.deepEqual(base.sesiones, ['F1', 'F2', 'F3', 'F4', 'F5']);
  assert.equal(base.ventanas, 15);
  assert.ok(Math.abs(base.omisiones - 0.16) < 1e-12);
  assert.equal(base.prematuras, 0);
  // Hoy: 2 omisiones (0.2 > 0.16) es señal; 1 (0.1) no. Una prematura (0.1 > 0) sí.
  assert.equal(senalEnVentana(ventana(10, (k) => (k <= 2 ? omision : {})), base), 'omisiones');
  assert.equal(senalEnVentana(ventana(10, (k) => (k <= 1 ? omision : {})), base), null);
  assert.equal(senalEnVentana(ventana(10, (k) => (k <= 1 ? { anticipatoria: true } : {})), base), 'prematuras');
  assert.equal(proponer(bloque([ventana(9, (k) => (k === 10 ? omision : {}))]), { bandas: BANDAS, base })[0].criterio_senal, 'linea_base');
  // Con 4 sesiones válidas no hay línea base (D3: 5). Una sesión con calidad baja no es válida.
  assert.equal(lineaBaseRegulacion(historial.filter((r) => r.sesion_id !== 'F5')), null);
  assert.equal(lineaBaseRegulacion(historial.map((r) => (r.sesion_id === 'F2' ? { ...r, peso_calidad: 0.5 } : r))), null);
});

test('un episodio marcado o terminar por malestar es señal en cualquier caso', () => {
  assert.ok(ordenDeMalestar({ accion: 'episodio_desregulacion' }));
  assert.ok(ordenDeMalestar({ accion: 'terminar_bloque', detalle: 'Desregulación o malestar del niño' }));
  assert.ok(!ordenDeMalestar({ accion: 'terminar_bloque', detalle: 'Fallo técnico' }));
  const ps = proponer(bloque([ventana(9), ventana(9)]), { bandas: BANDAS, ordenes: [{ accion: 'episodio_desregulacion', bloque: 1, ensayo: 5 }] });
  assert.deepEqual(acciones(ps), ['pausa_y_bajar', 'mantener']);
  assert.equal(ps[0].senal, 'terapeuta');
  // Terminar por malestar después de la última ventana completa: propuesta sin ventana.
  const fin = proponer(bloque([ventana(9), ventana(9, () => ({}))]).slice(0, 15), { bandas: BANDAS, ordenes: [{ accion: 'terminar_bloque', detalle: 'Desregulación o malestar del niño', bloque: 1, ensayo: 15 }] });
  assert.deepEqual(fin.map((p) => [p.ventana, p.accion]), [[1, 'mantener'], [null, 'pausa_y_bajar']]);
});

test('la regla solo propone (ejecutada: false); la ejecución la decide la envolvente en app.js', () => {
  const ps = proponer(bloque([ventana(10), ventana(10), ventana(4)]), { bandas: BANDAS });
  assert.ok(ps.every((p) => p.ejecutada === false && p.version_regla === '0.2.0'));
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  // Cada propuesta pasa por s.envolvente.evaluar y queda en el registro con ejecutada e invariante.
  assert.match(app, /const res = s\.envolvente\.evaluar\(accion\);/);
  assert.match(app, /ejecutada: res\.ejecutada,\n\s+invariante: res\.invariante,/);
  assert.match(app, /adaptacion_propuestas: \[\.\.\.\(r\.adaptacion_propuestas \?\? \[\]\), registro\]/);
  // La regla no cambia la banda: solo la envolvente (estado.bandas) la cambia.
  const regla = readFileSync(new URL('../src/adaptacion.js', import.meta.url), 'utf8');
  assert.doesNotMatch(regla, /estado\.bandas|\.banda =/);
  const sesion = JSON.parse(readFileSync(new URL('../fichas/sesion.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.entries(sesion.modos).filter(([, m]) => m.adaptacion).map(([k]) => k), ['fase3']);
});

test('proponerVentana, ventana a ventana, da lo mismo que proponer con el bloque entero', () => {
  const rows = bloque([ventana(10), ventana(10), ventana(4), ventana(9), ventana(9)]);
  const ctx = contextoDeRegla({ bandas: BANDAS });
  const enLinea = ventanas(rows).map((v, k) => proponerVentana(v, k, ctx));
  assert.deepEqual(enLinea, proponer(rows, { bandas: BANDAS }));
});
