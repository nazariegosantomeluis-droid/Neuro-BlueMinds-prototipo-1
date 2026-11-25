// Niño de demostración para los expertos (tanda 10). Un botón del inicio lo crea con su historia
// sembrada (config/demo-historia.json: familiarización, fase 1, fase 2 y fase 3, del simulador con el
// motor real), para que el experto vea el panel con indicadores sin hacer 15 sesiones; otro lo borra.
// Es ficticio: su código es «demo-nino» y sus sesiones DN-…, que nunca salen en un lote
// (src/transporte/salida.js) y se descargan como datos ficticios.
import { NINO_DEMO, esNinoDemo } from './ninos.js';

const deDemo = (r) => r.codigo_nino === NINO_DEMO;

export const hayDemo = (ninos) => ninos.rows().some(esNinoDemo);

// historia: el contenido de config/demo-historia.json. Devuelve cuántas sesiones y ensayos sembró.
export function crearDemo({ ninos, log, sesiones }, historia) {
  if (hayDemo(ninos)) return { sesiones: 0, ensayos: 0 };
  borrarRestos({ log, sesiones });
  ninos.add({ ...historia.nino, codigo: NINO_DEMO });
  // Una escritura por registro (el almacén cifrado escribe cada vez).
  log.edit((all) => all.push(...historia.ensayos.map((r) => ({ ...r, codigo_nino: NINO_DEMO }))));
  sesiones.edit((all) => all.push(...historia.sesiones.map((s) => ({ ...s, codigo_nino: NINO_DEMO }))));
  return { sesiones: historia.sesiones.length, ensayos: historia.ensayos.length };
}

function borrarRestos({ log, sesiones, historial }) {
  const quitar = (all) => all.splice(0, all.length, ...all.filter((r) => !deDemo(r)));
  log.edit(quitar);
  sesiones.edit(quitar);
  historial?.edit(quitar);
}

// Borra al niño de demostración, sus sesiones y sus ensayos (también los que hizo el experto con él).
export function borrarDemo({ ninos, log, sesiones, historial }) {
  const antes = { ensayos: log.rows().filter(deDemo).length, sesiones: sesiones.rows().filter(deDemo).length };
  ninos.edit((all) => all.splice(0, all.length, ...all.filter((n) => !esNinoDemo(n))));
  borrarRestos({ log, sesiones, historial });
  return antes;
}
