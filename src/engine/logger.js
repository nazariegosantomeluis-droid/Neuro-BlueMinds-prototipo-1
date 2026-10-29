// Registro por ensayo y por sesión. Vive en memoria y en localStorage del
// dispositivo; se exporta a CSV y JSON. Nada se envía a ningún servidor.

export const VERSION_APP = '0.1.0';

// Columnas del registro, en este orden. Solo se guardan estas columnas: cualquier
// otro campo (por ejemplo, un nombre) se descarta al agregar el registro.
export const COLUMNS = [
  'sesion_id', 'bloque', 'ensayo', 'codigo_nino', 'dispositivo', 'version_app',
  'actividad', 'version_ficha', 'item', 'banda', 'modalidad',
  'n_opciones', 'disposicion', 'pos_correcta', 'pos_distractores',
  't_consigna_inicio', 't_consigna_fin',
  't_audio_inicio', 't_audio_fin', 'audio_fuente', 'audio_latencia_ms', 'audio_fin_por_tope',
  't_opciones_insercion', 't_opciones', 't_toque', 't_retro_inicio', 't_retro_fin',
  'opcion_elegida', 'acierto', 'omision',
  'toques_fuera', 'toques_repetidos', 'perdida_foco', 'cuadros_perdidos', 'cuadros_total',
  'interrumpido', 'fallo_tecnico', 'tr_bruto_ms', 'anticipatoria', 'peso_calidad',
];

const KEY = 'neuro-blueminds.registro';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // acceso bloqueado (navegación privada o datos del sitio desactivados)
  }
}

export function createLog(storage = defaultStorage()) {
  let rows = load();
  // false si el último guardado en el dispositivo falló: hay que descargar antes de cerrar.
  let stored = true;

  function load() {
    try {
      const data = JSON.parse(storage?.getItem(KEY) ?? '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      storage?.setItem(KEY, JSON.stringify(rows));
      stored = Boolean(storage);
    } catch {
      stored = false; // sin espacio o almacenamiento bloqueado: el registro sigue en memoria
    }
  }

  return {
    add(rec) {
      const row = Object.fromEntries(COLUMNS.map((c) => [c, rec[c] ?? null]));
      rows.push(row);
      save();
      return row;
    },
    rows: () => rows.slice(),
    clear() {
      rows = [];
      save();
    },
    get stored() {
      return stored;
    },
  };
}

export function toCSV(rows) {
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))];
  // La marca BOM ayuda a que Excel abra el archivo como UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export const toJSON = (rows) => JSON.stringify(rows, null, 2);

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
