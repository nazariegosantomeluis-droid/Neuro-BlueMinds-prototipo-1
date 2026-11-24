// Familiarización (decisión R6, 23 nov 2026; Protocolo 3.1, 3.2 y 4): ACT-01 en la banda mínima y,
// después, ACT-02 y ACT-07 por una escalera desde B1, 10 ensayos por banda; sube con 8 o más
// aciertos de 10 y se detiene en la primera banda no aprobada. La banda inicial de la fase 1 es la
// última aprobada (B1 si ninguna); el terapeuta la confirma o la cambia con un motivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planDeSesion, bandaAprobada, bandaPropuesta, siguePorEscalera, decidirPaso } from '../src/fases.js';
import { planNinoHTML } from '../src/plan-pantalla.js';
import { leerRegistros, faltantes, registrosHTML, AVISO_INCLUSION } from '../src/registros-terapeuta.js';
import { binomialCDF } from '../src/indicadores/estadistica.js';
import { crearNino } from '../src/ninos.js';
import { SESION_COLUMNS } from '../src/engine/logger.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const config = JSON.parse(leer('fichas/sesion.json'));
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`fichas/${id}.json`))]));
const E = config.modos.familiarizacion.escalera;
const BANDAS = ['B1', 'B2', 'B3', 'B4'];

test('los parámetros de la escalera son los de la decisión R6', () => {
  assert.deepEqual(E.actividades, ['ACT-02', 'ACT-07']);
  assert.equal(E.ensayosPorBanda, 10);
  assert.equal(E.aciertosParaSubir, 8);
  assert.match(E.seccion, /Decisión R6, 23 nov 2026/);
  assert.equal(config.modos.familiarizacion.minimoEnsayosACT01.valor, 10);
  assert.equal(config.modalidadFueraDeFase2['ACT-02'], 'AV');
  assert.match(config.origen.modalidadFueraDeFase2, /Decisión R2, 23 nov 2026/);
  assert.match(config.origen.rutinaInicioMs, /Decisión R10, 23 nov 2026/);
  assert.ok(!config.pendientes.some((p) => /familiarización|rutina|modalidad de ACT/.test(p)), 'ya no son pendientes');
  for (const id of ['ACT-02', 'ACT-07']) assert.ok(!(fichas[id].pendientesClinicos ?? []).some((p) => /banda inicial/.test(p)), id);
});

test('8 de 10 al azar es poco probable: 56/1024 con 2 opciones y 201/59049 con 3 (a mano)', () => {
  // P(X ≥ 8 | n = 10, p = 1/2) = [C(10,8) + C(10,9) + C(10,10)]/2^10 = (45 + 10 + 1)/1024 = 56/1024.
  assert.equal(1 - binomialCDF(7, 10, 0.5), 56 / 1024);
  // Con p = 1/3: [45·2² + 10·2 + 1]/3^10 = 201/59049 = 0.0034.
  assert.ok(Math.abs(1 - binomialCDF(7, 10, 1 / 3) - 201 / 59049) < 1e-12);
  // Con 5 ensayos («4 de 5»), un niño que adivina con 2 opciones pasaría (5 + 1)/32 = 0.1875 de las veces.
  assert.equal(1 - binomialCDF(3, 5, 0.5), 6 / 32);
});

test('una banda se aprueba con 8 o más de 10; la escalera para en la primera no aprobada', () => {
  assert.ok(bandaAprobada({ ensayos: 10, aciertos: 8 }, E));
  assert.ok(!bandaAprobada({ ensayos: 10, aciertos: 7 }, E));
  assert.ok(!bandaAprobada({ ensayos: 9, aciertos: 9 }, E), 'un bloque cortado no se aprueba');
  assert.ok(siguePorEscalera({ banda: 'B2', aprobada: true }, BANDAS));
  assert.ok(!siguePorEscalera({ banda: 'B4', aprobada: true }, BANDAS), 'no hay banda arriba de B4');
  assert.ok(!siguePorEscalera({ banda: 'B2', aprobada: false }, BANDAS));
  // Propuesta: la última aprobada.
  assert.equal(bandaPropuesta([{ banda: 'B1', aprobada: true }, { banda: 'B2', aprobada: true }, { banda: 'B3', aprobada: false }], BANDAS), 'B2');
  assert.equal(bandaPropuesta([{ banda: 'B1', aprobada: false }], BANDAS), 'B1', 'B1 si no aprueba ninguna');
  assert.equal(bandaPropuesta([], BANDAS), 'B1', 'sin escalera (límite o sesión terminada antes), B1');
  assert.equal(bandaPropuesta(BANDAS.map((banda) => ({ banda, aprobada: true })), BANDAS), 'B4');
  // Límite de 15 minutos: la escalera no empieza otra banda; la propuesta es la última aprobada hasta ahí.
  assert.equal(decidirPaso({ tipo: 'escalera' }, { usoMs: 15 * 60000, limiteMinutos: 15 }), 'limite');
  assert.equal(bandaPropuesta([{ banda: 'B1', aprobada: true }], BANDAS), 'B1');
});

