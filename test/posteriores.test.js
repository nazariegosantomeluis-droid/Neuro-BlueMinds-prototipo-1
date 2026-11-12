// Banco de ítems de las actividades de uso posterior (items/items-posteriores.json).
// El banco del piloto (items/items.json) tiene sus propias pruebas en items.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildPosteriores, loadInputs, POSTERIORES, EJEMPLAR_RESERVADO, MOTIVO } from '../tools/build-posteriores.mjs';
import { PERSONAJES, EMOCIONES } from '../src/activities/rostros.js';

const inputs = loadInputs();
const { conceptos, categorias, fichas } = inputs;
const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const { items } = leer('items/items-posteriores.json');
const piloto = leer('items/items.json').items;
const byId = new Map(conceptos.map((c) => [c.id, c]));
const of = (actividad, banda) => items.filter((i) => i.actividad === actividad && (!banda || i.banda === banda));
const existe = (ruta) => existsSync(new URL(`../${ruta}`, import.meta.url));
// Todas las rutas de imagen que un ítem pone en pantalla: la consigna, las opciones, los recortes
// de las escenas (ACT-04), el dibujo y las tarjetas de las secuencias (ACT-10 y ACT-16).
const recortes = (e) => [e?.objeto?.src, e?.figura?.src];
const rutas = (it) =>
  [
    it.consigna?.src,
    it.imagen,
    ...recortes(it.consigna?.escena),
    ...(it.opciones ?? []).flatMap((o) => [o.src, ...(o.emblemas ?? []), ...recortes(o.escena)]),
    ...(it.tarjetas ?? []).map((t) => t.src),
  ].filter(Boolean);
// Las que ponen varios conceptos del banco en una misma pantalla.
const conConceptos = ['ACT-03', 'ACT-05', 'ACT-08', 'ACT-09', 'ACT-15'];
// Ítems que agrupan varios ensayos: programas (ACT-12 y ACT-13) y secuencias (ACT-10 y ACT-16).
const agrupan = (id) => ['ACT-10', 'ACT-12', 'ACT-13', 'ACT-16'].includes(id);

test('items-posteriores.json está al día con las fichas (regenerar con npm run build-posteriores)', () => {
  assert.deepEqual(buildPosteriores(inputs), items);
});

test('el banco de uso posterior va aparte del banco del piloto', () => {
  assert.deepEqual([...new Set(items.map((i) => i.actividad))].sort(), POSTERIORES);
  const codigos = [...piloto.map((i) => i.codigo), ...items.map((i) => i.codigo)];
  assert.equal(new Set(codigos).size, codigos.length, 'ningún código se repite entre los dos bancos');
  assert.ok(piloto.every((i) => !POSTERIORES.includes(i.actividad)));
});

test('los códigos son únicos y siguen el formato ACTxx-Bx-nn', () => {
  for (const it of items) {
    assert.match(it.codigo, /^ACT\d{2}-B\d-\d{2,3}$/);
    assert.ok(it.codigo.startsWith(`${it.actividad.replace('-', '')}-${it.banda}-`), it.codigo);
    assert.ok(fichas[it.actividad].bandas.some((b) => b.id === it.banda), `${it.codigo}: banda de su ficha`);
  }
});

test('todos los ítems son una propuesta: quedan marcados para revisión clínica', () => {
  for (const it of items) {
    assert.equal(it.revisionPendiente, true, it.codigo);
    assert.equal(it.motivosRevision[0], MOTIVO, it.codigo);
  }
});

test('cada banda tiene ítems, con el número de opciones de su ficha y una sola correcta', () => {
  for (const id of POSTERIORES.filter((x) => !agrupan(x))) {
    for (const b of fichas[id].bandas) {
      const band = of(id, b.id);
      assert.ok(band.length >= fichas[id].ensayosPorBloque, `${id} ${b.id}: ${band.length} ítems`);
      for (const it of band) {
        assert.equal(it.opciones.length, b.opciones, it.codigo);
        assert.equal(it.opciones.filter((o) => o.correcta).length, 1, it.codigo);
        assert.equal(new Set(it.opciones.map((o) => o.id)).size, b.opciones, `${it.codigo}: opciones repetidas`);
      }
    }
  }
});

