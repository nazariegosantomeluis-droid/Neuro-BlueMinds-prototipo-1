// Pantalla de ACT-12 «Elige y descubre» (investigación): dos cofres fijos; el que toca el niño se
// abre y muestra la estrella o nada. Solo dibuja; el motor registra. Los cofres se distinguen por
// color (azul y naranja, que se distinguen con daltonismo) y por la forma del candado.
import { esc } from '../html.js';

const COLOR = {
  a: { cuerpo: '#2f7fc1', banda: '#9cc8ea', nombre: 'azul' },
  b: { cuerpo: '#e69f00', banda: '#f6d27a', nombre: 'naranja' },
};
const TINTA = '#1d2226';

const candado = (cofre, y) =>
  cofre === 'a'
    ? `<circle cx="100" cy="${y}" r="13" fill="#f3f0e6" stroke="${TINTA}" stroke-width="5"/>`
    : `<rect x="87" y="${y - 13}" width="26" height="26" rx="3" fill="#f3f0e6" stroke="${TINTA}" stroke-width="5"/>`;

const ESTRELLA =
  'M100 18l10.6 21.5 23.7 3.4-17.2 16.8 4.1 23.6L100 72.1 78.8 83.3l4.1-23.6-17.2-16.8 23.7-3.4z';

// Un cofre cerrado o abierto (con la estrella o vacío). Sin texto: aria-hidden.
export function cofreSVG(cofre, { abierto = false, premio = false } = {}) {
  const c = COLOR[cofre];
  const cuerpo = `<rect x="22" y="92" width="156" height="92" rx="10" fill="${c.cuerpo}" stroke="${TINTA}" stroke-width="5"/>
    <rect x="44" y="92" width="18" height="92" fill="${c.banda}" stroke="${TINTA}" stroke-width="4"/>
    <rect x="138" y="92" width="18" height="92" fill="${c.banda}" stroke="${TINTA}" stroke-width="4"/>`;
  if (!abierto) {
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      ${cuerpo}
      <path d="M22 96 C22 46 178 46 178 96 Z" fill="${c.cuerpo}" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M44 94 C46 66 62 58 62 58 L62 94 Z M138 94 L138 58 C138 58 154 66 156 94 Z" fill="${c.banda}" stroke="${TINTA}" stroke-width="4" stroke-linejoin="round"/>
      ${candado(cofre, 104)}
    </svg>`;
  }
  // Abierto: la tapa queda atrás, se ve el interior oscuro y, si hay premio, la estrella.
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <path d="M30 92 L40 30 L160 30 L170 92 Z" fill="${c.cuerpo}" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M40 30 L36 56 L164 56 L160 30 Z" fill="${c.banda}" stroke="${TINTA}" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="100" cy="94" rx="76" ry="14" fill="#3a2b1e" stroke="${TINTA}" stroke-width="5"/>
    ${premio ? `<path d="${ESTRELLA}" transform="translate(0 28)" fill="#f5c518" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>` : ''}
    ${cuerpo}
    ${candado(cofre, 104)}
  </svg>`;
}

// Un ítem es el programa de premios de un bloque completo: se elige uno al azar.
// El Catálogo pide 80 elecciones o más para estimar los parámetros, y un bloque tiene 40
// (Arquitectura 4.4: de 20 a 40 ensayos). Por eso dos bloques de la misma banda en una sesión se
// juntan en un solo programa de 80 elecciones. En B1 y B2 el segundo bloque sigue con el cofre que
// terminó premiando más. En B3 y B4 la ventaja pasa al otro cofre una sola vez, en la elección
// «inversionEnEleccion» de la ficha (41 por defecto): cada programa dice qué parte del programa
// de 80 es («parte») y si el cambio cae dentro del bloque («inversion») o al empezarlo
// («cambiaAlEmpezar»).
const otro = (cofre) => (cofre === 'a' ? 'b' : 'a');
export const favorableAlFinal = (it) => (it.inversion ? otro(it.favorableInicial) : it.favorableInicial);
// Cofre que debe premiar más al empezar el programa que sigue a «anterior».
const inicialTras = (siguiente, anterior) => (siguiente.cambiaAlEmpezar ? otro(favorableAlFinal(anterior)) : favorableAlFinal(anterior));

// Programas de la banda ya usados en la sesión, en orden, a partir de las filas del registro.
export function programasPrevios(items, previas = []) {
  const deEnsayo = new Map(items.flatMap((it) => it.ensayos.map((e) => [e.codigo, it])));
  const usados = [];
  for (const r of previas) {
    const it = deEnsayo.get(r.item);
    if (it && usados.at(-1) !== it) usados.push(it);
  }
  return usados;
}

// previas: las filas de esta actividad y banda ya registradas en la sesión.
export const elegir = (items, n, rand, { previas = [] } = {}) => {
  if (!items.length) throw new Error('Esta banda todavía no tiene programas de premios.');
  const usados = programasPrevios(items, previas);
  const ultimo = usados.at(-1);
  // Las bandas con inversión tienen programas para cada parte del programa de 80: el primer
  // bloque de la sesión usa la parte 1, el segundo la 2, y así.
  const partes = Math.max(1, ...items.map((i) => i.parte ?? 1));
  const parte = (usados.length % partes) + 1;
  let candidatos = items.filter((i) => (i.parte ?? 1) === parte);
  if (ultimo && (partes === 1 || parte > 1)) {
    const siguen = candidatos.filter((i) => i.favorableInicial === inicialTras(i, ultimo));
    const nuevos = siguen.filter((i) => !usados.includes(i));
    candidatos = nuevos.length ? nuevos : siguen;
  }
  return [candidatos[Math.floor(rand() * candidatos.length)]];
};

export const toTrials = (items) => items.flatMap((it) => it.ensayos.map((e) => ({ ...e })));

export function createView(stage) {
  stage.classList.add('stage-cofres');
  let grid = null;
  let opciones = [];
  let elegido = null; // posición del primer toque sobre un cofre en este ensayo
  return {
    clear() {
      stage.replaceChildren();
      grid = null;
      elegido = null;
    },
    // La pantalla queda en blanco hasta que aparecen los cofres.
    showPrompt() {},
    showOptions(lista, disposicion) {
      opciones = lista;
      const [filas, columnas] = disposicion.split('x').map(Number);
      grid = document.createElement('div');
      grid.className = 'opciones opciones-cofres';
      grid.style.setProperty('--filas', filas);
      grid.style.setProperty('--columnas', columnas);
      lista.forEach((o, k) => {
        const celda = document.createElement('div');
        celda.className = 'opcion opcion-figura opcion-cofre';
        celda.dataset.pos = k + 1;
        celda.innerHTML = cofreSVG(o.cofre);
        grid.append(celda);
      });
      // El motor registra el toque; aquí solo se recuerda qué cofre abrir.
      grid.addEventListener('pointerdown', (e) => {
        const celda = e.target.closest('[data-pos]');
        if (celda && elegido === null) elegido = Number(celda.dataset.pos);
      });
      stage.append(grid);
    },
    // No se marca el cofre que más premia: solo se abre el elegido. Sin respuesta, no se abre ninguno.
    showFeedback() {
      if (elegido === null || !grid) return;
      const o = opciones[elegido - 1];
      grid.querySelector(`[data-pos="${elegido}"]`).innerHTML = cofreSVG(o.cofre, { abierto: true, premio: o.premio });
    },
  };
}

// ---------- Resumen del bloque ----------

const veces = (n, una, varias) => (n === 1 ? `1 ${una}` : `${n} ${varias}`);

// Solo cuenta: elecciones del cofre favorable antes y después del cambio, estrellas encontradas
// y qué hizo después de encontrar la estrella o un cofre vacío.
export function resumenExtra(rows, byCode, ficha, { previas = [] } = {}) {
  const validos = rows.filter((r) => !r.interrumpido);
  const ensayo = (r) => byCode.get(r.item);
  const conEstrella = (r) => ensayo(r).opciones.find((o) => o.id === r.opcion_elegida_id)?.premio === true;
  const lineas = [];
  const fase2 = validos.filter((r) => ensayo(r).fase === 2);
  if (fase2.length) {
    const fase1 = validos.filter((r) => ensayo(r).fase === 1);
    const favorables = (rs) => rs.filter((r) => r.acierto).length;
    if (fase1.length) lineas.push(`Antes del cambio: eligió el cofre que más premiaba en ${favorables(fase1)} de ${fase1.length} ensayos.`);
    const desde = ensayo(fase2[0]);
    lineas.push(
      fase1.length
        ? `Después del cambio (desde el ensayo ${desde.n}, elección ${desde.eleccion} del programa de 80): eligió el nuevo cofre que más premiaba en ${favorables(fase2)} de ${fase2.length} ensayos.`
        : `Todo el bloque es después del cambio de ventaja (desde la elección ${desde.eleccion} del programa de 80): eligió el nuevo cofre que más premiaba en ${favorables(fase2)} de ${fase2.length} ensayos.`,
    );
  }
  const respondidos = validos.filter((r) => r.opcion_elegida_id);
  lineas.push(`Encontró la estrella en ${respondidos.filter(conEstrella).length} de ${validos.length} ensayos.`);
  // Después de cada elección, ¿repitió el cofre o cambió? Solo entre dos ensayos seguidos con respuesta.
  const tras = { estrella: 0, repitio: 0, vacio: 0, cambio: 0 };
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1], rows[i]];
    if (a.interrumpido || b.interrumpido || !a.opcion_elegida_id || !b.opcion_elegida_id) continue;
    if (conEstrella(a)) {
      tras.estrella++;
      if (b.opcion_elegida_id === a.opcion_elegida_id) tras.repitio++;
    } else {
      tras.vacio++;
      if (b.opcion_elegida_id !== a.opcion_elegida_id) tras.cambio++;
    }
  }
  if (tras.estrella) lineas.push(`Después de encontrar la estrella, volvió a elegir el mismo cofre en ${tras.repitio} de ${veces(tras.estrella, 'ocasión', 'ocasiones')}.`);
  if (tras.vacio) lineas.push(`Después de un cofre vacío, cambió de cofre en ${tras.cambio} de ${veces(tras.vacio, 'ocasión', 'ocasiones')}.`);
  lineas.push(...eleccionesJuntas(rows, ficha, previas));
  return lineas;
}

