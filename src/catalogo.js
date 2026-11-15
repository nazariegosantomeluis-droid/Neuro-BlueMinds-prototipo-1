// Registro de actividades: qué actividades tiene la aplicación y qué módulo dibuja su pantalla.
// En esta versión solo están las tres del estudio piloto (Catálogo de actividades, sección 5):
// ACT-01 (familiarización), ACT-02 y ACT-07. Las demás actividades del Catálogo (sección 6) no se
// habilitan hasta después del piloto y de la validez de contenido.
import { loadFicha } from './engine/ficha.js';
import * as seleccion from './activities/seleccion.js';
import * as cambiaRegla from './activities/cambia-regla.js';

export const PANTALLAS = { seleccion, 'cambia-regla': cambiaRegla };

export const PILOTO = ['ACT-01', 'ACT-02', 'ACT-07'];

export const esPiloto = (id) => PILOTO.includes(id);
// Solo las actividades del piloto se usan con niños. Cualquier otra exigiría el modo experto.
export const requiereModoExperto = (ficha) => !esPiloto(ficha.id);

// Una línea por actividad para la pantalla de inicio: qué hace el niño.
export const EN_UNA_LINEA = {
  'ACT-01': 'Tocar la imagen que es igual a la muestra.',
  'ACT-02': 'Del pictograma a otro ejemplar del concepto. En AV, con la palabra hablada.',
  'ACT-07': 'Clasificar tarjetas con una regla que cambia.',
};

// Dibujo pequeño de cada actividad para su tarjeta: un esquema de lo que aparece en pantalla.
// Usa «currentColor», así toma el color del texto de la tarjeta en tema claro y oscuro.
const esquema = (cuerpo) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`;
const CUADRO = (x, y, lado = 12) => `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="2.5"/>`;

export const ESQUEMAS = {
  'ACT-01': esquema(`${CUADRO(18, 5)}<circle cx="24" cy="11" r="3" fill="currentColor" stroke="none"/>${CUADRO(8, 31)}${CUADRO(28, 31)}<circle cx="14" cy="37" r="3" fill="currentColor" stroke="none"/><path d="M31 37h6"/>`),
  'ACT-02': esquema(`<rect x="17" y="4" width="14" height="14" rx="2.5" stroke-dasharray="3 3"/><circle cx="24" cy="11" r="3"/>${CUADRO(8, 31)}${CUADRO(28, 31)}<circle cx="14" cy="37" r="3" fill="currentColor" stroke="none"/><path d="M31 37h6"/>`),
  'ACT-07': esquema(`${CUADRO(18, 4)}<circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"/><path d="M5 30h16v13H5zM27 30h16v13H27z"/><path d="M16 23a8 8 0 0114-3M32 17v3.5h-3.5M32 25a8 8 0 01-14 3M16 31v-3.5h3.5"/>`),
};

// Carga las fichas del piloto. «problemas» lleva, por actividad, por qué su ficha no se puede usar.
export async function cargarCatalogo(fetchFn = globalThis.fetch) {
  const fichas = {};
  const problemas = {};
  await Promise.all(
    PILOTO.map(async (id) => {
      try {
        fichas[id] = await loadFicha(`fichas/${id}.json`, fetchFn);
      } catch (e) {
        problemas[id] = e.errors ?? [e.message];
      }
    }),
  );
  const catalogo = PILOTO.map((id) => ({ id, estado: 'Piloto' }));
  return { catalogo, fichas, problemas };
}

// Las actividades que se pueden preparar en el inicio. Una actividad con problemas en su ficha
// también aparece, para que el aviso se vea al elegirla.
export function grupos(catalogo, fichas, problemas = {}) {
  const actividades = catalogo.filter((a) => esPiloto(a.id) && (fichas[a.id] || problemas[a.id]));
  return [{ id: 'piloto', titulo: 'Actividades del piloto', actividades }];
}
