// ¿Cabe una banda, a su tamaño mínimo, en esta pantalla?
// La hoja de estilos nunca dibuja una opción de menos de 2 cm (RNF-04). En una pantalla chica,
// eso hace que las opciones se salgan de la pantalla o invadan la zona de la consigna. Aquí se
// calcula antes de empezar, con las mismas medidas de la hoja de estilos, para avisar al adulto.

export const OPCION_MIN_CM = 2;

// Cómo reparte la pantalla cada tipo de pantalla. Medidas en centímetros de la calibración.
// - mitad: las opciones ocupan la mitad de abajo (la consigna va arriba).
const REPARTO = {
  seleccion: { zona: 'mitad', separacion: 1, proporcion: 1 },
  'cambia-regla': { zona: 'mitad', separacion: 3, proporcion: 1 },
};

// Margen libre alrededor de las opciones cuando ya están a su tamaño mínimo.
const MARGEN_CM = 0.5;
// Tamaño mínimo de la ventana, en cm, para una disposición de «filas x columnas»: las opciones
// a 2 cm, con su separación, en la mitad de abajo de la pantalla y sin salirse de ella.
export function espacioMinimo(pantalla, disposicion) {
  const r = REPARTO[pantalla] ?? REPARTO.seleccion;
  const [filas, columnas] = disposicion.split('x').map(Number);
  const ancho = columnas * OPCION_MIN_CM * r.proporcion + r.separacion * (columnas - 1) + MARGEN_CM;
  const alto = 2 * (filas * OPCION_MIN_CM + r.separacion * (filas - 1) + MARGEN_CM); // caben en la mitad de abajo
  return { ancho, alto };
}

// anchoPx y altoPx: tamaño de la ventana; cmPx: píxeles por centímetro (variable --cm).
export function comprobarPantalla({ pantalla, disposicion, anchoPx, altoPx, cmPx }) {
  const min = espacioMinimo(pantalla, disposicion);
  const ancho = anchoPx / cmPx;
  const alto = altoPx / cmPx;
  // Medio milímetro de tolerancia: la calibración redondea.
  const entra = (a, h) => a + 0.05 >= min.ancho && h + 0.05 >= min.alto;
  const cabe = entra(ancho, alto);
  // Girar la tableta ayuda si con el ancho y el alto cambiados sí cabe.
  const girar = !cabe && entra(alto, ancho);
  return { cabe, girar, ancho, alto, min };
}

const cm = (x) => x.toFixed(1).replace('.', ',').replace(',0', '');

// Aviso para el adulto, en una frase, cuando no cabe.
export function avisoPantalla({ girar, ancho, alto, min }, opciones) {
  const base = `En esta pantalla (${cm(ancho)} × ${cm(alto)} cm) no caben ${opciones} opciones de ${OPCION_MIN_CM} cm con su separación: hacen falta ${cm(min.ancho)} × ${cm(min.alto)} cm.`;
  return `${base} ${girar ? 'Gira la tableta.' : 'Usa una pantalla más grande o una banda con menos opciones.'}`;
}
