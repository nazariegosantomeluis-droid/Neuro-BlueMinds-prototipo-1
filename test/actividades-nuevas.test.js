// Las siete actividades que faltaban del Catálogo: ACT-04, ACT-05, ACT-10, ACT-12, ACT-13, ACT-15
// y ACT-16. Reglas de su banco, sus resúmenes (solo cuentan) y cómo se arman sus bloques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { rng } from '../src/engine/selector.js';
import { readLicencias } from '../tools/licencias.mjs';
import { SILENCIO } from '../tools/build-posteriores.mjs';
import * as cofres from '../src/activities/cofres.js';
import * as senal from '../src/activities/senal.js';
import * as secuencia from '../src/activities/secuencia.js';
import * as oracion from '../src/activities/oracion.js';
import { HISTORIAS, momentoSVG } from '../src/activities/historias.js';
import { escenaSVG, LOOKS } from '../src/activities/escenas.js';
import { unidadDelBloque, maxEnsayos } from '../src/inicio.js';

const texto = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const leer = (ruta) => JSON.parse(texto(ruta));
const ficha = (id) => leer(`fichas/${id}.json`);
const { items } = leer('items/items-posteriores.json');
const { conceptos } = leer('items/conceptos.json');
const byId = new Map(conceptos.map((c) => [c.id, c]));
const of = (actividad, banda) => items.filter((i) => i.actividad === actividad && (!banda || i.banda === banda));
const existe = (ruta) => existsSync(new URL(`../${ruta}`, import.meta.url));
const licencias = new Map(readLicencias(new URL('../items/licencias.csv', import.meta.url)).map((r) => [r.archivo, r]));
const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Filas de registro de mentira: lo mínimo que leen los resúmenes.
const fila = (item, { pos = null, id = null, acierto = false, tr = null, interrumpido = false } = {}) => ({
  item, opcion_elegida: pos, opcion_elegida_id: id, acierto, omision: pos === null, tr_bruto_ms: tr, anticipatoria: false, interrumpido,
});

// ---------- ACT-12: elige y descubre ----------

test('ACT-12: en cada ensayo la estrella está en un solo cofre, y el favorable la tiene en la proporción de la banda', () => {
  const f = ficha('ACT-12');
  for (const b of f.bandas) {
    const programas = of('ACT-12', b.id);
    assert.equal(programas.length, f.programasPorBanda, b.id);
    for (const p of programas) {
      assert.equal(p.ensayos.length, b.ensayosMax, p.codigo);
      assert.equal(p.inversion, b.inversion ? b.ensayosMax / 2 + 1 : null, p.codigo);
      for (const fase of b.inversion ? [1, 2] : [1]) {
        const es = p.ensayos.filter((e) => e.fase === fase);
        const favorable = es[0].opciones.find((o) => o.correcta).cofre;
        assert.ok(es.every((e) => e.opciones.filter((o) => o.correcta).length === 1 && e.opciones.find((o) => o.correcta).cofre === favorable), `${p.codigo}: un favorable por fase`);
        assert.ok(es.every((e) => e.opciones.filter((o) => o.premio).length === 1), `${p.codigo}: una estrella por ensayo`);
        assert.equal(es.filter((e) => e.opciones.find((o) => o.correcta).premio).length, Math.round(es.length * b.probabilidad), `${p.codigo} fase ${fase}`);
        // Nunca más de 2 ensayos seguidos con la estrella en el otro cofre.
        let racha = 0;
        for (const e of es) assert.ok((racha = e.opciones.find((o) => o.correcta).premio ? 0 : racha + 1) <= f.maxEnganososSeguidos, p.codigo);
      }
      if (b.inversion) {
        const [a, z] = [p.ensayos[0], p.ensayos.at(-1)].map((e) => e.opciones.find((o) => o.correcta).cofre);
        assert.notEqual(a, z, `${p.codigo}: la ventaja cambia de cofre`);
      }
    }
  }
});

