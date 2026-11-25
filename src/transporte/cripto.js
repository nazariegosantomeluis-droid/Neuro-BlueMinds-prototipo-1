// Criptografía de la salida de datos (decisión D6; Arquitectura 9.4 y 9.5). Solo WebCrypto: funciona
// igual en el navegador de la tableta y en Node (tools/importar.mjs, en la computadora del
// investigador).
//
// - Lotes: cifrado híbrido con la llave pública del investigador responsable. Por cada lote, la
//   tableta crea un par ECDH P-256 efímero; el secreto compartido pasa por HKDF-SHA-256 (con una sal
//   aleatoria y el id del lote) a una llave AES-GCM de 256 bits que cifra el lote. La cabecera del
//   sobre (sin datos de niños) va como dato autenticado. La tableta no guarda la llave efímera
//   privada ni tiene la del investigador: no puede descifrar lo que exportó.
// - Recibos y configuración: firma ECDSA P-256 con SHA-256 del investigador, sobre el JSON canónico.
import { canonico, sha256 } from '../huella.js';
import { FORMATO_SOBRE, VERSION_LOTE } from './formato.js';

export const ALG_SOBRE = 'ECDH-P256+HKDF-SHA256+A256GCM';
export const ALG_FIRMA = 'ECDSA-P256-SHA256';
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };

const enc = new TextEncoder();
const dec = new TextDecoder();
export const aBase64 = (bytes) => {
  let s = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
export const deBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Identificador de una llave pública: SHA-256 de su curva y coordenadas (16 caracteres).
export const idDeLlave = (jwk) => sha256(canonico({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).slice(0, 16);
const publica = ({ crv, kty, x, y }) => ({ crv, kty, x, y });

// Llaves del investigador: un par para descifrar lotes y otro para firmar. tools/llaves.mjs.
export async function generarLlaves(cripto = globalThis.crypto) {
  const c = await cripto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const f = await cripto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
  const jwk = (k) => cripto.subtle.exportKey('jwk', k);
  return {
    cifrado: { publica: publica(await jwk(c.publicKey)), privada: await jwk(c.privateKey) },
    firma: { publica: publica(await jwk(f.publicKey)), privada: await jwk(f.privateKey) },
  };
}

async function llaveAES(cripto, privada, publicaOtra, sal, info, usos) {
  const bits = await cripto.subtle.deriveBits({ name: 'ECDH', public: publicaOtra }, privada, 256);
  const base = await cripto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return cripto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: sal, info: enc.encode(info) }, base, { name: 'AES-GCM', length: 256 }, false, usos);
}

const cabeceraDe = (s) => ({ formato: s.formato, version: s.version, alg: s.alg, llave: s.llave, lote_id: s.lote_id, dispositivo: s.dispositivo, numero: s.numero, creado: s.creado, efimera: s.efimera, sal: s.sal });

// Sobre cifrado de un lote con la llave pública (JWK) de cifrado del investigador.
export async function cifrarLote(lote, publicaInvestigador, cripto = globalThis.crypto) {
  const destino = await cripto.subtle.importKey('jwk', publicaInvestigador, ECDH, false, []);
  const efimero = await cripto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const sal = cripto.getRandomValues(new Uint8Array(16));
  const iv = cripto.getRandomValues(new Uint8Array(12));
  const cabecera = cabeceraDe({
    formato: FORMATO_SOBRE,
    version: VERSION_LOTE,
    alg: ALG_SOBRE,
    llave: idDeLlave(publicaInvestigador),
    lote_id: lote.lote_id,
    dispositivo: lote.dispositivo,
    numero: lote.numero,
    creado: lote.creado,
    efimera: publica(await cripto.subtle.exportKey('jwk', efimero.publicKey)),
    sal: aBase64(sal),
  });
  const llave = await llaveAES(cripto, efimero.privateKey, destino, sal, `nbm-lote ${lote.lote_id}`, ['encrypt']);
  const datos = await cripto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(canonico(cabecera)) }, llave, enc.encode(JSON.stringify(lote)));
  return { ...cabecera, iv: aBase64(iv), datos: aBase64(datos) };
}

// Descifra un sobre con la llave privada (JWK) de cifrado del investigador. Falla si el sobre se
// alteró (la etiqueta de AES-GCM cubre los datos y la cabecera) o si es de otra llave.
export async function descifrarLote(sobre, privadaInvestigador, cripto = globalThis.crypto) {
  if (!sobre || sobre.formato !== FORMATO_SOBRE) throw new Error('No es un lote cifrado de AutiPal.');
  if (sobre.alg !== ALG_SOBRE) throw new Error(`Algoritmo no admitido: ${sobre.alg}.`);
  if (sobre.llave !== idDeLlave(privadaInvestigador)) throw new Error('El lote se cifró para otra llave.');
  const privada = await cripto.subtle.importKey('jwk', privadaInvestigador, ECDH, false, ['deriveBits']);
  const efimera = await cripto.subtle.importKey('jwk', sobre.efimera, ECDH, false, []);
  const cabecera = cabeceraDe(sobre);
  const llave = await llaveAES(cripto, privada, efimera, deBase64(sobre.sal), `nbm-lote ${sobre.lote_id}`, ['decrypt']);
  let claro;
  try {
    claro = await cripto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(sobre.iv), additionalData: enc.encode(canonico(cabecera)) }, llave, deBase64(sobre.datos));
  } catch {
    throw new Error('El lote está alterado o incompleto: no se pudo descifrar.');
  }
  const lote = JSON.parse(dec.decode(claro));
  if (lote.lote_id !== sobre.lote_id || lote.dispositivo !== sobre.dispositivo || lote.numero !== sobre.numero) throw new Error('La cabecera del sobre no coincide con el lote.');
  return lote;
}

// Firma el JSON canónico de un objeto (sin su campo «firma»).
export async function firmar(objeto, privadaFirma, cripto = globalThis.crypto) {
  const { firma, ...resto } = objeto;
  const llave = await cripto.subtle.importKey('jwk', privadaFirma, ECDSA, false, ['sign']);
  const valor = await cripto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, llave, enc.encode(canonico(resto)));
  return { ...resto, firma: { alg: ALG_FIRMA, llave: idDeLlave(privadaFirma), valor: aBase64(valor) } };
}

// true si la firma es del dueño de esa llave pública y el objeto no cambió después de firmarse.
export async function verificarFirma(objeto, publicaFirma, cripto = globalThis.crypto) {
  const { firma, ...resto } = objeto ?? {};
  if (!firma || firma.alg !== ALG_FIRMA || firma.llave !== idDeLlave(publicaFirma) || typeof firma.valor !== 'string') return false;
  try {
    const llave = await cripto.subtle.importKey('jwk', publica(publicaFirma), ECDSA, false, ['verify']);
    return await cripto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, llave, deBase64(firma.valor), enc.encode(canonico(resto)));
  } catch {
    return false;
  }
}
