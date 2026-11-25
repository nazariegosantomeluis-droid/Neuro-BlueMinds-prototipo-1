// Panel del terapeuta (H5.1 a H5.5; Arquitectura 6.4, 8.2, 8.3, 8.5 y 14; Modelo 4.4, 6.3 y 6.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  texto, frase, patronDe, historialDelNino, historialHTML, sesionHTML, bandaDeVariacion, ladoFuera, persiste, bandasDeLineaBase, sesionesDeLineaBase, lecturasACT07, marcaRegistro,
} from '../src/panel/panel.js';
import { calcularIndicadores } from '../src/indicadores/exportar.js';
import { PARAMETROS } from '../src/indicadores/parametros.js';
import { fila } from '../tools/filas-prueba.mjs';
import { tasa } from '../tools/simular-banda.mjs';
import { wilson } from '../src/indicadores/estadistica.js';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const plantillas = JSON.parse(leer('src/panel/plantillas.json'));
const config = JSON.parse(leer('fichas/sesion.json'));
const fichas = Object.fromEntries(['ACT-01', 'ACT-02', 'ACT-07'].map((id) => [id, JSON.parse(leer(`fichas/${id}.json`))]));
const NINO = 'NBM-PRUEBA';

// Una sesión sintética de ACT-02: n ensayos, con p aciertos de cada 10 y tiempos alrededor de rt ms.
function sesion(id, modo, { n = 30, aciertos = 8, rt = 900, extra = {} } = {}) {
  const rows = Array.from({ length: n }, (_, i) =>
    fila(i + 1, {
      sesion_id: id,
      codigo_nino: NINO,
      modo_fase: modo,
      item: `ACT02-B2-${String((i % 20) + 1).padStart(2, '0')}`,
      t_opciones: 10000 + i * 12000,
      tr_bruto_ms: rt + ((i * 37) % 200),
      acierto: i % 10 < aciertos,
      opcion_elegida_id: i % 10 < aciertos ? 'correcta' : 'otra',
    }),
  );
  return { rows, s: { sesion_id: id, codigo_nino: NINO, modo_fase: modo, duracion_uso_ms: 9 * 60000 + 5000, pausas: [{}], ...extra } };
}

function datos({ fase3 = [{}, {}] } = {}) {
  const ss = [];
  for (let k = 0; k < 5; k++) ss.push(sesion(`S-b${k}`, 'fase1', { rt: 900 + k * 10 }));
  fase3.forEach((o, k) => ss.push(sesion(`S-f${k}`, 'fase3', o)));
  return { sesiones: ss.map((x) => x.s), ensayos: ss.flatMap((x) => x.rows) };
}

const historial = (d) => historialDelNino({ codigo: NINO, sesiones: d.sesiones, ensayos: d.ensayos, fichas, items: [] });

// Revisa un HTML del panel: toda frase está en un elemento con data-plantilla, su texto es el de
// esa plantilla (con los huecos llenos) y no queda ningún otro texto. Devuelve los ids usados.
function revisarHTML(html) {
  const usados = [];
  const desescapar = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const sin = html.replace(/<(\w+)([^>]*)data-plantilla="([A-Z]+-\d+)"([^>]*)>([^<]*)<\/\1>/g, (_, tag, a, id, b, t) => {
    const p = plantillas.plantillas[id];
    assert.ok(p, `plantilla desconocida ${id}`);
    assert.match(desescapar(t), patronDe(p.texto), `${id}: «${t}»`);
    usados.push(id);
    return '';
  });
  const resto = sin.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(resto, '', `texto fuera de las plantillas: «${resto}»`);
  return usados;
}

// ---------- H5.3: plantillas ----------

