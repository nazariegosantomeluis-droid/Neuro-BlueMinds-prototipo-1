// Señales de alerta temprana (H4.4; RF-11; Modelo 10.1 y 13.7; INV-9): calculadas y guardadas,
// nunca mostradas ni usadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { residuos, quitarTendencia, ventanaDe, seriesEnVentana, kendallContraTiempo, calibrarPermutando, erroresSeguidos, alertaDeActividad, alertaDeSesion } from '../src/alerta.js';
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

test('R13: residuo sin la media ni la tendencia lineal, y ventana de la mitad de los ensayos (mínimo 10)', () => {
  // y = 0, 2, 1: media 1; x centrado −1, 0, 1; pendiente = Σ(x·(y − 1)) / Σx² = 1/2;
  // residuos: 0 − 1 + 0.5 = −0.5; 2 − 1 − 0 = 1; 1 − 1 − 0.5 = −0.5.
  assert.deepEqual(quitarTendencia([0, 2, 1]), [-0.5, 1, -0.5]);
  for (const r of quitarTendencia([3, 5, 7, 9])) assert.ok(Math.abs(r) < 1e-12, 'una recta exacta deja residuos nulos');
  // Con TR que crece de forma exponencial, ln TR es una recta: residuo nulo.
  const rows = [fila(1, { tr_bruto_ms: 100 }), fila(2, { tr_bruto_ms: 1000 }), fila(3, { omision: true, tr_bruto_ms: null }), fila(4, { anticipatoria: true, tr_bruto_ms: 90 }), fila(5, { tr_bruto_ms: 10000 })];
  const x = residuos(rows);
  assert.equal(x.length, 3, 'solo los ensayos válidos para latencia');
  for (const r of x) assert.ok(Math.abs(r) < 1e-12);
  assert.equal(ventanaDe(60), 30);
  assert.equal(ventanaDe(15), 10, 'mínimo 10');
  assert.equal(ventanaDe(60, 0.25), 15);
  assert.equal(PARAMETROS.alertaTemprana.fraccionVentana, 0.5);
  assert.equal(PARAMETROS.alertaTemprana.falsasAlertas, 0.05);
  assert.match(PARAMETROS.alertaTemprana.seccion, /Decisión R13/);
});

test('R13: umbrales calibrados con series permutadas, reproducibles, con 5 % o menos de falsas alertas por sesión', () => {
  const x = Array.from({ length: 40 }, (_, i) => Math.sin(i * 1.7) + ((i * 37) % 11) / 10);
  const a = calibrarPermutando(x, 20);
  assert.deepEqual(a, calibrarPermutando(x, 20), 'misma semilla, mismos umbrales');
  assert.ok(a.falsas <= 0.05);
  assert.ok(a.c_rho > -1 && a.c_rho < 1 && a.c_v > -1 && a.c_v < 1);
});

test('R13: regla simple de 3 errores seguidos (las omisiones cortan la racha)', () => {
  const f = (k, acierto, omision = false) => fila(k, { acierto, omision, tr_bruto_ms: omision ? null : 900 });
  assert.deepEqual(erroresSeguidos([f(1, false), f(2, false), f(3, true), f(4, false), f(5, false), f(6, false)]), { senal: true, ensayo: 6, bloque: 1 });
  assert.equal(erroresSeguidos([f(1, false), f(2, false), f(3, false, true), f(4, false)]).senal, false);
});

test('la señal aparece más a menudo con transición, y sin transición en cerca de 5 % de las sesiones (calibrado)', () => {
  let s = 7;
  const u = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const z = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
  // Autocorrelación y varianza crecientes: x_k = φ_k x_{k−1} + σ_k ε_k.
  const conTransicion = (n) => {
    let x = 0;
    return Array.from({ length: n }, (_, k) => (x = ((0.95 * k) / n) * x + (0.2 + (2 * k) / n) * z()));
  };
  const comoFilas = (xs) => xs.map((x, i) => fila(i + 1, { tr_bruto_ms: Math.round(800 * Math.exp(x / 4)) }));
  let conSenal = 0;
  let falsas = 0;
  for (let r = 0; r < 100; r++) if (alertaDeActividad(comoFilas(conTransicion(60))).senal) conSenal++;
  for (let r = 0; r < 100; r++) if (alertaDeActividad(comoFilas(Array.from({ length: 60 }, z))).senal) falsas++;
  assert.ok(falsas <= 8, `sin transición: ${falsas} de 100`);
  assert.ok(conSenal > 2 * Math.max(falsas, 5), `con transición: ${conSenal} de 100; sin transición: ${falsas}`);
  const una = alertaDeActividad(comoFilas(conTransicion(60)));
  assert.equal(una.ventana, 30);
  assert.deepEqual(una.sensibilidad.map((x) => [x.fraccion, x.ventana]), [[0.25, 15], [0.75, 45]]);
  assert.ok('tres_errores_seguidos' in una);
  assert.equal(alertaDeActividad(comoFilas([0.1, 0.2, 0.3])).senal, null, 'con pocos ensayos no se calcula');
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
  assert.match(app, /editSesion\(s\.id, \(r\) => \(r\.alerta_temprana = alertaDeSesion\(paraExportar\(comoSeExporta\(log\.rows\(\)\.filter\(\(x\) => x\.sesion_id === s\.id\)\), \{ sinTiempos: sinTiempos\(\) \}\)\)\)\);/);
  // La envolvente rechaza cualquier acción cuya evidencia traiga una señal de alerta (INV-9).
  assert.match(leer('src/envolvente.js'), /if \(dependeDeAlerta\(a\.evidencia\)\) return 'INV-9';/);
});
