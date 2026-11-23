// Sondas de generalización (Catálogo 7.3 y ficha de ACT-02 en el Catálogo 5.2) y presentación
// distribuida (Catálogo 7.2). Lógica pura: recibe los ensayos ya armados del bloque y devuelve
// otros, con las sondas y las reapariciones en su lugar. app.js decide cuándo se usan.
//
// - Sonda: desde la fase 3, 1 de cada 10 ensayos presenta el tercer ejemplar, no usado antes, de un
//   concepto ya dominado, con retroalimentación neutra sin corrección. El ejemplar 3 nunca se usa en
//   la práctica, así que cada concepto se sondea una sola vez.
// - Presentación distribuida: un concepto que alcanza el dominio reaparece después de 1, 3 y 7
//   sesiones; su precisión en esas reapariciones es IRet. En el piloto, solo desde la fase 3.
// Las sondas y las reapariciones no cambian el número de ensayos del bloque: reemplazan ensayos.

// Código de una sonda: el del ítem del que sale, con el ejemplar al final.
export const codigoDeSonda = (codigo, ejemplar) => `${codigo}-S${ejemplar}`;
export const codigoBase = (codigo) => String(codigo).replace(/-S\d+$/, '');

// Ruta de la imagen de otro ejemplar del mismo concepto: misma carpeta, otro número
// (assets/img/perro/1.svg → assets/img/perro/3.svg).
export const srcDeEjemplar = (src, ejemplar) => String(src).replace(/\/\d+(\.\w+)$/, `/${ejemplar}$1`);

// Ensayo de sonda a partir del ensayo de práctica de un concepto: la opción correcta pasa a ser el
// ejemplar reservado. Las demás opciones y la consigna no cambian.
export function ensayoDeSonda(trial, ejemplar) {
  return {
    ...trial,
    codigo: codigoDeSonda(trial.codigo, ejemplar),
    sonda: true,
    opciones: trial.opciones.map((o) => (o.correcta ? { ...o, id: `${o.concepto}-${ejemplar}`, ejemplar, src: srcDeEjemplar(o.src, ejemplar) } : o)),
  };
}

// Conceptos de las filas: el concepto del ítem en el banco, sin el sufijo de sonda.
export const conceptoDeFila = (itemsPorCodigo) => (r) => itemsPorCodigo.get(codigoBase(r.item))?.concepto ?? null;

// Sesiones del niño con la actividad, en orden, a partir de sus filas del registro.
export function sesionesEnOrden(rows) {
  const vistas = new Map();
  for (const r of rows) if (!vistas.has(r.sesion_id)) vistas.set(r.sesion_id, r.modo_fase ?? null);
  return [...vistas.entries()].map(([sesion_id, modo_fase]) => ({ sesion_id, modo_fase }));
}

// Conceptos que deben reaparecer hoy: los que alcanzaron el dominio en una sesión activa (modo de
// fase en «activaEnModos») hace exactamente d sesiones, con d en las demoras. alcanzados: Map
// concepto → sesion_id en que alcanzó el criterio. sesiones: las anteriores del niño, en orden.
export function reaparicionesDeHoy({ alcanzados, sesiones, demoras = [1, 3, 7], activaEnModos = [] }) {
  const indice = new Map(sesiones.map((s, k) => [s.sesion_id, k]));
  const hoy = sesiones.length; // índice de la sesión de hoy
  const out = new Map();
  for (const [concepto, sesion] of alcanzados) {
    const k = indice.get(sesion);
    if (k === undefined || !activaEnModos.includes(sesiones[k].modo_fase)) continue;
    const d = hoy - k;
    if (demoras.includes(d)) out.set(concepto, d);
  }
  return out;
}

// Pone en el bloque las reapariciones de hoy. Un concepto que ya está en el bloque solo se marca;
// uno que falta reemplaza un ensayo al azar que no sea reaparición. deConcepto(c): el ensayo de
// práctica de ese concepto en la banda del bloque (o null). concepto(t): el concepto de un ensayo.
export function conReapariciones(trials, reapariciones, { deConcepto, concepto, rand }) {
  const out = trials.map((t) => (reapariciones.has(concepto(t)) ? { ...t, reaparicion: reapariciones.get(concepto(t)) } : t));
  const presentes = new Set(out.map(concepto));
  for (const [c, d] of reapariciones) {
    if (presentes.has(c)) continue;
    const nuevo = deConcepto(c);
    const libres = out.flatMap((t, k) => (t.reaparicion ? [] : [k]));
    if (!nuevo || !libres.length) continue;
    out[libres[Math.floor(rand() * libres.length)]] = { ...nuevo, reaparicion: d };
    presentes.add(c);
  }
  return out;
}

// Pone las sondas: en cada tramo de «cada» ensayos, uno al azar (que no sea reaparición) se cambia
// por la sonda de un concepto dominado que no se haya sondeado y que no esté ya en el bloque.
// candidatos: conceptos dominados sin sondear, en el orden en que se ofrecen.
export function conSondas(trials, candidatos, { cada = 10, ejemplar = 3, deConcepto, concepto, rand }) {
  const out = [...trials];
  const enBloque = new Set(out.map(concepto));
  const pendientes = candidatos.filter((c) => !enBloque.has(c));
  for (let inicio = 0; inicio + cada <= out.length && pendientes.length; inicio += cada) {
    const tramo = [];
    for (let k = inicio; k < inicio + cada; k++) if (!out[k].reaparicion && !out[k].sonda) tramo.push(k);
    if (!tramo.length) continue;
    const c = pendientes.shift();
    const base = deConcepto(c);
    if (!base) continue;
    out[tramo[Math.floor(rand() * tramo.length)]] = ensayoDeSonda(base, ejemplar);
  }
  return out;
}

// IG: precisión en las sondas / precisión en los ensayos de práctica de las mismas bandas
// (Catálogo 7.3; Modelo 5.6 y 5.7: solo entre ítems de la misma banda). Indicador del nivel B: se
// calcula para exportarlo, no se muestra. rows: filas del niño en la actividad, ya filtradas
// (utilizables).
export function indiceGeneralizacion(rows) {
  const sondas = rows.filter((r) => r.sonda);
  const bandas = new Set(sondas.map((r) => r.banda));
  const practica = rows.filter((r) => !r.sonda && bandas.has(r.banda));
  const p = (rs) => (rs.length ? rs.filter((r) => r.acierto).length / rs.length : null);
  const ps = p(sondas);
  const pp = p(practica);
  return { valor: ps !== null && pp ? ps / pp : null, sondas: sondas.length, practica: practica.length, precisionSondas: ps, precisionPractica: pp };
}

// IRet: precisión en las reapariciones, en total y por demora (Catálogo 7.2; Modelo 5.7).
// Nivel B: se calcula para exportarlo, no se muestra.
export function retencion(rows) {
  const re = rows.filter((r) => r.reaparicion);
  const p = (rs) => (rs.length ? rs.filter((r) => r.acierto).length / rs.length : null);
  const porDemora = {};
  for (const d of [...new Set(re.map((r) => r.reaparicion))].sort((a, b) => a - b)) {
    const rs = re.filter((r) => r.reaparicion === d);
    porDemora[d] = { n: rs.length, precision: p(rs) };
  }
  return { valor: p(re), n: re.length, porDemora };
}
