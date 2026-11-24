// Sesiones simuladas de niños ficticios (H6.4 y H8.3): el plan de cada modo de fase (src/fases.js:
// familiarización con su escalera, fases 1 y 2, fase 3 y cierre) con el motor de ensayos real
// (entorno de tiempo simulado, tools/sim-env.mjs), la regla de adaptación y la envolvente de la
// aplicación (src/adaptacion-en-linea.js), órdenes del terapeuta al azar en la fase 3, señales de
// alerta temprana y la auditoría de los indicadores de cada sesión, como hace app.js al cerrar.
// Devuelve lo mismo que la tableta guarda: ensayos, sesiones y auditoría. No simula lo que solo
// llena la interfaz (referencia motora, rutinas y registros del terapeuta al cerrar).
//
// El niño simulado acierta con una probabilidad que baja con la banda, responde en un tiempo
// lognormal que sube con la banda y a veces omite o se anticipa. Todo sale de un generador con
// semilla: la misma semilla da las mismas sesiones.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simEnv } from './sim-env.mjs';
import { startBlock } from '../src/engine/trial.js';
import { createLog, comoSeExporta, SESION_COLUMNS, VERSION_APP } from '../src/engine/logger.js';
import { rng, seedOf, pickItems, pickComposed } from '../src/engine/selector.js';
import { paraExportar } from '../src/engine/quality.js';
import * as seleccion from '../src/activities/seleccion.js';
import * as cambiaRegla from '../src/activities/cambia-regla.js';
import { crearEnvolvente, huellaDeParametros } from '../src/envolvente.js';
import { crearAdaptacionDeBloque } from '../src/adaptacion-en-linea.js';
import { lineaBaseRegulacion } from '../src/adaptacion.js';
import { utilizable } from '../src/indicadores/nucleo.js';
import { VERSION_INDICADORES } from '../src/indicadores/parametros.js';
import { calcularIndicadores } from '../src/indicadores/exportar.js';
import { alertaDeSesion } from '../src/alerta.js';
import { crearAuditoria, AUDITORIA_COLUMNS } from '../src/auditoria.js';
import { huellaDe } from '../src/huella.js';
import { ordenRegistro } from '../src/menu-terapeuta.js';
import { planDeSesion, itemsDeMitad, bloqueFase2, historialFase2, primeraModalidadFase2, bandaAprobada, bandaPropuesta, siguePorEscalera, ensayosParaInclusion, avisoDeInclusion } from '../src/fases.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
export const datos = () => ({
  config: leer('fichas/sesion.json'),
  fichas: Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, leer(`fichas/${id}.json`)])),
  items: leer('items/items.json').items,
});

const FRAME = 1000 / 60;
const paint = (t) => Math.round((Math.floor(t / FRAME) + 2) * FRAME * 10) / 10;
const normal = (u) => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
const ORDENES = ['desactivar_adaptacion', 'reactivar_adaptacion', 'episodio_desregulacion', 'fijar_banda', 'anular_cambio_banda'];

// Ensayos de un bloque, como prepararBloque de app.js (sin imágenes, sondas ni temas).
function ensayosDeBloque({ ficha, banda, n, items, rand, numero, mitad = null, modalidad, composicion = null }) {
  const deBanda = itemsDeMitad(items.filter((i) => i.actividad === ficha.id && i.banda === banda.id && (!i.modalidad || i.modalidad === modalidad)), mitad);
  if (ficha.pantalla === 'cambia-regla') {
    const pareja = ficha.parejas[numero % ficha.parejas.length];
    const comp = composicion ?? banda.composicion;
    const secuencias = !comp.some((c) => c.includes('{')) ? pickItems(deBanda, Math.ceil(n / 10), rand) : pickComposed(deBanda, comp, ['color', 'forma'], rand);
    return cambiaRegla.toTrials(secuencias, { banda, pareja }).slice(0, n);
  }
  return seleccion.toTrials(pickItems(deBanda, n, rand)).slice(0, n);
}

// Un niño simulado: sus parámetros salen de la semilla.
export function crearNino(semilla) {
  const u = rng(seedOf(`nino:${semilla}`));
  return { codigo: `SIM${String(semilla).padStart(4, '0')}`, base: 0.75 + 0.2 * u(), rt: 800 + 600 * u(), omite: 0.01 + 0.05 * u(), anticipa: 0.01 + 0.03 * u() };
}

