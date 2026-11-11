// Pantallas de las actividades de uso posterior, la pausa guiada y las páginas nuevas del adulto:
// las mismas reglas de accesibilidad que accesibilidad.test.js revisa en el piloto, y la lógica
// que no depende del navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickComposed, rng } from '../src/engine/selector.js';
import { PANTALLAS, PILOTO } from '../src/catalogo.js';
import * as cambiaRegla from '../src/activities/cambia-regla.js';
import * as categorias from '../src/activities/categorias.js';
import * as demora from '../src/activities/demora.js';
import * as patron from '../src/activities/patron.js';
import { elegirPorEmocion, resumenExtra, PRESENTACIONES_MIN } from '../src/activities/emociones.js';
import { PERSONAJES, EMOCIONES, NOMBRE_EMOCION, rostroSVG, pictoEmocionSVG } from '../src/activities/rostros.js';
import { OPCION_MIN_CM, LUGAR_MIN_CM, anchoDeSerie, espacioMinimo, comprobarPantalla, avisoPantalla } from '../src/ajuste-pantalla.js';
import { ESCALA_MIN, ESCALA_MAX, escalaGlobo, pausaGuiada } from '../src/pausa-guiada.js';
import { bloquesDeSesion, indiceDeItems, contextoDeBloque } from '../src/sesiones.js';
import { itemDeEjemplo, previaHTML } from '../src/previa.js';
import { maxEnsayos, pareceNombre } from '../src/inicio.js';
import { esc, miniatura } from '../src/html.js';
import { EQUIPO } from '../src/paginas.js';

const texto = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const leer = (ruta) => JSON.parse(texto(ruta));
const ficha = (id) => leer(`fichas/${id}.json`);
const piloto = leer('items/items.json').items;
const posteriores = leer('items/items-posteriores.json').items;
const banco = [...piloto, ...posteriores];
const css = texto('src/actividades.css');
const POSTERIORES = ['ACT-03', 'ACT-06', 'ACT-08', 'ACT-09', 'ACT-11', 'ACT-14'];
// Código nuevo que corre en el navegador.
const NUEVOS = [
  'src/catalogo.js', 'src/html.js', 'src/inicio.js', 'src/previa.js', 'src/sesiones.js', 'src/ajuste-pantalla.js', 'src/pausa-guiada.js',
  ...['busqueda', 'categorias', 'demora', 'emociones', 'palabra', 'patron', 'rostros'].map((m) => `src/activities/${m}.js`),
];
const reglas = (hoja) => [...hoja.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({ selector: selector.trim(), cuerpo }));

// ---------- Accesibilidad de lo nuevo ----------

test('RNF-05: la hoja de las actividades nuevas no usa @keyframes ni animaciones, y sus transiciones duran de 200 a 300 ms', () => {
  assert.doesNotMatch(css, /@keyframes/);
  assert.doesNotMatch(css, /\banimation(-[a-z]+)?\s*:/);
  for (const [, ms] of css.matchAll(/transition[^;]*?(\d+)ms/g)) assert.ok(+ms >= 200 && +ms <= 300, `transición de ${ms} ms`);
});

test('RNF-05: las opciones y los estímulos nuevos aparecen de golpe, sin opacidad ni visibilidad animada', () => {
  for (const { selector, cuerpo } of reglas(css)) {
    if (/\.opcion|\.caja-categoria|\.serie|\.consigna|\.globo|\.pausa-guiada/.test(selector)) {
      assert.doesNotMatch(cuerpo, /opacity|visibility|animation|transition/, selector);
    }
  }
});

