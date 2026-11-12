// Pantalla de secuencias por pasos: ACT-10 «Ordena la secuencia» y ACT-16 «Forma la palabra».
// Arriba, un lugar vacío por cada elemento de la secuencia (y, en ACT-16, el dibujo); abajo, las
// tarjetas revueltas. Cada paso es un ensayo del motor: el niño toca la tarjeta que sigue y, en la
// retroalimentación, la correcta pasa a su lugar con el marco de siempre. Solo dibuja; el motor
// registra. Las tarjetas de ACT-16 son sílabas, letras o palabras: son el estímulo, como la
// palabra de ACT-03.
import { pickItems } from '../engine/selector.js';
import { esc, miniatura } from '../html.js';
import { momentoSVG, HISTORIAS } from './historias.js';

// Las piezas escritas de una secuencia llevan todas la misma letra: la más grande con la que la
// más larga («amarilla», «almohada») cabe en su tarjeta. La letra base mide 0.36 del lado de la
// tarjeta (ver .pieza en actividades.css) y el texto puede ocupar hasta 0.84 de su ancho.
const LETRA = 0.36;
const ANCHO_UTIL = 0.84;
let lienzo = null;
export function escalaDePiezas(textos, medir = medirTexto) {
  if (!textos.length) return 1;
  // Ancho de cada texto en «em» (con la letra de 100 px, entre 100).
  const em = Math.max(...textos.map((t) => medir(t) / 100));
  return Math.min(1, ANCHO_UTIL / (LETRA * em));
}
function medirTexto(texto) {
  lienzo ??= (typeof document !== 'undefined' && document.createElement('canvas').getContext?.('2d')) || false;
  // Sin lienzo (fuera del navegador, en las pruebas): unos 0.58 em por letra.
  if (!lienzo) return texto.length * 58;
  lienzo.font = "600 100px 'Noto Sans', system-ui, sans-serif";
  return lienzo.measureText(texto).width;
}

// n secuencias completas: «Número de secuencias» en el inicio.
export const elegir = (items, n, rand, { repeat }) => pickItems(items, n, rand, { repeat, key: (it) => it.codigo });

// Cada paso lleva la secuencia completa: así la pantalla se puede volver a dibujar después de
// una pausa, con las tarjetas de los pasos anteriores ya en su lugar.
export const toTrials = (items) =>
  items.flatMap((it) =>
    it.ensayos.map((e) => ({
      codigo: e.codigo,
      secuencia: it.codigo,
      paso: e.paso,
      total: e.total,
      consigna: { ...e.consigna, tarjetas: it.tarjetas, colocadas: e.colocadas, paso: e.paso, total: e.total, autoColocar: e.autoColocar ?? null, imagen: it.imagen ?? null },
      opciones: e.opciones.map((o) => ({ ...it.tarjetas.find((t) => t.id === o.id), ...o })),
      imagenes: [it.imagen, ...it.tarjetas.map((t) => t.src)].filter(Boolean),
    })),
  );

