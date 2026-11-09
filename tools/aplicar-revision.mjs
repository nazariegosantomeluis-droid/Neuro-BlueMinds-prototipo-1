// Aplica la revisión clínica consolidada (revision-consolidada.csv, de tools/unir-revisiones.mjs)
// al banco de ítems: escribe items/revision.json, anota la revisión en cada ficha y regenera
// items/items.json. Los ítems retirados dejan de usarse en las sesiones.
//
// Antes de aplicarla, los casos «Revisar en reunión» se resuelven con los clínicos y se escribe
// la decisión acordada en la columna «decision» del CSV (Aprobado, Corregir o Retirar; en las
// decisiones, la opción elegida).
//
// Uso:
//   node tools/aplicar-revision.mjs revision-consolidada.csv \
//     --revisor "AB=Nombre Apellido, terapia de lenguaje" --revisor "CD=Nombre Apellido, psicología" \
//     [--fecha 2026-11-15] [--prueba]
// --prueba muestra el resumen sin escribir nada.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from './unir-revisiones.mjs';
import { ESTADOS, FIGURAS, DECISIONES, CAMBIAR_SHORT } from '../src/revision-datos.js';
import { ROOT, loadInputs, buildItems, writeItems } from './build-items.mjs';

// Decisión del CSV → estado guardado en revision.json y en cada ítem.
export const ESTADO_DE_DECISION = { Aprobado: 'aprobado', Corregir: 'corregir', Retirar: 'retirado' };
// Problemas que suelen deberse al concepto o a su imagen, no a ese ítem en particular.
export const PROBLEMAS_DE_CONCEPTO = ['Imagen poco reconocible', 'No adecuado para niños de México', 'Molesto o aversivo'];

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const unicos = (xs) => [...new Set(xs.filter(Boolean))];

