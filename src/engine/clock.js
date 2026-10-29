// Medición del tiempo. Todo usa el mismo reloj monótono: performance.now(),
// el timestamp de requestAnimationFrame y event.timeStamp de pointerdown.
// Nunca se usa Date.now() para medir duraciones.
import { median } from './quality.js';

export const now = () => performance.now();

// Tiempo de un toque. En los navegadores actuales event.timeStamp tiene el mismo
// origen que performance.now(); si un navegador antiguo da un tiempo de época
// (o cero), se usa performance.now() en su lugar.
export function eventTime(e, clock = now) {
  const t = e.timeStamp;
  const n = clock();
  return t > 0 && t <= n + 1000 ? t : n;
}

// Momento de aparición: después de insertar en el DOM se espera un cuadro y se
// toma el timestamp del cuadro siguiente, cuando el contenido ya está en pantalla.
export function nextPaint(raf = globalThis.requestAnimationFrame) {
  return new Promise((resolve) => raf(() => raf(resolve)));
}

// Periodo normal de cuadro del dispositivo (60 Hz ≈ 16.7 ms; 120 Hz ≈ 8.3 ms),
// como la mediana de n intervalos.
export function estimateFramePeriod(n = 30, raf = globalThis.requestAnimationFrame) {
  return new Promise((resolve) => {
    const ts = [];
    const tick = (t) => {
      ts.push(t);
      if (ts.length <= n) raf(tick);
      else resolve(median(ts.slice(1).map((x, i) => x - ts[i])));
    };
    raf(tick);
  });
}

// Durante un ensayo, cuenta los intervalos entre cuadros mayores a 1.5 veces el periodo normal.
export function frameMonitor(
  period,
  raf = globalThis.requestAnimationFrame,
  caf = globalThis.cancelAnimationFrame,
) {
  let id = null;
  let last = null;
  let total = 0;
  let late = 0;
  const tick = (ts) => {
    if (last !== null) {
      total++;
      if (ts - last > 1.5 * period) late++;
    }
    last = ts;
    id = raf(tick);
  };
  return {
    start() {
      last = null;
      total = late = 0;
      id = raf(tick);
    },
    stop() {
      if (id !== null) caf(id);
      id = null;
      return { total, late };
    },
  };
}

// Marca si durante el ensayo la página quedó oculta o la ventana perdió el foco.
export function focusMonitor(win = globalThis.window, doc = globalThis.document) {
  let lost = false;
  const onBlur = () => (lost = true);
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') lost = true;
  };
  return {
    start() {
      lost = doc.visibilityState === 'hidden';
      doc.addEventListener('visibilitychange', onVisibility);
      win.addEventListener('blur', onBlur);
    },
    stop() {
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('blur', onBlur);
      return lost;
    },
  };
}

// Entorno real del navegador para la máquina de estados (en las pruebas se usa uno simulado).
export function browserEnv({ framePeriod, audio }) {
  return {
    now,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    nextPaint: () => nextPaint(),
    frames: frameMonitor(framePeriod),
    focus: focusMonitor(),
    audio,
  };
}