// Una sesión. historia: { ensayos, sesiones, auditoria } (se agrega a ella). modo: 'fase1' o 'fase3'.
export async function simularSesion({ nino, numero, modo, historia, datos: d = datos(), conOrdenes = true }) {
  const { config, fichas, items } = d;
  const s = { id: `S-${nino.codigo}-${String(numero).padStart(2, '0')}`, codigo: nino.codigo, modo, bloque: 0 };
  const u = rng(seedOf(`${s.id}:nino`));
  const log = createLog(null);
  const env = simEnv({
    start: 1000,
    paint,
    frames: (ms) => ({ total: Math.round(ms / FRAME), late: 0, periodo: FRAME }),
    audio: { available: async () => true, play: async () => ({ tInicio: env.now() + 3, fuente: 'archivo', latenciaMs: 10, fin: new Promise((res) => env.at(900, () => res(env.now()))) }) },
  });
  const inicio = env.now();
  // Plan del modo, como app.js (con la fase 2 del Protocolo 3.3).
  let fase2 = null;
  if (modo === 'fase2') {
    const previas = historialFase2(historia.sesiones, nino.codigo);
    fase2 = { version: 'protocolo', numero: previas.length + 1, primera: primeraModalidadFase2(previas, rng(seedOf(`${s.id}:fase2`)), config.fase2.maxSeguidasMismaModalidad) };
  }
  const pasos = planDeSesion({ modo, fichas, config, bandasNino: nino.bandasFase1 ?? {}, fase2 }).filter((p) => p.tipo === 'bloque' || p.tipo === 'escalera');
  const plan = pasos.map((p) => (p.escalera || p.ensayosPorBanda ? { actividad: p.actividad, escalera: true, bandas: p.bandas, modalidad: p.modalidad, ensayos_por_banda: p.ensayosPorBanda, aciertos_para_subir: p.aciertosParaSubir } : { actividad: p.actividad, banda: p.banda, modalidad: p.modalidad, ensayos: p.ensayos, ...(p.mitad ? { mitad: p.mitad } : {}) }));
  const modoCfg = config.modos[modo];
  const conBanda = plan.filter((p) => !p.escalera);
  const envolvente = crearEnvolvente({ bandas: Object.fromEntries(conBanda.map((p) => [p.actividad, fichas[p.actividad].bandas.map((b) => b.id)])), iniciales: Object.fromEntries(conBanda.map((p) => [p.actividad, p.banda])), dificultad: modoCfg.dificultad, adaptacion: Boolean(modoCfg.adaptacion), huella: huellaDeParametros() });
  const sesion = Object.fromEntries(SESION_COLUMNS.map((c) => [c, null]));
  Object.assign(sesion, { sesion_id: s.id, codigo_nino: nino.codigo, dispositivo: 'simulado', inicio: `2026-11-${String(numero).padStart(2, '0')}T10:00:00.000Z`, ensayos: 0, pausas: [], terminada_antes: false, nivel_apoyo: [], version_indicadores: VERSION_INDICADORES, modo_fase: modo, huella_parametros: envolvente.huellaInicial, plan_sesion: plan, ordenes_terapeuta: [], tema_imagenes: 'general', ...(fase2 ? { fase2_version: fase2.version, fase2_sesion: fase2.numero, fase2_bloque: bloqueFase2(fase2.numero, config.fase2.sesionesPorBloque), fase2_primera: fase2.primera } : {}), ...(modoCfg.adaptacion ? { adaptacion_propuestas: [] } : {}) });
  historia.sesiones.push(sesion);
  const auditoria = crearAuditoria({ rows: () => historia.auditoria.slice(), add: (e) => historia.auditoria.push(e) });
  auditoria.agregar('inicio_sesion', { sesion_id: s.id, codigo_nino: nino.codigo, modo_fase: modo, version_app: VERSION_APP, version_indicadores: VERSION_INDICADORES, huella_parametros: envolvente.huellaInicial });
  const estado = { sinSubir: false };
  const escalera = [];
  // Un bloque con el motor real. Devuelve { rows, cortado }.
  async function bloque({ ficha, banda, n, modalidad, mitad = null, composicion = null, adaptativo = false }) {
    s.bloque++;
    const trials = ensayosDeBloque({ ficha, banda, n, items, rand: rng(seedOf(`${s.id}:${s.bloque}`)), numero, mitad, modalidad, composicion });
    const ordenesDelBloque = () => sesion.ordenes_terapeuta.filter((o) => o.bloque === s.bloque);
    const historial = historia.ensayos.filter((r) => r.codigo_nino === nino.codigo && r.actividad === ficha.id);
    const adaptacion = adaptativo
      ? crearAdaptacionDeBloque({
          envolvente,
          actividad: ficha.id,
          bandas: ficha.bandas.map((b) => b.id),
          estado,
          base: lineaBaseRegulacion(historial),
          ordenesDelBloque,
          ensayosValidos: () => log.rows().filter((r) => r.actividad === ficha.id && utilizable(r)).length,
          usoMs: () => env.now() - inicio,
          registrar: (registro, res) => {
            sesion.adaptacion_propuestas.push(registro);
            Object.assign(sesion, { envolvente_bloqueos: envolvente.estado.bloqueos.length, aviso_bloqueos: res.aviso });
            auditoria.agregar('adaptacion', { sesion_id: s.id, bloque: s.bloque, actividad: ficha.id, ventana: registro.ventana, accion: registro.accion, banda_actual: registro.banda_actual, banda_propuesta: registro.banda_propuesta, ejecutada: registro.ejecutada, invariante: registro.invariante });
          },
        })
      : null;
    // El terapeuta, a veces, da una orden en la pausa después de una ventana.
    const ordenAlAzar = (ensayo) => {
      if (!conOrdenes || u() > 0.25) return;
      const accion = ORDENES[Math.floor(u() * ORDENES.length)];
      const validos = log.rows().filter((r) => r.actividad === ficha.id && utilizable(r)).length;
      const detalle = accion === 'fijar_banda' ? { actividad: ficha.id, de: envolvente.estado.bandas[ficha.id], a: ficha.bandas[Math.floor(u() * ficha.bandas.length)].id } : null;
      const orden = { accion, detalle };
      const ultimo = envolvente.terapeuta({ ...orden, ensayosValidos: validos });
      if (accion === 'anular_cambio_banda') orden.detalle = ultimo;
      const o = ordenRegistro(orden, { hora: null, ms: env.now() - inicio, bloque: s.bloque, ensayo, modo, banda: envolvente.estado.bandas[ficha.id], adaptacion: envolvente.estado.adaptacion, propuestas_previas: sesion.adaptacion_propuestas.length, ensayos_validos: validos, actividad: ficha.id });
      sesion.ordenes_terapeuta.push(o);
      auditoria.agregar('orden', { sesion_id: s.id, accion: o.accion, detalle: o.detalle, bloque: o.bloque, ensayo: o.ensayo, propuestas_previas: o.propuestas_previas });
    };
    let block;
    let cortado = false;
    const i = ficha.bandas.findIndex((b) => b.id === banda.id);
    const view = {
      clear() {},
      showPrompt() {},
      prepareOptions: async () => {},
      showAnnouncement() {},
      showFeedback() {},
      showOptions(opciones) {
        const correcta = opciones.findIndex((o) => o.correcta) + 1;
        const r = u();
        if (r < nino.omite) return;
        const acierta = u() < Math.max(0.3, Math.min(0.98, nino.base - 0.1 * i));
        const pos = acierta ? correcta : (correcta % opciones.length) + 1;
        const ms = r < nino.omite + nino.anticipa ? 60 + 60 * u() : nino.rt * (1 + 0.12 * i) * Math.exp(0.35 * normal(u));
        const d = paint(env.now()) - env.now();
        env.at(d + Math.min(ms, 7000), () => block.pointer({ t: env.now(), x: 100 * pos, y: 400, pos }));
      },
    };
    const base = { sesion_id: s.id, bloque: s.bloque, codigo_nino: nino.codigo, dispositivo: 'simulado', banda: banda.id, version_app: VERSION_APP, modo_fase: modo, tema_imagenes: 'general' };
    block = startBlock({
      ficha,
      modalidad,
      trials,
      base,
      env,
      view,
      log,
      rand: rng(seedOf(`${s.id}:${s.bloque}:posiciones`)),
      alTerminarEnsayo: (hechos) => {
        const res = adaptacion?.alTerminarEnsayo(hechos);
        if (!res) return false;
        ordenAlAzar(hechos.length);
        if (res.cambio) cortado = true;
        return res.cambio;
      },
    });
    const rows = await env.run(block.done);
    adaptacion?.alTerminarBloque(rows);
    // Fase 2: la mitad de conceptos de cada ensayo, como app.js.
    if (modo === 'fase2' && ficha.id === config.fase2.actividad) {
      const deMitad = new Map(items.filter((it) => it.actividad === ficha.id).map((it) => [it.codigo, it.mitad]));
      log.edit((all) => all.filter((r) => rows.includes(r)).forEach((r) => (r.mitad_fase2 = deMitad.get(r.item) ?? null)));
    }
    return { rows, cortado };
  }
  for (const paso of pasos) {
    const ficha = fichas[paso.actividad];
    if (paso.ensayosPorBanda) {
      // Escalera de la familiarización (decisión R6): desde B1, 10 ensayos por banda.
      for (const id of paso.bandas) {
        const banda = ficha.bandas.find((b) => b.id === id);
        const { rows } = await bloque({ ficha, banda, n: paso.ensayosPorBanda, modalidad: paso.modalidad, composicion: paso.composicion?.[id] ?? null });
        const peldano = { actividad: ficha.id, banda: id, ensayos: rows.length, aciertos: rows.filter((r) => r.acierto).length };
        peldano.aprobada = bandaAprobada(peldano, paso);
        escalera.push(peldano);
        if (!siguePorEscalera(peldano, paso.bandas)) break;
      }
      continue;
    }
    let restantes = paso.ensayos;
    for (let parte = 0; restantes > 0; parte++) {
      const banda = ficha.bandas.find((b) => b.id === (envolvente.estado.bandas[paso.actividad] ?? paso.banda));
      const r = await bloque({ ficha, banda, n: restantes, modalidad: paso.modalidad, mitad: paso.mitad ?? null, adaptativo: Boolean(modoCfg.adaptacion) });
      restantes -= r.rows.length;
      if (!r.cortado) break;
    }
  }
  if (modoCfg.escalera) {
    const filasSesion = log.rows();
    sesion.escalera_familiarizacion = escalera;
    sesion.banda_inicial_propuesta = Object.fromEntries(modoCfg.escalera.actividades.map((a) => [a, bandaPropuesta(escalera.filter((x) => x.actividad === a), fichas[a].bandas.map((b) => b.id))]));
    sesion.ensayos_inclusion = ensayosParaInclusion(filasSesion);
    sesion.aviso_inclusion = avisoDeInclusion(filasSesion, modoCfg.minimoEnsayosInclusion?.valor ?? 10);
    nino.bandasFase1 = sesion.banda_inicial_propuesta;
  }
  const filas = comoSeExporta(log.rows());
  historia.ensayos.push(...filas);
  sesion.ensayos = filas.length;
  sesion.duracion_uso_ms = env.now() - inicio;
  sesion.alerta_temprana = alertaDeSesion(paraExportar(filas, { sinTiempos: [] }));
  // Auditoría de los indicadores de la sesión, como auditarIndicadores de app.js.
  const hasta = historia.sesiones.filter((x) => x.codigo_nino === nino.codigo);
  const ids = new Set(hasta.map((x) => x.sesion_id));
  const ensayos = paraExportar(historia.ensayos.filter((r) => ids.has(r.sesion_id)), { sinTiempos: [] });
  const resultado = calcularIndicadores(ensayos, hasta, { fichas, items }).filter((x) => x.sesion_id === s.id);
  auditoria.agregar('indicadores', { sesion_id: s.id, version_indicadores: VERSION_INDICADORES, huella_entrada: huellaDe({ ensayos, sesiones: [...ids] }), resultado, huella_resultado: huellaDe(resultado) });
  return sesion;
}

// n niños, cada uno con sesiones de la fase 1 y de la fase 3. Lo que guarda la tableta, pasado por
// JSON (como al guardarlo y descargarlo).
// secuencia: cuántas sesiones de cada modo, en orden (como un niño del estudio, más corto).
export async function simularSesiones({ ninos = 2, fase1 = 5, fase3 = 5, semilla = 1, conOrdenes = true, secuencia = null } = {}) {
  const d = datos();
  const historia = { ensayos: [], sesiones: [], auditoria: [] };
  const orden = secuencia ?? [['fase1', fase1], ['fase3', fase3]];
  for (let k = 0; k < ninos; k++) {
    const nino = crearNino(semilla * 1000 + k);
    let numero = 0;
    for (const [modo, n] of orden) for (let j = 0; j < n; j++) await simularSesion({ nino, numero: ++numero, modo, historia, datos: d, conOrdenes });
  }
  return JSON.parse(JSON.stringify(historia));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [ninos = 2, fase1 = 5, fase3 = 5] = process.argv.slice(2).map(Number);
  process.stdout.write(JSON.stringify(await simularSesiones({ ninos, fase1, fase3 })) + '\n');
}
