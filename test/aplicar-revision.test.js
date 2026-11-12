import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { aplicarRevision, conRevisionClinica, parseArgs, resumenAplicacion, hoy } from '../tools/aplicar-revision.mjs';
import { buildItems, loadInputs, estadoDe } from '../tools/build-items.mjs';
import { validateFicha } from '../src/engine/ficha.js';
import { disponibleEnSesion, pickItems, rng } from '../src/engine/selector.js';
import { revisadaClinicamente, filtrarPorEstado, textoFiguras, conteoEstados, ETIQUETAS_REVISION } from '../src/revision-estado.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const leer = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
// Revisión consolidada de ejemplo: dos clínicos (AB y CD), un ítem retirado en reunión
// (ACT02-B1-25), dos por corregir (ACT01-B2-03 y ACT02-B3-36) y el short resuelto en reunión.
const EJEMPLO = leer('test/revision-consolidada-ejemplo.csv');
const inputs = loadInputs();
const banco = buildItems(inputs);
const codigos = new Set(banco.filter((i) => i.actividad !== 'ACT-07').map((i) => i.codigo));
const revisores = new Map([['AB', 'Ana Beltrán, terapia de lenguaje'], ['CD', 'Carlos Díaz, psicología']]);
const aplicar = (texto = EJEMPLO, extra = {}) => aplicarRevision(texto, { revisores, fecha: '2026-11-15', codigos, previa: undefined, ...extra });
// Cambia la decisión de un ítem en el CSV consolidado.
const conDecision = (codigo, decision) =>
  EJEMPLO.split('\n').map((l) => (l.startsWith(`${codigo},`) ? l.replace(/,[^,]*$/, `,${decision}`) : l)).join('\n');

test('aplica la revisión de ejemplo: estados, notas, figuras y decisiones', () => {
  const r = aplicar();
  assert.deepEqual(r.errores, []);
  const { items, figuras, decisiones } = r.revision;
  assert.equal(Object.keys(items).length, 70, 'los 70 ítems de la muestra');
  assert.equal(items['ACT02-B1-25'].estado, 'retirado');
  assert.deepEqual(items['ACT02-B1-25'].problemas, ['Imagen poco reconocible']);
  assert.deepEqual(items['ACT02-B1-25'].comentarios, ['AB: La foto no se distingue.']);
  assert.equal(items['ACT02-B1-25'].concepto, 'llaves');
  assert.equal(items['ACT01-B2-03'].estado, 'corregir');
  assert.deepEqual(items['ACT01-B2-03'].problemas, ['Demasiado fácil para su banda'], 'sin repetir el mismo problema');
  assert.deepEqual(items['ACT02-B3-36'].problemas, ['Ambiguo, otra opción también podría ser correcta']);
  assert.equal(Object.values(items).filter((i) => i.estado === 'aprobado').length, 67);
  assert.equal(figuras['ACT-07'].estado, 'aprobado');
  assert.deepEqual(Object.fromEntries(Object.entries(decisiones).map(([k, d]) => [k, d.valor])), { camion: 'autobús urbano', short: 'se queda', tortilla: 'sirve' });
  assert.deepEqual(r.actividades, ['ACT-01', 'ACT-02', 'ACT-07']);
  assert.equal(r.revisor, 'Ana Beltrán, terapia de lenguaje; Carlos Díaz, psicología');
  assert.deepEqual(r.revision.rondas, [{ fecha: '2026-11-15', revisores: [{ iniciales: 'AB', nombre: 'Ana Beltrán, terapia de lenguaje' }, { iniciales: 'CD', nombre: 'Carlos Díaz, psicología' }] }]);
});

test('no aplica nada mientras quede un caso «Revisar en reunión» o una decisión vacía', () => {
  const r = aplicar(conDecision('ACT02-B1-25', 'Revisar en reunión'));
  assert.equal(r.revision, undefined);
  assert.match(r.errores.join('\n'), /1 casos sin decisión final[\s\S]*ACT02-B1-25: «Revisar en reunión»/);
  const vacia = aplicar(conDecision('DECISION-short', ''));
  assert.match(vacia.errores.join('\n'), /DECISION-short: «vacía»/);
  const otra = aplicar(conDecision('DECISION-camion', 'tráiler'));
  assert.match(otra.errores.join('\n'), /DECISION-camion: «tráiler»/);
});

test('exige el nombre de cada revisor del CSV y ninguno de más', () => {
  const falta = aplicar(EJEMPLO, { revisores: new Map([['AB', 'Ana']]) });
  assert.match(falta.errores.join('\n'), /Falta el nombre de: CD/);
  const sobra = aplicar(EJEMPLO, { revisores: new Map([...revisores, ['EF', 'Otra persona']]) });
  assert.match(sobra.errores.join('\n'), /no tiene columnas de: EF/);
});

