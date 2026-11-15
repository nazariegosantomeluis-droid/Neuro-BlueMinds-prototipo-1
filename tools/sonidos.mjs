// Sonidos de ACT-05 «Sonido e imagen»: comprueba que tengan la misma sonoridad y menos de 50 ms
// de silencio al inicio, y los corrige.
//
// Medidas (con ffmpeg):
// - Sonoridad integrada (EBU R128, LUFS) y pico verdadero (dBTP), con el filtro ebur128.
// - Silencio inicial: se divide el audio en ventanas de 5 ms; el sonido empieza en la primera
//   ventana cuyo nivel RMS está a 20 dB o menos de la ventana más fuerte. Así no depende del
//   volumen de la grabación, y el ruido de fondo de las grabaciones de campo (a −40 o −45 dBFS
//   antes del ladrido o del mugido) no cuenta como inicio. Con 30 dB ese ruido sí contaba y el
//   ladrido de perro-2 empezaba a 360 ms aunque la medida dijera 45 ms.
//
// Corrección (--corregir), una sola vez sobre las grabaciones originales: recorta lo que hay
// antes de 15 ms del inicio, pone una entrada suave de 10 ms, ajusta la ganancia para llegar a
// OBJETIVO_LUFS y vuelve a codificar en MP3 mono de 44.1 kHz y 96 kbps. Las grabaciones duran
// entonces de 1.76 a 2.1 s. Ningún sonido pasa de PICO_MAX_DBTP: el objetivo de sonoridad se
// eligió para que el sonido con más picos (cepillo-de-dientes-2) lo cumpla.
//
// Margen: el MP3 guarda al inicio unos 26 ms de retardo del codificador que los navegadores
// quitan si leen la etiqueta LAME. Si alguno no la lee, el inicio queda en unos 15 + 26 = 41 ms,
// todavía por debajo de 50 ms.
//
// Escribe docs/medicion-sonidos.json con la medida y la huella SHA-256 de cada archivo.
// Necesita ffmpeg; no corre en la verificación de GitHub.
// Uso: node tools/sonidos.mjs [--corregir]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './build-items.mjs';

export const OBJETIVO_LUFS = -27;
export const TOLERANCIA_LU = 1;
export const PICO_MAX_DBTP = -3;
export const SILENCIO_MAX_MS = 50;
const VENTANA_MS = 5;
const BAJO_EL_MAXIMO_DB = 20;
const ANTES_DEL_INICIO_MS = 15;
const ENTRADA_MS = 10;

const ffmpeg = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { maxBuffer: 1 << 28 });
  if (r.error) throw new Error('Este script necesita ffmpeg.');
  return r;
};

export const archivos = () =>
  readdirSync(join(ROOT, 'assets/audio'))
    .filter((f) => /^sonido-.+\.mp3$/.test(f))
    .sort()
    .map((f) => `assets/audio/${f}`);

// Inicio del sonido, en ms, a partir de muestras en float.
export function inicioMs(muestras, frecuencia = 44100) {
  const w = Math.round((VENTANA_MS / 1000) * frecuencia);
  const niveles = [];
  for (let i = 0; i + w <= muestras.length; i += w) {
    let s = 0;
    for (let k = i; k < i + w; k++) s += muestras[k] ** 2;
    niveles.push(10 * Math.log10(s / w + 1e-24));
  }
  const umbral = Math.max(...niveles) - BAJO_EL_MAXIMO_DB;
  return niveles.findIndex((db) => db >= umbral) * VENTANA_MS;
}

function muestras(ruta) {
  const r = ffmpeg(['-v', 'error', '-i', ruta, '-f', 'f32le', '-ac', '1', '-ar', '44100', '-']);
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}

function sonoridad(ruta) {
  const salida = ffmpeg(['-i', ruta, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const resumen = salida.slice(salida.lastIndexOf('Summary:'));
  return {
    lufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(resumen)[1]),
    picoDbtp: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(resumen)[1]),
  };
}

export function medir(ruta) {
  const abs = join(ROOT, ruta);
  const m = muestras(abs);
  return {
    archivo: ruta,
    sha256: createHash('sha256').update(readFileSync(abs)).digest('hex'),
    duracionMs: Math.round((m.length / 44100) * 1000),
    inicioMs: inicioMs(m),
    ...sonoridad(abs),
  };
}

export const cumple = (m) =>
  m.inicioMs < SILENCIO_MAX_MS && Math.abs(m.lufs - OBJETIVO_LUFS) <= TOLERANCIA_LU && m.picoDbtp <= PICO_MAX_DBTP;

function corregir(ruta) {
  const abs = join(ROOT, ruta);
  const inicio = inicioMs(muestras(abs));
  const desde = Math.max(0, inicio - ANTES_DEL_INICIO_MS) / 1000;
  const tmp = `${abs}.tmp.wav`;
  ffmpeg(['-y', '-v', 'error', '-i', abs, '-ss', String(desde), '-af', `afade=t=in:d=${ENTRADA_MS / 1000}`, '-ac', '1', '-ar', '44100', tmp]);
  const { lufs } = sonoridad(tmp);
  const salida = `${abs}.tmp.mp3`;
  ffmpeg(['-y', '-v', 'error', '-i', tmp, '-af', `volume=${(OBJETIVO_LUFS - lufs).toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', '44100', salida]);
  renameSync(salida, abs);
  spawnSync('rm', ['-f', tmp]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--corregir')) for (const a of archivos()) corregir(a);
  const medidas = archivos().map(medir);
  const resultado = {
    criterio: { objetivoLufs: OBJETIVO_LUFS, toleranciaLu: TOLERANCIA_LU, picoMaxDbtp: PICO_MAX_DBTP, silencioMaxMs: SILENCIO_MAX_MS, ventanaMs: VENTANA_MS, bajoElMaximoDb: BAJO_EL_MAXIMO_DB },
    sonidos: medidas,
  };
  writeFileSync(join(ROOT, 'docs/medicion-sonidos.json'), JSON.stringify(resultado, null, 2) + '\n');
  const fallan = medidas.filter((m) => !cumple(m));
  for (const m of medidas) console.log(`${cumple(m) ? 'bien ' : 'FALLA'} ${m.archivo}: ${m.lufs} LUFS, pico ${m.picoDbtp} dBTP, inicio ${m.inicioMs} ms, ${m.duracionMs} ms`);
  if (fallan.length) {
    console.error(`${fallan.length} sonidos no cumplen. Corre: node tools/sonidos.mjs --corregir`);
    process.exitCode = 1;
  }
}
