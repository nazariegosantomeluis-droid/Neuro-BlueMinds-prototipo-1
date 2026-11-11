// Utilidades pequeñas para armar HTML en las pantallas del adulto.

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Imagen pequeña para la galería y la vista previa: sin texto alternativo, porque el nombre va al lado.
export const miniatura = (src) => `<img src="${esc(src)}" alt="" loading="lazy">`;
