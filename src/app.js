// Aplicación: pantallas del adulto, sesión del niño y descarga del registro.
// El motor (src/engine) ejecuta la ficha; aquí solo se arma la sesión y se dibuja.
import { createLog, toCSV, toJSON, download, VERSION_APP, SESION_COLUMNS, SESION_KEY } from './engine/logger.js';
import { pickItems, pickComposed, rng, seedOf, shuffle, disponibleEnSesion } from './engine/selector.js';
import { startBlock, NO_AUDIO_MSG } from './engine/trial.js';
import { browserEnv, eventTime } from './engine/clock.js';
import { createAudio } from './engine/audio.js';
import { marcarFueraDeTarea, paraExportar, frecuenciaSesion } from './engine/quality.js';
import { lineasDelBloque } from './resumen.js';
import { comprobarFrecuencia } from './frecuencia.js';
import { PANTALLAS, cargarCatalogo, requiereModoExperto } from './catalogo.js';
import { juegoDeSesion } from './activities/categorias.js';
import { elegirPorEmocion } from './activities/emociones.js';
import { esc, navHTML, marcaHTML, tituloHTML, chipHTML, renderGaleria, renderCreditos, renderCalibracion } from './paginas.js';
import { renderInicio as dibujarInicio, maxEnsayos, avisoDeAjuste } from './inicio.js';
import { renderSesiones } from './sesiones.js';
import { pausaGuiada } from './pausa-guiada.js';
import { renderRevision } from './revision.js';
import { agregarEnlaceF3 } from './enlaces.js';
import { renderF3 } from './f3.js';
import { MOTIVOS_TERMINACION, MOTIVO_OBLIGATORIO_MSG, faltaMotivo } from './terminacion.js';
import { AVISO_SIN_REVISION, revisadaClinicamente } from './revision-estado.js';
import { NINO_KEY, NINO_COLUMNS, DEMO, participante } from './ninos.js';
import { renderNinos, confirmarNino } from './ninos-pantalla.js';
import { planReferencia, iniciarReferencia } from './engine/referencia.js';
import * as referencia from './activities/referencia.js';

// Las actividades y el módulo que dibuja cada pantalla están en catalogo.js. Cada pantalla aporta
// toTrials (de ítems a ensayos) y createView (cómo se dibuja).
const PICTO_FIN = 'assets/picto/terminar.png';
const NIVELES_APOYO = ['ninguno', 'verbal', 'gestual', 'físico'];

const ICONO_PAUSA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>';
const ICONO_ADULTO =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>';

const app = document.getElementById('app');
const log = createLog();
// Una fila por sesión: inicio, fin, pausas, terminación anticipada y nivel de apoyo por bloque.
const sesiones = createLog(undefined, { key: SESION_KEY, columns: SESION_COLUMNS });
// Si el adulto borró el registro durante la sesión, la fila ya no existe y no se cambia nada.
const editSesion = (id, fn) =>
  sesiones.edit((rows) => {
    const r = rows.find((x) => x.sesion_id === id);
    if (r) fn(r);
  });
// Padrón local de niños: solo código seudónimo, ícono, color, edad en meses y consentimiento.
const ninos = createLog(undefined, { key: NINO_KEY, columns: NINO_COLUMNS });
const audio = createAudio();
const state = {
  catalogo: [], // las 17 actividades del Catálogo, con su estado
  fichas: {}, // id → ficha válida
  pausa: null, // ficha de la pausa guiada (ACT-17), que no tiene ensayos
  problemas: {}, // id → problemas de la ficha (o del banco de ítems)
  items: [],
  conceptos: [],
  running: false, // hay un bloque en curso: la navegación no cambia de pantalla
  images: new Map(), // imágenes ya decodificadas
  session: null, // { id, codigo, bloque, usados: { [actividad]: Set } }
  last: null, // último bloque: { rows, ficha, banda, modalidad }
  form: {}, // últimas elecciones del inicio
};

const prefs = {
  get(k, fallback) {
    try {
      return localStorage.getItem(k) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      // sin almacenamiento: se usa el valor por defecto la próxima vez
    }
  },
};

// El cm de CSS no mide un centímetro real en tabletas. Se estima suponiendo una tableta
// de 10" (pantalla táctil) o un monitor de 96 ppp (computadora); la página de
// Calibración guarda el valor medido en el dispositivo.
const cm = {
  estimated: () =>
    matchMedia('(pointer: coarse)').matches ? Math.hypot(screen.width, screen.height) / (10 * 2.54) : 96 / 2.54,
  saved: () => Number(prefs.get('nbm.cm', '')) || null,
  set: (px) => document.documentElement.style.setProperty('--cm', `${px}px`),
};
const applyCm = () => cm.set(cm.saved() ?? cm.estimated());

