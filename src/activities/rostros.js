// Rostros dibujados y pictogramas de las emociones de ACT-14 «Reconoce la emoción».
// Todo se dibuja con código en un lienzo de 200 × 200: no hay fotografías ni personas reales.
// Seis personajes de distinta edad, género y tono de piel; cuatro emociones en dos intensidades.
// Son una propuesta: un clínico debe confirmar que cada expresión se reconoce sin dudar.

const CONTORNO = '#2b2b2b';
const BOCA = '#6e2a2a';
const LENGUA = '#e0807e';
const BLANCO = '#ffffff';

export const EMOCIONES = ['alegria', 'tristeza', 'enojo', 'miedo'];
export const NOMBRE_EMOCION = { alegria: 'alegría', tristeza: 'tristeza', enojo: 'enojo', miedo: 'miedo' };

export const PERSONAJES = {
  'nina-1': { nombre: 'niña de coletas', piel: '#e3b28c', pelo: '#2a2320', ceja: '#2a2320', peinado: 'coletas', ropa: '#9cc3dd', infantil: true },
  'nino-1': { nombre: 'niño de pelo café', piel: '#f6d5be', pelo: '#7a4a2a', ceja: '#5f3920', peinado: 'corto', ropa: '#a9d3a5', infantil: true },
  'nina-2': { nombre: 'niña de pelo rizado', piel: '#8f5e40', pelo: '#1f1a18', ceja: '#1f1a18', peinado: 'rizado', ropa: '#f2d477', infantil: true },
  'nino-2': { nombre: 'niño de fleco', piel: '#c8936a', pelo: '#241c19', ceja: '#241c19', peinado: 'fleco', ropa: '#f0b488', infantil: true },
  mujer: { nombre: 'mujer', piel: '#d8a47c', pelo: '#4a2f22', ceja: '#3a251b', peinado: 'largo', ropa: '#c5b3e0', infantil: false },
  abuelo: { nombre: 'abuelo', piel: '#f0cbb0', pelo: '#b9bdc2', ceja: '#8d9297', peinado: 'canas', ropa: '#9fb0bd', infantil: false },
};

// Cejas, párpados y boca de cada emoción. Las cejas van de afuera hacia adentro: «afuera» y
// «adentro» son la altura de cada extremo sobre el ojo y «arco» la del centro (más es más alto).
// «parpado» baja el párpado en el lado de adentro o de afuera del ojo; «ojo» es qué tan abierto está.
const EXPRESIONES = {
  alegria: {
    alta: { cejas: { afuera: 25, adentro: 26, arco: 33 }, ojo: 'sonrisa', boca: 'risa', mejillas: true },
    baja: { cejas: { afuera: 23, adentro: 24, arco: 29 }, ojo: 0.9, boca: 'sonrisa', mejillas: true },
  },
  tristeza: {
    alta: { cejas: { afuera: 17, adentro: 31, arco: 24 }, ojo: 0.85, parpado: { adentro: 0, afuera: 9 }, mirada: 3, boca: 'puchero', lagrima: true },
    baja: { cejas: { afuera: 19, adentro: 27, arco: 23 }, ojo: 0.9, parpado: { adentro: 0, afuera: 5 }, mirada: 2, boca: 'curva-abajo' },
  },
  enojo: {
    alta: { cejas: { afuera: 29, adentro: 13, arco: 20 }, ojo: 0.9, parpado: { adentro: 9, afuera: 0 }, boca: 'dientes', cenio: true },
    baja: { cejas: { afuera: 25, adentro: 16, arco: 20 }, ojo: 0.9, parpado: { adentro: 5, afuera: 0 }, boca: 'linea' },
  },
  miedo: {
    alta: { cejas: { afuera: 29, adentro: 35, arco: 36 }, ojo: 1.3, iris: 0.8, boca: 'grito' },
    baja: { cejas: { afuera: 26, adentro: 31, arco: 31 }, ojo: 1.15, iris: 0.9, boca: 'o' },
  },
};

