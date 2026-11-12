// Verifica el banco de ítems: que todo archivo usado exista, que todo archivo de
// assets/ tenga su fila en items/licencias.csv y que toda fila apunte a un archivo.
// Lista los marcadores provisionales que siguen en uso y los audios que faltan
// (mientras falten, la aplicación usa la voz del navegador).
// Uso: node tools/check-items.mjs [carpeta]   (sale con código 1 si hay errores)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLicencias } from './licencias.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../', import.meta.url));

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.startsWith('.') ? [] : [p];
  });
}

export function checkItems(root = DEFAULT_ROOT) {
  const abs = (rel) => join(root, rel);
  const exists = (rel) => existsSync(abs(rel));
  const { items } = JSON.parse(readFileSync(abs('items/items.json'), 'utf8'));
  const licencias = new Map(readLicencias(abs('items/licencias.csv')).map((r) => [r.archivo, r]));
  const errors = new Set();
  const placeholders = new Set();
  const missingAudio = new Set();
  const used = new Set();

  for (const it of items) {
    // ACT-07 no usa archivos de imagen: sus figuras se dibujan; cada ensayo tiene su consigna de voz.
    const consignas = it.ensayos ? it.ensayos.map((e) => e.consigna) : [it.consigna];
    for (const src of [it.consigna?.src, ...(it.opciones ?? []).map((o) => o.src)]) if (src) used.add(src);
    for (const c of consignas) {
      if (!c?.audio) continue;
      const audio = `assets/audio/${c.audio}.mp3`;
      if (exists(audio)) used.add(audio);
      else missingAudio.add(audio);
    }
  }
  for (const f of used) {
    if (!exists(f)) errors.add(`Falta el archivo ${f}.`);
    else if (f.endsWith('.svg') && readFileSync(abs(f), 'utf8').includes('data-marcador')) placeholders.add(f);
  }
  const onDisk = walk(abs('assets')).map((p) => relative(root, p).split(sep).join('/'));
  for (const f of new Set([...used, ...onDisk])) {
    if (exists(f) && !licencias.has(f)) errors.add(`${f} no tiene fila en items/licencias.csv.`);
  }
  for (const f of licencias.keys()) if (!exists(f)) errors.add(`items/licencias.csv menciona ${f}, que no existe.`);
  const warnings = [...licencias.values()]
    .filter((r) => r.estado === 'revisar' || r.estado === 'pendiente')
    .map((r) => `${r.archivo} (${r.estado}): ${r.notas}`);

  // Estado de la revisión clínica de los ítems con imágenes (ACT-07 no tiene estado por ítem).
  const revision = {};
  for (const it of items) if (it.estadoRevision) revision[it.estadoRevision] = (revision[it.estadoRevision] ?? 0) + 1;

  return {
    errors: [...errors].sort(),
    revision,
    warnings,
    placeholders: [...placeholders].sort(),
    missingAudio: [...missingAudio].sort(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = checkItems(process.argv[2] ?? DEFAULT_ROOT);
  // Marcadores agrupados por concepto: "perro: 1, 2".
  const byConcept = {};
  for (const f of r.placeholders) {
    const [, concepto, n] = f.match(/assets\/img\/(.+)\/(\d+)\.svg$/);
    (byConcept[concepto] ??= []).push(n);
  }
  console.log(`Marcadores provisionales en uso (${r.placeholders.length}):`);
  for (const [c, ns] of Object.entries(byConcept)) console.log(`  ${c}: ${ns.join(', ')}`);
  console.log(`Audios que faltan (${r.missingAudio.length}); mientras falten se usa la voz del navegador.`);
  for (const a of r.missingAudio) console.log(`  ${a}`);
  const n = (k) => r.revision[k] ?? 0;
  console.log(
    `Revisión clínica de ACT-01 y ACT-02: ${n('aprobado')} aprobados, ${n('corregir')} por corregir, ${n('retirado')} retirados (fuera de las sesiones), ${n('sin-revisar')} sin revisar.`,
  );
  if (r.warnings.length) console.log(`Para revisar (${r.warnings.length}):`);
  for (const w of r.warnings) console.log(`  ${w}`);
  if (r.errors.length) {
    console.error(`\nErrores (${r.errors.length}):`);
    for (const e of r.errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log('\nSin errores: todos los archivos existen y tienen licencia.');
}
