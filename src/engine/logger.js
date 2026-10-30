// Registro por ensayo y por sesión. Vive en memoria y en localStorage del
// dispositivo; se exporta a CSV y JSON. Nada se envía a ningún servidor.
// Los tiempos se exportan redondeados a 0.1 ms; en memoria se guarda el valor completo.

export const VERSION_APP = '0.1.0';

// Columnas del registro, en este orden. Solo se guardan estas columnas: cualquier
// otro campo (por ejemplo, un nombre) se descarta al agregar el registro.
export const COLUMNS = [
  'sesion_id', 'bloque', 'ensayo', 'codigo_nino', 'dispositivo', 'version_app',
  'actividad', 'version_ficha', 'version_parametros', 'item', 'banda', 'modalidad', 'modo_fase', 'tema_imagenes',
  'n_opciones', 'disposicion', 'pos_correcta', 'pos_distractores',
  't_consigna_inicio', 't_consigna_fin',
  't_audio_inicio', 't_audio_fin', 'audio_fuente', 'audio_latencia_ms', 'audio_fin_por_tope',
  't_opciones_insercion', 't_opciones', 'decodificacion_ok', 't_toque', 't_retro_inicio', 't_retro_fin',
  'opcion_elegida', 'opcion_elegida_id', 'acierto', 'omision',
  'toques_fuera', 'toques_repetidos', 'perdida_foco', 'cuadros_perdidos', 'cuadros_total',
  'interrumpido', 'fallo_tecnico', 'tr_bruto_ms', 'latencia_dispositivo_ms', 'tr_corregido_ms',
  'anticipatoria', 'fuera_de_tarea', 'peso_calidad',
];

// Una fila por sesión (sesiones.csv).
export const SESION_COLUMNS = [
  'sesion_id', 'codigo_nino', 'dispositivo', 'inicio', 'fin', 'ensayos', 'pausas',
  'terminada_antes', 'motivo_terminacion', 'nivel_apoyo', 'referencia_motora_ms',
];

const KEY = 'neuro-blueminds.registro';
export const SESION_KEY = 'neuro-blueminds.sesiones';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // acceso bloqueado (navegación privada o datos del sitio desactivados)
  }
}

export function createLog(storage = defaultStorage(), { key = KEY, columns = COLUMNS } = {}) {
  let rows = load();
  // false si el último guardado en el dispositivo falló: hay que descargar antes de cerrar.
  let stored = true;

  function load() {
    try {
      const data = JSON.parse(storage?.getItem(key) ?? '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      storage?.setItem(key, JSON.stringify(rows));
      stored = Boolean(storage);
    } catch {
      stored = false; // sin espacio o almacenamiento bloqueado: el registro sigue en memoria
    }
  }

  return {
    add(rec) {
      const row = Object.fromEntries(columns.map((c) => [c, rec[c] ?? null]));
      rows.push(row);
      save();
      return row;
    },
    // Cambia filas ya guardadas: fn recibe todas las filas y modifica las que necesite.
    edit(fn) {
      fn(rows);
      save();
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

// Tiempos: t (en toques_fuera), t_* y *_ms. Solo ellos se redondean a 0.1 ms.
const esTiempo = (k) => k === 't' || k.startsWith('t_') || k.endsWith('_ms');
const redondear = (k, v) => (typeof v === 'number' && esTiempo(k) ? Math.round(v * 10) / 10 : v);

export function toCSV(rows, columns = COLUMNS) {
  const cell = (c, v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v, redondear) : String(redondear(c, v));
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [columns.join(','), ...rows.map((r) => columns.map((c) => cell(c, r[c])).join(','))];
  // La marca BOM ayuda a que Excel abra el archivo como UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export const toJSON = (rows) => JSON.stringify(rows, redondear, 2);

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
