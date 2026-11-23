// Rutinas de la sesión con un niño (Catálogo 7.1). Siempre iguales, para que el niño anticipe lo
// que sigue y las condiciones de medición sean constantes. Sin texto y sin colores de marca.
// - Rutina de inicio: con pictogramas, la secuencia de la sesión («primero…, después…, al final…»).
// - Transición: 5 s con el pictograma de la actividad que sigue.
// - Rutina de cierre: «terminamos» con una animación breve, igual en todas las sesiones e
//   independiente del desempeño.
// Solo arma el HTML; app.js lo muestra el tiempo que fija fichas/sesion.json.
import { ESQUEMAS } from './catalogo.js';

// La referencia motora: un dedo que toca un círculo, en el mismo trazo que los esquemas.
export const PICTO_REFERENCIA = `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="31" cy="15" r="9"/>
  <path d="M24 22v-7a2.5 2.5 0 015 0v12M29 23v-1.5a2.5 2.5 0 015 0V27M34 25a2.5 2.5 0 015 0v5c0 7-4 12-11 12h-2c-5 0-8-3-10-7l-3.5-6.5a2.5 2.5 0 014-3L20 29V18a2.5 2.5 0 014-1"/>
</svg>`;

const pictograma = (contenido, clase = '') => `<div class="rutina-picto ${clase}">${contenido}</div>`;
const FLECHA = '<svg class="rutina-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// actividades: las del plan, en orden; una actividad que se repite (la fase 2) se muestra una vez,
// para que la rutina sea igual en todas las sesiones del modo.
export function rutinaInicioHTML(actividades, fin) {
  const unicas = [...new Set(actividades)];
  const pasos = [pictograma(PICTO_REFERENCIA), ...unicas.map((id) => pictograma(ESQUEMAS[id] ?? '')), pictograma(`<img src="${fin}" alt="">`, 'rutina-fin')];
  return `<div class="rutina rutina-inicio">${pasos.join(FLECHA)}</div>`;
}

export const transicionHTML = (actividad) => `<div class="rutina rutina-transicion">${pictograma(ESQUEMAS[actividad] ?? '', 'rutina-grande')}</div>`;

export const cierreHTML = (fin) => `<div class="rutina rutina-cierre">${pictograma(`<img src="${fin}" alt="">`, 'rutina-grande rutina-fin rutina-aparece')}</div>`;