const randomHex = () =>
  [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
// numero: sesiones iniciadas en este dispositivo; con él alternan las parejas de cajas de ACT-07.
// orden: por actividad, el orden de las dimensiones (por ejemplo, color y después forma).
// p es el resultado de participante(): las sesiones con niño empiezan con S-, las de demostración
// con DEMO- y las del modo experto con EXP-, para separarlas en el registro. valor es lo que se
// eligió en el inicio (el código del niño o DEMO).
const newSession = (p, valor) => ({
  id: `${p.prefijo}-${randomHex()}`,
  experto: p.tipo === 'experto',
  tipo: p.tipo,
  valor,
  nino: p.nino ?? null,
  codigo: p.codigo,
  bloque: 0,
  numero: Number(prefs.get('nbm.sesiones', '0')),
  usados: {},
  orden: {},
});
const dispositivo = () => `${navigator.userAgent} | ${screen.width}x${screen.height} @${devicePixelRatio}x`;
const volumen = () => Number(prefs.get('nbm.volumen', '80'));

async function init() {
  applyCm();
  audio.setVolume(volumen() / 100);
  const { catalogo, fichas, pausa, problemas } = await cargarCatalogo();
  Object.assign(state, { catalogo, fichas, pausa });
  Object.assign(state.problemas, problemas);
  try {
    state.items = (await (await fetch('items/items.json')).json()).items;
    state.conceptos = (await (await fetch('items/conceptos.json')).json()).conceptos;
    state.revision = await (await fetch('items/revision.json')).json();
  } catch {
    state.problemas.items = ['No se pudo cargar el banco de ítems (items/items.json, items/conceptos.json o items/revision.json).'];
  }
  // El banco de las actividades de uso posterior va aparte: si falta, el piloto sigue funcionando.
  try {
    state.items = [...state.items, ...(await (await fetch('items/items-posteriores.json')).json()).items];
  } catch {
    state.problemas.posteriores = ['No se pudo cargar el banco de las actividades de uso posterior (items/items-posteriores.json).'];
  }
  // «Saltar al contenido» lleva el foco al título de la pantalla sin cambiar la ruta.
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('a.saltar')) return;
    e.preventDefault();
    enfocarTitulo();
  });
  addEventListener('hashchange', route);
  route();
}

// Al cambiar de pantalla, el foco pasa al título (para lectores de pantalla) sin mover la vista.
function enfocarTitulo() {
  const h1 = app.querySelector('h1');
  if (!h1) return;
  h1.tabIndex = -1;
  h1.focus({ preventScroll: true });
}

// Rutas: #inicio, #galeria (con filtros: #galeria?actividad=ACT-02&banda=B3), #sesiones, #revision, #formulario (F3),
// #ninos (padrón), #creditos, #calibracion y #pausa (la pausa guiada).
// Cambiar un filtro de la galería no es cambiar de pantalla: ahí el foco se queda en el filtro.
let rutaAnterior = null;
function route() {
  if (state.running) return; // durante un bloque solo se sale con la pausa
  const [ruta, query = ''] = location.hash.slice(1).split('?');
  if (ruta === 'galeria' && !state.problemas.items) {
    renderGaleria(app, state, new URLSearchParams(query));
    agregarEnlaceF3(app);
  } else if (ruta === 'sesiones') renderSesiones(app, { state, log, sesiones, padron: ninos.rows(), registroHTML, bindRegistro });
  else if (ruta === 'pausa' && state.pausa) renderPausa();
  else if (ruta === 'revision' && !state.problemas.items) renderRevision(app, state);
  else if (ruta === 'formulario' && !state.problemas.items) renderF3(app, state);
  else if (ruta === 'ninos') renderNinos(app, { ninos });
  else if (ruta === 'creditos') renderCreditos(app, state);
  else if (ruta === 'calibracion') {
    renderCalibracion(app, {
      estimated: cm.estimated(),
      saved: cm.saved(),
      preview: cm.set,
      save: (px) => prefs.set('nbm.cm', String(px)),
      reset: () => {
        prefs.set('nbm.cm', '');
        applyCm();
      },
    });
  } else renderInicio();
  scrollTo(0, 0);
  if (rutaAnterior !== null && ruta !== rutaAnterior) enfocarTitulo();
  rutaAnterior = ruta;
}

// ---------- Inicio ----------

