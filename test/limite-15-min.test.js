// Límite de 15 minutos (tanda 3, H2.5; INV-8): al llegar, la plataforma propone terminar y no
// empieza un bloque nuevo. Se prueba con un reloj simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planDeSesion, decidirPaso, limiteAlcanzado } from '../src/fases.js';
import { SESION_COLUMNS } from '../src/engine/logger.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const config = leer('fichas/sesion.json');
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, leer(`fichas/${id}.json`)]));
const MIN = 60_000;

// Recorre el plan con un reloj simulado: cada paso dura lo que diga «duracion». Devuelve lo que se hizo.
function correr(plan, duracion, { terminarEn = null } = {}) {
  let t = 0;
  let terminada = false;
  const hecho = [];
  for (const paso of plan) {
    const d = decidirPaso(paso, { usoMs: t, limiteMinutos: config.limiteMinutos, terminada });
    hecho.push(`${paso.tipo}${paso.actividad ? ` ${paso.actividad}` : ''}: ${d}`);
    if (d !== 'ejecutar') continue;
    t += duracion(paso);
    if (terminarEn && paso.tipo === 'bloque' && paso.actividad === terminarEn) terminada = true;
  }
  return { hecho, t };
}

const plan = planDeSesion({ modo: 'fase2', fichas, config, fase2: { version: 'protocolo', numero: 1, primera: 'V' } });
const dur = (minBloque) => (p) => (p.tipo === 'bloque' ? minBloque * MIN : p.tipo === 'referencia' ? 0.5 * MIN : 5000);

test('con bloques cortos, la sesión completa cabe en 15 minutos', () => {
  const { hecho, t } = correr(plan, dur(3));
  assert.ok(hecho.every((h) => h.endsWith('ejecutar')), hecho.join('\n'));
  assert.ok(t < 15 * MIN);
});

test('al llegar a 15 minutos no empieza otro bloque ni su transición; el cierre siempre se hace', () => {
  // Bloques de 7 minutos: el primero termina a los ~7.6, el segundo a los ~14.7; el tercero ya no.
  const { hecho } = correr(plan, dur(7.2));
  assert.deepEqual(hecho, [
    'rutina-inicio: ejecutar',
    'referencia: ejecutar',
    'bloque ACT-02: ejecutar',
    'transicion: ejecutar',
    'bloque ACT-02: ejecutar',
    'transicion: limite',
    'bloque ACT-07: limite',
    'rutina-cierre: ejecutar',
  ]);
});

test('un bloque que ya empezó termina aunque pase de los 15 minutos', () => {
  // El segundo bloque empieza a los 14.7 min y termina después de los 15: no se corta.
  const { hecho, t } = correr(plan, dur(7.3));
  assert.equal(hecho[4], 'bloque ACT-02: ejecutar');
  assert.ok(t > 15 * MIN);
});

test('si la sesión se terminó desde el menú, lo demás se omite, pero el cierre se hace', () => {
  const { hecho } = correr(plan, dur(2), { terminarEn: 'ACT-02' });
  assert.deepEqual(hecho.slice(3), ['transicion: omitir', 'bloque ACT-02: omitir', 'transicion: omitir', 'bloque ACT-07: omitir', 'rutina-cierre: ejecutar']);
});

test('el registro guarda el límite, los bloques omitidos y el tiempo de uso; el bloque suelto también lo respeta', () => {
  for (const c of ['limite_15_min', 'bloques_omitidos', 'duracion_uso_ms']) assert.ok(SESION_COLUMNS.includes(c), c);
  assert.equal(limiteAlcanzado(0, 15 * MIN), true);
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /decidirPaso\(paso, \{ usoMs: performance\.now\(\) - s\.inicioMs, limiteMinutos: cfg\.limiteMinutos, terminada: terminar \}\)/);
  assert.match(app, /motivo: decision === 'limite' \? 'limite_15_min' : 'sesion_terminada'/);
  // En la demostración: después de los 15 minutos, el inicio no deja empezar otro bloque y el
  // resumen no lo ofrece.
  assert.match(app, /limiteAlcanzado\(s\.inicioMs, performance\.now\(\), state\.sesion\?\.limiteMinutos \?\? 15\)\) \{\n\s+return renderInicio\(LIMITE_MSG\);/);
  assert.match(app, /\$\{s\.terminarSesion \|\| s\.limiteAlcanzado \? '' : '<button type="button" class="primario" id="otro">Otro bloque<\/button>'\}/);
});
