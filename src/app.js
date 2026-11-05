// Aplicación: pantallas del adulto, sesión del niño y descarga del registro.
// El motor (src/engine) ejecuta la ficha; aquí solo se arma la sesión y se dibuja.
import { loadFicha } from './engine/ficha.js';
import { createLog, toCSV, toJSON, download, VERSION_APP, SESION_COLUMNS, SESION_KEY } from './engine/logger.js';
import { pickItems, pickComposed, rng, seedOf, shuffle } from './engine/selector.js';
import { startBlock, NO_AUDIO_MSG } from './engine/trial.js';
import { browserEnv, eventTime } from './engine/clock.js';
import { createAudio } from './engine/audio.js';
import { summarize, marcarFueraDeTarea, paraExportar, frecuenciaSesion } from './engine/quality.js';
import { comprobarFrecuencia } from './frecuencia.js';
import * as seleccion from './activities/seleccion.js';
import * as cambiaRegla from './activities/cambia-regla.js';
import { esc, navHTML, renderGaleria, renderCreditos, renderCalibracion } from './paginas.js';
import { renderRevision } from './revision.js';
import { agregarEnlaceF3 } from './enlaces.js';
import { renderF3 } from './f3.js';
import { MOTIVOS_TERMINACION, MOTIVO_OBLIGATORIO_MSG, faltaMotivo } from './terminacion.js';

