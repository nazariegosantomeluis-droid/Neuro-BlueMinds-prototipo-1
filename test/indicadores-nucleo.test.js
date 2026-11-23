// Indicadores A1 a A8 y A10 (H3.2 y H3.3). Sesiones sintéticas con resultados calculados a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { a1, a2, a3, a4, a5, a6, a7, a8, a10, indicadoresDeSesion, calidadDeSesion, utilizable, validoLatencia } from '../src/indicadores/nucleo.js';
import { PARAMETROS, VERSIONES } from '../src/indicadores/parametros.js';
import { fila, filas, omision, errorCon } from '../tools/filas-prueba.mjs';

const cerca = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} frente a ${b}`);

test('cada indicador da valor, intervalo, n, disponible, motivo y versión', () => {
  const r = indicadoresDeSesion(filas(30));
  assert.deepEqual(r.map((x) => x.id), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A10']);
  for (const x of r) {
    for (const k of ['valor', 'ic', 'n', 'disponible', 'motivo', 'version', 'nombre']) assert.ok(k in x, `${x.id}.${k}`);
    assert.equal(x.version, VERSIONES[x.id]);
    assert.equal(x.disponible, x.motivo === null);
  }
});

test('ensayos que entran: sin interrupción técnica (Modelo 3.3) y sin sondas', () => {
  assert.ok(utilizable(fila(1)));
  for (const c of [{ interrumpido: true }, { perdida_foco: true }, { fallo_tecnico: true }, { cuadros_perdidos: 1 }, { sonda: true }]) assert.ok(!utilizable(fila(1, c)), JSON.stringify(c));
  assert.ok(!validoLatencia(fila(1, { anticipatoria: true })));
  assert.ok(!validoLatencia(fila(1, { fuera_de_tarea: true })));
  assert.ok(validoLatencia(fila(1, { fuera_de_tarea: null })), 'sin marca (menos de 10 ensayos) no excluye');
  assert.ok(!validoLatencia(fila(1, omision)));
  // El tiempo corregido manda sobre el bruto.
  cerca(a2(filas(21, (k) => ({ tr_bruto_ms: 900, tr_corregido_ms: 400 + 10 * (k - 1) })), 1).valor, 500, 1e-9);
});

test('A1: 24 de 30 con 3 opciones da PA = 0.7; el intervalo es el de Wilson transformado', () => {
  // p = 0.8; PA = (0.8 − 1/3)/(1 − 1/3) = 0.7. Wilson de 24/30 (z = 1.959964), calculado a mano:
  // [0.626943, 0.904949]; transformado: [(0.626943 − 1/3)/(2/3), (0.904949 − 1/3)/(2/3)] = [0.440415, 0.857423].
  const rows = filas(30, (k) => (k > 24 ? errorCon() : {}));
  const r = a1(rows, 1);
  cerca(r.valor, 0.7, 1e-12);
  cerca(r.ic[0], 0.440415, 1e-6);
  cerca(r.ic[1], 0.857423, 1e-6);
  assert.equal(r.n, 30);
  // Una omisión cuenta como no acierto; un ensayo interrumpido no cuenta.
  const conOmision = [...rows.slice(0, 29), fila(30, omision), fila(31, { interrumpido: true })];
  assert.equal(a1(conOmision, 1).n, 30);
  // Con 2 y 4 opciones mezcladas, el azar es la media de 1/G: (1/2 + 1/4)/2 = 0.375.
  const mixto = filas(20, (k) => ({ n_opciones: k % 2 ? 2 : 4 }));
  assert.equal(a1(mixto, 1).azar, 0.375);
  assert.equal(a1(mixto, 1).valor, 1);
  // Menos de 20 ensayos: no disponible, con motivo.
  const pocos = a1(filas(19), 1);
  assert.equal(pocos.disponible, false);
  assert.equal(pocos.valor, null);
  assert.equal(pocos.motivo, '19 ensayos; el mínimo es 20');
});

test('A2: LPR = exp(mediana ln RT); intervalo por estadísticos de orden', () => {
  // RT = 400, 410, …, 600 ms (21 ensayos): mediana 500. n = 21: P(B ≤ 5) = 0.0133 ≤ 0.025 y
  // P(B ≤ 6) = 0.0392, así que los rangos son 6 y 16: 450 y 550 ms.
  const r = a2(filas(21, (k) => ({ tr_bruto_ms: 400 + 10 * (k - 1) })), 1);
  cerca(r.valor, 500, 1e-9);
  cerca(r.ic[0], 450, 1e-9);
  cerca(r.ic[1], 550, 1e-9);
  // Con número par, la mediana de los logaritmos es la media geométrica de los dos centrales.
  const par = a2(filas(20, (k) => ({ tr_bruto_ms: k <= 10 ? 400 : 900 })), 1);
  cerca(par.valor, Math.sqrt(400 * 900), 1e-9);
  // Anticipatorias, omisiones y fuera de tarea no entran: quedan 19 válidos, menos de 20.
  const rows = filas(22, (k) => (k === 1 ? { anticipatoria: true, tr_bruto_ms: 100 } : k === 2 ? omision : k === 3 ? { fuera_de_tarea: true } : {}));
  assert.equal(a2(rows, 1).n, 19);
  assert.equal(a2(rows, 1).disponible, false);
});

test('A3: MAD escalada de ln RT, con intervalo por bootstrap de semilla fija', () => {
  // RT = 1000·e^(0.1k), k = −15..15 (31 ensayos): ln RT − mediana = 0.1k; las |0.1k| ordenadas son
  // 0, 0.1, 0.1, …, 1.5, 1.5 y su mediana (la 16.ª) es 0.8; MAD = 1.4826 · 0.8 = 1.18608.
  const rows = filas(31, (k) => ({ tr_bruto_ms: 1000 * Math.exp(0.1 * (k - 16)) }));
  const r = a3(rows, 1);
  cerca(r.valor, 1.4826 * 0.8, 1e-9);
  assert.ok(r.ic[0] <= r.valor && r.valor <= r.ic[1]);
  assert.deepEqual(a3(rows, 1).ic, r.ic, 'misma sesión, mismo intervalo');
  assert.equal(PARAMETROS.bootstrap.remuestras, 2000);
  assert.equal(a3(rows.slice(0, 29), 1).motivo, '29 ensayos válidos; el mínimo es 30');
});

test('A4 y A5: proporciones de anticipatorias y omisiones con Wilson', () => {
  // 25 ensayos: 2 anticipatorias y 3 omisiones. A4 = 2/25 = 0.08, Wilson [0.022220, 0.249661];
  // A5 = 3/25 = 0.12, Wilson [0.041668, 0.299558] (fórmula de Wilson a mano, z = 1.959964).
  const rows = filas(25, (k) => (k <= 2 ? { anticipatoria: true, tr_bruto_ms: 90 } : k <= 5 ? omision : {}));
  const r4 = a4(rows, 1);
  const r5 = a5(rows, 1);
  assert.equal(r4.valor, 0.08);
  cerca(r4.ic[0], 0.02222, 1e-5);
  cerca(r4.ic[1], 0.249661, 1e-5);
  assert.equal(r5.valor, 0.12);
  cerca(r5.ic[0], 0.041668, 1e-5);
  cerca(r5.ic[1], 0.299558, 1e-5);
});

test('A6: pendiente de Theil-Sen por minuto, con 30 ensayos en 5 minutos y banda constante', () => {
  // ln RT = ln 800 + 0.02·t, t en minutos: la pendiente es exactamente 0.02 por minuto.
  const rows = filas(31, (k) => {
    const t = (k - 1) * (10 / 30); // 0 a 10 minutos
    return { t_opciones: 5000 + t * 60000, tr_bruto_ms: 800 * Math.exp(0.02 * t) };
  });
  const r = a6(rows, 1);
  cerca(r.valor, 0.02, 1e-12);
  cerca(r.ic[0], 0.02, 1e-12);
  cerca(r.ic[1], 0.02, 1e-12);
  assert.equal(r.unidad, 'ln(ms) por minuto');
  // Los mismos 31 ensayos en 4 minutos no bastan.
  const corta = a6(rows.map((x, i) => ({ ...x, t_opciones: 5000 + i * 8000 })), 1);
  assert.equal(corta.disponible, false);
  assert.match(corta.motivo, /abarcan 4\.0 min; el mínimo es 5/);
  // Con cambio de banda no se calcula.
  const banda = a6(rows.map((x, i) => ({ ...x, banda: i < 15 ? 'B2' : 'B3' })), 1);
  assert.match(banda.motivo, /la banda cambió/);
});

test('A7 y A8: después de un error, el siguiente acierto tarda 300 ms más y siempre es acierto', () => {
  // Bloque con 12 repeticiones de error, acierto (900 ms), acierto (600 ms). Aciertos tras error:
  // 12 de 900 ms; aciertos tras acierto: 12 de 600 ms. PES = 900 − 600 = 300 ms; con todos los
  // valores iguales, el bootstrap da [300, 300]. IRPE = 12/12 = 1, Wilson [0.757506, 1].
  const rows = filas(36, (k) => (k % 3 === 1 ? errorCon() : { tr_bruto_ms: k % 3 === 2 ? 900 : 600 }));
  const r7 = a7(rows, 1);
  assert.equal(r7.valor, 300);
  assert.deepEqual(r7.ic, [300, 300]);
  assert.deepEqual([r7.tras_error, r7.tras_acierto], [12, 12]);
  const r8 = a8(rows, 1);
  assert.equal(r8.valor, 1);
  assert.equal(r8.n, 12);
  cerca(r8.ic[0], 0.757506, 1e-6);
  // Un par cruza bloques o tiene un ensayo interrumpido: no cuenta.
  const cortados = rows.map((x) => (x.ensayo === 4 ? { ...x, interrumpido: true } : x));
  assert.equal(a8(cortados, 1).n, 11);
  // Una omisión no es un error.
  assert.equal(a8(filas(30, (k) => (k % 2 ? omision : {})), 1).n, 0);
});

test('A10: errores perseverativos contra la presentación anterior del mismo ítem, aunque sea de otra sesión', () => {
  // Sesión previa: 10 ítems con error eligiendo «o2». Hoy: 4 repiten «o2» (perseverativos), 3 eligen
  // otra opción incorrecta, 3 aciertan. TEP = 4/10 = 0.4; Wilson(4, 10) = [0.168180, 0.687326].
  const previas = filas(10, (k) => ({ sesion_id: 'S-antes', item: `X${k}`, ...errorCon('o2') }));
  const hoy = filas(10, (k) => ({ item: `X${k}`, ...(k <= 4 ? errorCon('o2') : k <= 7 ? errorCon('o3') : {}) }));
  const r = a10(hoy, 1, { previas });
  assert.equal(r.valor, 0.4);
  assert.equal(r.n, 10);
  cerca(r.ic[0], 0.16818, 1e-5);
  cerca(r.ic[1], 0.687326, 1e-5);
  // Sin historia no hay oportunidades.
  assert.equal(a10(hoy, 1).n, 0);
  // Una sonda (sin retroalimentación correctiva) no abre oportunidades.
  const conSonda = previas.map((x) => ({ ...x, sonda: true }));
  assert.equal(a10(hoy, 1, { previas: conSonda }).n, 0);
});

test('calidad de la sesión menor de 0.80: ningún indicador se muestra', () => {
  // Media de peso_calidad: 20 ensayos con 1 y 10 con 0.4 → (20 + 4)/30 = 0.8 (alcanza);
  // con 0.3 en vez de 0.4 → 23/30 = 0.7667 (no alcanza).
  const alcanza = filas(30, (k) => ({ peso_calidad: k <= 20 ? 1 : 0.4 }));
  cerca(calidadDeSesion(alcanza), 0.8, 1e-12);
  assert.ok(a1(alcanza, calidadDeSesion(alcanza)).disponible, 'una calidad de 0.80 con error de redondeo cuenta como 0.80');
  const baja = filas(30, (k) => ({ peso_calidad: k <= 20 ? 1 : 0.3 }));
  const r = indicadoresDeSesion(baja);
  assert.ok(r.every((x) => !x.disponible && /calidad de la sesión 0\.77, menor de 0\.80/.test(x.motivo)));
  // Los ensayos interrumpidos por la pausa no cuentan en la calidad.
  assert.equal(calidadDeSesion([...alcanza, fila(31, { interrumpido: true, peso_calidad: 0 })]), calidadDeSesion(alcanza));
});