// Aviso del inicio mientras la ficha elegida no tenga revisión clínica registrada (Arquitectura 4.4).
const avisoSinRevision = (ficha) => (!revisadaClinicamente(ficha) ? AVISO_SIN_REVISION : '');

// La pantalla de inicio se dibuja en inicio.js; aquí está lo que necesita de la aplicación.
const renderInicio = (msg = '') =>
  dibujarInicio(
    app,
    {
      state,
      volumen,
      calibrada: cm.saved() !== null,
      padron: () => ninos.rows(),
      avisoSinRevision,
      registroHTML,
      bindRegistro,
      bindVolumen,
      cerrarSesion,
      empezar: start,
      desbloquearAudio: () => audio.unlock(),
    },
    msg,
  );

function bindVolumen(root) {
  for (const r of root.querySelectorAll('[data-volumen]')) {
    const valor = r.closest('label')?.querySelector('[data-volumen-valor]');
    r.oninput = () => {
      prefs.set('nbm.volumen', r.value);
      audio.setVolume(r.value / 100);
      if (valor) valor.textContent = `${r.value} %`;
    };
  }
}

// ---------- Registro ----------

// Borrar va aparte de las descargas; cada descarga confirma con el nombre del archivo.
// enlaceSesiones: en la página «Sesiones» el enlace a ella misma no se muestra.
function registroHTML({ enlaceSesiones = true } = {}) {
  const n = log.rows().length;
  const off = n ? '' : 'disabled';
  const cuenta = n ? `${n === 1 ? '1 ensayo guardado' : `${n} ensayos guardados`} en este dispositivo.` : 'Todavía no hay ensayos guardados en este dispositivo.';
  return `
    <section class="panel registro" aria-labelledby="registro-titulo">
      <h2 id="registro-titulo">Registro</h2>
      <p class="meta${n ? '' : ' vacio-registro'}">${cuenta} Nada se envía a ningún servidor.</p>
      ${log.stored ? '' : '<p class="mensaje">No se pudo guardar en el dispositivo. Descarga el registro antes de cerrar esta página.</p>'}
      <div class="acciones">
        <button type="button" data-descargar="csv" ${off}>Descargar registro (CSV)</button>
        <button type="button" data-descargar="json" ${off}>Descargar registro (JSON)</button>
        <button type="button" data-descargar="sesiones" ${off}>Descargar sesiones (CSV)</button>
      </div>
      <p class="meta estado" role="status"></p>
      ${n && enlaceSesiones ? '<p class="meta"><a href="#sesiones">Ver sesión por sesión</a></p>' : ''}
      <div class="acciones acciones-aparte">
        <button type="button" class="peligro" data-borrar ${off}>Borrar registro</button>
      </div>
    </section>`;
}

function bindRegistro(root, rerender) {
  const estado = root.querySelector('.estado');
  for (const b of root.querySelectorAll('[data-descargar]')) {
    b.onclick = () => {
      const tipo = b.dataset.descargar;
      const fecha = new Date().toISOString().slice(0, 10); // solo para el nombre del archivo
      let nombre;
      if (tipo === 'json') download((nombre = `registro-neuro-blueminds-${fecha}.json`), toJSON(paraExportar(log.rows())), 'application/json');
      else if (tipo === 'csv') download((nombre = `registro-neuro-blueminds-${fecha}.csv`), toCSV(paraExportar(log.rows())), 'text/csv;charset=utf-8');
      else download((nombre = `sesiones-neuro-blueminds-${fecha}.csv`), toCSV(sesiones.rows(), SESION_COLUMNS), 'text/csv;charset=utf-8');
      if (estado) estado.textContent = `Se descargó ${nombre}.`;
    };
  }
  const borrar = root.querySelector('[data-borrar]');
  if (borrar) {
    borrar.onclick = () => {
      if (confirm('¿Borrar todo el registro guardado en este dispositivo? Descárgalo antes si lo necesitas.')) {
        log.clear();
        sesiones.clear();
        rerender();
      }
    };
  }
}

// ---------- Sesión ----------

// Al cerrar la sesión, fuera_de_tarea se calcula una sola vez y queda definitivo.
function cerrarSesion() {
  const id = state.session.id;
  log.edit((all) => marcarFueraDeTarea(all.filter((r) => r.sesion_id === id), false));
  state.session = null;
}

async function preloadImages(srcs) {
  await Promise.all(
    [...new Set(srcs)]
      .filter((src) => !state.images.has(src))
      .map(async (src) => {
        const img = new Image();
        img.src = src;
        try {
          await img.decode();
        } catch {
          throw new Error(`No se pudo cargar la imagen ${src}.`);
        }
        state.images.set(src, img);
      }),
  );
}

