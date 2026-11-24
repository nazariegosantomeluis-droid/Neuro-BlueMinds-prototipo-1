// Registro de auditoría encadenado (H6.3; Arquitectura 10.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearAuditoria, nuevaEntrada, verificarCadena, huellaDeEntrada, ORIGEN, AUDITORIA_COLUMNS } from '../src/auditoria.js';
import { createLog } from '../src/engine/logger.js';
import { sha256, canonico } from '../src/huella.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

function cadena(n = 5) {
  const a = crearAuditoria(createLog(null, { key: 'x', columns: AUDITORIA_COLUMNS }));
  for (let i = 0; i < n; i++) a.agregar(i % 2 ? 'orden' : 'adaptacion', { sesion_id: 'S-1', i });
  return a;
}

test('cada entrada lleva la huella SHA-256 de la anterior y la suya', () => {
  const a = cadena(3);
  const [e1, e2, e3] = a.entradas();
  assert.equal(e1.anterior, ORIGEN);
  assert.equal(e2.anterior, e1.huella);
  assert.equal(e3.anterior, e2.huella);
  const { huella, ...resto } = e2;
  assert.equal(huella, sha256(canonico(resto)), 'huella = SHA-256 del JSON canónico sin la huella');
  assert.equal(huellaDeEntrada(e2), huella);
  assert.deepEqual(a.verificar(), { ok: true, rota_en: null, motivo: null, ultima: e3.huella });
});

test('alterar, quitar o reordenar una entrada rompe la cadena y se detecta', () => {
  const base = cadena(5).entradas();
  const alterada = base.map((e) => ({ ...e }));
  alterada[2].datos = { ...alterada[2].datos, i: 99 };
  assert.deepEqual([verificarCadena(alterada).ok, verificarCadena(alterada).rota_en], [false, 3]);
  // Recalcular la huella de la entrada alterada no basta: la siguiente apunta a la huella anterior.
  alterada[2].huella = huellaDeEntrada(alterada[2]);
  assert.deepEqual([verificarCadena(alterada).ok, verificarCadena(alterada).rota_en], [false, 4]);
  assert.equal(verificarCadena(base.filter((_, i) => i !== 1)).rota_en, 2, 'quitar una entrada');
  assert.equal(verificarCadena([base[0], base[2], base[1], base[3], base[4]]).ok, false, 'reordenar');
  assert.equal(verificarCadena(base.slice(0, 4)).ok, true, 'quitar la última no se detecta aquí: por eso la huella de la última va al servidor cada día (H7)');
});

test('solo se puede agregar: la interfaz no tiene editar ni borrar', () => {
  const a = cadena(1);
  assert.deepEqual(Object.keys(a).sort(), ['agregar', 'entradas', 'verificar']);
  const e = nuevaEntrada([], 'panel', { b: 1, a: 2 }, '2026-11-24T00:00:00.000Z');
  assert.deepEqual(Object.keys(e), ['n', 'hora', 'tipo', 'datos', 'anterior', 'version', 'huella']);
  assert.deepEqual(AUDITORIA_COLUMNS, Object.keys(e));
});

test('la aplicación registra lo que pide Arquitectura 10.1', () => {
  const app = leer('src/app.js');
  for (const tipo of ['inicio_sesion', 'adaptacion', 'orden', 'indicadores', 'borrado']) assert.match(app, new RegExp(`auditar\\('${tipo}'`), tipo);
  assert.match(leer('src/panel/panel-pantalla.js'), /auditar\('panel', \{/);
  assert.match(app, /const cadena = auditoria\.verificar\(\);/, 'se verifica al desbloquear');
  assert.match(app, /claves: \[[^\]]*AUDITORIA_KEY/, 'en el almacén cifrado');
  assert.match(app, /const registroAuditoria = createLog\(almacen\.storage, \{ key: AUDITORIA_KEY, columns: AUDITORIA_COLUMNS \}\);/);
  assert.match(app, /data-descargar="auditoria"/);
  // El borrado del registro no borra la auditoría.
  assert.doesNotMatch(app, /registroAuditoria\.clear\(\)/);
});
