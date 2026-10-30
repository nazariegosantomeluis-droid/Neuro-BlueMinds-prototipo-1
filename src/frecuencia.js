// Antes de cada bloque se mide un segundo de cuadros. Si la pantalla dibuja a menos de 50 Hz
// (por ejemplo, por el ahorro de energía), se avisa al adulto, que puede volver a medir o continuar.
import { measureFramePeriod } from './engine/clock.js';
import { PERIODO_MAX_MS } from './engine/quality.js';

// Devuelve { periodo, advertencia }: advertencia es true si el adulto continuó pese al aviso.
export async function comprobarFrecuencia(app) {
  for (;;) {
    const periodo = await measureFramePeriod(1000);
    if (periodo <= PERIODO_MAX_MS) return { periodo, advertencia: false };
    if ((await aviso(app, Math.round(1000 / periodo))) === 'continuar') return { periodo, advertencia: true };
  }
}

function aviso(app, hz) {
  app.innerHTML = `
    <div class="adulto">
      <h1>Frecuencia de la pantalla</h1>
      <div class="panel">
        <p class="mensaje" role="alert">Este dispositivo está dibujando a ${hz} Hz, quizá por el ahorro de energía. Conéctelo a la corriente o desactive el ahorro de energía para medir con precisión.</p>
        <div class="acciones">
          <button type="button" class="primario" data-r="medir">Volver a medir</button>
          <button type="button" data-r="continuar">Continuar de todos modos</button>
        </div>
        <p class="meta" role="status"></p>
      </div>
    </div>`;
  return new Promise((resolve) => {
    const botones = app.querySelectorAll('[data-r]');
    for (const b of botones) {
      b.onclick = () => {
        for (const x of botones) x.disabled = true;
        if (b.dataset.r === 'medir') app.querySelector('[role=status]').textContent = 'Midiendo…';
        resolve(b.dataset.r);
      };
    }
  });
}
