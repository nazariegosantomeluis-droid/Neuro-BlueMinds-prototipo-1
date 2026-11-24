// Modos de fase y plan de la sesión con un niño (H2.3 y Catálogo 7.1). Lógica pura, sin DOM.
//
// El modo de cada niño lo fija el investigador responsable (Arquitectura 14). En el prototipo no
// hay servidor (decisión D6 pendiente): se fija en «Niños inscritos» y queda en el padrón local.
// La sesión sigue siempre el mismo orden (Catálogo 7.1): rutina de inicio, referencia motora,
// actividades en orden fijo con una transición de 5 s entre ellas y rutina de cierre.
// La configuración está en fichas/sesion.json; la versión de la fase 2, en la ficha de ACT-02.

export const MODOS = ['familiarizacion', 'fase1', 'fase2', 'fase3', 'cierre'];
export const VERSIONES_FASE2 = ['protocolo', 'catalogo'];
export const MODALIDADES = ['V', 'AV'];

// ---------- Fase 2 ----------

// Modalidad que abre la sesión de fase 2. previas: la modalidad que abrió cada sesión anterior de
// fase 2 del niño, en orden. Se sortea, salvo que la misma haya abierto las últimas «max» sesiones:
// entonces abre la otra (Protocolo 3.3: ninguna modalidad abre más de dos sesiones seguidas).
export function primeraModalidadFase2(previas, rand, max = 2) {
  const ultimas = previas.slice(-max);
  if (ultimas.length === max && ultimas.every((m) => m === ultimas[0])) return ultimas[0] === 'V' ? 'AV' : 'V';
  return rand() < 0.5 ? 'V' : 'AV';
}

// Bloque del análisis de la fase 2: sesiones 1 a 6 → 1; 7 a 12 → 2.
export const bloqueFase2 = (numero, porBloque = 6) => (numero <= porBloque ? 1 : 2);

// Modalidad de cada mitad de conceptos: en el bloque 1, la mitad A va en V y la B en AV; en el 2, al revés.
export const modalidadDeMitad = (mitad, bloque) => ((mitad === 'A') === (bloque === 1) ? 'V' : 'AV');
export const mitadDeModalidad = (modalidad, bloque) => (['A', 'B'].find((m) => modalidadDeMitad(m, bloque) === modalidad));

// ---------- Banda ----------

// Banda de cada actividad según el modo: en la familiarización, la mínima (ACT-01; ACT-02 y ACT-07
// van por la escalera, decisión R6); en los modos con dificultad fija y en la fase 3, la que se fijó
// para el niño (o la mínima si no hay).
export function bandaDelModo(modo, ficha, bandasNino = {}, config) {
  const minima = ficha.bandas[0].id;
  const existe = (b) => ficha.bandas.some((x) => x.id === b);
  if (['minima', 'escalera'].includes(config.modos[modo].dificultad)) return minima;
  const fijada = bandasNino[ficha.id];
  return existe(fijada) ? fijada : minima;
}

// ---------- Plan de la sesión ----------

// Pasos de la sesión, en orden. Cada bloque dice actividad, banda, modalidad y número de ensayos;
// en la fase 2 también la mitad de conceptos (o, en la versión del Catálogo, una por modalidad).
// fase2: { version, numero (1 a 12), primera ('V' o 'AV') }; solo en el modo fase2.
// Familiarización (decisión R6, 23 nov 2026): ACT-01 en la banda mínima y, después, ACT-02 y ACT-07
// por una escalera: desde B1, 10 ensayos por banda; sube si acierta 8 o más de 10 y se detiene en la
// primera banda no aprobada. La banda inicial de la fase 1 es la última aprobada (B1 si ninguna).
export function planDeSesion({ modo, fichas, config, bandasNino = {}, fase2 = null }) {
  const m = config.modos[modo];
  if (!m) throw new Error(`Modo de fase desconocido: ${modo}.`);
  const bloques = [];
  for (const id of m.actividades) {
    const ficha = fichas[id];
    if (!ficha) throw new Error(`Falta la ficha de ${id}.`);
    const banda = bandaDelModo(modo, ficha, bandasNino, config);
    const base = { actividad: id, banda };
    if (m.escalera?.actividades?.includes(id)) {
      bloques.push({
        tipo: 'escalera',
        actividad: id,
        modalidad: config.modalidadFueraDeFase2[id] ?? ficha.modalidades[0],
        bandas: ficha.bandas.map((b) => b.id),
        ensayosPorBanda: m.escalera.ensayosPorBanda,
        aciertosParaSubir: m.escalera.aciertosParaSubir,
        // Decisión R6b: composición de un peldaño distinta de la de la ficha (B2 de ACT-07: 5 + 5).
        composicion: m.escalera.composicion?.[id] ?? {},
      });
      continue;
    }
    if (modo === 'fase2' && id === config.fase2.actividad) {
      const bloque = bloqueFase2(fase2.numero, config.fase2.sesionesPorBloque);
      const n = config.fase2.ensayosPorModalidad;
      const otra = fase2.primera === 'V' ? 'AV' : 'V';
      if (fase2.version === 'catalogo') {
        // Un bloque de 30 con las dos modalidades: cada mitad en su modalidad.
        bloques.push({ ...base, modalidad: 'mixta', ensayos: 2 * n, mitades: { V: mitadDeModalidad('V', bloque), AV: mitadDeModalidad('AV', bloque) } });
      } else {
        for (const modalidad of [fase2.primera, otra]) bloques.push({ ...base, modalidad, ensayos: n, mitad: mitadDeModalidad(modalidad, bloque) });
      }
      continue;
    }
    bloques.push({ ...base, modalidad: config.modalidadFueraDeFase2[id] ?? ficha.modalidades[0], ensayos: ficha.ensayosPorBloque });
  }
  const pasos = [{ tipo: 'rutina-inicio', actividades: bloques.map((b) => b.actividad) }, { tipo: 'referencia' }];
  bloques.forEach((b, i) => {
    if (i > 0) pasos.push({ tipo: 'transicion', siguiente: b.actividad });
    pasos.push({ tipo: 'bloque', ...b });
  });
  // tipo 'escalera' queda en el paso (el spread de b lo conserva sobre 'bloque').

  pasos.push({ tipo: 'rutina-cierre' });
  return pasos;
}

