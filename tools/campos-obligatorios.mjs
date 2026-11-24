// Campos obligatorios del registro (H8.3; Arquitectura 5.1 y 13.1; RF-02): qué columna de cada
// ensayo y de cada sesión no puede quedar vacía, y en qué condición. La prueba de integración
// (test/integracion.test.js, con tools/integracion.mjs) los revisa en 500 sesiones simuladas.
//
// Columnas que pueden quedar vacías, con su motivo (README, «Arquitectura»):
// - latencia_dispositivo_ms y tr_corregido_ms: hasta medir cada tableta (H8.2);
// - t_muestra_fin: solo ACT-09; reaparicion: solo en una reaparición (Catálogo 7.2);
// - mitad_fase2: solo en la fase 2, en la actividad de la fase 2;
// - fuera_de_tarea y fuera_de_tarea_provisional: se calculan al exportar (con menos de 10 ensayos
//   con tiempo en la actividad no se calcula);
// - decodificacion_ok: solo en las pantallas que decodifican imágenes;
// - t_audio_*, audio_*: solo en AV (audio_latencia_ms, solo con voz grabada);
// - t_toque, opcion_elegida, opcion_elegida_id, tr_bruto_ms: vacíos en una omisión o una interrupción.

const siempre = (r) => true;
const conRespuesta = (r) => !r.omision && !r.interrumpido;
const enAV = (r) => r.modalidad === 'AV' && !r.interrumpido;

export const OBLIGATORIOS_ENSAYO = [
  ...[
    'sesion_id', 'bloque', 'ensayo', 'codigo_nino', 'dispositivo', 'version_app', 'actividad', 'version_ficha', 'version_parametros', 'item', 'banda',
    'modalidad', 'modo_fase', 'tema_imagenes', 'n_opciones', 'disposicion', 'pos_correcta', 'pos_distractores', 't_consigna_inicio', 't_consigna_fin',
    't_opciones_insercion', 't_opciones', 't_retro_inicio', 't_retro_fin', 'acierto', 'omision', 'toques_fuera', 'toques_repetidos', 'perdida_foco',
    'cuadros_perdidos', 'cuadros_total', 'periodo_cuadro_ms', 'interrumpido', 'fallo_tecnico', 'anticipatoria', 'peso_calidad', 'sonda',
  ].map((c) => [c, siempre, 'siempre']),
  ...['t_toque', 'opcion_elegida', 'opcion_elegida_id', 'tr_bruto_ms'].map((c) => [c, conRespuesta, 'con respuesta']),
  ...['t_audio_inicio', 't_audio_fin', 'audio_fuente', 'audio_fin_por_tope'].map((c) => [c, enAV, 'en AV']),
  ['mitad_fase2', (r) => r.modo_fase === 'fase2' && r.actividad === 'ACT-02', 'en la fase 2, en ACT-02'],
];

// De cada sesión: lo que llenan la lógica de la sesión y el cierre (no la interfaz).
const enModo = (...modos) => (s) => modos.includes(s.modo_fase);
export const OBLIGATORIOS_SESION = [
  ...['sesion_id', 'codigo_nino', 'dispositivo', 'inicio', 'ensayos', 'pausas', 'terminada_antes', 'nivel_apoyo', 'modo_fase', 'plan_sesion', 'version_indicadores', 'huella_parametros', 'ordenes_terapeuta', 'duracion_uso_ms', 'alerta_temprana', 'tema_imagenes'].map((c) => [c, siempre, 'siempre']),
  ...['fase2_version', 'fase2_sesion', 'fase2_bloque', 'fase2_primera'].map((c) => [c, enModo('fase2'), 'en la fase 2']),
  ...['adaptacion_propuestas', 'envolvente_bloqueos', 'aviso_bloqueos'].map((c) => [c, enModo('fase3'), 'en la fase 3']),
  ...['escalera_familiarizacion', 'banda_inicial_propuesta', 'ensayos_inclusion', 'aviso_inclusion'].map((c) => [c, enModo('familiarizacion'), 'en la familiarización']),
];

// De cada decisión de la regla de adaptación (para reproducirla, H6.4).
export const OBLIGATORIOS_DECISION = ['bloque', 'actividad', 'accion', 'regla', 'banda_actual', 'banda_propuesta', 'ejecutada', 'pausa_ofrecida', 'banda_resultante', 'ensayos_validos', 'uso_ms', 'adaptacion_activa', 'version_regla'];

const vacio = (v) => v === null || v === undefined || v === '';

// Campos vacíos: [{ tipo, id, campo, condicion }].
export function camposVacios({ ensayos, sesiones }) {
  const out = [];
  ensayos.forEach((r, k) => {
    for (const [c, aplica, condicion] of OBLIGATORIOS_ENSAYO) if (aplica(r) && vacio(r[c])) out.push({ tipo: 'ensayo', id: `${r.sesion_id}#${k}`, campo: c, condicion });
  });
  for (const s of sesiones) {
    for (const [c, aplica, condicion] of OBLIGATORIOS_SESION) if (aplica(s) && vacio(s[c])) out.push({ tipo: 'sesion', id: s.sesion_id, campo: c, condicion });
    (s.adaptacion_propuestas ?? []).forEach((d, j) => {
      for (const c of OBLIGATORIOS_DECISION) if (vacio(d[c])) out.push({ tipo: 'decision', id: `${s.sesion_id}#${j + 1}`, campo: c, condicion: 'siempre' });
    });
  }
  return out;
}
