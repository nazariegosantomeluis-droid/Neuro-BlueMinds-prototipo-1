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
  'toques_fuera', 'toques_repetidos', 'perdida_foco', 'cuadros_perdidos', 'cuadros_total', 'periodo_cuadro_ms',
  'interrumpido', 'fallo_tecnico', 'tr_bruto_ms', 'latencia_dispositivo_ms', 'tr_corregido_ms',
  'anticipatoria', 'fuera_de_tarea', 'fuera_de_tarea_provisional', 'peso_calidad',
  // Al final, para que las columnas del piloto no cambien de lugar. Solo la llena ACT-09.
  't_muestra_fin',
  // Tanda 3: en la fase 2, la mitad de conceptos (A o B) del ítem de ACT-02.
  'mitad_fase2',
  // Tanda 4: sonda de generalización (Catálogo 7.3) y reaparición de la presentación distribuida
  // (1, 3 o 7 sesiones después del dominio; Catálogo 7.2).
  'sonda', 'reaparicion',
];

// Una fila por sesión (sesiones.csv).
export const SESION_COLUMNS = [
  'sesion_id', 'codigo_nino', 'dispositivo', 'inicio', 'fin', 'ensayos', 'pausas',
  'terminada_antes', 'motivo_terminacion', 'nota_terminacion', 'nivel_apoyo',
  'frecuencia_hz', 'proporcion_periodo_lento', 'advertencia_frecuencia',
  'referencia_motora_ms', 'referencia_motora_n', 'referencia_motora_anticipados', 'referencia_motora_toques',
  // Tanda 3 (H2.3): modo de fase de la sesión y, en la fase 2, versión, número de sesión, bloque del
  // análisis y modalidad que abrió. plan_sesion: los bloques planeados, en orden.
  'modo_fase', 'fase2_version', 'fase2_sesion', 'fase2_bloque', 'fase2_primera', 'plan_sesion',
  // Catálogo 7.1: cada paso de la sesión (rutinas, referencia, bloques y transiciones) con su inicio
  // y su fin en ms desde el inicio de la sesión.
  'pasos_sesion',
  // H2.4: cada orden del menú del terapeuta con su hora y el estado de la sesión.
  'ordenes_terapeuta',
  // H2.5 (INV-8): si se llegó a los 15 minutos, los bloques planeados que no se hicieron y el
  // tiempo de uso de la sesión con un niño.
  'limite_15_min', 'bloques_omitidos', 'duracion_uso_ms',
  // H2.6: registros del terapeuta al cerrar (Arquitectura 8.4; Protocolo 5.4 y 8). La sesión con un
  // niño queda incompleta (registros_completos false) hasta que se guardan.
  'participacion', 'episodios_confirmados', 'episodios_no_marcados', 'eventos_adversos',
  'consulto_panel', 'decision_informada', 'tipo_decision', 'registros_completos', 'registros_hora',
  // H2.7: tema de imágenes de la sesión (también en cada ensayo).
  'tema_imagenes',
  // Tanda 4: en la familiarización, la banda inicial de la fase 1 que el terapeuta fijó al cerrar.
  'banda_inicial_fase1',
  // Tanda 5: versión de los indicadores con que se calcula la sesión (Arquitectura 6.2) y propuestas
  // de la regla de adaptación en la fase 3 (H4.1 y H4.2; ninguna se ejecuta hasta H4.3).
  'version_indicadores', 'adaptacion_propuestas',
  // Tanda 5b (decisión R6): escalera de la familiarización, banda inicial propuesta, cambios del
  // terapeuta con su motivo y aviso del criterio de inclusión de ACT-01 (Protocolo 4).
  'escalera_familiarizacion', 'banda_inicial_propuesta', 'banda_inicial_cambios', 'ensayos_inclusion', 'aviso_inclusion',
  // Tanda 6: huella SHA-256 de los parámetros de la regla al iniciar (INV-6), acciones bloqueadas por
  // la envolvente y aviso a los 3 bloqueos (Arquitectura 7.4) y señales de alerta temprana (solo
  // observación, INV-9).
  'huella_parametros', 'envolvente_bloqueos', 'aviso_bloqueos', 'alerta_temprana',
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
