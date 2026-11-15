// Pantalla de ACT-13 «Espera la señal» (investigación): un estímulo a la vez, en el centro. El
// niño toca el pez («sí») y deja la nube («no») sin tocar. Antes del bloque, una pantalla sin
// texto muestra qué se toca y qué no. Solo dibuja; el motor registra.
// El estímulo de «sí» no es el globo de la pausa guiada (ACT-17): el niño no debe asociar la
// pausa con una tarea en la que se toca.
import { summarize, median } from '../engine/quality.js';

const TINTA = '#1d2226';

// Plural de cada estímulo, para el resumen y la galería.
export const PLURAL = { pez: 'peces', nube: 'nubes' };

export const ESTIMULOS = {
  pez: `<svg viewBox="0 0 200 200" aria-hidden="true">
    <path d="M146 100 L188 62 L180 100 L188 138 Z" fill="#e69f00" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M78 66 C86 42 114 38 126 70 Z" fill="#f6d27a" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M14 100 C36 60 90 50 130 68 C142 74 152 88 154 100 C152 112 142 126 130 132 C90 150 36 140 14 100 Z" fill="#e69f00" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M86 100 C98 108 104 120 98 132" fill="none" stroke="${TINTA}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="46" cy="92" r="10" fill="#ffffff" stroke="${TINTA}" stroke-width="4"/>
    <circle cx="48" cy="92" r="4.5" fill="${TINTA}"/>
  </svg>`,
  nube: `<svg viewBox="0 0 200 200" aria-hidden="true">
    <path d="M52 140 C30 140 20 124 22 110 C24 94 38 86 52 88 C54 64 74 50 96 54 C110 36 140 36 152 58 C172 58 184 74 180 92 C192 100 192 124 178 134 C172 140 164 140 156 140 Z" fill="#a9c1d6" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 104 C62 92 74 86 84 88" fill="none" stroke="#e3edf5" stroke-width="7" stroke-linecap="round"/>
  </svg>`,
};

// Mano que toca (sí) y mano abierta de «alto» (no), para la pantalla de antes del bloque.
const MANO_TOCA = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <path d="M86 40 C86 30 100 30 100 40 L100 104 L104 104 L104 88 C104 80 116 80 116 88 L116 106 L120 106 L120 94 C120 86 132 86 132 94 L132 110 L136 110 L136 102 C136 94 148 94 148 102 L148 140 C148 166 132 182 108 182 C86 182 74 170 66 152 L50 118 C46 108 58 100 66 108 L86 128 Z" fill="#f2c9a0" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M93 14 L93 22 M70 22 L76 28 M116 22 L110 28" stroke="${TINTA}" stroke-width="5" stroke-linecap="round"/>
</svg>`;
const MANO_ALTO = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <path d="M72 70 C72 60 86 60 86 70 L86 104 L90 104 L90 50 C90 40 104 40 104 50 L104 102 L108 102 L108 56 C108 46 122 46 122 56 L122 104 L126 104 L126 72 C126 62 140 62 140 72 L140 136 C140 164 124 182 102 182 C80 182 66 168 60 150 L46 116 C42 106 54 98 62 106 L72 118 Z" fill="#f2c9a0" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>
</svg>`;

const FIJACION = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 10v20M10 20h20" stroke="#8a8f94" stroke-width="4" stroke-linecap="round"/></svg>`;

// Un ítem es la serie de presentaciones de un bloque completo: se elige una al azar.
export const elegir = (items, n, rand) => {
  if (!items.length) throw new Error('Esta banda todavía no tiene series de presentaciones.');
  return [items[Math.floor(rand() * items.length)]];
};

// Antes de la primera presentación, la pantalla de qué se toca y qué no.
export const toTrials = (items, { ficha } = {}) =>
  items.flatMap((it) => it.ensayos.map((e, i) => ({ ...e, ...(i === 0 ? { anuncio: { ...ficha?.estimulos } } : {}) })));

// El ritmo es de la banda: cuánto dura el estímulo y la pausa entre uno y otro. La ficha no
// cambia; el bloque usa esta copia.
export const fichaDeBloque = (ficha, banda) => ({ ...ficha, limiteRespuestaMs: banda.limiteMs, intervaloMs: banda.intervaloMs });

