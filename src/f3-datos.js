// Datos del formulario F3 de validez de contenido (#formulario): qué califica cada experto,
// qué falta y el CSV. No usa el DOM, para poder probarlo en Node.
// El análisis (I-CVI, κ* y S-CVI/Ave, Polit et al., 2007) está en tools/unir-f3.mjs.
import { toCSV } from './engine/logger.js';
import { PROBLEMAS } from './revision-datos.js';

export { PROBLEMAS };

export const ACTIVIDADES_F3 = ['ACT-01', 'ACT-02', 'ACT-07'];

// Mecánica resumida del Catálogo de actividades (sección 5), para que el experto no dependa de otro archivo.
export const MECANICA = {
  'ACT-01':
    'Una imagen muestra aparece arriba durante 1.5 s; después aparecen debajo las opciones, una idéntica a la muestra, que sigue visible. El niño toca la idéntica. En modalidad audiovisual se añade la voz «¿Cuál es igual?».',
  'ACT-02':
    'Aparece el pictograma del concepto (en audiovisual, también la voz: «¿Dónde está el perro?»). Después aparecen fotografías reales; una corresponde al concepto y ninguna repite el pictograma. El niño la toca.',
  'ACT-07':
    'Abajo hay dos cajas, por ejemplo un conejo azul y un barco amarillo. Arriba aparece una tarjeta que coincide con una caja en color y con la otra en forma. Un símbolo indica la regla: mancha de colores (por color) o silueta (por forma); en audiovisual, la voz dice «Por color» o «Por forma». El niño toca la caja que corresponde.',
};

// Dimensiones que se califican de 1 a 4 en cada actividad. Solo la relevancia decide la aceptación.
export const DIMENSIONES = [
  { id: 'relevancia', nombre: 'Relevancia', pregunta: '¿La actividad es relevante para el objetivo de su ficha?', decide: true },
  { id: 'mecanica', nombre: 'Claridad de la mecánica', pregunta: '¿Un niño de 4 a 10 años entendería qué hacer con la consigna y una demostración del terapeuta?' },
  { id: 'progresion', nombre: 'Progresión de dificultad', pregunta: '¿Cada banda es más difícil que la anterior?' },
  { id: 'cultura', nombre: 'Adecuación cultural y lingüística', pregunta: '¿Palabras, voz e imágenes son adecuadas para niños de México?' },
  { id: 'sensorial', nombre: 'Seguridad sensorial', pregunta: '¿La actividad evita sonidos, colores o animaciones que puedan molestar o sobrecargar?' },
];
export const CLARIDAD = 'claridad'; // una calificación por banda

export const GENERALES = [
  { id: 'conjunto', pregunta: 'El conjunto de las tres actividades es adecuado para un primer estudio piloto' },
  { id: 'lecturas', pregunta: 'Las frases que verá el terapeuta (lecturas permitidas de cada ficha) son prudentes y no sobreinterpretan' },
  { id: 'duracion', pregunta: 'La duración prevista (unos 6 segundos por ensayo, 6 a 8 minutos por sesión) es tolerable para estos niños' },
];

export const ESCALA = ['1 · Nada', '2 · Poco', '3 · Bastante', '4 · Mucho'];

export const DISCIPLINAS = [
  'terapia de lenguaje',
  'terapia ocupacional',
  'psicología o neuropsicología',
  'terapia conductual',
  'educación especial',
  'medicina (neuropediatría, desarrollo o psiquiatría infantil)',
  'otra',
];
export const DISCIPLINAS_REQUERIDAS = DISCIPLINAS.slice(0, 4);
export const ANIOS = ['menos de 2', '2 a 4', '5 a 9', '10 o más'];
export const AMBITOS = ['clínica o consultorio privado', 'institución pública de salud', 'escuela o USAER', 'asociación civil', 'universidad o investigación'];
export const SI_NO = ['no', 'sí', 'no sé'];

export const F3_COLUMNS = [
  'experto', 'disciplina', 'anios', 'ambito', 'ciudad', 'participa_piloto', 'familiar_piloto',
  'consentimiento', 'agradecimientos', 'fecha_utc', 'version_app',
  'tipo', 'actividad', 'dimension', 'banda', 'valor', 'item', 'problema', 'comentario',
];

export const nuevaRespuesta = () => ({
  perfil: { nombre: '', disciplina: '', anios: '', ambito: '', ciudad: '', piloto: '', familiar: '', consentimiento: false, agradecimientos: false },
  calificaciones: {}, // 'ACT-02/relevancia' o 'ACT-02/claridad/B3' → 1..4
  comentarios: {}, // 'ACT-02' → texto
  items: [], // { codigo, problema, sugerencia }
  generales: {}, // conjunto, lecturas, duracion → 1..4
  comentarioGeneral: '',
  minutos: '',
});