const trazo = (ancho = 3) => `stroke="${CONTORNO}" stroke-width="${ancho}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- Pelo ----------

function peloDetras(p) {
  if (p.peinado === 'coletas') {
    return `<g fill="${p.pelo}" ${trazo()}><ellipse cx="36" cy="112" rx="17" ry="24"/><ellipse cx="164" cy="112" rx="17" ry="24"/></g>
      <g fill="#d9534f" ${trazo(2)}><circle cx="47" cy="92" r="6"/><circle cx="153" cy="92" r="6"/></g>`;
  }
  if (p.peinado === 'rizado') {
    const rizos = [[52, 66], [62, 44], [82, 32], [104, 28], [126, 34], [144, 48], [152, 68], [44, 88], [156, 90]];
    return `<g fill="${p.pelo}" ${trazo()}>${rizos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="19"/>`).join('')}</g>`;
  }
  if (p.peinado === 'largo') {
    return `<path d="M40 100 Q34 24 100 22 Q166 24 160 100 L166 168 Q146 178 132 160 L68 160 Q54 178 34 168 Z" fill="${p.pelo}" ${trazo()}/>`;
  }
  return '';
}

function peloDelante(p, cabeza) {
  const { rx, ry, cy } = cabeza;
  const arriba = cy - ry;
  const izq = 100 - rx;
  const der = 100 + rx;
  // Mitad del ancho de la cabeza a la altura «y»: el pelo empieza y termina sobre su contorno.
  const borde = (y) => rx * Math.sqrt(1 - ((y - cy) / ry) ** 2);
  if (p.peinado === 'corto') {
    return `<path d="M${izq + 1} ${cy - 14} Q${izq - 2} ${arriba - 6} 100 ${arriba - 8} Q${der + 2} ${arriba - 6} ${der - 1} ${cy - 14} Q${der - 12} ${arriba + 16} 118 ${arriba + 13} Q96 ${arriba + 6} 78 ${arriba + 15} Q58 ${arriba + 20} ${izq + 1} ${cy - 14} Z" fill="${p.pelo}" ${trazo()}/>`;
  }
  if (p.peinado === 'fleco') {
    const y = arriba + 20;
    const b = borde(y);
    return `<path d="M${100 - b} ${y} C${izq - 6} ${arriba - 16} ${der + 6} ${arriba - 16} ${100 + b} ${y} Q100 ${y - 4} ${100 - b} ${y} Z" fill="${p.pelo}" ${trazo()}/>`;
  }
  if (p.peinado === 'coletas') {
    return `<path d="M${izq + 1} ${cy - 10} Q${izq - 2} ${arriba - 6} 100 ${arriba - 8} Q${der + 2} ${arriba - 6} ${der - 1} ${cy - 10} Q${der - 16} ${arriba + 16} 100 ${arriba + 11} Q${izq + 16} ${arriba + 16} ${izq + 1} ${cy - 10} Z" fill="${p.pelo}" ${trazo()}/>
      <path d="M100 ${arriba - 7} L100 ${arriba + 11}" fill="none" ${trazo(2)}/>`;
  }
  if (p.peinado === 'rizado') {
    const rizos = [[56, arriba + 24], [68, arriba + 11], [85, arriba + 4], [104, arriba + 2], [122, arriba + 6], [137, arriba + 14], [146, arriba + 26]];
    return `<g fill="${p.pelo}" ${trazo()}>${rizos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11.5"/>`).join('')}</g>`;
  }
  if (p.peinado === 'largo') {
    return `<path d="M${izq + 1} ${cy - 6} Q${izq - 2} ${arriba - 6} 100 ${arriba - 8} Q${der + 2} ${arriba - 6} ${der - 1} ${cy - 6} Q${der - 8} ${arriba + 22} 124 ${arriba + 11} Q96 ${arriba + 3} ${izq + 14} ${arriba + 24} Q${izq + 6} ${cy - 22} ${izq + 1} ${cy - 6} Z" fill="${p.pelo}" ${trazo()}/>`;
  }
  // Canas: un mechón a cada lado, pegado a la cabeza, y dos arrugas en la frente.
  const y1 = cy - 36;
  const y2 = cy - 6;
  const ym = (y1 + y2) / 2;
  const mechon = (lado) =>
    `<path d="M${100 + lado * borde(y1)} ${y1} Q${100 + lado * (rx + 10)} ${ym - 6} ${100 + lado * borde(y2)} ${y2} Q${100 + lado * (borde(ym) - 9)} ${ym + 2} ${100 + lado * borde(y1)} ${y1} Z"/>`;
  return `<g fill="${p.pelo}" ${trazo()}>${mechon(-1)}${mechon(1)}</g>
    <g fill="none" ${trazo(2)}><path d="M84 ${arriba + 12} Q100 ${arriba + 8} 116 ${arriba + 12}"/><path d="M88 ${arriba + 19} Q100 ${arriba + 16} 112 ${arriba + 19}"/></g>`;
}

// ---------- Ojos, cejas y boca ----------

// lado: −1 para el ojo de la izquierda de la imagen y 1 para el de la derecha.
function ojo(cx, cy, lado, e, p) {
  if (e.ojo === 'sonrisa') {
    return `<path d="M${cx - 13} ${cy + 3} Q${cx} ${cy - 13} ${cx + 13} ${cy + 3}" fill="none" ${trazo(4.5)}/>`;
  }
  const rx = 12;
  const ry = 10.5 * e.ojo;
  const iris = 7 * (e.iris ?? 1);
  const yIris = cy + 1 + (e.mirada ?? 0);
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BLANCO}" ${trazo(2.5)}/>
    <circle cx="${cx}" cy="${yIris}" r="${iris}" fill="#4a3226"/><circle cx="${cx}" cy="${yIris}" r="${iris * 0.48}" fill="#16110f"/>
    <circle cx="${cx + 2.4}" cy="${yIris - 2.6}" r="1.8" fill="${BLANCO}"/>`;
  if (e.parpado) {
    // El párpado tapa la parte de arriba del ojo; baja más de un lado que del otro.
    const xAdentro = cx - lado * (rx + 2);
    const xAfuera = cx + lado * (rx + 2);
    const borde = cy - ry + 3;
    const yAdentro = borde + e.parpado.adentro;
    const yAfuera = borde + e.parpado.afuera;
    s += `<path d="M${xAdentro} ${cy - ry - 4} L${xAfuera} ${cy - ry - 4} L${xAfuera} ${yAfuera} L${xAdentro} ${yAdentro} Z" fill="${p.piel}"/>
      <path d="M${xAdentro} ${yAdentro} L${xAfuera} ${yAfuera}" fill="none" ${trazo(3)}/>`;
  }
  return s;
}

