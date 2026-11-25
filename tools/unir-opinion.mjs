// Une los formularios de opinión de expertos (#opinion; tanda 10) y ordena los problemas.
//   node tools/unir-opinion.mjs opinion-*.csv
// Escribe en la carpeta actual:
// - opinion-problemas.csv: una fila por área con problemas, ordenadas por la gravedad más alta que
//   le dieron (impide usarla, importante, menor) y después por el número de expertos que la señalan;
//   con cuántos dijeron cada gravedad y lo que cambiarían;
// - opinion-areas.csv: por área, cuántos expertos dijeron sí, con problemas o no;
// - opinion-abiertas.csv: qué falta, qué sobra y si la usarían, de cada experto.
// Si un experto envió dos veces (mismas iniciales y profesión), cuenta la respuesta más reciente.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toCSV } from '../src/engine/logger.js';
import { AREAS, ABIERTAS, OPINION_COLUMNS, ORDEN_GRAVEDAD } from '../src/opinion-datos.js';
import { leerCSV } from './unir-revisiones.mjs';

export function unirOpiniones(textos) {
  const archivos = textos.map(leerCSV);
  if (archivos.some((f) => !f.length || !OPINION_COLUMNS.every((c) => c in f[0]))) throw new Error('Uno de los archivos no es un CSV del formulario de opinión.');
  const porExperto = new Map();
  for (const filas of archivos) {
    const e = filas[0];
    const clave = `${e.iniciales.trim().toUpperCase()}|${e.profesion}`;
    const previo = porExperto.get(clave);
    if (!previo || previo[0].fecha_utc < e.fecha_utc) porExperto.set(clave, filas);
  }
  const expertos = [...porExperto.values()].map((filas, k) => ({ id: `E${String(k + 1).padStart(2, '0')}`, ...filas[0], filas }));
  const areas = AREAS.map((a) => {
    const rs = expertos.map((e) => ({ e, r: e.filas.find((f) => f.tipo === 'area' && f.area === a.id) })).filter((x) => x.r);
    const cuenta = (campo, v) => rs.filter((x) => x.r[campo] === v).length;
    const conProblema = rs.filter((x) => x.r.funciona === 'con_problemas' || x.r.funciona === 'no');
    const maxima = conProblema.reduce((m, x) => Math.max(m, ORDEN_GRAVEDAD[x.r.gravedad] ?? 0), 0);
    return {
      area: a.id,
      nombre: a.nombre,
      expertos: rs.length,
      si: cuenta('funciona', 'si'),
      con_problemas: cuenta('funciona', 'con_problemas'),
      no: cuenta('funciona', 'no'),
      expertos_con_problema: conProblema.length,
      impide: conProblema.filter((x) => x.r.gravedad === 'impide').length,
      importante: conProblema.filter((x) => x.r.gravedad === 'importante').length,
      menor: conProblema.filter((x) => x.r.gravedad === 'menor').length,
      gravedad_maxima: Object.keys(ORDEN_GRAVEDAD).find((g) => ORDEN_GRAVEDAD[g] === maxima) ?? '',
      _maxima: maxima,
      cambios: rs.filter((x) => x.r.texto).map((x) => `${x.e.id} (${x.r.funciona}${x.r.gravedad ? `, ${x.r.gravedad}` : ''}): ${x.r.texto}`).join(' | '),
    };
  });
  const problemas = areas.filter((a) => a.expertos_con_problema > 0).sort((a, b) => b._maxima - a._maxima || b.expertos_con_problema - a.expertos_con_problema || b.impide - a.impide || b.importante - a.importante);
  const abiertas = expertos.flatMap((e) => ABIERTAS.map((q) => ({ experto: e.id, profesion: e.profesion, anios_experiencia: e.anios_experiencia, pregunta: q.id, texto: e.filas.find((f) => f.tipo === 'abierta' && f.area === q.id)?.texto ?? '' })).filter((x) => x.texto));
  const versiones = [...new Set(expertos.map((e) => `${e.version_app}${e.commit ? ` (${e.commit.slice(0, 7)})` : ''}`))];
  return { expertos, areas, problemas, abiertas, versiones };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const archivos = process.argv.slice(2);
  if (!archivos.length) {
    console.error('Uso: node tools/unir-opinion.mjs opinion-*.csv');
    process.exit(1);
  }
  const r = unirOpiniones(archivos.map((f) => readFileSync(f, 'utf8')));
  const COL_P = ['area', 'nombre', 'gravedad_maxima', 'expertos_con_problema', 'impide', 'importante', 'menor', 'expertos', 'cambios'];
  writeFileSync('opinion-problemas.csv', toCSV(r.problemas, COL_P));
  writeFileSync('opinion-areas.csv', toCSV(r.areas, ['area', 'nombre', 'expertos', 'si', 'con_problemas', 'no']));
  writeFileSync('opinion-abiertas.csv', toCSV(r.abiertas, ['experto', 'profesion', 'anios_experiencia', 'pregunta', 'texto']));
  console.log(`${r.expertos.length} expertos (versiones revisadas: ${r.versiones.join(', ')}). ${r.problemas.length} áreas con problemas; la primera: ${r.problemas[0]?.nombre ?? '—'}.`);
}