// Fecha local de hoy en formato AAAA-MM-DD.
export function hoy(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseArgs(argv) {
  const out = { archivo: '', revisores: new Map(), fecha: hoy(), prueba: false, errores: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prueba') out.prueba = true;
    else if (a === '--fecha') out.fecha = argv[++i] ?? '';
    else if (a === '--revisor') {
      const v = argv[++i] ?? '';
      const k = v.indexOf('=');
      const ini = v.slice(0, k).trim().toUpperCase();
      const nombre = v.slice(k + 1).trim();
      if (k < 1 || !nombre) out.errores.push(`«--revisor ${v}» debe tener la forma INICIALES=Nombre completo, profesión.`);
      else out.revisores.set(ini, nombre);
    } else if (!out.archivo) out.archivo = a;
    else out.errores.push(`Argumento no reconocido: ${a}`);
  }
  if (!out.archivo) out.errores.push('Falta el archivo revision-consolidada.csv.');
  return out;
}

// Problemas y comentarios de todos los revisores en una fila consolidada.
function notas(fila, iniciales) {
  const problemas = unicos(iniciales.flatMap((ini) => (fila[`problemas_${ini}`] ?? '').split(';').map((s) => s.trim())));
  const comentarios = iniciales.map((ini) => [ini, (fila[`comentario_${ini}`] ?? '').trim()]).filter(([, c]) => c).map(([ini, c]) => `${ini}: ${c}`);
  return { problemas, comentarios };
}

// Valida el CSV consolidado y lo une a la revisión previa (rondas anteriores se conservan;
// una fila nueva sustituye a la anterior del mismo ítem).
// codigos: códigos de los ítems de ACT-01 y ACT-02 que existen en el banco.
export function aplicarRevision(texto, { revisores, fecha, codigos, previa }) {
  const errores = [];
  const filas = leerCSV(texto);
  if (!filas.length || !('item' in filas[0]) || !('decision' in filas[0])) {
    return { errores: ['El archivo no es un revision-consolidada.csv (faltan las columnas «item» y «decision»).'] };
  }
  if (!FECHA_RE.test(fecha)) errores.push(`La fecha «${fecha}» debe tener la forma AAAA-MM-DD.`);

  // Las iniciales de las columnas estado_XX deben coincidir con los --revisor.
  const iniciales = Object.keys(filas[0]).filter((c) => c.startsWith('estado_')).map((c) => c.slice('estado_'.length));
  const faltan = iniciales.filter((ini) => !revisores.has(ini));
  const sobran = [...revisores.keys()].filter((ini) => !iniciales.includes(ini));
  if (faltan.length) errores.push(`Falta el nombre de: ${faltan.join(', ')} (agrega --revisor "${faltan[0]}=Nombre completo, profesión").`);
  if (sobran.length) errores.push(`El CSV no tiene columnas de: ${sobran.join(', ')}.`);

  const items = {};
  const figuras = {};
  const decisiones = {};
  const sinResolver = [];
  const opcionesDe = Object.fromEntries(DECISIONES.map((d) => [d.item, d]));

  for (const f of filas) {
    if (f.item === 'COMENTARIO-GENERAL') continue;
    const d = f.decision.trim();
    if (f.item.startsWith('DECISION-')) {
      const def = opcionesDe[f.item];
      if (!def) errores.push(`Decisión desconocida: ${f.item}.`);
      else if (!def.opciones.includes(d)) sinResolver.push(`${f.item}: «${d || 'vacía'}»`);
      else {
        const { comentarios } = notas(f, iniciales);
        decisiones[def.clave] = { valor: d, fecha, ...(def.clave === 'short' && d === CAMBIAR_SHORT ? { comentarios } : {}) };
      }
      continue;
    }
    if (!ESTADOS.includes(d)) {
      sinResolver.push(`${f.item}: «${d || 'vacía'}»`);
      continue;
    }
    const entrada = { estado: ESTADO_DE_DECISION[d], fecha, ...notas(f, iniciales) };
    if (f.item === FIGURAS) figuras['ACT-07'] = entrada;
    else if (!codigos.has(f.item)) errores.push(`El ítem ${f.item} no existe en el banco.`);
    else items[f.item] = { ...entrada, actividad: f.actividad, banda: f.banda, concepto: f.concepto };
  }
  if (sinResolver.length) {
    errores.push(
      `Quedan ${sinResolver.length} casos sin decisión final (resuélvanlos en reunión y escriban la decisión en la columna «decision»; ` +
        `para ítems: ${ESTADOS.join(', ')}):\n    ${sinResolver.join('\n    ')}`,
    );
  }
  if (errores.length) return { errores };

  const base = previa ?? { rondas: [], items: {}, figuras: {}, decisiones: {} };
  const revision = {
    ...base,
    rondas: [...(base.rondas ?? []), { fecha, revisores: [...revisores].map(([ini, nombre]) => ({ iniciales: ini, nombre })) }],
    items: { ...base.items, ...items },
    figuras: { ...base.figuras, ...figuras },
    decisiones: { ...base.decisiones, ...decisiones },
  };
  // Fichas cuya muestra se revisó en esta ronda.
  const actividades = unicos([...Object.values(items).map((i) => i.actividad), ...(figuras['ACT-07'] ? ['ACT-07'] : [])]).sort();
  const revisor = [...revisores.values()].join('; ');
  return { errores: [], revision, nuevos: { items, figuras, decisiones }, actividades, revisor, fecha };
}

// Anota revisor y fecha en la ficha sin cambiar el resto del texto ni su formato.
export function conRevisionClinica(texto, revisor, fecha) {
  const re = /"revisionClinica"\s*:\s*\{[^}]*\}/;
  if (!re.test(texto)) throw new Error('La ficha no tiene el campo «revisionClinica».');
  return texto.replace(re, `"revisionClinica": { "revisor": ${JSON.stringify(revisor)}, "fecha": ${JSON.stringify(fecha)} }`);
}

