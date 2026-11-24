// Herramienta de reproducción (H6.4; Arquitectura 10.2; RNF-08). Toma los ensayos crudos de una
// sesión y las versiones registradas, vuelve a calcular los indicadores, las decisiones de la regla
// de adaptación y de la envolvente y las señales de alerta temprana, y compara el resultado con lo
// registrado. Se aplica a 20 sesiones elegidas al azar antes del estudio y cada mes durante él.
//
// Entradas (lo que descarga la tableta): el registro por ensayo (JSON), las sesiones (JSON) y la
// auditoría (JSON, con el resultado de los indicadores de cada sesión).
//   node tools/reproducir.mjs registro.json sesiones.json auditoria.json [n = 20] [semilla = 1]
//
// Qué se toma como dato y qué se recalcula:
// - Se recalcula todo lo que sale de los ensayos: precisión, omisiones y prematuras de cada
//   ventana, la propuesta de la regla, la decisión de la envolvente (ejecutada, invariante, banda),
//   los ensayos válidos, las señales de alerta temprana y los indicadores A1 a A12.
// - Se toman del registro las entradas que no salen de los ensayos: las órdenes del terapeuta (en el
//   punto en que se dieron: propuestas_previas y ensayos_validos) y el tiempo de uso de cada
//   decisión (uso_ms, para INV-8).
// - La huella de los parámetros de la sesión debe ser la de esta versión; si no, la sesión se
//   reporta como de otra versión (hay que reproducirla con el commit de esa versión).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearEnvolvente, huellaDeParametros } from '../src/envolvente.js';
import { crearAdaptacionDeBloque } from '../src/adaptacion-en-linea.js';
import { lineaBaseRegulacion } from '../src/adaptacion.js';
import { utilizable } from '../src/indicadores/nucleo.js';
import { calcularIndicadores } from '../src/indicadores/exportar.js';
import { alertaDeSesion } from '../src/alerta.js';
import { paraExportar } from '../src/engine/quality.js';
import { rng, seedOf, shuffle } from '../src/engine/selector.js';
import { canonico } from '../src/huella.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));

// Campos de cada decisión que deben coincidir.
const CAMPOS = ['bloque', 'actividad', 'ventana', 'ensayos', 'precision', 'omisiones', 'prematuras', 'senal', 'accion', 'banda_actual', 'banda_propuesta', 'ejecutada', 'invariante', 'pausa_ofrecida', 'banda_resultante', 'ensayos_validos'];
const igual = (a, b) => canonico(a ?? null) === canonico(b ?? null);

// Vuelve a decidir la adaptación de una sesión. Devuelve las decisiones recalculadas y las
// diferencias de banda de cada bloque.
function reproducirAdaptacion(sesion, filas, previas, { config, fichas }) {
  const modo = config.modos[sesion.modo_fase] ?? {};
  const plan = (sesion.plan_sesion ?? []).filter((p) => !p.escalera && fichas[p.actividad]?.bandas);
  const envolvente = crearEnvolvente({
    bandas: Object.fromEntries(plan.map((p) => [p.actividad, fichas[p.actividad].bandas.map((b) => b.id)])),
    iniciales: Object.fromEntries(plan.map((p) => [p.actividad, p.banda])),
    dificultad: modo.dificultad,
    adaptacion: Boolean(modo.adaptacion),
    huella: sesion.huella_parametros,
  });
  const registradas = sesion.adaptacion_propuestas ?? [];
  const ordenes = (sesion.ordenes_terapeuta ?? []).filter((o) => !o.bloqueada);
  const decisiones = [];
  const diferencias = [];
  let aplicadas = 0;
  // Las órdenes dadas cuando había j decisiones se aplican antes de la decisión j.
  const aplicarOrdenesHasta = (j) => {
    while (aplicadas < ordenes.length && (ordenes[aplicadas].propuestas_previas ?? 0) <= j) {
      const o = ordenes[aplicadas++];
      envolvente.terapeuta({ ...o, ensayosValidos: o.ensayos_validos ?? 0 });
    }
  };
  if (!modo.adaptacion) {
    if (registradas.length) diferencias.push('la sesión tiene decisiones de adaptación y su modo no es adaptativo');
    return { decisiones, diferencias };
  }
  const estado = { sinSubir: false };
  const bloques = [...new Set(filas.map((r) => r.bloque))].sort((a, b) => a - b);
  for (const bloque of bloques) {
    const delBloque = filas.filter((r) => r.bloque === bloque);
    const actividad = delBloque[0].actividad;
    const ficha = fichas[actividad];
    if (!ficha?.bandas) continue;
    aplicarOrdenesHasta(decisiones.length);
    if (envolvente.estado.bandas[actividad] !== delBloque[0].banda) diferencias.push(`bloque ${bloque}: la banda registrada es ${delBloque[0].banda} y la reproducida, ${envolvente.estado.bandas[actividad]}`);
    const antes = filas.filter((r) => r.actividad === actividad && r.bloque < bloque);
    let hechos = [];
    const adaptacion = crearAdaptacionDeBloque({
      envolvente,
      actividad,
      bandas: ficha.bandas.map((b) => b.id),
      estado,
      base: lineaBaseRegulacion(previas.filter((r) => r.actividad === actividad)),
      ordenesDelBloque: () => ordenes.filter((o) => o.bloque === bloque && (o.propuestas_previas ?? 0) <= decisiones.length),
      ensayosValidos: () => [...antes, ...hechos].filter(utilizable).length,
      usoMs: () => registradas[decisiones.length]?.uso_ms ?? 0,
      registrar: (registro) => decisiones.push(registro),
    });
    for (let k = 1; k <= delBloque.length; k++) {
      hechos = delBloque.slice(0, k);
      if (adaptacion.alTerminarEnsayo(hechos)) aplicarOrdenesHasta(decisiones.length);
    }
    aplicarOrdenesHasta(decisiones.length);
    adaptacion.alTerminarBloque(delBloque);
  }
  if (decisiones.length !== registradas.length) diferencias.push(`decisiones: ${registradas.length} registradas, ${decisiones.length} reproducidas`);
  decisiones.forEach((d, j) => {
    for (const c of CAMPOS) if (registradas[j] && !igual(d[c], registradas[j][c])) diferencias.push(`decisión ${j + 1}, ${c}: registrada ${canonico(registradas[j][c])}, reproducida ${canonico(d[c])}`);
  });
  return { decisiones, diferencias };
}

