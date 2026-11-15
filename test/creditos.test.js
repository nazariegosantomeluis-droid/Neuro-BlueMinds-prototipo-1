// Créditos: el equipo con su rol (fundador y CEO, cofundador y co-CEO), la marca con sus
// tipografías y licencias, y el propietario de los marcadores del banco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EQUIPO, FUNDADOR, COFUNDADOR } from '../src/paginas.js';
import { readLicencias } from '../tools/licencias.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('Luis aparece como fundador y CEO, y José Miguel como cofundador y co-CEO', () => {
  assert.equal(FUNDADOR, 'Luis Nazariego Santome');
  assert.equal(COFUNDADOR, 'José Miguel Fausto Tapia');
  const [luis, jm] = EQUIPO;
  assert.match(luis.rol, /^Fundador y CEO · /);
  assert.match(jm.rol, /^Cofundador y co-CEO · /);
  assert.equal(jm.rolSecundario, 'Apoyo en el desarrollo de las actividades');
  const paginas = leer('src/paginas.js');
  assert.match(paginas, /que fundó \$\{esc\(FUNDADOR\)\} \(fundador y CEO\) junto con \$\{esc\(COFUNDADOR\)\} \(cofundador y co-CEO\)/);
  assert.doesNotMatch(paginas, /que cofundaron/);
});

test('los marcadores del banco y la línea © conservan el propietario de main', () => {
  const PROPIETARIO = 'Luis Nazariego Santome y equipo Neuro-BlueMinds';
  assert.ok(leer('tools/build-items.mjs').includes(`propietario: '${PROPIETARIO}'`));
  const marcadores = readLicencias(new URL('../items/licencias.csv', import.meta.url)).filter((r) => r.estado === 'marcador');
  assert.ok(marcadores.length > 0);
  for (const r of marcadores) assert.equal(r.propietario, PROPIETARIO, r.archivo);
  assert.ok(leer('src/paginas.js').includes(`© 2026 ${PROPIETARIO}. Todos los derechos reservados.`));
});

test('la marca y las tipografías tienen su fila de licencia y el texto de la OFL está en el repositorio', () => {
  const filas = new Map(readLicencias(new URL('../items/licencias.csv', import.meta.url)).map((r) => [r.archivo, r]));
  for (const f of ['logotipo.svg', 'logotipo-invertido.svg', 'isotipo.svg', 'isotipo-invertido.svg', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'logo.png']) {
    const r = filas.get(`assets/marca/${f}`);
    assert.ok(r, f);
    assert.equal(r.propietario, 'Neuro-BlueMinds', f);
    assert.equal(r.licencia, 'Todos los derechos reservados', f);
  }
  for (const f of ['noto-sans-latin-400-normal.woff2', 'noto-sans-latin-600-normal.woff2', 'noto-sans-latin-700-normal.woff2', 'noto-serif-latin-700-normal.woff2', 'OFL.txt']) {
    assert.equal(filas.get(`assets/fonts/${f}`)?.licencia, 'SIL Open Font License 1.1', f);
  }
  assert.match(leer('assets/fonts/OFL.txt'), /SIL OPEN FONT LICENSE/i);
  // Roca Two y More Sugar no se distribuyen: solo se usan si están instaladas (local()).
  const css = leer('src/styles.css');
  for (const familia of ['Roca Two', 'More Sugar']) {
    const bloque = css.match(new RegExp(`@font-face \\{[^}]*font-family: '${familia}'[^}]*\\}`))[0];
    assert.doesNotMatch(bloque, /url\(/, familia);
  }
});

test('los créditos describen las imágenes como marcadores provisionales mientras no lleguen las del banco', () => {
  const paginas = leer('src/paginas.js');
  assert.match(paginas, /Las imágenes de los ejemplares son marcadores provisionales\./);
  assert.doesNotMatch(paginas, /Canva|ESC-50|Freesound|inteligencia artificial/);
});
