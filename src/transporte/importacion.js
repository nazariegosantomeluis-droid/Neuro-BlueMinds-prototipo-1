// Importación de lotes (decisión D6; Arquitectura 9.4 y 10.1). La usan tools/importar.mjs, en la
// computadora del investigador responsable, y el servidor de prueba (test/servidor-prueba.mjs): un
// servidor futuro haría lo mismo con el mismo formato.
//
// Para cada sobre: lo descifra, comprueba la suma del lote y la de cada registro, comprueba la cadena
// de auditoría (entera, que su último eslabón sea el que trae el lote y que continúe la ya importada
// de esa tableta), descarta los duplicados y guarda lo nuevo. Si algo no cuadra, el lote entero se
// rechaza y no se guarda nada (no hay importaciones a medias). Devuelve un recibo firmado (ECDSA
// P-256): con él la tableta borra los ensayos del lote. Importar dos veces el mismo lote no cambia
// la base y devuelve el mismo recibo (importación idempotente).
//
// base: objeto JSON { registros: { id → { tipo, suma, lote_id, numero, datos, versiones } },
//                     cadenas: { dispositivo → [huella de cada entrada, en orden] },
//                     lotes: { lote_id → { suma, recibo } } }
import { descifrarLote, firmar } from './cripto.js';
import { verificarLote, armarRecibo } from './formato.js';
import { verificarCadena } from '../auditoria.js';

export const baseVacia = () => ({ registros: {}, cadenas: {}, lotes: {} });

function rechazo(motivo) {
  const e = new Error(motivo);
  e.rechazo = true;
  return e;
}

// texto: el contenido del archivo del lote. llaves: { cifrado: { privada }, firma: { privada } }.
// Devuelve { recibo, nuevos, duplicados, versiones, repetido }. Lanza un error con .rechazo si el
// lote no se puede importar (y la base queda como estaba).
export async function importarLote(base, texto, llaves, { ahora = () => new Date().toISOString(), cripto = globalThis.crypto } = {}) {
  let sobre;
  try {
    sobre = typeof texto === 'string' ? JSON.parse(texto) : texto;
  } catch {
    throw rechazo('el archivo está incompleto o no es JSON');
  }
  let lote;
  try {
    lote = await descifrarLote(sobre, llaves.cifrado.privada, cripto);
  } catch (e) {
    throw rechazo(e.message);
  }
  const v = verificarLote(lote);
  if (!v.ok) throw rechazo(v.motivo);

  // Lote ya importado: el mismo recibo, sin tocar la base.
  const previo = base.lotes[lote.lote_id];
  if (previo) {
    if (previo.suma !== lote.suma) throw rechazo(`ya se importó otro lote con el id ${lote.lote_id}`);
    return { recibo: previo.recibo, nuevos: 0, duplicados: lote.registros.length, versiones: 0, repetido: true };
  }

  // Cadena de auditoría: entera, terminada en la huella del lote y continuación de la ya importada.
  const entradas = lote.registros.filter((r) => r.tipo === 'auditoria').map((r) => r.datos).sort((a, b) => a.n - b.n);
  const cadena = verificarCadena(entradas);
  if (!cadena.ok) throw rechazo(`la cadena de auditoría está rota en la entrada ${cadena.rota_en} (${cadena.motivo})`);
  if (cadena.ultima !== lote.huella_auditoria) throw rechazo('la huella de la auditoría del lote no es la de su último eslabón');
  const conocida = base.cadenas[lote.dispositivo] ?? [];
  const comun = Math.min(conocida.length, entradas.length);
  for (let i = 0; i < comun; i++) if (conocida[i] !== entradas[i].huella) throw rechazo(`la cadena de auditoría no continúa la ya importada (entrada ${i + 1})`);

  // Registros: nuevos, duplicados (mismo id y misma suma) o versión nueva de una sesión.
  const cambios = [];
  let nuevos = 0;
  let duplicados = 0;
  let versiones = 0;
  for (const r of lote.registros) {
    const ya = base.registros[r.id];
    if (!ya) {
      nuevos++;
      cambios.push(() => (base.registros[r.id] = { tipo: r.tipo, suma: r.suma, lote_id: lote.lote_id, numero: lote.numero, datos: r.datos, versiones: [] }));
    } else if (ya.suma === r.suma || (ya.versiones ?? []).some((x) => x.suma === r.suma)) {
      duplicados++;
    } else if (r.tipo === 'sesion') {
      // La fila de una sesión cambia cuando el terapeuta completa sus registros después de exportar.
      // Manda la del lote más reciente; las demás quedan como versiones anteriores.
      versiones++;
      cambios.push(() => {
        const nueva = { suma: r.suma, lote_id: lote.lote_id, numero: lote.numero, datos: r.datos };
        if (lote.numero > ya.numero) {
          ya.versiones.push({ suma: ya.suma, lote_id: ya.lote_id, numero: ya.numero, datos: ya.datos });
          Object.assign(ya, nueva);
        } else ya.versiones.push(nueva);
      });
    } else {
      throw rechazo(`el registro ${r.id} ya se importó con otro contenido (los ${r.tipo === 'ensayo' ? 'ensayos' : 'registros de auditoría'} no cambian)`);
    }
  }

  // Todo cuadra: se guarda.
  for (const c of cambios) c();
  if (entradas.length > conocida.length) base.cadenas[lote.dispositivo] = entradas.map((e) => e.huella);
  const recibo = await firmar(armarRecibo(lote, { recibido: ahora(), nuevos, duplicados }), llaves.firma.privada, cripto);
  base.lotes[lote.lote_id] = { suma: lote.suma, recibo };
  return { recibo, nuevos, duplicados, versiones, repetido: false };
}

// Filas de la base por tipo (para exportar a CSV o JSON en la computadora del investigador).
export const filasDe = (base, tipo) => Object.entries(base.registros).filter(([, r]) => r.tipo === tipo).map(([, r]) => r.datos);
