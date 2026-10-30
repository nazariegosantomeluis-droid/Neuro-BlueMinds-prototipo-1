import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REVISION_COLUMNS, PROBLEMAS, FIGURAS, CAMBIAR_SHORT,
  itemsDeRevision, normalizarIniciales, nuevaRevision, faltantes, revisionCSV, nombreArchivo,
} from '../src/revision-datos.js';
import { leerCSV, decidirItem, decidirOpcion, unirRevisiones, resumen, REUNION } from '../tools/unir-revisiones.mjs';

const { items } = JSON.parse(readFileSync(new URL('../items/items.json', import.meta.url), 'utf8'));
const lista = itemsDeRevision(items);
const FECHA = '2026-11-03T17:05:00.000Z';

// Revisión completa: todo aprobado, salvo lo que indique cambios[codigo].
function revision(iniciales, profesion, cambios = {}, decisiones = {}) {
  const rev = nuevaRevision(iniciales, profesion);
  for (const c of [...lista.map((i) => i.codigo), FIGURAS]) rev.calificaciones[c] = { estado: 'Aprobado', problemas: [], comentario: '', ...cambios[c] };
  Object.assign(rev.decisiones, { camion: 'autobús urbano', short: 'se queda', tortilla: 'sirve', ...decisiones });
  return rev;
}

test('se revisan los 70 ítems de la muestra de ACT-01 y ACT-02', () => {
  assert.equal(lista.length, 70);
  assert.ok(lista.every((i) => i.muestraExpertos && ['ACT-01', 'ACT-02'].includes(i.actividad)));
  assert.equal(lista.filter((i) => i.actividad === 'ACT-01').length, 30);
});

test('faltan las tarjetas sin estado y las decisiones sin elegir', () => {
  const rev = nuevaRevision('AB', 'psicología');
  assert.equal(faltantes(rev, lista).sinEstado.length, 71, '70 ítems y las figuras de ACT-07');
  assert.equal(faltantes(rev, lista).decisiones.length, 3);
  const completa = revision('AB', 'psicología');
  assert.deepEqual(faltantes(completa, lista), { sinEstado: [], decisiones: [] });
});

test('exportación: columnas, una fila por ítem y las filas finales en orden', () => {
  const rev = revision('LNS', 'terapia de lenguaje', {
    [lista[0].codigo]: { estado: 'Corregir', problemas: [PROBLEMAS[0], PROBLEMAS[1]], comentario: 'El "gato", y el perro' },
    [lista[1].codigo]: { estado: 'Aprobado', problemas: [PROBLEMAS[2]] },
    [FIGURAS]: { estado: 'Retirar', problemas: [PROBLEMAS[5]] },
  }, { short: CAMBIAR_SHORT, shortCual: 'bermuda' });
  rev.comentarioGeneral = 'Sin más.';
  const csv = revisionCSV(rev, lista, { fecha: FECHA, version: '0.1.0' });
  assert.ok(csv.startsWith('﻿'));
  assert.equal(csv.slice(1).split('\r\n')[0], REVISION_COLUMNS.join(','));
  const filas = leerCSV(csv);
  assert.equal(filas.length, 75);
  assert.deepEqual(filas.slice(70).map((f) => f.item), ['DECISION-camion', 'DECISION-short', 'DECISION-tortilla', FIGURAS, 'COMENTARIO-GENERAL']);
  const [primera, segunda] = filas;
  assert.deepEqual(primera, {
    revisor_iniciales: 'LNS', revisor_profesion: 'terapia de lenguaje', fecha_utc: FECHA, version_app: '0.1.0',
    item: lista[0].codigo, actividad: 'ACT-01', banda: lista[0].banda, concepto: lista[0].concepto,
    estado: 'Corregir', problemas: `${PROBLEMAS[0]};${PROBLEMAS[1]}`, comentario: 'El "gato", y el perro',
  });
  assert.equal(segunda.problemas, '', 'un ítem aprobado no lleva tipos de problema');
  assert.deepEqual([filas[71].estado, filas[71].comentario], [CAMBIAR_SHORT, 'bermuda']);
  assert.deepEqual([filas[73].actividad, filas[73].estado, filas[73].problemas], ['ACT-07', 'Retirar', PROBLEMAS[5]]);
  assert.equal(filas[74].comentario, 'Sin más.');
});

test('nombre del archivo e iniciales', () => {
  assert.equal(normalizarIniciales(' l.n. ñá '), 'LNNA');
  assert.equal(nombreArchivo('LNS', FECHA), 'revision-clinica-LNS-2026-11-03.csv');
});

test('regla de unión: Aprobado, Corregir o Revisar en reunión', () => {
  assert.equal(decidirItem(['Aprobado', 'Aprobado']), 'Aprobado');
  assert.equal(decidirItem(['Aprobado', 'Corregir']), 'Corregir');
  assert.equal(decidirItem(['Corregir', 'Corregir', 'Aprobado']), 'Corregir');
  assert.equal(decidirItem(['Aprobado', 'Retirar']), REUNION);
  assert.equal(decidirItem(['Corregir', 'Retirar']), REUNION);
  assert.equal(decidirItem(['Aprobado', '']), REUNION, 'falta una calificación');
  assert.equal(decidirOpcion(['sirve', 'sirve']), 'sirve');
  assert.equal(decidirOpcion(['autobús urbano', 'camión de carga']), REUNION, 'desacuerdo');
});

test('unir dos revisiones: una fila por ítem con el estado de cada revisor y la decisión', () => {
  const [a, b, c] = lista.map((i) => i.codigo);
  const ab = revision('AB', 'psicología', { [a]: { estado: 'Corregir', problemas: [PROBLEMAS[1]] }, [b]: { estado: 'Retirar' } });
  const cd = revision('CD', 'terapia ocupacional', { [a]: { estado: 'Aprobado' }, [c]: { estado: 'Corregir' } }, { camion: 'camión de carga' });
  const r = unirRevisiones([ab, cd].map((x) => revisionCSV(x, lista, { fecha: FECHA, version: '0.1.0' })));
  assert.deepEqual(r.columnas, [
    'item', 'actividad', 'banda', 'concepto',
    'estado_AB', 'problemas_AB', 'comentario_AB', 'estado_CD', 'problemas_CD', 'comentario_CD', 'decision',
  ]);
  assert.equal(r.filas.length, 75);
  const fila = (item) => r.filas.find((f) => f.item === item);
  assert.deepEqual([fila(a).estado_AB, fila(a).estado_CD, fila(a).problemas_AB, fila(a).decision], ['Corregir', 'Aprobado', PROBLEMAS[1], 'Corregir']);
  assert.equal(fila(b).decision, REUNION);
  assert.equal(fila(c).decision, 'Corregir');
  assert.equal(fila(FIGURAS).decision, 'Aprobado');
  assert.equal(fila('DECISION-camion').decision, REUNION);
  assert.equal(fila('DECISION-tortilla').decision, 'sirve');
  assert.equal(fila('COMENTARIO-GENERAL').decision, '');
  const texto = resumen(r);
  assert.match(texto, /Aprobado: 68\n {2}Corregir: 2\n {2}Revisar en reunión: 1/);
  assert.match(texto, /camion: Revisar en reunión/);
  assert.equal(leerCSV(r.csv).length, 75);
});

test('unir rechaza un archivo que no es de revisión clínica', () => {
  assert.throws(() => unirRevisiones(['a,b\r\n1,2\r\n', 'a,b\r\n1,2\r\n']), /no es un CSV de revisión/);
});
