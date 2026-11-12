// Escenas de ACT-04 «Oración e imagen», dibujadas con código: un niño o una niña haciendo algo
// (con objetos y animales recortados de los dibujos del banco) o un animal en un lugar respecto de
// una caja o una mesa. Mismo estilo que los dibujos: colores planos y contorno oscuro. Sin texto:
// aria-hidden. Las rutas de los recortes vienen en los datos del ítem.

const T = '#1d2226';

// Personajes: el niño con pelo corto y pantalón; la niña con coletas y falda. Cada ítem fija su
// piel, su pelo y su ropa, y los usa en todas sus opciones.
export const LOOKS = [
  { piel: '#f2c9a0', pelo: '#3b2414', camisa: '#2f7fc1', abajo: '#3b4a6b' },
  { piel: '#c98d5c', pelo: '#1d1d1d', camisa: '#e69f00', abajo: '#5b4636' },
  { piel: '#8d5a3a', pelo: '#1d1d1d', camisa: '#8e6bbf', abajo: '#3b4a6b' },
  { piel: '#e3b38a', pelo: '#6b3e1f', camisa: '#2a9d8f', abajo: '#4a4a4a' },
];

// Una extremidad con contorno: primero el trazo oscuro, encima el color.
const extremidad = (puntos, color, ancho) => {
  const d = `M${puntos.map((p) => p.join(' ')).join(' L')}`;
  return `<path d="${d}" fill="none" stroke="${T}" stroke-width="${ancho + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const imagen = (src, x, y, lado, giro = 0) =>
  `<image href="${src}" x="${x - lado / 2}" y="${y - lado / 2}" width="${lado}" height="${lado}" preserveAspectRatio="xMidYMid meet"${giro ? ` transform="rotate(${giro} ${x} ${y})"` : ''}/>`;

// Posturas: dónde quedan los codos, las manos, las rodillas y los pies (de pie, el cuerpo va de
// la cabeza en y = 40 a los pies en y = 182). «sube» levanta todo el cuerpo (al saltar).
const POSTURAS = {
  parado: { brazos: [[[80, 100], [76, 124]], [[120, 100], [124, 124]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]] },
  come: { brazos: [[[80, 100], [76, 124]], [[128, 98], [116, 72]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]], mano: [124, 60, 78] },
  bebe: { brazos: [[[80, 100], [76, 124]], [[130, 96], [118, 70]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]], mano: [120, 56, 66] },
  corre: { brazos: [[[74, 92], [66, 108]], [[122, 102], [132, 86]]], piernas: [[[86, 150], [70, 166]], [[112, 148], [116, 180]]], inclina: 6, lineas: true },
  salta: { brazos: [[[78, 64], [72, 40]], [[122, 64], [128, 40]]], piernas: [[[88, 148], [90, 164]], [[112, 148], [110, 164]]], sube: 16, sombra: true },
  peina: { brazos: [[[80, 100], [76, 124]], [[128, 70], [118, 24]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]], mano: [122, 22, 66, -24] },
  barre: { brazos: [[[84, 102], [112, 112]], [[120, 100], [128, 128]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]], escoba: true },
  telefono: { brazos: [[[80, 100], [76, 124]], [[130, 84], [120, 46]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]], mano: [128, 46, 58] },
  abraza: { brazos: [[[82, 104], [96, 116]], [[118, 104], [104, 116]]], piernas: [[[94, 152], [93, 180]], [[106, 152], [107, 180]]], abrazo: true },
};

function persona(sujeto, look, accion, objeto) {
  const p = POSTURAS[accion];
  const dy = -(p.sube ?? 0);
  const ninia = sujeto === 'nina';
  const cara = (x, y, cerrados) =>
    cerrados
      ? `<path d="M${x - 11} ${y - 2} q4 4 8 0 M${x + 3} ${y - 2} q4 4 8 0" fill="none" stroke="${T}" stroke-width="3"/>`
      : `<circle cx="${x - 8}" cy="${y - 3}" r="3.4" fill="${T}"/><circle cx="${x + 8}" cy="${y - 3}" r="3.4" fill="${T}"/><path d="M${x - 7} ${y + 8} q7 6 14 0" fill="none" stroke="${T}" stroke-width="3"/>`;
  const pelo = ninia
    ? `<circle cx="72" cy="38" r="9" fill="${look.pelo}" stroke="${T}" stroke-width="4"/><circle cx="128" cy="38" r="9" fill="${look.pelo}" stroke="${T}" stroke-width="4"/>
       <path d="M76 44 C76 20 124 20 124 44 C116 34 102 30 88 34 C84 36 80 40 76 44 Z" fill="${look.pelo}" stroke="${T}" stroke-width="4"/>`
    : `<path d="M76 44 C74 18 126 18 124 42 C118 34 108 30 96 32 C88 34 80 38 76 44 Z" fill="${look.pelo}" stroke="${T}" stroke-width="4"/>`;
  const piernaColor = ninia ? look.piel : look.abajo;
  const piernas = p.piernas.map(([rodilla, pie], i) => extremidad([[i ? 106 : 94, 124], rodilla, pie], piernaColor, 13)).join('');
  const zapatos = p.piernas.map(([, pie], i) => `<ellipse cx="${pie[0] + (i ? 4 : -4)}" cy="${pie[1] + 3}" rx="10" ry="6" fill="#2b2b2b" stroke="${T}" stroke-width="3"/>`).join('');
  const falda = ninia ? `<path d="M84 116 L116 116 L124 146 L76 146 Z" fill="${look.abajo}" stroke="${T}" stroke-width="4"/>` : `<path d="M86 116 L114 116 L114 132 L86 132 Z" fill="${look.abajo}" stroke="${T}" stroke-width="4"/>`;
  const torso = `<path d="M84 74 C84 70 116 70 116 74 L118 120 L82 120 Z" fill="${look.camisa}" stroke="${T}" stroke-width="4"/>`;
  const brazos = p.brazos.map(([codo, mano], i) => {
    const hombro = [i ? 114 : 86, 80];
    return `${extremidad([hombro, codo], look.camisa, 11)}${extremidad([codo, mano], look.piel, 10)}<circle cx="${mano[0]}" cy="${mano[1]}" r="6.5" fill="${look.piel}" stroke="${T}" stroke-width="3"/>`;
  });
  const cabeza = `<circle cx="100" cy="46" r="24" fill="${look.piel}" stroke="${T}" stroke-width="4"/>${pelo}${cara(100, 48, false)}`;
  let enMano = '';
  if (p.mano && objeto) enMano = imagen(objeto.src, p.mano[0], p.mano[1], p.mano[2], p.mano[3] ?? -10);
  if (p.escoba && objeto) enMano = imagen(objeto.src, 134, 122, 170, -30);
  const abrazado = p.abrazo && objeto ? imagen(objeto.src, 100, 108, 118) : '';
  const lineas = p.lineas ? `<path d="M34 92 h18 M28 108 h22 M36 124 h16" stroke="#9aa4ad" stroke-width="5" stroke-linecap="round"/>` : '';
  const sombra = p.sombra ? `<ellipse cx="100" cy="190" rx="30" ry="5" fill="#cfd3d6"/>` : '';
  const cuerpo = `${piernas}${zapatos}${falda}${torso}${brazos[0]}${p.escoba ? '' : brazos[1]}${cabeza}${abrazado}${p.abrazo ? brazos.join('') : ''}${enMano}${p.escoba ? brazos[1] : ''}`;
  return `${sombra}${lineas}<g transform="translate(0 ${dy})${p.inclina ? ` rotate(${p.inclina} 100 120)` : ''}">${cuerpo}</g>`;
}

// Dormir: en la cama, con la almohada y una cobija; ojos cerrados.
function dormido(sujeto, look, almohada) {
  const ninia = sujeto === 'nina';
  return `
    <rect x="18" y="128" width="168" height="34" rx="6" fill="#c69c6d" stroke="${T}" stroke-width="5"/>
    <path d="M24 162 v22 M180 162 v22" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    ${almohada ? imagen(almohada.src, 50, 116, 64) : ''}
    ${ninia ? `<circle cx="30" cy="96" r="8" fill="${look.pelo}" stroke="${T}" stroke-width="4"/>` : ''}
    <circle cx="54" cy="104" r="20" fill="${look.piel}" stroke="${T}" stroke-width="4"/>
    <path d="M36 98 C36 80 66 76 72 90 C64 86 52 86 44 92 Z" fill="${look.pelo}" stroke="${T}" stroke-width="4"/>
    <path d="M45 104 q4 4 8 0 M58 104 q4 4 8 0" fill="none" stroke="${T}" stroke-width="3"/>
    <path d="M74 98 C120 86 170 92 182 104 L182 132 L74 132 Z" fill="${look.camisa}" stroke="${T}" stroke-width="5"/>
    <path d="M90 104 C120 96 150 98 170 106" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="5"/>`;
}

// Caja y mesa para las relaciones de lugar.
const CAJA_ATRAS = `<path d="M56 112 L144 112 L156 100 L68 100 Z" fill="#c8945a" stroke="${T}" stroke-width="5"/>`;
const CAJA_FRENTE = `<rect x="56" y="112" width="88" height="66" fill="#d9a66b" stroke="${T}" stroke-width="5"/><path d="M144 112 L156 100 L156 166 L144 178 Z" fill="#b98247" stroke="${T}" stroke-width="5"/>`;
const MESA = `<rect x="34" y="96" width="132" height="14" rx="3" fill="#a8743f" stroke="${T}" stroke-width="5"/><path d="M46 110 V182 M154 110 V182" stroke="${T}" stroke-width="12" stroke-linecap="round"/><path d="M46 110 V182 M154 110 V182" stroke="#a8743f" stroke-width="7" stroke-linecap="round"/>`;
const PISO = '<path d="M14 186 H186" stroke="#c9c3b6" stroke-width="5" stroke-linecap="round"/>';

function lugar(figura, referencia, relacion) {
  const f = (x, y, lado) => imagen(figura.src, x, y, lado);
  if (referencia === 'caja') {
    if (relacion === 'dentro') return `${PISO}${CAJA_ATRAS}${f(100, 84, 112)}${CAJA_FRENTE}`;
    if (relacion === 'arriba') return `${PISO}${CAJA_ATRAS}${CAJA_FRENTE}${f(104, 58, 104)}`;
    return `${PISO}<g transform="translate(-34 0)">${CAJA_ATRAS}${CAJA_FRENTE}</g>${f(158, 138, 96)}`; // al lado
  }
  if (relacion === 'arriba') return `${PISO}${MESA}${f(100, 57, 100)}`;
  if (relacion === 'abajo') return `${PISO}${MESA}${f(100, 148, 82)}`;
  return `${PISO}<g transform="translate(-30 0) scale(0.86) translate(10 26)">${MESA}</g>${f(160, 145, 90)}`; // al lado
}

// Una escena completa, en un cuadro de 200 × 200.
export function escenaSVG(e) {
  let cuerpo;
  if (e.tipo === 'lugar') cuerpo = lugar(e.figura, e.referencia, e.relacion);
  else if (e.accion === 'duerme') cuerpo = dormido(e.sujeto, LOOKS[e.look], e.objeto);
  else cuerpo = `${PISO}${persona(e.sujeto, LOOKS[e.look], e.accion, e.objeto)}`;
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${cuerpo}</svg>`;
}