async function start(form) {
  const antes = state.form;
  const f = (state.form = Object.fromEntries(new FormData(form)));
  const ficha = state.fichas[f.actividad];
  const banda = ficha.bandas.find((b) => b.id === f.banda) ?? ficha.bandas[0];
  const pantalla = PANTALLAS[ficha.pantalla];
  const n = Math.min(maxEnsayos(ficha, banda), Math.max(1, Math.floor(Number(f.ensayos)) || ficha.ensayosPorBloque));
  // Las actividades de uso posterior no se usan con niños: su sesión siempre es de demostración y en
  // modo experto. Esos dos controles van desactivados y no llegan en el formulario: se conserva lo elegido.
  const forzado = requiereModoExperto(ficha);
  if (forzado) Object.assign(f, { experto: antes.experto, participante: antes.participante });
  if (forzado && state.session && !state.session.experto) {
    return renderInicio('Esta actividad solo se abre en modo experto. Termina la sesión en curso y vuelve a intentarlo.');
  }
  // Quién participa se comprueba en cada bloque: si el consentimiento dejó de estar vigente, no se
  // inicia (Arquitectura 9.6). En una sesión en curso vale el participante con que empezó.
  const valor = state.session ? state.session.valor : forzado ? DEMO : f.participante;
  const p = participante(valor, state.session ? state.session.experto : forzado || f.experto === '1', ninos.rows());
  if (p.error) return renderInicio(p.error);
  // R6: el terapeuta confirma el ícono y el color antes del primer bloque de una sesión con niño.
  if (!state.session && p.tipo === 'nino' && !(await confirmarNino(app, p.nino))) return renderInicio();
  // La sesión empieza con su primer bloque; hasta entonces no existe.
  const s = state.session ?? newSession(p, valor);
  const rand = rng(seedOf(`${s.id}:${s.bloque + 1}`));
  const usados = (s.usados[ficha.id] ??= new Set());
  const repeat = ficha.repetirItems !== false;
  // Los ítems retirados en la revisión clínica no entran en las sesiones.
  let bandItems = state.items.filter((i) => i.actividad === ficha.id && i.banda === banda.id && disponibleEnSesion(i));
  // Juego de cajas de la sesión (ACT-06): alterna entre sesiones, como las parejas de ACT-07.
  if (banda.juegos) bandItems = bandItems.filter((i) => i.juego === juegoDeSesion(banda, s.numero));
  // Algunos ítems son de una sola modalidad (ACT-10: historias en V, instrucciones habladas en AV).
  bandItems = bandItems.filter((i) => !i.modalidad || i.modalidad === f.modalidad);
  let picked;
  try {
    if (pantalla.elegir) {
      // La pantalla arma el bloque a su manera: un programa de premios (ACT-12), una serie de
      // presentaciones (ACT-13) o n secuencias completas (ACT-10 y ACT-16).
      picked = pantalla.elegir(bandItems, n, rand, { ficha, banda, repeat });
    } else if (banda.composicion) {
      // El orden de las dimensiones se sortea una vez por sesión: en B1 la regla es la misma toda la sesión.
      s.orden[ficha.id] ??= shuffle(ficha.dimensiones, rand);
      picked = pickComposed(bandItems, banda.composicion, s.orden[ficha.id], rand);
    } else if (ficha.estratificarPor === 'emocion') {
      picked = elegirPorEmocion(bandItems, n, rand);
    } else {
      picked = pickItems(bandItems, n, rand, { repeat, exclude: repeat ? new Set() : usados });
    }
  } catch (e) {
    return renderInicio(`${e.message} Elige menos ensayos o termina la sesión para empezar una nueva.`);
  }
  const pareja = ficha.parejas?.[s.numero % ficha.parejas.length];
  // En las actividades por secuencias, n cuenta secuencias completas y cada paso es un ensayo.
  const todos = pantalla.toTrials(picked, { ficha, banda, pareja, modalidad: f.modalidad });
  const trials = ficha.unidadDelBloque === 'secuencia' ? todos : todos.slice(0, n);
  try {
    const srcs = trials.flatMap((t) => [t.consigna.src, ...t.opciones.map((o) => o.src), ...(t.imagenes ?? [])]).filter(Boolean);
    await preloadImages([PICTO_FIN, ...srcs]);
  } catch (e) {
    return renderInicio(e.message);
  }
  if (f.modalidad === 'AV' && !(await audio.available(trials.map((t) => t.consigna.audio)))) {
    return renderInicio(NO_AUDIO_MSG);
  }
  // Si las opciones no caben a su tamaño mínimo, el adulto decide si sigue.
  const ajuste = avisoDeAjuste(ficha, banda);
  if (ajuste && !(await confirmarPantalla(ajuste))) return renderInicio();
  const { periodo, advertencia } = await comprobarFrecuencia(app);
  history.replaceState(null, '', '#inicio'); // al terminar el bloque se vuelve al inicio
  if (!state.session) {
    state.session = s;
    prefs.set('nbm.sesiones', String(s.numero + 1));
    // Fecha y hora (ISO 8601 en UTC, con «Z») solo para identificar la sesión; las duraciones
    // se miden con performance.now().
    sesiones.add({
      sesion_id: s.id, codigo_nino: s.codigo, dispositivo: dispositivo(), inicio: new Date().toISOString(),
      ensayos: 0, pausas: [], terminada_antes: false, nivel_apoyo: [], advertencia_frecuencia: false,
    });
  }
  if (advertencia) editSesion(s.id, (r) => (r.advertencia_frecuencia = true));
  // Referencia motora (RF-03): al inicio de cada sesión con niño o de demostración, no en el modo experto.
  if (!s.referenciaHecha && s.tipo !== 'experto') {
    s.referenciaHecha = true;
    const ref = await ejecutarReferencia(s, periodo);
    if (ref.terminada) {
      editSesion(s.id, (r) => (r.fin = new Date().toISOString()));
      cerrarSesion();
      return renderInicio();
    }
  }
  s.bloque++;
  await runBlock({ ficha, banda, modalidad: f.modalidad, trials, s, usados, pantalla, periodo });
}

