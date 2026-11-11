// Pantalla de ACT-06 «Clasifica por categoría»: arriba, el dibujo; abajo, dos o tres cajas
// fijas, cada una con dos pictogramas de su categoría. Solo dibuja; el motor registra.
import { itemKey } from '../engine/selector.js';
import { miniatura } from '../html.js';

// Las cajas del bloque son las del juego de la sesión; sus pictogramas se cargan desde el inicio.
export const toTrials = (items) =>
  items.map((it) => ({
    codigo: it.codigo,
    consigna: it.consigna,
    opciones: it.opciones,
    clave: itemKey(it),
    imagenes: it.opciones.flatMap((o) => o.emblemas),
  }));

// Juego de cajas de la sesión: alterna entre sesiones, como las parejas de «Cambia la regla».
export const juegoDeSesion = (banda, numero) => numero % banda.juegos.length;

export function createView(stage, images) {
  const picture = (src) => {
    const img = images.get(src)?.cloneNode() ?? Object.assign(new Image(), { src });
    img.alt = '';
    img.draggable = false;
    img.decoding = 'sync';
    return img;
  };
  const build = (opciones, disposicion) => {
    const [filas, columnas] = disposicion.split('x').map(Number);
    const el = document.createElement('div');
    el.className = 'opciones cajas-categoria';
    el.style.setProperty('--filas', filas);
    el.style.setProperty('--columnas', columnas);
    opciones.forEach((o, k) => {
      const caja = document.createElement('div');
      caja.className = 'opcion caja-categoria';
      caja.dataset.pos = k + 1;
      caja.append(...o.emblemas.map(picture));
      el.append(caja);
    });
    return el;
  };
  let grid = null;
  let next = null;
  return {
    clear() {
      stage.replaceChildren();
      grid = next = null;
    },
    showPrompt(consigna) {
      const box = document.createElement('div');
      box.className = 'consigna';
      box.append(picture(consigna.src));
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

export const consignaHTML = (consigna) => miniatura(consigna.src);
export const opcionHTML = (o) => `<span class="dib-caja">${o.emblemas.map(miniatura).join('')}</span>`;
export const opcionTexto = (o) => `Caja de ${o.nombre.toLowerCase()}`;
export const consignaTexto = (it, { nombre }) => `Dibujo: ${nombre(it.concepto)}, ejemplar ${it.ejemplar}`;
