// ACT-10 «Ordena la secuencia» y ACT-16 «Forma la palabra» (tanda 2): el indicador principal es
// la secuencia completa (Catálogo 6.2); los pasos son el detalle; un paso solo es ensayo si hay al
// menos 2 piezas posibles,
// y los tiempos entre toques no entran en los resúmenes ni en «fuera de tarea» (Arquitectura 4.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as secuencia from '../src/activities/secuencia.js';
import { lineasDeBloque, indiceDeItems } from '../src/sesiones.js';
import { fueraDeTarea, marcarFueraDeTarea, paraExportar } from '../src/engine/quality.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = (id) => JSON.parse(leer(`fichas/${id}.json`));
const { items } = JSON.parse(leer('items/items-posteriores.json'));
const indice = indiceDeItems(items);

// Filas de un bloque: cada paso de las secuencias dadas, con acierto según hecho(secuencia, paso).
function bloque(actividad, banda, n, hecho) {
  const its = items.filter((i) => i.actividad === actividad && i.banda === banda).slice(0, n);
  return its.flatMap((it, s) =>
    it.ensayos.map((e) => {
      const r = hecho(s, e.paso) ?? {};
      return { actividad, item: e.codigo, acierto: r.acierto ?? true, omision: r.omision ?? false, opcion_elegida: r.omision ? null : 1, tr_bruto_ms: r.omision ? null : 900 + 50 * e.paso, anticipatoria: false, interrumpido: r.interrumpido ?? false, fallo_tecnico: false, perdida_foco: false };
    }),
  );
}

test('el resumen empieza por las secuencias completas y deja los pasos como detalle, sin tiempos', () => {
  const f = ficha('ACT-10');
  // 4 secuencias de 3 pasos (B3): la 1 bien, la 2 con un error, la 3 con una omisión, la 4 cortada.
  const filas = bloque('ACT-10', 'B3', 4, (s, paso) =>
    s === 1 && paso === 2 ? { acierto: false } : s === 2 && paso === 3 ? { acierto: false, omision: true } : s === 3 && paso === 2 ? { interrumpido: true } : null,
  );
  const lineas = lineasDeBloque(filas, f, indice);
  assert.deepEqual(lineas, [
    'Hizo completas y en orden 1 de 3 secuencias.',
    'Secuencias que no se terminaron por una pausa o un salto: 1. No entran en la cuenta.',
    'Detalle por pasos: tocó la tarjeta que seguía en 7 de 9 pasos; sin respuesta en 1.',
  ]);
  assert.ok(lineas.every((l) => !/mediana|tiempo/i.test(l)), 'los tiempos entre toques no se resumen');
  // ACT-16 usa su propia plantilla, por palabras.
  const l16 = lineasDeBloque(bloque('ACT-16', 'B2', 2, () => null), ficha('ACT-16'), indice);
  assert.equal(l16[0], 'Formó sin errores 2 de 2 palabras o frases.');
  assert.equal(l16[1], 'Detalle por pasos: tocó la pieza que seguía en 6 de 6 pasos; sin respuesta en 0.');
});

test('un paso es ensayo solo con 2 piezas posibles o más; si queda una, pasa sola y no tiene fila', () => {
  for (const id of ['ACT-10', 'ACT-16']) {
    assert.equal('ultimaTarjeta' in ficha(id), false, `${id}: ya no hay opción`);
    for (const it of items.filter((i) => i.actividad === id)) {
      const lugares = it.tarjetas.filter((t) => t.orden !== null).length;
      const ultima = it.tarjetas.find((t) => t.orden === lugares);
      // Cada paso tiene al menos 2 piezas posibles.
      for (const e of it.ensayos) assert.ok(e.opciones.length >= 2, e.codigo);
      if (it.tarjetas.length === lugares) {
        // No sobra ninguna (ACT-10): en el último lugar queda una sola; pasa sola.
        assert.equal(it.ensayos.length, lugares - 1, it.codigo);
        assert.equal(it.ensayos.at(-1).autoColocar, ultima.id, it.codigo);
      } else {
        // Sobran piezas (ACT-16): la última también se elige y es ensayo.
        assert.equal(it.ensayos.length, lugares, it.codigo);
        assert.equal(it.ensayos.at(-1).opciones.find((o) => o.correcta).id, ultima.id, it.codigo);
        assert.ok(it.ensayos.every((e) => !e.autoColocar), it.codigo);
      }
    }
  }
  assert.ok(items.filter((i) => i.actividad === 'ACT-16').every((i) => i.tarjetas.length > i.tarjetas.filter((t) => t.orden !== null).length), 'en ACT-16 siempre sobra una pieza');
  // La pantalla coloca la última al terminar el paso anterior, sin marco.
  assert.match(leer('src/activities/secuencia.js'), /if \(actual\?\.autoColocar\) colocar\(actual\.autoColocar, false\);/);
});

