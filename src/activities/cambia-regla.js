// Pantalla de ACT-07 «Cambia la regla»: arriba, la tarjeta con el símbolo de la regla;
// abajo, dos cajas fijas con una figura cada una. Solo dibuja; el motor registra.

export const COLORES = { azul: '#1f6fd1', amarillo: '#f5c518' };
const CONTORNO = '#2b2b2b';
const GRIS = '#9aa0a6';

// Figuras de silueta clara en un lienzo de 100 × 100. «detalle» va encima del color.
const FIGURAS = {
  conejo: {
    silueta: `<ellipse cx="36" cy="22" rx="6" ry="17" transform="rotate(-15 36 22)"/>
      <ellipse cx="49" cy="20" rx="6" ry="17" transform="rotate(12 49 20)"/>
      <circle cx="40" cy="46" r="14"/><ellipse cx="60" cy="68" rx="26" ry="20"/>
      <circle cx="86" cy="64" r="7"/><ellipse cx="48" cy="86" rx="13" ry="5"/>`,
    detalle: `<circle cx="35" cy="44" r="2.4" fill="${CONTORNO}"/>`,
  },
  barco: {
    silueta: `<path d="M8 64 H92 L78 84 H22 Z"/><rect x="47" y="12" width="5" height="52"/>
      <path d="M53 14 L84 58 H53 Z"/><path d="M46 22 L20 58 H46 Z"/>`,
    detalle: '',
  },
  flor: {
    silueta: `<rect x="47" y="50" width="6" height="42"/>
      <ellipse cx="64" cy="76" rx="13" ry="6" transform="rotate(-30 64 76)"/>
      <circle cx="50" cy="21" r="12"/><circle cx="63" cy="29" r="12"/><circle cx="63" cy="44" r="12"/>
      <circle cx="50" cy="51" r="12"/><circle cx="37" cy="44" r="12"/><circle cx="37" cy="29" r="12"/>
      <circle cx="50" cy="36" r="12"/>`,
    detalle: `<circle cx="50" cy="36" r="8" fill="none" stroke="${CONTORNO}" stroke-width="3"/>`,
  },
  carro: {
    silueta: `<rect x="6" y="50" width="88" height="22" rx="8"/><path d="M24 50 L34 30 H66 L78 50 Z"/>`,
    detalle: `<path d="M37 34 H48 V48 H29 Z M52 34 H64 L73 48 H52 Z" fill="#eaf2fb"/>
      <circle cx="28" cy="74" r="11" fill="${CONTORNO}"/><circle cx="72" cy="74" r="11" fill="${CONTORNO}"/>
      <circle cx="28" cy="74" r="4" fill="#d9d9d9"/><circle cx="72" cy="74" r="4" fill="#d9d9d9"/>`,
  },
};

// Contorno oscuro alrededor de la silueta: primero la silueta ensanchada en oscuro,
// después la silueta en su color. Así el amarillo contrasta en ambos temas.
function figura(forma, fill) {
  const { silueta, detalle } = FIGURAS[forma];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g fill="${CONTORNO}" stroke="${CONTORNO}" stroke-width="6" stroke-linejoin="round">${silueta}</g>
    <g fill="${fill}">${silueta}</g>${detalle}</svg>`;
}

export const figuraSVG = (forma, color) => figura(forma, COLORES[color]);

// Símbolo de la regla: una mancha de colores (por color) o la silueta gris de la tarjeta (por forma).
// La mancha es mitad azul y mitad amarilla, para no favorecer a ninguna caja.
export function simboloSVG(regla, forma) {
  if (regla === 'forma') return figura(forma, GRIS);
  const mancha = 'M50 10 C68 6 90 20 88 42 C94 62 78 90 54 88 C34 94 8 80 12 56 C4 34 28 12 50 10 Z';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="nbm-mancha"><stop offset="50%" stop-color="${COLORES.azul}"/><stop offset="50%" stop-color="${COLORES.amarillo}"/></linearGradient></defs>
    <path d="${mancha}" fill="url(#nbm-mancha)" stroke="${CONTORNO}" stroke-width="4" stroke-linejoin="round"/></svg>`;
}

// Convierte las secuencias del bloque en ensayos para el motor, con la pareja de cajas de la sesión.
// La tarjeta toma la forma de una caja y el color de la otra.
export function toTrials(secuencias, { banda, pareja }) {
  const trials = [];
  let previa = null;
  for (const seq of secuencias) {
    for (const e of seq.ensayos) {
      const cambio = previa !== null && e.regla !== previa;
      const tarjeta = { forma: pareja[e.tarjeta.forma - 1].forma, color: pareja[e.tarjeta.color - 1].color };
      trials.push({
        codigo: e.codigo,
        regla: e.regla,
        cambio,
        anuncio: banda.anunciarCambio && cambio ? { regla: e.regla, forma: tarjeta.forma } : null,
        consigna: { ...e.consigna, regla: e.regla, tarjeta },
        opciones: pareja.map((c, k) => ({ id: `${c.forma}-${c.color}`, forma: c.forma, color: c.color, correcta: k + 1 === e.caja })),
      });
      previa = e.regla;
    }
  }
  return trials;
}

export function createView(stage) {
  let grid = null;
  const el = (cls, html) => Object.assign(document.createElement('div'), { className: cls, innerHTML: html });
  return {
    clear() {
      stage.replaceChildren();
      grid = null;
    },
    showPrompt({ regla, tarjeta }) {
      const box = el('consigna-regla', '');
      box.append(el('simbolo', simboloSVG(regla, tarjeta.forma)), el('tarjeta', figuraSVG(tarjeta.forma, tarjeta.color)));
      stage.append(box);
    },
    // Posiciones por filas, de izquierda a derecha: 1 es la caja izquierda y 2 la derecha.
    showOptions(opciones, disposicion) {
      const [filas, columnas] = disposicion.split('x').map(Number);
      grid = el('opciones cajas', '');
      grid.style.setProperty('--filas', filas);
      grid.style.setProperty('--columnas', columnas);
      opciones.forEach((o, k) => {
        const caja = el('opcion caja', figuraSVG(o.forma, o.color));
        caja.dataset.pos = k + 1;
        grid.append(caja);
      });
      stage.append(grid);
    },
    showFeedback(posCorrecta) {
      grid?.querySelector(`[data-pos="${posCorrecta}"]`)?.classList.add('marco');
    },
    // Pantalla breve con el nuevo símbolo cuando cambia la regla (B2).
    showAnnouncement({ regla, forma }) {
      this.clear();
      stage.append(el('anuncio', simboloSVG(regla, forma)));
    },
  };
}
