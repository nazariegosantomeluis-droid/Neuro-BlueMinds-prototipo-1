// Genera items/items-posteriores.json: los ítems de las actividades de uso posterior que ya
// tienen prototipo (fichas/catalogo.json). Parte de items/conceptos.json y de la ficha de cada
// actividad. El azar usa semillas fijas: la misma entrada da el mismo banco.
// No toca items/items.json, que es el banco de las tres actividades del piloto.
// Uso: node tools/build-posteriores.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, seedOf, shuffle } from '../src/engine/selector.js';
import { ROOT, readJSON, imagePath, slug } from './build-items.mjs';

export const POSTERIORES = ['ACT-03', 'ACT-06', 'ACT-08', 'ACT-09', 'ACT-11', 'ACT-14'];
// El ejemplar 3 de cada concepto queda reservado para las sondas de generalización de ACT-02.
export const EJEMPLAR_RESERVADO = 3;
export const MOTIVO = 'Ítem de una actividad de uso posterior: es una propuesta y espera revisión clínica.';

const pad = (n) => String(n).padStart(2, '0');
const codigo = (ficha, banda, n) => `${ficha.id.replace('-', '')}-${banda.id}-${pad(n)}`;
const clash = (a, b) => a.id === b.id || a.excluir.includes(b.id) || b.excluir.includes(a.id);

// Elemento de un patrón: una figura con su color.
export const figura = (forma, color) => ({ id: `${forma}-${color}`, forma, color });

// Figura que sigue en una serie: cada dimensión repite su unidad.
export const siguiente = (formas, colores, n) => figura(formas[n % formas.length], colores[n % colores.length]);

