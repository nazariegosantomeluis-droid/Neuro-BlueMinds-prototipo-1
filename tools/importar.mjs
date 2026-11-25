// Importación de lotes en la computadora del investigador responsable (decisión D6).
//   node tools/importar.mjs --llaves <investigador-privadas.json> --base <carpeta> lote1.json [lote2.json …]
// Para cada lote: lo descifra, verifica sus sumas y la cadena de auditoría, descarta duplicados y
// guarda lo nuevo en <carpeta>/base.json (src/transporte/importacion.js). Escribe el recibo firmado
// en <carpeta>/recibos/: el terapeuta lo carga en la tableta y solo entonces la tableta borra los
// ensayos de ese lote. Un lote alterado, incompleto o de otra llave se rechaza entero y no deja
// recibo. Importar otra vez el mismo lote no cambia la base y deja el mismo recibo.
// <carpeta> debe estar en el almacenamiento institucional cifrado (Protocolo 9.5). También escribe
// ensayos.csv y sesiones.csv (la versión más reciente de cada sesión) para el análisis.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { importarLote, baseVacia, filasDe } from '../src/transporte/importacion.js';
import { toCSV, COLUMNS, SESION_COLUMNS } from '../src/engine/logger.js';

function argumentos(argv) {
  const a = { archivos: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--llaves') a.llaves = argv[++i];
    else if (argv[i] === '--base') a.base = argv[++i];
    else a.archivos.push(argv[i]);
  }
  return a;
}

const escribirSeguro = (ruta, texto) => {
  writeFileSync(`${ruta}.tmp`, texto);
  renameSync(`${ruta}.tmp`, ruta);
};

export async function importarArchivos({ llaves, base: carpeta, archivos }) {
  const p = JSON.parse(readFileSync(llaves, 'utf8'));
  const privadas = { cifrado: { privada: p.cifrado }, firma: { privada: p.firma } };
  mkdirSync(join(carpeta, 'recibos'), { recursive: true });
  const rutaBase = join(carpeta, 'base.json');
  const base = existsSync(rutaBase) ? JSON.parse(readFileSync(rutaBase, 'utf8')) : baseVacia();
  const resultados = [];
  for (const archivo of archivos) {
    try {
      const r = await importarLote(base, readFileSync(archivo, 'utf8'), privadas);
      // La base se guarda después de cada lote aceptado, antes de dar el recibo.
      escribirSeguro(rutaBase, JSON.stringify(base));
      const ruta = join(carpeta, 'recibos', `recibo-${r.recibo.lote_id}.json`);
      escribirSeguro(ruta, JSON.stringify(r.recibo, null, 2) + '\n');
      resultados.push({ archivo: basename(archivo), ok: true, lote_id: r.recibo.lote_id, nuevos: r.nuevos, duplicados: r.duplicados, versiones: r.versiones, repetido: r.repetido, recibo: ruta });
    } catch (e) {
      if (!e.rechazo) throw e;
      resultados.push({ archivo: basename(archivo), ok: false, motivo: e.message });
    }
  }
  escribirSeguro(join(carpeta, 'ensayos.csv'), toCSV(filasDe(base, 'ensayo'), COLUMNS));
  escribirSeguro(join(carpeta, 'sesiones.csv'), toCSV(filasDe(base, 'sesion'), SESION_COLUMNS));
  return resultados;
}

if (process.argv[1]?.endsWith('importar.mjs')) {
  const a = argumentos(process.argv.slice(2));
  if (!a.llaves || !a.base || !a.archivos.length) {
    console.error('Uso: node tools/importar.mjs --llaves <investigador-privadas.json> --base <carpeta> lote1.json [lote2.json …]');
    process.exit(1);
  }
  const rs = await importarArchivos(a);
  for (const r of rs) console.log(r.ok ? `${r.archivo}: ${r.repetido ? 'ya importado' : 'importado'} (${r.nuevos} nuevos, ${r.duplicados} duplicados, ${r.versiones} versiones nuevas de sesión); recibo en ${r.recibo}` : `${r.archivo}: RECHAZADO (${r.motivo})`);
  process.exitCode = rs.every((r) => r.ok) ? 0 : 2;
}
