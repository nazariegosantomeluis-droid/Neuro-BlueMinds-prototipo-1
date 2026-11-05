import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACTIVIDADES_F3, GENERALES, F3_COLUMNS, nuevaRespuesta, preguntas, faltantes, f3CSV, nombreArchivoF3, normalizarCodigo,
} from '../src/f3-datos.js';
import { cvi, lecturaKappa, criterioICVI, expertoValido, unirF3, resumen } from '../tools/unir-f3.mjs';

const ficha = (id) => JSON.parse(readFileSync(new URL(`../fichas/${id}.json`, import.meta.url), 'utf8'));
const fichas = Object.fromEntries(ACTIVIDADES_F3.map((a) => [a, ficha(a)]));
const FECHA = '2026-11-30T18:00:00.000Z';

// Respuesta completa: todo con `valor`, salvo lo que indique cambios[clave].
function respuesta(nombre, disciplina, valor = 4, cambios = {}, perfil = {}) {
  const r = nuevaRespuesta();
  Object.assign(r.perfil, { nombre, disciplina, anios: '5 a 9', ambito: 'clínica o consultorio privado', ciudad: 'Zapopan, Jalisco', piloto: 'no', familiar: 'no', consentimiento: true }, perfil);
  for (const a of ACTIVIDADES_F3) for (const q of preguntas(a, fichas[a])) r.calificaciones[q.clave] = cambios[q.clave] ?? valor;
  for (const g of GENERALES) r.generales[g.id] = valor;
  return r;
}
const csv = (r, fecha = FECHA) => f3CSV(r, fichas, { fecha, version: '0.1.0' });

test('cada actividad tiene 5 dimensiones y una claridad por banda', () => {
  assert.equal(preguntas('ACT-01', fichas['ACT-01']).length, 5 + 3);
  assert.equal(preguntas('ACT-02', fichas['ACT-02']).length, 5 + 4);
  assert.equal(preguntas('ACT-07', fichas['ACT-07']).length, 5 + 4);
  assert.equal(preguntas('ACT-02', fichas['ACT-02'])[0].dimension, 'relevancia');
  assert.ok(preguntas('ACT-02', fichas['ACT-02'])[0].decide);
});

test('faltantes: datos, consentimiento, preguntas y valoración general', () => {
  const vacia = nuevaRespuesta();
  const f = faltantes(vacia, fichas);
  assert.ok(f.includes('su nombre') && f.includes('la casilla de uso de sus calificaciones') && f.includes('la valoración general'));
  assert.ok(f.some((x) => x.includes('ACT-07')));
  assert.deepEqual(faltantes(respuesta('Ana', 'terapia de lenguaje'), fichas), []);
});

test('CSV: columnas, una fila por calificación y los ítems señalados', () => {
  const r = respuesta('Ana López', 'terapia de lenguaje');
  r.items.push({ codigo: ' act02-b3-07 ', problema: 'Imagen poco reconocible', sugerencia: 'Usar otro "perro", más típico' });
  r.comentarios['ACT-07'] = 'Las cajas, bien.';
  const filas = csv(r).replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(filas[0], F3_COLUMNS.join(','));
  const calif = filas.filter((l) => l.includes(',calificacion,'));
  assert.equal(calif.length, 8 + 9 + 9);
  assert.ok(filas.some((l) => l.includes(',item,ACT-02,') && l.includes('ACT02-B3-07') && l.includes('""perro""')));
  assert.ok(filas.some((l) => l.includes(',comentario,ACT-07,')));
  assert.equal(filas.filter((l) => l.includes(',general,')).length, GENERALES.length);
  assert.equal(normalizarCodigo(' act07-b2-04 '), 'ACT07-B2-04');
  assert.equal(nombreArchivoF3('María José Pérez', FECHA), 'f3-maria-jose-perez-2026-11-30.csv');
});

