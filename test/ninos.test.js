import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLog, COLUMNS, SESION_COLUMNS } from '../src/engine/logger.js';
import {
  NINO_KEY, NINO_COLUMNS, CONSENTIMIENTOS, EDAD_MIN, EDAD_MAX, DEMO, ICONOS, COLORES,
  nuevoCodigo, abreviar, asignarIconoColor, nombreNino, crearNino, cambiarConsentimiento, puedeIniciar, participante,
} from '../src/ninos.js';
import { inscripcionHTML, renderNinos, LINEA_SIN_IDENTIDAD } from '../src/ninos-pantalla.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), dump: () => [...data.values()].join('\n') };
};
const nino = (extra = {}) => ({ codigo: nuevoCodigo(), icono: 'estrella', color: 'azul', edad_meses: 60, consentimiento: 'vigente', video: false, ...extra });

// ---------- Código seudónimo ----------

test('el código tiene 128 bits: 32 caracteres hexadecimales, sin repetirse en 10,000 generaciones', () => {
  const vistos = new Set();
  for (let i = 0; i < 10000; i++) {
    const c = nuevoCodigo();
    assert.match(c, /^[0-9a-f]{32}$/);
    vistos.add(c);
  }
  assert.equal(vistos.size, 10000);
});

test('el código sale solo del generador de números al azar, sin ningún dato del niño', () => {
  const fijo = (a) => a.fill(0xab);
  assert.equal(nuevoCodigo(fijo), 'ab'.repeat(16));
});

test('la forma abreviada son los primeros 32 bits, en mayúsculas', () => {
  assert.equal(abreviar('7f3a91c2' + '0'.repeat(24)), '7F3A-91C2');
});

test('si la forma abreviada choca con la de otro niño, se genera otro código', () => {
  const primero = (a) => a.fill(0x11);
  const choque = crearNino({ edad_meses: 60 }, [], primero);
  let llamadas = 0;
  const luego = (a) => {
    llamadas++;
    return llamadas === 1 ? a.fill(0x11) : a.fill(0x22);
  };
  const otro = crearNino({ edad_meses: 60 }, [choque], luego);
  assert.equal(llamadas, 2);
  assert.notEqual(abreviar(otro.codigo), abreviar(choque.codigo));
});

// ---------- Ícono y color (R6) ----------

test('ícono y color no se repiten mientras haya íconos libres', () => {
  const padron = [];
  for (let i = 0; i < ICONOS.length; i++) padron.push(crearNino({ edad_meses: 60 }, padron));
  assert.equal(new Set(padron.map((n) => n.icono)).size, ICONOS.length);
});

test('al agotar los íconos se repite el ícono con otro color, y nunca la misma pareja', () => {
  const padron = [];
  for (let i = 0; i < ICONOS.length * COLORES.length; i++) padron.push(crearNino({ edad_meses: 60 }, padron));
  assert.equal(new Set(padron.map((n) => `${n.icono}/${n.color}`)).size, padron.length);
  assert.throws(() => crearNino({ edad_meses: 60 }, padron), /Se agotaron las combinaciones/);
});

test('la asignación es determinista para un código y devuelve un ícono y un color de la lista', () => {
  const c = nuevoCodigo();
  const a = asignarIconoColor(c, []);
  assert.deepEqual(a, asignarIconoColor(c, []));
  assert.ok(ICONOS.some((i) => i.id === a.icono) && COLORES.some((x) => x.id === a.color));
});

test('el nombre del ícono concuerda en género con el color', () => {
  assert.equal(nombreNino({ icono: 'estrella', color: 'amarillo' }), 'Estrella amarilla');
  assert.equal(nombreNino({ icono: 'circulo', color: 'rojo' }), 'Círculo rojo');
});

// ---------- Edad ----------

test('la edad es un número entero de meses de 48 a 131 (4 a 10 años)', () => {
  for (const ok of [EDAD_MIN, 60, EDAD_MAX]) assert.equal(crearNino({ edad_meses: ok }).edad_meses, ok);
  for (const mal of [EDAD_MIN - 1, EDAD_MAX + 1, 60.5, '60', NaN, null, undefined]) {
    assert.throws(() => crearNino({ edad_meses: mal }), /edad/i, String(mal));
  }
  assert.throws(() => crearNino({}), /edad/i);
});

