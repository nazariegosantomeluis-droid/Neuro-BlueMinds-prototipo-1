// Pantalla de ACT-04 «Oración e imagen»: arriba la oración, escrita (V) o dicha por la voz con una
// bocina (AV); abajo, las escenas. En la verificación (B5), arriba van la escena y la oración, y
// abajo la palomita y el tache. Solo dibuja; el motor registra. La oración escrita es el
// estímulo, como la palabra de ACT-03.
import { esc } from '../html.js';
import { escenaSVG } from './escenas.js';
import { BOCINA } from './sonido.js';

const T = '#1d2226';
// Palomita y tache, en tinta oscura: son respuestas, no retroalimentación (no van en verde ni en rojo).
export const SIMBOLOS = {
  si: `<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M44 104 L84 144 L158 60" fill="none" stroke="${T}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  no: `<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M56 56 L144 144 M144 56 L56 144" fill="none" stroke="${T}" stroke-width="22" stroke-linecap="round"/></svg>`,
};

const recortes = (escena) => [escena?.objeto?.src, escena?.figura?.src].filter(Boolean);

export const toTrials = (items) =>
  items.map((it) => ({
    codigo: it.codigo,
    consigna: it.consigna,
    opciones: it.opciones,
    imagenes: [...recortes(it.consigna.escena), ...it.opciones.flatMap((o) => recortes(o.escena))],
  }));

// En la verificación, la palomita siempre a la izquierda y el tache a la derecha.
export const fichaDeBloque = (ficha, banda) => (banda.estructura === 'verificacion' ? { ...ficha, barajarOpciones: false } : ficha);

export function createView(stage, images, { modalidad } = {}) {
  stage.classList.add('stage-oracion');
  const div = (cls, html = '') => Object.assign(document.createElement('div'), { className: cls, innerHTML: html });
  let grid = null;
  return {
    clear() {
      stage.replaceChildren();
      grid = null;
    },
    showPrompt(consigna) {
      const box = div('consigna-oracion');
      if (consigna.escena) box.append(div('consigna escena-consigna', escenaSVG(consigna.escena)));
      if (modalidad === 'AV') box.append(div('consigna consigna-bocina', BOCINA));
      else {
        const texto = div('consigna-texto');
        texto.lang = 'es';
        texto.textContent = consigna.texto;
        box.append(texto);
      }
      stage.append(box);
    },
    showOptions(opciones, disposicion) {
      const [filas, columnas] = disposicion.split('x').map(Number);
      grid = div(`opciones opciones-escenas${opciones[0]?.simbolo ? ' opciones-simbolos' : ''}`);
      grid.style.setProperty('--filas', filas);
      grid.style.setProperty('--columnas', columnas);
      opciones.forEach((o, k) => {
        const celda = div(`opcion ${o.simbolo ? 'opcion-figura' : 'opcion-escena'}`, o.simbolo ? SIMBOLOS[o.simbolo] : escenaSVG(o.escena));
        celda.dataset.pos = k + 1;
        grid.append(celda);
      });
      stage.append(grid);
    },
    showFeedback(posCorrecta) {
      grid?.querySelector(`[data-pos="${posCorrecta}"]`)?.classList.add('marco');
    },
  };
}

// Para la galería y la vista previa del inicio.
export const consignaHTML = (consigna) =>
  consigna.escena
    ? `<span class="dib dib-figura">${escenaSVG(consigna.escena)}</span>`
    : `<span class="dib-palabra dib-oracion" lang="es">${esc(consigna.texto)}</span>`;
export const opcionHTML = (o) => `<span class="dib dib-figura">${o.simbolo ? SIMBOLOS[o.simbolo] : escenaSVG(o.escena)}</span>`;
export const opcionTexto = (o) => (o.simbolo ? (o.simbolo === 'si' ? 'palomita' : 'tache') : o.texto);
export const consignaTexto = (it) => `Oración: «${it.consigna.texto}»${it.consigna.escena ? ` · la escena ${it.consigna.verdadera ? 'sí' : 'no'} lo muestra` : ''}`;
export const notaPrevia = (ficha, banda) =>
  banda.estructura === 'verificacion'
    ? 'En V, la oración va escrita junto a la escena; en AV la dice la voz.'
    : 'En V la oración va escrita arriba; en AV la dice la voz y arriba se ve una bocina.';
