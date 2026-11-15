// Genera items/items.json a partir de items/conceptos.json y de las reglas de bandas
// de cada ficha. El azar usa semillas fijas: la misma entrada da el mismo banco.
// También crea los marcadores provisionales que falten en assets/img/ y su fila en
// items/licencias.csv.
// Uso: node tools/build-items.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, seedOf, shuffle } from '../src/engine/selector.js';
import { addMissing } from './licencias.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'webp'];
const EJEMPLARES = [1, 2, 3];

export const readJSON = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

// Imagen del ejemplar n: la fotografía si ya existe; si no, el marcador SVG.
export function imagePath(concepto, n, exists = (p) => existsSync(join(ROOT, p))) {
  for (const ext of PHOTO_EXT) {
    const p = `assets/img/${concepto}/${n}.${ext}`;
    if (exists(p)) return p;
  }
  return `assets/img/${concepto}/${n}.svg`;
}

// Clave de audio a partir del texto: "¿Dónde está el perro?" → "donde-esta-el-perro".
export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const pad = (n) => String(n).padStart(2, '0');

// Estado de revisión clínica de un ítem de ACT-01 o ACT-02, según items/revision.json.
// Los ítems que no se han revisado quedan «sin-revisar».
export const estadoDe = (revision, codigo) => revision?.items?.[codigo]?.estado ?? 'sin-revisar';

export function buildItems({ conceptos, categorias, fichas, revision, image = imagePath }) {
  const catIds = categorias.map((c) => c.id);
  const clash = (a, b) => a.id === b.id || a.excluir.includes(b.id) || b.excluir.includes(a.id);
  const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];

  // Distractores: `same` de la misma categoría y el resto de otras categorías, distintas
  // entre sí. Ningún par excluido aparece en la misma pantalla.
  function distractors(target, n, same, rand, { otherColor = false } = {}) {
    const chosen = [target];
    const fits = (c) => chosen.every((o) => !clash(o, c));
    const pool = shuffle(conceptos, rand);
    for (const c of pool) {
      if (chosen.length - 1 === same) break;
      if (c.categoria === target.categoria && fits(c)) chosen.push(c);
    }
    for (const c of pool) {
      if (chosen.length === n) break;
      const taken = chosen.map((o) => o.categoria);
      if (!taken.includes(c.categoria) && fits(c) && (!otherColor || c.color !== target.color)) chosen.push(c);
    }
    if (chosen.length !== n) throw new Error(`No hay distractores suficientes para «${target.id}».`);
    return chosen.slice(1);
  }

  // Motivos para que un clínico revise el ítem antes de darlo por bueno.
  function reasons(options, extra = []) {
    const out = [...extra];
    for (const c of options) if (c.pendiente) out.push(`Incluye «${c.nombre}»: ${c.pendiente}`);
    return out;
  }

  const option = (c, ejemplar, correcta) => ({ id: `${c.id}-${ejemplar}`, concepto: c.id, ejemplar, src: image(c.id, ejemplar), correcta });
  const items = [];

  // ACT-01: 10 muestras por banda, cerca de 2 por categoría y sin repetir concepto entre bandas.
  const f1 = fichas['ACT-01'];
  const r1 = rng(seedOf('ACT-01'));
  const queues = Object.fromEntries(catIds.map((id) => [id, shuffle(conceptos.filter((c) => c.categoria === id), r1)]));
  for (const banda of f1.bandas) {
    const cats = shuffle(catIds, r1);
    const muestras = cats.flatMap((id, i) => queues[id].splice(0, i < f1.itemsPorBanda - catIds.length ? 2 : 1));
    muestras.forEach((c, i) => {
      const ds = distractors(c, banda.opciones, banda.distractoresMismaCategoria, r1, { otherColor: banda.distractorOtroColor });
      const extra = banda.distractorOtroColor ? ['Confirmar con la fotografía que el distractor es de otro color.'] : [];
      const motivos = reasons([c, ...ds], extra);
      items.push({
        codigo: `ACT01-${banda.id}-${pad(i + 1)}`,
        actividad: f1.id,
        banda: banda.id,
        concepto: c.id,
        consigna: { tipo: 'imagen', src: image(c.id, f1.ejemplar), texto: f1.consignaAV, audio: slug(f1.consignaAV) },
        opciones: [option(c, f1.ejemplar, true), ...ds.map((d) => option(d, f1.ejemplar, false))],
        muestraExpertos: true,
        revisionPendiente: motivos.length > 0,
        motivosRevision: motivos,
      });
    });
  }

  // ACT-02: un ítem por concepto y por banda; el número del código sigue el orden de conceptos.json.
  const f2 = fichas['ACT-02'];
  const r2 = rng(seedOf('ACT-02'));
  const ej = f2.ejemplaresPractica; // el ejemplar de generalización nunca entra en los ensayos normales
  // Muestra para expertos: 10 por banda, 2 por categoría en cuatro categorías y 1 en las otras
  // dos, con ambas mitades representadas; se prefieren conceptos que no estén en otra muestra.
  const sampleQueues = {};
  for (const id of catIds) for (const m of ['A', 'B']) {
    sampleQueues[`${id}${m}`] = shuffle(conceptos.filter((c) => c.categoria === id && c.mitad === m), r2);
  }
  for (const banda of f2.bandas) {
    const cats = shuffle(catIds, r2);
    const doubles = f2.muestraExpertosPorBanda - catIds.length;
    const sample = new Set(
      cats.flatMap((id, i) => {
        const halves = i < doubles ? ['A', 'B'] : [(i - doubles) % 2 ? 'B' : 'A'];
        return halves.map((m) => sampleQueues[`${id}${m}`].shift().id);
      }),
    );
    const extra = banda.parecidoVisual ? ['Confirmar que los distractores de la misma categoría son de aspecto parecido.'] : [];
    conceptos.forEach((c, i) => {
      const ds = distractors(c, banda.opciones, banda.distractoresMismaCategoria, r2);
      const motivos = reasons([c, ...ds], extra);
      const articulo = c.articulo === 'los' || c.articulo === 'las' ? 'plural' : 'singular';
      const texto = f2.consignaAV[articulo].replace('{concepto}', `${c.articulo} ${c.nombre}`);
      items.push({
        codigo: `ACT02-${banda.id}-${pad(i + 1)}`,
        actividad: f2.id,
        banda: banda.id,
        concepto: c.id,
        mitad: c.mitad,
        consigna: { tipo: 'pictograma', src: `assets/picto/${c.id}.png`, texto, audio: slug(texto) },
        opciones: [option(c, pick(ej, r2), true), ...ds.map((d) => option(d, pick(ej, r2), false))],
        muestraExpertos: sample.has(c.id),
        revisionPendiente: motivos.length > 0,
        motivosRevision: motivos,
      });
    });
  }
  // La revisión clínica se aplica a los ítems con imágenes; las secuencias de ACT-07 no se
  // revisan una por una (sus figuras se revisan en conjunto, ver items/revision.json).
  for (const it of items) it.estadoRevision = estadoDe(revision, it.codigo);
  items.push(...buildRuleSequences(fichas['ACT-07']));
  return items;
}

