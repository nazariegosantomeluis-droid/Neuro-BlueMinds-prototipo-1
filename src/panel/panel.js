// Panel del terapeuta (H5.1 a H5.5; Arquitectura 6.4, 8.2, 8.3, 8.5 y 14; Modelo 4.4, 6.3 y 6.4).
// Lógica pura y HTML, sin DOM: app.js le pasa los datos del dispositivo y dibuja el resultado.
//
// - Historial por niño (H5.1): sus sesiones del dispositivo, con los indicadores calculados desde
//   el registro por ensayo (sin mostrar ensayos ni identidad: el niño aparece por su código).
// - Línea base (H5.2; decisión D3): las 5 primeras sesiones válidas de la fase 1 (calidad de 0.80 o
//   más). Banda de variación: mediana ± 2 MAD de los valores de esas sesiones (Modelo 6.3). Un cambio
//   se señala solo si el valor sale de la banda, hacia el mismo lado, en dos sesiones seguidas del
//   niño (Modelo 6.4). Sin índice de cambio fiable hasta tener fiabilidad de 0.75 o más.
// - Texto (H5.3): todo sale de src/panel/plantillas.json, por identificador; el código solo llena
//   los huecos con números, códigos y nombres de las fichas.
// - Qué se ve (H5.4): con indicadores solo en la fase 3; en las demás fases, solo el resumen de la
//   sesión (Arquitectura 14; Protocolo 3.1).
// - Marca «coincide / no coincide con mi observación» (H5.5): se guarda como dato en la sesión
//   (marcas_observacion) y nunca cambia parámetros ni indicadores.
//
// El panel describe, no califica: no usa colores de «bien» o «mal», ni flechas de mejora.
// Nunca muestra las señales de alerta temprana (INV-9) ni compara con otros niños.
import { PARAMETROS as P, NOMBRES } from '../indicadores/parametros.js';
import { mediana, mad } from '../indicadores/estadistica.js';
import { utilizable, validoLatencia, rtDe, calidadDeSesion, calidadBaja } from '../indicadores/nucleo.js';
import { calcularIndicadores } from '../indicadores/exportar.js';
import { motivoDeBloqueo } from '../envolvente.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- Plantillas (H5.3) ----------

// Texto de una plantilla con sus huecos llenos. Falla si la plantilla no existe o falta un valor:
// el panel no tiene otra forma de escribir.
export function texto(plantillas, id, valores = {}) {
  const p = plantillas.plantillas[id];
  if (!p) throw new Error(`No existe la plantilla ${id}.`);
  return p.texto.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valores)) throw new Error(`Falta «${k}» en la plantilla ${id}.`);
    return String(valores[k]);
  });
}

// Frase lista para el HTML, marcada con su identificador.
export const frase = (plantillas, id, valores = {}, etiqueta = 'p') => `<${etiqueta} data-plantilla="${id}">${esc(texto(plantillas, id, valores))}</${etiqueta}>`;

// Expresión regular de una plantilla: los huecos aceptan cualquier texto sin saltos de línea.
export const patronDe = (t) => new RegExp(`^${t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}/g, '[^\\n]*?')}$`);

// ---------- Formato de los números ----------

const UNIDAD = { A2: ' ms', A6: ' ln(ms)/min', A7: ' ms' };
const decimales = (id) => (['A2', 'A7'].includes(id) ? 0 : id === 'A6' ? 3 : 2);
export const numero = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d));
const valorDe = (id, x) => numero(x, decimales(id));

// ---------- Historial y línea base (H5.1 y H5.2) ----------

// Sesiones del niño, en orden, con sus ensayos e indicadores.
export function historialDelNino({ codigo, sesiones, ensayos, fichas = {}, items = [] }) {
  const propias = sesiones.filter((s) => s.codigo_nino === codigo && String(s.sesion_id).startsWith('S-'));
  const ids = new Set(propias.map((s) => s.sesion_id));
  const deNino = ensayos.filter((r) => ids.has(r.sesion_id));
  const indicadores = calcularIndicadores(deNino, propias, { fichas, items });
  return propias.map((s, k) => ({
    numero: k + 1,
    sesion: s,
    ensayos: deNino.filter((r) => r.sesion_id === s.sesion_id),
    indicadores: indicadores.filter((x) => x.sesion_id === s.sesion_id),
  }));
}

