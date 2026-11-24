// Registro de auditoría encadenado (H6.3; Arquitectura 10.1; RNF-08). Solo admite agregar
// entradas: cada una lleva la huella SHA-256 de la anterior y la suya propia (del JSON canónico de
// la entrada sin su huella), así que cambiar, quitar o reordenar una entrada rompe la cadena.
// Se guarda en el almacén cifrado de la tableta (src/almacen.js), como los demás registros.
//
// Se registran (Arquitectura 10.1):
// - inicio de sesión con las versiones en uso y el modo de fase ('inicio_sesion');
// - cada propuesta de la regla de adaptación, si se ejecutó o se bloqueó y el invariante ('adaptacion');
// - cada orden del terapeuta ('orden');
// - cada cálculo de indicadores, con la huella de los datos de entrada, la versión y el resultado ('indicadores');
// - qué se mostró en el panel y cuándo ('panel').
// La copia diaria de la huella de la última entrada en un registro independiente del servidor
// depende de H7 (decisión D6).
import { huellaDe, canonico } from './huella.js';

export const VERSION_AUDITORIA = '0.1.0';
export const ORIGEN = '0'.repeat(64); // «anterior» de la primera entrada

// Huella de una entrada: del JSON canónico de todos sus campos menos «huella».
export function huellaDeEntrada(e) {
  const { huella, ...resto } = e;
  return huellaDe(resto);
}

// Entrada nueva al final de la cadena. entradas: las que ya hay.
export function nuevaEntrada(entradas, tipo, datos, hora = new Date().toISOString()) {
  const previa = entradas.at(-1);
  const e = { n: entradas.length + 1, hora, tipo, datos: JSON.parse(canonico(datos ?? null)), anterior: previa ? previa.huella : ORIGEN, version: VERSION_AUDITORIA };
  return { ...e, huella: huellaDeEntrada(e) };
}

// Comprueba la cadena entera: { ok, rota_en (número de la primera entrada que no cuadra), motivo }.
export function verificarCadena(entradas) {
  let anterior = ORIGEN;
  for (let i = 0; i < entradas.length; i++) {
    const e = entradas[i];
    if (e.n !== i + 1) return { ok: false, rota_en: i + 1, motivo: 'falta, sobra o se reordenó una entrada' };
    if (e.anterior !== anterior) return { ok: false, rota_en: e.n, motivo: 'la huella de la entrada anterior no coincide' };
    if (huellaDeEntrada(e) !== e.huella) return { ok: false, rota_en: e.n, motivo: 'la entrada cambió después de registrarse' };
    anterior = e.huella;
  }
  return { ok: true, rota_en: null, motivo: null, ultima: entradas.at(-1)?.huella ?? ORIGEN };
}

// Registro sobre un almacén con la interfaz de createLog (add, rows): solo agregar.
export function crearAuditoria(almacen) {
  return {
    agregar(tipo, datos) {
      const e = nuevaEntrada(almacen.rows(), tipo, datos);
      almacen.add(e);
      return e;
    },
    entradas: () => almacen.rows(),
    verificar: () => verificarCadena(almacen.rows()),
  };
}

export const AUDITORIA_COLUMNS = ['n', 'hora', 'tipo', 'datos', 'anterior', 'version', 'huella'];
export const AUDITORIA_KEY = 'neuro-blueminds.auditoria';