export const claveCalif = (actividad, dimension, banda) => [actividad, dimension, banda].filter(Boolean).join('/');

// Todas las preguntas de 1 a 4 de una actividad, con su clave, en el orden en que se muestran.
export function preguntas(actividad, ficha) {
  const bandas = (ficha?.bandas ?? []).map((b) => b.id);
  const lista = [];
  for (const d of DIMENSIONES) {
    lista.push({ clave: claveCalif(actividad, d.id), actividad, dimension: d.id, nombre: d.nombre, pregunta: d.pregunta, decide: !!d.decide });
    if (d.id === 'mecanica') {
      for (const b of ficha?.bandas ?? []) {
        lista.push({
          clave: claveCalif(actividad, CLARIDAD, b.id),
          actividad,
          dimension: CLARIDAD,
          banda: b.id,
          nombre: `Claridad de los ítems de la banda ${b.id}`,
          pregunta: `¿Las imágenes de esta banda son reconocibles y sin ambigüedad? (${b.descripcion})`,
        });
      }
    }
  }
  return bandas.length ? lista : lista.filter((p) => p.dimension !== CLARIDAD);
}

const valido = (v) => Number.isInteger(v) && v >= 1 && v <= 4;

// Lo que falta para descargar, en palabras.
export function faltantes(resp, fichas) {
  const p = resp.perfil;
  const f = [];
  if (!p.nombre.trim()) f.push('su nombre');
  if (!p.disciplina) f.push('su disciplina');
  if (!p.anios) f.push('sus años de experiencia');
  if (!p.piloto || !p.familiar) f.push('las dos preguntas sobre el piloto');
  if (!p.consentimiento) f.push('la casilla de uso de sus calificaciones');
  for (const a of ACTIVIDADES_F3) {
    const sin = preguntas(a, fichas[a]).filter((q) => !valido(resp.calificaciones[q.clave])).length;
    if (sin) f.push(`${sin} ${sin === 1 ? 'pregunta' : 'preguntas'} de ${a}`);
  }
  const g = GENERALES.filter((x) => !valido(resp.generales[x.id])).length;
  if (g) f.push('la valoración general');
  return f;
}

// Código de ítem como en la galería: ACT02-B3-07 o ACT07-B2-04.
export const normalizarCodigo = (s) => String(s).toUpperCase().replace(/\s+/g, '');

// CSV largo: una fila por calificación, ítem señalado o comentario. Los datos del experto se repiten en cada fila.
export function f3CSV(resp, fichas, { fecha, version }) {
  const p = resp.perfil;
  const base = {
    experto: p.nombre.trim(),
    disciplina: p.disciplina,
    anios: p.anios,
    ambito: p.ambito,
    ciudad: p.ciudad.trim(),
    participa_piloto: p.piloto,
    familiar_piloto: p.familiar,
    consentimiento: p.consentimiento ? 'sí' : 'no',
    agradecimientos: p.agradecimientos ? 'sí' : 'no',
    fecha_utc: fecha,
    version_app: version,
  };
  const filas = [];
  for (const a of ACTIVIDADES_F3) {
    for (const q of preguntas(a, fichas[a])) {
      filas.push({ ...base, tipo: 'calificacion', actividad: a, dimension: q.dimension, banda: q.banda ?? '', valor: resp.calificaciones[q.clave] ?? '' });
    }
    if (resp.comentarios[a]?.trim()) filas.push({ ...base, tipo: 'comentario', actividad: a, comentario: resp.comentarios[a].trim() });
  }
  for (const i of resp.items) {
    const codigo = normalizarCodigo(i.codigo);
    if (!codigo) continue;
    const actividad = /^ACT(\d\d)/.exec(codigo);
    filas.push({ ...base, tipo: 'item', actividad: actividad ? `ACT-${actividad[1]}` : '', item: codigo, problema: i.problema ?? '', comentario: (i.sugerencia ?? '').trim() });
  }
  for (const g of GENERALES) filas.push({ ...base, tipo: 'general', dimension: g.id, valor: resp.generales[g.id] ?? '' });
  if (resp.comentarioGeneral.trim()) filas.push({ ...base, tipo: 'comentario', actividad: 'GENERAL', comentario: resp.comentarioGeneral.trim() });
  filas.push({ ...base, tipo: 'minutos', valor: resp.minutos === '' ? '' : Number(resp.minutos) });
  return toCSV(filas, F3_COLUMNS);
}

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'experto';
export const nombreArchivoF3 = (nombre, fechaISO) => `f3-${slug(nombre)}-${fechaISO.slice(0, 10)}.csv`;
