// Actividades que requieren la voz grabada (ficha.requiereVozGrabada, hoy solo ACT-15): con la voz
// del navegador solo se abren después de este aviso, y el motor deja sus ensayos como fallo
// técnico (peso_calidad = 0), nunca como válidos.
export const AVISO_VOZ_GRABADA =
  'Esta actividad requiere la voz grabada de una persona hablante nativa, y todavía no está. Con la voz del navegador se abre solo para revisar la mecánica: ningún ensayo queda como válido (en el registro quedan con fallo_tecnico = true y peso_calidad = 0).';

// Líneas del resumen de un bloque con ensayos hechos con la voz del navegador.
export function lineasSinVozGrabada(rows) {
  const n = rows.filter((r) => r.audio_fuente === 'sintesis').length;
  if (!n) return [];
  return [`${n === 1 ? '1 ensayo se hizo' : `${n} ensayos se hicieron`} con la voz del navegador: no ${n === 1 ? 'es válido' : 'son válidos'} porque esta actividad requiere la voz grabada, y no se cuentan abajo.`];
}
