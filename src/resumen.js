// Líneas del resumen de un bloque, iguales en el fin de bloque y en la página «Sesiones».
// Solo describen lo registrado: conteos y medianas, sin puntajes ni interpretación.
import { summarize } from './engine/quality.js';

// cambio: en ACT-07, si en ese ensayo la regla cambió respecto al anterior.
export function lineasDelBloque(rows, ficha, { cambio } = {}) {
  return summarize(rows, ficha, { cambio });
}
