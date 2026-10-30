// Datos de la revisión clínica de ítems (#revision): qué se revisa, qué falta y el CSV.
// No usa el DOM, para poder probarlo en Node.
import { toCSV } from './engine/logger.js';

export const PROFESIONES = ['terapia de lenguaje', 'terapia ocupacional', 'psicología', 'terapia conductual', 'otra'];
export const ESTADOS = ['Aprobado', 'Corregir', 'Retirar'];
export const PROBLEMAS = [
  'Ambiguo, otra opción también podría ser correcta',
  'Imagen poco reconocible',
  'Demasiado difícil para su banda',
  'Demasiado fácil para su banda',
  'No adecuado para niños de México',
  'Molesto o aversivo',
  'Otro',
];
export const FIGURAS = 'FIGURAS-ACT07';
export const CAMBIAR_SHORT = 'cambiar por otra prenda';
// Decisiones del final. clave: dónde se guarda; item: fila del CSV; concepto: su pictograma.
export const DECISIONES = [
  { clave: 'camion', item: 'DECISION-camion', concepto: 'camion', pregunta: '«El camión» debe ser', opciones: ['autobús urbano', 'camión de carga', 'quitar el concepto'] },
  { clave: 'short', item: 'DECISION-short', concepto: 'short', pregunta: '«El short»', opciones: ['se queda', CAMBIAR_SHORT] },
  { clave: 'tortilla', item: 'DECISION-tortilla', concepto: 'tortilla', pregunta: 'El pictograma de «tortilla»', opciones: ['sirve', 'no sirve'] },
];
export const REVISION_COLUMNS = [
  'revisor_iniciales', 'revisor_profesion', 'fecha_utc', 'version_app',
  'item', 'actividad', 'banda', 'concepto', 'estado', 'problemas', 'comentario',
];

// Ítems de la muestra para expertos de ACT-01 y ACT-02, en orden de código.
export const itemsDeRevision = (items) =>
  items
    .filter((i) => i.muestraExpertos && (i.actividad === 'ACT-01' || i.actividad === 'ACT-02'))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

// Iniciales para el archivo y el CSV: solo letras sin acento, en mayúsculas.
export const normalizarIniciales = (s) =>
  s.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5);

export const nuevaRevision = (iniciales, profesion) => ({
  revisor: { iniciales, profesion },
  calificaciones: {}, // código → { estado, problemas: [], comentario }
  decisiones: {}, // camion, short, shortCual, tortilla
  comentarioGeneral: '',
  pos: 0,
  soloPendientes: false,
});

export const calificado = (rev, codigo) => ESTADOS.includes(rev.calificaciones[codigo]?.estado);

// Lo que falta para descargar: ítems y figuras sin estado, y decisiones sin elegir.
export const faltantes = (rev, lista) => ({
  sinEstado: [...lista.map((i) => i.codigo), FIGURAS].filter((c) => !calificado(rev, c)),
  decisiones: DECISIONES.filter((d) => !d.opciones.includes(rev.decisiones[d.clave])),
});

export function revisionCSV(rev, lista, { fecha, version }) {
  const base = { revisor_iniciales: rev.revisor.iniciales, revisor_profesion: rev.revisor.profesion, fecha_utc: fecha, version_app: version };
  const calif = (codigo) => {
    const c = rev.calificaciones[codigo] ?? {};
    // Los tipos de problema solo cuentan si el estado es Corregir o Retirar.
    const problemas = c.estado === 'Corregir' || c.estado === 'Retirar' ? (c.problemas ?? []).join(';') : '';
    return { estado: c.estado ?? '', problemas, comentario: c.comentario ?? '' };
  };
  const d = rev.decisiones;
  const filas = [
    ...lista.map((i) => ({ ...base, item: i.codigo, actividad: i.actividad, banda: i.banda, concepto: i.concepto, ...calif(i.codigo) })),
    ...DECISIONES.map((x) => ({
      ...base,
      item: x.item,
      concepto: x.concepto,
      estado: d[x.clave] ?? '',
      comentario: x.clave === 'short' && d.short === CAMBIAR_SHORT ? (d.shortCual ?? '') : '',
    })),
    { ...base, item: FIGURAS, actividad: 'ACT-07', ...calif(FIGURAS) },
    { ...base, item: 'COMENTARIO-GENERAL', comentario: rev.comentarioGeneral },
  ];
  return toCSV(filas, REVISION_COLUMNS);
}

export const nombreArchivo = (iniciales, fechaISO) => `revision-clinica-${iniciales}-${fechaISO.slice(0, 10)}.csv`;