test('ningún ítem usa el ejemplar 3, reservado para las sondas de generalización de ACT-02', () => {
  for (const it of items) {
    assert.notEqual(it.ejemplar, EJEMPLAR_RESERVADO, it.codigo);
    for (const o of [...(it.opciones ?? []), ...(it.tarjetas ?? [])]) assert.notEqual(o.ejemplar, EJEMPLAR_RESERVADO, `${it.codigo}: ${o.id}`);
    for (const src of rutas(it)) assert.doesNotMatch(src, new RegExp(`/${EJEMPLAR_RESERVADO}\\.\\w+$`), `${it.codigo}: ${src}`);
  }
});

test('todas las imágenes que los ítems nombran existen, y no hay archivos nuevos sin licencia', () => {
  for (const src of new Set(items.flatMap(rutas))) assert.ok(existe(src), src);
  // Las figuras, los rostros, los pictogramas de emoción, los cofres, el globo y la nube se dibujan
  // con código: no agregan archivos. Las historias de ACT-10 en V tampoco.
  for (const it of [...of('ACT-11'), ...of('ACT-12'), ...of('ACT-13'), ...of('ACT-14'), ...of('ACT-10').filter((i) => i.modalidad === 'V')]) assert.deepEqual(rutas(it), [], it.codigo);
  // Los sonidos y el silencio de las secuencias sí son archivos, con su licencia.
  const audios = new Set(items.flatMap((it) => [it.consigna?.audio, ...(it.ensayos ?? []).map((e) => e.consigna?.audio)]).filter(Boolean));
  for (const a of [...audios].filter((x) => x.startsWith('sonido-') || x === 'silencio')) assert.ok(existe(`assets/audio/${a}.mp3`), a);
});

test('ningún par excluido aparece en la misma pantalla', () => {
  // También las tarjetas de las instrucciones habladas de ACT-10.
  const pantallas = [...items.filter((i) => conConceptos.includes(i.actividad)).map((i) => [i.codigo, i.opciones]), ...of('ACT-10').filter((i) => i.modalidad === 'AV').map((i) => [i.codigo, i.tarjetas])];
  for (const [codigo, conCosas] of pantallas) {
    const cs = conCosas.filter((o) => o.concepto).map((o) => byId.get(o.concepto));
    const it = { codigo };
    for (const a of cs) for (const b of cs) assert.ok(!a.excluir.includes(b.id), `${it.codigo}: ${a.id} con ${b.id}`);
  }
});

test('ACT-03 B1 y B2: la palabra es el nombre del concepto y los distractores siguen la regla de la banda', () => {
  const f = fichas['ACT-03'];
  assert.deepEqual(f.modalidades, ['V'], 'la palabra se lee: no hay modalidad con voz');
  for (const b of f.bandas.filter((x) => !x.frases)) {
    const band = of('ACT-03', b.id);
    assert.deepEqual(band.map((i) => i.concepto), conceptos.map((c) => c.id), `${b.id}: un ítem por concepto`);
    assert.equal(band.filter((i) => i.muestraExpertos).length, f.muestraExpertosPorBanda, `${b.id}: muestra para expertos`);
    for (const it of band) {
      const target = byId.get(it.concepto);
      assert.deepEqual(it.consigna, { tipo: 'texto', texto: target.nombre }, it.codigo);
      const [correcta, ...ds] = it.opciones;
      assert.ok(correcta.correcta && correcta.concepto === target.id, it.codigo);
      assert.equal(new Set(it.opciones.map((o) => o.concepto)).size, b.opciones, `${it.codigo}: conceptos repetidos`);
      const misma = ds.filter((d) => byId.get(d.concepto).categoria === target.categoria).length;
      assert.equal(misma, b.distractoresMismaCategoria, `${it.codigo}: distractores de la misma categoría`);
      for (const o of it.opciones) assert.ok(f.ejemplares.includes(o.ejemplar), `${it.codigo}: ejemplar ${o.ejemplar}`);
    }
  }
});

