// Pantalla de ACT-03 «Palabra escrita e imagen»: arriba, la palabra o la frase escrita;
// abajo, los dibujos, como en la pantalla de selección. Solo dibuja; el motor registra.
import * as seleccion from './seleccion.js';
import { esc, miniatura } from '../html.js';

export const toTrials = seleccion.toTrials;

export function createView(stage, images) {
  const base = seleccion.createView(stage, images);
  return {
    ...base,
    // La palabra es el estímulo: es el único texto que ve el niño en toda la aplicación.
    showPrompt(consigna) {
      const box = document.createElement('div');
      box.className = 'consigna-texto';
      box.lang = 'es';
      box.textContent = consigna.texto;
      stage.append(box);
    },
  };
}

// Para la galería y la vista previa del inicio.
export const consignaHTML = (consigna) => `<span class="dib-palabra" lang="es">${esc(consigna.texto)}</span>`;
export const opcionHTML = (o) => miniatura(o.src);
export const consignaTexto = (it) => `Palabra escrita: «${it.consigna.texto}»`;