// Actividades del inicio y tipo de pantalla que dibuja cada ficha. Cada pantalla aporta
// toTrials (de ítems a ensayos) y createView (cómo se dibuja).
const ACTIVIDADES = ['ACT-01', 'ACT-02', 'ACT-07'];
const PANTALLAS = { seleccion, 'cambia-regla': cambiaRegla };
const PICTO_FIN = 'assets/picto/terminar.png';
const MODALIDADES = { V: 'V · solo visual', AV: 'AV · visual con voz' };
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
const audio = createAudio();
const state = {
  fichas: {}, // id → ficha válida
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
// Las sesiones del modo experto empiezan con EXP- para separarlas de las sesiones reales.
const newSession = (codigo, experto) => ({
  id: `${experto ? 'EXP' : 'S'}-${randomHex()}`,
  experto,
  codigo,
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
  await Promise.all(
    ACTIVIDADES.map(async (id) => {
      try {
        state.fichas[id] = await loadFicha(`fichas/${id}.json`);
      } catch (e) {
        state.problemas[id] = e.errors ?? [e.message];
      }
    }),
  );
  try {
    state.items = (await (await fetch('items/items.json')).json()).items;
    state.conceptos = (await (await fetch('items/conceptos.json')).json()).conceptos;
  } catch {
    state.problemas.items = ['No se pudo cargar el banco de ítems (items/items.json o items/conceptos.json).'];
  }
  addEventListener('hashchange', route);
  route();
}

// Rutas: #inicio, #galeria (con filtros: #galeria?actividad=ACT-02&banda=B3), #revision, #formulario (F3), #creditos y #calibracion.
function route() {
  if (state.running) return; // durante un bloque solo se sale con la pausa
  const [ruta, query = ''] = location.hash.slice(1).split('?');
  if (ruta === 'galeria' && !state.problemas.items) {
    renderGaleria(app, state, new URLSearchParams(query));
    agregarEnlaceF3(app);
  } else if (ruta === 'revision' && !state.problemas.items) renderRevision(app, state);
  else if (ruta === 'formulario' && !state.problemas.items) renderF3(app, state);
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
}

// ---------- Inicio ----------

function renderInicio(msg = '') {
  const f = state.form;
  const actividad = ACTIVIDADES.includes(f.actividad) ? f.actividad : ACTIVIDADES[0];
  const ficha = state.fichas[actividad];
  const problemas = [...(state.problemas[actividad] ?? []), ...(state.problemas.items ?? [])];
  app.innerHTML = `
    <div class="adulto">
      ${navHTML('inicio')}
      <h1>Neuro-BlueMinds <span>· Prototipo E13</span></h1>
      <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
      <form class="panel" id="inicio" novalidate>
        <label>Actividad
          <select name="actividad">
            ${ACTIVIDADES.map((id) => `<option value="${id}" ${id === actividad ? 'selected' : ''}>${id} · ${esc(state.fichas[id]?.nombre ?? 'ficha con problemas')}</option>`).join('')}
          </select>
        </label>
        ${problemas.length ? `<div class="problemas" role="alert">Esta actividad no se puede usar:<ul>${problemas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
        ${ficha && !problemas.length ? camposHTML(ficha, f) : ''}
        <p class="mensaje" role="alert">${esc(msg)}</p>
        <div class="acciones">
          <button type="submit" class="primario" ${ficha && !problemas.length ? '' : 'disabled'}>Empezar</button>
        </div>
      </form>
      ${registroHTML()}
    </div>`;

  const form = app.querySelector('#inicio');
  form.actividad.onchange = () => {
    state.form = { actividad: form.actividad.value, modalidad: f.modalidad, codigo: f.codigo, experto: f.experto };
    renderInicio();
  };
  if (form.banda) {
    form.banda.onchange = () => {
      form.querySelector('#banda-ayuda').textContent = ficha.bandas.find((b) => b.id === form.banda.value).descripcion;
    };
  }
  form.querySelector('#cerrar-sesion')?.addEventListener('click', () => {
    cerrarSesion();
    renderInicio();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    audio.unlock(); // dentro del gesto del adulto
    form.querySelector('[type=submit]').disabled = true; // un solo bloque aunque se toque dos veces
    start(form);
  };
  bindVolumen(app);
  bindRegistro(app, () => renderInicio());
}

function camposHTML(ficha, f) {
  const banda = ficha.bandas.find((b) => b.id === f.banda) ?? ficha.bandas[0];
  const modalidad = ficha.modalidades.includes(f.modalidad) ? f.modalidad : ficha.modalidades[0];
  const s = state.session;
  return `
    <fieldset>
      <legend>Modalidad</legend>
      ${ficha.modalidades.map((m) => `<label><input type="radio" name="modalidad" value="${m}" ${m === modalidad ? 'checked' : ''}> ${MODALIDADES[m]}</label>`).join('')}
    </fieldset>
    <label>Banda inicial
      <select name="banda">
        ${ficha.bandas.map((b) => `<option value="${b.id}" ${b.id === banda.id ? 'selected' : ''}>${b.id} · ${b.opciones} opciones</option>`).join('')}
      </select>
      <span class="ayuda" id="banda-ayuda">${esc(banda.descripcion)}</span>
    </label>
    <label>Número de ensayos
      <input type="number" name="ensayos" min="1" max="${maxEnsayos(ficha, banda)}" inputmode="numeric" value="${esc(f.ensayos ?? ficha.ensayosPorBloque)}">
    </label>
    ${
      s
        ? `<div><p class="meta">${s.experto ? 'Sesión de modo experto' : 'Sesión en curso'} <strong>${esc(s.id)}</strong> · código ${esc(s.codigo)} · bloques: ${s.bloque}</p>
           <div class="acciones"><button type="button" id="cerrar-sesion">Terminar sesión</button></div></div>`
        : `<label>Código del niño (opcional)
             <input name="codigo" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(f.codigo ?? 'DEMO')}">
             <span class="ayuda">Usa un código, nunca el nombre ni otro dato que identifique al niño.</span>
           </label>
           <label class="casilla"><input type="checkbox" name="experto" value="1" ${f.experto ? 'checked' : ''}> Modo experto
             <span class="ayuda">Muestra el código de cada ítem y un botón «Siguiente» para avanzar sin esperar los tiempos. Sus registros llevan un sesion_id que empieza con EXP-.</span>
           </label>`
    }
    <label>Volumen
      <input type="range" min="0" max="100" value="${volumen()}" data-volumen>
    </label>`;
}

// Un bloque armado por composición (ACT-07) tiene tantos ensayos como sus secuencias.
const maxEnsayos = (ficha, banda) => (banda.composicion ? banda.composicion.length * ficha.ensayosPorSecuencia : 200);

function bindVolumen(root) {
  for (const r of root.querySelectorAll('[data-volumen]')) {
    r.oninput = () => {
      prefs.set('nbm.volumen', r.value);
      audio.setVolume(r.value / 100);
    };
  }
}

// ---------- Registro ----------

function registroHTML() {
  const n = log.rows().length;
  const off = n ? '' : 'disabled';
  return `
    <section>
      <h2>Registro</h2>
      <div class="panel">
        <p class="meta">${n === 1 ? '1 ensayo guardado' : `${n} ensayos guardados`} en este dispositivo. Nada se envía a ningún servidor.</p>
        ${log.stored ? '' : '<p class="mensaje">No se pudo guardar en el dispositivo. Descarga el registro antes de cerrar esta página.</p>'}
        <div class="acciones">
          <button type="button" data-descargar="csv" ${off}>Descargar registro (CSV)</button>
          <button type="button" data-descargar="json" ${off}>Descargar registro (JSON)</button>
          <button type="button" data-descargar="sesiones" ${off}>Descargar sesiones (CSV)</button>
          <button type="button" data-borrar ${off}>Borrar registro</button>
        </div>
      </div>
    </section>`;
}

function bindRegistro(root, rerender) {
  for (const b of root.querySelectorAll('[data-descargar]')) {
    b.onclick = () => {
      const tipo = b.dataset.descargar;
      const fecha = new Date().toISOString().slice(0, 10); // solo para el nombre del archivo
      if (tipo === 'json') download(`registro-neuro-blueminds-${fecha}.json`, toJSON(paraExportar(log.rows())), 'application/json');
      else if (tipo === 'csv') download(`registro-neuro-blueminds-${fecha}.csv`, toCSV(paraExportar(log.rows())), 'text/csv;charset=utf-8');
      else download(`sesiones-neuro-blueminds-${fecha}.csv`, toCSV(sesiones.rows(), SESION_COLUMNS), 'text/csv;charset=utf-8');
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
  const f = (state.form = Object.fromEntries(new FormData(form)));
  const ficha = state.fichas[f.actividad];
  const banda = ficha.bandas.find((b) => b.id === f.banda);
  const pantalla = PANTALLAS[ficha.pantalla];
  const n = Math.min(maxEnsayos(ficha, banda), Math.max(1, Math.floor(Number(f.ensayos)) || ficha.ensayosPorBloque));
  // La sesión empieza con su primer bloque; hasta entonces no existe.
  const s = state.session ?? newSession((f.codigo ?? '').trim() || 'DEMO', f.experto === '1');
  const rand = rng(seedOf(`${s.id}:${s.bloque + 1}`));
  const usados = (s.usados[ficha.id] ??= new Set());
  const repeat = ficha.repetirItems !== false;
  const bandItems = state.items.filter((i) => i.actividad === ficha.id && i.banda === banda.id);
  let picked;
  try {
    if (banda.composicion) {
      // El orden de las dimensiones se sortea una vez por sesión: en B1 la regla es la misma toda la sesión.
      s.orden[ficha.id] ??= shuffle(ficha.dimensiones, rand);
      picked = pickComposed(bandItems, banda.composicion, s.orden[ficha.id], rand);
    } else {
      picked = pickItems(bandItems, n, rand, { repeat, exclude: repeat ? new Set() : usados });
    }
  } catch (e) {
    return renderInicio(`${e.message} Elige menos ensayos o termina la sesión para empezar una nueva.`);
  }
  const pareja = ficha.parejas?.[s.numero % ficha.parejas.length];
  const trials = pantalla.toTrials(picked, { ficha, banda, pareja }).slice(0, n);
  try {
    const srcs = trials.flatMap((t) => [t.consigna.src, ...t.opciones.map((o) => o.src)]).filter(Boolean);
    await preloadImages([PICTO_FIN, ...srcs]);
  } catch (e) {
    return renderInicio(e.message);
  }
  if (f.modalidad === 'AV' && !(await audio.available(trials.map((t) => t.consigna.audio)))) {
    return renderInicio(NO_AUDIO_MSG);
  }
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
  s.bloque++;
  await runBlock({ ficha, banda: banda.id, modalidad: f.modalidad, trials, s, usados, pantalla, periodo });
}

async function runBlock({ ficha, banda, modalidad, trials, s, usados, pantalla, periodo }) {
  // En modo experto: el código del ítem en una esquina y un botón para pasar al siguiente ítem.
  app.innerHTML = `
    <div class="nino">
      <div class="stage" id="stage"></div>
      <button type="button" class="esquina" id="pausa" aria-label="Pausa: tocar dos veces">${ICONO_PAUSA}</button>
      ${s.experto ? '<p class="codigo-item" id="codigo-item"></p><button type="button" class="siguiente" id="siguiente">Siguiente</button>' : ''}
    </div>`;
  const wrap = app.firstElementChild;
  const stage = wrap.querySelector('#stage');
  state.running = true;
  const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
  const env = browserEnv({ framePeriod: periodo, audio });
  const view = pantalla.createView(stage, state.images);
  let ensayo = 0;
  const block = startBlock({
    ficha,
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
      const { accion, motivo, nota } = await pausePanel(wrap);
      editSesion(s.id, (r) => {
        r.pausas.push({ bloque: s.bloque, ensayo, duracion_ms: performance.now() - t0 });
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
  state.last = { rows, ficha, banda, modalidad, cambio };
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

function pausePanel(wrap) {
  return new Promise((resolve) => {
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.innerHTML = `
      <div class="adulto">
        <h1>Sesión en pausa</h1>
        <div class="panel">
          <p class="meta">El ensayo en curso quedó registrado como interrumpido y no se repetirá.</p>
          <label>Volumen <input type="range" min="0" max="100" value="${volumen()}" data-volumen></label>
          <label>Motivo (obligatorio si terminas el bloque)
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
            <button type="button" data-r="terminar">Terminar bloque</button>
          </div>
        </div>
      </div>`;
    bindVolumen(capa);
    for (const b of capa.querySelectorAll('[data-r]')) {
      b.onclick = () => {
        const valor = (name) => capa.querySelector(`[name=${name}]`).value.trim();
        if (faltaMotivo(b.dataset.r, valor('motivo'))) {
          capa.querySelector('.mensaje').textContent = MOTIVO_OBLIGATORIO_MSG;
          capa.querySelector('[name=motivo]').focus();
          return;
        }
        capa.remove();
        resolve({ accion: b.dataset.r, motivo: valor('motivo'), nota: valor('nota') });
      };
    }
    wrap.append(capa);
  });
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
  const { rows, ficha, banda, modalidad, cambio } = state.last;
  const s = state.session;
  const nivel = sesiones.rows().find((r) => r.sesion_id === s.id)?.nivel_apoyo.find((n) => n.bloque === s.bloque)?.nivel;
  app.innerHTML = `
    <div class="adulto">
      <h1>Resumen del bloque</h1>
      <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
      <div class="panel">
        <p class="meta">${esc(ficha.id)} ${esc(ficha.nombre)} · banda ${esc(banda)} · modalidad ${esc(modalidad)} · sesión ${esc(s.id)}, bloque ${s.bloque}</p>
        <ul class="resumen">${summarize(rows, ficha, { cambio }).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="ayuda">Describe lo registrado en este bloque. No es un puntaje ni una interpretación clínica.</p>
        <fieldset>
          <legend>Nivel de apoyo en este bloque</legend>
          ${NIVELES_APOYO.map((n) => `<label><input type="radio" name="apoyo" value="${n}" ${nivel === n ? 'checked' : ''}> ${n}</label>`).join('')}
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
