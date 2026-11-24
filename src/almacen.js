// Almacén local cifrado (H6.2; Arquitectura 9.3; RNF-06). Los registros de la tableta (ensayos,
// sesiones, padrón de niños y auditoría) se guardan en IndexedDB cifrados con AES-GCM de 256 bits
// (WebCrypto). La llave se deriva del PIN del terapeuta con PBKDF2-SHA-256 de 600,000 iteraciones
// y una sal aleatoria de 16 bytes; nunca se guarda: vive en memoria como llave no exportable
// mientras la aplicación está desbloqueada. Sin el PIN, lo que hay en IndexedDB no se puede leer.
//
// Desviación de Arquitectura 9.3 por la decisión D1 (aplicación web): el navegador no tiene acceso
// al almacén seguro de llaves del sistema operativo, así que la llave se deriva del PIN; la
// seguridad depende de que el PIN no sea trivial (6 dígitos o más) y del bloqueo de la tableta.
//
// Para que el resto de la aplicación siga igual, el almacén ofrece una interfaz síncrona como la de
// localStorage (getItem y setItem) sobre una copia en memoria; cada setItem se cifra y se escribe en
// IndexedDB en segundo plano, en orden (listo() espera a que terminen). Cada valor se cifra con un
// vector inicial aleatorio de 12 bytes y su clave como dato adicional autenticado, así que no se
// puede mover un valor cifrado de una clave a otra.

export const PBKDF2_ITERACIONES = 600000;
export const PIN_MINIMO = 6;
export const VERSION_ALMACEN = '0.1.0';
const META = '__meta__';
const INTENTOS = '__intentos__';
// Freno de intentos (H8.5; MASVS-AUTH): después de 5 PIN equivocados seguidos, cada intento más
// espera 30 s, el doble cada vez, hasta 15 min. La cuenta se guarda en IndexedDB (recargar la página
// no la reinicia) y vuelve a cero con el PIN correcto.
export const INTENTOS_LIBRES = 5;
export const ESPERA_INICIAL_MS = 30000;
export const ESPERA_MAXIMA_MS = 15 * 60000;
export const esperaTrasFallos = (fallos) => (fallos < INTENTOS_LIBRES ? 0 : Math.min(ESPERA_MAXIMA_MS, ESPERA_INICIAL_MS * 2 ** (fallos - INTENTOS_LIBRES)));
const VERIFICADOR = 'neuro-blueminds: PIN correcto';

const texto = new TextEncoder();
const deTexto = new TextDecoder();
const aBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const deBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Llave AES-GCM de 256 bits derivada del PIN (no exportable).
export async function derivarLlave(pin, sal, iteraciones = PBKDF2_ITERACIONES, cripto = globalThis.crypto) {
  const base = await cripto.subtle.importKey('raw', texto.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return cripto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(llave, clave, valor, cripto = globalThis.crypto) {
  const iv = cripto.getRandomValues(new Uint8Array(12));
  const datos = await cripto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: texto.encode(clave) }, llave, texto.encode(valor));
  return { iv: aBase64(iv), datos: aBase64(datos) };
}

export async function descifrar(llave, clave, sobre, cripto = globalThis.crypto) {
  const claro = await cripto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(sobre.iv), additionalData: texto.encode(clave) }, llave, deBase64(sobre.datos));
  return deTexto.decode(claro);
}

export const pinValido = (pin) => /^\d+$/.test(String(pin ?? '')) && String(pin).length >= PIN_MINIMO;

// IndexedDB con una sola tabla de pares clave → valor (lo cifrado y la sal).
export function abrirIDB(nombre = 'neuro-blueminds', tabla = 'datos', idb = globalThis.indexedDB) {
  const abrir = new Promise((resolve, reject) => {
    const req = idb.open(nombre, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(tabla);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const op = (modo, fn) =>
    abrir.then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(tabla, modo);
          const req = fn(tx.objectStore(tabla));
          tx.oncomplete = () => resolve(req?.result);
          tx.onerror = () => reject(tx.error);
        }),
    );
  return {
    get: (k) => op('readonly', (t) => t.get(k)),
    put: (k, v) => op('readwrite', (t) => t.put(v, k)),
    del: (k) => op('readwrite', (t) => t.delete(k)),
    claves: () => op('readonly', (t) => t.getAllKeys()),
  };
}