test('el plan y el inicio describen la escalera', () => {
  const plan = planDeSesion({ modo: 'familiarizacion', fichas, config });
  const esc = plan.filter((p) => p.tipo === 'escalera');
  assert.deepEqual(esc.map((p) => [p.actividad, p.bandas, p.ensayosPorBanda, p.aciertosParaSubir, p.modalidad]), [['ACT-02', BANDAS, 10, 8, 'AV'], ['ACT-07', BANDAS, 10, 8, 'AV']]);
  assert.deepEqual(plan.map((p) => p.tipo), ['rutina-inicio', 'referencia', 'bloque', 'transicion', 'escalera', 'transicion', 'escalera', 'rutina-cierre']);
  const html = planNinoHTML({ nino: crearNino({ edad_meses: 70 }), config, fichas });
  assert.match(html, /ACT-02 Pictograma e imagen: desde B1, 10 ensayos por banda, con voz \(AV\); sube con 8 aciertos o más de 10/);
  assert.match(html, /ACT-01 Igual a la muestra: banda B1/);
  assert.doesNotMatch(html, /data-probar/, 'ya no se eligen bandas para probar');
});

test('al cerrar: la propuesta se confirma o se cambia con motivo; el aviso de ACT-01 se muestra', () => {
  const bandaInicial = ['ACT-02', 'ACT-07'].map((id) => ({ id, nombre: fichas[id].nombre, bandas: BANDAS, propuesta: id === 'ACT-02' ? 'B2' : 'B1', actual: id === 'ACT-02' ? 'B2' : 'B1', escalera: id === 'ACT-02' ? [{ banda: 'B1', ensayos: 10, aciertos: 9, aprobada: true }, { banda: 'B2', ensayos: 10, aciertos: 8, aprobada: true }, { banda: 'B3', ensayos: 10, aciertos: 5, aprobada: false }] : [] }));
  const html = registrosHTML({ bandaInicial, avisoInclusion: true });
  assert.match(html, /B1: 9 de 10 \(aprobada\) · B2: 8 de 10 \(aprobada\) · B3: 5 de 10\. Propuesta: <strong>B2<\/strong>/);
  assert.match(html, /<option value="B2" selected>B2 \(propuesta\)<\/option>/);
  assert.ok(html.includes(AVISO_INCLUSION));
  assert.match(AVISO_INCLUSION, /10 ensayos de ACT-01/);
  // Confirmar: sin cambios.
  const ok = leerRegistros({ participacion: '4', no_marcados: '0', banda_inicial: { 'ACT-02': 'B2', 'ACT-07': 'B1' } }, { bandaInicial });
  assert.deepEqual(ok.banda_inicial_cambios, []);
  assert.deepEqual(faltantes(ok, { bandaInicial }), []);
  // Cambiar sin motivo no se guarda como completo; con motivo, queda registrado.
  const sin = leerRegistros({ participacion: '4', no_marcados: '0', banda_inicial: { 'ACT-02': 'B3', 'ACT-07': 'B1' } }, { bandaInicial });
  assert.deepEqual(faltantes(sin, { bandaInicial }), ['Escribe por qué cambias la banda inicial de ACT-02 (la plataforma propuso B2).']);
  const con = leerRegistros({ participacion: '4', no_marcados: '0', banda_inicial: { 'ACT-02': 'B3', 'ACT-07': 'B1' }, motivo_banda: { 'ACT-02': 'En B3 se distrajo al final; la conoce' } }, { bandaInicial });
  assert.deepEqual(con.banda_inicial_cambios, [{ actividad: 'ACT-02', propuesta: 'B2', elegida: 'B3', motivo: 'En B3 se distrajo al final; la conoce' }]);
  assert.deepEqual(faltantes(con, { bandaInicial }), []);
});

test('todo va al registro y al padrón', () => {
  for (const c of ['banda_inicial_fase1', 'escalera_familiarizacion', 'banda_inicial_propuesta', 'banda_inicial_cambios', 'aviso_inclusion_act01']) assert.ok(SESION_COLUMNS.includes(c), c);
  const app = leer('src/app.js');
  assert.match(app, /peldano\.aprobada = bandaAprobada\(peldano, paso\);/);
  assert.match(app, /if \(!siguePorEscalera\(peldano, paso\.bandas\)\) break;/);
  assert.match(app, /decidirPaso\(\{ tipo: 'bloque' \}, \{ usoMs: performance\.now\(\) - s\.inicioMs, limiteMinutos: cfg\.limiteMinutos \}\) === 'limite'/);
  assert.match(app, /aviso_inclusion_act01: act01 < \(famil\.minimoEnsayosACT01\?\.valor \?\? 10\)/);
  assert.match(app, /for \(const \[a, b\] of elegidas\) n\.bandas = fijarBanda\(n\.bandas, state\.fichas\[a\], b\);/);
  const readme = leer('README.md');
  for (const c of ['escalera_familiarizacion', 'banda_inicial_propuesta', 'banda_inicial_cambios', 'aviso_inclusion_act01']) assert.match(readme, new RegExp(`\\| \`${c}\` \\|`), c);
});
