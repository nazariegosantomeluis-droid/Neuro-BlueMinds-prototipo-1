// A11 y A12 (H3.5; Modelo 4.1; Arquitectura 6.1): persistencia y abandono, al cerrar la sesión,
// sobre las actividades y sesiones del niño. Funciones puras sobre sesiones.csv y el registro por
// ensayo. Mismo resultado que los demás: { id, nombre, valor, ic, n, disponible, motivo, version }.
import { PARAMETROS as P, VERSIONES, NOMBRES } from './parametros.js';
import { wilson } from './estadistica.js';
import { calidadBaja } from './nucleo.js';

const TERMINAR = ['terminar_bloque', 'terminar_sesion'];

// Actividades (bloques) que empezaron en una sesión, con si se completaron: un bloque empezó si
// tiene al menos un ensayo registrado, y se completó si no se terminó desde el menú durante él.
export function actividadesDeSesion(sesion, ensayos) {
  const bloques = [...new Set(ensayos.filter((r) => r.sesion_id === sesion.sesion_id).map((r) => r.bloque))].sort((a, b) => a - b);
  const ordenes = sesion.ordenes_terapeuta ?? [];
  return bloques.map((bloque) => ({
    sesion_id: sesion.sesion_id,
    bloque,
    actividad: ensayos.find((r) => r.sesion_id === sesion.sesion_id && r.bloque === bloque)?.actividad ?? null,
    completada: !ordenes.some((o) => TERMINAR.includes(o.accion) && o.bloque === bloque),
  }));
}

// Una sesión termina antes de lo previsto si se terminó desde el menú (orden terminar_sesion). En
// las sesiones anteriores al menú del terapeuta (sin ordenes_terapeuta) se usa terminada_antes.
export const terminoAntes = (sesion) => (sesion.ordenes_terapeuta ? sesion.ordenes_terapeuta.some((o) => o.accion === 'terminar_sesion') : Boolean(sesion.terminada_antes));

function resultado(id, { x, n, calidad, extra = {} }) {
  const motivos = [];
  if (calidad === null || calidad === undefined) motivos.push('la sesión no tiene ensayos para calcular su calidad');
  else if (calidadBaja(calidad)) motivos.push(`calidad de la sesión ${calidad.toFixed(2)}, menor de ${P.calidadMinima.valor.toFixed(2)}`);
  if (n < P.minimos[id].valor) motivos.push(`${n} ${P.minimos[id].unidad}; el mínimo es ${P.minimos[id].valor}`);
  const disponible = !motivos.length;
  return {
    id,
    nombre: NOMBRES[id],
    valor: disponible ? x / n : null,
    ic: disponible ? wilson(x, n, P.confianza.valor) : null,
    n,
    disponible,
    motivo: disponible ? null : motivos.join('; '),
    version: VERSIONES[id],
    ...extra,
  };
}

// A11. Persistencia: actividades completadas / actividades iniciadas, en las sesiones dadas (las del
// niño hasta la de hoy, en orden). 5 actividades.
export function a11(sesiones, ensayos, { calidad }) {
  const acts = sesiones.flatMap((s) => actividadesDeSesion(s, ensayos));
  return resultado('A11', { x: acts.filter((a) => a.completada).length, n: acts.length, calidad, extra: { completadas: acts.filter((a) => a.completada).length } });
}

// A12. Abandono: sesiones terminadas antes de lo previsto / sesiones. 5 sesiones.
export function a12(sesiones, { calidad }) {
  const x = sesiones.filter(terminoAntes).length;
  return resultado('A12', { x, n: sesiones.length, calidad, extra: { terminadas_antes: x } });
}