test('cada plantilla tiene identificador, texto y fuente; el panel no escribe nada más', () => {
  for (const [id, p] of Object.entries(plantillas.plantillas)) {
    assert.match(id, /^(ETQ|PNL|RES|IND|CMP|LEC|DOM|FAS|ADP|MOD|NVB)-\d{2}$/);
    assert.ok(p.texto && p.fuente, id);
  }
  assert.equal(texto(plantillas, 'CMP-03', { valor: 1050, minimo: 850, maximo: 980 }), 'Hoy respondió más lento que en su línea base (mediana de 1050 ms; línea base de 850 a 980 ms).');
  assert.throws(() => texto(plantillas, 'XYZ-01'), /No existe la plantilla/);
  assert.throws(() => texto(plantillas, 'CMP-03', { valor: 1 }), /Falta «minimo»/);
  assert.equal(frase(plantillas, 'LEC-02'), '<p data-plantilla="LEC-02">Tardó más en responder después de equivocarse.</p>');
  // Las frases de la tabla de interpretación permitida (Modelo 4.4) y de las fichas están tal cual.
  const textos = Object.values(plantillas.plantillas).map((p) => p.texto);
  for (const t of ['Hoy respondió más lento que en su línea base', 'Sus tiempos fueron más variables que en sus sesiones previas', 'Respondió más despacio hacia el final de la sesión', 'Tardó más en responder después de equivocarse', 'Respondió antes de que el estímulo pudiera procesarse en', 'Repitió la misma respuesta incorrecta tras la corrección', 'Cometió más errores en los ensayos en que cambió la regla que en los que se repitió', 'Alcanzó el criterio de dominio en']) {
    assert.ok(textos.some((x) => x.startsWith(t)), t);
  }
});

test('la revisión rechaza cualquier frase fuera de las plantillas', () => {
  const bueno = frase(plantillas, 'LEC-01');
  assert.deepEqual(revisarHTML(bueno), ['LEC-01']);
  assert.throws(() => revisarHTML(`${bueno}<p>Es impulsivo</p>`), /texto fuera de las plantillas/);
  assert.throws(() => revisarHTML('<p data-plantilla="LEC-01">Presentó fatiga cognitiva.</p>'), /LEC-01/);
  assert.throws(() => revisarHTML('<p data-plantilla="ZZZ-01">Hola</p>'), /plantilla desconocida/);
});

// Lecturas no permitidas: las de cada ficha, la columna «No puede decirse» del Modelo 4.4 y las no
// permitidas del Anexo C del Protocolo.
const NO_PERMITIDAS = [
  ...Object.values(fichas).flatMap((f) => f.lecturasNoPermitidas ?? []),
  'Su velocidad de procesamiento disminuyó', 'Presenta inestabilidad cognitiva', 'lapsos atencionales', 'Presentó fatiga cognitiva', 'Monitorea sus errores', 'Es impulsivo', 'Presenta rigidez cognitiva',
  'indica una mejora',
];
const CALIFICATIVOS = /\b(mejor[óa]|mejora|empeor|retroces|progres|bien\b|mal\b|normal|déficit|alterad|impulsiv|rigidez|fatiga|atencional|diagn)/i;

test('ninguna lectura no permitida ni calificativo aparece en las plantillas', () => {
  for (const [id, p] of Object.entries(plantillas.plantillas)) {
    for (const n of NO_PERMITIDAS) assert.ok(!p.texto.toLowerCase().includes(n.toLowerCase()), `${id} contiene «${n}»`);
    // «Modalidad con mejor desempeño» es el nombre de la sección de Arquitectura 8.2, no un calificativo.
    if (id !== 'ETQ-07') assert.doesNotMatch(p.texto, CALIFICATIVOS, id);
  }
});

// ---------- H5.4: qué se ve en cada fase ----------

test('fase 3: panel completo, todo con plantillas; las demás fases, solo el resumen (Arquitectura 14)', () => {
  const d = datos({ fase3: [{ rt: 1400 }, { rt: 1400, extra: { marcas_observacion: [{ actividad: 'ACT-02', indicador: 'A2', coincide: true, comentario: 'sí', hora: 'x' }] } }] });
  const h = historial(d);
  const html = sesionHTML(plantillas, h, 6, { config, fichas });
  const ids = revisarHTML(html);
  for (const id of ['ETQ-03', 'ETQ-04', 'ETQ-05', 'ETQ-06', 'ETQ-07', 'ETQ-08', 'ETQ-09', 'RES-05', 'RES-06', 'IND-01', 'CMP-03', 'CMP-05', 'LEC-05']) assert.ok(ids.includes(id), id);
  assert.match(html, /data-coincide="true" aria-pressed="true"/, 'la marca guardada se ve');
  for (const modo of ['familiarizacion', 'fase1', 'fase2', 'cierre']) {
    const otra = sesion('S-x', modo);
    const hh = historialDelNino({ codigo: NINO, sesiones: [otra.s], ensayos: otra.rows, fichas });
    const ids2 = revisarHTML(sesionHTML(plantillas, hh, 0, { config, fichas }));
    assert.deepEqual(ids2, ['ETQ-11', 'PNL-02', 'ETQ-03', 'RES-01', 'RES-02', 'RES-03', 'RES-04'], modo);
  }
  // Las sesiones de la fase 1 del historial tampoco muestran indicadores aunque el niño ya esté en la fase 3.
  assert.ok(revisarHTML(sesionHTML(plantillas, h, 0, { config, fichas })).includes('PNL-02'));
  assert.deepEqual([...new Set(revisarHTML(historialHTML(plantillas, h, { config, fichas })))].sort(), ['ETQ-02', 'ETQ-11', 'ETQ-16', 'RES-02', 'RES-03', 'RES-04']);
  for (const n of NO_PERMITIDAS) assert.ok(!html.includes(n), n);
});

