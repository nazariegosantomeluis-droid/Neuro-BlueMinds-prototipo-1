// Señales de alerta temprana (H4.4; RF-11; Modelo 10.1 y 13.7; INV-9): calculadas y guardadas,
// nunca mostradas ni usadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { residuos, seriesEnVentana, kendallContraTiempo, calibrar, alertaDeActividad, alertaDeSesion } from '../src/alerta.js';
import { PARAMETROS } from '../src/indicadores/parametros.js';
import { fila } from '../tools/filas-prueba.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('τ de Kendall contra el tiempo y series en ventana (a mano)', () => {
  assert.equal(kendallContraTiempo([1, 2, 3, 4]), 1);
  assert.equal(kendallContraTiempo([4, 3, 2, 1]), -1);
  // [1, 3, 2]: pares (1,3) +, (1,2) +, (3,2) − → (2 − 1)/3.
  assert.equal(kendallContraTiempo([1, 3, 2]), 1 / 3);
  assert.equal(kendallContraTiempo([null, 1, 2]), 1, 'los nulos se omiten');
  // x = 1, 2, 3, 4 con W = 3: ventanas [1, 2, 3] y [2, 3, 4]; varianza 1 en ambas; ρ1 = corr([2, 3], [1, 2]) = 1.
  const { rho, v } = seriesEnVentana([1, 2, 3, 4], 3);
  assert.deepEqual(v, [1, 1]);
  assert.deepEqual(rho, [1, 1]);
});

test('residuos: ln(TR) menos su media, solo con ensayos válidos para latencia', () => {
  const rows = [fila(1, { tr_bruto_ms: 100 }), fila(2, { tr_bruto_ms: 1000 }), fila(3, { omision: true, tr_bruto_ms: null }), fila(4, { anticipatoria: true, tr_bruto_ms: 90 })];
  const x = residuos(rows);
  assert.equal(x.length, 2);
  assert.ok(Math.abs(x[0] + Math.log(10) / 2) < 1e-12 && Math.abs(x[1] - Math.log(10) / 2) < 1e-12);
});

test('umbrales calibrados con series simuladas sin transición: con semilla fija, reproducibles', () => {
  const a = calibrar(40);
  const b = calibrar(40);
  assert.deepEqual(a, b);
  assert.ok(a.c_rho > 0 && a.c_rho < 1 && a.c_v > 0 && a.c_v < 1);
  assert.equal(PARAMETROS.alertaTemprana.ventana, 10);
  assert.equal(PARAMETROS.alertaTemprana.alfa, 0.05);
});

test('la señal aparece cuando la autocorrelación y la varianza suben, y casi nunca sin transición', () => {
  // Serie con autocorrelación y varianza crecientes: x_k = φ_k x_{k−1} + σ_k ε_k.
  let s = 7;
  const u = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const z = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
  const conTransicion = (n) => {
    let x = 0;
    return Array.from({ length: n }, (_, k) => (x = (0.95 * k) / n * x + (0.2 + (2 * k) / n) * z()));
  };
  const comoFilas = (xs) => xs.map((x, i) => fila(i + 1, { tr_bruto_ms: Math.round(800 * Math.exp(x / 4)) }));
  // Con 60 ensayos la señal es poco sensible (Modelo 10.1: ventanas cortas, estimaciones
  // inestables); lo que se prueba es que aparece bastante más a menudo con transición que sin ella.
  let conSenal = 0;
  for (let r = 0; r < 200; r++) if (alertaDeActividad(comoFilas(conTransicion(60))).senal) conSenal++;
  let falsas = 0;
  for (let r = 0; r < 200; r++) if (alertaDeActividad(comoFilas(Array.from({ length: 60 }, z))).senal) falsas++;
  assert.ok(falsas / 200 <= 0.05, `sin transición: ${falsas} de 200`);
  assert.ok(conSenal >= 4 * Math.max(falsas, 5), `con transición: ${conSenal} de 200; sin transición: ${falsas}`);
  // Con pocos ensayos no se calcula.
  assert.equal(alertaDeActividad(comoFilas([0.1, 0.2, 0.3])).senal, null);
  const sesion = alertaDeSesion([...comoFilas(Array.from({ length: 30 }, z)), ...comoFilas(Array.from({ length: 30 }, z)).map((r) => ({ ...r, actividad: 'ACT-07' }))]);
  assert.deepEqual(sesion.map((x) => [x.actividad, x.solo_observacion]), [['ACT-02', true], ['ACT-07', true]]);
});

test('ninguna salida depende de ellas: solo app.js las escribe en el registro, y nada más las lee', () => {
  const src = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? src(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : []));
  const sinComentarios = (f) => leer(f).replace(/\/\/.*$/gm, '');
  const importan = src('src').filter((f) => /from '\.{1,2}\/(?:[\w-]+\/)*alerta\.js'/.test(sinComentarios(f)));
  assert.deepEqual(importan, ['src/app.js']);
  // Fuera de alerta.js, solo app.js (que la escribe) y la lista de columnas del registro la nombran.
  const leen = src('src').filter((f) => f !== 'src/alerta.js' && /alerta_temprana|alertaDe/.test(sinComentarios(f)));
  assert.deepEqual(leen, ['src/app.js', 'src/engine/logger.js']);
  assert.doesNotMatch(sinComentarios('src/engine/logger.js').replace(/'alerta_temprana'/, ''), /alerta/);
  const app = sinComentarios('src/app.js');
  assert.equal(app.match(/alertaDeSesion/g).length, 2, 'el import y una sola llamada');
  assert.match(app, /editSesion\(s\.id, \(r\) => \(r\.alerta_temprana = alertaDeSesion\(log\.rows\(\)\.filter\(\(x\) => x\.sesion_id === s\.id\)\)\)\);/);
  // La envolvente rechaza cualquier acción cuya evidencia traiga una señal de alerta (INV-9).
  assert.match(leer('src/envolvente.js'), /if \(dependeDeAlerta\(a\.evidencia\)\) return 'INV-9';/);
});
