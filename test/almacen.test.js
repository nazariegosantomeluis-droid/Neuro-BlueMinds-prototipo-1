// Almacén cifrado y bloqueo (H6.2; Arquitectura 9.3; RNF-06) y separación de la identidad (9.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearAlmacen, memoriaIDB, derivarLlave, cifrar, descifrar, pinValido, PBKDF2_ITERACIONES } from '../src/almacen.js';
import { crearInactividad, INACTIVIDAD_MS, RUTAS_SIN_DATOS } from '../src/bloqueo.js';
import { createLog } from '../src/engine/logger.js';
import { NINO_COLUMNS } from '../src/ninos.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const CLAVES = ['neuro-blueminds.registro', 'neuro-blueminds.sesiones', 'neuro-blueminds.ninos', 'neuro-blueminds.auditoria'];
// Para que las pruebas sean rápidas, salvo la de la llave real, se usan pocas iteraciones.
const RAPIDO = { iteraciones: 1000 };

// localStorage de una versión anterior, con registros sin cifrar.
function localStorageViejo(datos) {
  const m = new Map(Object.entries(datos));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
}

test('PBKDF2-SHA-256 con 600,000 iteraciones o más y AES-GCM de 256 bits', async () => {
  assert.ok(PBKDF2_ITERACIONES >= 600000);
  const db = memoriaIDB();
  const a = crearAlmacen({ db, claves: CLAVES });
  const t0 = performance.now();
  await a.crearPin('482915');
  const meta = db.mapa.get('__meta__');
  assert.equal(meta.iteraciones, 600000, 'la llave real usa las 600,000 iteraciones');
  assert.equal(Buffer.from(meta.sal, 'base64').length, 16);
  assert.ok(!JSON.stringify(meta).includes('482915'), 'el PIN nunca se guarda');
  assert.ok(performance.now() - t0 > 20, 'derivar la llave cuesta tiempo (frena los intentos)');
  const llave = await derivarLlave('482915', Buffer.from(meta.sal, 'base64'), 1000);
  assert.equal(llave.algorithm.name, 'AES-GCM');
  assert.equal(llave.algorithm.length, 256);
  assert.equal(llave.extractable, false, 'la llave no se puede exportar');
});

test('sin el PIN, lo que hay en IndexedDB no se lee; con el PIN, sí', async () => {
  const db = memoriaIDB();
  const a = crearAlmacen({ db, claves: CLAVES });
  await a.crearPin('482915', RAPIDO);
  const ninos = createLog(a.storage, { key: 'neuro-blueminds.ninos', columns: NINO_COLUMNS });
  ninos.add({ codigo: 'A1B2C3D4E5F60718293A4B5C6D7E8F90', icono: 'rombo', color: 'rojo', edad_meses: 70, consentimiento: 'vigente' });
  await a.listo();
  const guardado = JSON.stringify([...db.mapa.values()]);
  assert.doesNotMatch(guardado, /A1B2C3D4E5F6|rombo|vigente|edad_meses/, 'nada en claro en IndexedDB');
  assert.ok(db.mapa.get('neuro-blueminds.ninos').iv && db.mapa.get('neuro-blueminds.ninos').datos);
  // Otra instancia (otra vez que se abre la página): sin PIN, nada.
  const b = crearAlmacen({ db, claves: CLAVES });
  assert.equal(await b.configurado(), true);
  assert.equal(b.storage.getItem('neuro-blueminds.ninos'), null);
  assert.throws(() => b.storage.setItem('neuro-blueminds.ninos', '[]'), /bloqueado/);
  assert.equal(await b.desbloquear('000000'), false, 'PIN equivocado');
  assert.equal(b.desbloqueado, false);
  assert.equal(await b.desbloquear('482915'), true);
  const otra = createLog(b.storage, { key: 'neuro-blueminds.ninos', columns: NINO_COLUMNS });
  assert.equal(otra.rows()[0].codigo, 'A1B2C3D4E5F60718293A4B5C6D7E8F90');
  // Bloquear olvida la llave y la copia en memoria.
  await b.bloquear();
  otra.recargar();
  assert.deepEqual(otra.rows(), []);
});

test('cada valor cifrado con su clave como dato autenticado: no se puede cambiar de lugar ni alterar', async () => {
  const llave = await derivarLlave('482915', new Uint8Array(16), 1000);
  const sobre = await cifrar(llave, 'neuro-blueminds.ninos', '[1]');
  assert.equal(await descifrar(llave, 'neuro-blueminds.ninos', sobre), '[1]');
  await assert.rejects(descifrar(llave, 'neuro-blueminds.registro', sobre), 'con otra clave no descifra');
  const datos = Buffer.from(sobre.datos, 'base64');
  datos[0] ^= 1;
  await assert.rejects(descifrar(llave, 'neuro-blueminds.ninos', { ...sobre, datos: datos.toString('base64') }), 'alterado no descifra');
  const otro = await cifrar(llave, 'neuro-blueminds.ninos', '[1]');
  assert.notEqual(otro.iv, sobre.iv, 'vector inicial nuevo cada vez');
});

