// Máquina de estados del ensayo. Es la misma para todas las actividades:
// la actividad solo aporta la vista (cómo se dibujan la consigna y las opciones).
import { derive } from './quality.js';
import { shuffle } from './selector.js';

export const STATES = ['intervalo', 'consigna', 'opciones', 'respuesta', 'retroalimentacion', 'cierre'];

// Un toque a menos de este tiempo del anterior se ignora y se cuenta como repetido.
export const REPEAT_MS = 100;

// Tope de seguridad de la consigna AV, por si nunca llega el evento de fin del audio.
export const AUDIO_CAP_MS = 5000;

const STOP = Symbol('interrumpido');
const CAP = Symbol('tope');

/**
 * Crea un ensayo.
 * env: reloj y temporizadores (browserEnv en clock.js; en las pruebas, uno simulado).
 *   env.audio.play(clave, texto) → Promise<{ tInicio, fuente, latenciaMs, fin: Promise<t>, stop() } | null>
 * view: clear(), showPrompt(consigna), showOptions(opciones), showFeedback(posCorrecta).
 * La vista llama a pointer({ t, x, y, pos }) en cada pointerdown: pos es la posición
 * (desde 1) de la opción tocada, o null si el toque cayó fuera de las opciones.
 */
export function createTrial({ ficha, modalidad, consigna, opciones, posCorrecta, env, view, onState = () => {} }) {
  const r = {
    t_consigna_inicio: null,
    t_consigna_fin: null,
    t_audio_inicio: null,
    t_audio_fin: null,
    audio_fuente: null,
    audio_latencia_ms: null,
    audio_fin_por_tope: false,
    t_opciones_insercion: null,
    t_opciones: null,
    t_toque: null,
    t_retro_inicio: null,
    t_retro_fin: null,
    opcion_elegida: null,
    acierto: false,
    omision: false,
    toques_fuera: [],
    toques_repetidos: 0,
    perdida_foco: false,
    cuadros_perdidos: 0,
    cuadros_total: 0,
    interrumpido: false,
  };
  let state = null;
  let lastTouch = -Infinity;
  let answer = null; // solo existe mientras se esperan respuestas
  let audio = null;
  let stop;
  const stopped = new Promise((resolve) => (stop = resolve));
  const guard = (p) => Promise.race([p, stopped]);
  const enter = (s) => {
    state = s;
    onState(s);
  };

  async function body() {
    enter('intervalo');
    view.clear();
    if ((await guard(env.sleep(ficha.intervaloMs))) === STOP) return;

    enter('consigna');
    view.showPrompt(consigna);
    const tc = await guard(env.nextPaint());
    if (tc === STOP) return;
    r.t_consigna_inicio = tc;
    if (modalidad === 'AV') {
      const a = await guard(env.audio.play(consigna.audio, consigna.texto));
      if (a === STOP) return;
      audio = a;
    }
    if (audio) {
      r.t_audio_inicio = audio.tInicio;
      r.audio_fuente = audio.fuente;
      r.audio_latencia_ms = audio.latenciaMs ?? null;
      const fin = await guard(Promise.race([audio.fin, env.sleep(AUDIO_CAP_MS).then(() => CAP)]));
      if (fin === STOP) return;
      // Sin evento de fin no se inventa la hora: t_audio_fin queda vacío.
      if (fin === CAP) r.audio_fin_por_tope = true;
      else r.t_audio_fin = fin;
    } else {
      if (modalidad === 'AV') r.audio_fuente = 'ninguna';
      if ((await guard(env.sleep(ficha.consignaVMs))) === STOP) return;
    }
    r.t_consigna_fin = env.now();

    enter('opciones');
    const answered = new Promise((resolve) => (answer = resolve));
    view.showOptions(opciones);
    r.t_opciones_insercion = env.now();
    const to = await guard(env.nextPaint());
    if (to === STOP) return;
    r.t_opciones = to;
    // El límite cuenta desde la aparición de las opciones, no desde la consigna.
    const limit = env.sleep(Math.max(0, to + ficha.limiteRespuestaMs - env.now())).then(() => null);
    const resp = await guard(Promise.race([answered, limit]));
    answer = null;
    if (resp === STOP) return;

    enter('respuesta');
    if (resp) {
      r.t_toque = resp.t;
      r.opcion_elegida = resp.pos;
      r.acierto = resp.pos === posCorrecta;
    } else {
      r.omision = true;
    }

    // Acierto, error u omisión: siempre se señala la opción correcta, de la misma forma.
    enter('retroalimentacion');
    view.showFeedback(posCorrecta);
    const tf = await guard(env.nextPaint());
    if (tf === STOP) return;
    r.t_retro_inicio = tf;
    if ((await guard(env.sleep(ficha.retroalimentacionMs))) === STOP) return;
    r.t_retro_fin = env.now();
  }

  async function run() {
    env.frames.start();
    env.focus.start();
    try {
      await body();
    } finally {
      enter('cierre');
      audio?.stop?.();
      const f = env.frames.stop();
      r.cuadros_perdidos = f.late;
      r.cuadros_total = f.total;
      r.perdida_foco = env.focus.stop();
    }
    return { ...r, ...derive(r) };
  }

  function pointer({ t, x = null, y = null, pos = null }) {
    if (!state || state === 'cierre' || r.interrumpido) return;
    if (t - lastTouch < REPEAT_MS) {
      r.toques_repetidos++;
      return;
    }
    lastTouch = t;
    if (pos === null) r.toques_fuera.push({ t, x, y });
    else if (answer) {
      answer({ t, pos });
      answer = null;
    }
  }

  // Pausa del terapeuta o salto del modo experto: el ensayo se cierra como interrumpido.
  function interrupt() {
    if (!state || state === 'cierre' || r.interrumpido) return;
    r.interrumpido = true;
    answer = null;
    stop(STOP);
  }

  return {
    run,
    pointer,
    interrupt,
    get state() {
      return state;
    },
  };
}