test('RNF-04: en las pantallas nuevas cada opción mide al menos 2 cm y hay 0.5 cm o más entre ellas', () => {
  const tamanos = [...css.matchAll(/--opcion:\s*([^;]+);/g)].map(([, v]) => v.replace(/\s+/g, ' '));
  assert.equal(tamanos.length, 2, 'las cajas de categoría y el conjunto de la búsqueda');
  for (const v of tamanos) assert.match(v, /^clamp\( calc\(var\(--cm\) \* 2\),/, v);
  for (const [, v] of css.matchAll(/--separacion:\s*([^;]+);/g)) {
    const cm = v.trim() === 'var(--cm)' ? 1 : Number(/calc\(var\(--cm\) \* ([\d.]+)\)/.exec(v)?.[1]);
    assert.ok(cm >= 0.5, `separación de ${v}`);
  }
  assert.match(css, /--objetivo:\s*clamp\(calc\(var\(--cm\) \* 2\),/, 'el objetivo de la búsqueda tampoco baja de 2 cm');
});

test('el código nuevo no usa setInterval ni animaciones de la API, ni carga nada de otros servidores', () => {
  for (const ruta of NUEVOS) {
    const src = texto(ruta);
    assert.doesNotMatch(src, /setInterval|\.animate\(/, ruta);
    assert.doesNotMatch(src, /https?:\/\//, `${ruta}: sin recursos externos`);
  }
});

test('la pantalla del niño sigue sin texto: solo la palabra de ACT-03, que es el estímulo', () => {
  for (const m of ['busqueda', 'categorias', 'demora', 'emociones', 'patron', 'rostros']) {
    assert.doesNotMatch(texto(`src/activities/${m}.js`), /textContent|innerText|<text[\s>]/, m);
  }
  assert.doesNotMatch(texto('src/pausa-guiada.js'), /textContent|innerText|<text[\s>]/);
  assert.match(texto('src/activities/palabra.js'), /box\.textContent = consigna\.texto/);
});

test('index.html carga la hoja de las actividades nuevas después de la principal, sin servidores externos', () => {
  const html = texto('index.html');
  const hojas = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(([, h]) => h);
  assert.deepEqual(hojas.slice(0, 2), ['src/styles.css', 'src/actividades.css']);
  assert.doesNotMatch(html, /https?:\/\//);
});

// ---------- ¿Cabe la banda en la pantalla? ----------

test('el tamaño mínimo de cada pantalla sale de las mismas medidas que la hoja de estilos', () => {
  assert.equal(OPCION_MIN_CM, 2);
  // Selección, 4 opciones en fila: 4 × 2 cm, 3 separaciones de 1 cm y medio centímetro de margen.
  assert.deepEqual(espacioMinimo('seleccion', '1x4'), { ancho: 11.5, alto: 5, anchoOpciones: 11.5, anchoSerie: 0 });
  // Cajas de categoría: 1.7 veces más anchas que altas.
  assert.ok(Math.abs(espacioMinimo('categorias', '1x3').ancho - 12.7) < 1e-9);
  assert.match(css, /grid-template-columns: repeat\(var\(--columnas\), calc\(var\(--opcion\) \* 1\.7\)\)/);
  // Búsqueda: toda la pantalla, con el objetivo de 2 cm arriba y 0.5 cm de separación.
  const b = espacioMinimo('busqueda', '4x4');
  assert.equal(b.ancho, 10);
  assert.equal(b.alto, 13);
  assert.match(css, /\.stage-busqueda \{\s*--separacion: calc\(var\(--cm\) \* 0\.5\);/);
  assert.match(css, /var\(--separacion\) \* \(var\(--filas\) \+ 2\)/);
  // «Cambia la regla» separa más sus dos cajas.
  assert.equal(espacioMinimo('cambia-regla', '1x2').ancho, 7.5);
  // Una pantalla desconocida se trata como la de selección.
  assert.deepEqual(espacioMinimo('otra', '1x2'), espacioMinimo('seleccion', '1x2'));
});

test('la serie de «Completa el patrón» pide ancho para que cada lugar mida al menos 1 cm', () => {
  assert.equal(LUGAR_MIN_CM, 1);
  assert.equal(anchoDeSerie(0), 0);
  assert.ok(Math.abs(anchoDeSerie(9) - 13.7) < 1e-9, '9 lugares de 1 cm, 0.3 cm entre ellos y 1 cm libre a cada lado');
  assert.match(css, /--lugar: min\(calc\(var\(--cm\) \* 1\.9\), \(100vw - var\(--cm\) \* 2\) \/ var\(--lugares\) - var\(--cm\) \* 0\.3\);/);
  // Cada banda de la ficha dice cuántas figuras muestra: de ahí sale el número de lugares.
  for (const b of ficha('ACT-11').bandas) {
    const lugares = Math.max(...b.largos) + 1;
    const min = espacioMinimo('patron', b.disposicion, { lugares });
    assert.equal(min.ancho, Math.max(min.anchoOpciones, min.anchoSerie), b.id);
    assert.ok(min.anchoSerie > 0, b.id);
  }
});

test('comprobarPantalla avisa cuando no cabe y sugiere girar la tableta si así sí cabe', () => {
  const tableta = { anchoPx: 1024, altoPx: 768, cmPx: 50 }; // 20.5 × 15.4 cm
  for (const id of [...PILOTO, ...POSTERIORES]) {
    const f = ficha(id);
    for (const b of f.bandas) {
      const r = comprobarPantalla({ pantalla: f.pantalla, disposicion: b.disposicion, lugares: b.largos ? Math.max(...b.largos) + 1 : 0, ...tableta });
      assert.ok(r.cabe, `${id} ${b.id} cabe en una tableta de 10 pulgadas en horizontal`);
      assert.equal(r.falta, null);
    }
  }
  // La búsqueda de 16 dibujos necesita 13 cm de alto: en un celular acostado no cabe ni girando.
  const celular = comprobarPantalla({ pantalla: 'busqueda', disposicion: '4x4', anchoPx: 800, altoPx: 360, cmPx: 60 });
  assert.deepEqual([celular.cabe, celular.girar, celular.falta], [false, false, 'opciones']);
  assert.match(avisoPantalla(celular, 16), /no caben 16 opciones de 2 cm.*10 × 13 cm.*pantalla más grande/);
  // Cuatro opciones en fila: no caben en vertical, pero sí al girar.
  const vertical = comprobarPantalla({ pantalla: 'seleccion', disposicion: '1x4', anchoPx: 500, altoPx: 800, cmPx: 50 });
  assert.deepEqual([vertical.cabe, vertical.girar], [false, true]);
  assert.match(avisoPantalla(vertical, 4), /Gira la tableta\.$/);
  // Las opciones caben, pero la serie quedaría demasiado chica.
  const serie = comprobarPantalla({ pantalla: 'patron', disposicion: '1x2', lugares: 9, anchoPx: 600, altoPx: 800, cmPx: 50 });
  assert.deepEqual([serie.cabe, serie.falta, serie.girar], [false, 'serie', true]);
  assert.match(avisoPantalla(serie, 2), /la serie de 9 lugares quedaría con figuras de menos de 1 cm.*13,7 cm de ancho.*Gira la tableta/);
});

// ---------- ACT-17: pausa guiada ----------

const RITMOS = ficha('ACT-17').ritmos;

test('el globo se infla y se desinfla despacio, sin saltos y siempre entre su tamaño mínimo y máximo', () => {
  for (const ritmo of RITMOS) {
    const ciclo = ritmo.inflarMs + ritmo.desinflarMs;
    assert.equal(escalaGlobo(0, ritmo), ESCALA_MIN);
    assert.ok(Math.abs(escalaGlobo(ritmo.inflarMs, ritmo) - ESCALA_MAX) < 1e-9, 'lleno al terminar de inflar');
    assert.ok(Math.abs(escalaGlobo(ciclo, ritmo) - ESCALA_MIN) < 1e-9, 'el ciclo vuelve a empezar');
    assert.ok(Math.abs(escalaGlobo(ciclo * 3 + 1234, ritmo) - escalaGlobo(1234, ritmo)) < 1e-9, 'todos los ciclos son iguales');
    let previa = escalaGlobo(0, ritmo);
    for (let t = 16; t <= ciclo; t += 16) {
      const e = escalaGlobo(t, ritmo);
      assert.ok(e >= ESCALA_MIN - 1e-9 && e <= ESCALA_MAX + 1e-9, `${ritmo.id}: tamaño ${e}`);
      // A 60 cuadros por segundo el tamaño cambia menos de un 1 % por cuadro: nada destella.
      assert.ok(Math.abs(e - previa) < 0.01, `${ritmo.id}: salto en ${t} ms`);
      // El cuadro que cruza el punto más alto puede quedar de cualquiera de los dos lados.
      if (t <= ritmo.inflarMs) assert.ok(e >= previa, `${ritmo.id}: al inflar solo crece`);
      else if (t - 16 >= ritmo.inflarMs) assert.ok(e <= previa + 1e-9, `${ritmo.id}: al desinflar solo se encoge`);
      previa = e;
    }
  }
});

// Un navegador de mentira, lo justo para la pausa: un reloj a mano y una cola de cuadros.
function navegador({ quieto = false } = {}) {
  const cuerpo = { style: {} };
  const esquina = {};
  const estado = { enPantalla: false, toques: null, t: 0, cola: [], cuerpo };
  const capa = { querySelector: (s) => (s === '#globo-cuerpo' ? cuerpo : esquina), remove: () => { estado.enPantalla = false; } };
  globalThis.document = { createElement: () => capa };
  globalThis.matchMedia = () => ({ matches: quieto });
  estado.host = { append: () => { estado.enPantalla = true; } };
  estado.opciones = {
    now: () => estado.t,
    raf: (fn) => estado.cola.push(fn),
    caf: () => { estado.cola.length = 0; },
    dosToques: (el, fn) => { assert.equal(el, esquina); estado.toques = fn; },
  };
  estado.avanzar = (ms) => {
    const escalas = [];
    for (let k = 0; k < ms / 50 && estado.cola.length; k++) {
      estado.t += 50;
      estado.cola.shift()();
      escalas.push(Number(/scale\(([\d.]+)\)/.exec(cuerpo.style.transform)[1]));
    }
    return escalas;
  };
  return estado;
}

test('la pausa guiada termina sola al cumplirse el tiempo y dice cuánto duró', async () => {
  const nav = navegador();
  const pausa = pausaGuiada(nav.host, { ritmo: RITMOS[0], duracionS: 60, ...nav.opciones });
  assert.ok(nav.enPantalla);
  const escalas = nav.avanzar(120000);
  assert.deepEqual(await pausa, { duracion_ms: 60000, completa: true });
  assert.equal(nav.enPantalla, false, 'el globo se quita de la pantalla');
  assert.equal(nav.cola.length, 0, 'no quedan cuadros pendientes');
  assert.ok(Math.min(...escalas) >= ESCALA_MIN && Math.max(...escalas) <= ESCALA_MAX);
  assert.ok(Math.max(...escalas) > 0.99 && Math.min(...escalas) < ESCALA_MIN + 0.01, 'recorrió el ciclo completo');
});

test('dos toques del terapeuta en la esquina detienen la pausa guiada en ese momento', async () => {
  const nav = navegador();
  const pausa = pausaGuiada(nav.host, { ritmo: RITMOS[1], duracionS: 120, ...nav.opciones });
  nav.avanzar(7000);
  nav.toques();
  assert.deepEqual(await pausa, { duracion_ms: 7000, completa: false });
  assert.equal(nav.enPantalla, false);
  assert.equal(nav.cola.length, 0);
});

test('con «reducir movimiento», el globo solo cambia entre dos tamaños, con una transición de 300 ms', async () => {
  const nav = navegador({ quieto: true });
  const pausa = pausaGuiada(nav.host, { ritmo: RITMOS[0], duracionS: 60, ...nav.opciones });
  const escalas = nav.avanzar(120000);
  await pausa;
  assert.deepEqual([...new Set(escalas)].sort(), [ESCALA_MIN, ESCALA_MAX]);
  assert.equal(nav.cuerpo.style.transition, 'transform 300ms ease-out');
});

// ---------- ACT-14: rostros y emociones ----------

test('cada personaje tiene un rostro distinto para cada emoción e intensidad, sin texto ni archivos', () => {
  const dibujos = new Set();
  for (const p of Object.keys(PERSONAJES)) {
    for (const e of EMOCIONES) {
      for (const intensidad of ['alta', 'baja']) {
        const svg = rostroSVG(p, e, intensidad);
        // Como las imágenes del piloto (alt vacío): el dibujo es el estímulo y no se describe,
        // y menos con el nombre de la emoción, que es la respuesta.
        assert.match(svg, /^<svg [^>]*aria-hidden="true"/, `${p} ${e}`);
        assert.doesNotMatch(svg, /<text|aria-label|href=|url\(|NaN|undefined/, `${p} ${e} ${intensidad}`);
        dibujos.add(svg);
      }
    }
  }
  assert.equal(dibujos.size, Object.keys(PERSONAJES).length * EMOCIONES.length * 2);
  // Diversidad que pide el Catálogo: edad, género y tono de piel.
  const tonos = new Set(Object.values(PERSONAJES).map((p) => p.piel));
  assert.ok(tonos.size >= 4, `${tonos.size} tonos de piel`);
  assert.ok(Object.keys(PERSONAJES).some((p) => p.startsWith('nina')) && Object.keys(PERSONAJES).some((p) => p.startsWith('nino')));
  assert.ok(Object.keys(PERSONAJES).includes('abuelo') && Object.keys(PERSONAJES).includes('mujer'));
});

test('hay un pictograma distinto por emoción, sin texto', () => {
  const pictos = EMOCIONES.map(pictoEmocionSVG);
  assert.equal(new Set(pictos).size, EMOCIONES.length);
  for (const svg of pictos) {
    assert.match(svg, /^<svg [^>]*aria-hidden="true"/);
    assert.doesNotMatch(svg, /<text|aria-label|href=|NaN|undefined/);
  }
  assert.deepEqual(Object.keys(NOMBRE_EMOCION), EMOCIONES);
});

test('el bloque de emociones reparte los ensayos por igual y no repite la misma emoción tres veces seguidas', () => {
  const f = ficha('ACT-14');
  for (const b of f.bandas) {
    const deBanda = posteriores.filter((i) => i.actividad === 'ACT-14' && i.banda === b.id);
    for (const semilla of [1, 2, 3, 4, 5]) {
      const elegidos = elegirPorEmocion(deBanda, f.ensayosPorBloque, rng(semilla));
      assert.equal(elegidos.length, f.ensayosPorBloque);
      for (const e of b.emociones) assert.equal(elegidos.filter((i) => i.emocion === e).length, f.ensayosPorBloque / b.emociones.length, `${b.id}: ${e}`);
      elegidos.forEach((it, k) => assert.ok(k < 2 || !(elegidos[k - 1].emocion === it.emocion && elegidos[k - 2].emocion === it.emocion), `${b.id}: tres seguidas`));
      assert.equal(new Set(elegidos.map((i) => i.codigo)).size, elegidos.length, `${b.id}: sin ítems repetidos mientras alcancen`);
      assert.deepEqual(elegirPorEmocion(deBanda, f.ensayosPorBloque, rng(semilla)), elegidos, 'la misma semilla da el mismo bloque');
    }
    // Con más ensayos que ítems, da otra vuelta en lugar de fallar.
    assert.equal(elegirPorEmocion(deBanda, deBanda.length + 4, rng(9)).length, deBanda.length + 4);
  }
});

test('el resumen de emociones cuenta qué pictograma eligió ante cada emoción, sin interpretar', () => {
  const byCode = new Map(posteriores.filter((i) => i.actividad === 'ACT-14').map((i) => [i.codigo, i]));
  const de = (emocion) => [...byCode.values()].find((i) => i.banda === 'B2' && i.emocion === emocion).codigo;
  const fila = (emocion, elegida, extra = {}) => ({ item: de(emocion), opcion_elegida_id: elegida, ...extra });
  const lineas = resumenExtra(
    [
      fila('tristeza', 'tristeza'), fila('tristeza', 'alegria'), fila('tristeza', 'tristeza'),
      fila('alegria', 'alegria'),
      fila('miedo', null), fila('miedo', 'enojo'), fila('miedo', 'miedo'), fila('miedo', null),
      fila('enojo', 'enojo', { interrumpido: true }), // no cuenta
    ],
    byCode,
  );
  assert.deepEqual(lineas, [
    'Rostros de alegría (1): eligió alegría 1 vez.',
    'Rostros de tristeza (3): eligió alegría 1 vez y tristeza 2 veces.',
    'Rostros de miedo (4): eligió enojo 1 vez y miedo 1 vez; sin respuesta 2 veces.',
    `Con menos de ${PRESENTACIONES_MIN} presentaciones por emoción, estos conteos no se interpretan.`,
  ]);
  assert.equal(PRESENTACIONES_MIN, 10, 'las 10 presentaciones por emoción que pide el Catálogo');
  const diez = Array.from({ length: 10 }, () => fila('alegria', 'alegria'));
  assert.deepEqual(resumenExtra(diez, byCode), ['Rostros de alegría (10): eligió alegría 10 veces.']);
  assert.deepEqual(resumenExtra([], byCode), []);
  for (const l of lineas) assert.doesNotMatch(l, /bien|mal|correct|habilidad|déficit|normal/i, l);
});

// ---------- Las demás pantallas ----------

test('ACT-09: la pausa de la banda se suma al tiempo de la muestra sin tocar la ficha', () => {
  const f = ficha('ACT-09');
  const copia = structuredClone(f);
  for (const b of f.bandas) {
    const deBloque = demora.fichaDeBloque(f, b);
    assert.equal(deBloque.consignaVMs, f.muestraMs + b.demoraMs, b.id);
    assert.equal(deBloque.limiteRespuestaMs, f.limiteRespuestaMs);
    assert.match(demora.notaPrevia(f, b), b.demoraMs ? new RegExp(`${b.demoraMs / 1000} s después`) : /enseguida/);
    assert.match(demora.consignaTexto({}, { ficha: f, banda: b }), /^Muestra durante 2 s; /);
  }
  assert.deepEqual(f, copia, 'la ficha original no cambia');
});

test('ACT-06: el juego de cajas alterna entre sesiones y sus pictogramas se cargan desde el inicio', () => {
  const f = ficha('ACT-06');
  const [b1, b2] = f.bandas;
  assert.deepEqual([0, 1, 2, 3].map((n) => categorias.juegoDeSesion(b1, n)), [0, 1, 2, 0]);
  assert.deepEqual([0, 1, 2].map((n) => categorias.juegoDeSesion(b2, n)), [0, 1, 0]);
  const item = posteriores.find((i) => i.actividad === 'ACT-06' && i.banda === 'B2');
  const [t] = categorias.toTrials([item]);
  assert.equal(t.codigo, item.codigo);
  assert.equal(t.imagenes.length, 6, 'tres cajas con dos pictogramas cada una');
  assert.ok(t.imagenes.every((src) => src.startsWith('assets/picto/')));
  assert.equal(categorias.opcionTexto(item.opciones[0]), `Caja de ${item.opciones[0].nombre.toLowerCase()}`);
});

test('ACT-11: las figuras se nombran con concordancia y la serie en chico termina en el lugar vacío', () => {
  assert.equal(patron.nombreFigura({ forma: 'estrella', color: 'amarillo' }), 'estrella amarilla');
  assert.equal(patron.nombreFigura({ forma: 'circulo', color: 'amarillo' }), 'círculo amarillo');
  assert.equal(patron.nombreFigura({ forma: 'triangulo', color: 'azul' }), 'triángulo azul');
  const f = ficha('ACT-11');
  const dibujos = new Set(f.figuras.flatMap((forma) => f.colores.map((color) => patron.figuraSVG(forma, color))));
  assert.equal(dibujos.size, f.figuras.length * f.colores.length);
  for (const svg of dibujos) assert.doesNotMatch(svg, /undefined|<text/);
  const item = posteriores.find((i) => i.actividad === 'ACT-11');
  const html = patron.consignaHTML(item.consigna);
  assert.equal(html.match(/class="dib"/g).length, item.consigna.serie.length);
  assert.match(html, /<span class="dib dib-hueco"><\/span><\/span>$/);
});

// ---------- Sesiones ----------

test('la página de sesiones agrupa los ensayos por bloque, en orden', () => {
  const filas = [{ bloque: 2, ensayo: 1 }, { bloque: 1, ensayo: 1 }, { bloque: 2, ensayo: 2 }, { bloque: 1, ensayo: 2 }];
  const bloques = bloquesDeSesion(filas);
  assert.deepEqual(bloques.map((b) => b.bloque), [1, 2]);
  assert.deepEqual(bloques.map((b) => b.filas.map((r) => r.ensayo)), [[1, 2], [1, 2]]);
  assert.deepEqual(bloquesDeSesion([]), []);
});

test('el resumen de una sesión guardada reconstruye en qué ensayos cambió la regla, igual que el bloque en vivo', () => {
  const f = ficha('ACT-07');
  const indice = indiceDeItems(banco);
  for (const banda of f.bandas) {
    const deBanda = piloto.filter((i) => i.actividad === 'ACT-07' && i.banda === banda.id);
    const elegidas = pickComposed(deBanda, banda.composicion, ['forma', 'color'], rng(11));
    const ensayos = cambiaRegla.toTrials(elegidas, { banda, pareja: f.parejas[0] });
    const filas = ensayos.map((t, k) => ({ item: t.codigo, bloque: 1, ensayo: k + 1 }));
    const { cambio, extra } = contextoDeBloque(filas, f, indice);
    assert.deepEqual(filas.map(cambio), ensayos.map((t) => t.cambio), banda.id);
    assert.deepEqual(extra, []);
    if (banda.cambio !== 'ninguno') assert.ok(filas.some(cambio), `${banda.id}: hay cambios de regla`);
  }
});

test('el resumen de una sesión guardada incluye las líneas por emoción, y las omite si el ítem ya no existe', () => {
  const f = ficha('ACT-14');
  const indice = indiceDeItems(banco);
  const deBanda = posteriores.filter((i) => i.actividad === 'ACT-14' && i.banda === 'B1').slice(0, 4);
  const filas = deBanda.map((it, k) => ({ item: it.codigo, bloque: 1, ensayo: k + 1, opcion_elegida_id: it.emocion }));
  const { extra, cambio } = contextoDeBloque(filas, f, indice);
  assert.ok(extra.length >= 2 && extra[0].startsWith('Rostros de '));
  assert.ok(filas.every((r) => !cambio(r)));
  assert.deepEqual(contextoDeBloque([...filas, { item: 'ACT14-B9-99' }], f, indice).extra, []);
});

// ---------- Inicio ----------

test('la vista previa del inicio dibuja un ítem de ejemplo de cada banda, con sus opciones', () => {
  for (const id of [...PILOTO, ...POSTERIORES]) {
    const f = ficha(id);
    assert.ok(PANTALLAS[f.pantalla], id);
    for (const banda of f.bandas) {
      const html = previaHTML({ ficha: f, banda, items: banco });
      assert.match(html, /role="img" aria-label="Ejemplo de la pantalla del niño: /, `${id} ${banda.id}`);
      assert.equal(html.match(/class="previa-caja/g).length, banda.opciones + 1, `${id} ${banda.id}: la consigna y sus opciones`);
      assert.doesNotMatch(html, /undefined|NaN/, `${id} ${banda.id}`);
      const ejemplo = itemDeEjemplo(banco, f, banda);
      assert.ok(ejemplo.muestraExpertos, `${id} ${banda.id}: el ejemplo sale de la muestra para expertos`);
      assert.equal(ejemplo.juego ?? 0, 0);
    }
  }
  assert.equal(previaHTML({ ficha: ficha('ACT-01'), banda: ficha('ACT-01').bandas[0], items: [] }), '');
});

test('el número máximo de ensayos sale de la ficha: «Cambia la regla» no pasa de sus secuencias', () => {
  const f07 = ficha('ACT-07');
  for (const b of f07.bandas) assert.equal(maxEnsayos(f07, b), b.composicion.length * f07.ensayosPorSecuencia);
  assert.equal(maxEnsayos(ficha('ACT-01'), ficha('ACT-01').bandas[0]), 200);
});

test('el inicio avisa cuando el código de la sesión parece un nombre', () => {
  for (const c of ['Juan Pérez', 'MATEO', 'María José', 'Ana', 'O’Brien']) assert.equal(pareceNombre(c), true, c);
  // Los códigos con números, el de ejemplo y los campos vacíos no avisan.
  for (const c of ['DEMO', 'demo', 'N07', 'P-012', 'niño 3', 'SOFI_2', 'AB', '', undefined]) assert.equal(pareceNombre(c), false, String(c));
});

// ---------- Utilidades y créditos ----------

test('el texto que llega a la página se escapa', () => {
  assert.equal(esc(`<b a="1">Tom & 'Jerry'</b>`), '&lt;b a=&quot;1&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;');
  assert.equal(miniatura('assets/img/a"b.jpg'), '<img src="assets/img/a&quot;b.jpg" alt="" loading="lazy">');
});

test('los créditos nombran a las dos personas del equipo, con su rol', () => {
  assert.deepEqual(EQUIPO.map((p) => p.nombre), ['Luis Nazariego Santome', 'José Miguel Fausto Tapia']);
  for (const p of EQUIPO) assert.ok(p.rol?.trim() && (p.hizo ?? p.aporte ?? p.trabajo ?? p.detalle)?.length, p.nombre);
  const readme = texto('README.md');
  for (const p of EQUIPO) assert.ok(readme.includes(p.nombre), `README: ${p.nombre}`);
});