// Sesiones de la línea base (decisión D3): las primeras 5 de la fase 1 con calidad de 0.80 o más.
export function sesionesDeLineaBase(historial) {
  const validas = historial.filter((h) => h.sesion.modo_fase === P.lineaBase.modo && !calidadBaja(calidadDeSesion(h.ensayos) ?? 0));
  return validas.length >= P.lineaBase.sesiones ? validas.slice(0, P.lineaBase.sesiones) : null;
}

// Banda de variación de una serie de valores de línea base: mediana ± 2 MAD (escalada). Con menos
// de 3 valores disponibles no hay banda.
export function bandaDeVariacion(valores, { mads = P.bandaVariacion.mads } = {}) {
  const xs = valores.filter((x) => x !== null && Number.isFinite(x));
  if (xs.length < 3) return null;
  const m = mediana(xs);
  const d = mad(xs, P.madEscala.valor);
  return { mediana: m, minimo: m - mads * d, maximo: m + mads * d, n: xs.length };
}

// 'arriba', 'abajo' o null (dentro, o sin banda).
export const ladoFuera = (valor, banda) => (banda && valor !== null && Number.isFinite(valor) ? (valor > banda.maximo ? 'arriba' : valor < banda.minimo ? 'abajo' : null) : null);

// Bandas por actividad e indicador (A1 a A10, por sesión).
export function bandasDeLineaBase(historial) {
  const base = sesionesDeLineaBase(historial);
  if (!base) return null;
  const out = new Map();
  for (const h of base) {
    for (const x of h.indicadores.filter((i) => i.ambito === 'sesion' && i.actividad)) {
      const k = `${x.actividad}|${x.indicador}`;
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(x.disponible ? x.valor : null);
    }
  }
  return new Map([...out.entries()].map(([k, vs]) => [k, bandaDeVariacion(vs)]));
}

// Cambio que persiste (Modelo 6.4): el valor sale de la banda, hacia el mismo lado, en la sesión k y
// en las anteriores del niño hasta completar sesionesConsecutivas (2: esta y la anterior).
export function persiste(historial, k, actividad, indicador, bandas, { consecutivas = P.bandaVariacion.sesionesConsecutivas } = {}) {
  if (k < consecutivas - 1 || !bandas) return null;
  const banda = bandas.get(`${actividad}|${indicador}`);
  const valor = (h) => h.indicadores.find((x) => x.actividad === actividad && x.indicador === indicador && x.disponible)?.valor ?? null;
  const lados = Array.from({ length: consecutivas }, (_, j) => ladoFuera(valor(historial[k - j]), banda));
  return lados[0] && lados.every((l) => l === lados[0]) ? lados[0] : null;
}

// Señal de la regla en una simulación: la banda de una línea base de n valores y `consecutivas`
// sesiones fuera hacia el mismo lado. z: generador de ruido; desplazamiento: lo que cambió el
// valor real después de la línea base (0 = sin cambio: señal falsa). Para la prueba de H5.2 y la
// calibración de la decisión R12 (tools/simular-banda.mjs).
export function senalSimulada(z, { n = P.lineaBase.sesiones, mads = P.bandaVariacion.mads, consecutivas = P.bandaVariacion.sesionesConsecutivas, desplazamiento = 0 } = {}) {
  const banda = bandaDeVariacion(Array.from({ length: n }, z), { mads });
  const lados = Array.from({ length: consecutivas }, () => ladoFuera(z() + desplazamiento, banda));
  return Boolean(lados[0]) && lados.every((l) => l === lados[0]);
}

// ---------- Lecturas de las fichas ----------

