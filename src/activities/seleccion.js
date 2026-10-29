// Pantalla de selección (ACT-01 y ACT-02): la consigna arriba y las opciones abajo,
// en la disposición de la banda. Solo dibuja; el motor decide cuándo y registra.
import { itemKey } from '../engine/selector.js';

// Cada ítem es un ensayo. «clave» sirve para no repetir conceptos en la sesión.
export const toTrials = (items) =>
  items.map((it) => ({ codigo: it.codigo, consigna: it.consigna, opciones: it.opciones, clave: itemKey(it) }));

// images: imágenes ya decodificadas, para que aparezcan en el mismo cuadro en que se insertan.
export function createView(stage, images) {
  const picture = (src) => {
    const img = images.get(src)?.cloneNode() ?? Object.assign(new Image(), { src });
    img.alt = '';
    img.draggable = false;
    return img;
  };
  let grid = null;

  return {
    clear() {
      stage.replaceChildren();
      grid = null;
    },
    showPrompt(consigna) {
      const box = document.createElement('div');
      box.className = 'consigna';
      box.append(picture(consigna.src));
      stage.append(box);
    },
    // Las posiciones se numeran por filas, de izquierda a derecha y de arriba abajo.
    showOptions(opciones, disposicion) {
      const [filas, columnas] = disposicion.split('x').map(Number);
      grid = document.createElement('div');
      grid.className = 'opciones';
      grid.style.setProperty('--filas', filas);
      grid.style.setProperty('--columnas', columnas);
      opciones.forEach((o, k) => {
        const cell = document.createElement('div');
        cell.className = 'opcion';
        cell.dataset.pos = k + 1;
        cell.append(picture(o.src));
        grid.append(cell);
      });
      stage.append(grid);
    },
    showFeedback(posCorrecta) {
      grid?.querySelector(`[data-pos="${posCorrecta}"]`)?.classList.add('marco');
    },
  };
}
