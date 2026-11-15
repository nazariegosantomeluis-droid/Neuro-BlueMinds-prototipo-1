// Registro de actividades: qué actividades tiene la aplicación, en qué estado está cada una
// según el Catálogo de actividades y qué módulo dibuja su pantalla.
// - Piloto: ACT-01, ACT-02 y ACT-07. Son las únicas que se usan en una sesión normal.
// - Uso posterior: tienen prototipo, pero el Catálogo no las habilita hasta después del piloto
//   y de la validez de contenido. Por eso solo se abren en modo experto.
// - Investigación (ACT-12 y ACT-13): el Catálogo pide definir antes sus indicadores. Sus
//   prototipos también solo se abren en modo experto.
import { validateFicha, FichaError } from './engine/ficha.js';
import * as seleccion from './activities/seleccion.js';
import * as cambiaRegla from './activities/cambia-regla.js';
import * as palabra from './activities/palabra.js';
import * as categorias from './activities/categorias.js';
import * as busqueda from './activities/busqueda.js';
import * as demora from './activities/demora.js';
import * as patron from './activities/patron.js';
import * as emociones from './activities/emociones.js';
import * as oracion from './activities/oracion.js';
import * as sonido from './activities/sonido.js';
import * as secuencia from './activities/secuencia.js';
import * as cofres from './activities/cofres.js';
import * as senal from './activities/senal.js';
import * as fonologia from './activities/fonologia.js';

export const PANTALLAS = { seleccion, 'cambia-regla': cambiaRegla, palabra, categorias, busqueda, demora, patron, emociones, oracion, sonido, secuencia, cofres, senal, fonologia };

export const PILOTO = ['ACT-01', 'ACT-02', 'ACT-07'];
export const ESTADOS = ['Piloto', 'Uso posterior', 'Investigación'];

export const esPiloto = (id) => PILOTO.includes(id);
export const INVESTIGACION = ['ACT-12', 'ACT-13'];
// Una actividad de uso posterior no se usa con niños: solo se abre en modo experto.
export const requiereModoExperto = (ficha) => !esPiloto(ficha.id);

// Una línea por actividad para la pantalla de inicio: qué hace el niño.
export const EN_UNA_LINEA = {
  'ACT-01': 'Tocar la imagen que es igual a la muestra.',
  'ACT-02': 'Del pictograma a otro ejemplar del concepto. En AV, con la palabra hablada.',
  'ACT-03': 'Leer una palabra o una frase y tocar su dibujo.',
  'ACT-04': 'Leer o escuchar una oración y tocar el dibujo que la muestra.',
  'ACT-05': 'Escuchar un sonido y tocar lo que lo hace.',
  'ACT-06': 'Poner cada dibujo en la caja de su categoría.',
  'ACT-07': 'Clasificar tarjetas con una regla que cambia.',
  'ACT-08': 'Encontrar un dibujo entre 4, 8, 12 o 16.',
  'ACT-09': 'Recordar un dibujo que desaparece y encontrarlo después.',
  'ACT-10': 'Tocar en orden los dibujos de una historia, o seguir una instrucción de varios pasos.',
  'ACT-11': 'Elegir la figura que sigue en una serie.',
  'ACT-12': 'Elegir entre dos cofres; uno tiene la estrella más veces que el otro.',
  'ACT-13': 'Tocar el globo cuando aparece y no tocar la nube.',
  'ACT-14': 'Elegir el pictograma de la emoción de un rostro dibujado.',
  'ACT-15': 'Escuchar una palabra y elegir la que rima o empieza igual.',
  'ACT-16': 'Formar una palabra tocando sus sílabas o letras en orden.',
  'ACT-17': 'Un globo que se infla y se desinfla despacio. La inicia el terapeuta.',
};