test('rechaza ítems que no existen, fechas mal escritas y archivos que no son la revisión consolidada', () => {
  const inexistente = EJEMPLO.replace('ACT01-B1-01,', 'ACT01-B9-99,');
  assert.match(aplicar(inexistente).errores.join('\n'), /ACT01-B9-99 no existe en el banco/);
  assert.match(aplicar(EJEMPLO, { fecha: '15/11/2026' }).errores.join('\n'), /AAAA-MM-DD/);
  assert.match(aplicar('a,b\n1,2\n').errores.join('\n'), /no es un revision-consolidada\.csv/);
});

test('una segunda ronda sustituye solo los ítems que revisa y conserva las rondas anteriores', () => {
  const primera = aplicar().revision;
  const segunda = 'item,actividad,banda,concepto,estado_EF,problemas_EF,comentario_EF,decision\nACT01-B2-03,ACT-01,B2,almohada,Aprobado,,,Aprobado\n';
  const r = aplicarRevision(segunda, { revisores: new Map([['EF', 'Elena Flores, terapia ocupacional']]), fecha: '2026-12-10', codigos, previa: primera });
  assert.deepEqual(r.errores, []);
  assert.equal(r.revision.items['ACT01-B2-03'].estado, 'aprobado');
  assert.equal(r.revision.items['ACT01-B2-03'].fecha, '2026-12-10');
  assert.equal(r.revision.items['ACT02-B1-25'].estado, 'retirado', 'lo demás no cambia');
  assert.equal(r.revision.rondas.length, 2);
  assert.deepEqual(r.actividades, ['ACT-01']);
});

test('anota revisor y fecha en cada ficha sin tocar nada más', () => {
  for (const id of ['ACT-01', 'ACT-02', 'ACT-07']) {
    const antes = leer(`fichas/${id}.json`);
    const despues = conRevisionClinica(antes, 'Ana Beltrán, terapia de lenguaje; Carlos «CD» Díaz', '2026-11-15');
    const a = JSON.parse(antes);
    const d = JSON.parse(despues);
    assert.deepEqual(d.revisionClinica, { revisor: 'Ana Beltrán, terapia de lenguaje; Carlos «CD» Díaz', fecha: '2026-11-15' }, id);
    assert.deepEqual({ ...d, revisionClinica: a.revisionClinica }, a, `${id}: el resto de la ficha queda igual`);
    assert.equal(despues.split('\n').length <= antes.split('\n').length, true, `${id}: el formato del resto se conserva`);
    assert.deepEqual(validateFicha(d), [], `${id}: la ficha sigue siendo válida`);
    assert.ok(revisadaClinicamente(d));
    assert.ok(!revisadaClinicamente(JSON.parse(conRevisionClinica(antes, '', ''))), `${id}: sin revisor ni fecha no cuenta como revisada`);
  }
  assert.throws(() => conRevisionClinica('{ "id": "X" }', 'A', '2026-11-15'), /revisionClinica/);
});

test('el banco lleva el estado de revisión: ACT-01 y ACT-02 por ítem, ACT-07 sin estado propio', () => {
  const { revision } = aplicar();
  const con = buildItems({ ...inputs, revision });
  const de = (codigo) => con.find((i) => i.codigo === codigo);
  assert.equal(de('ACT02-B1-25').estadoRevision, 'retirado');
  assert.equal(de('ACT01-B2-03').estadoRevision, 'corregir');
  assert.equal(de('ACT02-B2-01').estadoRevision, estadoDe(revision, 'ACT02-B2-01'));
  assert.ok(con.filter((i) => i.actividad === 'ACT-07').every((i) => !('estadoRevision' in i)));
  assert.deepEqual(conteoEstados(con), { 'sin-revisar': 200, aprobado: 67, corregir: 2, retirado: 1 });
  // La revisión solo cambia el estado: el resto del banco es idéntico.
  const sinEstado = (xs) => xs.map(({ estadoRevision, ...resto }) => resto);
  assert.deepEqual(sinEstado(con), sinEstado(banco));
});

test('items/revision.json del repositorio tiene la estructura esperada y el banco está al día', () => {
  const r = JSON.parse(leer('items/revision.json'));
  for (const k of ['rondas', 'items', 'figuras', 'decisiones']) assert.ok(k in r, k);
  for (const [codigo, e] of Object.entries(r.items)) {
    assert.ok(codigos.has(codigo), `${codigo} existe en el banco`);
    assert.ok(['aprobado', 'corregir', 'retirado'].includes(e.estado), codigo);
  }
});