export function createView(stage) {
  stage.classList.add('stage-senal');
  const el = (cls, html) => Object.assign(document.createElement('div'), { className: cls, innerHTML: html });
  let estimulo = null;
  return {
    clear() {
      stage.replaceChildren();
      estimulo = null;
    },
    // Sí: el pez con la mano que toca. No: la nube con la mano abierta.
    showAnnouncement({ si, no }) {
      stage.replaceChildren(
        el('senal-anuncio', `
          <div class="senal-fila">${ESTIMULOS[si]}${MANO_TOCA}</div>
          <div class="senal-fila">${ESTIMULOS[no]}${MANO_ALTO}</div>`),
      );
    },
    showPrompt() {
      stage.append(el('senal-fijacion', FIJACION));
    },
    showOptions([o]) {
      stage.querySelector('.senal-fijacion')?.remove();
      estimulo = el('opcion opcion-figura senal-estimulo', ESTIMULOS[o.estimulo]);
      estimulo.dataset.pos = 1;
      stage.append(estimulo);
    },
    // Sin premio ni marca: el estímulo se quita, se haya tocado o no.
    showFeedback() {
      estimulo?.remove();
      estimulo = null;
    },
  };
}

// ---------- Resumen del bloque ----------

// Sustituye al resumen del motor: no tocar la nube es la respuesta esperada, así que «sin
// respuesta» solo cuenta como omisión ante el pez, y tocar la nube es un error de comisión.
export function resumen(rows, byCode, ficha) {
  const validos = rows.filter((r) => !r.interrumpido);
  const de = (tipo) => validos.filter((r) => byCode.get(r.item)?.tipo === tipo);
  const si = de('si');
  const no = de('no');
  const toco = (rs) => rs.filter((r) => r.opcion_elegida !== null).length;
  const trs = si.filter((r) => r.tr_bruto_ms !== null && !r.anticipatoria).map((r) => r.tr_bruto_ms);
  const med = median(trs);
  const [nombreSi, nombreNo] = [ficha.estimulos?.si ?? 'sí', ficha.estimulos?.no ?? 'no'];
  return [
    `Ante el ${nombreSi} («sí»): tocó ${toco(si)} de ${si.length}; sin tocar, ${si.length - toco(si)} (omisiones).`,
    `Ante la ${nombreNo} («no»): no tocó ${no.length - toco(no)} de ${no.length}; tocó ${toco(no)} (errores de comisión).`,
    med === null
      ? `Mediana del tiempo de respuesta ante el ${nombreSi}: no hubo respuestas para calcularla.`
      : `Mediana del tiempo de respuesta ante el ${nombreSi}: ${(med / 1000).toFixed(2)} s, en ${trs.length} con respuesta (sin contar las anticipatorias).`,
    // Las líneas del motor sobre pausas, respuestas anticipatorias, audio y pérdida de foco.
    ...summarize(rows, ficha).slice(3),
    'El Catálogo pide definir estos indicadores en el Modelo matemático antes de usarlos: aquí solo se cuentan.',
  ];
}

// ---------- Galería y vista previa ----------

export function galeriaHTML(it, { ficha }) {
  const nos = it.ensayos.filter((e) => e.tipo === 'no').length;
  const marcas = it.ensayos.map((e) => `<li class="programa-marca programa-${e.tipo}" title="Presentación ${e.n}: ${e.tipo === 'si' ? ficha.estimulos.si : ficha.estimulos.no}"></li>`).join('');
  return `
    <div class="item-programa">
      <span class="item-estimulo dib-cofres">${ESTIMULOS[ficha.estimulos.si]}${ESTIMULOS[ficha.estimulos.no]}</span>
      <p>${it.ensayos.length - nos} ${PLURAL[ficha.estimulos.si]} y ${nos} ${PLURAL[ficha.estimulos.no]}, en este orden. Nunca empieza con una nube ni pone más de ${ficha.maxNoSeguidos} seguidas.</p>
    </div>
    <ol class="programa" aria-label="Orden de las presentaciones">${marcas}</ol>`;
}

export function previa(it, { ficha }) {
  return {
    consigna: `<span class="previa-senal">${ESTIMULOS[ficha.estimulos.si]}${MANO_TOCA}${ESTIMULOS[ficha.estimulos.no]}${MANO_ALTO}</span>`,
    opciones: [`<span class="dib dib-figura">${ESTIMULOS[it.ensayos[0].opciones[0].estimulo]}</span>`],
  };
}

export const consignaTexto = () => 'Un estímulo a la vez';
export const notaPrevia = (ficha, banda) =>
  `Arriba, lo que el niño ve antes del bloque. Después aparece un estímulo a la vez, durante ${banda.limiteMs / 1000} s, con ${banda.intervaloMs / 1000} s entre uno y otro.`;
