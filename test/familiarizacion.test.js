// Familiarización (tanda 4; Protocolo 3.2): el terapeuta prueba bandas de ACT-02 y ACT-07 y, al
// cerrar, fija la banda inicial de la fase 1, que queda en el padrón y en el registro de la sesión.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bandaDelModo, planDeSesion } from '../src/fases.js';
import { planNinoHTML, leerBandasPrueba } from '../src/plan-pantalla.js';
import { leerRegistros, faltantes, registrosHTML } from '../src/registros-terapeuta.js';
import { crearNino } from '../src/ninos.js';
import { SESION_COLUMNS } from '../src/engine/logger.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const config = JSON.parse(leer('fichas/sesion.json'));
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`fichas/${id}.json`))]));
const bandaInicial = ['ACT-02', 'ACT-07'].map((id) => ({ id, nombre: fichas[id].nombre, bandas: fichas[id].bandas.map((b) => b.id), actual: null }));

test('la familiarización empieza en la banda mínima y deja probar otra solo en ACT-02 y ACT-07', () => {
  assert.deepEqual(config.modos.familiarizacion.probarBandas, ['ACT-02', 'ACT-07']);
  assert.equal(bandaDelModo('familiarizacion', fichas['ACT-02'], {}, config), 'B1');
  assert.equal(bandaDelModo('familiarizacion', fichas['ACT-02'], {}, config, { 'ACT-02': 'B3' }), 'B3');
  assert.equal(bandaDelModo('familiarizacion', fichas['ACT-01'], {}, config, { 'ACT-01': 'B2' }), 'B1', 'ACT-01 no se prueba');
  assert.equal(bandaDelModo('familiarizacion', fichas['ACT-02'], {}, config, { 'ACT-02': 'B9' }), 'B1');
  // Fuera de la familiarización la banda de prueba no cuenta.
  assert.equal(bandaDelModo('fase1', fichas['ACT-02'], { 'ACT-02': 'B2' }, config, { 'ACT-02': 'B4' }), 'B2');
  const plan = planDeSesion({ modo: 'familiarizacion', fichas, config, bandasPrueba: { 'ACT-07': 'B2' } }).filter((p) => p.tipo === 'bloque');
  assert.deepEqual(plan.map((b) => `${b.actividad} ${b.banda}`), ['ACT-01 B1', 'ACT-02 B1', 'ACT-07 B2']);
  assert.deepEqual(leerBandasPrueba({ 'prueba-ACT-02': 'B2', 'prueba-ACT-07': '', participante: 'x' }), { 'ACT-02': 'B2' });
});

test('el inicio de la familiarización muestra las bandas para probar', () => {
  const nino = crearNino({ edad_meses: 70 });
  const html = planNinoHTML({ nino, config, fichas, bandasPrueba: { 'ACT-02': 'B3' } });
  assert.match(html, /name="prueba-ACT-02" data-probar>.*<option selected>B3<\/option>/s);
  assert.match(html, /name="prueba-ACT-07" data-probar>/);
  assert.match(html, /ACT-02 Pictograma e imagen: banda B3/);
  assert.doesNotMatch(planNinoHTML({ nino: { ...nino, modo_fase: 'fase1' }, config, fichas }), /data-probar/);
});

test('al cerrar, la banda inicial de cada actividad es obligatoria y se guarda', () => {
  const html = registrosHTML({ bandaInicial });
  assert.match(html, /Banda inicial para la fase 1/);
  assert.match(html, /name="banda-inicial-ACT-02"/);
  assert.match(html, /name="banda-inicial-ACT-07"/);
  assert.doesNotMatch(registrosHTML({}), /Banda inicial/);
  const sin = leerRegistros({ participacion: '3', no_marcados: '0', banda_inicial: { 'ACT-02': 'B2' } }, { bandaInicial });
  assert.deepEqual(sin.banda_inicial_fase1, { 'ACT-02': 'B2', 'ACT-07': null });
  assert.deepEqual(faltantes(sin, { bandaInicial }), ['Elige la banda inicial de ACT-07 para la fase 1.']);
  const con = leerRegistros({ participacion: '3', no_marcados: '0', banda_inicial: { 'ACT-02': 'B2', 'ACT-07': 'B1' } }, { bandaInicial });
  assert.deepEqual(faltantes(con, { bandaInicial }), []);
  assert.equal(leerRegistros({ participacion: '3' }, {}).banda_inicial_fase1, null, 'fuera de la familiarización no se pide');
});

test('la banda elegida va al padrón y a sesiones.csv; la regla queda como pendiente clínico', () => {
  assert.ok(SESION_COLUMNS.includes('banda_inicial_fase1'));
  const app = leer('src/app.js');
  assert.match(app, /for \(const \[a, b\] of elegidas\) n\.bandas = fijarBanda\(n\.bandas, state\.fichas\[a\], b\);/);
  assert.match(app, /bandasPrueba: leerBandasPrueba\(state\.form\)/);
  for (const id of ['ACT-02', 'ACT-07']) assert.ok(fichas[id].pendientesClinicos.some((p) => /banda inicial de la fase 1/.test(p)), id);
  const readme = leer('README.md');
  assert.match(readme, /\| `banda_inicial_fase1` \|/);
});
