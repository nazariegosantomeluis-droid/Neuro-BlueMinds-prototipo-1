// Entorno simulado para la máquina de estados: el reloj es virtual y solo avanza
// cuando run() dispara el siguiente temporizador. Lo usan las pruebas y el
// generador del registro de ejemplo.
export function simEnv({
  start = 0,
  paint = (t) => t + 16, // momento en que se pinta un cambio pedido en t
  audio = null,
  frames = () => ({ total: 100, late: 0 }), // recibe la duración del ensayo
  focusLost = () => false,
} = {}) {
  let t = start;
  let trialStart = start;
  const timers = [];
  const env = {
    now: () => t,
    at: (ms, fn) => timers.push({ at: t + ms, fn }),
    sleep: (ms) => new Promise((resolve) => env.at(ms, resolve)),
    nextPaint: () =>
      new Promise((resolve) => {
        const at = paint(t);
        timers.push({ at, fn: () => resolve(at) });
      }),
    frames: { start: () => (trialStart = t), stop: () => frames(t - trialStart) },
    focus: { start() {}, stop: () => focusLost() },
    audio,
    // Avanza el tiempo virtual hasta que la promesa termine.
    async run(promise) {
      let finished = false;
      promise.then(() => (finished = true), () => (finished = true));
      for (;;) {
        await new Promise((resolve) => setImmediate(resolve));
        if (finished || !timers.length) break;
        timers.sort((a, b) => a.at - b.at);
        const next = timers.shift();
        t = next.at;
        next.fn();
      }
      return promise;
    },
  };
  return env;
}
