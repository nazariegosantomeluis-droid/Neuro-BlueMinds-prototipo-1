// Motivos para terminar un bloque antes de tiempo. Con terminada_antes = true el motivo es
// obligatorio; si el bloque termina normalmente, no se pide.
export const MOTIVOS_TERMINACION = [
  'Desregulación o malestar del niño',
  'Cansancio o falta de interés',
  'Petición del niño o de la familia',
  'Fallo técnico',
  'Decisión clínica',
  'Otro',
];

export const MOTIVO_OBLIGATORIO_MSG = 'Elige el motivo para terminar el bloque.';

export const faltaMotivo = (accion, motivo) => accion === 'terminar' && !MOTIVOS_TERMINACION.includes(motivo);