test('la marca de video es sí o no, y por defecto no', () => {
  assert.equal(crearNino({ edad_meses: 60 }).video, false);
  assert.equal(crearNino({ edad_meses: 60, video: true }).video, true);
  assert.throws(() => crearNino({ edad_meses: 60, video: 'sí' }), /video/);
});

// ---------- Consentimiento ----------

test('un niño nuevo queda con consentimiento vigente', () => {
  assert.equal(crearNino({ edad_meses: 60 }).consentimiento, 'vigente');
});

test('no se puede iniciar sesión con consentimiento suspendido, retirado, desconocido o sin niño', () => {
  assert.equal(puedeIniciar(nino()).ok, true);
  for (const estado of ['suspendido', 'retirado', 'otro', undefined, null, '']) {
    const r = puedeIniciar(nino({ consentimiento: estado }));
    assert.equal(r.ok, false, String(estado));
    assert.match(r.motivo, /No se puede iniciar/);
  }
  assert.equal(puedeIniciar(undefined).ok, false);
});

test('suspendido puede volver a vigente; retirado no se revierte en la tableta', () => {
  assert.equal(cambiarConsentimiento('vigente', 'suspendido'), 'suspendido');
  assert.equal(cambiarConsentimiento('suspendido', 'vigente'), 'vigente');
  assert.equal(cambiarConsentimiento('vigente', 'retirado'), 'retirado');
  assert.equal(cambiarConsentimiento('suspendido', 'retirado'), 'retirado');
  assert.equal(cambiarConsentimiento('retirado', 'retirado'), 'retirado');
  assert.throws(() => cambiarConsentimiento('retirado', 'vigente'), /no se puede revertir/);
  assert.throws(() => cambiarConsentimiento('retirado', 'suspendido'), /no se puede revertir/);
  assert.throws(() => cambiarConsentimiento('vigente', 'inventado'), /desconocido/);
  assert.deepEqual(CONSENTIMIENTOS, ['vigente', 'suspendido', 'retirado']);
});

// ---------- Quién participa ----------

test('participante: niño con consentimiento vigente, demostración o modo experto', () => {
  const a = nino();
  const b = nino({ consentimiento: 'suspendido' });
  const c = nino({ consentimiento: 'retirado' });
  const padron = [a, b, c];
  assert.deepEqual(participante(a.codigo, false, padron), { tipo: 'nino', prefijo: 'S', codigo: a.codigo, nino: a });
  assert.deepEqual(participante(DEMO, false, padron), { tipo: 'demo', prefijo: 'DEMO', codigo: DEMO });
  assert.deepEqual(participante(DEMO, true, padron), { tipo: 'experto', prefijo: 'EXP', codigo: DEMO });
  assert.match(participante(b.codigo, false, padron).error, /suspendido/);
  assert.match(participante(c.codigo, false, padron).error, /retiró/);
});

test('participante: sin elegir, con un código que no existe o con modo experto y niño, no se inicia', () => {
  const a = nino();
  assert.match(participante('', false, [a]).error, /Elige/);
  assert.match(participante(undefined, false, [a]).error, /Elige/);
  assert.match(participante('f'.repeat(32), false, [a]).error, /No hay un niño/);
  assert.match(participante(a.codigo, true, [a]).error, /solo para la demostración/);
});

// ---------- RNF-07: la tableta no sabe quién es el niño ----------

const PROHIBIDO = /nombre|apellido|name|nacimiento|birth|curp|correo|email|telefono|celular|direccion|domicilio|escuela|foto/i;

test('el padrón tiene exactamente estas columnas y ninguna identifica al niño', () => {
  assert.deepEqual(NINO_COLUMNS, ['codigo', 'icono', 'color', 'edad_meses', 'consentimiento', 'video']);
  for (const c of [...NINO_COLUMNS, ...COLUMNS, ...SESION_COLUMNS]) assert.doesNotMatch(c, PROHIBIDO, c);
});

