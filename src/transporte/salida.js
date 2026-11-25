// Salida y entrada de datos de la tableta (decisión D6, 24 nov 2026; Arquitectura 9.2, 9.3, 9.4, 9.6,
// 10.1 y 14). No sabe qué transporte usa: solo llama a transporte.entregar(sobre) y
// transporte.recibir() (src/transporte/index.js).
//
// - exportar(): arma un lote con los ensayos y las sesiones de los niños (nunca los de la
//   demostración ni los del modo experto, que son ficticios) y la cadena de auditoría entera, con la
//   huella de su último eslabón; lo cifra con la llave pública del investigador y lo entrega. La
//   sesión en curso no sale hasta que se cierra.
// - Recibo firmado: la tableta comprueba la firma y que el recibo sea de un lote suyo pendiente con
//   los mismos ensayos; solo entonces borra esos ensayos del registro. De cada uno queda en el
//   historial de la tableta solo lo que usan el panel y la regla (formato.COLUMNAS_HISTORIAL).
// - Configuración firmada: fija el consentimiento y el modo de fase de cada niño (el terapeuta no los
//   cambia) y trae los resultados del entorno de análisis (nivel B y modalidad con mejor
//   desempeño). Con una configuración cargada, la tableta está en modo de estudio.
// - Lo rechazado (firma inválida, recibo ajeno, configuración vieja) no cambia nada y queda en la
//   auditoría.
import { registrosDe, armarLote, conIds, sumaDeIds, verificarConfiguracion, aHistorial, sumaDe, FORMATO_RECIBO, FORMATO_CONFIGURACION } from './formato.js';
import { cifrarLote, verificarFirma } from './cripto.js';
import { esNinoDemo } from '../ninos.js';

export const SALIDA_KEY = 'neuro-blueminds.salida';
export const HISTORIAL_KEY = 'neuro-blueminds.historial';
export const DIAS_AVISO = 7; // Arquitectura 9.4
const DIA_MS = 24 * 60 * 60 * 1000;

// Datos de un niño: sesiones S-… (las de la demostración son DEMO-… y las del modo experto, EXP-…).
export const esDeNino = (sesion_id) => String(sesion_id).startsWith('S-');
// Lo que se puede descargar sin cifrar (Arquitectura 9.2): en modo de estudio, solo lo ficticio.
export const filtrarDescarga = (rows, estudio) => (estudio ? rows.filter((r) => !esDeNino(r.sesion_id)) : rows);

