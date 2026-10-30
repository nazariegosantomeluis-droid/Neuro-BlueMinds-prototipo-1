import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fueraDeTarea, marcarFueraDeTarea, paraExportar, frecuenciaSesion, MAD_ESCALA, FUERA_MIN } from '../src/engine/quality.js';

const ensayo = (o) => ({
  sesion_id: 'S-1', actividad: 'ACT-01', tr_bruto_ms: 1000, tr_corregido_ms: null,
  anticipatoria: false, interrumpido: false, fallo_tecnico: false, ...o,
});
// ln(RT) = base + d: la mediana es base y la MAD sin escalar, 0.1.
const DESVIOS = [0, 0.1, -0.1, 0.1, -0.1, 0.1, -0.1, 0.1, -0.1, 0.4, -0.5];
const sesion = (actividad = 'ACT-01', base = 7) => DESVIOS.map((d) => ensayo({ actividad, tr_bruto_ms: Math.exp(base + d) }));
const ESPERADO = [false, false, false, false, false, false, false, false, false, false, true];

test('fuera_de_tarea usa la MAD escalada por 1.4826', () => {
  assert.equal(MAD_ESCALA, 1.4826);
  // Límite: 3 × 1.4826 × 0.1 ≈ 0.445. Con la MAD sin escalar (0.3), el desvío de 0.4 también quedaría fuera.
  assert.deepEqual(fueraDeTarea(sesion()), ESPERADO);
});

test('fuera_de_tarea usa tr_corregido_ms si existe; si no, tr_bruto_ms', () => {
  const corregidos = sesion().map((r) => ({ ...r, tr_corregido_ms: r.tr_bruto_ms, tr_bruto_ms: 1000 }));
  assert.deepEqual(fueraDeTarea(corregidos), ESPERADO);
});

test('la mediana y la MAD se calculan por actividad, sin mezclar actividades', () => {
  const act01 = sesion('ACT-01', 7);
  const act07 = sesion('ACT-07', 8);
  assert.deepEqual(fueraDeTarea([...act01, ...act07]), [...ESPERADO, ...ESPERADO]);
  const mezcladas = [...act01, ...act07].map((r) => ({ ...r, actividad: 'ACT-01' }));
  assert.notDeepEqual(fueraDeTarea(mezcladas), [...ESPERADO, ...ESPERADO]);
});

test('con menos de 10 ensayos válidos queda vacío; los no válidos no entran ni se marcan', () => {
  assert.equal(FUERA_MIN, 10);
  const nueve = sesion().slice(0, 9);
  assert.deepEqual(fueraDeTarea(nueve), Array(9).fill(null));
  const invalidos = [
    ensayo({ anticipatoria: true, tr_bruto_ms: 120 }),
    ensayo({ interrumpido: true }),
    ensayo({ fallo_tecnico: true }),
    ensayo({ tr_bruto_ms: null }),
  ];
  assert.deepEqual(fueraDeTarea([...nueve, ...invalidos]), Array(13).fill(null), 'los no válidos no completan los 10');
  const r = fueraDeTarea([...sesion(), ...invalidos]);
  assert.deepEqual(r, [...ESPERADO, null, null, null, null]);
});

test('se calcula una sola vez al cerrar la sesión; al exportar una sesión abierta es provisional', () => {
  const rows = sesion();
  const exportadas = paraExportar(rows);
  assert.ok(exportadas.every((r) => r.fuera_de_tarea_provisional === true));
  assert.deepEqual(exportadas.map((r) => r.fuera_de_tarea), ESPERADO);
  assert.ok(rows.every((r) => !('fuera_de_tarea' in r)), 'exportar no cambia el registro');

  marcarFueraDeTarea(rows, false);
  assert.ok(rows.every((r) => r.fuera_de_tarea_provisional === false));
  // Un valor cerrado no se recalcula, aunque cambien los datos.
  rows[10].tr_bruto_ms = 1000;
  rows[9].tr_bruto_ms = 50000;
  marcarFueraDeTarea(rows, false);
  assert.deepEqual(rows.map((r) => r.fuera_de_tarea), ESPERADO);
  assert.deepEqual(paraExportar(rows).map((r) => [r.fuera_de_tarea, r.fuera_de_tarea_provisional]), ESPERADO.map((v) => [v, false]));
});

test('sesiones.csv: frecuencia de la pantalla y proporción de ensayos con periodo mayor de 20 ms', () => {
  const rows = [16.7, 16.6, 33.3, 16.7, null].map((periodo_cuadro_ms) => ({ periodo_cuadro_ms }));
  assert.deepEqual(frecuenciaSesion(rows), { frecuencia_hz: 60, proporcion_periodo_lento: 0.25 });
  assert.deepEqual(frecuenciaSesion([]), { frecuencia_hz: null, proporcion_periodo_lento: null });
});