test('los ítems retirados nunca entran en una sesión; los que están por corregir sí', () => {
  const { revision } = aplicar();
  const con = buildItems({ ...inputs, revision });
  const banda = con.filter((i) => i.actividad === 'ACT-02' && i.banda === 'B1');
  const disponibles = banda.filter(disponibleEnSesion);
  assert.equal(disponibles.length, banda.length - 1);
  assert.ok(!disponibles.some((i) => i.codigo === 'ACT02-B1-25'));
  assert.ok(disponibleEnSesion({ estadoRevision: 'corregir' }) && disponibleEnSesion({ estadoRevision: 'sin-revisar' }) && disponibleEnSesion({}));
  for (let s = 0; s < 50; s++) {
    const elegidos = pickItems(disponibles, 30, rng(s), { repeat: false });
    assert.ok(!elegidos.some((i) => i.estadoRevision === 'retirado'));
  }
  // La aplicación filtra la banda con disponibleEnSesion antes de elegir.
  assert.match(leer('src/app.js'), /i\.banda === banda\.id && disponibleEnSesion\(i\)/);
});

test('galería e inicio: etiquetas, filtro por estado, figuras de ACT-07 y aviso sin revisión', () => {
  const items = [{ estadoRevision: 'retirado' }, { estadoRevision: 'aprobado' }, { estadoRevision: 'sin-revisar' }, { ensayos: [] }];
  assert.equal(filtrarPorEstado(items, 'retirado').length, 1);
  assert.equal(filtrarPorEstado(items, 'sin-revisar').length, 2, 'lo que no tiene estado cuenta como sin revisar');
  assert.equal(filtrarPorEstado(items, 'todos').length, 4);
  assert.equal(textoFiguras({ figuras: {} }), 'Figuras y colores sin revisión clínica.');
  assert.equal(
    textoFiguras({ figuras: { 'ACT-07': { estado: 'corregir', fecha: '2026-11-15', problemas: ['Otro'], comentarios: ['AB: el carro parece camión'] } } }),
    'Figuras y colores: por corregir en la revisión clínica del 2026-11-15 (Otro · AB: el carro parece camión).',
  );
  assert.deepEqual(Object.keys(ETIQUETAS_REVISION), ['sin-revisar', 'aprobado', 'corregir', 'retirado']);
  const paginas = leer('src/paginas.js');
  assert.match(paginas, /filtrarPorEstado\(/);
  assert.match(paginas, /textoFiguras\(revision\)/);
  assert.match(leer('src/app.js'), /!revisadaClinicamente\(ficha\)[\s\S]{0,80}AVISO_SIN_REVISION/);
});

test('argumentos de la línea de comandos', () => {
  const a = parseArgs(['r.csv', '--revisor', 'ab=Ana Beltrán, lenguaje', '--revisor', 'CD=Carlos', '--fecha', '2026-11-15', '--prueba']);
  assert.deepEqual(a.errores, []);
  assert.deepEqual([...a.revisores], [['AB', 'Ana Beltrán, lenguaje'], ['CD', 'Carlos']]);
  assert.equal(a.fecha, '2026-11-15');
  assert.ok(a.prueba);
  assert.match(parseArgs(['--revisor', 'AB']).errores.join('\n'), /INICIALES=Nombre[\s\S]*Falta el archivo/);
  assert.match(hoy(new Date(2026, 10, 8)), /^2026-11-08$/);
});

test('el resumen señala los retiros que pueden deberse al concepto y las decisiones por aplicar', () => {
  const r = aplicar();
  const texto = resumenAplicacion(r, 270);
  assert.match(texto, /aprobados 67, por corregir 2, retirados 1/);
  assert.match(texto, /sin revisión clínica \(fuera de la muestra\): 200/);
  assert.match(texto, /ACT02-B1-25: Imagen poco reconocible · AB: La foto no se distingue\. → revisen si conviene retirar el concepto «llaves»/);
  assert.match(texto, /short: se queda/);
});

test('la herramienta en modo de prueba no escribe nada y sale con error si falta resolver casos', () => {
  const tool = fileURLToPath(new URL('../tools/aplicar-revision.mjs', import.meta.url));
  const args = ['--revisor', 'AB=Ana Beltrán', '--revisor', 'CD=Carlos Díaz', '--fecha', '2026-11-15', '--prueba'];
  const archivos = ['items/revision.json', 'items/items.json', 'fichas/ACT-01.json', 'fichas/ACT-02.json', 'fichas/ACT-07.json'];
  const antes = archivos.map(leer);
  const ok = spawnSync(process.execPath, [tool, fileURLToPath(new URL('./revision-consolidada-ejemplo.csv', import.meta.url)), ...args], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Modo de prueba: no se escribió nada/);
  assert.deepEqual(archivos.map(leer), antes);
  const mal = spawnSync(process.execPath, [tool, fileURLToPath(new URL('./revision-consolidada-ejemplo.csv', import.meta.url)), '--revisor', 'AB=Ana', '--prueba'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(mal.status, 1);
  assert.match(mal.stderr, /No se aplicó la revisión[\s\S]*Falta el nombre de: CD/);
});
