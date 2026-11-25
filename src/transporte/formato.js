// Formato de lo que sale de la tableta y de lo que entra (decisión D6, 24 nov 2026; Arquitectura 9.4
// y 10.1). Es el mismo con cualquier transporte: archivo (piloto) o servidor (después). Lógica pura,
// sin DOM ni red; la criptografía está en cripto.js.
//
// Registro: { id, tipo, version, suma, datos }.
// - id: identificador único y estable. Ensayo: «E:<sesion_id>:<n>» (n: su lugar en la sesión, desde 1);
//   sesión: «S:<sesion_id>»; entrada de auditoría: «A:<n>:<huella>».
// - version: versión del formato del registro (VERSION_REGISTRO).
// - suma: SHA-256 del JSON canónico de los datos. El mismo id con la misma suma es un duplicado; el
//   mismo id con otra suma es una versión nueva del registro (solo pasa con la fila de una sesión,
//   cuando el terapeuta completa sus registros o marca el panel después de exportar).
//
// Lote: { formato, version, lote_id, dispositivo, numero, creado, version_app, commit,
//         huella_auditoria, registros, suma }. numero crece de uno en uno en cada tableta;
//         huella_auditoria es la del último eslabón de la cadena de auditoría (Arquitectura 10.1);
//         suma es la del JSON canónico del lote sin ella.
// Recibo: { formato, version, lote_id, dispositivo, numero, recibido, registros, nuevos, duplicados,
//           ensayos, suma_ensayos, huella_auditoria, firma }: lo firma el investigador (ECDSA P-256).
// Configuración: { formato, version, numero, emitida, dispositivos, ninos, resultados, firma }.
import { canonico, sha256 } from '../huella.js';

export const VERSION_REGISTRO = '1.0.0';
export const VERSION_LOTE = '1.0.0';
export const FORMATO_LOTE = 'nbm-lote';
export const FORMATO_SOBRE = 'nbm-lote-cifrado';
export const FORMATO_RECIBO = 'nbm-recibo';
export const FORMATO_CONFIGURACION = 'nbm-configuracion';
export const TIPOS = ['ensayo', 'sesion', 'auditoria'];

export const sumaDe = (x) => sha256(canonico(x ?? null));

export function registro(tipo, id, datos) {
  if (!TIPOS.includes(tipo)) throw new Error(`Tipo de registro desconocido: ${tipo}.`);
  const limpio = JSON.parse(canonico(datos));
  return { id, tipo, version: VERSION_REGISTRO, suma: sumaDe(limpio), datos: limpio };
}

// Ensayos con su id: el lugar de cada uno dentro de su sesión, en el orden del registro.
export function conIds(ensayos) {
  const n = new Map();
  return ensayos.map((r) => {
    const k = (n.get(r.sesion_id) ?? 0) + 1;
    n.set(r.sesion_id, k);
    return { id: `E:${r.sesion_id}:${k}`, fila: r };
  });
}

// Registros de un lote. ensayos: ya en la forma exportada (paraExportar y comoSeExporta), sin los
// de la sesión en curso. sesiones: sus filas. auditoria: la cadena entera.
export function registrosDe({ ensayos = [], sesiones = [], auditoria = [] }) {
  return [
    ...conIds(ensayos).map(({ id, fila }) => registro('ensayo', id, fila)),
    ...sesiones.map((s) => registro('sesion', `S:${s.sesion_id}`, s)),
    ...auditoria.map((e) => registro('auditoria', `A:${e.n}:${e.huella}`, e)),
  ];
}

export const sumaDeIds = (ids) => sumaDe([...ids].sort());

export function armarLote({ dispositivo, numero, creado, registros, huella_auditoria, version_app = null, commit = null }) {
  if (!/^[0-9a-f]{32}$/.test(String(dispositivo))) throw new Error('El identificador de la tableta no es válido.');
  if (!Number.isInteger(numero) || numero < 1) throw new Error('El número de lote no es válido.');
  const lote = { formato: FORMATO_LOTE, version: VERSION_LOTE, lote_id: `${dispositivo}-${numero}`, dispositivo, numero, creado, version_app, commit, huella_auditoria, registros };
  return { ...lote, suma: sumaDe(lote) };
}

// Comprueba un lote ya descifrado: forma, suma del lote y suma de cada registro. Devuelve
// { ok, motivo }. Un solo registro alterado invalida el lote entero (no se importa a medias).
export function verificarLote(lote) {
  if (!lote || lote.formato !== FORMATO_LOTE) return { ok: false, motivo: 'no es un lote de AutiPal' };
  if (lote.version !== VERSION_LOTE) return { ok: false, motivo: `versión del lote no admitida: ${lote.version}` };
  const { suma, ...resto } = lote;
  if (sumaDe(resto) !== suma) return { ok: false, motivo: 'la suma del lote no coincide' };
  if (lote.lote_id !== `${lote.dispositivo}-${lote.numero}`) return { ok: false, motivo: 'el identificador del lote no coincide' };
  const vistos = new Set();
  for (const r of lote.registros ?? []) {
    if (!TIPOS.includes(r.tipo)) return { ok: false, motivo: `tipo de registro desconocido: ${r.tipo}` };
    if (r.version !== VERSION_REGISTRO) return { ok: false, motivo: `versión de registro no admitida: ${r.version}` };
    if (sumaDe(r.datos) !== r.suma) return { ok: false, motivo: `la suma del registro ${r.id} no coincide` };
    if (vistos.has(r.id)) return { ok: false, motivo: `el registro ${r.id} está dos veces` };
    vistos.add(r.id);
  }
  return { ok: true, motivo: null };
}