// ACT-07: ensayos en que la regla cambió respecto al anterior del mismo bloque (Catálogo, ACT-07).
// reglas: código del ensayo → regla.
export function cambioDeRegla(rows, reglas) {
  const out = [];
  for (let k = 0; k < rows.length; k++) {
    const r = rows[k];
    const antes = rows[k - 1];
    if (!antes || antes.bloque !== r.bloque || !reglas.has(r.item) || !reglas.has(antes.item)) continue;
    out.push({ r, cambio: reglas.get(r.item) !== reglas.get(antes.item) });
  }
  return out;
}

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Lecturas de ACT-07 (las dos de su ficha), con el mínimo de 10 ensayos de cada tipo (Modelo 4.1, A7).
export function lecturasACT07(rows, reglas) {
  const ps = cambioDeRegla(rows.filter(utilizable).filter((r) => !r.omision), reglas);
  const de = (c) => ps.filter((p) => p.cambio === c).map((p) => p.r);
  const [cambio, repite] = [de(true), de(false)];
  const out = [];
  if (Math.min(cambio.length, repite.length) < P.minimos.A7.valor) return out;
  const error = (xs) => xs.filter((r) => !r.acierto).length / xs.length;
  if (error(cambio) > error(repite)) out.push({ id: 'LEC-08', valores: {} });
  const [mc, mr] = [media(cambio.filter(validoLatencia).map(rtDe)), media(repite.filter(validoLatencia).map(rtDe))];
  if (mc !== null && mr !== null && mc - mr >= 1) out.push({ id: 'LEC-09', valores: { ms: Math.round(mc - mr) } });
  return out;
}

// ---------- Resumen (siempre) ----------

export function resumenDeSesion(h, fichas = {}) {
  const rows = h.ensayos;
  const actividades = [...new Set(rows.map((r) => r.actividad))];
  const recorridas = actividades.map((a) => `${a}: ${[...new Set(rows.filter((r) => r.actividad === a).map((r) => r.banda))].join(' → ')}`);
  const ms = h.sesion.duracion_uso_ms ?? null;
  return {
    actividades: actividades.map((a) => (fichas[a]?.nombre ? `${a} ${fichas[a].nombre}` : a)).join(', ') || '—',
    validos: rows.filter(utilizable).length,
    ensayos: rows.length,
    calidad: calidadDeSesion(rows),
    minutos: ms === null ? '—' : Math.floor(ms / 60000),
    segundos: ms === null ? '—' : String(Math.floor((ms % 60000) / 1000)).padStart(2, '0'),
    bandas: recorridas.join('; ') || '—',
    pausas: (h.sesion.pausas ?? []).length,
  };
}

// ---------- HTML ----------

const conIndicadores = (modo, config) => config?.modos?.[modo]?.panel === 'completo';

const ORDEN_NUCLEO = ['A1', 'A5', 'A2', 'A3', 'A4', 'A6', 'A7', 'A8', 'A10'];

// Marca «coincide / no coincide» de un indicador (H5.5).
function marcaHTML(plantillas, { sesion_id, actividad, indicador }, marcas) {
  const m = (marcas ?? []).filter((x) => x.actividad === actividad && x.indicador === indicador).at(-1);
  const boton = (coincide, id) =>
    `<button type="button" data-marca data-sesion="${esc(sesion_id)}" data-actividad="${esc(actividad)}" data-indicador="${esc(indicador)}" data-coincide="${coincide}" aria-pressed="${m?.coincide === coincide}" data-plantilla="${id}">${esc(texto(plantillas, id))}</button>`;
  return `<div class="panel-marca">${boton(true, 'ETQ-13')}${boton(false, 'ETQ-14')}
    <label class="panel-comentario"><span data-plantilla="ETQ-15">${esc(texto(plantillas, 'ETQ-15'))}</span>
      <input data-comentario data-actividad="${esc(actividad)}" data-indicador="${esc(indicador)}" maxlength="120" autocomplete="off" value="${esc(m?.comentario ?? '')}"></label></div>`;
}

