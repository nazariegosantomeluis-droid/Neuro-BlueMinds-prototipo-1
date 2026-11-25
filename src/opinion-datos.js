// Datos del formulario de opinión de expertos (#opinion; tanda 10). Separado del F3: el F3 mide la
// validez de contenido de las actividades; este, si la plataforma funciona como el experto espera en su
// práctica. Sin cuenta y sin datos personales del experto más allá de sus iniciales, su profesión y
// sus años de experiencia. No usa el DOM, para poder probarlo en Node; tools/unir-opinion.mjs une los
// CSV y ordena los problemas.
import { toCSV } from './engine/logger.js';
import { DISCIPLINAS } from './f3-datos.js';

export const VERSION_OPINION = '0.1.0';
export const PROFESIONES = DISCIPLINAS;

// Áreas que se revisan, en el orden de una sesión real. «revisar»: qué mirar en cada una.
export const AREAS = [
  { id: 'inicio-padron', nombre: 'Inicio y niños inscritos', revisar: 'Preparar un bloque o una sesión, inscribir a un niño (sin datos que lo identifiquen), confirmar que es el niño correcto por su ícono y su color.' },
  { id: 'familiarizacion', nombre: 'Familiarización', revisar: 'La escalera de 10 ensayos por banda que propone la banda inicial y la confirmación del terapeuta al cerrar.' },
  { id: 'sesion-act01', nombre: 'Sesión del niño: ACT-01 Igual a la muestra', revisar: 'Lo que ve y oye el niño, el tamaño de las opciones, los tiempos y la retroalimentación.' },
  { id: 'sesion-act02', nombre: 'Sesión del niño: ACT-02 Pictograma e imagen', revisar: 'Lo que ve y oye el niño, las imágenes, la voz y la retroalimentación.' },
  { id: 'sesion-act07', nombre: 'Sesión del niño: ACT-07 Cambia la regla', revisar: 'La tarjeta, las cajas, la señal de la regla y la retroalimentación.' },
  { id: 'menu-terapeuta', nombre: 'Menú del terapeuta', revisar: 'Abrirlo con la pulsación prolongada; pausar, terminar con motivo, fijar la banda, desactivar la adaptación y anular un cambio.' },
  { id: 'registros-cierre', nombre: 'Registros al cerrar la sesión', revisar: 'Participación, episodios de desregulación, eventos adversos y decisiones informadas.' },
  { id: 'panel', nombre: 'Panel del terapeuta', revisar: 'Con el niño de demostración: resumen, indicadores con su intervalo, comparación con la línea base, cambios que persisten, dominio y adaptaciones.' },
  { id: 'sesiones-indicadores', nombre: 'Sesiones e indicadores', revisar: 'La lista de sesiones, el resumen de cada bloque y lo que se ve en cada fase.' },
  { id: 'sin-conexion-pin', nombre: 'Modo sin conexión y PIN', revisar: 'Crear y escribir el PIN, el bloqueo tras 5 minutos sin uso y usar la aplicación sin internet.' },
];

export const FUNCIONA = [
  { id: 'si', texto: 'Sí' },
  { id: 'con_problemas', texto: 'Con problemas' },
  { id: 'no', texto: 'No' },
];
export const GRAVEDAD = [
  { id: 'menor', texto: 'Menor' },
  { id: 'importante', texto: 'Importante' },
  { id: 'impide', texto: 'Impide usarla' },
];
export const ORDEN_GRAVEDAD = { impide: 3, importante: 2, menor: 1 };

export const ABIERTAS = [
  { id: 'falta', pregunta: '¿Qué le falta a la plataforma?' },
  { id: 'sobra', pregunta: '¿Qué le sobra?' },
  { id: 'usaria', pregunta: '¿La usaría con sus pacientes? ¿Por qué?' },
];

export const OPINION_COLUMNS = ['iniciales', 'profesion', 'anios_experiencia', 'fecha_utc', 'version_app', 'commit', 'version_formulario', 'tipo', 'area', 'funciona', 'gravedad', 'texto'];

export const nuevaOpinion = () => ({ perfil: { iniciales: '', profesion: '', anios: '' }, areas: {}, abiertas: {} });

export const inicialesValidas = (s) => /^[A-ZÁÉÍÓÚÑ]{2,4}$/u.test(String(s ?? '').trim().toUpperCase());
const aniosValidos = (a) => a !== '' && Number.isInteger(Number(a)) && Number(a) >= 0 && Number(a) <= 60;
export const necesitaGravedad = (funciona) => funciona === 'con_problemas' || funciona === 'no';

// Lo que falta para descargar, en palabras.
export function faltantes(op) {
  const f = [];
  if (!inicialesValidas(op.perfil.iniciales)) f.push('sus iniciales (2 a 4 letras)');
  if (!op.perfil.profesion) f.push('su profesión');
  if (!aniosValidos(op.perfil.anios)) f.push('sus años de experiencia');
  const sin = AREAS.filter((a) => !FUNCIONA.some((x) => x.id === op.areas[a.id]?.funciona));
  if (sin.length) f.push(`si funciona: ${sin.map((a) => a.nombre).join(', ')}`);
  const sinGravedad = AREAS.filter((a) => necesitaGravedad(op.areas[a.id]?.funciona) && !GRAVEDAD.some((g) => g.id === op.areas[a.id]?.gravedad));
  if (sinGravedad.length) f.push(`la gravedad del problema: ${sinGravedad.map((a) => a.nombre).join(', ')}`);
  return f;
}

// Una fila por área y una por pregunta abierta; los datos del experto y la versión, en cada fila.
export function opinionCSV(op, { fecha, version, commit = null }) {
  const base = {
    iniciales: String(op.perfil.iniciales).trim().toUpperCase(),
    profesion: op.perfil.profesion,
    anios_experiencia: Number(op.perfil.anios),
    fecha_utc: fecha,
    version_app: version,
    commit: commit ?? '',
    version_formulario: VERSION_OPINION,
  };
  const filas = AREAS.map((a) => {
    const r = op.areas[a.id] ?? {};
    return { ...base, tipo: 'area', area: a.id, funciona: r.funciona ?? '', gravedad: necesitaGravedad(r.funciona) ? (r.gravedad ?? '') : '', texto: String(r.cambiaria ?? '').trim() };
  });
  for (const q of ABIERTAS) filas.push({ ...base, tipo: 'abierta', area: q.id, texto: String(op.abiertas[q.id] ?? '').trim() });
  return toCSV(filas, OPINION_COLUMNS);
}

export const nombreArchivoOpinion = (iniciales, fechaISO) => `opinion-${String(iniciales).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '') || 'experto'}-${fechaISO.slice(0, 10)}.csv`;
