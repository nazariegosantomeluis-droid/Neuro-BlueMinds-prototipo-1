// Líneas del resumen de un bloque, iguales en el fin de bloque y en la página «Sesiones».
// Solo describen lo registrado: conteos y medianas, sin puntajes ni interpretación.
import { summarize } from './engine/quality.js';

// mod: el módulo de la pantalla. Si trae «resumen», sus líneas sustituyen a las del motor:
// lo hace «Espera la señal», donde no tocar el estímulo de «no» es la respuesta esperada.
// Si trae «resumenExtra», sus líneas van después de las del motor.
// byCode: el ensayo de cada código (en vivo, los del bloque; en «Sesiones», los del banco).
export function lineasDelBloque(rows, ficha, mod, byCode, { cambio } = {}) {
  if (mod?.resumen) return mod.resumen(rows, byCode, ficha);
  return [...summarize(rows, ficha, { cambio }), ...(mod?.resumenExtra?.(rows, byCode, ficha) ?? [])];
}