// Tabla en memoria con la misma interfaz (pruebas y navegadores sin IndexedDB).
export function memoriaIDB() {
  const m = new Map();
  return { mapa: m, get: async (k) => structuredClone(m.get(k)), put: async (k, v) => void m.set(k, structuredClone(v)), del: async (k) => void m.delete(k), claves: async () => [...m.keys()] };
}

// db: abrirIDB() o memoriaIDB(). claves: las que guarda el almacén (los registros).
export function crearAlmacen({ db, claves, cripto = globalThis.crypto, ahora = () => Date.now() }) {
  let llave = null;
  const memoria = new Map();
  let cola = Promise.resolve();
  let error = null;

  async function cargar() {
    memoria.clear();
    for (const k of claves) {
      const sobre = await db.get(k);
      if (sobre) memoria.set(k, await descifrar(llave, k, sobre, cripto));
    }
  }

  function escribir(k, v) {
    const l = llave;
    cola = cola
      .then(async () => db.put(k, await cifrar(l, k, v, cripto)))
      .catch((e) => {
        error = e;
      });
  }

  return {
    get desbloqueado() {
      return Boolean(llave);
    },
    get error() {
      return error;
    },
    configurado: async () => Boolean(await db.get(META)),
    // Primer uso: crea el PIN y, si hay registros sin cifrar (versiones anteriores, en localStorage),
    // los pasa al almacén cifrado y los borra de donde estaban.
    async crearPin(pin, { previo = null, iteraciones = PBKDF2_ITERACIONES } = {}) {
      if (!pinValido(pin)) throw new Error(`El PIN debe tener al menos ${PIN_MINIMO} dígitos.`);
      if (await db.get(META)) throw new Error('El PIN ya existe en este dispositivo.');
      const sal = cripto.getRandomValues(new Uint8Array(16));
      llave = await derivarLlave(pin, sal, iteraciones, cripto);
      await db.put(META, { sal: aBase64(sal), iteraciones, verificador: await cifrar(llave, META, VERIFICADOR, cripto), version: VERSION_ALMACEN });
      memoria.clear();
      for (const k of claves) {
        const v = previo?.getItem(k);
        if (v !== null && v !== undefined) {
          memoria.set(k, v);
          escribir(k, v);
        }
      }
      await cola;
      for (const k of claves) previo?.removeItem(k);
      return true;
    },
    // Milisegundos que faltan para poder intentar otra vez (0 si se puede).
    async espera() {
      const i = (await db.get(INTENTOS)) ?? { fallos: 0, hasta: 0 };
      return Math.max(0, i.hasta - ahora());
    },
    // Devuelve true si el PIN es el correcto (y descifra los registros a memoria). Mientras dure la
    // espera por intentos fallidos, no prueba el PIN y devuelve false.
    async desbloquear(pin) {
      const meta = await db.get(META);
      if (!meta) return false;
      const intentos = (await db.get(INTENTOS)) ?? { fallos: 0, hasta: 0 };
      if (intentos.hasta > ahora()) return false;
      let correcto = false;
      try {
        const l = await derivarLlave(String(pin ?? ''), deBase64(meta.sal), meta.iteraciones, cripto);
        if ((await descifrar(l, META, meta.verificador, cripto)) === VERIFICADOR) {
          llave = l;
          correcto = true;
        }
      } catch {
        correcto = false;
      }
      if (!correcto) {
        const fallos = intentos.fallos + 1;
        await db.put(INTENTOS, { fallos, hasta: ahora() + esperaTrasFallos(fallos) });
        return false;
      }
      await db.put(INTENTOS, { fallos: 0, hasta: 0 });
      await cargar();
      return true;
    },
    // Olvida la llave y la copia en memoria (lo pendiente de escribir termina antes).
    async bloquear() {
      await cola;
      llave = null;
      memoria.clear();
    },
    listo: () => cola,
    // Interfaz de localStorage para createLog. Bloqueado, no hay datos y no se escribe nada.
    storage: {
      getItem: (k) => (llave ? (memoria.get(k) ?? null) : null),
      setItem(k, v) {
        if (!llave) throw new Error('El almacén está bloqueado: escribe el PIN.');
        memoria.set(k, String(v));
        escribir(k, String(v));
      },
      removeItem(k) {
        memoria.delete(k);
        cola = cola.then(() => db.del(k));
      },
    },
  };
}
