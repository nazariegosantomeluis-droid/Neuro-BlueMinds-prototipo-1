// Une las revisiones clínicas de dos o más revisores (archivos de «Descargar revisión (CSV)»)
// en revision-consolidada.csv: una fila por ítem con el estado de cada revisor y la decisión.
// Uso: node tools/unir-revisiones.mjs revision-clinica-AB-2026-11-03.csv revision-clinica-CD-2026-11-04.csv
import { readFileSync, writeFileSync } from 'node:fs';
import { toCSV } from '../src/engine/logger.js';
import { ESTADOS, REVISION_COLUMNS } from '../src/revision-datos.js';

export const REUNION = 'Revisar en reunión';
const SALIDA = 'revision-consolidada.csv';

// CSV con comillas dobles, marca BOM y fin de línea CRLF o LF.
export function leerCSV(texto) {
  const t = texto.replace(/^﻿/, '');
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') (campo += '"'), i++;
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === ',') fila.push(campo), (campo = '');
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else campo += ch;
  }
  if (campo || fila.length) filas.push([...fila, campo]);
  const [cabecera = [], ...resto] = filas;
  return resto.filter((f) => f.some(Boolean)).map((f) => Object.fromEntries(cabecera.map((c, k) => [c, f[k] ?? ''])));
}

// Ítems y figuras: Aprobado si todos aprueban; Corregir si alguno pide corregir y nadie retirar;
// Revisar en reunión si alguno pide retirar o si falta la calificación de algún revisor.
export function decidirItem(estados) {
  if (estados.includes('Retirar') || estados.some((e) => !ESTADOS.includes(e))) return REUNION;
  return estados.includes('Corregir') ? 'Corregir' : 'Aprobado';
}

// Decisiones (camión, short, tortilla): la elección común; si no coinciden, Revisar en reunión.
export const decidirOpcion = (valores) => (valores[0] && valores.every((v) => v === valores[0]) ? valores[0] : REUNION);

export function unirRevisiones(textos) {
  const revisiones = textos.map(leerCSV);
  if (revisiones.some((r) => !r.length || !REVISION_COLUMNS.every((c) => c in r[0]))) {
    throw new Error('Uno de los archivos no es un CSV de revisión clínica.');
  }
  // Las columnas de cada revisor llevan sus iniciales (con un número si se repiten).
  const vistos = new Map();
  const revisores = revisiones.map((r) => {
    const ini = r[0].revisor_iniciales || 'R';
    const n = (vistos.get(ini) ?? 0) + 1;
    vistos.set(ini, n);
    return { ini: n > 1 ? `${ini}${n}` : ini, profesion: r[0].revisor_profesion };
  });
  const items = [...new Map(revisiones.flat().map((f) => [f.item, f])).values()];
  const columnas = [
    'item', 'actividad', 'banda', 'concepto',
    ...revisores.flatMap(({ ini }) => [`estado_${ini}`, `problemas_${ini}`, `comentario_${ini}`]),
    'decision',
  ];
  const filas = items.map(({ item, actividad, banda, concepto }) => {
    const deCada = revisiones.map((r) => r.find((f) => f.item === item));
    const fila = { item, actividad, banda, concepto };
    revisores.forEach(({ ini }, k) => {
      fila[`estado_${ini}`] = deCada[k]?.estado ?? '';
      fila[`problemas_${ini}`] = deCada[k]?.problemas ?? '';
      fila[`comentario_${ini}`] = deCada[k]?.comentario ?? '';
    });
    const estados = deCada.map((f) => f?.estado ?? '');
    fila.decision = item === 'COMENTARIO-GENERAL' ? '' : item.startsWith('DECISION-') ? decidirOpcion(estados) : decidirItem(estados);
    return fila;
  });
  return { revisores, columnas, filas, csv: toCSV(filas, columnas) };
}

export function resumen({ revisores, filas }) {
  const items = filas.filter((f) => !f.item.startsWith('DECISION-') && f.item !== 'COMENTARIO-GENERAL');
  const cuantos = (d) => items.filter((f) => f.decision === d).length;
  return [
    `Revisores: ${revisores.map((r) => `${r.ini} (${r.profesion})`).join(', ')}`,
    `Ítems (incluye las figuras de ACT-07): ${items.length}`,
    `  Aprobado: ${cuantos('Aprobado')}`,
    `  Corregir: ${cuantos('Corregir')}`,
    `  ${REUNION}: ${cuantos(REUNION)}`,
    'Decisiones:',
    ...filas.filter((f) => f.item.startsWith('DECISION-')).map((f) => `  ${f.item.slice('DECISION-'.length)}: ${f.decision}`),
  ].join('\n');
}

if (process.argv[1]?.endsWith('unir-revisiones.mjs')) {
  const archivos = process.argv.slice(2);
  if (archivos.length < 2) {
    console.error('Uso: node tools/unir-revisiones.mjs <revisión 1>.csv <revisión 2>.csv [más revisiones…]');
    process.exit(1);
  }
  const r = unirRevisiones(archivos.map((a) => readFileSync(a, 'utf8')));
  writeFileSync(SALIDA, r.csv);
  console.log(resumen(r));
  console.log(`Archivo: ${SALIDA}`);
}
