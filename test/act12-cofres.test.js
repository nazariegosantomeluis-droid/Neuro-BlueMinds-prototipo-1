// ACT-12 «Elige y descubre» (tanda 2): el Catálogo pide 80 elecciones o más para recuperar los
// parámetros y un bloque tiene como mucho 40 ensayos (Arquitectura 4.4). Dos bloques de la misma
// banda en una sesión se juntan en un solo programa de 80 elecciones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as cofres from '../src/activities/cofres.js';
import { lineasDeBloque, indiceDeItems, bloquesDeSesion } from '../src/sesiones.js';
import { rng } from '../src/engine/selector.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-12.json'));
const { items } = JSON.parse(leer('items/items-posteriores.json'));
const indice = indiceDeItems(items);
const deBanda = (b) => items.filter((i) => i.actividad === 'ACT-12' && i.banda === b);

// Filas de un bloque: elige siempre el cofre favorable, salvo las omisiones pedidas.
const filasDe = (programa, bloque, { omisiones = 0 } = {}) =>
  programa.ensayos.map((e, k) => {
    const o = e.opciones.find((x) => x.correcta);
    const omite = k < omisiones;
    return { sesion_id: 's', bloque, actividad: 'ACT-12', banda: programa.banda, item: e.codigo, opcion_elegida: omite ? null : 1, opcion_elegida_id: omite ? null : o.id, acierto: !omite, omision: omite, tr_bruto_ms: omite ? null : 800, anticipatoria: false, interrumpido: false };
  });

// Cofre que premia más en un ensayo.
const favorable = (e) => e.opciones.find((o) => o.correcta).cofre;

test('la ficha junta dos bloques de 40 para llegar a 80 elecciones y lo explica', () => {
  assert.equal(ficha.ensayosPorBloque, 40);
  assert.deepEqual({ elecciones: ficha.juntarBloques.elecciones, bloques: ficha.juntarBloques.bloques }, { elecciones: 80, bloques: 2 });
  assert.equal(ficha.ensayosPorBloque * ficha.juntarBloques.bloques, ficha.juntarBloques.elecciones);
  assert.match(ficha.juntarBloques.motivo, /80 elecciones.*Arquitectura 4\.4/);
  assert.match(ficha.notaPrototipo, /«juntarBloques»/);
  assert.ok(ficha.pendientesClinicos.some((p) => p.includes('«juntarBloques»')));
  for (const b of ficha.bandas) assert.equal(b.ensayosMax, 40, b.id);
});

test('el segundo bloque de la banda sigue con el cofre que terminó premiando más: 80 elecciones de un solo programa', () => {
  for (const b of ['B1', 'B2', 'B3', 'B4']) {
    const programas = deBanda(b);
    for (let semilla = 1; semilla <= 30; semilla++) {
      const [primero] = cofres.elegir(programas, 40, rng(semilla));
      const [segundo] = cofres.elegir(programas, 40, rng(semilla + 100), { previas: filasDe(primero, 1) });
      assert.notEqual(segundo, primero, `${b}: no repite el programa`);
      const ochenta = [...primero.ensayos, ...segundo.ensayos];
      const favorables = ochenta.map(favorable);
      const cambios = favorables.flatMap((c, k) => (k > 0 && c !== favorables[k - 1] ? [k + 1] : []));
      // B1 y B2 sin cambio; B3 y B4 con una sola inversión, en la elección de la ficha (41).
      const inversion = ficha.bandas.find((x) => x.id === b).inversion;
      assert.deepEqual(cambios, inversion ? [ficha.juntarBloques.inversionEnEleccion] : [], `${b}, semilla ${semilla}`);
      if (inversion) {
        assert.deepEqual([primero.parte, segundo.parte], [1, 2]);
        assert.deepEqual(ochenta.map((e) => e.eleccion), Array.from({ length: 80 }, (_, k) => k + 1), `${b}: elecciones 1 a 80`);
      }
      // La fase de cada ensayo dice si va antes o después del cambio.
      ochenta.forEach((e, k) => assert.equal(e.fase, inversion && k + 1 >= 41 ? 2 : 1, `${b} elección ${k + 1}`));
    }
  }
});

