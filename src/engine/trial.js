// Máquina de estados del ensayo. Es la misma para todas las actividades:
// la actividad solo aporta la vista (cómo se dibujan la consigna y las opciones).
import { derive, fueraDeTarea, VERSION_PARAMETROS } from './quality.js';
import { shuffle } from './selector.js';

export const STATES = ['intervalo', 'consigna', 'opciones', 'respuesta', 'retroalimentacion', 'cierre'];

// Otro toque sobre una opción a menos de este tiempo de la respuesta se cuenta como repetido.
export const REPEAT_MS = 100;

// Tope de seguridad de la consigna AV, por si nunca llega el evento de fin del audio.
export const AUDIO_CAP_MS = 5000;

// Si las imágenes de las opciones no terminan de decodificarse en este tiempo después de la
// consigna, las opciones aparecen de todos modos y el ensayo queda con decodificacion_ok = false.
export const DECODE_CAP_MS = 1000;

export const NO_AUDIO_MSG = 'No hay audio disponible en este dispositivo. Use la modalidad visual o revise el volumen.';

const STOP = Symbol('interrumpido');
const CAP = Symbol('tope');
const FAIL = Symbol('fallo');

/**
 * Crea un ensayo.
 * env: reloj y temporizadores (browserEnv en clock.js; en las pruebas, simEnv).
 *   env.audio.play(clave, texto) → Promise<{ tInicio, fuente, latenciaMs, fin: Promise<t>, stop() } | null>
 * view: clear(), showPrompt(consigna), showOptions(opciones, disposicion), showFeedback(posCorrecta)
 *   y, si la actividad anuncia cambios, showAnnouncement(anuncio).
 *   Opcional: prepareOptions(opciones, disposicion) → Promise. Arma y decodifica las opciones
 *   durante la consigna; showOptions solo las inserta.
 * La vista llama a pointer({ t, x, y, pos }) en cada pointerdown: pos es la posición
 * de la opción tocada (por filas, desde 1), o null si el toque cayó fuera de las opciones.
 */