// Dibujo pequeño de cada actividad para su tarjeta: un esquema de lo que aparece en pantalla.
// Usa «currentColor», así toma el color del texto de la tarjeta en tema claro y oscuro.
const esquema = (cuerpo) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`;
const CUADRO = (x, y, lado = 12) => `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="2.5"/>`;

export const ESQUEMAS = {
  'ACT-01': esquema(`${CUADRO(18, 5)}<circle cx="24" cy="11" r="3" fill="currentColor" stroke="none"/>${CUADRO(8, 31)}${CUADRO(28, 31)}<circle cx="14" cy="37" r="3" fill="currentColor" stroke="none"/><path d="M31 37h6"/>`),
  'ACT-02': esquema(`<rect x="17" y="4" width="14" height="14" rx="2.5" stroke-dasharray="3 3"/><circle cx="24" cy="11" r="3"/>${CUADRO(8, 31)}${CUADRO(28, 31)}<circle cx="14" cy="37" r="3" fill="currentColor" stroke="none"/><path d="M31 37h6"/>`),
  'ACT-03': esquema(`<rect x="9" y="5" width="30" height="13" rx="2.5"/><path d="M15 14l2.5-6 2.5 6M16 12.5h3M24 8v6M24 11h1.5a1.5 1.5 0 010 3H24M33 11a2 2 0 100 3"/>${CUADRO(8, 31)}${CUADRO(28, 31)}<circle cx="14" cy="37" r="3" fill="currentColor" stroke="none"/><path d="M31 37h6"/>`),
  'ACT-06': esquema(`${CUADRO(18, 4)}<circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"/><path d="M5 30h16v13H5zM27 30h16v13H27zM5 30l2-4h12l2 4M27 30l2-4h12l2 4"/><path d="M24 19v5M21.5 22l2.5 2.5 2.5-2.5"/>`),
  'ACT-07': esquema(`${CUADRO(18, 4)}<circle cx="24" cy="10" r="3" fill="currentColor" stroke="none"/><path d="M5 30h16v13H5zM27 30h16v13H27z"/><path d="M16 23a8 8 0 0114-3M32 17v3.5h-3.5M32 25a8 8 0 01-14 3M16 31v-3.5h3.5"/>`),
  'ACT-08': esquema(`${[6, 19, 32].flatMap((x) => [6, 19, 32].map((y) => (x === 19 && y === 19 ? '' : `<rect x="${x}" y="${y}" width="9" height="9" rx="2"/>`))).join('')}<rect x="19" y="19" width="9" height="9" rx="2" fill="currentColor"/>`),
  'ACT-09': esquema(`<rect x="18" y="4" width="12" height="12" rx="2.5" stroke-dasharray="3 3"/><circle cx="24" cy="24" r="4.5"/><path d="M24 21.5V24l1.800 1.200"/>${CUADRO(8, 32)}${CUADRO(28, 32)}<circle cx="14" cy="38" r="3" fill="currentColor" stroke="none"/><path d="M31 38h6"/>`),
  'ACT-11': esquema(`<circle cx="8" cy="14" r="4.5" fill="currentColor" stroke="none"/><rect x="15.5" y="9.5" width="9" height="9" rx="1.5"/><circle cx="32" cy="14" r="4.5" fill="currentColor" stroke="none"/><rect x="38.5" y="9.5" width="8" height="9" rx="1.5" stroke-dasharray="2.5 2.5"/>${CUADRO(8, 30)}${CUADRO(28, 30)}<circle cx="14" cy="36" r="3" fill="currentColor" stroke="none"/><rect x="31" y="33" width="6" height="6" rx="1"/>`),
  'ACT-14': esquema(`<circle cx="24" cy="13" r="10"/><path d="M19.5 11v.5M28.5 11v.5M19.5 15.5a5 5 0 009 0"/><circle cx="14" cy="38" r="6"/><path d="M11.5 39.5a3 3 0 005 0"/><circle cx="34" cy="38" r="6"/><path d="M31.5 40.5a3 3 0 015 0"/>`),
  'ACT-04': esquema(`<path d="M8 8h32M8 14h22"/>${CUADRO(6, 26, 16)}<circle cx="14" cy="31" r="2.5"/><path d="M14 34v5M11 36h6"/>${CUADRO(26, 26, 16)}<circle cx="34" cy="31" r="2.5" fill="currentColor" stroke="none"/><path d="M34 34v5M31 36h6"/>`),
  'ACT-05': esquema(`<path d="M10 14h5l7-6v20l-7-6h-5z"/><path d="M27 11a7 7 0 010 12M31 7a12 12 0 010 20"/>${CUADRO(8, 33, 11)}${CUADRO(29, 33, 11)}<circle cx="13.5" cy="38.5" r="2.5" fill="currentColor" stroke="none"/>`),
  'ACT-10': esquema(`<rect x="4" y="6" width="11" height="11" rx="2" stroke-dasharray="2.5 2.5"/><rect x="18.5" y="6" width="11" height="11" rx="2" stroke-dasharray="2.5 2.5"/><rect x="33" y="6" width="11" height="11" rx="2" stroke-dasharray="2.5 2.5"/><path d="M9.5 9.5v4M22 10.5c1.5-1.5 3-1.5 4 0v3M36.5 9.5h4l-4 4h4"/>${CUADRO(4, 31, 11)}${CUADRO(18.5, 31, 11)}${CUADRO(33, 31, 11)}`),
  'ACT-12': esquema(`<path d="M5 26h16v14H5zM5 26a8 6 0 0116 0M27 26h16v14H27zM27 26a8 6 0 0116 0"/><path d="M13 31v4M35 31v4"/><path d="M24 4l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/>`),
  'ACT-13': esquema(`<path d="M14 6c5 0 8 4 8 8.5S18 24 14 25c-4-1-8-6-8-10.5S9 6 14 6zM14 25l-1.5 3h3zM14 28c0 3-2 4-2 7"/><path d="M28 20a5 5 0 019-3 4.5 4.5 0 016 4 4 4 0 01-1 8H29a4.5 4.5 0 01-1-9z"/><path d="M30 38l12 6M42 38l-12 6"/>`),
  'ACT-15': esquema(`<path d="M6 10h4l5-4v14l-5-4H6z"/><path d="M19 9a5 5 0 010 8"/><path d="M27 8h15M27 13h10"/>${CUADRO(8, 30, 12)}${CUADRO(28, 30, 12)}<path d="M11 39l3-5 3 5M31 39l3-5 3 5"/>`),
  'ACT-16': esquema(`<rect x="5" y="6" width="17" height="11" rx="2"/><rect x="26" y="6" width="17" height="11" rx="2" stroke-dasharray="2.5 2.5"/><path d="M10 14v-4.5c1.5-1.5 4-1.5 5 0v4.5M10 12h5"/><rect x="5" y="31" width="11" height="11" rx="2"/><rect x="19" y="31" width="11" height="11" rx="2"/><rect x="33" y="31" width="11" height="11" rx="2"/>`),
  'ACT-17': esquema(`<path d="M24 5c8 0 13 6 13 13 0 8-7 14-13 16-6-2-13-8-13-16C11 11 16 5 24 5z"/><path d="M24 34l-2 3h4zM24 37c0 3-3 3-3 6"/>`),
};