test('el panel describe, no califica: sin verde ni rojo, sin clases de «bien» o «mal»', () => {
  const css = leer('src/panel/panel.css');
  assert.doesNotMatch(css, /--problema|green|red\b|#0f0|#f00|rgb\(/i);
  const js = leer('src/panel/panel.js') + leer('src/panel/panel-pantalla.js');
  assert.doesNotMatch(js, /class="[^"]*(bien|mal|exito|error|problema|alerta)/);
  assert.match(leer('index.html'), /src\/panel\/panel\.css/);
});

test('con calidad menor de 0.80 no se muestra ningún indicador; sin línea base, valores sin comparar', () => {
  const d = datos({ fase3: [{ extra: {} }] });
  d.ensayos.filter((r) => r.sesion_id === 'S-f0').forEach((r, i) => i % 3 === 0 && (r.peso_calidad = 0.3));
  const ids = revisarHTML(sesionHTML(plantillas, historial(d), 5, { config, fichas }));
  assert.ok(ids.includes('RES-07'));
  assert.ok(!ids.some((id) => /^(IND|CMP)-/.test(id)));
  const solo = sesion('S-solo', 'fase3');
  const ids2 = revisarHTML(sesionHTML(plantillas, historialDelNino({ codigo: NINO, sesiones: [solo.s], ensayos: solo.rows, fichas }), 0, { config, fichas }));
  assert.ok(ids2.includes('PNL-05') && ids2.includes('LEC-06') && !ids2.some((id) => /^CMP-/.test(id)));
});

test('adaptaciones: cada cambio con su regla, cada bloqueo con su invariante y aviso a los 3 bloqueos', () => {
  const props = [
    { actividad: 'ACT-02', ventana: 1, ensayos: [1, 10], banda_actual: 'B2', banda_propuesta: 'B3', ejecutada: true, invariante: null, regla: 'Precisión mayor de 0.85 en 2 ventanas consecutivas de 10 ensayos válidos (Modelo 9.1)', pausa_ofrecida: false },
    { actividad: 'ACT-02', ventana: 2, ensayos: [11, 20], banda_actual: 'B3', banda_propuesta: 'B4', ejecutada: false, invariante: 'INV-4', regla: 'x', pausa_ofrecida: false },
    { actividad: 'ACT-02', ventana: 3, ensayos: [21, 30], banda_actual: 'B3', banda_propuesta: 'B2', ejecutada: false, invariante: 'INV-5', regla: 'x', pausa_ofrecida: true },
    { actividad: 'ACT-02', ventana: null, ensayos: null, banda_actual: 'B3', banda_propuesta: 'B2', ejecutada: false, invariante: 'INV-5', regla: 'x', pausa_ofrecida: true },
  ];
  const d = datos({ fase3: [{ extra: { adaptacion_propuestas: props, envolvente_bloqueos: 3 } }] });
  const html = sesionHTML(plantillas, historial(d), 5, { config, fichas });
  const ids = revisarHTML(html);
  for (const id of ['ADP-01', 'ADP-02', 'ADP-03', 'ADP-04', 'ADP-05']) assert.ok(ids.includes(id), id);
  assert.match(html, /INV-4: Después de una bajada, la banda no vuelve a subir antes de 30 ensayos\./);
  const sin = sesionHTML(plantillas, historial(datos({ fase3: [{}] })), 5, { config, fichas });
  assert.ok(revisarHTML(sin).includes('PNL-08'));
});