// Un indicador del núcleo: valor e intervalo, comparación con la línea base y lecturas permitidas.
function indicadorHTML(plantillas, x, { banda, calidad, marcas, hayBase }) {
  const indicador = NOMBRES[x.indicador] ?? x.indicador;
  const unidad = UNIDAD[x.indicador] ?? '';
  const partes = [];
  if (!x.disponible) {
    // El motivo del cálculo elige la plantilla: calidad, banda que cambió (A6), pocos datos o pocos minutos (A6).
    const m = x.motivo ?? '';
    const minimo = P.minimos[x.indicador]?.valor ?? 0;
    const id = /calidad/.test(m) ? 'IND-03' : /banda cambió/.test(m) ? 'IND-05' : x.n < minimo ? 'IND-04' : /abarcan/.test(m) ? 'IND-06' : 'IND-04';
    partes.push(frase(plantillas, id, { indicador, calidad: numero(calidad) }));
  } else {
    partes.push(
      x.ic_inferior !== null && x.ic_inferior !== undefined
        ? frase(plantillas, 'IND-01', { indicador, valor: valorDe(x.indicador, x.valor), unidad, inferior: valorDe(x.indicador, x.ic_inferior), superior: valorDe(x.indicador, x.ic_superior), n: x.n })
        : frase(plantillas, 'IND-02', { indicador, valor: valorDe(x.indicador, x.valor), unidad, n: x.n }),
    );
    // Comparación con la línea base (Modelo 6.3): solo con línea base completa.
    if (hayBase && banda) {
      const lado = ladoFuera(x.valor, banda);
      const rango = { minimo: valorDe(x.indicador, banda.minimo), maximo: valorDe(x.indicador, banda.maximo), unidad };
      if (!lado) partes.push(frase(plantillas, 'CMP-01', rango));
      else if (x.indicador === 'A2' && lado === 'arriba') partes.push(frase(plantillas, 'CMP-03', { valor: valorDe('A2', x.valor), minimo: rango.minimo, maximo: rango.maximo }));
      else if (x.indicador === 'A3' && lado === 'arriba') partes.push(frase(plantillas, 'CMP-04'));
      else partes.push(frase(plantillas, 'CMP-02', rango));
    }
    // Lecturas permitidas (Modelo 4.4): solo con el intervalo de un lado del cero, cuando aplica.
    if (x.indicador === 'A6' && x.ic_inferior > 0) partes.push(frase(plantillas, 'LEC-01'));
    if (x.indicador === 'A7' && x.ic_inferior > 0) partes.push(frase(plantillas, 'LEC-02'));
    if (x.indicador === 'A4' && x.valor > 0) partes.push(frase(plantillas, 'LEC-03', { porcentaje: Math.round(x.valor * 100) }));
    if (x.indicador === 'A10' && x.valor > 0) partes.push(frase(plantillas, 'LEC-04', { veces: x.detalle?.perseverativos ?? 0, oportunidades: x.n }));
  }
  // La marca «coincide / no coincide» solo tiene sentido con un valor que mostrar.
  return `<li class="panel-indicador">${partes.join('')}${x.disponible ? marcaHTML(plantillas, x, marcas) : ''}</li>`;
}

// Resumen de una sesión (siempre). completo: con bandas recorridas y pausas (Arquitectura 8.2);
// en las fases sin indicadores, solo ensayos, calidad y duración (Arquitectura 14).
function resumenHTML(plantillas, r, completo) {
  return `<section class="panel-seccion"><h3 data-plantilla="ETQ-03">${esc(texto(plantillas, 'ETQ-03'))}</h3>
    ${frase(plantillas, 'RES-01', r)}${frase(plantillas, 'RES-02', r)}${frase(plantillas, 'RES-03', { calidad: numero(r.calidad) })}${frase(plantillas, 'RES-04', r)}
    ${completo ? frase(plantillas, 'RES-05', r) + frase(plantillas, 'RES-06', r) : ''}</section>`;
}

