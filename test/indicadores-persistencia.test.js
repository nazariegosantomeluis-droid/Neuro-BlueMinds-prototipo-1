// A11 y A12 (tanda 5, H3.5): persistencia y abandono sobre las actividades y sesiones del niño.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { a11, a12, actividadesDeSesion, terminoAntes } from '../src/indicadores/persistencia.js';
import { filas } from '../tools/filas-prueba.mjs';

const cerca = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} frente a ${b}`);
const sesion = (id, ordenes = []) => ({ sesion_id: id, codigo_nino: 'n1', ordenes_terapeuta: ordenes });
const ensayos = (id, bloques) => bloques.flatMap((b) => filas(3, () => ({ sesion_id: id, bloque: b })));

test('A11: actividades completadas / iniciadas; un bloque terminado desde el menú no se completa', () => {
  // S1: 2 bloques completos. S2: bloque 1 terminado, bloque 2 completo. S3: la sesión se terminó en
  // el bloque 1. Iniciadas 5, completadas 3: IPF = 3/5 = 0.6; Wilson(3, 5) = [0.230724, 0.882379]
  // (fórmula de Wilson a mano, z = 1.959964).
  const ss = [sesion('S1'), sesion('S2', [{ accion: 'terminar_bloque', bloque: 1 }]), sesion('S3', [{ accion: 'pausar', bloque: 1 }, { accion: 'terminar_sesion', bloque: 1 }])];
  const es = [...ensayos('S1', [1, 2]), ...ensayos('S2', [1, 2]), ...ensayos('S3', [1])];
  assert.deepEqual(actividadesDeSesion(ss[1], es).map((a) => a.completada), [false, true]);
  const r = a11(ss, es, { calidad: 1 });
  assert.equal(r.valor, 0.6);
  assert.equal(r.n, 5);
  cerca(r.ic[0], 0.230724);
  cerca(r.ic[1], 0.882379);
  // Un bloque que no empezó (sin ensayos) no cuenta como iniciado.
  assert.equal(a11(ss.slice(0, 2), es.filter((x) => !(x.sesion_id === 'S2' && x.bloque === 2)), { calidad: 1 }).n, 3);
  assert.equal(a11(ss.slice(0, 2), es, { calidad: 1 }).motivo, '4 actividades; el mínimo es 5');
});

test('A12: sesiones terminadas desde el menú / sesiones; el límite de 15 minutos no cuenta', () => {
  // 5 sesiones; 2 terminadas con «Terminar la sesión». IA = 2/5 = 0.4.
  const ss = [
    sesion('S1'),
    sesion('S2', [{ accion: 'terminar_sesion', bloque: 2 }]),
    { ...sesion('S3'), limite_15_min: true, bloques_omitidos: [{ actividad: 'ACT-07', motivo: 'limite_15_min' }] },
    sesion('S4', [{ accion: 'terminar_bloque', bloque: 1 }]),
    sesion('S5', [{ accion: 'terminar_sesion', bloque: null }]),
  ];
  const r = a12(ss, { calidad: 1 });
  assert.equal(r.valor, 0.4);
  assert.equal(r.n, 5);
  // Una sesión de antes del menú del terapeuta (sin ordenes_terapeuta) usa terminada_antes.
  assert.ok(terminoAntes({ terminada_antes: true }));
  assert.ok(!terminoAntes({ terminada_antes: true, ordenes_terapeuta: [] }));
  assert.match(a12(ss.slice(0, 4), { calidad: 1 }).motivo, /4 sesiones; el mínimo es 5/);
  assert.match(a12(ss, { calidad: 0.5 }).motivo, /calidad de la sesión 0\.50/);
});