// ---------- H5.2: línea base y cambio que persiste ----------

test('banda de variación: mediana ± 3 MAD escalada (a mano) y cambio solo con dos sesiones seguidas', () => {
  const b = bandaDeVariacion([10, 12, 14, 16, 18]);
  // mediana 14; |x − 14| = 4, 2, 0, 2, 4 → mediana 2; MAD escalada = 1.4826 · 2 = 2.9652; banda 14 ± 3 · 2.9652 = 14 ± 8.8956.
  assert.equal(b.mediana, 14);
  assert.ok(Math.abs(b.minimo - 5.1044) < 1e-9 && Math.abs(b.maximo - 22.8956) < 1e-9);
  const b2 = bandaDeVariacion([10, 12, 14, 16, 18], { mads: 2 });
  assert.ok(Math.abs(b2.maximo - 19.9304) < 1e-9, 'con k = 2, 14 + 5.9304');
  assert.equal(bandaDeVariacion([1, null, 2]), null, 'con menos de 3 valores no hay banda');
  assert.equal(ladoFuera(23, b), 'arriba');
  assert.equal(ladoFuera(5, b), 'abajo');
  assert.equal(ladoFuera(20, b), null);
  assert.equal(PARAMETROS.bandaVariacion.mads, 3);
  assert.equal(PARAMETROS.bandaVariacion.sesionesConsecutivas, 2);
  // Una sola sesión fuera no es cambio; dos seguidas hacia el mismo lado, sí.
  const d1 = datos({ fase3: [{ rt: 900 }, { rt: 1400 }] });
  const h1 = historial(d1);
  const bandas = bandasDeLineaBase(h1);
  assert.equal(persiste(h1, 6, 'ACT-02', 'A2', bandas), null);
  const h2 = historial(datos({ fase3: [{ rt: 1400 }, { rt: 1400 }] }));
  assert.equal(persiste(h2, 6, 'ACT-02', 'A2', bandasDeLineaBase(h2)), 'arriba');
  assert.equal(sesionesDeLineaBase(h2).length, 5);
  assert.equal(sesionesDeLineaBase(h2.slice(0, 4)), null, 'con 4 sesiones válidas no hay línea base (D3)');
});

// Decisión R12: se mantienen las 2 sesiones consecutivas y k es el menor multiplicador de la MAD
// con menos de 5 % de falsas señales por indicador con ruido normal y con ruido t de 5 grados de
// libertad. La elección completa (400 000 repeticiones por k) está en tools/simular-banda.mjs; aquí
// se comprueba con otra semilla y menos repeticiones que k = 3 cumple con los dos ruidos, que
// k = 2.5 no cumple y que la sensibilidad crece con el tamaño del cambio.
test('R12: con k = 3 y 2 sesiones seguidas, menos de 5 % de falsas señales con ruido normal y t5', () => {
  assert.equal(PARAMETROS.bandaVariacion.mads, 3);
  assert.equal(PARAMETROS.bandaVariacion.sesionesConsecutivas, 2);
  assert.match(PARAMETROS.bandaVariacion.seccion, /Decisión R12/);
  const reps = 40000;
  for (const ruido of ['normal', 't5']) {
    const t3 = tasa({ k: 3, ruido, repeticiones: reps, semilla: 7 });
    assert.ok(wilson(Math.round(t3 * reps), reps)[1] < 0.05, `${ruido}, k = 3: ${t3}`);
    assert.ok(tasa({ k: 2.5, ruido, repeticiones: reps, semilla: 7 }) > 0.05, `${ruido}, k = 2.5 no cumple`);
    const [d1, d2] = [1, 2].map((d) => tasa({ k: 3, ruido, desviaciones: d, repeticiones: 20000, semilla: 7 }));
    assert.ok(t3 < d1 && d1 < d2, `${ruido}: sensibilidad ${d1} y ${d2}`);
  }
  // La regla de antes (2 MAD) daba cerca de 8.5 %.
  assert.ok(tasa({ k: 2, ruido: 'normal', repeticiones: reps, semilla: 7 }) > 0.07);
});

// ---------- Lecturas de ACT-07 ----------

