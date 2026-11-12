// Créditos: los dos cofundadores en la línea © y en el equipo, y el origen de los dibujos del
// banco siempre a la vista (los términos de IA de Canva piden no presentarlos como hechos sin IA).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EQUIPO, COFUNDADORES } from '../src/paginas.js';
import { readLicencias } from '../tools/licencias.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const LINEA = '© 2026 Luis Nazariego Santome y José Miguel Fausto Tapia, cofundadores de Neuro-BlueMinds.';

test('la línea © nombra a los dos cofundadores en el README, la aplicación y la página de producto', () => {
  assert.equal(COFUNDADORES, 'Luis Nazariego Santome y José Miguel Fausto Tapia');
  assert.ok(leer('README.md').includes(LINEA), 'README');
  assert.ok(leer('pagina-producto/index.html').includes(LINEA), 'página de producto');
  assert.match(leer('src/paginas.js'), /© 2026 \$\{esc\(COFUNDADORES\)\}, cofundadores de Neuro-BlueMinds\./);
  for (const ruta of ['README.md', 'pagina-producto/index.html', 'src/paginas.js']) {
    assert.doesNotMatch(leer(ruta), /© 2026 Luis Nazariego Santome y equipo/, ruta);
  }
});

test('los dos aparecen como cofundadores, y José Miguel con su rol secundario', () => {
  for (const p of EQUIPO) assert.match(p.rol, /^Cofundador · /, p.nombre);
  const jm = EQUIPO.find((p) => p.nombre === 'José Miguel Fausto Tapia');
  assert.equal(jm.rolSecundario, 'Apoyo en el desarrollo de las actividades');
  const pkg = JSON.parse(leer('package.json'));
  assert.deepEqual(pkg.contributors, ['Luis Nazariego Santome (cofundador)', 'José Miguel Fausto Tapia (cofundador)']);
});

test('los dibujos que salen de Canva dicen que se hicieron con su IA y que son de uso libre', () => {
  const filas = readLicencias(new URL('../items/licencias.csv', import.meta.url));
  const deCanva = filas.filter((r) => r.url_origen.startsWith('https://www.canva.com/'));
  assert.equal(deCanva.filter((r) => r.archivo.startsWith('assets/img/')).length, 178);
  for (const r of deCanva) {
    assert.match(`${r.origen} ${r.autor}`, /IA de Canva/, r.archivo);
    assert.match(r.autor, /^José Miguel Fausto Tapia/, r.archivo);
    assert.match(r.licencia, /^Uso libre: /, r.archivo);
  }
  // Ninguna fila dice que un dibujo de Canva se hizo a mano o sin IA, salvo las variantes, que sí se rehicieron sin IA.
  for (const r of deCanva.filter((x) => !x.origen.startsWith('Variante'))) assert.doesNotMatch(r.origen, /sin IA/, r.archivo);
});