test('ACT-03 B3: la frase exige las dos palabras (mismo objeto de otro color y otro objeto del mismo color)', () => {
  const f = fichas['ACT-03'];
  const band = of('ACT-03', 'B3');
  assert.equal(band.length, f.frases.length);
  band.forEach((it, k) => {
    const fr = f.frases[k];
    assert.deepEqual(it.consigna, { tipo: 'texto', texto: fr.texto }, it.codigo);
    assert.equal(fr.texto.trim().split(/\s+/).length, 2, `${it.codigo}: dos palabras`);
    const [objetivo, mismoObjeto, mismoColor, otro] = it.opciones;
    assert.ok(objetivo.correcta, it.codigo);
    assert.equal(mismoObjeto.concepto, objetivo.concepto, `${it.codigo}: el mismo objeto…`);
    assert.notEqual(mismoObjeto.ejemplar, objetivo.ejemplar, `${it.codigo}: …de otro color`);
    assert.notEqual(mismoColor.concepto, objetivo.concepto, `${it.codigo}: otro objeto`);
    assert.equal(otro.concepto, mismoColor.concepto, it.codigo);
    assert.notEqual(otro.ejemplar, mismoColor.ejemplar, it.codigo);
    assert.ok(fr.texto.startsWith(byId.get(objetivo.concepto).nombre), `${it.codigo}: la frase empieza con el nombre del objeto`);
    assert.ok(it.motivosRevision.some((m) => m.includes('color')), `${it.codigo}: el color se confirma con los dibujos`);
  });
});

test('ACT-06: las cajas son fijas, con dos pictogramas de su categoría, y el dibujo nunca es uno de ellos', () => {
  const f = fichas['ACT-06'];
  assert.equal(f.barajarOpciones, false, 'las cajas no cambian de lugar');
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  for (const [cat, ids] of Object.entries(f.emblemas)) {
    assert.equal(ids.length, 2, cat);
    for (const id of ids) {
      assert.equal(byId.get(id).categoria, cat, `${id} es emblema de ${cat}`);
      assert.ok(!f.pocoTipicos[cat].includes(id), `${id}: un emblema debe ser típico`);
      assert.ok(!byId.get(id).pendiente, `${id}: un emblema no puede ser un concepto pendiente de confirmar`);
    }
  }
  const emblemas = new Set(Object.values(f.emblemas).flat());
  for (const b of f.bandas) {
    assert.equal(new Set(b.juegos.flat()).size, b.juegos.flat().length, `${b.id}: cada categoría en un solo juego`);
    b.juegos.forEach((cats, juego) => {
      assert.equal(cats.length, b.opciones, `${b.id}, juego ${juego}`);
      const cartas = of('ACT-06', b.id).filter((i) => i.juego === juego);
      assert.ok(cartas.length >= f.ensayosPorBloque, `${b.id}, juego ${juego}: ${cartas.length} dibujos`);
      const porCat = cats.map((cat) => cartas.filter((i) => byId.get(i.concepto).categoria === cat).length);
      assert.equal(new Set(porCat).size, 1, `${b.id}, juego ${juego}: mismo número de dibujos por caja (${porCat})`);
      for (const it of cartas) {
        const c = byId.get(it.concepto);
        assert.deepEqual(it.opciones.map((o) => o.id), cats, `${it.codigo}: las cajas del juego, en su orden`);
        assert.equal(it.opciones.find((o) => o.correcta).id, c.categoria, it.codigo);
        for (const o of it.opciones) {
          assert.equal(o.nombre, nombreCat.get(o.id), it.codigo);
          assert.deepEqual(o.emblemas, f.emblemas[o.id].map((id) => `assets/picto/${id}.png`), it.codigo);
        }
        assert.ok(!emblemas.has(c.id), `${it.codigo}: «${c.id}» está dibujado en una caja`);
        for (const cat of cats) for (const id of f.emblemas[cat]) assert.ok(!c.excluir.includes(id), `${it.codigo}: «${c.id}» con el pictograma de «${id}»`);
        assert.ok(it.consigna.src.endsWith(`/${c.id}/${it.ejemplar}.jpg`), it.codigo);
        const raro = f.pocoTipicos[c.categoria].includes(c.id);
        if (b.tipicos) assert.ok(!raro && it.ejemplar === 1, `${it.codigo}: ejemplar típico`);
        else assert.ok(raro || it.ejemplar === 2, `${it.codigo}: ejemplar poco típico`);
      }
    });
  }
});