export function createView(stage, images) {
  stage.classList.add('stage-secuencia');
  const picture = (src) => {
    const img = images.get(src)?.cloneNode() ?? Object.assign(new Image(), { src });
    img.alt = '';
    img.draggable = false;
    img.decoding = 'sync';
    return img;
  };
  // Lo que lleva una tarjeta: un momento de la historia, un dibujo del banco o una pieza escrita.
  const llenar = (caja, t) => {
    if (t.historia) caja.innerHTML = momentoSVG(t.historia, t.momento);
    else if (t.src) caja.append(picture(t.src));
    else {
      const pieza = document.createElement('span');
      pieza.className = 'pieza';
      pieza.lang = 'es';
      pieza.textContent = t.texto;
      caja.append(pieza);
    }
  };
  const div = (cls) => Object.assign(document.createElement('div'), { className: cls });
  let actual = null; // consigna del paso en curso
  let opciones = [];

  // Dibuja el tablero completo del paso: lo ya colocado en su lugar y el resto abajo.
  function dibujar(consigna) {
    const { tarjetas, colocadas, imagen } = consigna;
    const enSecuencia = tarjetas.filter((t) => t.orden !== null).sort((a, b) => a.orden - b.orden);
    const tablero = div(`tablero-secuencia${tarjetas.some((t) => t.texto) ? ' secuencia-piezas' : ''}`);
    tablero.style.setProperty('--lugares', enSecuencia.length);
    tablero.style.setProperty('--columnas', tarjetas.length);
    const textos = tarjetas.filter((t) => t.texto).map((t) => t.texto);
    if (textos.length) tablero.style.setProperty('--escala-pieza', escalaDePiezas(textos).toFixed(3));
    const arriba = div('secuencia-arriba');
    if (imagen) {
      const foto = div('consigna secuencia-imagen');
      foto.append(picture(imagen));
      arriba.append(foto);
    }
    const huecos = div('huecos');
    enSecuencia.forEach((t, i) => {
      const hueco = div('hueco');
      hueco.dataset.lugar = i + 1;
      if (colocadas.includes(t.id)) {
        hueco.classList.add('lleno');
        llenar(hueco, t);
      } else if (i === colocadas.length) hueco.classList.add('hueco-siguiente');
      huecos.append(hueco);
    });
    arriba.append(huecos);
    const abajo = div('cartas');
    for (const t of tarjetas) {
      const caja = div('opcion carta');
      caja.dataset.id = t.id;
      if (colocadas.includes(t.id)) caja.classList.add('usada');
      else llenar(caja, t);
      abajo.append(caja);
    }
    tablero.append(arriba, abajo);
    stage.replaceChildren(tablero);
  }

  // La tarjeta pasa a su lugar; donde estaba queda el contorno vacío.
  function colocar(id, marco) {
    const t = actual.tarjetas.find((x) => x.id === id);
    const hueco = stage.querySelector(`.hueco[data-lugar="${t.orden}"]`);
    const caja = stage.querySelector(`.carta[data-id="${CSS.escape(id)}"]`);
    if (!hueco || !caja) return;
    hueco.classList.remove('hueco-siguiente');
    hueco.classList.add('lleno');
    hueco.replaceChildren();
    llenar(hueco, t);
    if (marco) hueco.classList.add('marco');
    caja.replaceChildren();
    caja.classList.add('usada');
    caja.removeAttribute('data-pos');
  }

  return {
    // Entre dos pasos de la misma secuencia el tablero sigue a la vista, sin nada que tocar.
    // Entre secuencias, y en una pausa, la pantalla queda en blanco.
    clear() {
      const enMedio = actual && actual.paso < actual.total;
      for (const c of stage.querySelectorAll('[data-pos]')) c.removeAttribute('data-pos');
      if (!enMedio) {
        stage.replaceChildren();
        actual = null;
      }
    },
    showPrompt(consigna) {
      actual = consigna;
      dibujar(consigna);
    },
    // Las tarjetas que quedan se pueden tocar; su posición es la de la lista de opciones del motor.
    showOptions(lista) {
      opciones = lista;
      lista.forEach((o, k) => {
        const caja = stage.querySelector(`.carta[data-id="${CSS.escape(o.id)}"]`);
        if (caja) caja.dataset.pos = k + 1;
      });
    },
    showFeedback(posCorrecta) {
      const correcta = opciones[posCorrecta - 1];
      if (correcta) colocar(correcta.id, true);
      if (actual?.autoColocar) colocar(actual.autoColocar, false);
    },
  };
}

// ---------- Resumen del bloque ----------

// Además de los pasos, las secuencias completas: todos sus pasos con respuesta correcta, sin
// pausas en medio (A1 por secuencia completa, Catálogo 6.2).
export function resumenExtra(rows, byCode, ficha) {
  const porSecuencia = new Map();
  for (const r of rows) {
    const e = byCode.get(r.item);
    if (!e) continue;
    if (!porSecuencia.has(e.secuencia)) porSecuencia.set(e.secuencia, { total: e.total, filas: [] });
    porSecuencia.get(e.secuencia).filas.push(r);
  }
  const todas = [...porSecuencia.values()];
  const completas = todas.filter((s) => s.filas.length === s.total && s.filas.every((r) => !r.interrumpido && r.acierto)).length;
  const cortadas = todas.filter((s) => s.filas.length < s.total || s.filas.some((r) => r.interrumpido)).length;
  const plantilla = ficha?.resumenSecuencia ?? 'Hizo completas y en orden {completas} de {secuencias} secuencias';
  const lineas = [`${plantilla.replace('{completas}', completas).replace('{secuencias}', todas.length)}.`];
  if (cortadas) lineas.push(`Secuencias que no se terminaron por una pausa o un salto: ${cortadas}.`);
  return lineas;
}

