import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkItems } from '../tools/check-items.mjs';
import { writeLicencias, readLicencias } from '../tools/licencias.mjs';

const SCRIPT = fileURLToPath(new URL('../tools/check-items.mjs', import.meta.url));

// Banco mínimo: un ítem con pictograma, una fotografía y un marcador.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nbm-check-'));
  const files = {
    'assets/picto/perro.png': 'png',
    'assets/img/perro/1.jpg': 'jpg',
    'assets/img/gato/1.svg': '<svg data-marcador="true"></svg>',
  };
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(join(root, f, '..'), { recursive: true });
    writeFileSync(join(root, f), content);
  }
  mkdirSync(join(root, 'items'));
  writeFileSync(
    join(root, 'items/items.json'),
    JSON.stringify({
      items: [
        {
          codigo: 'ACT02-B1-01',
          consigna: { src: 'assets/picto/perro.png', audio: 'donde-esta-el-perro' },
          opciones: [{ src: 'assets/img/perro/1.jpg' }, { src: 'assets/img/gato/1.svg' }],
        },
      ],
    }),
  );
  writeLicencias(join(root, 'items/licencias.csv'), Object.keys(files).map((archivo) => ({ archivo, notas: 'con, coma' })));
  return root;
}

const run = (root) => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });

test('sin errores, lista los marcadores en uso y los audios que faltan', () => {
  const root = fixture();
  const r = checkItems(root);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.placeholders, ['assets/img/gato/1.svg']);
  assert.deepEqual(r.missingAudio, ['assets/audio/donde-esta-el-perro.mp3']);
  assert.equal(run(root).status, 0);
  assert.equal(readLicencias(join(root, 'items/licencias.csv'))[0].notas, 'con, coma');
  rmSync(root, { recursive: true });
});

test('falla si falta un archivo', () => {
  const root = fixture();
  rmSync(join(root, 'assets/img/perro/1.jpg'));
  assert.ok(checkItems(root).errors.some((e) => e.includes('Falta el archivo assets/img/perro/1.jpg')));
  const cli = run(root);
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /assets\/img\/perro\/1\.jpg/);
  rmSync(root, { recursive: true });
});

test('falla si un archivo no tiene licencia', () => {
  const root = fixture();
  const csv = join(root, 'items/licencias.csv');
  writeFileSync(csv, readFileSync(csv, 'utf8').split('\n').filter((l) => !l.startsWith('assets/picto/perro.png')).join('\n'));
  writeFileSync(join(root, 'assets/img/perro/2.jpg'), 'jpg'); // en assets, aunque ningún ítem lo use
  const errors = checkItems(root).errors;
  assert.ok(errors.some((e) => e.includes('assets/picto/perro.png no tiene fila')));
  assert.ok(errors.some((e) => e.includes('assets/img/perro/2.jpg no tiene fila')));
  assert.equal(run(root).status, 1);
  rmSync(root, { recursive: true });
});

test('el banco del repositorio no tiene errores', () => {
  assert.deepEqual(checkItems().errors, []);
});