// Adaptaciones de la sesión: cada cambio con su regla y las acciones bloqueadas (Arquitectura 8.2).
function adaptacionesHTML(plantillas, sesion) {
  const ps = sesion.adaptacion_propuestas ?? [];
  const lineas = [];
  for (const p of ps) {
    const base = { actividad: p.actividad, desde: p.banda_actual, hasta: p.banda_propuesta, inicio: p.ensayos?.[0] ?? '—', fin: p.ensayos?.[1] ?? '—' };
    if (p.pausa_ofrecida && p.ventana !== null) lineas.push(frase(plantillas, 'ADP-03', base, 'li'));
    if (p.banda_propuesta === p.banda_actual || p.ejecutada === undefined) continue;
    const malestar = p.ventana === null;
    if (p.ejecutada) lineas.push(frase(plantillas, malestar ? 'ADP-06' : 'ADP-01', { ...base, regla: p.regla }, 'li'));
    else if (p.invariante) lineas.push(frase(plantillas, malestar ? 'ADP-05' : 'ADP-02', { ...base, invariante: motivoDeBloqueo(p.invariante) }, 'li'));
  }
  const bloqueos = sesion.envolvente_bloqueos ?? ps.filter((p) => p.invariante).length;
  return `<section class="panel-seccion"><h3 data-plantilla="ETQ-09">${esc(texto(plantillas, 'ETQ-09'))}</h3>
    ${bloqueos >= P.envolvente.bloqueosParaAviso ? frase(plantillas, 'ADP-04', { n: bloqueos }).replace('<p ', '<p class="aviso" role="status" ') : ''}
    ${lineas.length ? `<ul>${lineas.join('')}</ul>` : frase(plantillas, 'PNL-08')}</section>`;
}

// Panel de una sesión del historial. k: su índice. config: fichas/sesion.json. reglas: código del
// ensayo de ACT-07 → regla.
export function sesionHTML(plantillas, historial, k, { config, fichas = {}, reglas = new Map() }) {
  const h = historial[k];
  const modo = h.sesion.modo_fase;
  const completo = conIndicadores(modo, config);
  const r = resumenDeSesion(h, fichas);
  const titulo = `<h2 data-plantilla="ETQ-11">${esc(texto(plantillas, 'ETQ-11', { numero: h.numero, modo: config?.modos?.[modo]?.nombre ?? modo ?? '—' }))}</h2>`;
  if (!completo) return `${titulo}${frase(plantillas, 'PNL-02')}${resumenHTML(plantillas, r, false)}`;
  const partes = [titulo, frase(plantillas, 'PNL-01'), resumenHTML(plantillas, r, true)];
  const calidad = r.calidad;
  const bandas = bandasDeLineaBase(historial);
  if (calidad === null || calidadBaja(calidad)) {
    partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-04">${esc(texto(plantillas, 'ETQ-04'))}</h3>${frase(plantillas, 'RES-07')}</section>`);
  } else {
    const actividades = [...new Set(h.indicadores.filter((x) => x.actividad).map((x) => x.actividad))];
    const bloques = actividades.map((a) => {
      const xs = ORDEN_NUCLEO.map((id) => h.indicadores.find((x) => x.actividad === a && x.indicador === id)).filter(Boolean);
      const lecturas = [];
      const filas = h.ensayos.filter((x) => x.actividad === a);
      const resp = filas.filter(utilizable).filter((x) => !x.sonda && !x.omision);
      if (a === 'ACT-02' && resp.length) {
        const base = sesionesDeLineaBase(historial);
        const deBase = base?.map((b) => b.ensayos.filter((x) => x.actividad === a && utilizable(x) && !x.sonda && !x.omision && x.acierto).length);
        lecturas.push(base ? frase(plantillas, 'LEC-05', { aciertos: resp.filter((x) => x.acierto).length, n: resp.length, minimo: Math.min(...deBase), maximo: Math.max(...deBase) }) : frase(plantillas, 'LEC-06', { aciertos: resp.filter((x) => x.acierto).length, n: resp.length }));
      }
      if (a === 'ACT-07') for (const l of lecturasACT07(filas, reglas)) lecturas.push(frase(plantillas, l.id, l.valores));
      return `<h4 data-plantilla="ETQ-12">${esc(texto(plantillas, 'ETQ-12', { actividad: fichas[a]?.nombre ? `${a} ${fichas[a].nombre}` : a }))}</h4>${lecturas.join('')}
        <ul class="panel-indicadores">${xs.map((x) => indicadorHTML(plantillas, x, { banda: bandas?.get(`${a}|${x.indicador}`), calidad, marcas: h.sesion.marcas_observacion, hayBase: Boolean(bandas) })).join('')}</ul>`;
    });
    partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-04">${esc(texto(plantillas, 'ETQ-04'))}</h3>${bandas ? '' : frase(plantillas, 'PNL-05')}${frase(plantillas, 'PNL-07')}${bloques.join('')}</section>`);
    // Cambios que persisten (Modelo 6.4).
    const persistentes = bandas
      ? actividades.flatMap((a) => ORDEN_NUCLEO.filter((id) => persiste(historial, k, a, id, bandas)).map((id) => frase(plantillas, 'CMP-05', { indicador: `${a} · ${NOMBRES[id]}` }, 'li')))
      : [];
    partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-05">${esc(texto(plantillas, 'ETQ-05'))}</h3>${bandas ? (persistentes.length ? `<ul>${persistentes.join('')}</ul>` : frase(plantillas, 'PNL-06')) : frase(plantillas, 'PNL-05')}</section>`);
    // Ítems dominados: lista y ritmo (A9).
    const dom = actividades
      .map((a) => h.indicadores.find((x) => x.actividad === a && x.indicador === 'A9'))
      .filter((x) => x?.detalle)
      .map((x) => {
        const nuevos = x.detalle.nuevos ?? [];
        const linea = nuevos.length
          ? frase(plantillas, 'DOM-01', { actividad: x.actividad, dominados: x.detalle.dominados, nuevos: nuevos.length, ritmo: numero(x.valor, 1) })
          : frase(plantillas, 'DOM-02', { actividad: x.actividad, dominados: x.detalle.dominados });
        const lectura = x.actividad === 'ACT-02' && nuevos.length ? frase(plantillas, 'LEC-07', { n: nuevos.length }) : '';
        return linea + lectura + (nuevos.length ? frase(plantillas, 'DOM-03', { lista: nuevos.join(', ') }) : '');
      });
    partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-06">${esc(texto(plantillas, 'ETQ-06'))}</h3>${dom.join('')}</section>`);
    // Resumen de la fase (A11 y A12, decisión R8).
    const fase = h.indicadores.filter((x) => x.ambito === 'fase').map((x) =>
      x.disponible
        ? frase(plantillas, 'FAS-01', { indicador: NOMBRES[x.indicador], valor: numero(x.valor), unidad: '', n: `${x.n}` })
        : frase(plantillas, 'FAS-02', { indicador: NOMBRES[x.indicador] }),
    );
    partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-10">${esc(texto(plantillas, 'ETQ-10'))}</h3>${fase.join('')}</section>`);
  }
  partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-07">${esc(texto(plantillas, 'ETQ-07'))}</h3>${frase(plantillas, 'PNL-04')}</section>`);
  partes.push(`<section class="panel-seccion"><h3 data-plantilla="ETQ-08">${esc(texto(plantillas, 'ETQ-08'))}</h3>${frase(plantillas, 'PNL-04')}</section>`);
  partes.push(adaptacionesHTML(plantillas, h.sesion));
  return partes.join('');
}