// Aviso antes del bloque: las opciones no caben en esta pantalla a su tamaño mínimo.
function confirmarPantalla(mensaje) {
  app.innerHTML = `
    <div class="adulto">
      <h1>Tamaño de la pantalla</h1>
      <div class="panel">
        <p class="mensaje" role="alert">${esc(mensaje)}</p>
        <p class="ayuda">Si continúas, las opciones pueden salirse de la pantalla o encimarse, y los tiempos de este bloque no se podrán comparar con los de otros.</p>
        <div class="acciones">
          <button type="button" class="primario" data-r="volver">Volver</button>
          <button type="button" data-r="continuar">Continuar de todos modos</button>
        </div>
      </div>
    </div>`;
  return new Promise((resolve) => {
    for (const b of app.querySelectorAll('[data-r]')) b.onclick = () => resolve(b.dataset.r === 'continuar');
  });
}

// Pantalla del niño: escenario y botón de pausa del terapeuta. En modo experto: el código del ítem en
// una esquina y un botón para pasar al siguiente ítem.
function montarNino({ experto = false, claseStage = '' } = {}) {
  app.innerHTML = `
    <div class="nino">
      <div class="stage ${claseStage}" id="stage"></div>
      <button type="button" class="esquina" id="pausa" aria-label="Pausa: tocar dos veces">${ICONO_PAUSA}</button>
      ${experto ? '<p class="codigo-item" id="codigo-item"></p><button type="button" class="siguiente" id="siguiente">Siguiente</button>' : ''}
    </div>`;
  const wrap = app.firstElementChild;
  return { wrap, stage: wrap.querySelector('#stage') };
}

// Referencia motora al inicio de la sesión. Bloque 0 en la lista de pausas de sesiones.csv.
async function ejecutarReferencia(s, periodo) {
  const { wrap, stage } = montarNino({ claseStage: 'referencia' });
  state.running = true;
  const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
  const ref = iniciarReferencia({
    plan: planReferencia(rng(seedOf(`${s.id}:referencia`))),
    env: browserEnv({ framePeriod: periodo, audio }),
    view: referencia.createView(stage),
    onPause: async (aparicion) => {
      const t0 = performance.now();
      const { accion, motivo, nota, guiada_ms } = await pausePanel(wrap, true);
      editSesion(s.id, (r) => {
        r.pausas.push({ bloque: 0, ensayo: aparicion, duracion_ms: performance.now() - t0, ...(guiada_ms ? { pausa_guiada_ms: guiada_ms } : {}) });
        if (accion === 'terminar') Object.assign(r, { terminada_antes: true, motivo_terminacion: motivo || null, nota_terminacion: nota || null });
      });
      return accion;
    },
  });
  stage.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const objetivo = e.target.closest('[data-pos]');
    ref.pointer({ t: eventTime(e), x: Math.round(e.clientX), y: Math.round(e.clientY), pos: objetivo ? Number(objetivo.dataset.pos) : null });
  });
  twoTaps(wrap.querySelector('#pausa'), () => ref.pause());
  try {
    const { terminada, ...resumen } = await ref.done;
    editSesion(s.id, (r) => Object.assign(r, resumen));
    return { terminada };
  } finally {
    state.running = false;
    wake?.release().catch(() => {});
  }
}

