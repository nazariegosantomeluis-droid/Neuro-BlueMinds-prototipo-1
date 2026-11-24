// Lista de archivos de la aplicación instalable (H6.1; RF-09, parte local; RNF-10). El trabajador
// de servicio (sw.js) la lee al instalarse y guarda todos esos archivos, para que la aplicación
// arranque y funcione sin conexión. Si se agrega o se quita un archivo, corre
// `node tools/generar-sw.mjs` (la prueba test/instalable.test.js falla si la lista no está al día).
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const CARPETAS = ['src', 'fichas', 'items', 'assets', 'config'];
const SUELTOS = ['index.html', 'manifest.webmanifest', 'version.json'];

const recorrer = (dir) =>
  readdirSync(join(RAIZ, dir)).flatMap((n) => {
    const ruta = join(dir, n);
    return statSync(join(RAIZ, ruta)).isDirectory() ? recorrer(ruta) : [relative('.', ruta).split('\\').join('/')];
  });

export const listaDeArchivos = () => ['./', ...SUELTOS, ...CARPETAS.flatMap(recorrer)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const archivos = listaDeArchivos();
  writeFileSync(join(RAIZ, 'sw-archivos.json'), JSON.stringify({ archivos }, null, 1) + '\n');
  console.log(`sw-archivos.json: ${archivos.length} archivos.`);
}