test('ACT-07: más errores al cambiar de regla y diferencia de tiempo, con 10 ensayos de cada tipo', () => {
  const reglas = new Map();
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const codigo = `S7-${i}`;
    const regla = Math.floor(i / 2) % 2 ? 'forma' : 'color'; // cambia cada 2 ensayos: 20 cambios y 19 repeticiones
    reglas.set(codigo, regla);
    const cambio = i > 0 && regla !== reglas.get(`S7-${i - 1}`);
    rows.push(fila(i + 1, { actividad: 'ACT-07', item: codigo, acierto: !(cambio && i % 4 === 2), tr_bruto_ms: cambio ? 1200 : 900 }));
  }
  const ls = lecturasACT07(rows, reglas);
  assert.deepEqual(ls.map((l) => l.id), ['LEC-08', 'LEC-09']);
  assert.equal(ls[1].valores.ms, 300);
  assert.deepEqual(lecturasACT07(rows.slice(0, 15), reglas), [], 'con menos de 10 de cada tipo, nada');
});

// ---------- Decisión R15: pares simétricos ----------

test('R15: toda frase con sentido tiene su par simétrico y neutral, con los mismos huecos', () => {
  const P = plantillas.plantillas;
  const huecos = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const conSentido = Object.entries(P).filter(([, p]) => p.sentido);
  assert.equal(conSentido.length, 16, '8 pares');
  for (const [id, p] of conSentido) {
    assert.ok(['arriba', 'abajo'].includes(p.sentido), id);
    const par = P[p.par];
    assert.ok(par, `${id}: su par ${p.par} existe`);
    assert.equal(par.par, id, `${p.par} apunta de vuelta a ${id}`);
    assert.notEqual(par.sentido, p.sentido, `${id} y ${p.par} tienen sentidos opuestos`);
    assert.deepEqual(huecos(par.texto), huecos(p.texto), `${id} y ${p.par}: mismos huecos`);
  }
  // Ninguna frase con dirección («más», «menos», «por arriba», «por abajo») queda sin par.
  for (const [id, p] of Object.entries(P)) {
    const direccional = /\b(más|menos)\b|por (arriba|abajo)/.test(p.texto.replace(/o más\b|menos de \d/g, ''));
    if (direccional) assert.ok(p.sentido && p.par, `${id} tiene dirección y no tiene par`);
  }
  assert.equal(plantillas.version, '0.3.0');
});

test('R15: el panel usa la frase del sentido que corresponde', () => {
  // LPR por abajo de la línea base en dos sesiones seguidas: CMP-07 y CMP-09.
  const h = historial(datos({ fase3: [{ rt: 500 }, { rt: 500 }] }));
  const html = sesionHTML(plantillas, h, 6, { config, fichas });
  const ids = revisarHTML(html);
  assert.ok(ids.includes('CMP-07') && ids.includes('CMP-09'), ids.join(' '));
  assert.ok(!ids.includes('CMP-03'), 'nada de «más lento»');
  assert.match(html, /ACT-02 · LPR, latencia robusta: por abajo de su variación habitual en esta sesión y en la anterior\./);
  // ACT-07 al revés: menos errores y menos tiempo al cambiar de regla.
  const reglas = new Map();
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const codigo = `S7-${i}`;
    const regla = Math.floor(i / 2) % 2 ? 'forma' : 'color';
    reglas.set(codigo, regla);
    const cambio = i > 0 && regla !== reglas.get(`S7-${i - 1}`);
    rows.push(fila(i + 1, { actividad: 'ACT-07', item: codigo, acierto: !(!cambio && i % 4 === 1), tr_bruto_ms: cambio ? 900 : 1200 }));
  }
  const ls = lecturasACT07(rows, reglas);
  assert.deepEqual(ls.map((l) => l.id), ['LEC-13', 'LEC-14']);
  assert.equal(ls[1].valores.ms, 300);
  // IFC y PES con el intervalo debajo de cero: LEC-11 y LEC-12.
  const src = leer('src/panel/panel.js');
  assert.match(src, /x\.indicador === 'A6' && x\.ic_superior < 0\) partes\.push\(frase\(plantillas, 'LEC-11'\)\)/);
  assert.match(src, /x\.indicador === 'A7' && x\.ic_superior < 0\) partes\.push\(frase\(plantillas, 'LEC-12'\)\)/);
});

// ---------- H5.5: marcas ----------

