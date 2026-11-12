// Selección de ítems por banda, con azar reproducible a partir de una semilla.

// Generador pseudoaleatorio (mulberry32): la misma semilla da la misma secuencia.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convierte un texto (por ejemplo, el sesion_id) en una semilla numérica (FNV-1a).
export function seedOf(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Dos ítems de bandas distintas con el mismo concepto cuentan como el mismo
// para la regla de no repetir en la sesión.
export const itemKey = (it) => it.concepto ?? it.codigo;

// Un ítem retirado en la revisión clínica no se usa en las sesiones; uno «por corregir» sí,
// mientras se corrige (items/revision.json).
export const disponibleEnSesion = (it) => it.estadoRevision !== 'retirado';

// Arma un bloque según la composición de la banda (ficha): una casilla por ítem.
// "{a}" y "{b}" se reemplazan por las dimensiones en el orden de la sesión, por ejemplo
// ["{a}", "{a}>{b}", "{b}"] → color, color>forma, forma. Cada casilla toma, al azar y
// sin repetir, un ítem cuyo «tipo» coincide.
export function pickComposed(items, composicion, [a, b], rand) {
  const used = new Set();
  return composicion.map((slot) => {
    const tipo = slot.replaceAll('{a}', a).replaceAll('{b}', b);
    const pool = items.filter((it) => it.tipo === tipo && !used.has(it.codigo));
    if (!pool.length) throw new Error(`No hay secuencias de tipo «${tipo}» sin usar en la banda.`);
    const it = pool[Math.floor(rand() * pool.length)];
    used.add(it.codigo);
    return it;
  });
}

// Elige n ítems de la banda sin reemplazo. Si n supera los disponibles y la ficha
// permite repetir, hace otra pasada barajada, cuidando que el mismo ítem no quede
// en dos ensayos seguidos. Si no permite repetir, falla en lugar de repetir.
// exclude: claves ya usadas en la sesión.
export function pickItems(items, n, rand, { repeat = true, exclude = new Set(), key = itemKey } = {}) {
  const pool = items.filter((it) => !exclude.has(key(it)));
  if (!pool.length || (!repeat && n > pool.length)) {
    throw new Error(`Se necesitan ${n} ítems distintos y solo quedan ${pool.length} sin usar en esta sesión.`);
  }
  const out = [];
  while (out.length < n) {
    const pass = shuffle(pool, rand);
    if (out.length && pass.length > 1 && key(pass[0]) === key(out.at(-1))) {
      [pass[0], pass[1]] = [pass[1], pass[0]];
    }
    out.push(...pass);
  }
  return out.slice(0, n);
}
