// Registro de actividades: solo las tres del estudio piloto (Catálogo de actividades, sección 5).
// El inicio, la galería y el formulario F3 no muestran actividades de uso posterior ni la pausa
// guiada, que el Catálogo (sección 7.1) deja fuera del piloto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PANTALLAS, PILOTO, EN_UNA_LINEA, ESQUEMAS, esPiloto, requiereModoExperto, cargarCatalogo, grupos } from '../src/catalogo.js';

const raiz = (ruta) => new URL(`../${ruta}`, import.meta.url);
const texto = (ruta) => readFileSync(raiz(ruta), 'utf8');
const ficha = (id) => JSON.parse(texto(`fichas/${id}.json`));

// fetch de prueba: sirve los archivos del repositorio; «cambios» reemplaza alguno (null: no existe).
const servir = (cambios = {}) => async (url) => {
  const ruta = String(url);
  const cuerpo = ruta in cambios ? cambios[ruta] : existsSync(raiz(ruta)) ? JSON.parse(texto(ruta)) : null;
  return cuerpo === null ? { ok: false, status: 404 } : { ok: true, json: async () => cuerpo };
};

test('el registro tiene solo las tres actividades del piloto, con su pantalla, su línea y su esquema', () => {
  assert.deepEqual(PILOTO, ['ACT-01', 'ACT-02', 'ACT-07']);
  assert.deepEqual(Object.keys(PANTALLAS).sort(), ['cambia-regla', 'seleccion']);
  for (const id of PILOTO) {
    assert.ok(PANTALLAS[ficha(id).pantalla], `${id}: su pantalla existe`);
    assert.ok(EN_UNA_LINEA[id]?.length, `${id}: línea del inicio`);
    assert.match(ESQUEMAS[id], /^<svg [^>]*aria-hidden="true"/, `${id}: esquema`);
    assert.equal(requiereModoExperto(ficha(id)), false, id);
  }
  assert.deepEqual(Object.keys(EN_UNA_LINEA), PILOTO);
  assert.deepEqual(Object.keys(ESQUEMAS), PILOTO);
  assert.equal(esPiloto('ACT-03'), false);
  assert.equal(requiereModoExperto({ id: 'ACT-17' }), true);
});

test('el repositorio no trae fichas, pantallas ni banco de actividades fuera del piloto', () => {
  assert.deepEqual(readdirSync(raiz('fichas')).sort(), ['ACT-01.json', 'ACT-02.json', 'ACT-07.json']);
  assert.deepEqual(readdirSync(raiz('src/activities')).sort(), ['cambia-regla.js', 'referencia.js', 'seleccion.js']);
  for (const ruta of ['fichas/catalogo.json', 'items/items-posteriores.json', 'tools/build-posteriores.mjs', 'src/actividades.css', 'src/pausa-guiada.js', 'pagina-producto']) {
    assert.equal(existsSync(raiz(ruta)), false, ruta);
  }
  assert.ok(JSON.parse(texto('items/items.json')).items.every((i) => esPiloto(i.actividad)));
});

test('cargarCatalogo entrega las tres fichas del piloto sin problemas', async () => {
  const { catalogo, fichas, problemas } = await cargarCatalogo(servir());
  assert.deepEqual(catalogo.map((a) => a.id), PILOTO);
  assert.deepEqual(Object.keys(fichas).sort(), PILOTO);
  assert.deepEqual(problemas, {});
});

test('una ficha incompleta no se habilita: queda en la lista de problemas', async () => {
  const rota = { ...ficha('ACT-02') };
  delete rota.contraindicaciones;
  const { fichas, problemas } = await cargarCatalogo(servir({ 'fichas/ACT-02.json': rota }));
  assert.equal(fichas['ACT-02'], undefined);
  assert.ok(problemas['ACT-02'].some((p) => p.includes('contraindicaciones')));
  assert.ok(fichas['ACT-01'] && fichas['ACT-07'], 'las demás siguen disponibles');
});

test('el inicio tiene un solo grupo, el del piloto, sin grupos vacíos', async () => {
  const { catalogo, fichas, problemas } = await cargarCatalogo(servir());
  const g = grupos(catalogo, fichas, problemas);
  assert.equal(g.length, 1);
  assert.equal(g[0].titulo, 'Actividades del piloto');
  assert.deepEqual(g[0].actividades.map((a) => a.id), PILOTO);
  // Una actividad con la ficha rota sigue en la lista, para que el aviso se vea al elegirla.
  assert.deepEqual(grupos(catalogo, { 'ACT-01': fichas['ACT-01'] }, { 'ACT-02': ['x'] })[0].actividades.map((a) => a.id), ['ACT-01', 'ACT-02']);
});

test('inicio, galería y formulario F3 no mencionan actividades en preparación ni la pausa guiada', () => {
  for (const ruta of ['src/inicio.js', 'src/paginas.js', 'src/f3.js', 'src/f3-datos.js', 'src/app.js', 'src/sesiones.js', 'src/catalogo.js', 'src/styles.css', 'index.html']) {
    const src = texto(ruta).replace(/\n\s*aporte: '.*',\n/g, '\n'); // el aporte de cada persona en los créditos
    assert.doesNotMatch(src, /En preparación|uso posterior|en investigación|grupo-posterior|items-posteriores|catalogo\.json/i, ruta);
    assert.doesNotMatch(src, /pausa guiada|pausa-guiada|pausaGuiada|guiada_ms|href="#pausa"|ruta === 'pausa'/i, ruta);
    assert.doesNotMatch(src, /ACT-(0[3-689]|1[0-7])\b/, ruta);
  }
});

test('el formulario F3 describe solo las tres actividades del piloto', async () => {
  const { MECANICA } = await import('../src/f3-datos.js');
  assert.deepEqual(Object.keys(MECANICA).sort(), PILOTO);
});