// Caja que corresponde a la tarjeta según la regla. La tarjeta tiene la forma de una caja
// y el color de la otra: { forma: 1, color: 2 } o { forma: 2, color: 1 }.
export const cajaCorrecta = (tarjeta, regla) => (regla === 'forma' ? tarjeta.forma : tarjeta.color);

// Racha más larga de valores iguales seguidos.
export function maxRun(xs) {
  let best = 0;
  let run = 0;
  xs.forEach((x, i) => {
    run = i && x === xs[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// ACT-07: secuencias de ensayos predefinidas por banda, con semilla fija.
// Las cajas no cambian de lugar; la pareja de figuras se elige por sesión en la aplicación.
export function buildRuleSequences(ficha, semilla = ficha.semilla) {
  const rand = rng(seedOf(`ACT-07:${semilla}`));
  const [a, b] = ficha.dimensiones;
  const n = ficha.ensayosPorSecuencia;
  const items = [];

  // Reglas de cada tipo de secuencia: una sola regla, cambio a la mitad o mezcladas.
  function reglas(tipo, proporcion) {
    if (tipo === 'mezcla') {
      // Cambios entre ensayos consecutivos: redondeo al azar de proporción × (n − 1), así cada
      // secuencia queda a menos de 1/(n − 1) de la proporción buscada.
      const k = Math.floor(proporcion * (n - 1) + rand());
      const switches = new Set(shuffle([...Array(n - 1).keys()].map((i) => i + 1), rand).slice(0, k));
      const out = [rand() < 0.5 ? a : b];
      for (let i = 1; i < n; i++) out.push(switches.has(i) ? (out[i - 1] === a ? b : a) : out[i - 1]);
      return out;
    }
    const [first, second = first] = tipo.split('>');
    return Array.from({ length: n }, (_, i) => (i < n / 2 ? first : second));
  }

  // Tarjetas al azar, cuidando que la caja correcta no se repita más de 3 veces seguidas
  // y que cada caja sea la correcta en 4 a 6 de los 10 ensayos.
  function tarjetas(rs) {
    for (;;) {
      const ts = rs.map(() => (rand() < 0.5 ? { forma: 1, color: 2 } : { forma: 2, color: 1 }));
      const cajas = rs.map((r, i) => cajaCorrecta(ts[i], r));
      const izquierda = cajas.filter((c) => c === 1).length;
      if (maxRun(cajas) <= 3 && Math.abs(izquierda - n / 2) <= 1) return ts;
    }
  }

  const TIPOS = {
    ninguno: () => Array.from({ length: 10 }, (_, i) => (i % 2 ? b : a)),
    mitad: () => [a, b, a, b, a, b, `${a}>${b}`, `${b}>${a}`, `${a}>${b}`, `${b}>${a}`],
    mezclado: () => Array(10).fill('mezcla'),
  };
  for (const banda of ficha.bandas) {
    TIPOS[banda.cambio]().slice(0, ficha.itemsPorBanda).forEach((tipo, i) => {
      const codigo = `ACT07-${banda.id}-${pad(i + 1)}`;
      const rs = reglas(tipo, banda.proporcionCambio);
      const ts = tarjetas(rs);
      items.push({
        codigo,
        actividad: ficha.id,
        banda: banda.id,
        tipo,
        ensayos: rs.map((regla, k) => ({
          codigo: `${codigo}-${pad(k + 1)}`,
          regla,
          tarjeta: ts[k],
          caja: cajaCorrecta(ts[k], regla),
          consigna: { texto: ficha.consignaAV[regla], audio: slug(ficha.consignaAV[regla]) },
        })),
        muestraExpertos: true,
        revisionPendiente: false,
        motivosRevision: [],
      });
    });
  }
  return items;
}

// Marcador provisional: fondo gris, nombre del concepto y número de ejemplar.
export function placeholderSVG(nombre, n) {
  const size = Math.min(40, Math.floor(700 / nombre.length));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" data-marcador="true" role="img" aria-label="${nombre}, ejemplar ${n} pendiente">
  <rect width="400" height="400" fill="#c8c8c8"/>
  <text x="200" y="185" font-family="system-ui, sans-serif" font-size="${size}" text-anchor="middle" fill="#333">${nombre}</text>
  <text x="200" y="240" font-family="system-ui, sans-serif" font-size="24" text-anchor="middle" fill="#333">EJEMPLAR ${n} PENDIENTE</text>
</svg>
`;
}

export function loadInputs() {
  const { conceptos, categorias } = readJSON('items/conceptos.json');
  const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, readJSON(`fichas/${id}.json`)]));
  const revision = readJSON('items/revision.json');
  return { conceptos, categorias, fichas, revision };
}

// Escribe items/items.json a partir de las entradas. Devuelve los ítems.
export function writeItems(inputs = loadInputs()) {
  const items = buildItems(inputs);
  const out = {
    version: '0.1.0',
    descripcion: 'Banco de ítems generado por tools/build-items.mjs. No editar a mano: modificar conceptos.json, las fichas o revision.json y regenerar.',
    items,
  };
  writeFileSync(join(ROOT, 'items/items.json'), JSON.stringify(out, null, 2) + '\n');
  return items;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputs = loadInputs();
  const rows = [];
  let created = 0;
  for (const c of inputs.conceptos) {
    for (const n of EJEMPLARES) {
      const p = imagePath(c.id, n);
      if (!p.endsWith('.svg')) continue; // ya hay fotografía
      if (!existsSync(join(ROOT, p))) {
        mkdirSync(join(ROOT, `assets/img/${c.id}`), { recursive: true });
        writeFileSync(join(ROOT, p), placeholderSVG(c.nombre, n));
        created++;
      }
      rows.push({
        archivo: p,
        tipo: 'imagen',
        concepto: c.id,
        ejemplar: n,
        origen: 'Marcador provisional del proyecto',
        autor: 'Equipo Neuro-BlueMinds',
        propietario: 'Luis Nazariego Santome y equipo Neuro-BlueMinds',
        licencia: 'Todos los derechos reservados',
        estado: 'marcador',
        notas: n === 3 ? 'Reservado para sondas de generalización. Reemplazar por una fotografía real con licencia libre.' : 'Reemplazar por una fotografía real con licencia libre.',
      });
    }
  }
  const added = addMissing(join(ROOT, 'items/licencias.csv'), rows);
  const items = writeItems(inputs);
  console.log(`Ítems: ${items.length}. Marcadores creados: ${created}. Filas nuevas en licencias.csv: ${added}.`);
}