test('al crear el PIN, los registros sin cifrar de versiones anteriores pasan al almacén y se borran de localStorage', async () => {
  const viejo = localStorageViejo({ 'neuro-blueminds.registro': '[{"ensayo":1}]', 'neuro-blueminds.sesiones': '[{"sesion_id":"S-1"}]', 'nbm.cm': '37.8' });
  const db = memoriaIDB();
  const a = crearAlmacen({ db, claves: CLAVES });
  await a.crearPin('482915', { ...RAPIDO, previo: viejo });
  assert.equal(a.storage.getItem('neuro-blueminds.registro'), '[{"ensayo":1}]');
  assert.equal(viejo.getItem('neuro-blueminds.registro'), null);
  assert.equal(viejo.getItem('neuro-blueminds.sesiones'), null);
  assert.equal(viejo.getItem('nbm.cm'), '37.8', 'las preferencias sin datos de niños se quedan');
  await assert.rejects(a.crearPin('111111', RAPIDO), /ya existe/);
  assert.ok(!pinValido('12345') && !pinValido('abcdef') && pinValido('123456'));
});

test('bloqueo tras 5 minutos sin uso, nunca con la pantalla del niño a la vista', () => {
  assert.equal(INACTIVIDAD_MS, 5 * 60 * 1000);
  let t = 0;
  let nino = false;
  let bloqueos = 0;
  const i = crearInactividad({ ahora: () => t, puedeBloquear: () => !nino, alBloquear: () => bloqueos++ });
  t = 4 * 60 * 1000;
  assert.equal(i.revisar(), false);
  i.tocar();
  t += 5 * 60 * 1000 - 1;
  assert.equal(i.revisar(), false);
  nino = true; // empieza la sesión del niño: la cuenta no avanza
  t += 20 * 60 * 1000;
  assert.equal(i.revisar(), false);
  nino = false; // vuelve el adulto: la cuenta empieza de nuevo
  t += 4 * 60 * 1000;
  assert.equal(i.revisar(), false);
  t += 60 * 1000;
  assert.equal(i.revisar(), true);
  assert.equal(bloqueos, 1);
});

test('la aplicación usa el almacén cifrado para todos los registros y pide el PIN en las pantallas con datos', () => {
  const app = leer('src/app.js');
  for (const k of ['REGISTRO_KEY', 'SESION_KEY', 'NINO_KEY']) assert.match(app, new RegExp(`claves: \\[[^\\]]*${k}`));
  for (const k of ['const log = createLog(almacen.storage)', 'const sesiones = createLog(almacen.storage', 'const ninos = createLog(almacen.storage']) assert.ok(app.includes(k), k);
  assert.doesNotMatch(app, /createLog\(\)|createLog\(undefined/);
  assert.match(app, /if \(!almacen\.desbloqueado && !RUTAS_SIN_DATOS\.has\(ruta\)\) return pedirPin\(\);/);
  assert.deepEqual([...RUTAS_SIN_DATOS].sort(), ['calibracion', 'creditos', 'formulario', 'galeria', 'pausa', 'revision']);
  assert.match(app, /puedeBloquear: \(\) => almacen\.desbloqueado && !state\.running && !app\.querySelector\('\.nino'\)/);
});

test('la correspondencia entre el código del niño y su identidad nunca está en la tableta (Arquitectura 9.1; RNF-07)', () => {
  assert.deepEqual(NINO_COLUMNS, ['codigo', 'icono', 'color', 'edad_meses', 'consentimiento', 'video', 'modo_fase', 'bandas']);
  for (const c of NINO_COLUMNS) assert.doesNotMatch(c, /nombre|apellido|nacimiento|curp|telefono|correo|direccion|tutor|expediente|foto/);
  assert.match(leer('README.md'), /La correspondencia entre el código del niño y su identidad nunca está en la tableta/);
});

test('H8.5: después de 5 PIN equivocados, espera creciente guardada en IndexedDB (recargar no la reinicia)', async () => {
  let t = 1_000_000;
  const db = memoriaIDB();
  const a = crearAlmacen({ db, claves: CLAVES, ahora: () => t });
  await a.crearPin('482915', RAPIDO);
  const { esperaTrasFallos, INTENTOS_LIBRES } = await import('../src/almacen.js');
  assert.deepEqual([4, 5, 6, 7, 20].map(esperaTrasFallos), [0, 30000, 60000, 120000, 15 * 60000]);
  assert.equal(INTENTOS_LIBRES, 5);
  const b = crearAlmacen({ db, claves: CLAVES, ahora: () => t });
  for (let i = 0; i < 4; i++) assert.equal(await b.desbloquear('000000'), false);
  assert.equal(await b.espera(), 0, 'con 4 fallos todavía no hay espera');
  assert.equal(await b.desbloquear('000000'), false);
  assert.equal(await b.espera(), 30000);
  // Otra instancia (la página recargada) ve la misma espera; ni el PIN correcto entra.
  const c = crearAlmacen({ db, claves: CLAVES, ahora: () => t });
  assert.equal(await c.espera(), 30000);
  assert.equal(await c.desbloquear('482915'), false);
  t += 30001;
  assert.equal(await c.desbloquear('482915'), true);
  assert.equal(await c.espera(), 0, 'el PIN correcto reinicia la cuenta');
});