const nuevoId = (cripto) => [...cripto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

// storage: getItem/setItem del almacén cifrado. log, historial, sesiones: registros (createLog).
// auditoria: crearAuditoria(...). llaves: { cifrado: JWK pública, firma: JWK pública } del
// investigador. exportables(): ensayos en la forma exportada. enCurso(): id de la sesión en curso.
export function crearSalida({ storage, log, historial, sesiones, auditoria, ninos, llaves, transporte, exportables, enCurso = () => null, ahora = () => Date.now(), version = () => ({}), cripto = globalThis.crypto }) {
  function leer() {
    let e = null;
    try {
      e = JSON.parse(storage.getItem(SALIDA_KEY) ?? 'null');
    } catch {
      e = null;
    }
    return e ?? { dispositivo: null, siguiente: 1, pendientes: [], recibos: [], ultima_exportacion: null, configuracion: null };
  }
  const guardar = (e) => storage.setItem(SALIDA_KEY, JSON.stringify(e));
  const auditar = (tipo, datos) => auditoria.agregar(tipo, datos);

  function dispositivo() {
    const e = leer();
    if (!e.dispositivo) {
      e.dispositivo = nuevoId(cripto);
      guardar(e);
    }
    return e.dispositivo;
  }

  // Ensayos y sesiones de niños que pueden salir (sin la sesión en curso). Una sesión ya entregada
  // con recibo sale otra vez solo si cambió (por ejemplo, el terapeuta completó sus registros).
  function contenido() {
    const actual = enCurso();
    const sale = (id) => esDeNino(id) && id !== actual;
    const enviadas = leer().enviadas ?? {};
    const ensayos = exportables().filter((r) => sale(r.sesion_id));
    const conEnsayos = new Set(ensayos.map((r) => r.sesion_id));
    return { ensayos, sesiones: sesiones.rows().filter((s) => sale(s.sesion_id) && (conEnsayos.has(s.sesion_id) || enviadas[s.sesion_id] !== sumaDe(s))) };
  }

  async function aplicarRecibo(recibo) {
    if (!(await verificarFirma(recibo, llaves.firma))) {
      auditar('recibo_rechazado', { lote_id: recibo?.lote_id ?? null, motivo: 'firma inválida' });
      throw new Error('La firma del recibo no es válida: no se borró nada.');
    }
    const e = leer();
    if (recibo.dispositivo !== e.dispositivo) {
      auditar('recibo_rechazado', { lote_id: recibo.lote_id, motivo: 'recibo de otra tableta' });
      throw new Error('El recibo es de otra tableta: no se borró nada.');
    }
    if (e.recibos.some((r) => r.lote_id === recibo.lote_id)) return { borrados: 0, repetido: true };
    const p = e.pendientes.find((x) => x.lote_id === recibo.lote_id);
    // Recibo de un lote ya cubierto por el recibo de uno posterior (llegaron en desorden): no hay
    // nada que borrar.
    if (!p && e.recibos.some((r) => r.numero > recibo.numero)) {
      e.recibos.push({ lote_id: recibo.lote_id, numero: recibo.numero, recibido: recibo.recibido, ensayos: recibo.ensayos, nuevos: recibo.nuevos, duplicados: recibo.duplicados });
      guardar(e);
      return { borrados: 0, repetido: false, superado: true };
    }
    if (!p || p.suma_ensayos !== recibo.suma_ensayos) {
      auditar('recibo_rechazado', { lote_id: recibo.lote_id, motivo: p ? 'los ensayos no coinciden' : 'no hay un lote pendiente con ese id' });
      throw new Error(p ? 'El recibo no corresponde a los ensayos del lote: no se borró nada.' : 'Esta tableta no tiene pendiente ese lote: no se borró nada.');
    }
    // Borra del registro los ensayos del lote; de cada uno queda su forma corta en el historial.
    const ids = new Set(p.ensayos);
    const exportadas = new Map(conIds(exportables()).map(({ id, fila }) => [id, fila]));
    const quitar = new Set(conIds(log.rows()).filter(({ id }) => ids.has(id)).map(({ fila }) => fila));
    // Una sola escritura del historial (y otra del registro): en el almacén cifrado cada escritura
    // es una operación aparte.
    const cortas = conIds(log.rows()).filter(({ fila }) => quitar.has(fila)).map(({ id }) => aHistorial(exportadas.get(id)));
    historial.edit((all) => all.push(...cortas));
    log.edit((all) => {
      const quedan = all.filter((r) => !quitar.has(r));
      all.length = 0;
      all.push(...quedan);
    });
    // Un lote lleva todos los ensayos que quedaban: su recibo cubre también los pendientes anteriores.
    e.enviadas = { ...(e.enviadas ?? {}), ...(p.sesiones ?? {}) };
    e.pendientes = e.pendientes.filter((x) => x.numero > recibo.numero);
    e.recibos.push({ lote_id: recibo.lote_id, numero: recibo.numero, recibido: recibo.recibido, ensayos: recibo.ensayos, nuevos: recibo.nuevos, duplicados: recibo.duplicados });
    guardar(e);
    auditar('recibo', { lote_id: recibo.lote_id, ensayos_borrados: quitar.size, huella_auditoria: recibo.huella_auditoria });
    return { borrados: quitar.size, repetido: false };
  }

  async function aplicarConfiguracion(c) {
    const rechazar = (motivo) => {
      auditar('configuracion_rechazada', { numero: c?.numero ?? null, motivo });
      throw new Error(`Configuración rechazada: ${motivo}. No se cambió nada.`);
    };
    if (!(await verificarFirma(c, llaves.firma))) rechazar('la firma no es válida');
    const v = verificarConfiguracion(c);
    if (!v.ok) rechazar(v.motivo);
    const e = leer();
    const yo = e.dispositivo ?? dispositivo();
    if (c.dispositivos?.length && !c.dispositivos.includes(yo)) rechazar('no es para esta tableta');
    if (e.configuracion && c.numero <= e.configuracion.numero) rechazar(`es la número ${c.numero} y esta tableta ya tiene la ${e.configuracion.numero}`);
    // El padrón pasa a ser el de la configuración; la banda que el terapeuta fijó en la
    // familiarización se conserva si la configuración no trae otra.
    const antes = new Map(ninos.rows().map((n) => [n.codigo, n]));
    // El niño de demostración (ficticio) se queda.
    const padron = [...c.ninos.map((n) => ({ ...n, video: Boolean(n.video), bandas: n.bandas ?? antes.get(n.codigo)?.bandas ?? {} })), ...ninos.rows().filter(esNinoDemo)];
    ninos.edit((all) => {
      all.length = 0;
      all.push(...padron);
    });
    const { firma, ...sinFirma } = c;
    const e2 = leer();
    e2.dispositivo = yo;
    e2.configuracion = { numero: c.numero, emitida: c.emitida ?? null, resultados: c.resultados ?? {}, ninos: c.ninos.map((n) => n.codigo), firma: firma.valor };
    guardar(e2);
    auditar('configuracion', { numero: c.numero, emitida: c.emitida ?? null, ninos: c.ninos.length, llave: firma.llave, suma: sumaDe(sinFirma) });
    return { numero: c.numero, ninos: c.ninos.length };
  }

  async function procesar(contenidos) {
    const out = [];
    for (const x of contenidos) {
      if (x?.formato === FORMATO_RECIBO) out.push({ tipo: 'recibo', ...(await aplicarRecibo(x)) });
      else if (x?.formato === FORMATO_CONFIGURACION) out.push({ tipo: 'configuracion', ...(await aplicarConfiguracion(x)) });
      else throw new Error('El archivo no es un recibo ni una configuración de AutiPal.');
    }
    return out;
  }

  return {
    estado: leer,
    dispositivo,
    get estudio() {
      return Boolean(leer().configuracion);
    },
    // Qué saldría en el siguiente lote.
    porExportar() {
      const c = contenido();
      return { ensayos: c.ensayos.length, sesiones: c.sesiones.length };
    },
    async exportar() {
      const c = contenido();
      if (!c.ensayos.length && !c.sesiones.length) throw new Error('No hay datos de niños que exportar.');
      const yo = dispositivo();
      const e = leer();
      const cadena = auditoria.entradas();
      const registros = registrosDe({ ensayos: c.ensayos, sesiones: c.sesiones, auditoria: cadena });
      const creado = new Date(ahora()).toISOString();
      const { version: version_app = null, commit = null } = version();
      const lote = armarLote({ dispositivo: yo, numero: e.siguiente, creado, registros, huella_auditoria: auditoria.verificar().ultima, version_app, commit });
      const sobre = await cifrarLote(lote, llaves.cifrado, cripto);
      const ids = registros.filter((r) => r.tipo === 'ensayo').map((r) => r.id);
      // El lote queda pendiente antes de entregarlo: si la entrega se corta después de que el
      // servidor lo guardó, su recibo llega después (recibir()) y el número nunca se repite.
      e.siguiente += 1;
      e.pendientes.push({ lote_id: lote.lote_id, numero: lote.numero, creado, ensayos: ids, suma_ensayos: sumaDeIds(ids), sesiones: Object.fromEntries(c.sesiones.map((s) => [s.sesion_id, sumaDe(s)])) });
      e.ultima_exportacion = creado;
      guardar(e);
      auditar('exportacion', { lote_id: lote.lote_id, transporte: transporte.tipo, registros: registros.length, ensayos: ids.length, sesiones: c.sesiones.length, huella_auditoria: lote.huella_auditoria });
      const entrega = await transporte.entregar(sobre);
      const aplicado = entrega.recibo ? await aplicarRecibo(entrega.recibo) : null;
      return { lote_id: lote.lote_id, ensayos: ids.length, sesiones: c.sesiones.length, sobre, recibo: aplicado };
    },
    aplicarRecibo,
    aplicarConfiguracion,
    // Lo que trae el transporte (archivos cargados o respuestas del servidor).
    recibir: async () => procesar(await transporte.recibir()),
    // Aviso de Arquitectura 9.4: hay ensayos de niños sin recibo y pasaron 7 días o más desde la
    // última exportación (o, si nunca se exportó, desde la sesión más antigua sin exportar).
    aviso() {
      const e = leer();
      const c = contenido();
      if (!c.ensayos.length && !e.pendientes.length) return null;
      const desdeSesion = Math.min(...c.sesiones.map((s) => Date.parse(s.inicio)).filter(Number.isFinite));
      const desde = e.ultima_exportacion ? Date.parse(e.ultima_exportacion) : desdeSesion;
      if (!Number.isFinite(desde)) return null;
      const dias = Math.floor((ahora() - desde) / DIA_MS);
      return dias >= DIAS_AVISO ? { dias, ensayos: c.ensayos.length, pendientes: e.pendientes.length } : null;
    },
  };
}