// ---------- Galería y vista previa ----------

// Las piezas escritas guardan la proporción de la pantalla del niño: la letra mide 0.36 del lado
// de su caja, con la misma reducción para toda la secuencia.
const escalaDe = (it) => escalaDePiezas(it.tarjetas.filter((t) => t.texto).map((t) => t.texto));
const contenidoHTML = (t, escala = 1) =>
  t.historia
    ? momentoSVG(t.historia, t.momento)
    : t.src
      ? miniatura(t.src)
      : `<span class="dib-pieza" style="--escala-pieza:${escala.toFixed(3)}"><span lang="es">${esc(t.texto)}</span></span>`;

export function galeriaHTML(it, { nombre }) {
  const escala = escalaDe(it);
  const enOrden = it.tarjetas.filter((t) => t.orden !== null).sort((a, b) => a.orden - b.orden);
  const que =
    it.tipo === 'historia'
      ? `Historia: ${HISTORIAS[it.historia].nombre}. Solo en V.`
      : it.tipo === 'instrucciones'
        ? `Instrucción en AV: «${it.consigna.texto}»`
        : `${it.tipo === 'palabra' ? 'Frase' : 'Palabra'}: «${it.palabra}» (${nombre(it.concepto)}). En AV la voz la dice.`;
  const sobran = it.tarjetas.filter((t) => t.orden === null).map((t) => `«${t.texto}»`);
  return `
    <div class="item-consigna">
      ${it.imagen ? `<span class="item-estimulo">${miniatura(it.imagen)}</span>` : ''}
      <p>${esc(que)}${sobran.length ? `<br><span class="ayuda">Sobra${sobran.length > 1 ? 'n' : ''}: ${esc(sobran.join(', '))}</span>` : ''}</p>
    </div>
    <p class="ayuda">Así aparecen las tarjetas; el número es su lugar en la secuencia.</p>
    <ul class="item-opciones ${it.tarjetas.length > 4 ? 'muchas' : ''}">
      ${it.tarjetas
        .map(
          (t) => `<li>
            <span class="item-opcion ${t.historia ? 'dib dib-figura' : ''}">${contenidoHTML(t, escala)}</span>
            <strong>${t.orden ?? '—'}</strong>
          </li>`,
        )
        .join('')}
    </ul>
    <p class="meta">Orden correcto: ${esc(enOrden.map((t) => (t.historia ? `momento ${t.momento}` : t.texto ?? nombre(t.concepto))).join(' → '))}. ${it.ensayos.length} ${it.ensayos.length === 1 ? 'paso' : 'pasos'}.</p>`;
}

export function previa(it) {
  const escala = escalaDe(it);
  const lugares = it.tarjetas.filter((t) => t.orden !== null).length;
  const huecos = Array.from({ length: lugares }, () => '<span class="previa-hueco"></span>').join('');
  return {
    consigna: `${it.imagen ? `<span class="previa-caja">${miniatura(it.imagen)}</span>` : ''}<span class="previa-huecos" style="--lugares:${lugares}">${huecos}</span>`,
    opciones: it.tarjetas.map((t) => (t.historia ? `<span class="dib dib-figura">${contenidoHTML(t)}</span>` : contenidoHTML(t, escala))),
  };
}

export const consignaTexto = (it) => (it.palabra ? `«${it.palabra}»` : it.historia ? HISTORIAS[it.historia].nombre : it.consigna?.texto ?? '');
export const notaPrevia = (ficha, banda) =>
  `Ejemplo de la banda ${banda.id}. El niño toca las tarjetas en orden y cada una pasa a su lugar de arriba.${ficha.id === 'ACT-10' ? ' En AV, las tarjetas son dibujos del banco y la voz dice el orden.' : ''}`;
