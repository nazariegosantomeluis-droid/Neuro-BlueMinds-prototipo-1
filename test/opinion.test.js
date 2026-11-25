// Formulario de opinión de expertos (#opinion; tanda 10) y tools/unir-opinion.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AREAS, ABIERTAS, OPINION_COLUMNS, nuevaOpinion, faltantes, opinionCSV, nombreArchivoOpinion, inicialesValidas } from '../src/opinion-datos.js';
import { unirOpiniones } from '../tools/unir-opinion.mjs';
import { leerCSV } from '../tools/unir-revisiones.mjs';

const fuente = (r) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

function llena(iniciales, profesion, areas = {}, abiertas = {}) {
  const op = nuevaOpinion();
  op.perfil = { iniciales, profesion, anios: '8' };
  for (const a of AREAS) op.areas[a.id] = areas[a.id] ?? { funciona: 'si', cambiaria: '' };
  op.abiertas = abiertas;
  return op;
}

test('cubre las áreas pedidas, con las tres preguntas por área y las tres abiertas al final', () => {
  assert.deepEqual(AREAS.map((a) => a.id), ['inicio-padron', 'familiarizacion', 'sesion-act01', 'sesion-act02', 'sesion-act07', 'menu-terapeuta', 'registros-cierre', 'panel', 'sesiones-indicadores', 'sin-conexion-pin']);
  assert.deepEqual(ABIERTAS.map((q) => q.id), ['falta', 'sobra', 'usaria']);
  const pantalla = fuente('src/opinion.js');
  assert.match(pantalla, /¿Funciona como esperaría en su práctica\?/);
  assert.match(pantalla, /¿Qué cambiaría\?/);
  assert.match(pantalla, /Gravedad del problema/);
});

test('sin cuenta y sin datos personales: solo iniciales, profesión y años de experiencia', () => {
  assert.deepEqual(Object.keys(nuevaOpinion().perfil), ['iniciales', 'profesion', 'anios']);
  assert.deepEqual(OPINION_COLUMNS.slice(0, 3), ['iniciales', 'profesion', 'anios_experiencia']);
  for (const c of ['nombre', 'correo', 'telefono', 'ciudad']) assert.ok(!OPINION_COLUMNS.includes(c), c);
  assert.equal(inicialesValidas('mgr'), true);
  assert.equal(inicialesValidas('María'), false);
  assert.doesNotMatch(fuente('src/opinion.js'), /name="(nombre|correo|email|telefono)"/);
});

test('pide la gravedad solo si hay problema y no deja descargar incompleto', () => {
  const op = llena('AB', 'terapia ocupacional');
  assert.deepEqual(faltantes(op), []);
  op.areas.panel = { funciona: 'con_problemas', cambiaria: 'x' };
  assert.match(faltantes(op).join(), /gravedad del problema: Panel del terapeuta/);
  op.areas.panel.gravedad = 'importante';
  delete op.areas.familiarizacion;
  assert.match(faltantes(op).join(), /si funciona: Familiarización/);
  assert.match(faltantes(llena('A', '')).join(), /iniciales.*profesión/);
});

test('el CSV lleva la versión y el commit en cada fila', () => {
  const op = llena('ab', 'psicología o neuropsicología', { panel: { funciona: 'no', gravedad: 'impide', cambiaria: 'No entiendo la banda, "ni" esto' } }, { falta: 'Un tutorial', usaria: 'Sí, para seguir la fase 1' });
  const filas = leerCSV(opinionCSV(op, { fecha: '2026-11-25T10:00:00.000Z', version: '0.1.0', commit: 'abc1234' }));
  assert.equal(filas.length, AREAS.length + ABIERTAS.length);
  for (const f of filas) assert.ok(f.version_app === '0.1.0' && f.commit === 'abc1234' && f.iniciales === 'AB', JSON.stringify(f));
  const panel = filas.find((f) => f.area === 'panel');
  assert.equal(panel.gravedad, 'impide');
  assert.equal(panel.texto, 'No entiendo la banda, "ni" esto');
  assert.equal(filas.find((f) => f.area === 'inicio-padron').gravedad, '', 'sin problema no hay gravedad');
  assert.equal(nombreArchivoOpinion('áb', '2026-11-25T10:00:00Z'), 'opinion-AB-2026-11-25.csv');
});

test('unir: ordena los problemas por gravedad y por número de expertos; un reenvío cuenta una vez', () => {
  const csv = (op, fecha) => opinionCSV(op, { fecha, version: '0.1.0', commit: 'abc1234' });
  const textos = [
    csv(llena('AA', 'terapia de lenguaje', { panel: { funciona: 'con_problemas', gravedad: 'menor', cambiaria: 'p1' }, 'menu-terapeuta': { funciona: 'con_problemas', gravedad: 'importante', cambiaria: 'm1' } }), '2026-11-25T10:00:00Z'),
    csv(llena('BB', 'terapia ocupacional', { panel: { funciona: 'con_problemas', gravedad: 'menor', cambiaria: 'p2' }, 'menu-terapeuta': { funciona: 'no', gravedad: 'importante', cambiaria: 'm2' }, 'sin-conexion-pin': { funciona: 'no', gravedad: 'impide', cambiaria: 'pin' } }), '2026-11-25T11:00:00Z'),
    csv(llena('CC', 'terapia conductual', { panel: { funciona: 'con_problemas', gravedad: 'menor', cambiaria: 'p3' } }, { falta: 'Más actividades' }), '2026-11-25T12:00:00Z'),
    // CC lo envió antes con otra opinión: cuenta la más reciente.
    csv(llena('CC', 'terapia conductual', { registros: { funciona: 'no', gravedad: 'impide' } }), '2026-11-24T12:00:00Z'),
  ];
  const r = unirOpiniones(textos);
  assert.equal(r.expertos.length, 3);
  assert.deepEqual(r.problemas.map((p) => [p.area, p.gravedad_maxima, p.expertos_con_problema]), [
    ['sin-conexion-pin', 'impide', 1],
    ['menu-terapeuta', 'importante', 2],
    ['panel', 'menor', 3],
  ]);
  assert.match(r.problemas[1].cambios, /E\d\d \(no, importante\): m2/);
  assert.equal(r.areas.find((a) => a.area === 'panel').con_problemas, 3);
  assert.deepEqual(r.abiertas.map((a) => [a.pregunta, a.texto]), [['falta', 'Más actividades']]);
  assert.deepEqual(r.versiones, ['0.1.0 (abc1234)']);
  assert.throws(() => unirOpiniones(['a,b\n1,2']), /no es un CSV del formulario de opinión/);
});

test('el formulario se abre desde el menú y sin PIN', async () => {
  const { RUTAS_SIN_DATOS } = await import('../src/bloqueo.js');
  assert.ok(RUTAS_SIN_DATOS.has('opinion'));
  assert.match(fuente('src/app.js'), /else if \(ruta === 'opinion'\) renderOpinion\(app\);/);
});
