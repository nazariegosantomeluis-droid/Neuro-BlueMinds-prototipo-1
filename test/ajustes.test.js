import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTIVOS_TERMINACION, faltaMotivo } from '../src/terminacion.js';

const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

test('terminar el bloque antes de tiempo exige un motivo de la lista; continuar no lo pide', () => {
  assert.equal(faltaMotivo('terminar', ''), true);
  assert.equal(faltaMotivo('terminar', 'cualquier texto'), true);
  for (const m of MOTIVOS_TERMINACION) assert.equal(faltaMotivo('terminar', m), false, m);
  assert.equal(faltaMotivo('continuar', ''), false);
});

test('el menú del terapeuta no deja terminar sin motivo', async () => {
  const { crearMenu } = await import('../src/menu-terapeuta.js');
  const menu = crearMenu({});
  for (const control of ['terminar-bloque', 'terminar-sesion']) {
    const r = menu.tocar(control);
    assert.equal(r.cerrar, undefined, control);
    assert.equal(r.mensaje, 'Elige el motivo para terminar.');
  }
  // El menú solo se cierra desde la máquina de estados, cuando devuelve «cerrar».
  assert.match(src('app.js'), /if \(res\.cerrar\) \{\n\s+capa\.remove\(\);/);
});

test('la galería tiene el contenedor del botón F3 y el botón se ancla a él', () => {
  const galeria = src('paginas.js').slice(src('paginas.js').indexOf('export function renderGaleria'), src('paginas.js').indexOf('function fichaHTML'));
  assert.ok(galeria.includes('<div id="enlace-f3"></div>'), 'falta <div id="enlace-f3"></div> en la galería');
  assert.match(src('enlaces.js'), /querySelector\('#enlace-f3'\)\?\.append\(boton\)/);
  assert.doesNotMatch(src('enlaces.js'), /querySelector\('h1'\)/);
});