/**
 * Ejecuta un bloque de ensayos y guarda un registro por ensayo.
 * trials: [{ codigo, consigna, opciones: [{ id, correcta, ... }] }]
 * base: campos de la sesión (sesion_id, bloque, codigo_nino, dispositivo, banda, version_app).
 * onPause(): lo llama después de un ensayo pausado; devuelve 'continuar' o 'terminar'.
 */
export function startBlock({ ficha, modalidad, trials, base, env, view, log, rand, onPause = async () => 'continuar', onState }) {
  let current = null;
  let reason = null;

  const done = (async () => {
    const rows = [];
    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];
      const opciones = ficha.barajarOpciones === false ? t.opciones : shuffle(t.opciones, rand);
      const posCorrecta = opciones.findIndex((o) => o.correcta) + 1;
      reason = null;
      current = createTrial({ ficha, modalidad, consigna: t.consigna, opciones, posCorrecta, env, view, onState });
      const measured = await current.run();
      rows.push(
        log.add({
          ...base,
          actividad: ficha.id,
          version_ficha: ficha.version,
          modalidad,
          ensayo: i + 1,
          item: t.codigo,
          n_opciones: opciones.length,
          pos_correcta: posCorrecta,
          pos_distractores: opciones.flatMap((o, k) => (o.correcta ? [] : [{ id: o.id, pos: k + 1 }])),
          ...measured,
        }),
      );
      // El ensayo pausado no se repite: al continuar sigue el siguiente.
      if (reason === 'pausa' && (await onPause()) === 'terminar') break;
    }
    current = null;
    return rows;
  })();

  return {
    done,
    pointer: (p) => current?.pointer(p),
    pause() {
      reason = 'pausa';
      current?.interrupt();
    },
    skip() {
      reason = 'salto';
      current?.interrupt();
    },
  };
}
