// Huellas del contenido de cada ficha (fichas/*.json), para que un cambio de contenido siempre
// venga con un cambio de versión (Arquitectura 6.2: un cambio crea una versión nueva, y el registro
// de cada ensayo guarda version_ficha).
//
// La huella es el SHA-256 del contenido canónico (claves ordenadas), sin «version» ni
// «revisionClinica»: esta la anota tools/aplicar-revision.mjs y no cambia la actividad.
//
//   node tools/huellas-fichas.mjs           escribe fichas/huellas.json
//   node tools/huellas-fichas.mjs --revisar solo revisa; sale con error si algo no cuadra
//
// La herramienta se niega a anotar una ficha cuyo contenido cambió sin subir su versión.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'fichas');
export const RUTA_HUELLAS = join(DIR, 'huellas.json');
const SIN_HUELLA = ['version', 'revisionClinica'];

const canonico = (v) =>
  Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonico(v[k])])) : v;

export function huellaDeFicha(ficha) {
  const resto = Object.fromEntries(Object.entries(ficha).filter(([k]) => !SIN_HUELLA.includes(k)));
  return createHash('sha256').update(JSON.stringify(canonico(resto))).digest('hex');
}

// a > b en versiones x.y.z.
export function versionMayor(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}

export function fichasActuales() {
  return Object.fromEntries(
    readdirSync(DIR)
      .filter((f) => f.endsWith('.json') && f !== 'huellas.json')
      .sort()
      .map((f) => {
        const ficha = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
        return [f, { version: ficha.version, huella: huellaDeFicha(ficha) }];
      }),
  );
}

// Compara las fichas con las huellas anotadas. Devuelve los problemas, en texto.
export function revisarHuellas(actuales, anotadas) {
  const p = [];
  for (const [f, a] of Object.entries(actuales)) {
    const antes = anotadas[f];
    if (!a.version) p.push(`${f} no tiene versión.`);
    if (!antes) {
      p.push(`${f} no está en fichas/huellas.json: corre node tools/huellas-fichas.mjs.`);
      continue;
    }
    if (a.huella !== antes.huella && a.version === antes.version) p.push(`${f}: el contenido cambió y la versión sigue en ${a.version}. Sube la versión y corre node tools/huellas-fichas.mjs.`);
    else if (a.version !== antes.version && !versionMayor(a.version, antes.version)) p.push(`${f}: la versión ${a.version} no es mayor que la anotada (${antes.version}).`);
    else if (a.version !== antes.version || a.huella !== antes.huella) p.push(`${f}: la versión subió a ${a.version}; corre node tools/huellas-fichas.mjs para anotarla.`);
  }
  for (const f of Object.keys(anotadas)) if (!actuales[f]) p.push(`${f} está en fichas/huellas.json pero ya no existe.`);
  return p;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const actuales = fichasActuales();
  let anotadas = {};
  try {
    anotadas = JSON.parse(readFileSync(RUTA_HUELLAS, 'utf8'));
  } catch {
    // primera vez
  }
  const sinSubir = revisarHuellas(actuales, anotadas).filter((t) => t.includes('el contenido cambió') || t.includes('no es mayor'));
  if (sinSubir.length || process.argv.includes('--revisar')) {
    const todos = process.argv.includes('--revisar') ? revisarHuellas(actuales, anotadas) : sinSubir;
    for (const t of todos) console.error(t);
    if (todos.length) process.exit(1);
    console.log('Las huellas de las fichas coinciden.');
    process.exit(0);
  }
  writeFileSync(RUTA_HUELLAS, JSON.stringify(actuales, null, 2) + '\n');
  console.log(`Escrito fichas/huellas.json (${Object.keys(actuales).length} fichas).`);
}