async function runBlock({ ficha, banda: bandaDeFicha, modalidad, trials, s, usados, pantalla, periodo }) {
  const banda = bandaDeFicha.id;
  const { wrap, stage } = montarNino({ experto: s.experto });
  state.running = true;
  const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
  const env = browserEnv({ framePeriod: periodo, audio });
  const view = pantalla.createView(stage, state.images, { ficha, banda: bandaDeFicha, modalidad });
  let ensayo = 0;
  const block = startBlock({
    // Algunas pantallas ajustan los tiempos del bloque según la banda (ACT-09: la pausa en blanco).
    ficha: pantalla.fichaDeBloque?.(ficha, bandaDeFicha) ?? ficha,
    modalidad,
    trials,
    env,
    view,
    log,
    // latencia_dispositivo_ms queda vacía hasta medir cada tableta.
    base: { sesion_id: s.id, bloque: s.bloque, codigo_nino: s.codigo, dispositivo: dispositivo(), banda, version_app: VERSION_APP, modo_fase: 'prototipo', tema_imagenes: 'general' },
    rand: rng(seedOf(`${s.id}:${s.bloque}:posiciones`)),
    onPause: async () => {
      view.clear();
      const t0 = performance.now();
      const { accion, motivo, nota, guiada_ms } = await pausePanel(wrap);
      editSesion(s.id, (r) => {
        // De la pausa guiada solo se registra que ocurrió y cuánto duró.
        r.pausas.push({ bloque: s.bloque, ensayo, duracion_ms: performance.now() - t0, ...(guiada_ms ? { pausa_guiada_ms: guiada_ms } : {}) });
        if (accion === 'terminar') Object.assign(r, { terminada_antes: true, motivo_terminacion: motivo || null, nota_terminacion: nota || null });
      });
      return accion;
    },
    onTrial: (t, i) => {
      ensayo = i + 1;
      const label = wrap.querySelector('#codigo-item');
      if (label) label.textContent = t.codigo;
    },
  });
  wrap.querySelector('#siguiente')?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    block.skip(); // el ensayo en curso queda como interrumpido y empieza el siguiente
  });
  // Cada toque en la pantalla del niño llega al motor con su tiempo y posición.
  stage.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const opcion = e.target.closest('[data-pos]');
    block.pointer({ t: eventTime(e), x: Math.round(e.clientX), y: Math.round(e.clientY), pos: opcion ? Number(opcion.dataset.pos) : null });
  });
  twoTaps(wrap.querySelector('#pausa'), () => block.pause());

  let rows;
  try {
    rows = await block.done;
  } catch (e) {
    return renderInicio(e.message);
  } finally {
    state.running = false;
    wake?.release().catch(() => {});
  }
  const deLaSesion = log.rows().filter((r) => r.sesion_id === s.id);
  editSesion(s.id, (r) => Object.assign(r, { fin: new Date().toISOString(), ensayos: deLaSesion.length, ...frecuenciaSesion(deLaSesion) }));
  const byCode = new Map(trials.map((t) => [t.codigo, t]));
  for (const r of rows) if (byCode.get(r.item).clave) usados.add(byCode.get(r.item).clave);
  // Para el resumen de ACT-07: ensayos en que la regla cambió respecto al anterior.
  const cambio = (r) => Boolean(byCode.get(r.item).cambio);
  state.last = { rows, ficha, banda, modalidad, lineas: lineasDelBloque(rows, ficha, pantalla, byCode, { cambio }) };
  renderFin();
}

// Control del adulto en una esquina: el primer toque lo arma y el segundo, antes de 3 s, lo ejecuta.
function twoTaps(button, action, ms = 3000) {
  let armedAt = -Infinity;
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    if (now - armedAt < ms) {
      armedAt = -Infinity;
      button.classList.remove('armado');
      action();
      return;
    }
    armedAt = now;
    button.classList.add('armado');
    setTimeout(() => {
      if (performance.now() - armedAt >= ms) button.classList.remove('armado');
    }, ms);
  });
}

