// Versión y commit publicados (tanda 4). La versión es VERSION_APP; el commit lo escribe GitHub
// Pages en version.json al publicar (Jekyll llena site.github.build_revision). En una copia local
// el archivo queda sin llenar y el commit es null. Así cada respuesta del F3 y de la revisión
// clínica dice qué versión vio el experto, y el pie de las pantallas del adulto la muestra.
import { VERSION_APP } from './engine/logger.js';

let actual = { version: VERSION_APP, commit: null };

// Saca el commit del texto de version.json; null si no es un SHA (archivo sin llenar).
export function commitDe(texto) {
  const m = /"commit"\s*:\s*"([0-9a-f]{7,40})"/i.exec(String(texto ?? ''));
  return m ? m[1].toLowerCase() : null;
}

export async function cargarVersion(fetchFn = globalThis.fetch) {
  try {
    const r = await fetchFn('version.json', { cache: 'no-store' });
    actual = { version: VERSION_APP, commit: r.ok ? commitDe(await r.text()) : null };
  } catch {
    actual = { version: VERSION_APP, commit: null };
  }
  return actual;
}

export const versionActual = () => actual;

// Commit abreviado a 7 caracteres, como lo muestra GitHub; vacío si no hay.
export const commitCorto = (commit) => (commit ? commit.slice(0, 7) : '');

export const textoVersion = ({ version, commit } = actual) => `AutiPal ${version} · ${commit ? `commit ${commitCorto(commit)}` : 'copia local, sin commit publicado'}`;
