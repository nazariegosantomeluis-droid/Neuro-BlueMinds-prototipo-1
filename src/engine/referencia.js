// Referencia motora (RF-03, Arquitectura 4.6; Modelo matemático 3.1). Al inicio de cada sesión un
// objetivo aparece de 6 a 8 veces, en posiciones al azar y con esperas de 800 a 1,500 ms, y el niño
// lo toca. La mediana de sus tiempos estima el tiempo de detección y ejecución motora de ese día.
// Se reporta junto a la latencia de las actividades y no se resta (Modelo 3.1).
//
// Es una lógica pura: el reloj, el cuadro de pintado y la vista llegan de fuera, igual que en el
// ensayo (trial.js), así que se prueba con tiempo simulado.
import { median, ANTICIPATORIA_MS } from './quality.js';

export const REF_MIN_APARICIONES = 6;
export const REF_MAX_APARICIONES = 8;
export const REF_ESPERA_MIN_MS = 800;
export const REF_ESPERA_MAX_MS = 1500;
// Cuánto permanece el objetivo si el niño no lo toca. VALOR DE PLANEACIÓN, POR CONFIRMAR CON LOS
// CLÍNICOS: Arquitectura 4.6 no lo fija; se tomó el mínimo del límite de respuesta (4.2).
export const REF_PERMANENCIA_MS = 5000;
// Con menos toques válidos la referencia queda «no disponible» y la sesión continúa (Arquitectura 4.6).
export const REF_MIN_VALIDOS = 5;
// Un toque a menos de este tiempo de la aparición es anticipatorio (mismo umbral que Modelo 3.3):
// se registra, pero no entra en la mediana ni en el mínimo de toques.
export const REF_ANTICIPATORIA_MS = ANTICIPATORIA_MS;

// El objetivo aparece en el centro de una de estas celdas, numeradas por filas, de izquierda a
// derecha y de arriba abajo (como las opciones de los ensayos).
export const REF_COLUMNAS = 4;
export const REF_FILAS = 3;

const STOP = Symbol('interrumpida');

// rand: generador con semilla (selector.js). La misma semilla da el mismo plan.
export function planReferencia(rand, { permanenciaMs = REF_PERMANENCIA_MS } = {}) {
  const n = REF_MIN_APARICIONES + Math.floor(rand() * (REF_MAX_APARICIONES - REF_MIN_APARICIONES + 1));
  const celdas = REF_COLUMNAS * REF_FILAS;
  const apariciones = [];
  let anterior = null;
  for (let i = 0; i < n; i++) {
    let pos;
    do pos = 1 + Math.floor(rand() * celdas);
    while (pos === anterior); // nunca dos veces seguidas en la misma celda
    anterior = pos;
    apariciones.push({ pos, espera_ms: REF_ESPERA_MIN_MS + Math.round(rand() * (REF_ESPERA_MAX_MS - REF_ESPERA_MIN_MS)) });
  }
  return { apariciones, permanenciaMs };
}

// apariciones: [{ aparicion, pos, tr_ms, x, y, anticipatorio, omision, interrumpida, fuera }]
// Entran en la mediana y en el mínimo solo los toques válidos: con tiempo, sin anticipar y sin pausa.
export function resumirReferencia(apariciones) {
  const validos = apariciones.filter((a) => a.tr_ms !== null && !a.anticipatorio && !a.interrumpida);
  return {
    referencia_motora_ms: validos.length >= REF_MIN_VALIDOS ? median(validos.map((a) => a.tr_ms)) : null,
    referencia_motora_n: validos.length,
    referencia_motora_anticipados: apariciones.filter((a) => a.anticipatorio).length,
    referencia_motora_toques: apariciones,
  };
}

/**
 * Ejecuta la referencia motora.
 * plan: planReferencia(). env: now, sleep y nextPaint (clock.js; en las pruebas, simEnv).
 * view: clear() y showTarget(pos).
 * onPause(aparicion): lo llama después de una aparición pausada (que queda como interrumpida y no se
 *   repite); devuelve 'continuar' o 'terminar'.
 * La vista llama a pointer({ t, x, y, pos }) en cada pointerdown: pos es la celda del objetivo
 * si el toque cayó sobre él, o null si cayó fuera.
 * done termina con el resumen (resumirReferencia) y terminada = true si el terapeuta la cortó.
 *
 * Tiempos: tr_ms va del cuadro en que aparece el objetivo al toque, igual que el tiempo de
 * respuesta de los ensayos. Es bruto: no se le resta la latencia del dispositivo.
 * Los toques fuera del objetivo se guardan en fuera con su tiempo respecto de la aparición
 * (o, si el objetivo aún no aparecía, respecto del inicio de la espera, con antes = true); no cuentan.
 */
export function iniciarReferencia({ plan, env, view, onPause = async () => 'continuar' }) {
  let cur = null;

  const done = (async () => {
    const apariciones = [];
    let terminada = false;
    for (let i = 0; i < plan.apariciones.length && !terminada; i++) {
      const { pos, espera_ms } = plan.apariciones[i];
      const reg = { aparicion: i + 1, pos, tr_ms: null, x: null, y: null, anticipatorio: false, omision: false, interrumpida: false, fuera: [] };
      apariciones.push(reg);
      let stop;
      const stopped = new Promise((resolve) => (stop = resolve));
      cur = { reg, stop, t0: env.now(), tp: null, answer: null, touch: null };
      const guard = (p) => Promise.race([p, stopped]);

      const resultado = await (async () => {
        view.clear();
        if ((await guard(env.sleep(espera_ms))) === STOP) return STOP;
        const answered = new Promise((resolve) => (cur.answer = resolve));
        view.showTarget(pos);
        const tp = await guard(env.nextPaint());
        if (tp === STOP) return STOP;
        cur.tp = tp;
        // La permanencia cuenta desde la aparición del objetivo en pantalla.
        const limite = env.sleep(Math.max(0, tp + plan.permanenciaMs - env.now()));
        return guard(Promise.race([answered, limite]));
      })();

      cur.answer = null;
      if (resultado === STOP) {
        reg.interrumpida = true;
        view.clear();
        terminada = (await onPause(reg.aparicion)) === 'terminar';
      } else if (cur.touch) {
        const { t, x, y } = cur.touch;
        reg.tr_ms = t - cur.tp;
        reg.x = x;
        reg.y = y;
        reg.anticipatorio = reg.tr_ms < REF_ANTICIPATORIA_MS;
        view.clear(); // el objetivo desaparece al tocarlo, sin sonido ni premio
      } else {
        reg.omision = true;
        view.clear();
      }
    }
    cur = null;
    return { ...resumirReferencia(apariciones), terminada };
  })();

  return {
    done,
    pointer({ t, x = null, y = null, pos = null }) {
      if (!cur) return;
      if (pos !== null && cur.answer) {
        // Solo cuenta el primer toque sobre el objetivo. Si llega antes de que se pinte, su tiempo
        // queda negativo y se marca como anticipatorio.
        cur.touch = { t, x, y };
        cur.answer(true);
        cur.answer = null;
      } else if (cur.touch === null) {
        // Fuera del objetivo, o antes de que aparezca: se registra y no cuenta.
        cur.reg.fuera.push({ t_ms: t - (cur.tp ?? cur.t0), x, y, antes: cur.tp === null });
      }
    },
    pause() {
      cur?.stop(STOP);
    },
  };
}
