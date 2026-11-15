// Cuándo se puede abrir la pausa guiada (ACT-17): solo en una sesión en modo experto, y nunca
// durante una sesión del piloto. El Catálogo (7.1) la ofrece solo fuera del piloto, y su
// contenido es una propuesta sin revisión clínica.
import { esPiloto } from './catalogo.js';

export const PAUSA_SOLO_EXPERTO =
  'La pausa guiada (ACT-17) solo se abre en una sesión en modo experto, y nunca durante una sesión del piloto ni en un bloque de una actividad del piloto.';

// sesion: la sesión en curso (o null). ficha: la del bloque en curso, si hay uno.
export function pausaGuiadaPermitida({ sesion = null, ficha = null } = {}) {
  if (!sesion?.experto) return false;
  return !(ficha && esPiloto(ficha.id));
}
