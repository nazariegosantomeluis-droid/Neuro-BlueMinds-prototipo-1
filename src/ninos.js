// Padrón local de niños (H2.1). Lógica pura, sin DOM.
//
// En la tableta no existe nada que diga quién es el niño real (RNF-07, Arquitectura 9.1): solo un
// código seudónimo aleatorio de 128 bits, un ícono y un color para confirmar que es el niño correcto
// (R6), la edad en meses y el estado de consentimiento. La relación entre el código y el niño la lleva
// el investigador fuera de la aplicación. Por eso el padrón no tiene ningún campo de texto libre y
// rechaza cualquier dato que no sea uno de los permitidos.
//
// Este padrón es del prototipo: en el estudio lo entrega el servidor y el terapeuta no cambia el
// consentimiento (Arquitectura 9.6, hoja de ruta H7.4).

export const NINO_KEY = 'neuro-blueminds.ninos';
export const NINO_COLUMNS = ['codigo', 'icono', 'color', 'edad_meses', 'consentimiento', 'video'];

export const CONSENTIMIENTOS = ['vigente', 'suspendido', 'retirado'];
// 4 a 10 años al incluirlo (Protocolo 4.2): de 48 a 131 meses.
export const EDAD_MIN = 48;
export const EDAD_MAX = 131;
export const DEMO = 'DEMO';

// Formas simples y distintas por su silueta, para que no dependan del color.
export const ICONOS = [
  { id: 'circulo', nombre: 'Círculo', f: false },
  { id: 'cuadrado', nombre: 'Cuadrado', f: false },
  { id: 'triangulo', nombre: 'Triángulo', f: false },
  { id: 'estrella', nombre: 'Estrella', f: true },
  { id: 'rombo', nombre: 'Rombo', f: false },
  { id: 'corazon', nombre: 'Corazón', f: false },
  { id: 'luna', nombre: 'Luna', f: true },
  { id: 'hexagono', nombre: 'Hexágono', f: false },
];

// Paleta de Okabe e Ito, pensada para distinguirse con las formas comunes de daltonismo.
export const COLORES = [
  { id: 'naranja', hex: '#E69F00', m: 'naranja', f: 'naranja' },
  { id: 'celeste', hex: '#56B4E9', m: 'celeste', f: 'celeste' },
  { id: 'verde', hex: '#009E73', m: 'verde', f: 'verde' },
  { id: 'amarillo', hex: '#F0E442', m: 'amarillo', f: 'amarilla' },
  { id: 'azul', hex: '#0072B2', m: 'azul', f: 'azul' },
  { id: 'rojo', hex: '#D55E00', m: 'rojo', f: 'roja' },
  { id: 'rosa', hex: '#CC79A7', m: 'rosa', f: 'rosa' },
];