function ceja(cx, cy, lado, e, p) {
  const xAdentro = cx - lado * 13;
  const xAfuera = cx + lado * 15;
  const { afuera, adentro, arco } = e.cejas;
  return `<path d="M${xAfuera} ${cy - afuera} Q${cx} ${cy - arco} ${xAdentro} ${cy - adentro}" fill="none" stroke="${p.ceja}" stroke-width="5.5" stroke-linecap="round"/>`;
}

function boca(tipo, y) {
  switch (tipo) {
    case 'risa':
      return `<path d="M70 ${y - 5} Q100 ${y + 7} 130 ${y - 5} Q127 ${y + 22} 100 ${y + 24} Q73 ${y + 22} 70 ${y - 5} Z" fill="${BOCA}" ${trazo()}/>
        <path d="M75 ${y - 2.5} Q100 ${y + 8} 125 ${y - 2.5} L123 ${y + 5} Q100 ${y + 14} 77 ${y + 5} Z" fill="${BLANCO}" ${trazo(1.5)}/>
        <ellipse cx="100" cy="${y + 18}" rx="12" ry="4.5" fill="${LENGUA}"/>`;
    case 'sonrisa':
      return `<path d="M80 ${y + 1} Q100 ${y + 17} 120 ${y + 1}" fill="none" ${trazo(4)}/>`;
    case 'puchero':
      return `<path d="M76 ${y + 15} Q100 ${y - 9} 124 ${y + 15}" fill="none" ${trazo(4.5)}/>
        <path d="M91 ${y + 20} Q100 ${y + 17} 109 ${y + 20}" fill="none" ${trazo(2.5)}/>`;
    case 'curva-abajo':
      return `<path d="M83 ${y + 10} Q100 ${y - 1} 117 ${y + 10}" fill="none" ${trazo(4)}/>`;
    case 'dientes':
      return `<path d="M75 ${y + 16} Q72 ${y - 6} 100 ${y - 7} Q128 ${y - 6} 125 ${y + 16} Q100 ${y + 9} 75 ${y + 16} Z" fill="${BLANCO}" ${trazo()}/>
        <path d="M76 ${y + 4} Q100 ${y + 1} 124 ${y + 4} M88 ${y - 6} L88 ${y + 12} M100 ${y - 7} L100 ${y + 11} M112 ${y - 6} L112 ${y + 12}" fill="none" ${trazo(1.6)}/>`;
    case 'linea':
      return `<path d="M82 ${y + 7} Q86 ${y + 3} 100 ${y + 3} Q114 ${y + 3} 118 ${y + 7}" fill="none" ${trazo(4)}/>`;
    case 'grito':
      return `<ellipse cx="100" cy="${y + 7}" rx="14" ry="16" fill="${BOCA}" ${trazo()}/>
        <path d="M90 ${y - 4} Q100 ${y - 9} 110 ${y - 4} Q100 ${y} 90 ${y - 4} Z" fill="${BLANCO}"/>`;
    default: // 'o'
      return `<ellipse cx="100" cy="${y + 6}" rx="9" ry="8" fill="${BOCA}" ${trazo()}/>`;
  }
}

