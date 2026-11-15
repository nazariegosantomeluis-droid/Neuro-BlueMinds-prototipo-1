// Pantalla de ACT-11 «Completa el patrón»: arriba, la serie de figuras con el último lugar
// vacío; abajo, las opciones. Solo dibuja; el motor registra.
import { COLORES } from './cambia-regla.js';

const CONTORNO = '#2b2b2b';

// Figuras geométricas en un lienzo de 100 × 100, con el mismo contorno oscuro de «Cambia la regla».
const FORMAS = {
  circulo: '<circle cx="50" cy="50" r="36"/>',
  cuadrado: '<rect x="16" y="16" width="68" height="68" rx="6"/>',
  triangulo: '<path d="M50 12 L90 84 H10 Z"/>',
  estrella: '<path d="M50 8 L60 36.2 L89.9 37 L66.2 55.3 L74.7 84 L50 67 L25.3 84 L33.8 55.3 L10.1 37 L40 36.2 Z"/>',
};
const NOMBRES = { circulo: 'círculo', cuadrado: 'cuadrado', triangulo: 'triángulo', estrella: 'estrella' };

export const figuraSVG = (forma, color) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${COLORES[color]}" stroke="${CONTORNO}" stroke-width="5" stroke-linejoin="round">${FORMAS[forma]}</g></svg>`;

// Nombre con concordancia: «círculo azul», «estrella amarilla».
export const nombreFigura = ({ forma, color }) => `${NOMBRES[forma]} ${forma === 'estrella' && color === 'amarillo' ? 'amarilla' : color}`;

export const toTrials = (items) => items.map((it) => ({ codigo: it.codigo, consigna: it.consigna, opciones: it.opciones }));

export function createView(stage) {
  let grid = null;
  const el = (cls, html = '') => Object.assign(document.createElement('div'), { className: cls, innerHTML: html });
  return {
    clear() {
      stage.replaceChildren();
      grid = null;
    },
    // La serie se lee de izquierda a derecha; el último lugar, con borde punteado, es el que falta.
    showPrompt({ serie }) {
      const box = el('serie');
      box.style.setProperty('--lugares', serie.length + 1);
      for (const f of serie) box.append(el('serie-figura', figuraSVG(f.forma, f.color)));
      box.append(el('serie-figura serie-hueco'));
      stage.append(box);
    },
    showOptions(opciones, disposicion) {
      const [filas, columnas] = disposicion.split('x').map(Number);
      grid = el('opciones');
      grid.style.setProperty('--filas', filas);
      grid.style.setProperty('--columnas', columnas);
      opciones.forEach((o, k) => {
        const celda = el('opcion opcion-figura', figuraSVG(o.forma, o.color));
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
export const consignaHTML = ({ serie }) =>
  `<span class="dib-serie">${serie.map((f) => `<span class="dib">${figuraSVG(f.forma, f.color)}</span>`).join('')}<span class="dib dib-hueco"></span></span>`;
export const opcionHTML = (o) => `<span class="dib dib-figura">${figuraSVG(o.forma, o.color)}</span>`;
export const opcionTexto = (o) => nombreFigura(o);
export const consignaTexto = (it) => `Serie de ${it.consigna.serie.length} figuras; patrón ${it.patron === '2D' ? 'de dos dimensiones' : it.patron}`;