test('las fichas dicen por qué el bloque cuenta secuencias y qué falta decidir', () => {
  for (const id of ['ACT-10', 'ACT-16']) {
    const f = ficha(id);
    assert.match(f.ensayosExcepcion, /Catálogo 6\.2: A1 por (secuencia|palabra) completa/, id);
    assert.match(f.notaPrototipo, /indicador principal/, id);
  }
  assert.match(ficha('ACT-10').ensayosExcepcion, /la última tarjeta pasa sola a su lugar \(no sobra ninguna: queda una sola posible\)/);
  assert.match(ficha('ACT-10').notaPrototipo, /la última tarjeta no tiene fila/);
  assert.match(ficha('ACT-16').ensayosExcepcion, /de 2 a 4 toques: como sobran piezas, la última también se elige/);
  assert.match(ficha('ACT-16').notaPrototipo, /Un paso solo cuenta como ensayo si quedan al menos 2 piezas posibles/);
  assert.ok(ficha('ACT-16').pendientesClinicos.some((p) => p.startsWith('Aprobar que la última pieza cuente como ensayo cuando quedan al menos 2 posibles')));
  for (const id of ['ACT-10', 'ACT-16']) assert.ok(ficha(id).pendientesClinicos.every((p) => !p.includes('ultimaTarjeta')), id);
});

test('los pasos de una secuencia no entran en «fuera de tarea»; las demás actividades, igual que antes', () => {
  const rt = (k) => 700 + ((k * 137) % 900);
  const piloto = Array.from({ length: 14 }, (_, k) => ({ sesion_id: 's', actividad: 'ACT-01', tr_bruto_ms: k === 13 ? 9000 : rt(k), tr_corregido_ms: null, anticipatoria: false, interrumpido: false, fallo_tecnico: false }));
  const pasos = Array.from({ length: 14 }, (_, k) => ({ sesion_id: 's', actividad: 'ACT-10', tr_bruto_ms: k === 13 ? 9000 : rt(k), tr_corregido_ms: null, anticipatoria: false, interrumpido: false, fallo_tecnico: false }));
  const filas = [...piloto, ...pasos];
  const antes = fueraDeTarea(filas);
  const ahora = fueraDeTarea(filas, { sinTiempos: ['ACT-10', 'ACT-16'] });
  assert.deepEqual(ahora.slice(0, 14), antes.slice(0, 14), 'ACT-01 no cambia');
  assert.equal(antes[13], true);
  assert.ok(ahora.slice(14).every((v) => v === null), 'ACT-10 queda vacío');
  // Sin la opción, todo queda como antes de la tanda 2.
  assert.deepEqual(fueraDeTarea(piloto), antes.slice(0, 14));
  const copia = filas.map((r) => ({ ...r }));
  marcarFueraDeTarea(copia, false, { sinTiempos: ['ACT-10'] });
  assert.ok(copia.slice(14).every((r) => r.fuera_de_tarea === null));
  assert.ok(paraExportar(filas, { sinTiempos: ['ACT-10'] }).slice(14).every((r) => r.fuera_de_tarea === null));
  // La aplicación pasa las actividades de respuesta «secuencia» al cerrar y al exportar.
  const app = leer('src/app.js');
  assert.match(app, /const sinTiempos = \(\) => Object\.values\(state\.fichas\)\.filter\(\(f\) => f\.unidadDelBloque === 'secuencia'\)/);
  assert.equal(app.match(/\{ sinTiempos: sinTiempos\(\) \}/g).length, 4, 'al cerrar, al exportar CSV y JSON, y al calcular indicadores.csv');
});

test('el resumen por secuencia no depende del orden de las filas en el registro', () => {
  const filas = bloque('ACT-10', 'B2', 3, (s, paso) => (s === 0 && paso === 1 ? { acierto: false } : null));
  const byCode = indice;
  const a = secuencia.porSecuencia(filas, byCode);
  const b = secuencia.porSecuencia([...filas].reverse(), byCode);
  const resumen = (xs) => xs.map((s) => [s.secuencia, s.completa, s.cortada]).sort();
  assert.deepEqual(resumen(a), resumen(b));
  assert.deepEqual(a.map((s) => s.completa), [false, true, true]);
});