// Reproduce una sesión. registro: todos los ensayos; sesiones: todas, en orden; auditoria: las entradas.
export function reproducirSesion(sesionId, { registro, sesiones, auditoria }, d = { config: leer('fichas/sesion.json'), fichas: Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, leer(`fichas/${id}.json`)])), items: leer('items/items.json').items }) {
  const sesion = sesiones.find((s) => s.sesion_id === sesionId);
  const diferencias = [];
  if (!sesion) return { sesion_id: sesionId, reproducida: false, diferencias: ['la sesión no está en sesiones.json'] };
  if (sesion.huella_parametros && sesion.huella_parametros !== huellaDeParametros()) {
    return { sesion_id: sesionId, reproducida: false, otra_version: true, diferencias: ['la huella de los parámetros es de otra versión: reprodúcela con el commit de esa versión'] };
  }
  const filas = registro.filter((r) => r.sesion_id === sesionId);
  const delNino = sesiones.filter((s) => s.codigo_nino === sesion.codigo_nino && String(s.sesion_id).startsWith('S-'));
  const hasta = delNino.slice(0, delNino.findIndex((s) => s.sesion_id === sesionId) + 1);
  const ids = new Set(hasta.map((s) => s.sesion_id));
  const previas = registro.filter((r) => r.codigo_nino === sesion.codigo_nino && ids.has(r.sesion_id) && r.sesion_id !== sesionId);
  // 1. Adaptación y envolvente.
  diferencias.push(...reproducirAdaptacion(sesion, filas, previas, d).diferencias);
  // 2. Señales de alerta temprana.
  const sinTiempos = Object.values(d.fichas).filter((f) => f.unidadDelBloque === 'secuencia').map((f) => f.id);
  if (sesion.alerta_temprana && !igual(alertaDeSesion(paraExportar(filas, { sinTiempos })), sesion.alerta_temprana)) diferencias.push('las señales de alerta temprana no coinciden');
  // 3. Indicadores, contra los de la auditoría de la sesión.
  const auditados = auditoria.filter((e) => e.tipo === 'indicadores' && e.datos?.sesion_id === sesionId).at(-1);
  if (!auditados) diferencias.push('la auditoría no tiene los indicadores de la sesión');
  else {
    const ensayos = paraExportar(registro, { sinTiempos }).filter((r) => ids.has(r.sesion_id));
    const resultado = calcularIndicadores(ensayos, hasta, { fichas: d.fichas, items: d.items }).filter((x) => x.sesion_id === sesionId);
    if (!igual(JSON.parse(JSON.stringify(resultado)), auditados.datos.resultado)) {
      const dif = resultado.filter((x, k) => !igual(JSON.parse(JSON.stringify(x)), auditados.datos.resultado[k])).map((x) => `${x.actividad ?? 'fase'} ${x.indicador}`);
      diferencias.push(`indicadores distintos: ${dif.join(', ') || 'número de filas'}`);
    }
  }
  return { sesion_id: sesionId, reproducida: diferencias.length === 0, diferencias };
}

// Elige n sesiones al azar (con semilla) y las reproduce.
export function reproducir(datos, { n = 20, semilla = 1 } = {}) {
  const candidatas = datos.sesiones.filter((s) => String(s.sesion_id).startsWith('S-')).map((s) => s.sesion_id);
  const elegidas = shuffle(candidatas, rng(seedOf(`reproducir:${semilla}`))).slice(0, n);
  const resultados = elegidas.map((id) => reproducirSesion(id, datos));
  return { elegidas: elegidas.length, reproducidas: resultados.filter((r) => r.reproducida).length, resultados };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [r, s, a, n = 20, semilla = 1] = process.argv.slice(2);
  if (!r || !s || !a) {
    console.error('Uso: node tools/reproducir.mjs registro.json sesiones.json auditoria.json [n] [semilla]');
    process.exit(2);
  }
  const json = (f) => JSON.parse(readFileSync(f, 'utf8'));
  const aud = json(a);
  const res = reproducir({ registro: json(r), sesiones: json(s), auditoria: aud.entradas ?? aud }, { n: Number(n), semilla: Number(semilla) });
  for (const x of res.resultados) console.log(`${x.reproducida ? 'igual  ' : 'DISTINTA'} ${x.sesion_id}${x.diferencias.length ? `\n  ${x.diferencias.join('\n  ')}` : ''}`);
  console.log(`Reproducidas exactamente: ${res.reproducidas} de ${res.elegidas}.`);
  process.exit(res.reproducidas === res.elegidas ? 0 : 1);
}