export const idsDeEnsayos = (lote) => lote.registros.filter((r) => r.tipo === 'ensayo').map((r) => r.id);

// Recibo sin firmar (la firma la agrega cripto.firmar en la computadora del investigador).
export function armarRecibo(lote, { recibido, nuevos, duplicados }) {
  const ensayos = idsDeEnsayos(lote);
  return {
    formato: FORMATO_RECIBO,
    version: VERSION_LOTE,
    lote_id: lote.lote_id,
    dispositivo: lote.dispositivo,
    numero: lote.numero,
    recibido,
    registros: lote.registros.length,
    nuevos,
    duplicados,
    ensayos: ensayos.length,
    suma_ensayos: sumaDeIds(ensayos),
    huella_auditoria: lote.huella_auditoria,
  };
}

// ---------- Configuración firmada (Arquitectura 9.6 y 14) ----------

const MODOS = ['familiarizacion', 'fase1', 'fase2', 'fase3', 'cierre'];
const CONSENTIMIENTOS = ['vigente', 'suspendido', 'retirado'];
const MODALIDADES = ['V', 'AV', 'sin_diferencia'];
const CAMPOS_NINO = ['codigo', 'icono', 'color', 'edad_meses', 'consentimiento', 'video', 'modo_fase', 'bandas'];

// Comprueba el contenido de una configuración (la firma se comprueba aparte). Devuelve { ok, motivo }.
// Solo admite los campos del padrón: nada que identifique al niño (RNF-07).
export function verificarConfiguracion(c) {
  if (!c || c.formato !== FORMATO_CONFIGURACION) return { ok: false, motivo: 'no es una configuración de AutiPal' };
  if (c.version !== VERSION_LOTE) return { ok: false, motivo: `versión de la configuración no admitida: ${c.version}` };
  if (!Number.isInteger(c.numero) || c.numero < 1) return { ok: false, motivo: 'el número de la configuración no es válido' };
  if (!Array.isArray(c.ninos)) return { ok: false, motivo: 'falta la lista de niños' };
  if (c.dispositivos !== undefined && !Array.isArray(c.dispositivos)) return { ok: false, motivo: 'la lista de tabletas no es válida' };
  const codigos = new Set();
  for (const n of c.ninos) {
    const extra = Object.keys(n).filter((k) => !CAMPOS_NINO.includes(k));
    if (extra.length) return { ok: false, motivo: `campo no permitido en el padrón: ${extra.join(', ')}` };
    if (!/^[0-9a-f]{32}$/.test(String(n.codigo))) return { ok: false, motivo: 'un código de niño no es válido' };
    if (codigos.has(n.codigo)) return { ok: false, motivo: `el código ${n.codigo.slice(0, 8)} está dos veces` };
    codigos.add(n.codigo);
    if (!CONSENTIMIENTOS.includes(n.consentimiento)) return { ok: false, motivo: `consentimiento no válido: ${n.consentimiento}` };
    if (!MODOS.includes(n.modo_fase)) return { ok: false, motivo: `modo de fase no válido: ${n.modo_fase}` };
    if (!Number.isInteger(n.edad_meses)) return { ok: false, motivo: 'la edad debe ser un número entero de meses' };
  }
  for (const [codigo, r] of Object.entries(c.resultados ?? {})) {
    if (!codigos.has(codigo)) return { ok: false, motivo: 'hay resultados de un niño que no está en el padrón' };
    for (const m of r.mejor_modalidad ?? []) if (!MODALIDADES.includes(m.modalidad) || !m.actividad || !m.fecha) return { ok: false, motivo: 'un resultado de modalidad no es válido' };
    for (const b of r.nivel_b ?? []) if (!b.parametro || !Number.isFinite(b.valor) || !b.fecha) return { ok: false, motivo: 'un resultado del nivel B no es válido' };
  }
  return { ok: true, motivo: null };
}

// ---------- Historial que queda en la tableta (Arquitectura 6.1 y 9.3) ----------

// Al cargar el recibo de un lote, sus ensayos salen del registro de la tableta. Para el panel, la
// regla de adaptación, las sondas y el dominio quedan solo estas columnas de cada ensayo, en la forma
// exportada: sin tiempos de la consigna, el audio ni la retroalimentación, sin posiciones, toques,
// tableta ni versiones. test/transporte.test.js comprueba que con ellas el panel, los indicadores, la
// línea base de la regulación y el dominio dan lo mismo que con el registro completo.
export const COLUMNAS_HISTORIAL = [
  'sesion_id', 'bloque', 'ensayo', 'codigo_nino', 'actividad', 'item', 'banda', 'modalidad', 'modo_fase', 'n_opciones',
  't_opciones_insercion', 't_opciones', 't_toque', 'opcion_elegida', 'opcion_elegida_id', 'acierto', 'omision',
  'perdida_foco', 'cuadros_perdidos', 'cuadros_total', 'periodo_cuadro_ms', 'interrumpido', 'fallo_tecnico',
  'tr_bruto_ms', 'tr_corregido_ms', 'anticipatoria', 'fuera_de_tarea', 'fuera_de_tarea_provisional', 'peso_calidad',
  'mitad_fase2', 'sonda', 'reaparicion',
];

export const aHistorial = (fila) => Object.fromEntries(COLUMNAS_HISTORIAL.map((c) => [c, fila[c] ?? null]));
