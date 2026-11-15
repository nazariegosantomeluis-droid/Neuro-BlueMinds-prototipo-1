// Pantalla de ACT-05 «Sonido e imagen»: arriba, una bocina mientras suena el sonido; abajo, los
// dibujos, como en la pantalla de selección. Solo dibuja; el motor reproduce el sonido y registra.
import * as seleccion from './seleccion.js';
import { esc, miniatura } from '../html.js';

// Una bocina con ondas, en gris: dice «escucha» sin texto. La usan ACT-05 y ACT-15.
export const BOCINA = `<svg viewBox="0 0 200 200" aria-hidden="true" fill="none" stroke="#5b6168" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
  <path d="M40 80h28l40-32v104l-40-32H40z" fill="#c9ced3"/>
  <path d="M132 76a34 34 0 010 48M150 56a62 62 0 010 88"/>
</svg>`;

export const toTrials = seleccion.toTrials;

export function createView(stage, images) {
  const base = seleccion.createView(stage, images);
  return {
    ...base,
    showPrompt() {
      const box = document.createElement('div');
      box.className = 'consigna consigna-bocina';
      box.innerHTML = BOCINA;
      stage.append(box);
    },
  };
}

// Para la galería y la vista previa del inicio.
export const consignaHTML = () => `<span class="dib dib-figura">${BOCINA}</span>`;
export const opcionHTML = (o) => miniatura(o.src);
export const consignaTexto = (it, { nombre }) => `Sonido: ${nombre(it.concepto)} (grabación ${it.grabacion})`;
// La galería lleva un reproductor para escuchar cada sonido. En el archivo único, los sonidos van
// dentro de la página y __rutaImagen da su dirección.
const rutaAudio = (clave) => {
  const ruta = `assets/audio/${clave}.mp3`;
  return globalThis.__rutaImagen?.(ruta) ?? ruta;
};
export const escucharHTML = (it) => `<audio class="item-audio" controls preload="none" src="${esc(rutaAudio(it.consigna.audio))}"></audio>`;