test('el padrón no puede recibir un dato que identifique al niño: crearNino lo rechaza', () => {
  for (const campo of ['nombre', 'apellido', 'fecha_nacimiento', 'curp', 'correo', 'telefono', 'direccion', 'escuela', 'notas']) {
    assert.throws(() => crearNino({ edad_meses: 60, [campo]: 'Ana Pérez' }), /Campo no permitido/, campo);
  }
  // Tampoco se puede imponer un código propio (por ejemplo, uno derivado de un nombre).
  assert.throws(() => crearNino({ edad_meses: 60, codigo: 'ANA' }), /Campo no permitido/);
  assert.throws(() => crearNino({ edad_meses: 60, icono: 'estrella', color: 'azul' }), /Campo no permitido/);
});

test('el registro del padrón descarta cualquier campo que no sea de sus columnas y no guarda el texto', () => {
  const almacen = memoryStorage();
  const padron = createLog(almacen, { key: NINO_KEY, columns: NINO_COLUMNS });
  const fila = padron.add({ ...nino(), nombre: 'Ana Pérez', fecha_nacimiento: '2019-01-01', correo: 'ana@correo.mx' });
  assert.deepEqual(Object.keys(fila), NINO_COLUMNS);
  assert.doesNotMatch(almacen.dump(), /Ana|Pérez|2019-01-01|correo\.mx/);
});

test('el padrón se guarda y se recupera sin perder campos', () => {
  const almacen = memoryStorage();
  const n = crearNino({ edad_meses: 90, video: true });
  createLog(almacen, { key: NINO_KEY, columns: NINO_COLUMNS }).add(n);
  const otra = createLog(almacen, { key: NINO_KEY, columns: NINO_COLUMNS });
  assert.deepEqual(otra.rows(), [n]);
});

test('el formulario de inscripción solo tiene un número y una casilla: ningún campo de texto', () => {
  const html = inscripcionHTML();
  const entradas = [...html.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(entradas.length, 2);
  for (const e of entradas) assert.match(e, /type="(number|checkbox)"/);
  assert.doesNotMatch(html, /<textarea|type="(text|email|tel|date|search|url|password)"|contenteditable/i);
});

test('la pantalla #ninos dice en una línea que la tableta no guarda quién es cada niño', () => {
  const app = { innerHTML: '', querySelector: () => ({}), querySelectorAll: () => [] };
  renderNinos(app, { ninos: createLog(memoryStorage(), { key: NINO_KEY, columns: NINO_COLUMNS }) });
  assert.match(app.innerHTML, /id="sin-identidad"/);
  assert.ok(app.innerHTML.includes(LINEA_SIN_IDENTIDAD));
  assert.match(LINEA_SIN_IDENTIDAD, /no guarda quién es cada niño/);
  assert.match(LINEA_SIN_IDENTIDAD, /investigador/);
  assert.match(LINEA_SIN_IDENTIDAD, /Arquitectura 9\.1/);
  assert.doesNotMatch(LINEA_SIN_IDENTIDAD, /\n/);
});

test('la pantalla #ninos muestra a cada niño sin ningún dato que lo identifique', () => {
  const padron = createLog(memoryStorage(), { key: NINO_KEY, columns: NINO_COLUMNS });
  const n = crearNino({ edad_meses: 75, video: true });
  padron.add(n);
  const app = { innerHTML: '', querySelector: () => ({}), querySelectorAll: () => [] };
  renderNinos(app, { ninos: padron });
  assert.ok(app.innerHTML.includes(abreviar(n.codigo)));
  assert.ok(app.innerHTML.includes(nombreNino(n)));
  assert.ok(app.innerHTML.includes('75 meses'));
});

// ---------- La aplicación usa el padrón ----------

test('app.js ya no pide un código libre y comprueba el consentimiento y la confirmación del niño', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /name="codigo"/);
  assert.match(app, /participante\(/);
  assert.match(app, /confirmarNino\(/);
  assert.match(app, /if \(p\.error\) return renderInicio\(p\.error\)/);
  assert.match(app, /ruta === 'ninos'/);
});

test('index.html carga los estilos de ninos.css', () => {
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /src\/ninos\.css/);
});
