// Páginas del adulto (inicio, vista previa, ajuste de pantalla, sesiones y créditos): la lógica que
// no depende del navegador y las reglas que el código debe cumplir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickComposed, rng } from '../src/engine/selector.js';
import { PANTALLAS, PILOTO } from '../src/catalogo.js';
import * as cambiaRegla from '../src/activities/cambia-regla.js';
import { OPCION_MIN_CM, espacioMinimo, comprobarPantalla, avisoPantalla } from '../src/ajuste-pantalla.js';
import { bloquesDeSesion, indiceDeItems, contextoDeBloque, lineasDeBloque, tipoDeSesion, participanteDeSesion, lineaReferencia } from '../src/sesiones.js';
import { itemDeEjemplo, previaHTML } from '../src/previa.js';
import { maxEnsayos, participanteElegido } from '../src/inicio.js';
import { DEMO, crearNino, abreviar, nombreNino } from '../src/ninos.js';
import { REF_MIN_VALIDOS } from '../src/engine/referencia.js';
import { summarize } from '../src/engine/quality.js';
import { esc, miniatura } from '../src/html.js';
import { EQUIPO } from '../src/paginas.js';

const texto = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const leer = (ruta) => JSON.parse(texto(ruta));
const ficha = (id) => leer(`fichas/${id}.json`);
const banco = leer('items/items.json').items;
// Código de las pantallas del adulto que corre en el navegador.
const ADULTO = ['src/app.js', 'src/catalogo.js', 'src/html.js', 'src/inicio.js', 'src/previa.js', 'src/sesiones.js', 'src/resumen.js', 'src/ajuste-pantalla.js', 'src/paginas.js'];

