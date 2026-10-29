// Carga y validación de fichas técnicas. Una ficha incompleta no se ejecuta:
// la aplicación muestra en pantalla la lista de problemas.

export const REQUIRED_FIELDS = [
  'id', 'version', 'nombre', 'objetivo', 'paradigma', 'tipoRespuesta', 'bandas',
  'modalidades', 'ensayosPorBloque', 'limiteRespuestaMs', 'intervaloMs', 'consignaVMs',
  'retroalimentacionMs', 'consignaAV', 'lecturasPermitidas', 'lecturasNoPermitidas',
  'contraindicaciones', 'revisionClinica',
];

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText);
const isPositive = (v) => Number.isFinite(v) && v > 0;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Devuelve la lista de problemas de la ficha; vacía si está completa.
export function validateFicha(f) {
  if (!isObject(f)) return ['La ficha no es un objeto JSON.'];
  const errors = [];
  const missing = REQUIRED_FIELDS.filter((k) => f[k] === undefined || f[k] === null || f[k] === '');
  for (const k of missing) errors.push(`Falta el campo «${k}».`);
  const has = (k) => !missing.includes(k);

  for (const k of ['id', 'version', 'nombre', 'objetivo', 'paradigma']) {
    if (has(k) && !isText(f[k])) errors.push(`«${k}» debe ser un texto.`);
  }
  if (has('tipoRespuesta') && f.tipoRespuesta !== 'seleccion_unica') {
    errors.push('«tipoRespuesta» debe ser "seleccion_unica".');
  }
  if (has('bandas')) {
    if (!Array.isArray(f.bandas) || !f.bandas.length) errors.push('«bandas» debe ser una lista con al menos una banda.');
    else {
      f.bandas.forEach((b, i) => {
        const name = b?.id ?? `número ${i + 1}`;
        if (!isText(b?.id)) errors.push(`La banda ${name} no tiene «id».`);
        if (!Number.isInteger(b?.opciones) || b.opciones < 2) errors.push(`La banda ${name} debe tener «opciones» (2 o más).`);
        if (!isText(b?.descripcion)) errors.push(`La banda ${name} no tiene «descripcion».`);
        // Opcional: filas x columnas, por ejemplo "1x4" o "2x2".
        if (b?.disposicion !== undefined) {
          const m = /^(\d+)x(\d+)$/.exec(b.disposicion);
          if (!m || m[1] * m[2] !== b.opciones) {
            errors.push(`La banda ${name}: «disposicion» debe ser filas x columnas con ${b.opciones} posiciones (por ejemplo "1x${b.opciones}").`);
          }
        }
      });
    }
  }
  if (has('modalidades') && !(Array.isArray(f.modalidades) && f.modalidades.length && f.modalidades.every((m) => m === 'V' || m === 'AV'))) {
    errors.push('«modalidades» debe ser una lista con "V" y/o "AV".');
  }
  for (const k of ['ensayosPorBloque', 'limiteRespuestaMs', 'intervaloMs', 'consignaVMs', 'retroalimentacionMs']) {
    if (has(k) && !isPositive(f[k])) errors.push(`«${k}» debe ser un número mayor que cero.`);
  }
  if (has('consignaAV') && !(isText(f.consignaAV) || (isObject(f.consignaAV) && Object.values(f.consignaAV).length && Object.values(f.consignaAV).every(isText)))) {
    errors.push('«consignaAV» debe ser un texto o un objeto de textos.');
  }
  for (const k of ['lecturasPermitidas', 'lecturasNoPermitidas', 'contraindicaciones']) {
    if (has(k) && !isTextList(f[k])) errors.push(`«${k}» debe ser una lista de textos, no vacía.`);
  }
  if (has('revisionClinica') && !(isObject(f.revisionClinica) && 'revisor' in f.revisionClinica && 'fecha' in f.revisionClinica)) {
    errors.push('«revisionClinica» debe tener «revisor» y «fecha» (pueden estar vacíos).');
  }
  return errors;
}

export class FichaError extends Error {
  constructor(url, errors) {
    super(`No se pudo cargar la ficha ${url}:\n- ${errors.join('\n- ')}`);
    this.url = url;
    this.errors = errors;
  }
}

export async function loadFicha(url, fetchFn = globalThis.fetch) {
  const res = await fetchFn(url);
  if (!res.ok) throw new FichaError(url, [`El archivo no se pudo descargar (HTTP ${res.status}).`]);
  let ficha;
  try {
    ficha = await res.json();
  } catch {
    throw new FichaError(url, ['El archivo no es JSON válido.']);
  }
  const errors = validateFicha(ficha);
  if (errors.length) throw new FichaError(url, errors);
  return ficha;
}
