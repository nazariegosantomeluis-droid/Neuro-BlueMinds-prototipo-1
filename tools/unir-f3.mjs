// Une los formularios F3 de los expertos (archivos de «Descargar mis respuestas (CSV)») y calcula
// los índices de validez de contenido (Polit, Beck y Owen, 2007):
//   I-CVI = expertos que califican con 3 o 4 / expertos válidos
//   Pc = C(N, A) × 0.5^N;  κ* = (I-CVI − Pc) / (1 − Pc)
//   S-CVI/Ave = promedio del I-CVI de relevancia de las tres actividades
// Criterio: I-CVI ≥ 0.78 con 6 o más expertos (1.00 con 3 a 5; con menos de 3 no se decide); S-CVI/Ave ≥ 0.90.
// Uso: node tools/unir-f3.mjs f3-*.csv
// Escribe f3-indices.csv, f3-items.csv y f3-comentarios.csv en la carpeta actual.
import { readFileSync, writeFileSync } from 'node:fs';
import { toCSV } from '../src/engine/logger.js';
import { F3_COLUMNS, ACTIVIDADES_F3, DIMENSIONES, DISCIPLINAS_REQUERIDAS } from '../src/f3-datos.js';
import { leerCSV } from './unir-revisiones.mjs';

export const CRITERIO_SCVI = 0.9;
export const criterioICVI = (n) => (n >= 6 ? 0.78 : 1.0);

