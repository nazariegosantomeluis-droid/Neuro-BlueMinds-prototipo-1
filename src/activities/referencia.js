// Pantalla de la referencia motora: un círculo liso en una de las celdas de la pantalla.
// Solo dibuja; el motor (engine/referencia.js) decide cuándo aparece y registra los toques.
import { REF_COLUMNAS } from '../engine/referencia.js';

export function createView(stage) {
  return {
    clear() {
      stage.replaceChildren();
    },
    // pos: celda numerada por filas, de izquierda a derecha y de arriba abajo. El atributo data-pos
    // hace que el toque llegue al motor con esa celda, igual que las opciones de los ensayos.
    showTarget(pos) {
      const el = document.createElement('div');
      el.className = 'objetivo';
      el.dataset.pos = pos;
      el.style.setProperty('--columna', (pos - 1) % REF_COLUMNAS);
      el.style.setProperty('--fila', Math.floor((pos - 1) / REF_COLUMNAS));
      stage.append(el);
    },
  };
}
