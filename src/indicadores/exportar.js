// indicadores.csv (H3.6; Arquitectura 6.2 y 6.3): una fila por sesión, actividad e indicador, con
// valor, intervalo, n, disponibilidad, motivo, calidad de la sesión y versiones. Se calcula desde el
// registro por ensayo y sesiones.csv, así que cualquiera puede recalcularlo (en R, con los vectores
// de test/vectores/indicadores.json).
//
// Indicadores del nivel B (μ, σ, τ, EZ, α, λ, IG, IRet, ICS, ICM…) no van aquí: Arquitectura 6.1
// los deja al entorno de análisis, que los calcula con las columnas del registro por ensayo.
import { toCSV } from '../engine/logger.js';
import { VERSION_INDICADORES } from './parametros.js';
import { indicadoresDeSesion, calidadDeSesion } from './nucleo.js';
import { a9, criterioDe, unidadDe } from './dominio.js';
import { a11, a12 } from './persistencia.js';

export const INDICADORES_COLUMNS = [
  'sesion_id', 'codigo_nino', 'modo_fase', 'actividad', 'indicador', 'nombre',
  'valor', 'ic_inferior', 'ic_superior', 'n', 'disponible', 'motivo',
  'calidad_sesion', 'version_definicion', 'version_indicadores', 'detalle',
];

const BASE = new Set(['id', 'nombre', 'valor', 'ic', 'n', 'disponible', 'motivo', 'version']);

function fila(sesion, actividad, calidad, x) {
  const detalle = Object.fromEntries(Object.entries(x).filter(([k]) => !BASE.has(k)));
  return {
    sesion_id: sesion.sesion_id,
    codigo_nino: sesion.codigo_nino ?? null,
    modo_fase: sesion.modo_fase ?? null,
    actividad,
    indicador: x.id,
    nombre: x.nombre,
    valor: x.valor,
    ic_inferior: x.ic?.[0] ?? null,
    ic_superior: x.ic?.[1] ?? null,
    n: x.n,
    disponible: x.disponible,
    motivo: x.motivo,
    calidad_sesion: calidad,
    version_definicion: x.version,
    version_indicadores: VERSION_INDICADORES,
    detalle: Object.keys(detalle).length ? detalle : null,
  };
}

// Las sesiones con niño son las de código S- (las de demostración y del modo experto no tienen
// historia de un niño: su A9 y su A10 solo miran la propia sesión, y no tienen A11 ni A12).
const conNino = (s) => String(s.sesion_id).startsWith('S-');

// ensayos: el registro por ensayo (ya con fuera_de_tarea marcado); sesiones: sesiones.csv, en orden;
// fichas: id → ficha; items: el banco (para el concepto de cada ítem).
export function calcularIndicadores(ensayos, sesiones, { fichas = {}, items = [] } = {}) {
  const porCodigo = new Map(items.map((i) => [i.codigo, i]));
  const out = [];
  sesiones.forEach((s, k) => {
    const deSesion = ensayos.filter((r) => r.sesion_id === s.sesion_id);
    const calidad = calidadDeSesion(deSesion);
    const anteriores = new Set(sesiones.slice(0, k).map((x) => x.sesion_id));
    for (const actividad of [...new Set(deSesion.map((r) => r.actividad))]) {
      const rows = deSesion.filter((r) => r.actividad === actividad);
      const previas = conNino(s) ? ensayos.filter((r) => anteriores.has(r.sesion_id) && r.codigo_nino === s.codigo_nino && r.actividad === actividad) : [];
      const ficha = fichas[actividad];
      const res = [...indicadoresDeSesion(rows, { calidad, previas }), a9(rows, { previas, unidad: unidadDe(ficha, porCodigo), criterio: criterioDe(ficha), calidad })];
      for (const x of res.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))) out.push(fila(s, actividad, calidad, x));
    }
    if (conNino(s)) {
      const delNino = sesiones.slice(0, k + 1).filter((x) => x.codigo_nino === s.codigo_nino && conNino(x));
      out.push(fila(s, null, calidad, a11(delNino, ensayos, { calidad })));
      out.push(fila(s, null, calidad, a12(delNino, { calidad })));
    }
  });
  return out;
}

export const indicadoresCSV = (filas) => toCSV(filas, INDICADORES_COLUMNS);