export function createTrial({ ficha, modalidad, consigna, opciones, posCorrecta, disposicion, env, view, onState = () => {} }) {
  const r = {
    t_consigna_inicio: null,
    t_consigna_fin: null,
    t_audio_inicio: null,
    t_audio_fin: null,
    audio_fuente: null,
    audio_latencia_ms: null,
    audio_fin_por_tope: null, // vacío en V, como las demás columnas de audio
    t_opciones_insercion: null,
    t_opciones: null,
    t_toque: null,
    t_retro_inicio: null,
    t_retro_fin: null,
    opcion_elegida: null,
    opcion_elegida_id: null,
    acierto: false,
    omision: false,
    toques_fuera: [],
    toques_repetidos: 0,
    perdida_foco: false,
    cuadros_perdidos: 0,
    cuadros_total: 0,
    interrumpido: false,
    fallo_tecnico: false,
    decodificacion_ok: null, // vacío si la pantalla no tiene imágenes que decodificar
  };
  let state = null;
  let answer = null; // solo existe mientras se espera la respuesta
  let resp = null; // { t, pos } del toque que cuenta como respuesta
  let audio = null;
  let stop;
  const stopped = new Promise((resolve) => (stop = resolve));
  const guard = (p) => Promise.race([p, stopped]);
  const enter = (s) => {
    state = s;
    onState(s);
  };
  const setResponse = () => {
    r.t_toque = resp.t;
    r.opcion_elegida = resp.pos;
    r.opcion_elegida_id = opciones[resp.pos - 1]?.id ?? null;
    r.acierto = resp.pos === posCorrecta;
  };

  // Consigna AV. Si el audio no arranca o falla, el ensayo sigue, pero queda marcado
  // como fallo técnico (peso_calidad = 0).
  async function playPrompt() {
    let a;
    try {
      a = await guard(env.audio.play(consigna.audio, consigna.texto));
    } catch {
      a = null;
    }
    if (a === STOP) return STOP;
    if (!a) {
      r.audio_fuente = 'ninguna';
      r.fallo_tecnico = true;
      return;
    }
    audio = a;
    r.audio_fin_por_tope = false;
    r.t_audio_inicio = a.tInicio;
    r.audio_fuente = a.fuente;
    r.audio_latencia_ms = a.latenciaMs ?? null;
    const fin = await guard(Promise.race([a.fin.catch(() => FAIL), env.sleep(AUDIO_CAP_MS).then(() => CAP)]));
    if (fin === STOP) return STOP;
    // Sin evento de fin no se inventa la hora: t_audio_fin queda vacío.
    if (fin === CAP) r.audio_fin_por_tope = true;
    else if (fin === FAIL) r.fallo_tecnico = true;
    else r.t_audio_fin = fin;
  }

  async function body() {
    enter('intervalo');
    view.clear();
    if ((await guard(env.sleep(ficha.intervaloMs))) === STOP) return;

    enter('consigna');
    view.showPrompt(consigna);
    const tc = await guard(env.nextPaint());
    if (tc === STOP) return;
    r.t_consigna_inicio = tc;
    // Mientras dura la consigna se arman y decodifican las opciones, para que aparezcan
    // completas en el cuadro en que se insertan.
    const decoded = view.prepareOptions?.(opciones, disposicion).then(() => true, () => false);
    if (modalidad === 'AV' && (await playPrompt()) === STOP) return;
    if (modalidad === 'V' || r.fallo_tecnico) {
      // En V, y si el audio falló, la consigna dura al menos consignaVMs.
      const rest = Math.max(0, tc + ficha.consignaVMs - env.now());
      if ((await guard(env.sleep(rest))) === STOP) return;
    }
    if (decoded) {
      const ok = await guard(Promise.race([decoded, env.sleep(DECODE_CAP_MS).then(() => false)]));
      if (ok === STOP) return;
      r.decodificacion_ok = ok;
    }
    r.t_consigna_fin = env.now();

    enter('opciones');
    const answered = new Promise((resolve) => (answer = resolve));
    view.showOptions(opciones, disposicion);
    r.t_opciones_insercion = env.now();
    const to = await guard(env.nextPaint());
    if (to === STOP) return;
    r.t_opciones = to;
    // El límite cuenta desde la aparición de las opciones, no desde la consigna.
    const limit = env.sleep(Math.max(0, to + ficha.limiteRespuestaMs - env.now()));
    const got = await guard(Promise.race([answered, limit]));
    answer = null;
    if (got === STOP) return;

    enter('respuesta');
    if (resp) setResponse();
    else r.omision = true;

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

  // Un toque fuera de las opciones nunca anula una respuesta: solo se registra.
  // Sobre las opciones, el primer toque es la respuesta; otro toque sobre una opción a
  // menos de 100 ms de ella se cuenta como repetido. Si dos dedos tocan a la vez
  // opciones distintas, cuenta el de event.timeStamp más temprano.
  function pointer({ t, x = null, y = null, pos = null }) {
    if (!state || state === 'cierre' || r.interrumpido) return;
    if (pos === null) {
      r.toques_fuera.push({ t, x, y });
    } else if (answer) {
      resp = { t, pos };
      answer();
      answer = null;
    } else if (resp && Math.abs(t - resp.t) < REPEAT_MS) {
      r.toques_repetidos++;
      if (t < resp.t) {
        resp = { t, pos };
        if (r.t_toque !== null) setResponse();
      }
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
 * trials: [{ codigo, consigna, opciones: [{ id, correcta, ... }], anuncio? }]
 *   anuncio: antes de ese ensayo se muestra una pantalla breve (ficha.anuncioMs), por
 *   ejemplo el nuevo símbolo cuando cambia la regla. No produce registro.
 * base: campos de la sesión (sesion_id, bloque, codigo_nino, dispositivo, banda, version_app,
 *   modo_fase, tema_imagenes y, cuando se haya medido la tableta, latencia_dispositivo_ms).
 * onPause(): lo llama después de un ensayo pausado; devuelve 'continuar' o 'terminar'.
 * onTrial(trial, i): avisa qué ensayo empieza (el modo experto muestra su código).
 * En AV, si el dispositivo no tiene audio, el bloque no empieza (done falla con NO_AUDIO_MSG).
 */
export function startBlock({ ficha, modalidad, trials, base, env, view, log, rand, onPause = async () => 'continuar', onState, onTrial = () => {} }) {
  let current = null;
  let reason = null;
  const banda = ficha.bandas.find((b) => b.id === base.banda);
  // Sin latencia medida del dispositivo, tr_corregido_ms queda vacío.
  const latencia = base.latencia_dispositivo_ms ?? null;

  // Atiende una pausa pedida durante el ensayo o entre ensayos. true si hay que terminar el bloque.
  async function paused() {
    const pedida = reason === 'pausa';
    reason = null;
    return pedida && (await onPause()) === 'terminar';
  }

  const done = (async () => {
    const keys = trials.map((t) => t.consigna?.audio).filter(Boolean);
    if (modalidad === 'AV' && !(await env.audio?.available?.(keys))) throw new Error(NO_AUDIO_MSG);
    const rows = [];
    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];
      if (t.anuncio) {
        view.showAnnouncement(t.anuncio);
        await env.sleep(ficha.anuncioMs);
      }
      if (await paused()) break;
      const opciones = ficha.barajarOpciones === false ? t.opciones : shuffle(t.opciones, rand);
      const posCorrecta = opciones.findIndex((o) => o.correcta) + 1;
      const disposicion = banda?.disposicion ?? `1x${opciones.length}`;
      onTrial(t, i);
      current = createTrial({ ficha, modalidad, consigna: t.consigna, opciones, posCorrecta, disposicion, env, view, onState });
      const measured = await current.run();
      rows.push(
        log.add({
          ...base,
          actividad: ficha.id,
          version_ficha: ficha.version,
          version_parametros: VERSION_PARAMETROS,
          modalidad,
          ensayo: i + 1,
          item: t.codigo,
          n_opciones: opciones.length,
          disposicion,
          pos_correcta: posCorrecta,
          pos_distractores: opciones.flatMap((o, k) => (o.correcta ? [] : [{ id: o.id, pos: k + 1 }])),
          ...measured,
          tr_corregido_ms: measured.tr_bruto_ms !== null && latencia !== null ? measured.tr_bruto_ms - latencia : null,
        }),
      );
      // El ensayo pausado no se repite: al continuar sigue el siguiente.
      if (await paused()) break;
    }
    current = null;
    // Al cerrar el bloque se marca fuera_de_tarea con la mediana de toda la sesión; las filas
    // de los bloques anteriores se recalculan con ella.
    log.edit((all) => {
      const sesion = all.filter((r) => r.sesion_id === (base.sesion_id ?? null));
      fueraDeTarea(sesion).forEach((v, k) => (sesion[k].fuera_de_tarea = v));
    });
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