// El motor valida fichas de selección: cada ensayo con 2 opciones o más. En «Espera la señal»
// (ACT-13) cada presentación muestra un solo estímulo y no tocarlo es la respuesta esperada ante
// el de «no»: sus bandas tienen 1 opción. Esa ficha se valida igual que las demás en todo lo
// demás, y se revisa aparte que cada banda tenga exactamente 1 opción.
export const RESPUESTA_TOCAR_O_NO = 'tocar_o_no_tocar';
export function problemasDeFicha(f) {
  if (f?.respuesta !== RESPUESTA_TOCAR_O_NO || !Array.isArray(f.bandas)) return validateFicha(f);
  const comoSeleccion = { ...f, bandas: f.bandas.map(({ disposicion, ...b }) => ({ ...b, opciones: b.opciones === 1 ? 2 : b.opciones })) };
  const errores = validateFicha(comoSeleccion);
  for (const b of f.bandas) if (b?.opciones !== 1) errores.push(`La banda ${b?.id ?? '?'} debe tener «opciones»: 1, un estímulo por presentación.`);
  return errores;
}

async function cargarFicha(url, fetchFn) {
  const res = await fetchFn(url);
  if (!res.ok) throw new FichaError(url, [`El archivo no se pudo descargar (HTTP ${res.status}).`]);
  let ficha;
  try {
    ficha = await res.json();
  } catch {
    throw new FichaError(url, ['El archivo no es JSON válido.']);
  }
  const errores = problemasDeFicha(ficha);
  if (errores.length) throw new FichaError(url, errores);
  return ficha;
}

// Carga el índice del Catálogo y las fichas con prototipo. Si el índice no carga, la
// aplicación sigue con las tres actividades del piloto. «problemas» lleva, por actividad,
// por qué su ficha no se puede usar.
export async function cargarCatalogo(fetchFn = fetch) {
  let catalogo = PILOTO.map((id) => ({ id, estado: 'Piloto', prototipo: true }));
  try {
    const res = await fetchFn('fichas/catalogo.json');
    if (res.ok) catalogo = (await res.json()).actividades;
  } catch {
    /* sin índice: solo el piloto */
  }
  const fichas = {};
  const problemas = {};
  let pausa = null;
  await Promise.all(
    catalogo
      .filter((a) => a.prototipo)
      .map(async (a) => {
        const url = `fichas/${a.id}.json`;
        try {
          if (a.id === 'ACT-17') {
            const res = await fetchFn(url);
            if (res.ok) pausa = await res.json();
          } else {
            fichas[a.id] = await cargarFicha(url, fetchFn);
          }
        } catch (e) {
          problemas[a.id] = e.errors ?? [e.message];
        }
      }),
  );
  return { catalogo, fichas, pausa, problemas };
}

// Las actividades que se pueden preparar en el inicio, en tres grupos. Una actividad con
// problemas en su ficha también aparece, para que el aviso se vea al elegirla.
export function grupos(catalogo, fichas, problemas = {}) {
  const con = catalogo.filter((a) => a.id !== 'ACT-17' && (fichas[a.id] || problemas[a.id]));
  const enInvestigacion = (a) => a.estado === 'Investigación' || INVESTIGACION.includes(a.id);
  return [
    { id: 'piloto', titulo: 'Actividades del piloto', actividades: con.filter((a) => esPiloto(a.id)) },
    { id: 'posterior', titulo: 'En preparación: uso posterior', actividades: con.filter((a) => !esPiloto(a.id) && !enInvestigacion(a)) },
    { id: 'investigacion', titulo: 'En investigación', actividades: con.filter(enInvestigacion) },
  ];
}
