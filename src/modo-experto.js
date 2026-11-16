// Modo experto de la aplicación. Apagado por defecto (también en GitHub Pages): el inicio, la
// galería, las sesiones y el formulario F3 muestran solo las actividades del piloto (ACT-01,
// ACT-02 y ACT-07), sin los grupos «En preparación» ni «En investigación» y sin la pausa guiada.
// Encendido, se ven todas, como prototipos para revisar. Se guarda en este dispositivo.
import { esPiloto } from './catalogo.js';
import { esc } from './html.js';

export const CLAVE_MODO_EXPERTO = 'nbm.modoExperto';

let activo = false;
export const modoExpertoActivo = () => activo;
export function fijarModoExperto(valor) {
  activo = Boolean(valor);
}

// prefs: { get(clave, valorPorDefecto) }. Cualquier valor que no sea «1» es «apagado».
export const leerModoExperto = (prefs) => prefs.get(CLAVE_MODO_EXPERTO, '0') === '1';

// Con el modo apagado, solo las actividades del piloto.
export const actividadesVisibles = (ids, experto = activo) => (experto ? ids : ids.filter((id) => esPiloto(id)));
export const gruposVisibles = (grupos, experto = activo) => (experto ? grupos : grupos.filter((g) => g.id === 'piloto'));
export const filasVisibles = (filas, experto = activo) => (experto ? filas : filas.filter((r) => esPiloto(r.actividad)));

export const AYUDA_MODO_EXPERTO = 'Muestra también las actividades fuera del piloto y la pausa guiada, como prototipos para revisar.';

// Interruptor del encabezado de las pantallas del adulto.
export const interruptorHTML = (experto = activo) => `
  <label class="modo-experto" title="${esc(AYUDA_MODO_EXPERTO)}">
    <input type="checkbox" data-modo-experto ${experto ? 'checked' : ''}>
    <span>Modo experto</span>
  </label>`;
