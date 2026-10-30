// Pantalla de selección (ACT-01 y ACT-02): la consigna arriba y las opciones abajo,
// en la disposición de la banda. Solo dibuja; el motor decide cuándo y registra.
import { itemKey } from '../engine/selector.js';

// Cada ítem es un ensayo. «clave» sirve para no repetir conceptos en la sesión.
export const toTrials = (items) =>
  items.map((it) => ({ codigo: it.codigo, consigna: it.consigna, opciones: it.opciones, clave: itemKey(it) }));

// images: imágenes ya cargadas al empezar el bloque.
export function createView(stage, images) {
  const picture = (src) => {
    const img = images.get(src)?.cloneNode() ?? Object.assign(new Image(), { src });
    img.alt = '';
    img.draggable = false;
    img.decoding = 'sync'; // nunca se pinta un cuadro sin la imagen
    return img;
  };
  // Las posiciones se numeran por filas, de izquierda a derecha y de arriba abajo.
  const build = (opciones, disposicion) => {
    const [filas, columnas] = disposicion.split('x').map(Number);
    const el = document.createElement('div');
    el.className = 'opciones';
    el.style.setProperty('--filas', filas);
    el.style.setProperty('--columnas', columnas);
    opciones.forEach((o, k) => {
      const cell = document.createElement('div');
      cell.className = 'opcion';
      cell.dataset.pos = k + 1;
      cell.append(picture(o.src));
      el.append(cell);
    });
    return el;
  };
  let grid = null;
  let next = null; // opciones armadas y decodificadas durante la consigna

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
    // Se decodifican los mismos elementos que después se insertan.
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
