// ¿Cabe una banda, a su tamaño mínimo, en esta pantalla?
// La hoja de estilos nunca dibuja una opción de menos de 2 cm (RNF-04). En una pantalla chica,
// eso hace que las opciones se salgan de la pantalla o invadan la zona de la consigna. Aquí se
// calcula antes de empezar, con las mismas medidas de la hoja de estilos, para avisar al adulto.

export const OPCION_MIN_CM = 2;
// Cada lugar de la serie de «Completa el patrón» se encoge con la pantalla; con menos de 1 cm
// las figuras ya no se distinguen bien.
export const LUGAR_MIN_CM = 1;

// Cómo reparte la pantalla cada tipo de pantalla. Medidas en centímetros de la calibración.
// - mitad: las opciones ocupan la mitad de abajo (la consigna va arriba).
// - completa: las opciones ocupan toda la pantalla, menos el objetivo de arriba.
const REPARTO = {
  seleccion: { zona: 'mitad', separacion: 1, proporcion: 1 },
  palabra: { zona: 'mitad', separacion: 1, proporcion: 1 },
  demora: { zona: 'mitad', separacion: 1, proporcion: 1 },
  patron: { zona: 'mitad', separacion: 1, proporcion: 1 },
  emociones: { zona: 'mitad', separacion: 1, proporcion: 1 },
  'cambia-regla': { zona: 'mitad', separacion: 3, proporcion: 1 },
  categorias: { zona: 'mitad', separacion: 1, proporcion: 1.7 },
  busqueda: { zona: 'completa', separacion: 0.5, proporcion: 1, objetivo: 2 },
  // ACT-12: los dos cofres van en el centro, con 2 cm entre ellos; se pide lo mismo que si
  // ocuparan la mitad de abajo, que es más estricto.
  cofres: { zona: 'mitad', separacion: 2, proporcion: 1 },
};

// Margen libre alrededor de las opciones cuando ya están a su tamaño mínimo.
const MARGEN_CM = 0.5;
// La serie de figuras (actividades.css, «.serie»): 0.3 cm entre lugares y 1 cm libre a cada lado.
const SERIE_SEPARACION_CM = 0.3;
const SERIE_MARGEN_CM = 2;

// Ancho mínimo, en cm, para una serie de «lugares» lugares de al menos 1 cm.
export const anchoDeSerie = (lugares) => (lugares ? lugares * (LUGAR_MIN_CM + SERIE_SEPARACION_CM) + SERIE_MARGEN_CM : 0);

// Tamaño mínimo de la ventana, en cm, para una disposición de «filas x columnas»: las opciones
// a 2 cm, con su separación, sin salirse de la pantalla ni de su zona. «lugares» es el número de
// lugares de la serie más larga de la banda, si la consigna es una serie.
export function espacioMinimo(pantalla, disposicion, { lugares = 0 } = {}) {
  const r = REPARTO[pantalla] ?? REPARTO.seleccion;
  const [filas, columnas] = disposicion.split('x').map(Number);
  const anchoOpciones = columnas * OPCION_MIN_CM * r.proporcion + r.separacion * (columnas - 1) + MARGEN_CM;
  const anchoSerie = anchoDeSerie(lugares);
  const alto =
    r.zona === 'mitad'
      ? 2 * (filas * OPCION_MIN_CM + r.separacion * (filas - 1) + MARGEN_CM) // caben en la mitad de abajo
      : r.objetivo + filas * OPCION_MIN_CM + r.separacion * (filas + 2);
  return { ancho: Math.max(anchoOpciones, anchoSerie), alto, anchoOpciones, anchoSerie };
}

// anchoPx y altoPx: tamaño de la ventana; cmPx: píxeles por centímetro (variable --cm).
export function comprobarPantalla({ pantalla, disposicion, lugares = 0, anchoPx, altoPx, cmPx }) {
  const min = espacioMinimo(pantalla, disposicion, { lugares });
  const ancho = anchoPx / cmPx;
  const alto = altoPx / cmPx;
  // Medio milímetro de tolerancia: la calibración redondea.
  const entra = (a, h) => a + 0.05 >= min.ancho && h + 0.05 >= min.alto;
  const cabe = entra(ancho, alto);
  // Girar la tableta ayuda si con el ancho y el alto cambiados sí cabe.
  const girar = !cabe && entra(alto, ancho);
  // Lo que no cabe son las opciones, o solo la serie de arriba.
  const opcionesCaben = ancho + 0.05 >= min.anchoOpciones && alto + 0.05 >= min.alto;
  return { cabe, girar, ancho, alto, min, lugares, falta: cabe ? null : opcionesCaben ? 'serie' : 'opciones' };
}

const cm = (x) => x.toFixed(1).replace('.', ',').replace(',0', '');

// Aviso para el adulto, en una frase, cuando no cabe.
export function avisoPantalla({ girar, ancho, alto, min, lugares, falta }, opciones) {
  const pantalla = `En esta pantalla (${cm(ancho)} × ${cm(alto)} cm)`;
  if (falta === 'serie') {
    return `${pantalla} la serie de ${lugares} lugares quedaría con figuras de menos de ${LUGAR_MIN_CM} cm: hacen falta ${cm(min.ancho)} cm de ancho. ${girar ? 'Gira la tableta.' : 'Usa una pantalla más ancha.'}`;
  }
  const base = `${pantalla} no caben ${opciones} opciones de ${OPCION_MIN_CM} cm con su separación: hacen falta ${cm(min.ancho)} × ${cm(min.alto)} cm.`;
  return `${base} ${girar ? 'Gira la tableta.' : 'Usa una pantalla más grande o una banda con menos opciones.'}`;
}
