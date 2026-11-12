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

export const POSTERIORES = ['ACT-03', 'ACT-04', 'ACT-05', 'ACT-06', 'ACT-08', 'ACT-09', 'ACT-10', 'ACT-11', 'ACT-12', 'ACT-13', 'ACT-14', 'ACT-15', 'ACT-16'];
// Audio en silencio para los pasos 2 en adelante de una secuencia en AV: la instrucción se dice una vez.
export const SILENCIO = 'silencio';
// El ejemplar 3 de cada concepto queda reservado para las sondas de generalización de ACT-02.
export const EJEMPLAR_RESERVADO = 3;
export const MOTIVO = 'Ítem de una actividad de uso posterior: es una propuesta y espera revisión clínica.';

const pad = (n) => String(n).padStart(2, '0');
// Código de cada ensayo de un ítem que agrupa varios: ACT12-B1-03-07.
const codigoDe = (item, n) => `${item}-${pad(n)}`;
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

  // ---------- ACT-04: oración e imagen ----------
  // Cada opción es una escena (dibujada con código, con recortes del banco). En una pantalla la
  // persona se ve siempre igual: el mismo «look» para el niño y para la niña de ese ítem.
  {
    const f = fichas['ACT-04'];
    const rand = rng(seedOf('ACT-04'));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const recorte = (id) => ({ concepto: id, src: `assets/escenas/${id}.png` });
    const SUJETO = { nina: 'La niña', nino: 'El niño' };
    const RELACION = { dentro: 'dentro de', arriba: 'arriba de', abajo: 'abajo de', lado: 'al lado de' };
    const REFERENCIA = { caja: 'la caja', mesa: 'la mesa' };
    const indefinido = (c) => `${c.articulo === 'la' ? 'una' : 'un'} ${c.nombre}`;
    const aObjeto = (c) => (c.articulo === 'el' ? `al ${c.nombre}` : `a ${c.articulo} ${c.nombre}`);
    const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);
    // Escena y oración de una acción. objeto: id del concepto, si la oración lo nombra.
    const accion = (sujeto, look, a, objeto = null, { negada = false, nombrar = true } = {}) => {
      const def = f.acciones[a];
      // Si la oración no nombra el objeto, la escena lleva uno de la acción (lo que come, a quién abraza).
      const obj = objeto ?? def.objeto ?? (def.objetos ? pick(def.objetos) : null);
      const c = obj ? byId.get(obj) : null;
      const complemento = nombrar && objeto ? ` ${a === 'abraza' ? aObjeto(c) : indefinido(c)}` : '';
      return {
        id: `${sujeto}-${a}${obj ? `-${obj}` : ''}`,
        escena: { tipo: 'accion', sujeto, look, accion: a, ...(obj ? { objeto: recorte(obj) } : {}) },
        texto: `${SUJETO[sujeto]}${negada ? ' no' : ''} ${def.verbo}${complemento}.`,
      };
    };
    const lugarDe = (figura, referencia, relacion) => {
      const c = byId.get(figura);
      return {
        id: `${figura}-${referencia}-${relacion}`,
        escena: { tipo: 'lugar', figura: recorte(figura), referencia, relacion },
        texto: `${mayuscula(c.articulo)} ${c.nombre} está ${RELACION[relacion]} ${REFERENCIA[referencia]}.`,
      };
    };
    const opcion = (o, correcta) => ({ id: o.id, escena: o.escena, texto: o.texto, correcta });
    const otro = (s) => (s === 'nina' ? 'nino' : 'nina');
    const looks = () => ({ nina: Math.floor(rand() * 4), nino: Math.floor(rand() * 4) });
    for (const banda of f.bandas) {
      let n = 0;
      const agrega = (texto, opciones, extra = {}) => {
        push(
          {
            codigo: codigo(f, banda, ++n),
            actividad: f.id,
            banda: banda.id,
            estructura: banda.estructura,
            consigna: { tipo: 'oracion', texto, audio: slug(texto), ...extra },
            opciones,
            muestraExpertos: n <= f.muestraExpertosPorBanda,
          },
          [],
          ['Confirmar con los clínicos que cada escena se entiende sin dudar y que la oración solo describe una de ellas.'],
        );
      };
      if (banda.estructura === 'sujeto-verbo' || banda.estructura === 'negacion') {
        for (const sujeto of ['nina', 'nino']) {
          for (const a of f.sinObjeto) {
            const look = looks()[sujeto];
            const b = pick(f.sinObjeto.filter((x) => x !== a));
            const negada = banda.estructura === 'negacion';
            const objetivo = accion(sujeto, look, a, null, { negada });
            const distractor = accion(sujeto, look, b);
            // Negación: la correcta es la escena que no hace la acción nombrada.
            const opciones = negada ? [opcion(accion(sujeto, look, a), false), opcion(distractor, true)] : [opcion(objetivo, true), opcion(distractor, false)];
            agrega(objetivo.texto, opciones);
          }
        }
      } else if (banda.estructura === 'sujeto-verbo-objeto') {
        for (const sujeto of ['nina', 'nino']) {
          for (const a of f.conObjeto) {
            for (const obj of f.acciones[a].objetos) {
              const l = looks();
              const b = f.conObjeto.find((x) => x !== a);
              const objetivo = accion(sujeto, l[sujeto], a, obj);
              const opciones = [
                opcion(objetivo, true),
                opcion(accion(sujeto, l[sujeto], a, pick(f.acciones[a].objetos.filter((x) => x !== obj))), false),
                opcion(accion(otro(sujeto), l[otro(sujeto)], a, obj), false),
                opcion(accion(sujeto, l[sujeto], b, pick(f.acciones[b].objetos)), false),
              ];
              agrega(objetivo.texto, opciones);
            }
          }
        }
      } else if (banda.estructura === 'lugar') {
        for (const figura of f.figuras) {
          for (const [referencia, relaciones] of Object.entries(f.lugares)) {
            const rel = pick(relaciones);
            const objetivo = lugarDe(figura, referencia, rel);
            agrega(objetivo.texto, relaciones.map((r) => opcion(lugarDe(figura, referencia, r), r === rel)));
          }
        }
      } else {
        // Verificación: una escena de las otras bandas y una oración que la dice o que cambia una parte.
        for (let k = 0; k < f.verificaciones; k++) {
          const verdadera = k % 2 === 0;
          const tipo = ['sv', 'svo', 'lugar'][k % 3];
          let escena;
          let texto;
          if (tipo === 'lugar') {
            const figura = pick(f.figuras);
            const [referencia, relaciones] = pick(Object.entries(f.lugares));
            const rel = pick(relaciones);
            escena = lugarDe(figura, referencia, rel).escena;
            texto = lugarDe(figura, referencia, verdadera ? rel : pick(relaciones.filter((r) => r !== rel))).texto;
          } else if (tipo === 'svo') {
            const sujeto = pick(['nina', 'nino']);
            const a = pick(f.conObjeto);
            const obj = pick(f.acciones[a].objetos);
            escena = accion(sujeto, looks()[sujeto], a, obj).escena;
            texto = accion(sujeto, 0, a, verdadera ? obj : pick(f.acciones[a].objetos.filter((x) => x !== obj))).texto;
          } else {
            const sujeto = pick(['nina', 'nino']);
            const a = pick(f.sinObjeto);
            escena = accion(sujeto, looks()[sujeto], a).escena;
            texto = accion(verdadera ? sujeto : pick(['nina', 'nino']), 0, verdadera ? a : pick(f.sinObjeto.filter((x) => x !== a))).texto;
          }
          agrega(texto, [{ id: 'si', simbolo: 'si', correcta: verdadera }, { id: 'no', simbolo: 'no', correcta: !verdadera }], { escena, verdadera });
        }
      }
    }
  }

  // ---------- ACT-05: sonido e imagen ----------
  // Un ítem por grabación y banda. Las opciones son dibujos de conceptos que también tienen
  // sonido: nunca un distractor que «no suena».
  {
    const f = fichas['ACT-05'];
    const rand = rng(seedOf('ACT-05'));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const conSonido = Object.keys(f.sonidos).map((id) => byId.get(id));
    const grupo = (c) => f.sonidos[c.id];
    for (const banda of f.bandas) {
      let n = 0;
      for (const c of conSonido) {
        for (let g = 1; g <= f.grabacionesPorSonido; g++) {
          const pool = conSonido.filter((x) => x !== c && !clash(x, c) && (banda.mismoGrupo ? grupo(x) === grupo(c) : grupo(x) !== grupo(c)));
          // Sin grupo propio, cada distractor de un grupo distinto; con grupo, todos del mismo.
          const ds = [];
          for (const x of shuffle(pool, rand)) {
            if (ds.length === banda.opciones - 1) break;
            if (banda.mismoGrupo || ds.every((d) => grupo(d) !== grupo(x))) ds.push(x);
          }
          if (ds.length < banda.opciones - 1) continue; // no hay suficientes sonidos parecidos (objetos en B3)
          const audio = `sonido-${c.id}-${g}`;
          push(
            {
              codigo: codigo(f, banda, ++n),
              actividad: f.id,
              banda: banda.id,
              concepto: c.id,
              grabacion: g,
              consigna: { tipo: 'sonido', texto: f.consignaAV, audio },
              opciones: [option(c, pick(f.ejemplares), true), ...ds.map((d) => option(d, pick(f.ejemplares), false))],
              muestraExpertos: g === 1 && n <= f.muestraExpertosPorBanda * 2,
            },
            [c, ...ds],
            ['Escuchar el sonido con los clínicos: que se reconozca, que corresponda al dibujo y que no moleste.'],
          );
        }
      }
    }
  }

  // ---------- ACT-15: sonidos de las palabras ----------
  {
    const f = fichas['ACT-15'];
    const rand = rng(seedOf('ACT-15'));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const rimaDe = (id) => f.rimas.find((g) => g.includes(id)) ?? [];
    const inicioDe = (id) => Object.entries(f.inicios).find(([, ids]) => ids.includes(id))?.[0] ?? null;
    const usables = conceptos.filter((c) => !c.pendiente);
    // Distractores que no riman con la palabra ni empiezan con su misma sílaba.
    const ajenos = (id, otros) => usables.filter((x) => x.id !== id && !rimaDe(id).includes(x.id) && inicioDe(x.id) !== inicioDe(id) && otros.every((o) => !clash(o, x) && o.id !== x.id));
    const opcion = (c, correcta) => option(c, pick(f.ejemplares), correcta);
    for (const banda of f.bandas) {
      let n = 0;
      const agrega = (it, cs) =>
        push({ codigo: codigo(f, banda, ++n), actividad: f.id, banda: banda.id, ...it, muestraExpertos: n <= f.muestraExpertosPorBanda }, cs, [
          'Confirmar con los clínicos las palabras y que la voz del navegador las dice con claridad.',
        ]);
      if (banda.tarea === 'rima') {
        for (const grupoRima of f.rimas) {
          for (const id of grupoRima) {
            const c = byId.get(id);
            const correcto = byId.get(pick(grupoRima.filter((x) => x !== id)));
            const mismoInicio = usables.filter((x) => x.id !== id && inicioDe(x.id) && inicioDe(x.id) === inicioDe(id) && !grupoRima.includes(x.id));
            const ds = [];
            if (banda.opciones === 3 && mismoInicio.length) ds.push(pick(mismoInicio));
            while (ds.length < banda.opciones - 1) ds.push(pick(ajenos(id, [correcto, ...ds])));
            const texto = `¿Cuál rima con ${c.nombre}?`;
            agrega({ concepto: id, tarea: 'rima', consigna: { tipo: 'palabra', texto, audio: slug(texto) }, opciones: [opcion(correcto, true), ...ds.map((d) => opcion(d, false))] }, [correcto, ...ds]);
          }
        }
      } else if (banda.tarea === 'inicio') {
        for (const [silaba, ids] of Object.entries(f.inicios)) {
          for (const id of ids) {
            const c = byId.get(id);
            const correcto = byId.get(pick(ids.filter((x) => x !== id)));
            const ds = [];
            while (ds.length < banda.opciones - 1) ds.push(pick(ajenos(id, [correcto, ...ds])));
            const texto = `¿Cuál empieza como ${c.nombre}?`;
            agrega({ concepto: id, tarea: 'inicio', silaba, consigna: { tipo: 'palabra', texto, audio: slug(texto) }, opciones: [opcion(correcto, true), ...ds.map((d) => opcion(d, false))] }, [correcto, ...ds]);
          }
        }
      } else {
        // Igual o diferente: cada par se dice una vez distinto y una vez igual (con su primera palabra).
        for (const [a, b] of f.pares) {
          for (const igual of [false, true]) {
            const mayuscula = (w) => w[0].toUpperCase() + w.slice(1);
            const texto = `¿Suenan igual? ${mayuscula(a)}. ${mayuscula(igual ? a : b)}.`;
            agrega(
              {
                tarea: 'igual',
                palabras: [a, igual ? a : b],
                consigna: { tipo: 'palabra', texto, audio: slug(texto) },
                opciones: [
                  { id: 'igual', simbolo: 'igual', correcta: igual },
                  { id: 'diferente', simbolo: 'diferente', correcta: !igual },
                ],
              },
              [],
            );
          }
        }
      }
    }
  }

  // ---------- Secuencias por pasos (ACT-10 y ACT-16) ----------
  // tarjetas: en el orden en que se ven (revueltas); «orden» es su lugar en la secuencia, o null si
  // sobra. Cada paso es un ensayo: el niño elige entre las tarjetas que quedan la que va en el
  // siguiente lugar. Si al final queda una sola tarjeta de la secuencia y ninguna sobra, pasa sola
  // a su lugar (autoColocar) y no hay ensayo.
  const pasosDe = (cod, tarjetas, { texto, audio }) => {
    const enOrden = tarjetas.filter((t) => t.orden !== null).sort((a, b) => a.orden - b.orden);
    const sobran = tarjetas.some((t) => t.orden === null);
    const total = sobran ? enOrden.length : enOrden.length - 1;
    return enOrden.slice(0, total).map((t, k) => ({
      codigo: `${cod}-${k + 1}`,
      paso: k + 1,
      total,
      colocadas: enOrden.slice(0, k).map((x) => x.id),
      consigna: k === 0 ? { tipo: 'secuencia', texto, audio } : { tipo: 'secuencia', texto: '', audio: SILENCIO },
      opciones: tarjetas.filter((x) => !enOrden.slice(0, k).includes(x)).map((x) => ({ id: x.id, correcta: x === t })),
      ...(k === total - 1 && !sobran ? { autoColocar: enOrden.at(-1).id } : {}),
    }));
  };
  // Revuelve las tarjetas; con 3 o más, nunca quedan ya en orden.
  const revolver = (tarjetas, rand) => {
    for (;;) {
      const r = shuffle(tarjetas, rand);
      if (tarjetas.length < 3 || r.some((t, i) => t.orden !== i + 1)) return r;
    }
  };

  // ---------- ACT-10: ordena la secuencia ----------
  {
    const f = fichas['ACT-10'];
    const rand = rng(seedOf('ACT-10'));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    for (const banda of f.bandas) {
      let n = 0;
      // V: los momentos de una historia dibujada con código.
      for (const historia of f.historias) {
        const tarjetas = banda.momentos.map((momento, i) => ({ id: `${historia}-${momento}`, historia, momento, orden: i + 1 }));
        for (let k = 0; k < f.ordenesPorHistoria; k++) {
          const cod = codigo(f, banda, ++n);
          const vistas = revolver(tarjetas, rand);
          push(
            {
              codigo: cod,
              actividad: f.id,
              banda: banda.id,
              tipo: 'historia',
              modalidad: 'V',
              historia,
              tarjetas: vistas,
              ensayos: pasosDe(cod, vistas, { texto: '', audio: null }),
              muestraExpertos: k === 0 && n <= f.muestraExpertosPorBanda * f.ordenesPorHistoria,
            },
            [],
            ['Confirmar que cada momento se reconoce y que el orden de la historia no tiene otra lectura.'],
          );
        }
      }
      // AV: una instrucción hablada de varios pasos con dibujos del banco.
      for (let k = 0; k < f.instruccionesPorBanda; k++) {
        const cod = codigo(f, banda, ++n);
        const elegidos = [];
        for (const c of shuffle(conceptos, rand)) {
          if (elegidos.length === banda.elementos) break;
          if (!c.pendiente && elegidos.every((o) => !clash(o, c) && o.categoria !== c.categoria)) elegidos.push(c);
        }
        const tarjetas = elegidos.map((c, i) => {
          const ejemplar = pick(f.ejemplares);
          return { id: `${c.id}-${ejemplar}`, concepto: c.id, ejemplar, src: image(c.id, ejemplar), orden: i + 1 };
        });
        const nombres = elegidos.map(frase);
        const texto =
          nombres.length === 2
            ? `Toca ${nombres[0]} y después ${nombres[1]}.`
            : `Toca ${nombres.slice(0, -1).join(', ')} y al final ${nombres.at(-1)}.`;
        const vistas = revolver(tarjetas, rand);
        push(
          {
            codigo: cod,
            actividad: f.id,
            banda: banda.id,
            tipo: 'instrucciones',
            modalidad: 'AV',
            consigna: { tipo: 'secuencia', texto, audio: slug(texto) },
            tarjetas: vistas,
            ensayos: pasosDe(cod, vistas, { texto, audio: slug(texto) }),
            muestraExpertos: k < f.muestraExpertosPorBanda / 2,
          },
          elegidos,
          ['Confirmar que la instrucción se entiende con la voz del navegador hasta tener la voz grabada.'],
        );
      }
    }
  }

  // ---------- ACT-16: forma la palabra ----------
  {
    const f = fichas['ACT-16'];
    const rand = rng(seedOf('ACT-16'));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const frases = fichas['ACT-03'].frases.filter((fr) => !byId.get(fr.objetivo[0]).pendiente);
    for (const banda of f.bandas) {
      let n = 0;
      const lista =
        banda.unidad === 'palabra'
          ? frases.map((fr) => {
              const c = byId.get(fr.objetivo[0]);
              return { concepto: c.id, ejemplar: fr.objetivo[1], texto: `${c.articulo} ${fr.texto}`, unidades: [c.articulo, ...fr.texto.split(' ')] };
            })
          : banda.unidad === 'letra'
            ? f.palabras[banda.id].map((p) => ({ concepto: byId.has(p) ? p : null, texto: p, unidades: [...p] }))
            : f.palabras[banda.id].map(([id, ...unidades]) => ({ concepto: id, texto: unidades.join(''), unidades }));
      // Las piezas que sobran: sílabas de otras palabras de la banda, letras de la lista de la ficha
      // o colores de otras frases. Nunca repiten una pieza de la palabra.
      const sobrantes = (w) => {
        const pool =
          banda.unidad === 'letra'
            ? [...f.letrasSobrantes]
            : banda.unidad === 'palabra'
              ? [...new Set(lista.map((x) => x.unidades.at(-1)))]
              : [...new Set(lista.flatMap((x) => x.unidades))];
        return shuffle(pool.filter((u) => !w.unidades.includes(u)), rand).slice(0, banda.piezas - w.unidades.length);
      };
      for (const w of lista) {
        const c = byId.get(w.concepto);
        if (!c) throw new Error(`ACT-16: «${w.texto}» no es un concepto del banco.`);
        if (new Set(w.unidades).size !== w.unidades.length) throw new Error(`ACT-16: «${w.texto}» repite una pieza.`);
        const cod = codigo(f, banda, ++n);
        const ejemplar = w.ejemplar ?? pick(f.ejemplares);
        const tarjetas = [
          ...w.unidades.map((u, i) => ({ id: `${banda.unidad}-${u}`, texto: u, orden: i + 1 })),
          ...sobrantes(w).map((u) => ({ id: `${banda.unidad}-${u}`, texto: u, orden: null })),
        ];
        const vistas = revolver(tarjetas, rand);
        const texto = banda.unidad === 'palabra' ? w.texto : c.nombre;
        push(
          {
            codigo: cod,
            actividad: f.id,
            banda: banda.id,
            tipo: banda.unidad,
            concepto: c.id,
            ejemplar,
            imagen: image(c.id, ejemplar),
            palabra: w.texto,
            tarjetas: vistas,
            ensayos: pasosDe(cod, vistas, { texto, audio: slug(texto) }),
            muestraExpertos: n <= f.muestraExpertosPorBanda,
          },
          [c],
          [
            banda.unidad === 'silaba'
              ? 'Confirmar la división en sílabas, la sílaba que sobra y que el dibujo se nombra con esa palabra.'
              : banda.unidad === 'letra'
                ? 'Confirmar que el dibujo se nombra con esa palabra y las letras que sobran.'
                : 'Confirmar que la frase dice el objeto y el color del dibujo, y la palabra que sobra.',
          ],
        );
      }
    }
  }

  // ---------- ACT-12: elige y descubre (investigación) ----------
  // Cada ítem es un programa de premios para un bloque completo. En cada ensayo la estrella está
  // en un solo cofre. En cada mitad del bloque (o en el bloque entero, si la banda no tiene
  // inversión), el cofre que más premia la tiene en la proporción exacta de la banda, y nunca hay
  // más de «maxEnganososSeguidos» ensayos seguidos en que la tenga el otro.
  {
    const f = fichas['ACT-12'];
    const rand = rng(seedOf('ACT-12'));
    // Reparte k estrellas del cofre favorable en n ensayos, sin rachas largas en contra.
    const reparto = (n, k) => {
      for (let intento = 0; intento < 1000; intento++) {
        const xs = shuffle([...Array(k).fill(true), ...Array(n - k).fill(false)], rand);
        let racha = 0;
        if (xs.every((x) => (racha = x ? 0 : racha + 1) <= f.maxEnganososSeguidos)) return xs;
      }
      throw new Error(`ACT-12: no hay reparto de ${k} en ${n} sin rachas largas.`);
    };
    for (const banda of f.bandas) {
      const total = banda.ensayosMax;
      const mitad = banda.inversion ? total / 2 : total;
      for (let k = 1; k <= f.programasPorBanda; k++) {
        const cod = codigo(f, banda, k);
        // El cofre que empieza premiando alterna entre programas.
        const inicial = k % 2 ? 'a' : 'b';
        const otro = { a: 'b', b: 'a' };
        const fases = banda.inversion ? [mitad, total - mitad] : [total];
        const ensayos = fases.flatMap((n, i) => {
          const favorable = i === 0 ? inicial : otro[inicial];
          return reparto(n, Math.round(n * banda.probabilidad)).map((gana) => ({ fase: i + 1, favorable, conEstrella: gana ? favorable : otro[favorable] }));
        });
        push(
          {
            codigo: cod,
            actividad: f.id,
            banda: banda.id,
            tipo: 'programa',
            probabilidad: banda.probabilidad,
            favorableInicial: inicial,
            inversion: banda.inversion ? mitad + 1 : null,
            ensayos: ensayos.map((e, i) => ({
              codigo: codigoDe(cod, i + 1),
              n: i + 1,
              fase: e.fase,
              consigna: { tipo: 'cofres' },
              opciones: ['a', 'b'].map((c) => ({ id: `cofre-${c}`, cofre: c, correcta: c === e.favorable, premio: c === e.conEstrella })),
            })),
            muestraExpertos: k <= f.muestraExpertosPorBanda,
          },
          [],
          ['Confirmar con los clínicos la proporción de premios, el largo del bloque y cómo se vigila la frustración.'],
        );
      }
    }
  }

  // ---------- ACT-13: espera la señal (investigación) ----------
  // Cada ítem es la serie de presentaciones de un bloque, con la proporción de «no» de la banda.
  // Nunca empieza con un «no» ni pone más de «maxNoSeguidos» seguidos: cada «no» va después de
  // un «sí», en uno de sus lugares libres, elegidos al azar.
  {
    const f = fichas['ACT-13'];
    const rand = rng(seedOf('ACT-13'));
    const serie = (n, nos) => {
      const sis = n - nos;
      if (nos > sis * f.maxNoSeguidos) throw new Error(`ACT-13: ${nos} «no» no caben en ${sis} huecos.`);
      const lugares = shuffle(Array.from({ length: sis * f.maxNoSeguidos }, (_, i) => Math.floor(i / f.maxNoSeguidos)), rand).slice(0, nos);
      return Array.from({ length: sis }, (_, i) => ['si', ...Array(lugares.filter((l) => l === i).length).fill('no')]).flat();
    };
    for (const banda of f.bandas) {
      const total = banda.ensayosMax;
      for (let k = 1; k <= f.programasPorBanda; k++) {
        const cod = codigo(f, banda, k);
        const tipos = serie(total, Math.round(total * banda.proporcionNo));
        push(
          {
            codigo: cod,
            actividad: f.id,
            banda: banda.id,
            tipo: 'serie',
            proporcionNo: banda.proporcionNo,
            ensayos: tipos.map((tipo, i) => ({
              codigo: codigoDe(cod, i + 1),
              n: i + 1,
              tipo,
              consigna: { tipo: 'senal' },
              opciones: [{ id: f.estimulos[tipo], estimulo: f.estimulos[tipo], correcta: tipo === 'si' }],
            })),
            muestraExpertos: k <= f.muestraExpertosPorBanda,
          },
          [],
          ['Confirmar con los clínicos los estímulos, la proporción de «no» y los tiempos de cada banda.'],
        );
      }
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