// Los ensayos de la fase 2 solo usan los conceptos de su mitad. items: los de la banda.
export function itemsDeMitad(items, mitad) {
  return mitad ? items.filter((i) => i.mitad === mitad) : items;
}

// ---------- Límite de 15 minutos (INV-8) ----------

// inicioMs y ahoraMs con el mismo reloj (performance.now). Al llegar al límite, la plataforma
// propone terminar y no empieza un bloque nuevo.
export const limiteAlcanzado = (inicioMs, ahoraMs, minutos = 15) => ahoraMs - inicioMs >= minutos * 60_000;

// Qué hacer con un paso del plan, con el tiempo de uso de la sesión en ms. La rutina de cierre
// siempre se hace. Si la sesión se terminó desde el menú, lo demás se omite. Si ya se llegó al
// límite, no empieza ningún bloque nuevo ni la transición a él: 'limite'.
export function decidirPaso(paso, { usoMs, limiteMinutos = 15, terminada = false }) {
  if (paso.tipo === 'rutina-cierre') return 'ejecutar';
  if (terminada) return 'omitir';
  if (['bloque', 'escalera', 'transicion'].includes(paso.tipo) && limiteAlcanzado(0, usoMs, limiteMinutos)) return 'limite';
  return 'ejecutar';
}

// Sesiones anteriores de fase 2 del niño, en orden, a partir de sesiones.csv.
export function historialFase2(sesiones, codigo) {
  return sesiones.filter((s) => s.codigo_nino === codigo && s.modo_fase === 'fase2' && s.fase2_primera).map((s) => s.fase2_primera);
}

// ---------- Escalera de la familiarización (decisión R6) ----------

// Una banda se aprueba con los 10 ensayos hechos y 8 aciertos o más (las omisiones no son aciertos).
export const bandaAprobada = ({ ensayos, aciertos }, { ensayosPorBanda, aciertosParaSubir }) => ensayos >= ensayosPorBanda && aciertos >= aciertosParaSubir;

// Banda inicial de la fase 1 que propone la plataforma: la última aprobada, en orden desde B1 (B1 si
// no aprobó ninguna). resultados: los de la escalera de una actividad, en orden.
export function bandaPropuesta(resultados, bandas) {
  let propuesta = bandas[0];
  for (const r of resultados) {
    if (!r.aprobada) break;
    propuesta = r.banda;
  }
  return propuesta;
}

// Si la escalera sigue: la banda anterior se aprobó y hay otra arriba.
export const siguePorEscalera = (resultado, bandas) => Boolean(resultado.aprobada) && bandas.indexOf(resultado.banda) < bandas.length - 1;

// ---------- Criterio de inclusión (decisión R6b; Protocolo 4.2, criterio 4) ----------

// Ensayos que cuentan para el criterio: los de toda la sesión de familiarización (ACT-01, ACT-02 y
// ACT-07 juntas) con respuesta, acertados o no, sin los interrumpidos (interrupción del terapeuta,
// pérdida de foco o fallo técnico). rows: el registro por ensayo de la sesión.
export const ensayosParaInclusion = (rows) =>
  rows.filter((r) => !r.omision && !r.interrumpido && !r.perdida_foco && !r.fallo_tecnico).length;

// Aviso al cerrar la sesión: menos del mínimo (10).
export const avisoDeInclusion = (rows, minimo = 10) => ensayosParaInclusion(rows) < minimo;