// enReferencia: la pausa llegó durante la referencia motora, antes de cualquier bloque.
function pausePanel(wrap, enReferencia = false) {
  return new Promise((resolve) => {
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.innerHTML = `
      <div class="adulto">
        ${tituloHTML('Sesión en pausa', enReferencia ? 'La aparición del objetivo en curso se descartó y no se repetirá.' : 'El ensayo en curso quedó registrado como interrumpido y no se repetirá.')}
        <div class="panel">
          <label for="volumen-pausa">Volumen de la voz <output data-volumen-valor>${volumen()} %</output>
            <input type="range" id="volumen-pausa" min="0" max="100" value="${volumen()}" data-volumen>
          </label>
          <label>Motivo (obligatorio si terminas ${enReferencia ? 'la sesión' : 'el bloque'})
            <select name="motivo">
              <option value="">—</option>
              ${MOTIVOS_TERMINACION.map((m) => `<option>${esc(m)}</option>`).join('')}
            </select>
          </label>
          <label>Nota (opcional)
            <input name="nota" maxlength="80" autocomplete="off">
            <span class="ayuda">Sin nombres ni datos personales.</span>
          </label>
          <p class="mensaje" role="alert"></p>
          <div class="acciones">
            <button type="button" class="primario" data-r="continuar">Continuar</button>
            <button type="button" data-r="terminar">${enReferencia ? 'Terminar sesión' : 'Terminar bloque'}</button>
          </div>
          ${state.pausa ? pausaOpcionesHTML(true) : ''}
        </div>
      </div>`;
    bindVolumen(capa);
    // La pausa guiada corre encima del panel y, al terminar, regresa a él.
    let guiada = 0;
    capa.querySelector('[data-guiada]')?.addEventListener('click', async () => {
      capa.hidden = true;
      const { duracion_ms } = await pausaGuiada(wrap, { ...opcionesDePausa(capa), icono: ICONO_ADULTO, dosToques: twoTaps });
      guiada += duracion_ms;
      capa.hidden = false;
      capa.querySelector('[data-guiada-estado]').textContent = `La pausa guiada duró ${Math.round(duracion_ms / 1000)} s.`;
    });
    for (const b of capa.querySelectorAll('[data-r]')) {
      b.onclick = () => {
        const valor = (name) => capa.querySelector(`[name=${name}]`).value.trim();
        if (faltaMotivo(b.dataset.r, valor('motivo'))) {
          capa.querySelector('.mensaje').textContent = MOTIVO_OBLIGATORIO_MSG;
          capa.querySelector('[name=motivo]').focus();
          return;
        }
        capa.remove();
        resolve({ accion: b.dataset.r, motivo: valor('motivo'), nota: valor('nota'), guiada_ms: guiada });
      };
    }
    wrap.append(capa);
  });
}

// ---------- Pausa guiada (ACT-17) ----------

// Duración y ritmo de la pausa. En el panel de pausa van plegadas, para no distraer.
function pausaOpcionesHTML(plegada) {
  const p = state.pausa;
  const minutos = (s) => (s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : s === 60 ? '1 minuto' : `${s / 60} minutos`);
  const cuerpo = `
    <p class="ayuda">La decide el terapeuta y el niño puede rechazarla. Para detenerla, toca dos veces el botón de la esquina.</p>
    <fieldset class="chips">
      <legend>Duración</legend>
      ${p.duracionesS.map((s, i) => chipHTML('guiada-duracion', s, minutos(s), i === 0)).join('')}
    </fieldset>
    <fieldset class="chips">
      <legend>Ritmo del globo</legend>
      ${p.ritmos.map((r, i) => chipHTML('guiada-ritmo', r.id, `${r.nombre}: ${r.inflarMs / 1000} s y ${r.desinflarMs / 1000} s`, i === 0)).join('')}
    </fieldset>
    <div class="acciones"><button type="button" data-guiada>Empezar la pausa guiada</button></div>
    <p class="meta" role="status" data-guiada-estado></p>`;
  return plegada ? `<details class="pausa-opciones"><summary>Pausa guiada con el globo</summary>${cuerpo}</details>` : cuerpo;
}

function opcionesDePausa(root) {
  const valor = (name) => root.querySelector(`[name=${name}]:checked`).value;
  return { duracionS: Number(valor('guiada-duracion')), ritmo: state.pausa.ritmos.find((r) => r.id === valor('guiada-ritmo')) };
}

