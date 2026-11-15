// ACT-04 «Oración e imagen»: escenas más grandes, medidas a tamaño real, y la lista de las que
// siguen siendo ambiguas (tanda 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paresDeEscenas, seDistingue, noPasan, UMBRAL, CM_PX } from '../tools/medir-escenas.mjs';
import { espacioMinimo, comprobarPantalla, avisoPantalla } from '../src/ajuste-pantalla.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const ficha = JSON.parse(leer('fichas/ACT-04.json'));
const medicion = JSON.parse(leer('docs/medicion-escenas.json'));

test('las escenas miden al menos el tamaño de la ficha y crecen hasta 8 cm', () => {
  assert.equal(ficha.opcionMinCm, 4.5);
  const css = leer('src/actividades.css');
  const opciones = css.match(/\.opciones-escenas \{[\s\S]*?\n\}/)[0];
  assert.match(opciones, /--opcion: clamp\(\s*calc\(var\(--cm\) \* 4\.5\),[\s\S]*calc\(var\(--cm\) \* 8\)\s*\);/);
  const consigna = css.match(/\.escena-consigna \{[\s\S]*?\n\}/)[0];
  assert.match(consigna, /width: clamp\(calc\(var\(--cm\) \* 4\.5\), .*, calc\(var\(--cm\) \* 8\)\);/);
});

test('el inicio avisa si las escenas no caben a su tamaño mínimo', () => {
  // Cuatro escenas de B2 en fila: 4 × 4.5 cm, 3 separaciones de 0.6 cm y medio centímetro de margen.
  const b2 = ficha.bandas.find((b) => b.id === 'B2');
  assert.equal(b2.disposicion, '1x4');
  assert.deepEqual(
    { ...espacioMinimo('oracion', '1x4', { opcionMin: 4.5 }) },
    { ancho: 20.3, alto: 9, anchoOpciones: 20.3, anchoSerie: 0, opcion: 4.5 },
  );
  // En una tableta de 10 pulgadas cabe en horizontal; en vertical hay que girarla.
  const horizontal = comprobarPantalla({ pantalla: 'oracion', disposicion: '1x4', opcionMin: 4.5, anchoPx: 1280, altoPx: 800, cmPx: CM_PX });
  assert.equal(horizontal.cabe, true);
  const vertical = comprobarPantalla({ pantalla: 'oracion', disposicion: '1x4', opcionMin: 4.5, anchoPx: 800, altoPx: 1280, cmPx: CM_PX });
  assert.deepEqual([vertical.cabe, vertical.girar], [false, true]);
  assert.match(avisoPantalla(vertical, 4), /no caben 4 opciones de 4,5 cm .*Gira la tableta\.$/);
  // Las demás pantallas siguen con 2 cm.
  assert.equal(espacioMinimo('seleccion', '1x4').opcion, 2);
  assert.match(leer('src/inicio.js'), /opcionMin: ficha\.opcionMinCm/);
});

test('la medición corresponde a la ficha actual: mismos pares, mismo tamaño de escena y tableta', () => {
  assert.deepEqual(medicion.pares.map((p) => p.clave).sort(), paresDeEscenas(ficha).map((p) => p.clave).sort());
  assert.equal(medicion.escenaCm, ficha.opcionMinCm);
  assert.equal(medicion.tabletaCmPx, CM_PX);
  assert.deepEqual(medicion.umbral, UMBRAL);
  for (const p of medicion.pares) assert.ok(p.porTamano[ficha.opcionMinCm], p.clave);
  assert.deepEqual(medicion.noPasanAlTamanoDeEscena, noPasan(medicion.pares, ficha.opcionMinCm));
});

test('«come» y «bebe» se distinguen a tamaño real, y las acciones del banco también', () => {
  const de = (clave) => medicion.pares.find((p) => p.clave === clave).porTamano[ficha.opcionMinCm];
  for (const s of ['nina', 'nino']) assert.ok(seDistingue(de(`${s}: come / bebe`)), s);
  const acciones = medicion.pares.filter((p) => p.tipo === 'accion');
  assert.equal(acciones.length, 2 * 36);
  assert.ok(acciones.every((p) => seDistingue(p.porTamano[ficha.opcionMinCm])), 'todas las acciones pasan el filtro');
});

test('la ficha lista las escenas que siguen siendo ambiguas, y nada que no pase el filtro queda fuera', () => {
  const claves = new Set(paresDeEscenas(ficha).map((p) => p.clave));
  const listados = ficha.accionesAmbiguas.flatMap((a) => a.pares);
  for (const a of ficha.accionesAmbiguas) {
    assert.ok(a.pares.length && a.motivo.endsWith('.'), a.motivo);
    for (const c of a.pares) assert.ok(claves.has(c), c);
  }
  assert.deepEqual(medicion.ambiguosDeLaRevision, listados);
  for (const c of medicion.noPasanAlTamanoDeEscena) assert.ok(listados.includes(c), `${c} no pasa el filtro y no está en la lista`);
  assert.ok(listados.includes('nina: peina / telefono'));
  assert.ok(ficha.pendientesClinicos.some((p) => p.includes('«accionesAmbiguas»')));
});
