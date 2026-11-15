// Pantalla de ACT-09 «Recuerda y encuentra»: la muestra se ve 2 s y desaparece; después de la
// pausa en blanco de la banda aparecen las opciones. Solo dibuja; el motor decide cuándo y registra.
import * as seleccion from './seleccion.js';
import { miniatura } from '../html.js';

export const toTrials = seleccion.toTrials;

// El motor muestra las opciones cuando termina la consigna: aquí la consigna dura lo que la
// muestra más la pausa de la banda. La ficha no cambia; el bloque usa esta copia.
export const fichaDeBloque = (ficha, banda) => ({ ...ficha, consignaVMs: ficha.muestraMs + banda.demoraMs });

// La muestra la quita el motor con hidePrompt(), en el cuadro que llega a muestraMs (reloj del
// motor, alineado al cuadro); el cuadro en que ya no se ve queda en t_muestra_fin.
export function createView(stage, images) {
  const base = seleccion.createView(stage, images);
  const ocultar = () => stage.querySelector('.consigna')?.remove();
  return {
    ...base,
    hidePrompt: ocultar,
    // Las opciones nunca aparecen con la muestra a la vista.
    showOptions(opciones, disposicion) {
      ocultar();
      base.showOptions(opciones, disposicion);
    },
  };
}

const segundos = (ms) => `${ms / 1000} s`;

export const consignaHTML = (consigna) => miniatura(consigna.src);
export const opcionHTML = (o) => miniatura(o.src);
export const consignaTexto = (it, { ficha, banda }) =>
  `Muestra durante ${segundos(ficha.muestraMs)}; ${banda.demoraMs ? `pausa en blanco de ${segundos(banda.demoraMs)}` : 'sin pausa'}`;
// La vista previa dibuja la muestra y las opciones juntas; el niño nunca las ve a la vez.
export const notaPrevia = (ficha, banda) =>
  `En el bloque, la muestra se ve ${segundos(ficha.muestraMs)} y se quita; las opciones aparecen ${banda.demoraMs ? `${segundos(banda.demoraMs)} después` : 'enseguida'}.`;
