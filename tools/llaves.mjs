// Llaves del investigador responsable (decisión D6). Las genera él, en su computadora, una vez antes
// del estudio:
//   node tools/llaves.mjs <carpeta privada>
// Escribe en esa carpeta (fuera del repositorio y del Drive compartido; Protocolo 9.5):
// - investigador-privadas.json: las dos llaves privadas (descifrar lotes y firmar recibos y
//   configuración). Quien la tenga puede leer los datos: se guarda cifrada y con respaldo.
// - investigador.json: las dos llaves públicas. Se copia a config/investigador.json del repositorio
//   antes de etiquetar la versión del estudio, y así queda fija con la versión congelada.
// Las de config/investigador.json en el repositorio son de prueba («prueba»: true): su privada está en
// test/fixtures/llaves-prueba.json, a la vista de todos. Con ellas la aplicación avisa que no se usen
// con datos reales.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generarLlaves, idDeLlave } from '../src/transporte/cripto.js';

export async function nuevasLlaves({ prueba = false } = {}) {
  const ll = await generarLlaves();
  const publicas = {
    descripcion: prueba
      ? 'Llaves PÚBLICAS DE PRUEBA del investigador. Su privada está en test/fixtures/llaves-prueba.json: no usar con datos reales.'
      : 'Llaves públicas del investigador responsable (tools/llaves.mjs).',
    prueba,
    creadas: new Date().toISOString().slice(0, 10),
    cifrado: { ...ll.cifrado.publica, id: idDeLlave(ll.cifrado.publica) },
    firma: { ...ll.firma.publica, id: idDeLlave(ll.firma.publica) },
  };
  return { publicas, privadas: { prueba, cifrado: ll.cifrado.privada, firma: ll.firma.privada } };
}

if (process.argv[1]?.endsWith('llaves.mjs')) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Uso: node tools/llaves.mjs <carpeta privada>');
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  const privadas = join(dir, 'investigador-privadas.json');
  if (existsSync(privadas)) {
    console.error(`Ya existe ${privadas}: no se reemplaza (los lotes exportados con la llave anterior no se podrían descifrar).`);
    process.exit(1);
  }
  const { publicas, privadas: p } = await nuevasLlaves();
  writeFileSync(privadas, JSON.stringify(p, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(join(dir, 'investigador.json'), JSON.stringify(publicas, null, 2) + '\n');
  console.log(`Llaves en ${dir}. Copia investigador.json a config/investigador.json del repositorio; guarda investigador-privadas.json cifrada y con respaldo.`);
}