// Elecciones de la banda en la sesión, con los bloques juntos (ficha.juntarBloques).
export function eleccionesJuntas(rows, ficha, previas = []) {
  const minimo = ficha?.juntarBloques?.elecciones ?? 80;
  const banda = rows[0]?.banda;
  const antes = previas.filter((r) => r.actividad === rows[0]?.actividad && r.banda === banda);
  const elecciones = (rs) => rs.filter((r) => !r.interrumpido && r.opcion_elegida_id).length;
  const total = elecciones(antes) + elecciones(rows);
  const bloques = new Set(antes.map((r) => r.bloque)).size + 1;
  const lineas = [
    `Elecciones de la banda ${banda} en la sesión${bloques > 1 ? `, con ${bloques} bloques juntos` : ''}: ${total}. Para estimar los parámetros del modelo de aprendizaje el Catálogo pide ${minimo} o más; este prototipo no los calcula.`,
  ];
  if (total < minimo) lineas.push(`Para juntar ${minimo}, haz otro bloque de esta banda en la misma sesión: empieza con el cofre que terminó premiando más.`);
  return lineas;
}

// ---------- Galería y vista previa ----------

const pct = (p) => `${Math.round(p * 100)} %`;

// El programa completo: en qué cofre está la estrella en cada ensayo, y dónde cambia la ventaja.
export function galeriaHTML(it) {
  const nombre = (c) => COLOR[c].nombre;
  const otro = it.favorableInicial === 'a' ? 'b' : 'a';
  const cambio = it.inversion
    ? ` Desde el ensayo ${it.inversion}, el que más premia es el ${nombre(otro)}.`
    : it.cambiaAlEmpezar
      ? ` Es el segundo bloque del programa de 80 elecciones: empieza después del cambio de ventaja (elección ${it.ensayos[0].eleccion}).`
      : '';
  const marcas = it.ensayos
    .map((e) => {
      const c = e.opciones.find((o) => o.premio).cofre;
      return `${e.n === it.inversion ? '<li class="programa-cambio" aria-hidden="true"></li>' : ''}<li class="programa-marca programa-${c}" title="Ensayo ${e.n}: estrella en el cofre ${nombre(c)}"></li>`;
    })
    .join('');
  return `
    <div class="item-programa">
      <span class="item-estimulo dib-cofres">${cofreSVG('a')}${cofreSVG('b')}</span>
      <p>Al empezar, el cofre ${nombre(it.favorableInicial)} tiene la estrella el ${pct(it.probabilidad)} de las veces.${esc(cambio)}</p>
    </div>
    <p class="ayuda">Dónde está la estrella en cada uno de los ${it.ensayos.length} ensayos (azul o naranja):</p>
    <ol class="programa" aria-label="Programa de premios">${marcas}</ol>`;
}

export function previa(it) {
  const [e] = it.ensayos;
  return { consigna: '', opciones: e.opciones.map((o) => `<span class="dib dib-figura">${cofreSVG(o.cofre)}</span>`) };
}

export const consignaTexto = () => 'Dos cofres';
export const notaPrevia = (ficha, banda) =>
  `El cofre que más premia tiene la estrella el ${pct(banda.probabilidad)} de las veces${banda.inversion ? `; en las 80 elecciones de dos bloques de esta banda, la ventaja pasa al otro cofre una vez, en la elección ${ficha.juntarBloques?.inversionEnEleccion ?? 41}, sin aviso` : ''}.`;