test('I-CVI y κ*: ejemplo de 7 expertos con 6 de acuerdo (Polit et al., 2007)', () => {
  const r = cvi([4, 4, 3, 3, 4, 3, 2]);
  assert.equal(r.n, 7);
  assert.equal(r.a, 6);
  assert.equal(r.icvi.toFixed(2), '0.86');
  assert.equal(r.pc.toFixed(3), '0.055');
  assert.equal(r.kappa.toFixed(2), '0.85');
  assert.equal(lecturaKappa(r.kappa), 'excelente');
  assert.equal(criterioICVI(7), 0.78);
  assert.equal(criterioICVI(5), 1.0);
  assert.equal(cvi([]), null);
});

test('quedan fuera de los índices quien participa en el piloto, tiene un familiar o no consintió', () => {
  assert.ok(expertoValido({ consentimiento: 'sí', participa_piloto: 'no', familiar_piloto: 'no' }));
  assert.ok(expertoValido({ consentimiento: 'sí', participa_piloto: 'no sé', familiar_piloto: 'no' }));
  assert.ok(!expertoValido({ consentimiento: 'sí', participa_piloto: 'sí', familiar_piloto: 'no' }));
  assert.ok(!expertoValido({ consentimiento: 'sí', participa_piloto: 'no', familiar_piloto: 'sí' }));
  assert.ok(!expertoValido({ consentimiento: 'no', participa_piloto: 'no', familiar_piloto: 'no' }));
});

test('unión: índices, S-CVI/Ave, ítems repetidos, expertos excluidos y envíos duplicados', () => {
  const disc = ['terapia de lenguaje', 'terapia ocupacional', 'psicología o neuropsicología', 'terapia conductual', 'terapia de lenguaje', 'terapia conductual'];
  const archivos = disc.map((d, k) => {
    // Un experto califica con 2 la relevancia de ACT-07: I-CVI = 5/6 = 0.83.
    const r = respuesta(`Experto ${k}`, d, 4, k === 0 ? { 'ACT-07/relevancia': 2 } : {});
    if (k < 2) r.items.push({ codigo: 'ACT02-B4-03', problema: 'Ambiguo, otra opción también podría ser correcta', sugerencia: `Cambio ${k}` });
    return csv(r);
  });
  // Un séptimo experto participa en el piloto: no entra en los índices.
  archivos.push(csv(respuesta('Terapeuta del piloto', 'terapia ocupacional', 1, {}, { piloto: 'sí' })));
  // El experto 1 reenvió: cuenta la versión más reciente, que ya no señala ítems.
  archivos.push(csv(respuesta('Experto 1', disc[1]), '2026-12-01T10:00:00.000Z'));

  const r = unirF3(archivos);
  assert.equal(r.expertos.length, 7);
  assert.equal(r.validos, 6);
  assert.deepEqual(r.disciplinasFaltantes, []);
  const rel = (a) => r.indices.find((x) => x.tipo === 'calificacion' && x.actividad === a && x.dimension === 'relevancia');
  assert.equal(rel('ACT-02').icvi, 1);
  assert.equal(rel('ACT-02').decision, 'Se acepta');
  assert.equal(rel('ACT-07').icvi, 0.83);
  assert.equal(rel('ACT-07').decision, 'Se acepta');
  assert.equal(r.scvi, 0.94);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].veces, 1, 'el reenvío del experto 1 reemplaza al primero');
  assert.match(resumen(r), /S-CVI\/Ave de relevancia: 0.94/);
  assert.throws(() => unirF3(['a,b\r\n1,2\r\n']), /no es un CSV del formulario F3/);
});

test('con menos de 6 expertos el criterio es 1.00', () => {
  const archivos = [0, 1, 2, 3].map((k) => csv(respuesta(`E${k}`, 'psicología o neuropsicología', 4, k === 0 ? { 'ACT-01/relevancia': 2 } : {})));
  const r = unirF3(archivos);
  const rel = r.indices.find((x) => x.actividad === 'ACT-01' && x.dimension === 'relevancia' && x.tipo === 'calificacion');
  assert.equal(rel.icvi, 0.75);
  assert.equal(rel.criterio, 1);
  assert.equal(rel.decision, 'Corregir y recalificar');
  const dos = unirF3([0, 1].map((k) => csv(respuesta(`D${k}`, 'terapia conductual'))));
  assert.equal(dos.indices[0].decision, 'Faltan expertos');
});
