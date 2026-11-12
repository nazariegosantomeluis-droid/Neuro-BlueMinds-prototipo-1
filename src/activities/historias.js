// Historias de ACT-10 «Ordena la secuencia», dibujadas con código: cinco momentos de algo que
// cambia en un solo sentido (crece, se come, se arma, nace, se derrite o se llena), para que el
// orden no dependa de una convención. Sin texto ni archivos: aria-hidden.

const T = '#1d2226'; // contorno, como los dibujos del banco
const svg = (cuerpo) => `<svg viewBox="0 0 200 200" aria-hidden="true" stroke-linejoin="round" stroke-linecap="round">${cuerpo}</svg>`;
const piso = '<path d="M20 186h160" stroke="#b9b2a4" stroke-width="5"/>';

// 1. Una planta crece: maceta, semilla, brote, planta y flor.
function planta(e) {
  const maceta = `<path d="M58 132h84l-10 52H68z" fill="#c8693a" stroke="${T}" stroke-width="5"/><rect x="52" y="122" width="96" height="16" rx="4" fill="#d9824f" stroke="${T}" stroke-width="5"/>
    <path d="M60 124h80" stroke="#5b3a24" stroke-width="7"/>`;
  const semilla = '<ellipse cx="100" cy="114" rx="15" ry="10" fill="#8a5a2b" stroke="#1d2226" stroke-width="4"/><path d="M92 110 c4 -3 9 -3 12 0" fill="none" stroke="#c49a6c" stroke-width="3"/>';
  const tallo = (alto) => `<path d="M100 122 C98 ${122 - alto / 2} 102 ${122 - alto / 2} 100 ${122 - alto}" fill="none" stroke="#3d8b3d" stroke-width="7"/>`;
  const hoja = (x, y, lado) => `<path d="M${x} ${y} c${lado * 22} -18 ${lado * 38} -8 ${lado * 40} 2 c${-lado * 14} 14 ${-lado * 30} 12 ${-lado * 40} -2z" fill="#5cb85c" stroke="${T}" stroke-width="4"/>`;
  const flor = (y) =>
    [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="100" cy="${y - 16}" rx="10" ry="16" fill="#f0a3c4" stroke="${T}" stroke-width="4" transform="rotate(${a} 100 ${y})"/>`)
      .join('') + `<circle cx="100" cy="${y}" r="10" fill="#f5c518" stroke="${T}" stroke-width="4"/>`;
  const partes = [
    '',
    semilla,
    `${tallo(18)}${hoja(100, 108, 0.5)}${hoja(100, 108, -0.5)}`,
    `${tallo(62)}${hoja(100, 96, 1)}${hoja(100, 80, -1)}`,
    `${tallo(82)}${hoja(100, 98, 1)}${hoja(100, 84, -1)}${flor(40)}`,
  ];
  return svg(`${partes[e - 1]}${maceta}`);
}

// 2. Alguien se come una manzana: entera, una mordida, dos, la mitad y el corazón.
function manzana(e) {
  const p = (cx, cy, r, a) => `${(cx + r * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`;
  // El hueco toma el color de la tarjeta (claro u oscuro); el borde de la mordida va del lado de la fruta.
  const mordida = (cx, cy, r, desde, hasta) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill: var(--opcion-fondo, #fff)"/><path d="M${p(cx, cy, r, desde)} A${r} ${r} 0 0 1 ${p(cx, cy, r, hasta)}" fill="none" stroke="${T}" stroke-width="5"/>`;
  const rabito = `<path d="M100 56 C100 44 104 36 110 30" fill="none" stroke="#6b4423" stroke-width="7"/><path d="M106 44 c12 -14 28 -12 32 -6 c-10 10 -24 12 -32 6z" fill="#5cb85c" stroke="${T}" stroke-width="4"/>`;
  const entera = `<path d="M100 62 C126 46 160 58 160 100 C160 142 128 172 100 164 C72 172 40 142 40 100 C40 58 74 46 100 62 Z" fill="#d9413a" stroke="${T}" stroke-width="5"/><path d="M62 88 C64 76 72 70 80 68" fill="none" stroke="#f3a19c" stroke-width="7"/>`;
  if (e === 5) {
    return svg(`${rabito}<path d="M88 62 C96 72 96 80 88 92 C82 104 82 128 88 140 C96 152 96 160 88 166 L112 166 C104 160 104 152 112 140 C118 128 118 104 112 92 C104 80 104 72 112 62 Z" fill="#fbf1d0" stroke="${T}" stroke-width="5"/>
      <path d="M86 62 h28 M86 166 h28" stroke="#d9413a" stroke-width="8"/><ellipse cx="100" cy="112" rx="3" ry="6" fill="#4a2c1a"/><ellipse cx="100" cy="128" rx="3" ry="6" fill="#4a2c1a"/>`);
  }
  // Cada vez más mordidas: a la derecha, a la izquierda y, al final, casi hasta el corazón.
  const bocados = [
    [],
    [[160, 102, 22, 120, 240]],
    [[160, 102, 22, 120, 240], [40, 98, 22, -60, 60]],
    [[162, 102, 38, 115, 245], [38, 98, 38, -65, 65]],
  ][e - 1];
  const pulpa = e === 4 ? '<path d="M88 72 C80 90 80 112 86 124 C80 140 82 154 92 162 L108 162 C118 154 120 140 114 124 C120 112 120 90 112 72 Z" fill="#fbf1d0"/>' : '';
  return svg(`${rabito}${entera}${pulpa}${bocados.map((b) => mordida(...b)).join('')}`);
}

// 3. Se arma un sándwich: pan, jamón, queso, lechuga y el pan de arriba.
function sandwich(e) {
  const pan = (y) => `<path d="M34 ${y} h132 a8 8 0 0 1 8 8 v6 a8 8 0 0 1 -8 8 h-132 a8 8 0 0 1 -8 -8 v-6 a8 8 0 0 1 8 -8z" fill="#e8c27a" stroke="${T}" stroke-width="5"/>`;
  const capas = [
    `<path d="M28 146 q10 -4 20 0 q10 4 20 0 q10 -4 20 0 q10 4 20 0 q10 -4 20 0 q10 4 20 0 q10 -4 20 0 v12 h-140z" fill="#f2a1a8" stroke="${T}" stroke-width="4"/>`,
    `<path d="M32 ${138} h136 l-10 10 l-10 -6 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-6 6z" fill="#f5c518" stroke="${T}" stroke-width="4"/>`,
    `<path d="M28 132 q12 -12 24 0 q12 -12 24 0 q12 -12 24 0 q12 -12 24 0 q12 -12 24 0 q12 -12 24 0 l0 6 h-144z" fill="#5cb85c" stroke="${T}" stroke-width="4"/>`,
  ];
  const tapa = `<path d="M34 128 C34 96 166 96 166 128 Z" fill="#e8c27a" stroke="${T}" stroke-width="5"/><path d="M60 112 l6 -4 M90 106 l6 -2 M120 108 l6 2" stroke="#b98a3a" stroke-width="5"/>`;
  return svg(`${piso}${pan(158)}${capas.slice(0, Math.max(0, e - 1)).join('')}${e === 5 ? tapa : ''}`);
}

// 4. Nace un pollito: huevo, una grieta, grietas grandes, el pollito se asoma y el pollito afuera.
function pollito(e) {
  const huevo = `<path d="M100 40 C134 40 150 92 150 120 C150 150 128 170 100 170 C72 170 50 150 50 120 C50 92 66 40 100 40 Z" fill="#fbf6ea" stroke="${T}" stroke-width="5"/>`;
  const grieta1 = '<path d="M72 102 l12 10 l10 -12 l10 12 l10 -10" fill="none" stroke="#1d2226" stroke-width="4"/>';
  const grieta2 = '<path d="M56 108 l16 -6 l12 10 l10 -12 l10 12 l10 -10 l12 10 l16 -6 M94 100 l-4 -16 M118 102 l6 -14" fill="none" stroke="#1d2226" stroke-width="4"/>';
  const cuerpo = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f5c518" stroke="${T}" stroke-width="5"/>`;
  const cara = (cx, cy) => `<circle cx="${cx - 9}" cy="${cy - 4}" r="4" fill="${T}"/><circle cx="${cx + 9}" cy="${cy - 4}" r="4" fill="${T}"/><path d="M${cx - 7} ${cy + 6} l7 8 l7 -8z" fill="#f39c12" stroke="${T}" stroke-width="3"/>`;
  const mitadAbajo = `<path d="M54 118 l14 -8 l12 10 l10 -12 l10 12 l10 -10 l12 10 l14 -8 C150 150 128 170 100 170 C72 170 50 150 54 118 Z" fill="#fbf6ea" stroke="${T}" stroke-width="5"/>`;
  if (e === 1) return svg(`${piso}${huevo}`);
  if (e === 2) return svg(`${piso}${huevo}${grieta1}`);
  if (e === 3) return svg(`${piso}${huevo}${grieta2}`);
  if (e === 4) return svg(`${piso}${cuerpo(100, 100, 34)}${cara(100, 96)}${mitadAbajo}<path d="M64 74 l10 -12 l10 10 l8 -14 l8 14" fill="#fbf6ea" stroke="${T}" stroke-width="4" transform="rotate(-20 80 70)"/>`);
  return svg(`${piso}<path d="M40 176 C40 156 60 150 74 158 l-6 8 l10 4 l-4 8z" fill="#fbf6ea" stroke="${T}" stroke-width="4"/>${cuerpo(116, 136, 34)}${cuerpo(116, 90, 22)}${cara(116, 90)}<path d="M108 170 v12 M124 170 v12" stroke="#f39c12" stroke-width="5"/><path d="M84 128 c-10 -6 -14 6 -6 12" fill="#f5c518" stroke="${T}" stroke-width="4"/>`);
}

// 5. Una vela se consume: larga y encendida, cada vez más corta, y apagada con humo.
function vela(e) {
  const alto = [110, 84, 60, 36, 22][e - 1];
  const y = 176 - alto;
  const llama = `<path d="M100 ${y - 40} C112 ${y - 22} 112 ${y - 10} 100 ${y - 6} C88 ${y - 10} 88 ${y - 22} 100 ${y - 40} Z" fill="#f5a623" stroke="${T}" stroke-width="4"/><path d="M100 ${y - 24} C104 ${y - 16} 104 ${y - 12} 100 ${y - 10} C96 ${y - 12} 96 ${y - 16} 100 ${y - 24} Z" fill="#fde68a"/>`;
  const humo = `<path d="M100 ${y - 10} c-10 -10 10 -18 0 -28 c-10 -10 10 -18 0 -28" fill="none" stroke="#9aa4ad" stroke-width="5"/>`;
  return svg(`<ellipse cx="100" cy="180" rx="56" ry="10" fill="#d9d4c7" stroke="${T}" stroke-width="5"/>
    <rect x="78" y="${y}" width="44" height="${alto}" rx="4" fill="#f4f1fb" stroke="${T}" stroke-width="5"/>
    <path d="M100 ${y} v-8" stroke="${T}" stroke-width="4"/>${e === 5 ? humo : llama}
    ${e > 1 ? `<path d="M84 ${y + 2} c0 10 6 14 6 20" fill="none" stroke="#d6d0e6" stroke-width="5"/>` : ''}`);
}

// 6. Se llena un vaso con una jarra: vacío, cada vez más lleno, y lleno con la jarra ya derecha.
function vaso(e) {
  const nivel = [0, 0.25, 0.5, 0.78, 0.95][e - 1];
  const [arriba, abajo] = [96, 182];
  const h = (abajo - arriba) * nivel;
  const agua = nivel ? `<path d="M${88 - (h / (abajo - arriba)) * 0} ${abajo - h} H${152} L148 ${abajo - 4} H92 Z" fill="#8cc8ec"/>` : '';
  const vasoFig = `${agua}<path d="M84 ${arriba} H156 L148 ${abajo} H92 Z" fill="none" stroke="${T}" stroke-width="5"/>`;
  const sirviendo = e > 1 && e < 5;
  const jarra = sirviendo
    ? `<g transform="rotate(48 64 60)"><path d="M30 40 h56 l-6 70 h-44 z" fill="#e4eef5" stroke="${T}" stroke-width="5"/><path d="M86 52 c18 0 18 30 0 30" fill="none" stroke="${T}" stroke-width="5"/><path d="M36 64 h46 l-4 44 h-38z" fill="#8cc8ec"/></g>
       <path d="M116 66 C118 78 120 90 120 ${abajo - h}" fill="none" stroke="#8cc8ec" stroke-width="7"/>`
    : `<path d="M20 100 h52 l-6 76 h-40 z" fill="#e4eef5" stroke="${T}" stroke-width="5"/><path d="M72 112 c18 0 18 30 0 30" fill="none" stroke="${T}" stroke-width="5"/>${e === 1 ? '<path d="M26 120 h40 l-4 52 h-32z" fill="#8cc8ec"/>' : ''}`;
  return svg(`${piso}${jarra}${vasoFig}`);
}

// 7. Un helado se derrite: entero, con gotas, más bajo, casi todo derretido y un charco.
function helado(e) {
  const cono = '<path d="M74 104 L100 176 L126 104 Z" fill="#e0a95c" stroke="#1d2226" stroke-width="5"/><path d="M82 118 l30 30 M92 108 l26 26 M110 108 l-24 50 M120 112 l-14 28" stroke="#b9803a" stroke-width="3"/>';
  const bola = [
    `<path d="M66 106 C60 70 90 56 100 56 C110 56 140 70 134 106 Z" fill="#f2a1c0" stroke="${T}" stroke-width="5"/>`,
    `<path d="M66 106 C60 72 90 60 100 60 C110 60 140 72 134 106 C132 114 128 112 126 106 C122 118 116 116 114 108 Z" fill="#f2a1c0" stroke="${T}" stroke-width="5"/><path d="M74 108 c-2 8 0 14 4 16 M124 108 c2 10 0 16 -4 18" fill="none" stroke="#f2a1c0" stroke-width="7"/>`,
    `<path d="M68 106 C66 84 90 76 100 76 C110 76 134 84 132 106 Z" fill="#f2a1c0" stroke="${T}" stroke-width="5"/><path d="M76 108 c-4 14 -2 24 4 30 M122 108 c4 16 2 26 -4 32" fill="none" stroke="#f2a1c0" stroke-width="8"/>`,
    `<path d="M72 106 C72 96 90 92 100 92 C110 92 128 96 128 106 Z" fill="#f2a1c0" stroke="${T}" stroke-width="5"/>`,
    '',
  ][e - 1];
  const charco = e >= 3 ? `<ellipse cx="${e === 5 ? 100 : 140}" cy="184" rx="${[0, 0, 18, 30, 56][e - 1]}" ry="${[0, 0, 4, 6, 9][e - 1]}" fill="#f2a1c0" stroke="${T}" stroke-width="4"/>` : '';
  return svg(`${charco}${e === 5 ? '<path d="M70 150 l60 26 l-56 -8 z" fill="#e0a95c" stroke="#1d2226" stroke-width="5"/>' : `${cono}${bola}`}`);
}

export const HISTORIAS = {
  planta: { nombre: 'una planta crece', dibujo: planta },
  manzana: { nombre: 'alguien se come una manzana', dibujo: manzana },
  sandwich: { nombre: 'se arma un sándwich', dibujo: sandwich },
  pollito: { nombre: 'nace un pollito', dibujo: pollito },
  vela: { nombre: 'una vela se consume', dibujo: vela },
  vaso: { nombre: 'se llena un vaso', dibujo: vaso },
  helado: { nombre: 'un helado se derrite', dibujo: helado },
};

export const momentoSVG = (historia, momento) => HISTORIAS[historia].dibujo(momento);
