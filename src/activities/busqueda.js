// Pantalla de ACT-08 «Busca el objetivo»: arriba, el objetivo, que sigue a la vista; abajo,
// el conjunto de 4 a 16 dibujos con un solo objetivo. Solo dibuja; el motor registra.
import * as seleccion from './seleccion.js';
import { miniatura } from '../html.js';

export const toTrials = seleccion.toTrials;

// El conjunto ocupa casi toda la pantalla: el objetivo va arriba, más chico que en otras
// actividades (ver «.stage-busqueda» en actividades.css).
export function createView(stage, images) {
  stage.classList.add('stage-busqueda');
  return seleccion.createView(stage, images);
}

export const consignaHTML = (consigna) => miniatura(consigna.src);
export const opcionHTML = (o) => miniatura(o.src);
export const consignaTexto = (it, { nombre }) => `Objetivo: ${nombre(it.concepto)}`;
