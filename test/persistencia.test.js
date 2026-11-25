// Persistencia de los datos mientras se usa el piloto sin servidor (tanda 10; hallazgo H-07;
// Arquitectura 9.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (r) => readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const app = leer('src/app.js');

test('pide almacenamiento persistente al navegador al crear o escribir el PIN y muestra si se concedió', () => {
  assert.match(app, /state\.persistente = \(await s\.persisted\(\)\) \|\| \(await s\.persist\(\)\);/);
  assert.equal(app.match(/recargarRegistros\(\);\n\s+pedirPersistencia\(\);/g).length, 2, 'al crear y al escribir el PIN');
  assert.match(app, /<p class="meta" data-persistencia>\$\{esc\(textoPersistencia\(\)\)\}<\/p>/);
  for (const t of ['Almacenamiento persistente: concedido', 'Almacenamiento persistente: no concedido', 'este navegador no lo permite']) assert.ok(app.includes(t), t);
});

test('avisa al terapeuta a los 7 días o más con registros sin exportar (Arquitectura 9.4)', async () => {
  const { DIAS_AVISO } = await import('../src/transporte/salida.js');
  assert.equal(DIAS_AVISO, 7);
  assert.match(app, /data-aviso-exportar>Pasaron \$\{aviso\.dias\} días sin exportar/);
});