// Página #pausa: la pausa guiada fuera de un bloque. Solo queda en el registro si hay una sesión en curso.
function renderPausa(msg = '') {
  const p = state.pausa;
  const lista = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  app.innerHTML = `
    <div class="adulto">
      ${navHTML('pausa')}
      ${tituloHTML('Pausa guiada', esc(p.objetivo))}
      <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
      <div class="panel">
        <p>${esc(p.mecanica)}</p>
        ${pausaOpcionesHTML(false).replace('data-guiada>', 'data-guiada class="primario">')}
        <p class="meta">${state.session ? `Queda anotada en la sesión ${esc(state.session.id)}: solo que ocurrió y cuánto duró.` : 'Sin una sesión en curso, la pausa no se guarda en el registro.'} ${esc(msg)}</p>
      </div>
      <section class="panel ficha">
        <h2>${esc(p.id)} ${esc(p.nombre)} · ${esc(p.estado)}</h2>
        <dl>
          <dt>Paradigma</dt><dd>${esc(p.paradigma)}</dd>
          <dt>Evidencia</dt><dd>${esc(p.evidencia)}</dd>
          <dt>Condiciones de uso</dt><dd>${lista(p.contraindicaciones)}</dd>
          <dt>Lecturas no permitidas</dt><dd>${lista(p.lecturasNoPermitidas.map((l) => `«${l}»`))}</dd>
          <dt>Registro</dt><dd>${esc(p.registro)}</dd>
        </dl>
        <p class="ayuda">${esc(p.notaPrototipo)}</p>
      </section>
    </div>`;
  app.querySelector('[data-guiada]').onclick = async () => {
    const opciones = opcionesDePausa(app);
    app.innerHTML = '<div class="nino"></div>';
    state.running = true;
    const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
    const { duracion_ms, completa } = await pausaGuiada(app.firstElementChild, { ...opciones, icono: ICONO_ADULTO, dosToques: twoTaps });
    state.running = false;
    wake?.release().catch(() => {});
    const s = state.session;
    if (s) editSesion(s.id, (r) => r.pausas.push({ bloque: s.bloque, ensayo: null, duracion_ms, pausa_guiada_ms: duracion_ms }));
    renderPausa(`La última pausa duró ${Math.round(duracion_ms / 1000)} s${completa ? '' : ' y se detuvo antes de tiempo'}.`);
  };
}

// ---------- Fin de bloque ----------

// Igual para todos los niños, sin importar el desempeño.
function renderFin() {
  app.innerHTML = `
    <div class="nino fin">
      <img class="terminar" alt="" src="${PICTO_FIN}">
      <button type="button" class="esquina" id="adulto" aria-label="Resumen para el adulto: tocar dos veces">${ICONO_ADULTO}</button>
    </div>`;
  twoTaps(app.querySelector('#adulto'), renderResumen);
}

function renderResumen() {
  const { ficha, banda, modalidad, lineas } = state.last;
  const s = state.session;
  const nivel = sesiones.rows().find((r) => r.sesion_id === s.id)?.nivel_apoyo.find((n) => n.bloque === s.bloque)?.nivel;
  const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);
  app.innerHTML = `
    <div class="adulto">
      ${marcaHTML()}
      ${tituloHTML('Resumen del bloque', `${esc(ficha.id)} ${esc(ficha.nombre)} · banda ${esc(banda)} · modalidad ${esc(modalidad)} · sesión ${esc(s.id)}, bloque ${s.bloque}`)}
      <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
      <div class="panel">
        <ul class="resumen">${lineas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="ayuda">Describe lo registrado en este bloque. No es un puntaje ni una interpretación clínica.</p>
        <details class="no-concluir">
          <summary>Qué no se puede concluir de este bloque</summary>
          <ul>${ficha.lecturasNoPermitidas.map((l) => `<li>«${esc(l)}»</li>`).join('')}</ul>
        </details>
        <fieldset class="chips">
          <legend>Nivel de apoyo en este bloque</legend>
          ${NIVELES_APOYO.map((n) => chipHTML('apoyo', n, mayuscula(n), nivel === n)).join('')}
        </fieldset>
        <div class="acciones">
          <button type="button" class="primario" id="otro">Otro bloque</button>
          <button type="button" id="cerrar">Terminar sesión</button>
        </div>
      </div>
      ${registroHTML()}
    </div>`;
  for (const r of app.querySelectorAll('[name=apoyo]')) {
    r.onchange = () =>
      editSesion(s.id, (fila) => {
        fila.nivel_apoyo = [...fila.nivel_apoyo.filter((n) => n.bloque !== s.bloque), { bloque: s.bloque, nivel: r.value }];
      });
  }
  app.querySelector('#otro').onclick = () => renderInicio();
  app.querySelector('#cerrar').onclick = () => {
    cerrarSesion();
    renderInicio();
  };
  bindRegistro(app, renderResumen);
}

init();
