// ACT-05 «Sonido e imagen»: los sonidos tienen la misma sonoridad y menos de 50 ms de silencio al
// inicio (tanda 2). La medida la hace tools/sonidos.mjs con ffmpeg; aquí se comprueba que la
// medida guardada cumple y que corresponde a los archivos del repositorio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { archivos, cumple, inicioMs, OBJETIVO_LUFS, TOLERANCIA_LU, PICO_MAX_DBTP, SILENCIO_MAX_MS } from '../tools/sonidos.mjs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url));
const medicion = JSON.parse(leer('docs/medicion-sonidos.json'));

test('la medida cubre los 24 sonidos y sigue el criterio de la herramienta', () => {
  assert.deepEqual(medicion.sonidos.map((s) => s.archivo), archivos());
  assert.equal(archivos().length, 24);
  assert.deepEqual(
    { ...medicion.criterio },
    { objetivoLufs: OBJETIVO_LUFS, toleranciaLu: TOLERANCIA_LU, picoMaxDbtp: PICO_MAX_DBTP, silencioMaxMs: SILENCIO_MAX_MS, ventanaMs: 5, bajoElMaximoDb: 20 },
  );
  assert.equal(SILENCIO_MAX_MS, 50);
});

test('cada sonido tiene −27 LUFS ± 1, pico de −3 dBTP o menos y empieza antes de 50 ms', () => {
  for (const s of medicion.sonidos) {
    assert.ok(Math.abs(s.lufs - OBJETIVO_LUFS) <= TOLERANCIA_LU, `${s.archivo}: ${s.lufs} LUFS`);
    assert.ok(s.picoDbtp <= PICO_MAX_DBTP, `${s.archivo}: pico ${s.picoDbtp} dBTP`);
    assert.ok(s.inicioMs < SILENCIO_MAX_MS, `${s.archivo}: empieza a ${s.inicioMs} ms`);
    assert.ok(s.duracionMs >= 1500 && s.duracionMs <= 2100, `${s.archivo}: dura ${s.duracionMs} ms`);
    assert.ok(cumple(s), s.archivo);
  }
  const lufs = medicion.sonidos.map((s) => s.lufs);
  assert.ok(Math.max(...lufs) - Math.min(...lufs) <= 2 * TOLERANCIA_LU, 'diferencia de sonoridad entre sonidos');
});

test('los archivos del repositorio son los que se midieron', () => {
  for (const s of medicion.sonidos) {
    assert.equal(createHash('sha256').update(leer(s.archivo)).digest('hex'), s.sha256, `${s.archivo} cambió: vuelve a correr node tools/sonidos.mjs`);
  }
});

test('el inicio ignora el ruido de fondo que está 20 dB o más por debajo del sonido', () => {
  const f = 44100;
  const tono = (ms, amp) => Array.from({ length: Math.round((ms / 1000) * f) }, (_, i) => amp * Math.sin((2 * Math.PI * 440 * i) / f));
  // 300 ms de ruido de fondo a 26 dB menos, como antes del ladrido de perro-2, y luego el sonido.
  const conFondo = Float32Array.from([...tono(300, 0.05), ...tono(500, 1)]);
  // La medida tiene la resolución de una ventana de 5 ms.
  assert.ok(Math.abs(inicioMs(conFondo, f) - 300) <= 5, String(inicioMs(conFondo, f)));
  // Con 40 ms de silencio antes del sonido, empieza a los 40 ms.
  const silencioYSonido = Float32Array.from([...new Array(Math.round(0.04 * f)).fill(0), ...tono(500, 1)]);
  assert.ok(Math.abs(inicioMs(silencioYSonido, f) - 40) <= 5, String(inicioMs(silencioYSonido, f)));
});

test('la ficha y las licencias dicen cómo quedaron los sonidos', () => {
  const ficha = JSON.parse(leer('fichas/ACT-05.json'));
  assert.match(ficha.notaPrototipo, /empieza antes de 50 ms.*−27 LUFS.*tools\/sonidos\.mjs/);
  const filas = leer('items/licencias.csv').toString().split('\n').filter((l) => l.startsWith('assets/audio/sonido-'));
  assert.equal(filas.length, 24);
  for (const l of filas) {
    assert.match(l, /sonoridad igualada a -27 LUFS/);
    assert.doesNotMatch(l, /RMS de -24 dBFS/);
  }
});