export function buildPosteriores({ conceptos, categorias, fichas, image = imagePath }) {
  const byId = new Map(conceptos.map((c) => [c.id, c]));
  const catIds = categorias.map((c) => c.id);
  const items = [];
  const option = (c, ejemplar, correcta) => ({ id: `${c.id}-${ejemplar}`, concepto: c.id, ejemplar, src: image(c.id, ejemplar), correcta });
  const pendientes = (cs, extra = []) => [MOTIVO, ...extra, ...cs.filter((c) => c.pendiente).map((c) => `Incluye «${c.nombre}»: ${c.pendiente}`)];
  const push = (it, cs, extra) => items.push({ ...it, revisionPendiente: true, motivosRevision: pendientes(cs, extra) });
  const frase = (c) => `${c.articulo} ${c.nombre}`;

  // Distractores: `same` de la misma categoría y el resto de otras categorías, repartidos entre
  // ellas. Ningún par excluido aparece en la misma pantalla.
  function distractores(target, n, same, rand) {
    const chosen = [target];
    const fits = (c) => chosen.every((o) => !clash(o, c));
    const pool = shuffle(conceptos, rand);
    for (const c of pool) {
      if (chosen.length - 1 === same) break;
      if (c.categoria === target.categoria && fits(c)) chosen.push(c);
    }
    if (chosen.length - 1 !== same) throw new Error(`No hay ${same} distractores de la categoría de «${target.id}».`);
    const otras = shuffle(catIds.filter((id) => id !== target.categoria), rand);
    for (let vuelta = 0; chosen.length < n && vuelta < conceptos.length; vuelta++) {
      for (const cat of otras) {
        if (chosen.length === n) break;
        const c = pool.find((x) => x.categoria === cat && fits(x));
        if (c) chosen.push(c);
      }
    }
    if (chosen.length !== n) throw new Error(`No hay distractores suficientes para «${target.id}».`);
    return chosen.slice(1);
  }

  // Diez conceptos por banda, cerca de 2 por categoría y sin repetir concepto entre bandas.
  // Un concepto solo sirve de muestra en una banda si su categoría tiene suficientes
  // distractores compatibles con él (por ejemplo, «cabeza» excluye a seis partes del cuerpo).
  function muestrasPorBanda(ficha, rand) {
    const colas = Object.fromEntries(catIds.map((id) => [id, shuffle(conceptos.filter((c) => c.categoria === id), rand)]));
    const compatibles = (c) => conceptos.filter((x) => x.categoria === c.categoria && !clash(c, x)).length;
    return ficha.bandas.map((banda) => {
      const cats = shuffle(catIds, rand);
      return cats.flatMap((id, i) => {
        const cuantos = i < ficha.itemsPorBanda - catIds.length ? 2 : 1;
        const aptos = colas[id].filter((c) => compatibles(c) >= (banda.distractoresMismaCategoria ?? 0)).slice(0, cuantos);
        colas[id] = colas[id].filter((c) => !aptos.includes(c));
        return aptos;
      });
    });
  }

  // ---------- ACT-03: palabra escrita e imagen ----------
  {
    const f = fichas['ACT-03'];
    const rand = rng(seedOf('ACT-03'));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    for (const banda of f.bandas) {
      if (banda.frases) {
        f.frases.forEach((fr, i) => {
          const refs = [fr.objetivo, fr.mismoObjeto, fr.mismoColor, fr.otro];
          const cs = refs.map(([id]) => byId.get(id));
          push(
            {
              codigo: codigo(f, banda, i + 1),
              actividad: f.id,
              banda: banda.id,
              concepto: fr.objetivo[0],
              consigna: { tipo: 'texto', texto: fr.texto },
              opciones: refs.map(([id, ejemplar], k) => option(byId.get(id), ejemplar, k === 0)),
              muestraExpertos: true,
            },
            cs,
            ['Confirmar con los dibujos que cada color se reconoce sin dudar.'],
          );
        });
        continue;
      }
      // Muestra para expertos: 2 conceptos por categoría.
      const muestra = new Set(catIds.flatMap((id) => shuffle(conceptos.filter((c) => c.categoria === id), rand).slice(0, f.muestraExpertosPorBanda / catIds.length).map((c) => c.id)));
      conceptos.forEach((c, i) => {
        const ds = distractores(c, banda.opciones, banda.distractoresMismaCategoria, rand);
        push(
          {
            codigo: codigo(f, banda, i + 1),
            actividad: f.id,
            banda: banda.id,
            concepto: c.id,
            consigna: { tipo: 'texto', texto: c.nombre },
            opciones: [option(c, pick(f.ejemplares), true), ...ds.map((d) => option(d, pick(f.ejemplares), false))],
            muestraExpertos: muestra.has(c.id),
          },
          [c, ...ds],
        );
      });
    }
  }

  // ---------- ACT-06: clasifica por categoría ----------
  {
    const f = fichas['ACT-06'];
    const rand = rng(seedOf('ACT-06'));
    const emblemas = new Set(Object.values(f.emblemas).flat());
    const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
    const caja = (cat, correcta) => ({
      id: cat,
      categoria: cat,
      nombre: nombreCat.get(cat),
      emblemas: f.emblemas[cat].map((id) => `assets/picto/${id}.png`),
      correcta,
    });
    for (const banda of f.bandas) {
      const porCategoria = banda.opciones === 2 ? 5 : 4;
      let n = 0;
      banda.juegos.forEach((cats, juego) => {
        const cartas = cats.flatMap((cat) => {
          const deCat = conceptos.filter((c) => c.categoria === cat && !emblemas.has(c.id));
          const raros = deCat.filter((c) => f.pocoTipicos[cat].includes(c.id));
          const tipicos = shuffle(deCat.filter((c) => !f.pocoTipicos[cat].includes(c.id)), rand);
          // Poco típicos: primero los conceptos poco típicos y después el segundo ejemplar
          // (otro tipo o color) de los típicos.
          const elegidos = banda.tipicos
            ? tipicos.map((c) => ({ c, ejemplar: 1 }))
            : [...raros.map((c) => ({ c, ejemplar: 1 })), ...tipicos.map((c) => ({ c, ejemplar: 2 }))];
          if (elegidos.length < porCategoria) throw new Error(`ACT-06 ${banda.id}: faltan dibujos de «${cat}».`);
          return elegidos.slice(0, porCategoria).map((e) => ({ ...e, cat }));
        });
        for (const { c, ejemplar, cat } of shuffle(cartas, rand)) {
          n++;
          push(
            {
              codigo: codigo(f, banda, n),
              actividad: f.id,
              banda: banda.id,
              juego,
              concepto: c.id,
              ejemplar,
              consigna: { tipo: 'imagen', src: image(c.id, ejemplar), texto: f.consignaAV, audio: slug(f.consignaAV) },
              opciones: cats.map((id) => caja(id, id === cat)),
              muestraExpertos: juego === 0,
            },
            [c],
            banda.tipicos ? [] : ['Confirmar que el dibujo es poco típico de su categoría, pero pertenece a ella sin dudar.'],
          );
        }
      });
    }
  }

  // ---------- ACT-08: busca el objetivo ----------
  {
    const f = fichas['ACT-08'];
    const rand = rng(seedOf('ACT-08'));
    const muestras = muestrasPorBanda(f, rand);
    f.bandas.forEach((banda, b) => {
      muestras[b].forEach((c, i) => {
        const ds = distractores(c, banda.opciones, banda.distractoresMismaCategoria, rand);
        const plural = c.articulo === 'los' || c.articulo === 'las' ? 'plural' : 'singular';
        const texto = f.consignaAV[plural].replace('{concepto}', frase(c));
        push(
          {
            codigo: codigo(f, banda, i + 1),
            actividad: f.id,
            banda: banda.id,
            concepto: c.id,
            consigna: { tipo: 'imagen', src: image(c.id, f.ejemplar), texto, audio: slug(texto) },
            opciones: [option(c, f.ejemplar, true), ...ds.map((d) => option(d, f.ejemplar, false))],
            muestraExpertos: true,
          },
          [c, ...ds],
        );
      });
    });
  }

  // ---------- ACT-09: recuerda y encuentra ----------
  {
    const f = fichas['ACT-09'];
    const rand = rng(seedOf('ACT-09'));
    const muestras = muestrasPorBanda(f, rand);
    f.bandas.forEach((banda, b) => {
      muestras[b].forEach((c, i) => {
        const ds = distractores(c, banda.opciones, banda.distractoresMismaCategoria, rand);
        push(
          {
            codigo: codigo(f, banda, i + 1),
            actividad: f.id,
            banda: banda.id,
            concepto: c.id,
            consigna: { tipo: 'imagen', src: image(c.id, f.ejemplar), texto: f.consignaAV },
            opciones: [option(c, f.ejemplar, true), ...ds.map((d) => option(d, f.ejemplar, false))],
            muestraExpertos: true,
          },
          [c, ...ds],
        );
      });
    });
  }

  // ---------- ACT-11: completa el patrón ----------
  {
    const f = fichas['ACT-11'];
    const rand = rng(seedOf('ACT-11'));
    const dos = (arr) => shuffle(arr, rand).slice(0, 2);
    for (const banda of f.bandas) {
      for (let i = 0; i < f.itemsPorBanda; i++) {
        // Cuántas figuras se ven, por ítem («largos» en la ficha): así la respuesta correcta
        // cambia de lugar dentro de la unidad que se repite.
        const largo = banda.largos[i % banda.largos.length];
        let formas;
        let colores;
        let opciones;
        if (banda.patron === 'AB') {
          // Cambia la forma, el color o los dos, en ese orden a lo largo de la banda.
          const [f1, f2] = dos(f.figuras);
          const [c1, c2] = dos(f.colores);
          const tipo = ['forma', 'color', 'ambas'][i % 3];
          formas = tipo === 'color' ? [f1] : [f1, f2];
          colores = tipo === 'forma' ? [c1] : [c1, c2];
          opciones = [siguiente(formas, colores, 0), siguiente(formas, colores, 1)];
        } else if (banda.patron === 'AAB' || banda.patron === 'ABC') {
          // Tres figuras de forma distinta; el color se sortea para cada una.
          const [a, b, c] = shuffle(f.figuras, rand).map((forma) => figura(forma, dos(f.colores)[0]));
          const unidad = banda.patron === 'AAB' ? [a, a, b] : [a, b, c];
          formas = unidad.map((x) => x.forma);
          colores = unidad.map((x) => x.color);
          opciones = [a, b, c];
        } else {
          // Dos dimensiones: una se repite cada 2 lugares y la otra cada 3 (dos iguales y una distinta).
          const [f1, f2] = dos(f.figuras);
          const [c1, c2] = dos(f.colores);
          formas = i % 2 ? [f1, f1, f2] : [f1, f2];
          colores = i % 2 ? [c1, c2] : [c1, c1, c2];
          opciones = [f1, f2].flatMap((forma) => [c1, c2].map((color) => figura(forma, color)));
        }
        const serie = Array.from({ length: largo }, (_, k) => siguiente(formas, colores, k));
        const correcta = siguiente(formas, colores, largo);
        if (!opciones.some((o) => o.id === correcta.id) || new Set(opciones.map((o) => o.id)).size !== banda.opciones) {
          throw new Error(`ACT-11 ${banda.id}: opciones mal formadas en el ítem ${i + 1}.`);
        }
        push(
          {
            codigo: codigo(f, banda, i + 1),
            actividad: f.id,
            banda: banda.id,
            patron: banda.patron,
            consigna: { tipo: 'patron', serie, texto: f.consignaAV, audio: slug(f.consignaAV) },
            opciones: opciones.map((o) => ({ ...o, correcta: o.id === correcta.id })),
            muestraExpertos: true,
          },
          [],
        );
      }
    }
  }

  // ---------- ACT-14: reconoce la emoción ----------
  {
    const f = fichas['ACT-14'];
    const rand = rng(seedOf('ACT-14'));
    for (const banda of f.bandas) {
      // Cada personaje muestra cada emoción de la banda una vez.
      const pares = shuffle(f.personajes.flatMap((personaje) => banda.emociones.map((emocion) => ({ personaje, emocion }))), rand);
      // Muestra para expertos: 12 ítems, con las emociones repartidas por igual y sin repetir
      // personaje con la misma emoción.
      const porEmocion = 12 / banda.emociones.length;
      const cuenta = {};
      pares.forEach(({ personaje, emocion }, i) => {
        cuenta[emocion] = (cuenta[emocion] ?? 0) + 1;
        push(
          {
            codigo: codigo(f, banda, i + 1),
            actividad: f.id,
            banda: banda.id,
            emocion,
            personaje,
            consigna: { tipo: 'rostro', personaje, emocion, intensidad: banda.intensidad, texto: f.consignaAV, audio: slug(f.consignaAV) },
            opciones: banda.emociones.map((e) => ({ id: e, emocion: e, nombre: f.emociones[e], correcta: e === emocion })),
            muestraExpertos: cuenta[emocion] <= porEmocion,
          },
          [],
          ['Confirmar que la expresión se reconoce sin dudar y que no se confunde con otra de la banda.'],
        );
      });
    }
  }

  return items;
}

export function loadInputs() {
  const { conceptos, categorias } = readJSON('items/conceptos.json');
  const fichas = Object.fromEntries(POSTERIORES.map((id) => [id, readJSON(`fichas/${id}.json`)]));
  return { conceptos, categorias, fichas };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const items = buildPosteriores(loadInputs());
  const out = {
    version: '0.1.0',
    descripcion:
      'Ítems de las actividades de uso posterior, generados por tools/build-posteriores.mjs. No editar a mano: modificar conceptos.json o las fichas y regenerar. No forman parte del estudio piloto.',
    items,
  };
  writeFileSync(join(ROOT, 'items/items-posteriores.json'), JSON.stringify(out, null, 2) + '\n');
  const porActividad = POSTERIORES.map((id) => `${id}: ${items.filter((i) => i.actividad === id).length}`).join(', ');
  console.log(`Ítems de uso posterior: ${items.length} (${porActividad}).`);
}