test('ACT-08: un solo objetivo entre 4, 8, 12 o 16 dibujos, igual a la muestra', () => {
  const f = fichas['ACT-08'];
  assert.deepEqual(f.bandas.map((b) => b.opciones), [4, 8, 12, 16]);
  for (const b of f.bandas) {
    const band = of('ACT-08', b.id);
    assert.equal(band.length, f.itemsPorBanda, b.id);
    for (const it of band) {
      const target = byId.get(it.concepto);
      const correcta = it.opciones.find((o) => o.correcta);
      assert.equal(correcta.src, it.consigna.src, `${it.codigo}: el objetivo es la misma imagen`);
      assert.equal(it.opciones.filter((o) => o.concepto === target.id).length, 1, `${it.codigo}: un solo objetivo`);
      assert.equal(new Set(it.opciones.map((o) => o.concepto)).size, b.opciones, `${it.codigo}: conceptos repetidos`);
      const misma = it.opciones.filter((o) => !o.correcta && byId.get(o.concepto).categoria === target.categoria).length;
      assert.equal(misma, b.distractoresMismaCategoria, `${it.codigo}: distractores parecidos`);
      assert.equal(it.consigna.texto, `Busca ${target.articulo} ${target.nombre}`, it.codigo);
    }
  }
  const usados = of('ACT-08').map((i) => i.concepto);
  assert.equal(new Set(usados).size, usados.length, 'ningún objetivo se repite entre bandas');
});

test('ACT-09: la pausa en blanco crece con la banda y nunca pasa de 10 s', () => {
  const f = fichas['ACT-09'];
  assert.deepEqual(f.modalidades, ['V']);
  assert.equal(f.muestraMs, 2000, 'la muestra se ve 2 s');
  assert.deepEqual(f.bandas.map((b) => b.demoraMs), [0, 2000, 5000, 10000]);
  assert.ok(f.bandas.every((b) => b.demoraMs <= 10000));
  for (const b of f.bandas) {
    const band = of('ACT-09', b.id);
    assert.equal(band.length, f.itemsPorBanda, b.id);
    for (const it of band) {
      const target = byId.get(it.concepto);
      assert.equal(it.opciones.find((o) => o.correcta).src, it.consigna.src, `${it.codigo}: la opción correcta es la muestra`);
      const misma = it.opciones.filter((o) => !o.correcta && byId.get(o.concepto).categoria === target.categoria).length;
      assert.equal(misma, b.distractoresMismaCategoria, it.codigo);
    }
  }
});

// Periodo más corto con el que se repite una lista de valores.
const periodo = (xs) => {
  for (let p = 1; p < xs.length; p++) if (xs.every((x, k) => k < p || x === xs[k - p])) return p;
  return xs.length;
};

