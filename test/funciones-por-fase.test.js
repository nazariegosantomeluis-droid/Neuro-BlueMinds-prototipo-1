// Decisión R16 (23 nov 2026): lo que ve el terapeuta en cada fase sigue la tabla de funciones del
// Protocolo (3.1: «El terapeuta ve los indicadores»: no en la familiarización, las fases 1 y 2 y el
// cierre; sí en la fase 3). Arquitectura 8.2 y 14 se corrigen para coincidir con ella.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { muestraIndicadores } from '../src/sesiones.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const config = JSON.parse(leer('fichas/sesion.json'));

// Protocolo 3.1, columna «El terapeuta ve los indicadores».
const VE_INDICADORES = { familiarizacion: false, fase1: false, fase2: false, fase3: true, cierre: false };

test('cada modo de fase sigue la tabla del Protocolo 3.1', () => {
  assert.deepEqual(Object.keys(config.modos).sort(), Object.keys(VE_INDICADORES).sort());
  for (const [modo, ve] of Object.entries(VE_INDICADORES)) {
    assert.equal(config.modos[modo].panel === 'completo', ve, `${modo}: panel`);
    assert.equal(muestraIndicadores(modo, config), ve, `${modo}: resumen de los bloques`);
  }
  assert.equal(muestraIndicadores(null, config), true, 'sin modo (demostración, modo experto): sin niño, resumen completo');
});

test('el cierre de la sesión y «Sesiones» no muestran aciertos, omisiones ni tiempos fuera de la fase 3', () => {
  const app = leer('src/app.js');
  assert.match(app, /const conIndicadores = muestraIndicadores\(modo, state\.sesion\);/);
  assert.match(app, /\$\{conIndicadores && b\.lineas\.length \?/);
  assert.match(app, /data-sin-indicadores/);
  const sesiones = leer('src/sesiones.js');
  assert.match(sesiones, /if \(ficha && muestraIndicadores\(sesion\.modo_fase, config\)\) lineas = lineasDeBloque/);
  assert.match(sesiones, /sesionHTML\(s, visibles\(s\.sesion_id\), state\.fichas, indice, state\.session\?\.id === s\.sesion_id, padron, state\.sesion, descargable\(s\.sesion_id\)\)/);
});

test('el panel: indicadores solo en la fase 3; en las demás, solo el resumen de la sesión', () => {
  const panel = leer('src/panel/panel.js');
  assert.match(panel, /const conIndicadores = \(modo, config\) => config\?\.modos\?\.\[modo\]\?\.panel === 'completo';/);
  assert.match(panel, /if \(!completo\) return `\$\{titulo\}\$\{frase\(plantillas, 'PNL-02'\)\}\$\{resumenHTML\(plantillas, r, false\)\}`;/);
});