// ---------- Rostro completo ----------

export function rostroSVG(personaje, emocion, intensidad = 'alta') {
  const p = PERSONAJES[personaje];
  const e = EXPRESIONES[emocion][intensidad];
  const cabeza = p.infantil ? { rx: 56, ry: 58, cy: 96 } : { rx: 52, ry: 62, cy: 96 };
  const yOjos = cabeza.cy + (p.infantil ? 4 : 0);
  const yBoca = cabeza.cy + (p.infantil ? 31 : 34);
  const sombra = `<ellipse cx="100" cy="${cabeza.cy + cabeza.ry - 8}" rx="${cabeza.rx - 22}" ry="5" fill="#000000" opacity="0.08"/>`;
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    ${peloDetras(p)}
    <path d="M32 200 Q36 166 76 160 L124 160 Q164 166 168 200 Z" fill="${p.ropa}" ${trazo()}/>
    <path d="M84 ${cabeza.cy + cabeza.ry - 16} L84 164 Q100 174 116 164 L116 ${cabeza.cy + cabeza.ry - 16} Z" fill="${p.piel}" ${trazo()}/>
    ${sombra}
    <g fill="${p.piel}" ${trazo()}>
      <ellipse cx="${100 - cabeza.rx + 1}" cy="${cabeza.cy + 4}" rx="8" ry="12"/><ellipse cx="${100 + cabeza.rx - 1}" cy="${cabeza.cy + 4}" rx="8" ry="12"/>
      <ellipse cx="100" cy="${cabeza.cy}" rx="${cabeza.rx}" ry="${cabeza.ry}"/>
    </g>
    ${e.mejillas ? `<g fill="#f08a8a" opacity="0.45"><circle cx="${100 - cabeza.rx + 20}" cy="${yBoca - 8}" r="9"/><circle cx="${100 + cabeza.rx - 20}" cy="${yBoca - 8}" r="9"/></g>` : ''}
    ${p.peinado === 'canas' ? `<g fill="none" ${trazo(1.8)}><path d="M${100 - cabeza.rx + 8} ${yOjos + 2} l6 -3 M${100 - cabeza.rx + 8} ${yOjos + 7} l6 1 M${100 + cabeza.rx - 8} ${yOjos + 2} l-6 -3 M${100 + cabeza.rx - 8} ${yOjos + 7} l-6 1"/></g>` : ''}
    ${ojo(78, yOjos, -1, e, p)}${ojo(122, yOjos, 1, e, p)}
    ${ceja(78, yOjos, -1, e, p)}${ceja(122, yOjos, 1, e, p)}
    ${e.cenio ? `<path d="M96 ${yOjos - 20} L97 ${yOjos - 12} M104 ${yOjos - 20} L103 ${yOjos - 12}" fill="none" ${trazo(2)}/>` : ''}
    <path d="M100 ${yOjos + 10} q-5 10 1 12" fill="none" ${trazo(2.5)}/>
    ${boca(e.boca, yBoca)}
    ${e.lagrima ? `<path d="M68 ${yOjos + 14} q-6 10 0 13 q6 -3 0 -13 Z" fill="#8ecbee" ${trazo(1.6)}/>` : ''}
    ${peloDelante(p, cabeza)}
  </svg>`;
}

// ---------- Pictogramas de las emociones ----------

// Caras esquemáticas, todas iguales salvo la expresión: son las opciones de respuesta.
const PICTOS = {
  alegria: `<path d="M56 90 Q70 70 84 90 M116 90 Q130 70 144 90" fill="none" ${trazo(7)}/>
    <path d="M56 112 Q100 164 144 112 Z" fill="${BLANCO}" ${trazo(7)}/>`,
  tristeza: `<path d="M52 80 L82 66 M148 80 L118 66" fill="none" ${trazo(7)}/>
    <circle cx="70" cy="98" r="8" fill="${CONTORNO}"/><circle cx="130" cy="98" r="8" fill="${CONTORNO}"/>
    <path d="M64 148 Q100 114 136 148" fill="none" ${trazo(7)}/>
    <path d="M62 112 q-8 14 0 18 q8 -4 0 -18 Z" fill="#8ecbee" ${trazo(2.5)}/>`,
  enojo: `<path d="M50 64 L86 82 M150 64 L114 82" fill="none" ${trazo(8)}/>
    <circle cx="72" cy="98" r="8" fill="${CONTORNO}"/><circle cx="128" cy="98" r="8" fill="${CONTORNO}"/>
    <path d="M62 150 Q60 122 100 122 Q140 122 138 150 Q100 140 62 150 Z" fill="${BLANCO}" ${trazo(6)}/>
    <path d="M82 124 L82 144 M100 122 L100 142 M118 124 L118 144" fill="none" ${trazo(3)}/>`,
  miedo: `<path d="M50 64 Q68 50 86 60 M150 64 Q132 50 114 60" fill="none" ${trazo(7)}/>
    <circle cx="70" cy="96" r="15" fill="${BLANCO}" ${trazo(5)}/><circle cx="130" cy="96" r="15" fill="${BLANCO}" ${trazo(5)}/>
    <circle cx="70" cy="96" r="5.5" fill="${CONTORNO}"/><circle cx="130" cy="96" r="5.5" fill="${CONTORNO}"/>
    <ellipse cx="100" cy="144" rx="15" ry="19" fill="${BOCA}" ${trazo(6)}/>`,
};

export const pictoEmocionSVG = (emocion) =>
  `<svg viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="84" fill="#fff6cf" ${trazo(7)}/>${PICTOS[emocion]}</svg>`;
