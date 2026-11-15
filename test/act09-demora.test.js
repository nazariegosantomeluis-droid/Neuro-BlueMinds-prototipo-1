// ACT-09 «Recuerda y encuentra»: el motor quita la muestra con su reloj, alineado al cuadro, y
// registra en t_muestra_fin el cuadro en que ya no se ve (tanda 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrial } from '../src/engine/trial.js';
import { frameAt } from '../src/engine/clock.js';
import { fichaDeBloque } from '../src/activities/demora.js';
import { simEnv } from '../tools/sim-env.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-09.json'));
const opciones = [
  { id: 'perro-1', correcta: true },
  { id: 'gato-1', correcta: false },
];

function ensayo(banda, { interrumpirEn = null } = {}) {
  const env = simEnv();
  const llamadas = [];
  const view = {
    clear: () => llamadas.push(['clear', env.now()]),
    showPrompt: () => llamadas.push(['muestra', env.now()]),
    hidePrompt: () => llamadas.push(['quitar', env.now()]),
    showOptions: () => {
      llamadas.push(['opciones', env.now()]);
      env.at(16 + 900, () => trial.pointer({ t: env.now(), pos: 1 }));
    },
    showFeedback: () => {},
  };
  const trial = createTrial({ ficha: fichaDeBloque(ficha, banda), modalidad: 'V', consigna: { src: 'perro-1' }, opciones, posCorrecta: 1, disposicion: '1x2', env, view });
  if (interrumpirEn !== null) env.at(interrumpirEn, () => trial.interrupt());
  return env.run(trial.run()).then((r) => ({ r, llamadas }));
}

test('la muestra se quita a muestraMs de su aparición y queda en t_muestra_fin, en todas las bandas', async () => {
  for (const banda of ficha.bandas) {
    const { r, llamadas } = await ensayo(banda);
    assert.equal(r.t_muestra_fin - r.t_consigna_inicio, ficha.muestraMs, banda.id);
    assert.equal(llamadas.filter((l) => l[0] === 'quitar').length, 1, `${banda.id}: se quita una sola vez`);
    const orden = llamadas.map((l) => l[0]).filter((x) => x !== 'clear');
    assert.deepEqual(orden, ['muestra', 'quitar', 'opciones'], banda.id);
    // La pausa en blanco va de t_muestra_fin a t_opciones: al menos la demora de la banda.
    const pausa = r.t_opciones - r.t_muestra_fin;
    assert.ok(pausa >= banda.demoraMs && pausa <= banda.demoraMs + 2 * 16, `${banda.id}: pausa de ${pausa} ms`);
    assert.equal(r.acierto, true);
    assert.equal(r.tr_bruto_ms, 900);
  }
});

test('si se pausa mientras se ve la muestra, t_muestra_fin queda vacío y el ensayo, interrumpido', async () => {
  const { r } = await ensayo(ficha.bandas[1], { interrumpirEn: ficha.intervaloMs + 500 });
  assert.equal(r.interrumpido, true);
  assert.equal(r.t_muestra_fin, null);
});

test('frameAt hace el cambio en el cuadro que llega a la hora pedida y da el cuadro en que ya se ve', async () => {
  for (const periodo of [1000 / 60, 1000 / 120, 1000 / 30]) {
    // requestAnimationFrame simulado: un cuadro cada periodo, desde 3 ms.
    let t = 3;
    const pendientes = [];
    const raf = (fn) => pendientes.push(fn);
    let cambio = null;
    const listo = frameAt(2000, () => (cambio = t), periodo, raf);
    let fin = null;
    listo.then((ts) => (fin = ts));
    while (fin === null && t < 3000) {
      const fns = pendientes.splice(0);
      for (const fn of fns) fn(t);
      await Promise.resolve();
      t += periodo;
    }
    assert.ok(cambio !== null, `${periodo}: hubo cambio`);
    assert.ok(Math.abs(fin - 2000) <= periodo / 2 + 1e-9, `${periodo}: se ve en ${fin}`);
    assert.ok(Math.abs(fin - cambio - periodo) < 1e-9, `${periodo}: se ve en el cuadro siguiente al cambio`);
  }
});

test('la pantalla ya no usa setTimeout: el momento lo decide el motor', () => {
  const fuente = leer('src/activities/demora.js');
  assert.doesNotMatch(fuente, /setTimeout|setInterval/);
  assert.match(fuente, /hidePrompt: ocultar/);
  assert.match(leer('src/engine/trial.js'), /env\.frameAt\(tc \+ ficha\.muestraMs/);
  assert.match(leer('src/engine/clock.js'), /frameAt: \(target, change\) => frameAt\(target, change, framePeriod\)/);
  // Solo tiene modalidad visual: en AV el motor no quitaría la muestra.
  assert.deepEqual(ficha.modalidades, ['V']);
});

test('el README documenta la columna t_muestra_fin', () => {
  const readme = leer('README.md');
  assert.match(readme, /`t_muestra_fin`/);
});
