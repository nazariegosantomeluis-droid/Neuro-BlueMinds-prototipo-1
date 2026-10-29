import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPaint, frameMonitor, eventTime, estimateFramePeriod } from '../src/engine/clock.js';

// requestAnimationFrame simulado: cada llamada recibe el siguiente timestamp de la lista.
function fakeRaf(timestamps) {
  const queue = [...timestamps];
  let calls = 0;
  const raf = (cb) => {
    calls++;
    const t = queue.shift();
    if (t !== undefined) queueMicrotask(() => cb(t));
    return calls;
  };
  return { raf, caf: () => {}, calls: () => calls };
}

test('la aparición es el timestamp del segundo cuadro después de insertar', async () => {
  const f = fakeRaf([100, 116.7]);
  assert.equal(await nextPaint(f.raf), 116.7);
  assert.equal(f.calls(), 2);
});

test('cuenta como perdido cada intervalo mayor a 1.5 veces el periodo', async () => {
  const f = fakeRaf([0, 16.7, 33.4, 70, 86.7, 140]);
  const m = frameMonitor(16.7, f.raf, f.caf);
  m.start();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(m.stop(), { total: 5, late: 2 });
});

test('el periodo normal es la mediana de los intervalos', async () => {
  const f = fakeRaf([0, 8.3, 16.6, 50, 58.3, 66.6]);
  assert.equal(Math.round(await estimateFramePeriod(5, f.raf) * 10) / 10, 8.3);
});

test('usa event.timeStamp, salvo que venga en tiempo de época', () => {
  const clock = () => 5000;
  assert.equal(eventTime({ timeStamp: 4990.25 }, clock), 4990.25);
  assert.equal(eventTime({ timeStamp: 1761750000000 }, clock), 5000);
  assert.equal(eventTime({ timeStamp: 0 }, clock), 5000);
});
