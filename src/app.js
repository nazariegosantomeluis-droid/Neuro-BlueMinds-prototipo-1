// Aplicación: pantallas del adulto, sesión del niño y descarga del registro.
// El motor (src/engine) ejecuta la ficha; aquí solo se arma la sesión y se dibuja.
import { loadFicha } from './engine/ficha.js';
import { createLog, toCSV, toJSON, download, VERSION_APP } from './engine/logger.js';
import { pickItems, rng, seedOf, itemKey } from './engine/selector.js';
import { startBlock, NO_AUDIO_MSG } from './engine/trial.js';
import { browserEnv, estimateFramePeriod, eventTime } from './engine/clock.js';
import { createAudio } from './engine/audio.js';
import { summarize } from './engine/quality.js';
import { createSeleccionView } from './activities/seleccion.js';

// Actividades del inicio y tipo de pantalla que dibuja cada ficha.
const ACTIVIDADES = ['ACT-01', 'ACT-02'];
const PANTALLAS = { seleccion: createSeleccionView };
const PICTO_FIN = 'assets/picto/terminar.png';
const MODALIDADES = { V: 'V · solo visual', AV: 'AV · visual con voz' };

const ICONO_PAUSA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>';
const ICONO_ADULTO =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>';

const app = document.getElementById('app');
const log = createLog();
const audio = createAudio();
const state = {
  fichas: {}, // id → ficha válida
  problemas: {}, // id → problemas de la ficha (o del banco de ítems)
  items: [],
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

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// El cm de CSS no mide un centímetro real en tabletas. Se estima suponiendo una tableta
// de 10" (pantalla táctil) o un monitor de 96 ppp (computadora); la página de
// Calibración guarda el valor medido en el dispositivo.
function applyCm() {
  const saved = Number(prefs.get('nbm.cm', ''));
  const tablet = matchMedia('(pointer: coarse)').matches;
  const estimated = tablet ? Math.hypot(screen.width, screen.height) / (10 * 2.54) : 96 / 2.54;
  document.documentElement.style.setProperty('--cm', `${saved > 0 ? saved : estimated}px`);
}

const randomHex = () =>
  [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
const newSession = (codigo) => ({ id: `S-${randomHex()}`, codigo, bloque: 0, usados: {} });
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
  } catch {
    state.problemas.items = ['No se pudo cargar el banco de ítems (items/items.json).'];
  }
  renderInicio();
}

// ---------- Inicio ----------

