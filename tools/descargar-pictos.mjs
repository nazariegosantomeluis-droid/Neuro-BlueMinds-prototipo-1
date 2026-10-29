// Descarga una sola vez el pictograma de ARASAAC de cada concepto a
// assets/picto/<concepto>.png y anota su origen y licencia en items/licencias.csv.
// El identificador de cada pictograma está en items/conceptos.json («arasaac»).
// Ruta confirmada en la especificación oficial de la API (https://api.arasaac.org/arasaac_v1.json):
//   https://static.arasaac.org/pictograms/<id>/<id>_500.png
// Uso: node tools/descargar-pictos.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addMissing } from './licencias.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const { conceptos } = JSON.parse(readFileSync(join(ROOT, 'items/conceptos.json'), 'utf8'));
const url = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

// Observaciones de la revisión visual de cada pictograma.
const REVISION = {
  tortilla: ['revisar', 'En ARASAAC está etiquetado como «torta de maíz»; la imagen muestra tortillas de maíz apiladas.'],
  camion: ['pendiente', 'Provisional: autobús urbano. Si los expertos definen camión de carga, usar ARASAAC 2306.'],
  paleta: ['verificado', 'Paleta de dulce. Las tres fotografías deben ser de la misma forma.'],
  telefono: ['verificado', 'Teléfono celular.'],
};

mkdirSync(join(ROOT, 'assets/picto'), { recursive: true });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
let downloaded = 0;
for (const c of conceptos) {
  const file = join(ROOT, `assets/picto/${c.id}.png`);
  if (existsSync(file)) continue;
  const res = await fetch(url(c.arasaac));
  const data = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !data.subarray(0, 4).equals(PNG)) throw new Error(`No se pudo descargar el pictograma ${c.arasaac} (${c.id}).`);
  writeFileSync(file, data);
  downloaded++;
}

const added = addMissing(
  join(ROOT, 'items/licencias.csv'),
  conceptos.map((c) => {
    const [estado, notas] = REVISION[c.id] ?? ['verificado', ''];
    return {
      archivo: `assets/picto/${c.id}.png`,
      tipo: 'pictograma',
      concepto: c.id,
      ejemplar: '',
      origen: 'ARASAAC (http://www.arasaac.org)',
      autor: 'Sergio Palao',
      propietario: 'Gobierno de Aragón (España)',
      licencia: 'CC (BY-NC-SA)',
      id_origen: c.arasaac,
      url_origen: url(c.arasaac),
      estado,
      notas,
    };
  }),
);
console.log(`Pictogramas descargados: ${downloaded}. Filas nuevas en licencias.csv: ${added}.`);
