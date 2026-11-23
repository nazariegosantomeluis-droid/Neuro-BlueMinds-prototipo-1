// Tema de imágenes por intereses (H2.7; Arquitectura 4.8). El terapeuta elige el tema de la sesión
// con un niño. El tema solo cambia imágenes: reemplaza la ruta de cada imagen por la de su tema.
// Los ítems, el número y el orden de las opciones, la respuesta correcta y la banda no cambian.
// Los temas están en fichas/temas.json; por ahora solo existe «general» (sin cambios).
export const TEMA_GENERAL = 'general';

export const temaPorId = (temas, id) => temas?.temas?.find((t) => t.id === id) ?? null;

// Los ensayos del bloque con las imágenes del tema. Copia los ensayos; no cambia los originales.
export function aplicarTema(trials, tema) {
  const mapa = tema?.imagenes ?? {};
  if (!Object.keys(mapa).length) return trials;
  const cambia = (src) => (typeof src === 'string' && mapa[src]) || src;
  return trials.map((t) => ({
    ...t,
    consigna: t.consigna?.src ? { ...t.consigna, src: cambia(t.consigna.src) } : t.consigna,
    opciones: t.opciones?.map((o) => (o.src ? { ...o, src: cambia(o.src) } : o)),
    ...(t.imagenes ? { imagenes: t.imagenes.map(cambia) } : {}),
  }));
}

// Problemas de fichas/temas.json. imagenesDelBanco: las rutas de imagen que usan los ítems.
export function validarTemas(temas, imagenesDelBanco = new Set()) {
  const p = [];
  const lista = temas?.temas ?? [];
  const general = lista.find((t) => t.id === TEMA_GENERAL);
  if (!general) p.push('Falta el tema «general».');
  else if (Object.keys(general.imagenes ?? {}).length) p.push('El tema «general» no cambia ninguna imagen.');
  const ids = new Set();
  for (const t of lista) {
    if (!t.id || ids.has(t.id)) p.push(`Tema sin identificador o repetido: ${t.id}.`);
    ids.add(t.id);
    if (!t.nombre) p.push(`El tema ${t.id} no tiene nombre.`);
    for (const [de, a] of Object.entries(t.imagenes ?? {})) {
      if (!imagenesDelBanco.has(de)) p.push(`Tema ${t.id}: ${de} no es una imagen del banco.`);
      if (typeof a !== 'string' || !a) p.push(`Tema ${t.id}: ${de} no tiene imagen de reemplazo.`);
    }
  }
  return p;
}

// Selector del tema en el inicio de la sesión con un niño.
export function selectorTemaHTML(temas, elegido = TEMA_GENERAL, esc = String) {
  const lista = temas?.temas ?? [{ id: TEMA_GENERAL, nombre: 'General' }];
  return `
    <label class="tema-imagenes">Tema de imágenes
      <select name="tema">${lista.map((t) => `<option value="${esc(t.id)}" ${t.id === elegido ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select>
      <span class="ayuda">Solo cambia las imágenes, no las actividades ni la banda. Queda en el registro de la sesión.${lista.length === 1 ? ' Los temas por intereses llegarán con las imágenes del banco.' : ''}</span>
    </label>`;
}