test('el código del adulto no usa setInterval ni animaciones de la API, ni carga nada de otros servidores', () => {
  for (const ruta of ADULTO) {
    const src = texto(ruta);
    assert.doesNotMatch(src, /setInterval|\.animate\(/, ruta);
    // Ningún recurso se pide a otro servidor (el texto de atribución de ARASAAC sí lleva su dirección).
    assert.doesNotMatch(src, /(src|srcset)=["']https?:|url\(["']?https?:|from ["']https?:|fetch\(["']https?:/, `${ruta}: sin recursos externos`);
  }
  assert.doesNotMatch(texto('index.html'), /https?:\/\//);
  // En la hoja de estilos, solo íconos incrustados (data:) y tipografías del repositorio o instaladas.
  for (const [, valor] of texto('src/styles.css').matchAll(/url\(\s*["']?([^"')]+)/g)) assert.match(valor, /^(data:|\.\.\/assets\/fonts\/)/, valor);
});

// ---------- ¿Cabe la banda en la pantalla? ----------

test('el tamaño mínimo de cada pantalla sale de las mismas medidas que la hoja de estilos', () => {
  assert.equal(OPCION_MIN_CM, 2);
  const css = texto('src/styles.css');
  assert.match(css, /--separacion: calc\(var\(--cm\) \* 1\);/);
  assert.match(css, /--opcion: clamp\(\s*calc\(var\(--cm\) \* 2\),/);
  // Selección, 4 opciones en fila: 4 × 2 cm, 3 separaciones de 1 cm y medio centímetro de margen;
  // de alto, dos veces la fila de opciones, porque van en la mitad de abajo.
  assert.deepEqual(espacioMinimo('seleccion', '1x4'), { ancho: 11.5, alto: 5 });
  // «Cambia la regla» separa más sus dos cajas.
  assert.equal(espacioMinimo('cambia-regla', '1x2').ancho, 7.5);
  // Una pantalla desconocida se trata como la de selección.
  assert.deepEqual(espacioMinimo('otra', '1x2'), espacioMinimo('seleccion', '1x2'));
});

test('comprobarPantalla avisa cuando no cabe y sugiere girar la tableta si así sí cabe', () => {
  const tableta = { anchoPx: 1024, altoPx: 768, cmPx: 50 }; // 20.5 × 15.4 cm
  for (const id of PILOTO) {
    const f = ficha(id);
    for (const b of f.bandas) {
      // Igual que el inicio: sin disposición en la ficha, las opciones van en una fila.
      const r = comprobarPantalla({ pantalla: f.pantalla, disposicion: b.disposicion ?? `1x${b.opciones}`, ...tableta });
      assert.ok(r.cabe, `${id} ${b.id} cabe en una tableta de 10 pulgadas en horizontal`);
    }
  }
  // Cuatro opciones en fila: no caben en vertical, pero sí al girar.
  const vertical = comprobarPantalla({ pantalla: 'seleccion', disposicion: '1x4', anchoPx: 500, altoPx: 800, cmPx: 50 });
  assert.deepEqual([vertical.cabe, vertical.girar], [false, true]);
  assert.match(avisoPantalla(vertical, 4), /no caben 4 opciones de 2 cm.*11,5 × 5 cm.*Gira la tableta\.$/);
  // En una pantalla chica no caben ni girando.
  const chica = comprobarPantalla({ pantalla: 'seleccion', disposicion: '1x4', anchoPx: 400, altoPx: 300, cmPx: 60 });
  assert.deepEqual([chica.cabe, chica.girar], [false, false]);
  assert.match(avisoPantalla(chica, 4), /pantalla más grande o una banda con menos opciones\.$/);
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
    const deBanda = banco.filter((i) => i.actividad === 'ACT-07' && i.banda === banda.id);
    const elegidas = pickComposed(deBanda, banda.composicion, ['forma', 'color'], rng(11));
    const ensayos = cambiaRegla.toTrials(elegidas, { banda, pareja: f.parejas[0] });
    const filas = ensayos.map((t, k) => ({ item: t.codigo, bloque: 1, ensayo: k + 1 }));
    const { cambio } = contextoDeBloque(filas, f, indice);
    assert.deepEqual(filas.map(cambio), ensayos.map((t) => t.cambio), banda.id);
    if (banda.cambio !== 'ninguno') assert.ok(filas.some(cambio), `${banda.id}: hay cambios de regla`);
  }
});

test('las líneas de un bloque guardado son las mismas que las del motor', () => {
  const f = ficha('ACT-01');
  const filas = banco
    .filter((i) => i.actividad === 'ACT-01')
    .slice(0, 3)
    .map((it, k) => ({ item: it.codigo, bloque: 1, ensayo: k + 1, resultado: 'acierto', valido: true, tr_ms: 900 + k }));
  assert.deepEqual(lineasDeBloque(filas, f, indiceDeItems(banco)), summarize(filas, f, { cambio: () => false }));
});

// ---------- Inicio ----------

test('la vista previa del inicio dibuja un ítem de ejemplo de cada banda, con sus opciones', () => {
  for (const id of PILOTO) {
    const f = ficha(id);
    assert.ok(PANTALLAS[f.pantalla], id);
    for (const banda of f.bandas) {
      const html = previaHTML({ ficha: f, banda, items: banco });
      assert.match(html, /role="img" aria-label="Ejemplo de la pantalla del niño: /, `${id} ${banda.id}`);
      const [arriba, abajo] = html.split('class="previa-opciones"');
      assert.equal(abajo.match(/class="previa-caja/g).length, banda.opciones, `${id} ${banda.id}: sus opciones`);
      assert.equal(arriba.match(/class="previa-caja/g).length, 1, `${id} ${banda.id}: la consigna`);
      assert.doesNotMatch(html, /undefined|NaN/, `${id} ${banda.id}`);
      assert.ok(itemDeEjemplo(banco, f, banda).muestraExpertos, `${id} ${banda.id}: el ejemplo sale de la muestra para expertos`);
    }
  }
  assert.equal(previaHTML({ ficha: ficha('ACT-01'), banda: ficha('ACT-01').bandas[0], items: [] }), '');
});

test('el número máximo de ensayos sale de la ficha: «Cambia la regla» no pasa de sus secuencias', () => {
  const f07 = ficha('ACT-07');
  for (const b of f07.bandas) assert.equal(maxEnsayos(f07, b), b.composicion.length * f07.ensayosPorSecuencia);
  assert.equal(maxEnsayos(ficha('ACT-01'), ficha('ACT-01').bandas[0]), 200);
});

test('el inicio no preselecciona a ningún niño: con padrón hay que elegir; sin padrón solo hay demostración', () => {
  const a = crearNino({ edad_meses: 60 });
  const b = crearNino({ edad_meses: 72 }, [a]);
  assert.equal(participanteElegido(undefined, []), DEMO);
  assert.equal(participanteElegido(undefined, [a, b]), '', 'con niños inscritos se elige de forma deliberada');
  assert.equal(participanteElegido(b.codigo, [a, b]), b.codigo);
  assert.equal(participanteElegido(DEMO, [a, b]), DEMO);
  // Un código que ya no está en el padrón no deja a otro participante elegido en silencio.
  assert.equal(participanteElegido('f'.repeat(32), [a, b]), '');
  assert.equal(participanteElegido('f'.repeat(32), []), DEMO);
});

test('el inicio no tiene ningún campo de texto: ni código libre ni nombre', () => {
  const inicio = texto('src/inicio.js');
  assert.doesNotMatch(inicio, /name="codigo"|<textarea|type="(text|email|tel|date|search)"|contenteditable/i);
  assert.match(inicio, /<select name="participante"/);
  // La única entrada que se escribe es el número de ensayos.
  assert.deepEqual([...inicio.matchAll(/<input type="(\w+)"/g)].map((m) => m[1]).filter((t) => !['radio', 'checkbox', 'range'].includes(t)), ['number']);
});

// ---------- Sesiones con el padrón de niños y la referencia motora ----------

test('la página de sesiones distingue niño, demostración y modo experto por el prefijo de la sesión', () => {
  assert.equal(tipoDeSesion('S-1a2b3c4d'), 'nino');
  assert.equal(tipoDeSesion('DEMO-1a2b3c4d'), 'demo');
  assert.equal(tipoDeSesion('EXP-1a2b3c4d'), 'experto');
});

test('la página de sesiones nombra al niño por su ícono y su código abreviado, nunca por un dato personal', () => {
  const n = crearNino({ edad_meses: 80 });
  const sesion = { sesion_id: 'S-1a2b3c4d', codigo_nino: n.codigo };
  assert.equal(participanteDeSesion(sesion, [n]), `${nombreNino(n)} · ${abreviar(n.codigo)}`);
  // Si el niño ya no está en el padrón de este dispositivo, queda el código abreviado.
  assert.equal(participanteDeSesion(sesion, []), `código ${abreviar(n.codigo)}`);
  assert.ok(!participanteDeSesion(sesion, []).includes(n.codigo), 'el código completo no se muestra');
  // Las sesiones guardadas con una versión anterior conservan su código tal cual.
  assert.equal(participanteDeSesion({ sesion_id: 'S-00ff00ff', codigo_nino: 'N07' }, [n]), 'código N07');
  for (const id of ['DEMO-1a2b3c4d', 'EXP-1a2b3c4d']) assert.equal(participanteDeSesion({ sesion_id: id, codigo_nino: DEMO }, [n]), 'sin niño');
});

test('la página de sesiones describe la referencia motora sin interpretarla', () => {
  assert.equal(lineaReferencia({ sesion_id: 'EXP-1' }), '', 'el modo experto no tiene referencia');
  assert.equal(lineaReferencia({ sesion_id: 'S-1', referencia_motora_n: null, referencia_motora_ms: null }), '');
  assert.equal(
    lineaReferencia({ referencia_motora_ms: 512.4, referencia_motora_n: 6, referencia_motora_anticipados: 0 }),
    'referencia motora: mediana de 512 ms en 6 toques válidos',
  );
  assert.equal(
    lineaReferencia({ referencia_motora_ms: 480, referencia_motora_n: 5, referencia_motora_anticipados: 2 }),
    'referencia motora: mediana de 480 ms en 5 toques válidos; 2 toques anticipados, que no cuentan',
  );
  assert.equal(
    lineaReferencia({ referencia_motora_ms: null, referencia_motora_n: 3, referencia_motora_anticipados: 1 }),
    `referencia motora no disponible (3 toques válidos de los ${REF_MIN_VALIDOS} necesarios; 1 toque anticipado, que no cuenta)`,
  );
});

// ---------- Utilidades y créditos ----------

test('el texto que llega a la página se escapa', () => {
  assert.equal(esc(`<b a="1">Tom & 'Jerry'</b>`), '&lt;b a=&quot;1&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;');
  assert.equal(miniatura('assets/img/a"b.svg'), '<img src="assets/img/a&quot;b.svg" alt="" loading="lazy">');
});

test('los créditos nombran a las dos personas del equipo, con su rol', () => {
  assert.deepEqual(EQUIPO.map((p) => p.nombre), ['Luis Nazariego Santome', 'José Miguel Fausto Tapia']);
  for (const p of EQUIPO) assert.ok(p.rol?.trim() && p.aporte?.length, p.nombre);
  const readme = texto('README.md');
  for (const p of EQUIPO) assert.ok(readme.includes(p.nombre), `README: ${p.nombre}`);
});
