// Pantalla de ACT-14 «Reconoce la emoción»: arriba, un rostro dibujado; abajo, los pictogramas
// de las emociones, siempre en el mismo lugar. Solo dibuja; el motor registra.
import { shuffle } from '../engine/selector.js';
import { EMOCIONES, NOMBRE_EMOCION, PERSONAJES, pictoEmocionSVG, rostroSVG } from './rostros.js';

export const toTrials = (items) => items.map((it) => ({ codigo: it.codigo, consigna: it.consigna, opciones: it.opciones }));

export function createView(stage) {
  let grid = null;
  const el = (cls, html = '') => Object.assign(document.createElement('div'), { className: cls, innerHTML: html });
  return {
    clear() {
      stage.replaceChildren();
      grid = null;
    },
    showPrompt({ personaje, emocion, intensidad }) {
      stage.append(el('consigna consigna-rostro', rostroSVG(personaje, emocion, intensidad)));
    },
    showOptions(opciones, disposicion) {
      const [filas, columnas] = disposicion.split('x').map(Number);
      grid = el('opciones');
      grid.style.setProperty('--filas', filas);
      grid.style.setProperty('--columnas', columnas);
      opciones.forEach((o, k) => {
        const celda = el('opcion opcion-figura', pictoEmocionSVG(o.emocion));
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

// Reparte los ensayos por igual entre las emociones de la banda y evita que la misma emoción
// salga tres veces seguidas. «items» ya viene filtrado por banda.
export function elegirPorEmocion(items, n, rand) {
  const emociones = [...new Set(items.map((it) => it.emocion))];
  const colas = Object.fromEntries(emociones.map((e) => [e, []]));
  const picked = [];
  for (let k = 0; picked.length < n; k++) {
    // Una vuelta toma un ítem de cada emoción, en orden distinto cada vez.
    for (const e of shuffle(emociones, rand)) {
      if (picked.length === n) break;
      if (!colas[e].length) colas[e] = shuffle(items.filter((it) => it.emocion === e), rand);
      const ultimos = picked.slice(-2).map((it) => it.emocion);
      if (ultimos.length === 2 && ultimos.every((x) => x === e) && emociones.length > 1) continue;
      picked.push(colas[e].pop());
    }
    if (k > n * 4) break;
  }
  return picked;
}

// Líneas del resumen del bloque: ante los rostros de cada emoción, qué pictograma eligió. Son
// las filas de la matriz de confusión del Catálogo, en palabras. Solo cuenta: el Catálogo pide
// al menos 10 presentaciones por emoción antes de leer la matriz.
export const PRESENTACIONES_MIN = 10;
export function resumenExtra(rows, byCode) {
  const validos = rows.filter((r) => !r.interrumpido);
  const emocionDe = (r) => byCode.get(r.item).consigna.emocion;
  const veces = (n) => (n === 1 ? '1 vez' : `${n} veces`);
  const enlista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0]);
  const lineas = [];
  let pocas = false;
  for (const e of EMOCIONES) {
    const suyos = validos.filter((r) => emocionDe(r) === e);
    if (!suyos.length) continue;
    if (suyos.length < PRESENTACIONES_MIN) pocas = true;
    const elegidos = EMOCIONES.map((x) => [x, suyos.filter((r) => r.opcion_elegida_id === x).length])
      .filter(([, n]) => n > 0)
      .map(([x, n]) => `${NOMBRE_EMOCION[x]} ${veces(n)}`);
    const sin = suyos.filter((r) => r.opcion_elegida_id == null).length;
    const partes = [elegidos.length ? `eligió ${enlista(elegidos)}` : '', sin ? `sin respuesta ${veces(sin)}` : ''].filter(Boolean);
    lineas.push(`Rostros de ${NOMBRE_EMOCION[e]} (${suyos.length}): ${partes.join('; ')}.`);
  }
  if (lineas.length && pocas) lineas.push(`Con menos de ${PRESENTACIONES_MIN} presentaciones por emoción, estos conteos no se interpretan.`);
  return lineas;
}

// Para la galería y la vista previa del inicio.
export const consignaHTML = ({ personaje, emocion, intensidad }) => `<span class="dib dib-rostro">${rostroSVG(personaje, emocion, intensidad)}</span>`;
export const opcionHTML = (o) => `<span class="dib dib-figura">${pictoEmocionSVG(o.emocion)}</span>`;
export const opcionTexto = (o) => NOMBRE_EMOCION[o.emocion];
export const consignaTexto = (it) => `Rostro: ${PERSONAJES[it.personaje].nombre}; ${NOMBRE_EMOCION[it.emocion]}, intensidad ${it.consigna.intensidad}`;
