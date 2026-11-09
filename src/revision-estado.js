// Estado de la revisión clínica (items/revision.json) para el inicio y la galería. Sin DOM.

export const ETIQUETAS_REVISION = {
  'sin-revisar': 'Sin revisión clínica',
  aprobado: 'Aprobado',
  corregir: 'Por corregir',
  retirado: 'Retirado',
};

export const AVISO_SIN_REVISION =
  'Esta actividad aún no tiene revisión clínica registrada: úsala solo para demostración y pruebas.';

// Arquitectura 4.4: la ficha registra quién hizo la revisión clínica y cuándo.
export const revisadaClinicamente = (ficha) => Boolean(ficha?.revisionClinica?.revisor && ficha?.revisionClinica?.fecha);

// Ítems con el estado pedido ('todos' o vacío: sin filtrar). Las secuencias de ACT-07 no tienen estado propio.
export const filtrarPorEstado = (items, estado) =>
  !estado || estado === 'todos' ? items : items.filter((i) => (i.estadoRevision ?? 'sin-revisar') === estado);

// Problemas y comentarios de los clínicos sobre un ítem o sobre las figuras de ACT-07.
export const notasDe = (entrada) => (entrada ? [...(entrada.problemas ?? []), ...(entrada.comentarios ?? [])] : []);

// Línea de la galería sobre las figuras de ACT-07, que se revisan en conjunto.
export function textoFiguras(revision) {
  const f = revision?.figuras?.['ACT-07'];
  if (!f) return 'Figuras y colores sin revisión clínica.';
  const notas = notasDe(f);
  return `Figuras y colores: ${ETIQUETAS_REVISION[f.estado].toLowerCase()} en la revisión clínica del ${f.fecha}${notas.length ? ` (${notas.join(' · ')})` : ''}.`;
}

// Cuántos ítems hay en cada estado.
export function conteoEstados(items) {
  const out = Object.fromEntries(Object.keys(ETIQUETAS_REVISION).map((k) => [k, 0]));
  for (const i of items) if (i.estadoRevision) out[i.estadoRevision]++;
  return out;
}
