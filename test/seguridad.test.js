// Revisión de seguridad (H8.5; OWASP MASVS, nivel básico, adaptado a la web; Arquitectura 9.5).
// Las comprobaciones automáticas de docs/verificacion/masvs.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const archivos = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : []));
const codigo = archivos('src').map((f) => [f, leer(f).replace(/^\s*\/\/.*$/gm, '')]);

test('MASVS-PLATFORM y MASVS-CODE: política de seguridad del contenido solo con recursos propios', () => {
  const html = leer('index.html');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
  assert.ok(csp, 'index.html declara la política');
  for (const d of ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "worker-src 'self'"]) assert.ok(csp.includes(d), d);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-(inline|eval)'/, 'sin scripts en línea ni eval');
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'index.html no tiene scripts en línea');
  assert.match(html, /<meta name="referrer" content="no-referrer" \/>/);
  assert.match(leer('src/app.js'), /if \(window\.top !== window\.self\) \{/, 'no corre dentro de un marco ajeno');
});

test('MASVS-CODE: sin eval, sin new Function, sin document.write y sin pedidos a otros sitios', () => {
  for (const [f, src] of codigo) {
    assert.doesNotMatch(src, /\beval\(|new Function\(|document\.write\(/, f);
    for (const m of src.matchAll(/fetch\(\s*([`'"])(.*?)\1/g)) assert.doesNotMatch(m[2], /^https?:|^\/\//, `${f}: fetch a ${m[2]}`);
  }
});

test('MASVS-STORAGE: los datos de niños solo van al almacén cifrado; localStorage, solo preferencias', () => {
  const app = leer('src/app.js');
  const claves = [...app.matchAll(/prefs\.(?:set|get)\('([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(claves)].sort(), ['nbm.cm', 'nbm.sesiones', 'nbm.volumen']);
  for (const [f, src] of codigo) {
    if (['src/almacen.js', 'src/engine/logger.js', 'src/app.js', 'src/f3.js', 'src/revision.js', 'src/modo-experto.js'].includes(f)) continue;
    assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB/, `${f} no guarda nada por su cuenta`);
  }
  // Sin registros en la consola (no dejan datos en los registros del navegador).
  for (const [f, src] of codigo) assert.doesNotMatch(src, /console\.(log|info|debug)\(/, f);
});

test('MASVS-PLATFORM: lo que escribe el terapeuta se muestra escapado (sin inyección de HTML)', async () => {
  const { registrosHTML } = await import('../src/registros-terapeuta.js');
  const { sesionHTML, historialDelNino } = await import('../src/panel/panel.js');
  const malo = '"><img src=x onerror=alert(1)>';
  const html = registrosHTML({ previo: { eventos_adversos: [{ hora: '10:00', descripcion: malo, medidas: malo, actividad: 'ACT-02', banda: 'B1' }] }, actividades: ['ACT-02'], bandas: ['B1'] });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  const plantillas = JSON.parse(leer('src/panel/plantillas.json'));
  const config = JSON.parse(leer('fichas/sesion.json'));
  const s = { sesion_id: 'S-1', codigo_nino: 'N', modo_fase: 'fase3', marcas_observacion: [{ actividad: 'ACT-02', indicador: 'A1', coincide: true, comentario: malo }] };
  const filas = Array.from({ length: 30 }, (_, i) => ({ sesion_id: 'S-1', codigo_nino: 'N', actividad: 'ACT-02', bloque: 1, ensayo: i + 1, item: `I${i}`, banda: 'B2', acierto: i % 3 > 0, omision: false, anticipatoria: false, interrumpido: false, perdida_foco: false, fallo_tecnico: false, tr_bruto_ms: 900 + i, peso_calidad: 1, t_opciones: 1000 * i, t_opciones_insercion: 1000 * i, n_opciones: 3, sonda: false }));
  const panel = sesionHTML(plantillas, historialDelNino({ codigo: 'N', sesiones: [s], ensayos: filas }), 0, { config });
  assert.doesNotMatch(panel, /<img src=x/);
});

test('MASVS-AUTH: PIN de 6 dígitos o más, freno de intentos y bloqueo por inactividad', () => {
  const almacen = leer('src/almacen.js');
  assert.match(almacen, /export const PIN_MINIMO = 6;/);
  assert.match(almacen, /export const INTENTOS_LIBRES = 5;/);
  assert.match(leer('src/bloqueo.js'), /export const INACTIVIDAD_MS = 5 \* 60 \* 1000;/);
  assert.match(leer('src/app.js'), /const espera = await almacen\.espera\(\);/);
});

test('MASVS-NETWORK: el trabajador de servicio solo atiende pedidos propios y nada sale del dispositivo', () => {
  assert.match(leer('sw.js'), /new URL\(req\.url\)\.origin !== self\.location\.origin\) return;/);
  for (const [f, src] of codigo) assert.doesNotMatch(src, /XMLHttpRequest|navigator\.sendBeacon|new WebSocket|EventSource\(/, f);
});

test('el informe de MASVS cubre cada grupo de controles', () => {
  const informe = leer('docs/verificacion/masvs.md');
  for (const g of ['MASVS-STORAGE', 'MASVS-CRYPTO', 'MASVS-AUTH', 'MASVS-NETWORK', 'MASVS-PLATFORM', 'MASVS-CODE', 'MASVS-RESILIENCE', 'MASVS-PRIVACY']) assert.match(informe, new RegExp(`## ${g}`), g);
});