test('la inversión de B3 y B4 es una sola, en la elección 41, y queda como pendiente para el Modelo', () => {
  assert.equal(ficha.juntarBloques.inversionEnEleccion, 41);
  assert.match(ficha.juntarBloques.motivo, /«la ventaja se invierte» sin decir cuántas veces: se invierte una sola vez, en la elección «inversionEnEleccion» \(41/);
  assert.ok(ficha.pendientesClinicos.some((p) => p.startsWith('Confirmar en el Modelo matemático, cuando defina α_RL, cuántas inversiones') && p.includes('«inversionEnEleccion»')));
  for (const b of ficha.bandas.filter((x) => x.inversion)) assert.match(b.descripcion, /una vez, en la elección 41/, b.id);
  assert.doesNotMatch(JSON.stringify(ficha), /21 y 61/);
});

test('el lugar de la inversión se configura en la ficha', async () => {
  const { buildPosteriores, loadInputs } = await import('../tools/build-posteriores.mjs');
  const entradas = loadInputs();
  for (const cambio of [21, 41, 61]) {
    const f12 = { ...entradas.fichas['ACT-12'], juntarBloques: { ...ficha.juntarBloques, inversionEnEleccion: cambio } };
    const banco = buildPosteriores({ ...entradas, fichas: { ...entradas.fichas, 'ACT-12': f12 } });
    const b3 = banco.filter((i) => i.actividad === 'ACT-12' && i.banda === 'B3');
    const [primero] = cofres.elegir(b3, 40, rng(5));
    const [segundo] = cofres.elegir(b3, 40, rng(6), { previas: filasDe(primero, 1) });
    const favorables = [...primero.ensayos, ...segundo.ensayos].map(favorable);
    const cambios = favorables.flatMap((c, k) => (k > 0 && c !== favorables[k - 1] ? [k + 1] : []));
    assert.deepEqual(cambios, [cambio], `inversión en ${cambio}`);
  }
});

test('sin bloques anteriores, se elige al azar entre los programas del primer bloque', () => {
  const programas = deBanda('B3').filter((p) => p.parte === 1);
  assert.equal(programas.length, ficha.programasPorBanda);
  for (let semilla = 1; semilla <= 20; semilla++) {
    const r = rng(semilla);
    const esperado = programas[Math.floor(rng(semilla)() * programas.length)];
    assert.equal(cofres.elegir(deBanda('B3'), 40, r)[0], esperado);
    assert.equal(cofres.elegir(deBanda('B3'), 40, rng(semilla), { previas: [] })[0], esperado);
  }
});

test('el resumen cuenta las elecciones de la banda en la sesión, con los bloques juntos', () => {
  const [p1, p2] = [deBanda('B3')[0], deBanda('B3')[1]];
  const b1 = filasDe(p1, 1, { omisiones: 3 });
  const uno = lineasDeBloque(b1, ficha, indice);
  assert.equal(uno.at(-2), 'Elecciones de la banda B3 en la sesión: 37. Para estimar los parámetros del modelo de aprendizaje el Catálogo pide 80 o más; este prototipo no los calcula.');
  assert.match(uno.at(-1), /^Para juntar 80, haz otro bloque de esta banda en la misma sesión/);
  // En la página «Sesiones», el bloque 2 se resume con el 1 como anterior.
  const b2 = filasDe(p2, 2);
  const dos = lineasDeBloque(b2, ficha, indice, { previas: b1 });
  assert.equal(dos.at(-2), 'Elecciones de la banda B3 en la sesión, con 2 bloques juntos: 77. Para estimar los parámetros del modelo de aprendizaje el Catálogo pide 80 o más; este prototipo no los calcula.');
  assert.match(dos.at(-1), /^Para juntar 80/, 'con omisiones todavía no llega');
  // Sin omisiones, dos bloques dan 80 y ya no pide otro.
  const completo = lineasDeBloque(b2, ficha, indice, { previas: filasDe(p1, 1) });
  assert.match(completo.at(-1), /con 2 bloques juntos: 80\./);
  // Los bloques de otra banda o de otra actividad no se juntan.
  const otraBanda = filasDe(deBanda('B1')[0], 3);
  assert.match(lineasDeBloque(otraBanda, ficha, indice, { previas: [...b1, ...b2] }).at(-2), /banda B1 en la sesión: 40\./);
  const sesiones = leer('src/sesiones.js');
  assert.match(sesiones, /bloqueHTML\(b, sesion, fichas, indice, bloques\.slice\(0, k\)\.flatMap\(\(x\) => x\.filas\)\)/);
  assert.equal(bloquesDeSesion([...b2, ...b1])[0].bloque, 1);
  const app = leer('src/app.js');
  assert.match(app, /const previas = log\.rows\(\)\.filter\(\(r\) => r\.sesion_id === s\.id && r\.actividad === ficha\.id && r\.banda === banda\.id\);/);
  assert.match(app, /lineasDelBloque\(rows, ficha, pantalla, byCode, \{ cambio, previas \}\)/);
});

test('la mecánica, la vista previa y la galería describen una sola inversión, en la elección 41', () => {
  assert.doesNotMatch(JSON.stringify(ficha), /a la mitad del bloque/);
  assert.match(ficha.mecanica, /una sola vez, en la elección 41/);
  const b3 = ficha.bandas.find((b) => b.id === 'B3');
  assert.match(cofres.notaPrevia(ficha, b3), /la ventaja pasa al otro cofre una vez, en la elección 41, sin aviso\.$/);
  const segundo = deBanda('B3').find((p) => p.parte === 2);
  assert.match(cofres.galeriaHTML(segundo), /empieza después del cambio de ventaja \(elección 41\)/);
});
