// Vista previa del inicio: un ítem de ejemplo de la banda elegida, dibujado en chico, para
// que el adulto vea lo que verá el niño antes de empezar. No mide nada ni usa el motor.
import { PANTALLAS } from './catalogo.js';
import { figuraSVG, simboloSVG } from './activities/cambia-regla.js';
import { esc, miniatura } from './html.js';

// El primer ítem de la muestra para expertos de la banda (del primer juego de cajas, si hay varios).
export function itemDeEjemplo(items, ficha, banda) {
  const deBanda = items.filter((i) => i.actividad === ficha.id && i.banda === banda.id && (i.juego ?? 0) === 0);
  return deBanda.find((i) => i.muestraExpertos) ?? deBanda[0] ?? null;
}

// Devuelve el HTML de la pantalla en miniatura, o '' si la banda no tiene ítems.
export function previaHTML({ ficha, banda, items }) {
  const item = itemDeEjemplo(items, ficha, banda);
  const mod = PANTALLAS[ficha.pantalla];
  if (!item || !mod) return '';
  const [t] = mod.toTrials([item], { ficha, banda, pareja: ficha.parejas?.[0] });
  const [filas, columnas] = (banda.disposicion ?? `1x${banda.opciones}`).split('x').map(Number);
  let consigna;
  if (ficha.pantalla === 'cambia-regla') {
    const { regla, tarjeta } = t.consigna;
    consigna = `<span class="previa-regla">${simboloSVG(regla, tarjeta.forma)}</span><span class="previa-caja">${figuraSVG(tarjeta.forma, tarjeta.color)}</span>`;
  } else {
    consigna = `<span class="previa-caja previa-${esc(t.consigna.tipo ?? 'imagen')}">${mod.consignaHTML?.(t.consigna) ?? miniatura(t.consigna.src)}</span>`;
  }
  const opcion = (o) => mod.opcionHTML?.(o) ?? (o.src ? miniatura(o.src) : figuraSVG(o.forma, o.color));
  return `
    <div class="previa-pantalla previa-${esc(ficha.pantalla)}" style="--filas:${filas};--columnas:${columnas}" role="img" aria-label="Ejemplo de la pantalla del niño: ${esc(ficha.nombre)}, banda ${esc(banda.id)}">
      <div class="previa-consigna">${consigna}</div>
      <div class="previa-opciones">${t.opciones.map((o) => `<span class="previa-caja">${opcion(o)}</span>`).join('')}</div>
    </div>`;
}