test('ACT-12: un bloque es un programa completo; el cofre elegido se abre, y el favorable nunca se marca', () => {
  const programas = of('ACT-12', 'B3');
  const [p] = cofres.elegir(programas, 40, rng(3));
  assert.ok(programas.includes(p));
  const trials = cofres.toTrials([p]);
  assert.equal(trials.length, 40);
  assert.deepEqual(trials.map((t) => t.codigo), p.ensayos.map((e) => e.codigo));
  assert.equal(ficha('ACT-12').barajarOpciones, false, 'los cofres siempre en el mismo lugar');
  assert.match(cofres.cofreSVG('a', { abierto: true, premio: true }), /aria-hidden="true"/);
  assert.notEqual(cofres.cofreSVG('a', { abierto: true, premio: true }), cofres.cofreSVG('a', { abierto: true, premio: false }));
  // showFeedback no usa la posición correcta: abre el cofre que tocó el niño.
  assert.match(texto('src/activities/cofres.js'), /showFeedback\(\) \{\s*if \(elegido === null/);
});

test('ACT-12: el resumen cuenta antes y después del cambio, las estrellas y qué hizo después de cada una', () => {
  const p = of('ACT-12', 'B3')[0];
  const byCode = new Map(p.ensayos.map((e) => [e.codigo, e]));
  // Siempre el mismo cofre: «a».
  const rows = p.ensayos.map((e) => {
    const o = e.opciones.find((x) => x.cofre === 'a');
    return fila(e.codigo, { pos: 1, id: o.id, acierto: o.correcta, tr: 800 });
  });
  const lineas = cofres.resumenExtra(rows, byCode);
  const favorablesAntes = p.ensayos.filter((e) => e.fase === 1 && e.opciones.find((o) => o.cofre === 'a').correcta).length;
  assert.match(lineas[0], new RegExp(`^Antes del cambio: eligió el cofre que más premiaba en ${favorablesAntes} de 20 ensayos\\.$`));
  assert.match(lineas[1], new RegExp(`^Después del cambio \\(desde el ensayo 21\\): eligió el nuevo cofre que más premiaba en ${20 - favorablesAntes} de 20 ensayos\\.$`));
  const estrellas = p.ensayos.filter((e) => e.opciones.find((o) => o.cofre === 'a').premio).length;
  assert.equal(lineas[2], `Encontró la estrella en ${estrellas} de 40 ensayos.`);
  assert.match(lineas[3], /^Después de encontrar la estrella, volvió a elegir el mismo cofre en (\d+) de \1 ocasion/);
  assert.match(lineas[4], /^Después de un cofre vacío, cambió de cofre en 0 de \d+ ocasion/);
  assert.match(lineas.at(-1), /80 elecciones/);
  for (const l of lineas) assert.doesNotMatch(l, /sensible|toler|impuls/i);
});

// ---------- ACT-13: espera la señal ----------

test('ACT-13: cada serie tiene la proporción de «no» de su banda, empieza con «sí» y no pone más de 2 «no» seguidos', () => {
  const f = ficha('ACT-13');
  for (const b of f.bandas) {
    for (const s of of('ACT-13', b.id)) {
      const tipos = s.ensayos.map((e) => e.tipo);
      assert.equal(tipos.length, b.ensayosMax);
      assert.equal(tipos.filter((t) => t === 'no').length, Math.round(b.ensayosMax * b.proporcionNo), s.codigo);
      assert.equal(tipos[0], 'si');
      assert.doesNotMatch(tipos.join(''), /(nono){1}no/, `${s.codigo}: más de 2 «no» seguidos`);
      for (const e of s.ensayos) {
        assert.equal(e.opciones.length, 1);
        assert.equal(e.opciones[0].correcta, e.tipo === 'si');
        assert.equal(e.opciones[0].estimulo, f.estimulos[e.tipo]);
      }
    }
  }
});

test('ACT-13: el bloque empieza con la pantalla de qué se toca, y el ritmo es el de la banda', () => {
  const f = ficha('ACT-13');
  const [s] = senal.elegir(of('ACT-13', 'B3'), 30, rng(1));
  const trials = senal.toTrials([s], { ficha: f });
  assert.deepEqual(trials[0].anuncio, f.estimulos);
  assert.ok(trials.slice(1).every((t) => !t.anuncio));
  const b3 = f.bandas.find((b) => b.id === 'B3');
  const deBloque = senal.fichaDeBloque(f, b3);
  assert.equal(deBloque.limiteRespuestaMs, b3.limiteMs);
  assert.equal(deBloque.intervaloMs, b3.intervaloMs);
  assert.equal(f.limiteRespuestaMs, 2000, 'la ficha no cambia');
  assert.ok(f.anuncioMs >= 3000);
});

test('ACT-13: el resumen separa omisiones (ante el «sí») y errores de comisión (ante el «no»)', () => {
  const f = ficha('ACT-13');
  const s = of('ACT-13', 'B1')[0];
  const byCode = new Map(s.ensayos.map((e) => [e.codigo, e]));
  // Toca todos los globos menos el primero, y la primera nube.
  let nubeTocada = false;
  const rows = s.ensayos.map((e, i) => {
    if (e.tipo === 'si') return i === 0 ? fila(e.codigo) : fila(e.codigo, { pos: 1, id: 'globo', acierto: true, tr: 500 });
    if (!nubeTocada) {
      nubeTocada = true;
      return fila(e.codigo, { pos: 1, id: 'nube', tr: 450 });
    }
    return fila(e.codigo);
  });
  const sis = s.ensayos.filter((e) => e.tipo === 'si').length;
  const nos = s.ensayos.length - sis;
  const lineas = senal.resumen(rows, byCode, f);
  assert.equal(lineas[0], `Ante el globo («sí»): tocó ${sis - 1} de ${sis}; sin tocar, 1 (omisiones).`);
  assert.equal(lineas[1], `Ante la nube («no»): no tocó ${nos - 1} de ${nos}; tocó 1 (errores de comisión).`);
  assert.equal(lineas[2], `Mediana del tiempo de respuesta ante el globo: 0.50 s, en ${sis - 1} con respuesta (sin contar las anticipatorias).`);
  assert.match(lineas.at(-1), /Modelo matemático/);
  for (const l of lineas) assert.doesNotMatch(l, /impulsiv/i);
});

// ---------- ACT-10 y ACT-16: secuencias por pasos ----------

const enOrden = (it) => it.tarjetas.filter((t) => t.orden !== null).sort((a, b) => a.orden - b.orden);

test('secuencias: cada paso pide la tarjeta que sigue entre las que quedan, y la última pasa sola si no sobra ninguna', () => {
  for (const it of [...of('ACT-10'), ...of('ACT-16')]) {
    const orden = enOrden(it);
    const sobran = it.tarjetas.length - orden.length;
    assert.equal(it.ensayos.length, sobran ? orden.length : orden.length - 1, it.codigo);
    it.ensayos.forEach((e, k) => {
      assert.equal(e.codigo, `${it.codigo}-${k + 1}`);
      assert.deepEqual(e.colocadas, orden.slice(0, k).map((t) => t.id));
      assert.deepEqual(e.opciones.map((o) => o.id), it.tarjetas.filter((t) => !e.colocadas.includes(t.id)).map((t) => t.id), `${e.codigo}: en el mismo orden de la pantalla`);
      assert.equal(e.opciones.find((o) => o.correcta).id, orden[k].id, e.codigo);
      assert.equal(e.opciones.filter((o) => o.correcta).length, 1);
      assert.ok(e.opciones.length >= 2, `${e.codigo}: siempre hay que elegir`);
      // La instrucción se dice una vez: los demás pasos usan el silencio.
      if (k > 0) assert.equal(e.consigna.audio, SILENCIO);
    });
    if (!sobran) assert.equal(it.ensayos.at(-1).autoColocar, orden.at(-1).id, it.codigo);
    // Con 3 tarjetas o más, nunca aparecen ya en orden.
    if (it.tarjetas.length >= 3) assert.ok(it.tarjetas.some((t, i) => t.orden !== i + 1), `${it.codigo}: revueltas`);
  }
  assert.ok(existe(`assets/audio/${SILENCIO}.mp3`) && licencias.has(`assets/audio/${SILENCIO}.mp3`));
});

test('ACT-10: en V, los momentos de una historia en su orden; en AV, la instrucción nombra las tarjetas en orden', () => {
  const f = ficha('ACT-10');
  for (const b of f.bandas) {
    const v = of('ACT-10', b.id).filter((i) => i.modalidad === 'V');
    const av = of('ACT-10', b.id).filter((i) => i.modalidad === 'AV');
    assert.equal(v.length, f.historias.length * f.ordenesPorHistoria, b.id);
    assert.equal(av.length, f.instruccionesPorBanda, b.id);
    for (const it of v) {
      assert.ok(HISTORIAS[it.historia], it.codigo);
      assert.deepEqual(enOrden(it).map((t) => t.momento), b.momentos, it.codigo);
    }
    for (const it of av) {
      const nombres = enOrden(it).map((t) => `${byId.get(t.concepto).articulo} ${byId.get(t.concepto).nombre}`);
      assert.equal(nombres.length, b.elementos);
      let desde = 0;
      for (const n of nombres) {
        const i = it.consigna.texto.indexOf(n, desde);
        assert.ok(i >= desde, `${it.codigo}: «${n}» en orden en «${it.consigna.texto}»`);
        desde = i + n.length;
      }
      assert.ok(enOrden(it).every((t) => t.ejemplar !== 3));
    }
  }
  // Cada historia tiene sus cinco momentos dibujados, sin texto.
  for (const h of Object.keys(HISTORIAS)) {
    const dibujos = [1, 2, 3, 4, 5].map((m) => momentoSVG(h, m));
    assert.equal(new Set(dibujos).size, 5, h);
    for (const d of dibujos) assert.match(d, /^<svg [^>]*aria-hidden="true"/);
    for (const d of dibujos) assert.doesNotMatch(d, /<text|undefined|NaN/);
  }
});

test('ACT-16: las piezas en orden forman la palabra o la frase, y las que sobran no son parte de ella', () => {
  const f = ficha('ACT-16');
  for (const b of f.bandas) {
    for (const it of of('ACT-16', b.id)) {
      const piezas = enOrden(it).map((t) => t.texto);
      const unidas = b.unidad === 'palabra' ? piezas.join(' ') : piezas.join('');
      assert.equal(unidas, it.palabra, it.codigo);
      if (b.unidad !== 'palabra') assert.equal(sinAcentos(it.palabra), sinAcentos(byId.get(it.concepto).nombre), it.codigo);
      assert.equal(it.tarjetas.length, b.piezas, it.codigo);
      for (const t of it.tarjetas.filter((x) => x.orden === null)) assert.ok(!piezas.includes(t.texto), `${it.codigo}: «${t.texto}» sobra`);
      assert.ok(existe(it.imagen) && !it.imagen.endsWith('/3.jpg'), it.codigo);
    }
  }
});

test('secuencias: el bloque se cuenta en secuencias completas y el resumen cuenta las hechas sin errores', () => {
  for (const id of ['ACT-10', 'ACT-16']) {
    const f = ficha(id);
    assert.equal(f.unidadDelBloque, 'secuencia');
    assert.equal(unidadDelBloque(f).campo, 'Número de secuencias');
    for (const b of f.bandas) assert.equal(maxEnsayos(f, b), f.ensayosMax);
  }
  assert.equal(unidadDelBloque(ficha('ACT-01')).campo, 'Número de ensayos');
  const f = ficha('ACT-16');
  const elegidas = secuencia.elegir(of('ACT-16', 'B1'), 3, rng(7), { repeat: true });
  assert.equal(elegidas.length, 3);
  const trials = secuencia.toTrials(elegidas);
  assert.equal(trials.length, elegidas.reduce((n, it) => n + it.ensayos.length, 0));
  // Toda la secuencia viaja en cada paso: la pantalla se puede volver a dibujar después de una pausa.
  for (const t of trials) {
    assert.equal(t.consigna.tarjetas.length, f.bandas[0].piezas);
    assert.ok(t.imagenes.length >= 1);
  }
  const byCode = new Map(trials.map((t) => [t.codigo, t]));
  // La primera secuencia sin errores; la segunda con un error; la tercera cortada por una pausa.
  const rows = trials.map((t) => fila(t.codigo, { pos: 1, acierto: t.secuencia !== elegidas[1].codigo || t.paso > 1, interrumpido: t.secuencia === elegidas[2].codigo && t.paso === 1 }));
  const lineas = secuencia.resumenExtra(rows, byCode, f);
  assert.equal(lineas[0], 'Formó sin errores 1 de 3 palabras o frases.');
  assert.equal(lineas[1], 'Secuencias que no se terminaron por una pausa o un salto: 1.');
  // App: n secuencias completas, sin recortar a mitad de una.
  const app = texto('src/app.js');
  assert.match(app, /picked = pantalla\.elegir\(bandItems, n, rand, \{ ficha, banda, repeat \}\)/);
  assert.match(app, /const trials = ficha\.unidadDelBloque === 'secuencia' \? todos : todos\.slice\(0, n\);/);
  assert.match(app, /bandItems = bandItems\.filter\(\(i\) => !i\.modalidad \|\| i\.modalidad === f\.modalidad\);/);
});

// ---------- ACT-04: oración e imagen ----------

const partes = (o) => {
  const e = o.escena;
  return e.tipo === 'lugar' ? [e.figura.concepto, e.referencia, e.relacion] : [e.sujeto, e.accion, e.objeto?.concepto ?? null];
};

test('ACT-04: la oración describe una sola escena, y cada escena de las otras cambia la parte que pide la banda', () => {
  const f = ficha('ACT-04');
  for (const b of f.bandas) {
    for (const it of of('ACT-04', b.id)) {
      const correcta = it.opciones.find((o) => o.correcta);
      assert.equal(it.opciones.filter((o) => o.correcta).length, 1, it.codigo);
      if (b.estructura === 'verificacion') {
        assert.deepEqual(it.opciones.map((o) => o.simbolo), ['si', 'no']);
        assert.equal(correcta.simbolo, it.consigna.verdadera ? 'si' : 'no', it.codigo);
        assert.ok(it.consigna.escena, it.codigo);
        continue;
      }
      assert.equal(new Set(it.opciones.map((o) => o.id)).size, it.opciones.length, `${it.codigo}: escenas distintas`);
      if (b.estructura === 'negacion') {
        assert.match(it.consigna.texto, / no /);
        const negada = it.opciones.find((o) => !o.correcta);
        assert.equal(negada.texto, it.consigna.texto.replace(' no ', ' '), it.codigo);
      } else {
        assert.equal(correcta.texto, it.consigna.texto, it.codigo);
        assert.ok(it.opciones.filter((o) => !o.correcta).every((o) => o.texto !== it.consigna.texto), it.codigo);
      }
      if (b.estructura === 'sujeto-verbo-objeto') {
        // Cada distractor cambia la persona, la acción o el objeto respecto de la correcta.
        const [s, a, o] = partes(correcta);
        const cambios = it.opciones.filter((x) => !x.correcta).map((x) => {
          const [s2, a2, o2] = partes(x);
          return s2 !== s ? 'persona' : a2 !== a ? 'accion' : o2 !== o ? 'objeto' : 'nada';
        });
        assert.deepEqual(cambios.sort(), ['accion', 'objeto', 'persona'], it.codigo);
      }
      if (b.estructura === 'lugar') {
        assert.equal(new Set(it.opciones.map((o) => partes(o).slice(0, 2).join())).size, 1, `${it.codigo}: mismo animal y misma referencia`);
      }
      // En una pantalla, la misma persona se ve igual en todas sus escenas.
      const looks = new Map();
      for (const o of it.opciones.filter((x) => x.escena.tipo === 'accion')) {
        assert.equal(looks.get(o.escena.sujeto) ?? o.escena.look, o.escena.look, `${it.codigo}: ${o.escena.sujeto}`);
        looks.set(o.escena.sujeto, o.escena.look);
      }
    }
  }
  const b5 = of('ACT-04', 'B5');
  assert.equal(b5.filter((i) => i.consigna.verdadera).length, b5.length / 2, 'la mitad dicen lo que muestra la escena');
});

test('ACT-04: las escenas se dibujan con código y los recortes vienen del ejemplar 1, con su licencia', () => {
  const recortes = new Set(of('ACT-04').flatMap((it) => [it.consigna.escena, ...it.opciones.map((o) => o.escena)]).flatMap((e) => [e?.objeto?.src, e?.figura?.src]).filter(Boolean));
  assert.ok(recortes.size >= 10);
  for (const src of recortes) {
    assert.ok(existe(src), src);
    const l = licencias.get(src);
    assert.ok(l, `${src}: licencia`);
    assert.match(l.origen, /^Recorte con fondo transparente de assets\/img\/[a-z-]+\/1\.jpg/, src);
  }
  for (const it of of('ACT-04').slice(0, 30)) {
    for (const o of it.opciones.filter((x) => x.escena)) {
      const svg = escenaSVG(o.escena);
      assert.match(svg, /^<svg viewBox="0 0 200 200" aria-hidden="true">/);
      assert.doesNotMatch(svg, /<text|undefined|NaN/, it.codigo);
    }
  }
  assert.equal(LOOKS.length, 4, 'cuatro tonos de piel');
  // Palomita y tache en tinta oscura: nunca verde ni rojo.
  for (const s of Object.values(oracion.SIMBOLOS)) assert.doesNotMatch(s, /#(?:[0-9a-f]{2})?(?:0f0|f00|00ff00|ff0000|2e7d32|c62828)/i);
  assert.deepEqual(oracion.fichaDeBloque(ficha('ACT-04'), ficha('ACT-04').bandas[4]).barajarOpciones, false);
});

// ---------- ACT-05: sonido e imagen ----------

test('ACT-05: cada sonido es un archivo con licencia libre (CC0 o CC BY) y su dibujo es el de lo que suena', () => {
  const f = ficha('ACT-05');
  const grupo = (id) => f.sonidos[id];
  for (const it of of('ACT-05')) {
    const ruta = `assets/audio/${it.consigna.audio}.mp3`;
    assert.ok(existe(ruta), ruta);
    const l = licencias.get(ruta);
    assert.ok(['CC0 1.0', 'CC BY 3.0'].includes(l.licencia), `${ruta}: ${l.licencia}`);
    assert.match(l.url_origen, /^http:\/\/www\.freesound\.org\/people\//);
    assert.ok(l.autor, ruta);
    assert.equal(it.consigna.audio, `sonido-${it.concepto}-${it.grabacion}`);
    const correcta = it.opciones.find((o) => o.correcta);
    assert.equal(correcta.concepto, it.concepto);
    // Todas las opciones son de cosas que suenan.
    assert.ok(it.opciones.every((o) => grupo(o.concepto)), it.codigo);
    const otros = it.opciones.filter((o) => !o.correcta).map((o) => grupo(o.concepto));
    const banda = f.bandas.find((b) => b.id === it.banda);
    if (banda.mismoGrupo) assert.ok(otros.every((g) => g === grupo(it.concepto)), it.codigo);
    else assert.equal(new Set([grupo(it.concepto), ...otros]).size, it.opciones.length, `${it.codigo}: un grupo por opción`);
  }
  assert.deepEqual(f.modalidades, ['AV']);
  // Dos grabaciones por sonido, y ninguna de licencia no comercial.
  const sonidos = [...licencias.values()].filter((r) => r.archivo.startsWith('assets/audio/sonido-'));
  assert.equal(sonidos.length, Object.keys(f.sonidos).length * f.grabacionesPorSonido);
  assert.ok(sonidos.every((r) => !/NC/.test(r.licencia)));
});

// ---------- ACT-15: sonidos de las palabras ----------

test('ACT-15: la correcta rima o empieza igual, los distractores no, y en «¿suenan igual?» la figura dice la verdad', () => {
  const f = ficha('ACT-15');
  const rimaDe = (id) => f.rimas.find((g) => g.includes(id)) ?? [];
  const inicioDe = (id) => Object.entries(f.inicios).find(([, ids]) => ids.includes(id))?.[0] ?? null;
  for (const it of of('ACT-15')) {
    const correcta = it.opciones.find((o) => o.correcta);
    const otros = it.opciones.filter((o) => !o.correcta);
    if (it.tarea === 'rima') {
      assert.ok(rimaDe(it.concepto).includes(correcta.concepto) && correcta.concepto !== it.concepto, it.codigo);
      assert.ok(otros.every((o) => !rimaDe(it.concepto).includes(o.concepto)), it.codigo);
      assert.equal(it.consigna.texto, `¿Cuál rima con ${byId.get(it.concepto).nombre}?`);
    } else if (it.tarea === 'inicio') {
      assert.equal(inicioDe(correcta.concepto), it.silaba, it.codigo);
      assert.ok(otros.every((o) => inicioDe(o.concepto) !== it.silaba), it.codigo);
    } else {
      const [a, b] = it.palabras;
      assert.equal(correcta.id, a === b ? 'igual' : 'diferente', it.codigo);
      assert.deepEqual(it.opciones.map((o) => o.id), ['igual', 'diferente']);
    }
    // La palabra que se dice nunca aparece entre los dibujos.
    if (it.concepto) assert.ok(it.opciones.every((o) => o.concepto !== it.concepto), it.codigo);
  }
  // B2: siempre que existe, un distractor empieza igual que la palabra (parecido de sonido).
  const conInicio = of('ACT-15', 'B2').filter((it) => conceptos.some((c) => c.id !== it.concepto && inicioDe(c.id) && inicioDe(c.id) === inicioDe(it.concepto) && !rimaDe(it.concepto).includes(c.id)));
  for (const it of conInicio) assert.ok(it.opciones.some((o) => !o.correcta && inicioDe(o.concepto) === inicioDe(it.concepto)), it.codigo);
  assert.deepEqual(f.modalidades, ['AV']);
});

// ---------- Pantallas: letra de las piezas y nombres de clase ----------

test('ACT-16: las piezas escritas de una secuencia caben en su tarjeta con una sola letra para todas', () => {
  // Un ancho de letra aproximado de Noto Sans (0.58 em por carácter), con la letra de 100 px.
  const medir = (t) => t.length * 58;
  assert.equal(secuencia.escalaDePiezas(['ca', 'rro', 'che'], medir), 1, 'las sílabas conservan la letra base');
  assert.equal(secuencia.escalaDePiezas([], medir), 1);
  for (const it of of('ACT-16')) {
    const textos = it.tarjetas.map((t) => t.texto);
    const escala = secuencia.escalaDePiezas(textos, medir);
    assert.ok(escala > 0 && escala <= 1, it.codigo);
    // El texto más largo, con la letra de la tarjeta (0.36 del lado), ocupa a lo más 0.84 del ancho.
    const em = Math.max(...textos.map((t) => medir(t) / 100));
    assert.ok(0.36 * escala * em <= 0.84 + 1e-9, `${it.codigo}: «${textos.join(' ')}»`);
  }
  // En B4 las palabras largas («amarilla», «almohada») reducen la letra.
  assert.ok(of('ACT-16', 'B4').some((it) => secuencia.escalaDePiezas(it.tarjetas.map((t) => t.texto), medir) < 1));
});

test('las pantallas nuevas no usan nombres de clase que styles.css ya usa para otra cosa', () => {
  // Las piezas comunes de la pantalla del niño sí se comparten a propósito.
  const COMPARTIDAS = new Set(['opcion', 'opciones', 'consigna', 'marco']);
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const deStyles = new Set();
  for (const [, selector] of css.matchAll(/([^{}]+)\{/g)) for (const [, c] of selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)) deStyles.add(c);
  assert.ok(deStyles.has('tarjeta') && deStyles.has('opcion'), 'lee los selectores de styles.css');
  for (const mod of ['oracion', 'sonido', 'secuencia', 'cofres', 'senal', 'fonologia']) {
    const js = readFileSync(new URL(`../src/activities/${mod}.js`, import.meta.url), 'utf8');
    const usadas = new Set();
    for (const linea of js.split('\n').filter((l) => /\b(div|el)\(|className =|classList\.add\(/.test(l))) {
      for (const [, texto] of linea.matchAll(/['`]([^'`]*)['`]/g)) {
        for (const c of texto.replace(/\$\{[^}]*\}?/g, ' ').split(/\s+/)) if (/^[a-z][\w-]*$/.test(c)) usadas.add(c);
      }
    }
    assert.ok(usadas.size > 0, mod);
    const chocan = [...usadas].filter((c) => deStyles.has(c) && !COMPARTIDAS.has(c));
    assert.deepEqual(chocan, [], `${mod}: ${chocan.join(', ')}`);
  }
});
