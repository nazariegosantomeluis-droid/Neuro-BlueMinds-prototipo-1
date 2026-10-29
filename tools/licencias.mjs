// Lectura y escritura de items/licencias.csv: origen y licencia de cada imagen,
// pictograma y audio. Una fila por archivo; las filas se guardan ordenadas por archivo.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const COLUMNS = [
  'archivo', 'tipo', 'concepto', 'ejemplar', 'origen', 'autor', 'propietario',
  'licencia', 'id_origen', 'url_origen', 'estado', 'notas',
];

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') (cell += '"'), i++;
      else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += ch;
  }
  if (cell !== '' || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ''));
}

export function readLicencias(file) {
  if (!existsSync(file)) return [];
  const [header = [], ...rows] = parseCSV(readFileSync(file, 'utf8').replace(/^﻿/, ''));
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export function writeLicencias(file, rows) {
  const sorted = [...rows].sort((a, b) => a.archivo.localeCompare(b.archivo));
  const lines = [COLUMNS.join(','), ...sorted.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))];
  writeFileSync(file, lines.join('\n') + '\n');
}

// Agrega las filas cuyo archivo todavía no aparece; no modifica las existentes.
export function addMissing(file, newRows) {
  const rows = readLicencias(file);
  const known = new Set(rows.map((r) => r.archivo));
  const added = newRows.filter((r) => !known.has(r.archivo));
  if (added.length) writeLicencias(file, [...rows, ...added]);
  return added.length;
}
