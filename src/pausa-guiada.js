// ACT-17 «Pausa guiada»: un globo que se infla y se desinfla despacio. No mide nada.
// La inicia solo el terapeuta y se detiene en cuanto él toca dos veces la esquina.
// El movimiento es lento y continuo (nada destella) y se calcula en cada cuadro, sin
// animaciones de CSS ni temporizadores repetidos. Con «reducir movimiento» activo, el globo
// cambia de tamaño en dos pasos suaves en lugar de moverse todo el tiempo.

const GLOBO = `
  <svg viewBox="0 0 200 240" aria-hidden="true">
    <path d="M100 196 q-10 18 2 34" fill="none" stroke="#6c7278" stroke-width="3" stroke-linecap="round"/>
    <g id="globo-cuerpo" style="transform-origin:100px 190px">
      <path d="M100 14 C150 14 178 52 178 96 C178 146 130 178 100 190 C70 178 22 146 22 96 C22 52 50 14 100 14 Z" fill="#7fb8a8" stroke="#2b2b2b" stroke-width="4" stroke-linejoin="round"/>
      <path d="M62 52 C74 36 92 30 106 32" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.55"/>
      <path d="M92 188 L100 200 L108 188 Z" fill="#7fb8a8" stroke="#2b2b2b" stroke-width="4" stroke-linejoin="round"/>
    </g>
  </svg>`;

export const ESCALA_MIN = 0.62;
export const ESCALA_MAX = 1;

// Tamaño del globo en el milisegundo «t» de la pausa: sube al inflar y baja al desinflar,
// con arranque y frenado suaves (medio coseno).
export function escalaGlobo(t, { inflarMs, desinflarMs }) {
  const ciclo = inflarMs + desinflarMs;
  const fase = ((t % ciclo) + ciclo) % ciclo;
  const avance = fase < inflarMs ? fase / inflarMs : 1 - (fase - inflarMs) / desinflarMs;
  const suave = (1 - Math.cos(Math.PI * avance)) / 2;
  return ESCALA_MIN + (ESCALA_MAX - ESCALA_MIN) * suave;
}

// Dibuja la pausa en «host» y devuelve una promesa con { duracion_ms, completa }.
// - ritmo: { inflarMs, desinflarMs }; duracionS: segundos de pausa.
// - Dos toques en la esquina la terminan antes de tiempo.
export function pausaGuiada(host, { ritmo, duracionS, icono = '', dosToques, now = () => performance.now(), raf = requestAnimationFrame, caf = cancelAnimationFrame }) {
  return new Promise((resolve) => {
    const capa = document.createElement('div');
    capa.className = 'pausa-guiada';
    capa.innerHTML = `<div class="globo">${GLOBO}</div>
      <button type="button" class="esquina" aria-label="Terminar la pausa: tocar dos veces">${icono}</button>`;
    host.append(capa);
    const cuerpo = capa.querySelector('#globo-cuerpo');
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = now();
    const total = duracionS * 1000;
    let cuadro = null;
    const terminar = (completa) => {
      caf(cuadro);
      capa.remove();
      resolve({ duracion_ms: Math.round(now() - t0), completa });
    };
    const dibujar = () => {
      const t = now() - t0;
      if (t >= total) return terminar(true);
      if (quieto) {
        // Dos tamaños: grande al inflar y chico al desinflar, con una transición corta.
        const inflando = t % (ritmo.inflarMs + ritmo.desinflarMs) < ritmo.inflarMs;
        cuerpo.style.transition = 'transform 300ms ease-out';
        cuerpo.style.transform = `scale(${inflando ? ESCALA_MAX : ESCALA_MIN})`;
      } else {
        cuerpo.style.transform = `scale(${escalaGlobo(t, ritmo).toFixed(4)})`;
      }
      cuadro = raf(dibujar);
    };
    dosToques(capa.querySelector('.esquina'), () => terminar(false));
    dibujar();
  });
}