test('la marca «coincide / no coincide» se guarda como dato y no cambia indicadores ni parámetros', () => {
  assert.deepEqual(marcaRegistro({ actividad: 'ACT-02', indicador: 'A2', coincide: false, comentario: 'x'.repeat(200), hora: 'h' }), { actividad: 'ACT-02', indicador: 'A2', coincide: false, comentario: 'x'.repeat(120), hora: 'h' });
  const d = datos();
  const antes = JSON.stringify(calcularIndicadores(d.ensayos, d.sesiones, { fichas }));
  d.sesiones.forEach((s) => (s.marcas_observacion = [{ actividad: 'ACT-02', indicador: 'A1', coincide: false, comentario: '', hora: 'h' }]));
  assert.equal(JSON.stringify(calcularIndicadores(d.ensayos, d.sesiones, { fichas })), antes);
  assert.ok(Object.isFrozen(PARAMETROS));
  const pantalla = leer('src/panel/panel-pantalla.js');
  assert.match(pantalla, /r\.marcas_observacion = \[\.\.\.\(r\.marcas_observacion \?\? \[\]\), marca\]/);
  assert.doesNotMatch(pantalla + leer('src/panel/panel.js'), /PARAMETROS\.\w+\s*=|parametros\.\w+\s*=/);
});

test('el panel nunca usa las señales de alerta temprana (INV-9)', () => {
  for (const f of ['src/panel/panel.js', 'src/panel/panel-pantalla.js']) assert.doesNotMatch(leer(f).replace(/\/\/.*$/gm, ''), /alerta/i, f);
  const d = datos({ fase3: [{}] });
  const html = sesionHTML(plantillas, historial(d), 5, { config, fichas });
  d.sesiones.forEach((s) => (s.alerta_temprana = [{ actividad: 'ACT-02', senal: true, tau_rho: 0.9, tau_v: 0.9 }]));
  assert.equal(sesionHTML(plantillas, historial(d), 5, { config, fichas }), html);
});

test('el panel se abre desde «Niños inscritos» y funciona con los datos del dispositivo', () => {
  assert.match(leer('src/ninos-pantalla.js'), /href="#panel\?nino=\$\{encodeURIComponent\(n\.codigo\)\}">Panel<\/a>/);
  const app = leer('src/app.js');
  assert.match(app, /else if \(ruta === 'panel'\) renderPanel\(/);
  assert.match(app, /state\.plantillas = await \(await fetch\('src\/panel\/plantillas\.json'\)\)\.json\(\);/);
  assert.doesNotMatch(leer('src/panel/panel-pantalla.js'), /fetch\(/, 'sin conexión: no pide nada a un servidor');
});

// ---------- Decisión D6: resultados del entorno de análisis por la configuración firmada ----------

test('modalidad con mejor desempeño y nivel B: con la configuración firmada, con su fecha y en plantillas', () => {
  const h = historial(datos());
  const sin = revisarHTML(sesionHTML(plantillas, h, 6, { config, fichas }));
  assert.equal(sin.filter((id) => id === 'PNL-04').length, 2, 'sin resultados: «todavía no hay un resultado»');
  const resultados = {
    mejor_modalidad: [{ actividad: 'ACT-02', modalidad: 'AV', fecha: '2026-12-01' }, { actividad: 'ACT-07', modalidad: 'sin_diferencia', fecha: '2026-12-01' }],
    nivel_b: [{ parametro: 'Deriva (v)', valor: 0.512, ic_inferior: 0.31, ic_superior: 0.7, fecha: '2026-12-01' }],
  };
  const html = sesionHTML(plantillas, h, 6, { config, fichas, resultados });
  const ids = revisarHTML(html);
  assert.ok(ids.includes('MOD-01') && ids.includes('MOD-02') && ids.includes('NVB-01') && !ids.includes('PNL-04'));
  assert.match(html, /ACT-02 [^:]+: la modalidad con mejor desempeño fue AV \(calculado el 2026-12-01\)\./);
  assert.match(html, /Deriva \(v\): 0\.51 \(intervalo de 95 %: de 0\.31 a 0\.70; calculado el 2026-12-01\)\./);
  // Fuera de la fase 3 no se ven (Arquitectura 14).
  assert.ok(!revisarHTML(sesionHTML(plantillas, h, 0, { config, fichas, resultados })).includes('MOD-01'));
});