// Código de 128 bits (16 bytes) en 32 caracteres hexadecimales. No se deriva de ningún dato personal.
export function nuevoCodigo(getRandomValues = (a) => crypto.getRandomValues(a)) {
  return [...getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Forma corta para mostrar (los 32 bits iniciales). El registro guarda siempre el código completo.
export const abreviar = (codigo) => `${codigo.slice(0, 4)}-${codigo.slice(4, 8)}`.toUpperCase();

const bytesDe = (codigo) => (codigo.match(/../g) ?? []).map((h) => parseInt(h, 16));

// Ícono y color según el código. Primero se buscan íconos que nadie usa; solo cuando se agotan se
// repite un ícono con otro color.
export function asignarIconoColor(codigo, existentes = []) {
  const [a = 0, b = 0] = bytesDe(codigo);
  const iconosUsados = new Set(existentes.map((n) => n.icono));
  const parejasUsadas = new Set(existentes.map((n) => `${n.icono}/${n.color}`));
  const orden = [];
  for (let i = 0; i < ICONOS.length; i++) {
    for (let c = 0; c < COLORES.length; c++) {
      orden.push([ICONOS[(a + i) % ICONOS.length].id, COLORES[(b + c) % COLORES.length].id]);
    }
  }
  const libre = orden.find(([i]) => !iconosUsados.has(i)) ?? orden.find(([i, c]) => !parejasUsadas.has(`${i}/${c}`));
  if (!libre) throw new Error('Se agotaron las combinaciones de ícono y color.');
  return { icono: libre[0], color: libre[1] };
}

export function nombreNino({ icono, color }) {
  const i = ICONOS.find((x) => x.id === icono);
  const c = COLORES.find((x) => x.id === color);
  return i && c ? `${i.nombre} ${i.f ? c.f : c.m}` : 'Sin ícono';
}

const PERMITIDOS = ['edad_meses', 'video'];

// Inscribe a un niño. Solo acepta la edad en meses y la marca de video: cualquier otro dato
// (nombre, fecha de nacimiento, contacto…) se rechaza con un error, no se descarta en silencio.
export function crearNino(datos, existentes = [], getRandomValues) {
  for (const k of Object.keys(datos ?? {})) {
    if (!PERMITIDOS.includes(k)) throw new Error(`Campo no permitido: ${k}. El padrón no guarda datos que identifiquen al niño.`);
  }
  const { edad_meses, video = false } = datos ?? {};
  if (!Number.isInteger(edad_meses) || edad_meses < EDAD_MIN || edad_meses > EDAD_MAX) {
    throw new Error(`La edad debe ser un número entero de meses entre ${EDAD_MIN} y ${EDAD_MAX} (de 4 a 10 años).`);
  }
  if (typeof video !== 'boolean') throw new Error('La marca de video debe ser sí o no.');
  let codigo;
  for (let i = 0; i < 100; i++) {
    codigo = nuevoCodigo(getRandomValues);
    if (!existentes.some((n) => abreviar(n.codigo) === abreviar(codigo))) break;
    codigo = null;
  }
  if (!codigo) throw new Error('No se pudo generar un código único.');
  return { codigo, ...asignarIconoColor(codigo, existentes), edad_meses, consentimiento: 'vigente', video };
}

// Un consentimiento retirado no se revierte en la tableta: solo el servidor (H7.4). Suspendido
// puede volver a vigente.
export function cambiarConsentimiento(actual, nuevo) {
  if (!CONSENTIMIENTOS.includes(nuevo)) throw new Error(`Estado de consentimiento desconocido: ${nuevo}.`);
  if (actual === 'retirado' && nuevo !== 'retirado') throw new Error('El consentimiento retirado no se puede revertir en la tableta.');
  return nuevo;
}

export function puedeIniciar(nino) {
  if (!nino) return { ok: false, motivo: 'No hay un niño inscrito con ese código.' };
  if (nino.consentimiento === 'vigente') return { ok: true, motivo: '' };
  if (nino.consentimiento === 'suspendido') return { ok: false, motivo: 'El consentimiento de este niño está suspendido. No se puede iniciar la sesión.' };
  if (nino.consentimiento === 'retirado') return { ok: false, motivo: 'La familia retiró el consentimiento. No se puede iniciar la sesión.' };
  return { ok: false, motivo: 'El estado de consentimiento de este niño no es válido. No se puede iniciar la sesión.' };
}

// Quién participa en la sesión: un niño inscrito con consentimiento vigente, la demostración sin
// niño o el modo experto (solo en demostración). Devuelve { error } si no se puede empezar.
// prefijo: separa las sesiones en el registro (S- niño, DEMO- demostración, EXP- experto).
export function participante(valor, experto, ninos) {
  if (valor === DEMO) return experto ? { tipo: 'experto', prefijo: 'EXP', codigo: DEMO } : { tipo: 'demo', prefijo: 'DEMO', codigo: DEMO };
  if (experto) return { error: 'El modo experto es solo para la demostración, sin niño.' };
  if (!valor) return { error: 'Elige al niño o la demostración.' };
  const nino = ninos.find((n) => n.codigo === valor);
  const { ok, motivo } = puedeIniciar(nino);
  return ok ? { tipo: 'nino', prefijo: 'S', codigo: nino.codigo, nino } : { error: motivo };
}