function combinaciones(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Índice de una pregunta a partir de las calificaciones (1 a 4) de los expertos válidos.
export function cvi(valores) {
  const v = valores.filter((x) => Number.isInteger(x) && x >= 1 && x <= 4);
  const n = v.length;
  if (!n) return null;
  const a = v.filter((x) => x >= 3).length;
  const icvi = a / n;
  const pc = combinaciones(n, a) * 0.5 ** n;
  const kappa = pc >= 1 ? null : (icvi - pc) / (1 - pc);
  return { n, a, icvi, pc, kappa };
}

export const lecturaKappa = (k) => (k == null ? '' : k > 0.74 ? 'excelente' : k >= 0.6 ? 'bueno' : k >= 0.4 ? 'regular' : 'bajo');

// Un experto entra en los índices si dio su consentimiento y no participa en el piloto ni tiene un familiar en él.
export const expertoValido = (e) => e.consentimiento === 'sí' && e.participa_piloto !== 'sí' && e.familiar_piloto !== 'sí';

export function unirF3(textos) {
  const archivos = textos.map(leerCSV);
  if (archivos.some((f) => !f.length || !F3_COLUMNS.every((c) => c in f[0]))) {
    throw new Error('Uno de los archivos no es un CSV del formulario F3.');
  }
  // Si un experto envió dos veces, cuenta la respuesta más reciente.
  const porExperto = new Map();
  for (const filas of archivos) {
    const e = filas[0];
    const clave = `${e.experto.trim().toLowerCase()}|${e.disciplina}`;
    const previo = porExperto.get(clave);
    if (!previo || previo[0].fecha_utc < e.fecha_utc) porExperto.set(clave, filas);
  }
  const expertos = [...porExperto.values()].map((filas, k) => ({ id: `E${String(k + 1).padStart(2, '0')}`, ...filas[0], filas }));
  const validos = expertos.filter(expertoValido);

  // Preguntas en el orden del primer archivo.
  const preguntas = [];
  const vistas = new Set();
  for (const f of expertos[0]?.filas ?? []) {
    if (f.tipo !== 'calificacion' && f.tipo !== 'general') continue;
    const clave = [f.tipo, f.actividad, f.dimension, f.banda].join('/');
    if (!vistas.has(clave)) vistas.add(clave), preguntas.push({ clave, tipo: f.tipo, actividad: f.actividad, dimension: f.dimension, banda: f.banda });
  }
  const valorDe = (e, q) => {
    const f = e.filas.find((x) => [x.tipo, x.actividad, x.dimension, x.banda].join('/') === q.clave);
    return f && f.valor !== '' ? Number(f.valor) : null;
  };

  const indices = preguntas.map((q) => {
    const r = cvi(validos.map((e) => valorDe(e, q)));
    const decide = q.tipo === 'calificacion' && q.dimension === 'relevancia';
    const pasa = r ? r.icvi >= criterioICVI(r.n) - 1e-9 : false;
    return {
      ...q,
      n: r?.n ?? 0,
      con_3_o_4: r?.a ?? 0,
      icvi: r ? +r.icvi.toFixed(2) : '',
      kappa: r?.kappa == null ? '' : +r.kappa.toFixed(2),
      lectura_kappa: lecturaKappa(r?.kappa),
      criterio: r ? criterioICVI(r.n) : '',
      decision: !r ? 'Sin datos' : r.n < 3 ? 'Faltan expertos' : decide ? (pasa ? 'Se acepta' : 'Corregir y recalificar') : pasa ? 'Sin cambios' : 'Revisar',
    };
  });

  const relevancias = ACTIVIDADES_F3.map((a) => indices.find((x) => x.tipo === 'calificacion' && x.actividad === a && x.dimension === 'relevancia'));
  const scvi = relevancias.every((x) => x && x.icvi !== '') ? relevancias.reduce((s, x) => s + x.icvi, 0) / relevancias.length : null;

  const items = new Map();
  for (const e of validos) {
    for (const f of e.filas.filter((x) => x.tipo === 'item')) {
      const it = items.get(f.item) ?? { item: f.item, actividad: f.actividad, veces: 0, problemas: [], propuestas: [] };
      it.veces++;
      if (f.problema) it.problemas.push(f.problema);
      if (f.comentario) it.propuestas.push(f.comentario);
      items.set(f.item, it);
    }
  }
  const listaItems = [...items.values()]
    .sort((a, b) => b.veces - a.veces || a.item.localeCompare(b.item))
    .map((it) => ({ ...it, decision: it.veces >= 2 ? 'Cambiar o retirar' : 'Revisar', problemas: it.problemas.join('; '), propuestas: it.propuestas.join(' | ') }));

  const comentarios = expertos.flatMap((e) =>
    e.filas.filter((f) => f.tipo === 'comentario').map((f) => ({ experto: e.id, disciplina: e.disciplina, valido: expertoValido(e) ? 'sí' : 'no', actividad: f.actividad, comentario: f.comentario })),
  );

  const disciplinas = DISCIPLINAS_REQUERIDAS.filter((d) => validos.some((e) => e.disciplina === d));
  return {
    expertos: expertos.map(({ filas, ...e }) => ({ ...e, valido: expertoValido(e) })),
    validos: validos.length,
    disciplinasCubiertas: disciplinas,
    disciplinasFaltantes: DISCIPLINAS_REQUERIDAS.filter((d) => !disciplinas.includes(d)),
    indices,
    scvi: scvi == null ? null : +scvi.toFixed(2),
    items: listaItems,
    comentarios,
  };
}

export function resumen(r) {
  const L = [];
  L.push(`Expertos: ${r.expertos.length} respuestas, ${r.validos} válidas para los índices (mínimo 6).`);
  for (const e of r.expertos.filter((x) => !x.valido)) L.push(`  Fuera de los índices: ${e.id} (${e.disciplina}): piloto=${e.participa_piloto}, familiar=${e.familiar_piloto}, consentimiento=${e.consentimiento}`);
  L.push(`Disciplinas requeridas cubiertas: ${r.disciplinasCubiertas.length} de 4${r.disciplinasFaltantes.length ? `; faltan: ${r.disciplinasFaltantes.join(', ')}` : ''}.`);
  for (const a of ACTIVIDADES_F3) {
    const rel = r.indices.find((x) => x.tipo === 'calificacion' && x.actividad === a && x.dimension === 'relevancia');
    const revisar = r.indices.filter((x) => x.actividad === a && x.dimension !== 'relevancia' && x.decision === 'Revisar').map((x) => (x.banda ? `${x.dimension} ${x.banda}` : x.dimension));
    L.push(`${a}: I-CVI de relevancia ${rel?.icvi ?? '—'} (κ* ${rel?.kappa ?? '—'}, ${rel?.lectura_kappa || '—'}) → ${rel?.decision ?? 'Sin datos'}${revisar.length ? `; revisar: ${revisar.join(', ')}` : ''}`);
  }
  L.push(`S-CVI/Ave de relevancia: ${r.scvi ?? '—'} (criterio ${CRITERIO_SCVI}) → ${r.scvi == null ? 'Sin datos' : r.scvi >= CRITERIO_SCVI ? 'cumple' : 'no cumple'}`);
  const cambiar = r.items.filter((x) => x.veces >= 2).length;
  L.push(`Ítems señalados: ${r.items.length}; señalados por 2 o más expertos: ${cambiar}.`);
  return L.join('\n');
}

const nombreDim = (d) => DIMENSIONES.find((x) => x.id === d)?.nombre ?? d;

// Línea de comandos.
if (process.argv[1]?.endsWith('unir-f3.mjs')) {
  const rutas = process.argv.slice(2);
  if (!rutas.length) {
    console.error('Uso: node tools/unir-f3.mjs f3-nombre-2026-11-30.csv [más archivos…]');
    process.exit(1);
  }
  const r = unirF3(rutas.map((p) => readFileSync(p, 'utf8')));
  writeFileSync(
    'f3-indices.csv',
    toCSV(
      r.indices.map((x) => ({ ...x, dimension: nombreDim(x.dimension) })),
      ['tipo', 'actividad', 'dimension', 'banda', 'n', 'con_3_o_4', 'icvi', 'kappa', 'lectura_kappa', 'criterio', 'decision'],
    ),
  );
  writeFileSync('f3-items.csv', toCSV(r.items, ['item', 'actividad', 'veces', 'decision', 'problemas', 'propuestas']));
  writeFileSync('f3-comentarios.csv', toCSV(r.comentarios, ['experto', 'disciplina', 'valido', 'actividad', 'comentario']));
  console.log(resumen(r));
  console.log('\nArchivos: f3-indices.csv, f3-items.csv, f3-comentarios.csv');
}