// Lista de sesiones del niño (historial resumido, H5.1): número, modo, ensayos, calidad y duración.
export function historialHTML(plantillas, historial, { config, fichas = {}, enlace = (k) => `#panel?sesion=${k}` }) {
  if (!historial.length) return frase(plantillas, 'PNL-03');
  return `<h2 data-plantilla="ETQ-02">${esc(texto(plantillas, 'ETQ-02'))}</h2>
    <ul class="panel-sesiones">${historial
      .map((h, k) => {
        const r = resumenDeSesion(h, fichas);
        return `<li><span data-plantilla="ETQ-11">${esc(texto(plantillas, 'ETQ-11', { numero: h.numero, modo: config?.modos?.[h.sesion.modo_fase]?.nombre ?? h.sesion.modo_fase ?? '—' }))}</span>
          ${frase(plantillas, 'RES-02', r)}${frase(plantillas, 'RES-03', { calidad: numero(r.calidad) })}${frase(plantillas, 'RES-04', r)}
          <a class="boton" href="${esc(enlace(k))}" data-plantilla="ETQ-16">${esc(texto(plantillas, 'ETQ-16'))}</a></li>`;
      })
      .join('')}</ul>`;
}

// Marca del terapeuta lista para guardar (H5.5): solo datos; nunca cambia parámetros.
export const marcaRegistro = ({ actividad, indicador, coincide, comentario = '', hora }) => ({
  actividad,
  indicador,
  coincide: Boolean(coincide),
  comentario: String(comentario).slice(0, 120),
  hora,
});