test('ACT-11: la opción correcta es la figura que sigue según la regla de la serie, y es la única', () => {
  const f = fichas['ACT-11'];
  assert.deepEqual(f.bandas.map((b) => b.patron), ['AB', 'AAB', 'ABC', '2D']);
  for (const b of f.bandas) {
    const band = of('ACT-11', b.id);
    assert.equal(band.length, f.itemsPorBanda, b.id);
    for (const it of band) {
      const { serie } = it.consigna;
      assert.ok(b.largos.includes(serie.length), `${it.codigo}: serie de ${serie.length} figuras`);
      const formas = serie.map((x) => x.forma);
      const colores = serie.map((x) => x.color);
      const [pf, pc] = [periodo(formas), periodo(colores)];
      // La serie muestra cada unidad completa al menos una vez: la regla se puede inducir.
      assert.ok(serie.length > Math.max(pf, pc), `${it.codigo}: la serie deja ver la regla`);
      const esperada = `${formas[serie.length - pf]}-${colores[serie.length - pc]}`;
      const correctas = it.opciones.filter((o) => o.correcta);
      assert.deepEqual(correctas.map((o) => o.id), [esperada], it.codigo);
      for (const o of it.opciones) {
        assert.equal(o.id, `${o.forma}-${o.color}`, it.codigo);
        assert.ok(f.figuras.includes(o.forma) && f.colores.includes(o.color), `${it.codigo}: ${o.id}`);
      }
      const unidad = serie.slice(0, Math.max(pf, pc)).map((x) => x.id);
      if (b.patron === 'AB') assert.equal(Math.max(pf, pc), 2, `${it.codigo}: dos figuras que se alternan`);
      if (b.patron === 'AAB') assert.ok(unidad.length === 3 && unidad[0] === unidad[1] && unidad[1] !== unidad[2], `${it.codigo}: AAB`);
      if (b.patron === 'ABC') assert.ok(unidad.length === 3 && new Set(unidad).size === 3, `${it.codigo}: ABC`);
      if (b.patron === '2D') assert.deepEqual([pf, pc].sort(), [2, 3], `${it.codigo}: la forma y el color siguen reglas distintas`);
    }
    // La respuesta correcta no cae siempre en la misma figura de la unidad.
    assert.ok(new Set(band.map((i) => i.consigna.serie.length % 3)).size > 1 || b.patron === 'AB', b.id);
  }
});

test('ACT-11: los colores son azul y amarillo, que se distinguen con daltonismo', () => {
  assert.deepEqual([...fichas['ACT-11'].colores].sort(), ['amarillo', 'azul']);
});

test('ACT-14: cada personaje muestra cada emoción de la banda una vez, con los pictogramas siempre en el mismo lugar', () => {
  const f = fichas['ACT-14'];
  assert.equal(f.barajarOpciones, false, 'los pictogramas no cambian de lugar');
  assert.equal(f.estratificarPor, 'emocion');
  assert.deepEqual(Object.keys(f.emociones), EMOCIONES);
  for (const p of f.personajes) assert.ok(PERSONAJES[p], `personaje «${p}»`);
  for (const b of f.bandas) {
    const band = of('ACT-14', b.id);
    assert.equal(band.length, f.personajes.length * b.emociones.length, b.id);
    const pares = band.map((i) => `${i.personaje}:${i.emocion}`);
    assert.equal(new Set(pares).size, pares.length, `${b.id}: sin pares repetidos`);
    for (const it of band) {
      assert.deepEqual(it.opciones.map((o) => o.id), b.emociones, `${it.codigo}: las emociones de la banda, en su orden`);
      assert.equal(it.opciones.find((o) => o.correcta).id, it.emocion, it.codigo);
      assert.deepEqual(
        { tipo: it.consigna.tipo, personaje: it.consigna.personaje, emocion: it.consigna.emocion, intensidad: it.consigna.intensidad },
        { tipo: 'rostro', personaje: it.personaje, emocion: it.emocion, intensidad: b.intensidad },
        it.codigo,
      );
    }
    // Muestra para expertos: 12 ítems, con las emociones repartidas por igual.
    const muestra = band.filter((i) => i.muestraExpertos);
    assert.equal(muestra.length, 12, b.id);
    for (const e of b.emociones) assert.equal(muestra.filter((i) => i.emocion === e).length, 12 / b.emociones.length, `${b.id}: ${e}`);
  }
});

test('ACT-14: el bloque propuesto reparte los ensayos por igual entre las emociones de cada banda', () => {
  const f = fichas['ACT-14'];
  for (const b of f.bandas) assert.equal(f.ensayosPorBloque % b.emociones.length, 0, b.id);
});