function renderInicio(msg = '') {
  const f = state.form;
  const actividad = ACTIVIDADES.includes(f.actividad) ? f.actividad : ACTIVIDADES[0];
  const ficha = state.fichas[actividad];
  const problemas = [...(state.problemas[actividad] ?? []), ...(state.problemas.items ?? [])];
  app.innerHTML = `
    <div class="adulto">
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
    state.form = { actividad: form.actividad.value, modalidad: f.modalidad, codigo: f.codigo };
    renderInicio();
  };
  if (form.banda) {
    form.banda.onchange = () => {
      form.querySelector('#banda-ayuda').textContent = ficha.bandas.find((b) => b.id === form.banda.value).descripcion;
    };
  }
  form.querySelector('#cerrar-sesion')?.addEventListener('click', () => {
    state.session = null;
    renderInicio();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    audio.unlock(); // dentro del gesto del adulto
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
      <input type="number" name="ensayos" min="1" max="200" inputmode="numeric" value="${esc(f.ensayos ?? ficha.ensayosPorBloque)}">
    </label>
    ${
      s
        ? `<div><p class="meta">Sesión en curso <strong>${esc(s.id)}</strong> · código ${esc(s.codigo)} · bloques: ${s.bloque}</p>
           <div class="acciones"><button type="button" id="cerrar-sesion">Terminar sesión</button></div></div>`
        : `<label>Código del niño (opcional)
             <input name="codigo" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(f.codigo ?? 'DEMO')}">
             <span class="ayuda">Usa un código, nunca el nombre ni otro dato que identifique al niño.</span>
           </label>`
    }
    <label>Volumen
      <input type="range" min="0" max="100" value="${volumen()}" data-volumen>
    </label>`;
}

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
          <button type="button" data-borrar ${off}>Borrar registro</button>
        </div>
      </div>
    </section>`;
}

function bindRegistro(root, rerender) {
  for (const b of root.querySelectorAll('[data-descargar]')) {
    b.onclick = () => {
      const csv = b.dataset.descargar === 'csv';
      const fecha = new Date().toISOString().slice(0, 10); // solo para el nombre del archivo
      download(
        `registro-neuro-blueminds-${fecha}.${csv ? 'csv' : 'json'}`,
        csv ? toCSV(log.rows()) : toJSON(log.rows()),
        csv ? 'text/csv;charset=utf-8' : 'application/json',
      );
    };
  }
  const borrar = root.querySelector('[data-borrar]');
  if (borrar) {
    borrar.onclick = () => {
      if (confirm('¿Borrar todo el registro guardado en este dispositivo? Descárgalo antes si lo necesitas.')) {
        log.clear();
        rerender();
      }
    };
  }
}

// ---------- Sesión ----------

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
  const n = Math.max(1, Math.floor(Number(f.ensayos)) || ficha.ensayosPorBloque);
  // La sesión empieza con su primer bloque; hasta entonces no existe.
  const s = state.session ?? newSession((f.codigo ?? '').trim() || 'DEMO');
  const usados = (s.usados[ficha.id] ??= new Set());
  const repeat = ficha.repetirItems !== false;
  const bandItems = state.items.filter((i) => i.actividad === ficha.id && i.banda === f.banda);
  let picked;
  try {
    picked = pickItems(bandItems, n, rng(seedOf(`${s.id}:${s.bloque + 1}`)), { repeat, exclude: repeat ? new Set() : usados });
  } catch (e) {
    return renderInicio(`${e.message} Elige menos ensayos o termina la sesión para empezar una nueva.`);
  }
  const trials = picked.map((it) => ({ codigo: it.codigo, consigna: it.consigna, opciones: it.opciones, clave: itemKey(it) }));
  try {
    await preloadImages([PICTO_FIN, ...trials.flatMap((t) => [t.consigna.src, ...t.opciones.map((o) => o.src)])]);
  } catch (e) {
    return renderInicio(e.message);
  }
  if (f.modalidad === 'AV' && !(await audio.available(trials.map((t) => t.consigna.audio)))) {
    return renderInicio(NO_AUDIO_MSG);
  }
  state.session = s;
  s.bloque++;
  await runBlock({ ficha, banda: f.banda, modalidad: f.modalidad, trials, s, usados });
}

async function runBlock({ ficha, banda, modalidad, trials, s, usados }) {
  app.innerHTML = `
    <div class="nino">
      <div class="stage" id="stage"></div>
      <button type="button" class="esquina" id="pausa" aria-label="Pausa: tocar dos veces">${ICONO_PAUSA}</button>
    </div>`;
  const wrap = app.firstElementChild;
  const stage = wrap.querySelector('#stage');
  const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
  const env = browserEnv({ framePeriod: await estimateFramePeriod(30), audio });
  const view = PANTALLAS[ficha.pantalla](stage, state.images);
  const block = startBlock({
    ficha,
    modalidad,
    trials,
    env,
    view,
    log,
    base: { sesion_id: s.id, bloque: s.bloque, codigo_nino: s.codigo, dispositivo: dispositivo(), banda, version_app: VERSION_APP },
    rand: rng(seedOf(`${s.id}:${s.bloque}:posiciones`)),
    onPause: () => {
      view.clear();
      return pausePanel(wrap);
    },
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
    wake?.release().catch(() => {});
  }
  for (const r of rows) usados.add(trials.find((t) => t.codigo === r.item).clave);
  state.last = { rows, ficha, banda, modalidad };
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
          <div class="acciones">
            <button type="button" class="primario" data-r="continuar">Continuar</button>
            <button type="button" data-r="terminar">Terminar bloque</button>
          </div>
        </div>
      </div>`;
    bindVolumen(capa);
    for (const b of capa.querySelectorAll('[data-r]')) {
      b.onclick = () => {
        capa.remove();
        resolve(b.dataset.r);
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
  const { rows, ficha, banda, modalidad } = state.last;
  const s = state.session;
  app.innerHTML = `
    <div class="adulto">
      <h1>Resumen del bloque</h1>
      <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
      <div class="panel">
        <p class="meta">${esc(ficha.id)} ${esc(ficha.nombre)} · banda ${esc(banda)} · modalidad ${esc(modalidad)} · sesión ${esc(s.id)}, bloque ${s.bloque}</p>
        <ul class="resumen">${summarize(rows, ficha).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="ayuda">Describe lo registrado en este bloque. No es un puntaje ni una interpretación clínica.</p>
        <div class="acciones">
          <button type="button" class="primario" id="otro">Otro bloque</button>
          <button type="button" id="cerrar">Terminar sesión</button>
        </div>
      </div>
      ${registroHTML()}
    </div>`;
  app.querySelector('#otro').onclick = () => renderInicio();
  app.querySelector('#cerrar').onclick = () => {
    state.session = null;
    renderInicio();
  };
  bindRegistro(app, renderResumen);
}

init();
