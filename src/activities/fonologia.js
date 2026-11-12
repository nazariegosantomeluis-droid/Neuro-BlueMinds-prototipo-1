// Pantalla de ACT-15 «Sonidos de las palabras»: arriba, la bocina mientras la voz dice la
// pregunta; abajo, los dibujos o, en «¿suenan igual?», dos figuras iguales y dos distintas.
// Solo dibuja; el motor dice la consigna y registra.
import { miniatura } from '../html.js';
import { BOCINA } from './sonido.js';

const T = '#1d2226';
// «Igual»: dos círculos iguales. «Diferente»: un círculo y un triángulo, de otro color.
export const SIMBOLOS = {
  igual: `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="58" cy="100" r="36" fill="#2f7fc1" stroke="${T}" stroke-width="6"/><circle cx="142" cy="100" r="36" fill="#2f7fc1" stroke="${T}" stroke-width="6"/></svg>`,
  diferente: `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="58" cy="100" r="36" fill="#2f7fc1" stroke="${T}" stroke-width="6"/><path d="M142 62 L180 136 H104 Z" fill="#e69f00" stroke="${T}" stroke-width="6" stroke-linejoin="round"/></svg>`,
};

export const toTrials = (items) => items.map((it) => ({ codigo: it.codigo, consigna: it.consigna, opciones: it.opciones }));

// En «¿suenan igual?» las dos figuras van siempre en el mismo lugar: igual a la izquierda.
export const fichaDeBloque = (ficha, banda) => (banda.tarea === 'igual' ? { ...ficha, barajarOpciones: false } : ficha);

export function createView(stage, images) {
  const picture = (src) => {
    const img = images.get(src)?.cloneNode() ?? Object.assign(new Image(), { src });
    img.alt = '';
    img.draggable = false;
    img.decoding = 'sync';
    return img;
  };
  const div = (cls) => Object.assign(document.createElement('div'), { className: cls });
  let grid = null;
  let next = null;
  const build = (opciones, disposicion) => {
    const [filas, columnas] = disposicion.split('x').map(Number);
    const el = div('opciones');
    el.style.setProperty('--filas', filas);
    el.style.setProperty('--columnas', columnas);
    opciones.forEach((o, k) => {
      const cell = div(`opcion${o.simbolo ? ' opcion-figura' : ''}`);
      cell.dataset.pos = k + 1;
      if (o.simbolo) cell.innerHTML = SIMBOLOS[o.simbolo];
      else cell.append(picture(o.src));
      el.append(cell);
    });
    return el;
  };
  return {
    clear() {
      stage.replaceChildren();
      grid = next = null;
    },
    showPrompt() {
      const box = div('consigna consigna-bocina');
      box.innerHTML = BOCINA;
      stage.append(box);
    },
    prepareOptions(opciones, disposicion) {
      next = build(opciones, disposicion);
      return Promise.all([...next.querySelectorAll('img')].map((img) => img.decode()));
    },
    showOptions(opciones, disposicion) {
      grid = next ?? build(opciones, disposicion);
      next = null;
      stage.append(grid);
    },
    showFeedback(posCorrecta) {
      grid?.querySelector(`[data-pos="${posCorrecta}"]`)?.classList.add('marco');
    },
  };
}

// Para la galería y la vista previa del inicio.
export const consignaHTML = () => `<span class="dib dib-figura">${BOCINA}</span>`;
export const opcionHTML = (o) => (o.simbolo ? `<span class="dib dib-figura">${SIMBOLOS[o.simbolo]}</span>` : miniatura(o.src));
export const opcionTexto = (o) => (o.simbolo ? o.simbolo : null);
export const consignaTexto = (it) => `Voz: «${it.consigna.texto}»`;
export const notaPrevia = () => 'La voz es la del navegador hasta tener la voz grabada.';