// Texto del resumen para la terminal.
export function resumenAplicacion({ nuevos, actividades, revisor, fecha }, totalItems) {
  const { items, figuras, decisiones } = nuevos;
  const de = (e) => Object.entries(items).filter(([, i]) => i.estado === e);
  const linea = ([codigo, i]) => {
    const det = [...i.problemas, ...i.comentarios].join(' · ');
    const concepto = i.problemas.some((p) => PROBLEMAS_DE_CONCEPTO.includes(p))
      ? ` → revisen si conviene retirar el concepto «${i.concepto}» en todas sus bandas (cambio en conceptos.json)`
      : '';
    return `  ${codigo}${det ? `: ${det}` : ''}${concepto}`;
  };
  const revisados = Object.keys(items).length;
  return [
    `Revisión del ${fecha}: ${revisor}`,
    `Ítems revisados: ${revisados} (aprobados ${de('aprobado').length}, por corregir ${de('corregir').length}, retirados ${de('retirado').length}).`,
    `Ítems de ACT-01 y ACT-02 sin revisión clínica (fuera de la muestra): ${totalItems - revisados}.`,
    ...(de('retirado').length ? ['Retirados (ya no se usan en las sesiones):', ...de('retirado').map(linea)] : []),
    ...(de('corregir').length ? ['Por corregir (siguen en las sesiones; cambiar la imagen o el ítem y volver a revisar):', ...de('corregir').map(linea)] : []),
    ...(figuras['ACT-07']
      ? [
          `Figuras de ACT-07: ${figuras['ACT-07'].estado}${[...figuras['ACT-07'].problemas, ...figuras['ACT-07'].comentarios].length ? ` (${[...figuras['ACT-07'].problemas, ...figuras['ACT-07'].comentarios].join(' · ')})` : ''}.`,
          ...(figuras['ACT-07'].estado !== 'aprobado' ? ['  Cambiar figuras o colores es una decisión clínica: se hace en la ficha ACT-07 («parejas»), no aquí.'] : []),
        ]
      : []),
    ...(Object.keys(decisiones).length
      ? ['Decisiones (se aplican aparte, en conceptos.json o en los pictogramas):', ...Object.entries(decisiones).map(([k, d]) => `  ${k}: ${d.valor}${d.comentarios?.length ? ` (${d.comentarios.join(' · ')})` : ''}`)]
      : []),
    `Fichas con la revisión anotada: ${actividades.join(', ')}.`,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.errores.length) {
    console.error(args.errores.join('\n'));
    console.error('Uso: node tools/aplicar-revision.mjs revision-consolidada.csv --revisor "AB=Nombre, profesión" --revisor "CD=Nombre, profesión" [--fecha AAAA-MM-DD] [--prueba]');
    process.exit(1);
  }
  const inputs = loadInputs();
  const banco = buildItems(inputs).filter((i) => i.actividad === 'ACT-01' || i.actividad === 'ACT-02');
  const r = aplicarRevision(readFileSync(args.archivo, 'utf8'), {
    revisores: args.revisores,
    fecha: args.fecha,
    codigos: new Set(banco.map((i) => i.codigo)),
    previa: inputs.revision,
  });
  if (r.errores.length) {
    console.error(`No se aplicó la revisión:\n  ${r.errores.join('\n  ')}`);
    process.exit(1);
  }
  console.log(resumenAplicacion(r, banco.length));
  if (args.prueba) {
    console.log('\nModo de prueba: no se escribió nada.');
  } else {
    writeFileSync(join(ROOT, 'items/revision.json'), JSON.stringify(r.revision, null, 2) + '\n');
    for (const id of r.actividades) {
      const ruta = join(ROOT, `fichas/${id}.json`);
      writeFileSync(ruta, conRevisionClinica(readFileSync(ruta, 'utf8'), r.revisor, r.fecha));
    }
    writeItems(loadInputs());
    console.log('\nEscritos: items/revision.json, las fichas anotadas e items/items.json.');
  }
}

