// Menú del terapeuta (H2.4; Arquitectura 8.1). Se abre con una pulsación prolongada en la esquina,
// fuera del alcance habitual del niño. Abrirlo pausa la sesión. Desde ahí, con dos toques como
// máximo: reanudar, terminar el bloque o la sesión con su motivo, fijar la banda, desactivar o
// reactivar la adaptación, anular el último cambio de banda y marcar un episodio de desregulación.
// Cada orden queda en el registro con su hora y el estado de la sesión en ese momento
// (ordenes_terapeuta en sesiones.csv).
//
// La lógica es una máquina de estados sin DOM (crearMenu); app.js dibuja el menú y le pasa cada
// toque. Así las pruebas cuentan los toques de cada acción.
import { esc } from './html.js';
import { MOTIVOS_TERMINACION, MOTIVO_OBLIGATORIO_MSG } from './terminacion.js';

export const PULSACION_MS = 800;

// Toques desde el menú abierto para cada acción (Arquitectura 8.1: dos como máximo).
export const TOQUES = {
  reanudar: 1,
  terminar_bloque: 2, // motivo y «Terminar el bloque»
  terminar_sesion: 2, // motivo y «Terminar la sesión»
  fijar_banda: 1,
  desactivar_adaptacion: 1,
  reactivar_adaptacion: 1,
  anular_cambio_banda: 1,
  episodio_desregulacion: 1,
};

// INV-7 (Arquitectura 7.4): en los modos con dificultad fija ninguna acción cambia la banda ni la
// adaptación. La orden no se ejecuta y queda registrada con el invariante que la bloqueó.
export function bloqueoDe(accion, modo, config) {
  const cambiaBanda = ['fijar_banda', 'anular_cambio_banda', 'desactivar_adaptacion', 'reactivar_adaptacion'].includes(accion);
  if (!cambiaBanda || !modo || !config?.modos?.[modo]) return null;
  // La escalera de la familiarización (decisión R6) también fija la banda: la mueve su regla.
  return ['fija', 'escalera'].includes(config.modos[modo].dificultad) ? 'INV-7' : null;
}

export const MENSAJE_BLOQUEO = {
  'INV-7': 'En este modo de fase la dificultad es fija: la banda y la adaptación no cambian (INV-7). La orden quedó registrada como bloqueada.',
};

// contexto: { modo, config, actividad, banda, bandas (ids de la ficha), adaptacion, cambios
// (pila de cambios de banda de la sesión), enReferencia }.
// tocar(control, valor) devuelve { orden?, cerrar?, mensaje? }:
// - orden: lo que hay que registrar ({ accion, detalle, bloqueada }).
// - cerrar: 'continuar' o 'terminar' (con alcance 'bloque' o 'sesion'), y el menú se cierra.
export function crearMenu(contexto) {
  const estado = { motivo: '', toques: 0, adaptacion: contexto.adaptacion ?? false, banda: contexto.banda ?? null, cambios: [...(contexto.cambios ?? [])] };
  const registrar = (accion, detalle = null) => {
    const bloqueada = bloqueoDe(accion, contexto.modo, contexto.config);
    return { orden: { accion, detalle, bloqueada }, mensaje: bloqueada ? MENSAJE_BLOQUEO[bloqueada] : null, bloqueada };
  };
  return {
    estado,
    tocar(control, valor) {
      estado.toques++;
      if (control === 'continuar') return { orden: { accion: 'reanudar', detalle: null, bloqueada: null }, cerrar: { accion: 'continuar' } };
      if (control === 'motivo') {
        estado.motivo = MOTIVOS_TERMINACION.includes(valor) ? valor : '';
        return {};
      }
      if (control === 'terminar-bloque' || control === 'terminar-sesion') {
        if (!estado.motivo) return { mensaje: MOTIVO_OBLIGATORIO_MSG };
        const alcance = control === 'terminar-sesion' ? 'sesion' : 'bloque';
        return { orden: { accion: `terminar_${alcance}`, detalle: estado.motivo, bloqueada: null }, cerrar: { accion: 'terminar', alcance, motivo: estado.motivo } };
      }
      if (control === 'episodio') return { orden: { accion: 'episodio_desregulacion', detalle: null, bloqueada: null }, mensaje: 'Episodio de desregulación marcado.' };
      if (control === 'banda') {
        const r = registrar('fijar_banda', { actividad: contexto.actividad, de: estado.banda, a: valor });
        if (!r.bloqueada && valor !== estado.banda) {
          estado.cambios.push({ actividad: contexto.actividad, de: estado.banda, a: valor });
          estado.banda = valor;
        }
        return { ...r, mensaje: r.mensaje ?? `Banda fijada: ${valor}. Se usa desde el bloque siguiente.` };
      }
      if (control === 'adaptacion') {
        const accion = estado.adaptacion ? 'desactivar_adaptacion' : 'reactivar_adaptacion';
        const r = registrar(accion);
        if (!r.bloqueada) estado.adaptacion = !estado.adaptacion;
        return { ...r, mensaje: r.mensaje ?? (estado.adaptacion ? 'Adaptación reactivada.' : 'Adaptación desactivada.') };
      }
      if (control === 'anular') {
        const ultimo = estado.cambios.at(-1);
        if (!ultimo) return { mensaje: 'No hay ningún cambio de banda que anular.' };
        const r = registrar('anular_cambio_banda', ultimo);
        if (!r.bloqueada) {
          estado.cambios.pop();
          estado.banda = ultimo.de;
        }
        return { ...r, mensaje: r.mensaje ?? `Se anuló el cambio: la banda vuelve a ${ultimo.de}.` };
      }
      return {};
    },
  };
}

// Orden lista para el registro: hora del reloj (ISO, solo para identificarla), ms desde el inicio
// de la sesión y el estado de la sesión en ese momento.
export const ordenRegistro = (orden, { hora, ms, bloque, ensayo, modo, banda, adaptacion, propuestas_previas = null, ensayos_validos = null, actividad = null }) => ({
  hora,
  ms,
  accion: orden.accion,
  detalle: orden.detalle ?? null,
  bloqueada: orden.bloqueada ?? null,
  bloque: bloque ?? null,
  ensayo: ensayo ?? null,
  modo: modo ?? null,
  banda: banda ?? null,
  adaptacion: Boolean(adaptacion),
  // Para reproducir la sesión (Arquitectura 10.2): decisiones de la regla que había, ensayos
  // válidos de la actividad en la sesión y la actividad del bloque.
  propuestas_previas,
  ensayos_validos,
  actividad,
});

const chip = (name, value, label, checked = false) =>
  `<label class="chip"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;

// En qué parte de la sesión se abrió el menú, y qué pasó con lo que estaba en curso.
const EN_CURSO = {
  bloque: 'El ensayo en curso quedó registrado como interrumpido y no se repetirá.',
  referencia: 'La aparición del objetivo en curso se descartó y no se repetirá.',
  rutina: 'La rutina sigue al reanudar.',
};

// HTML del menú. donde: 'bloque', 'referencia' o 'rutina'; fuera de un bloque no hay «Terminar el
// bloque». aviso: el de los 15 minutos, si ya se llegó (INV-8).
export function menuHTML({ donde = 'bloque', bandas = [], banda = null, adaptacion = false, hayCambios = false, uso = '', aviso = '' }) {
  return `
    <div class="menu-terapeuta">
      <p class="meta">Sesión en pausa${uso ? ` · ${esc(uso)} de uso` : ''}. ${EN_CURSO[donde]}</p>
      ${aviso ? `<p class="aviso" role="alert">${esc(aviso)}</p>` : ''}
      <div class="acciones"><button type="button" class="primario" data-menu="continuar">Reanudar</button>
        <button type="button" data-menu="episodio">Marcar episodio de desregulación</button></div>
      <fieldset class="chips">
        <legend>Terminar: elige el motivo</legend>
        ${MOTIVOS_TERMINACION.map((m) => chip('menu-motivo', m, m)).join('')}
      </fieldset>
      <div class="acciones">
        ${donde === 'bloque' ? '<button type="button" data-menu="terminar-bloque">Terminar el bloque</button>' : ''}
        <button type="button" data-menu="terminar-sesion">Terminar la sesión</button>
      </div>
      ${
        bandas.length
          ? `<fieldset class="chips">
               <legend>Fijar la banda</legend>
               ${bandas.map((b) => chip('menu-banda', b, b, b === banda)).join('')}
             </fieldset>
             <div class="acciones">
               <button type="button" data-menu="adaptacion">${adaptacion ? 'Desactivar la adaptación' : 'Reactivar la adaptación'}</button>
               <button type="button" data-menu="anular" ${hayCambios ? '' : 'disabled'}>Anular el último cambio de banda</button>
             </div>`
          : ''
      }
      <p class="mensaje" role="status" data-menu-mensaje></p>
    </div>`;
}

// Pulsación prolongada: la acción ocurre si el dedo se queda PULSACION_MS sobre el botón.
export function mantenerPulsado(boton, accion, ms = PULSACION_MS) {
  let t = null;
  const cancelar = () => {
    clearTimeout(t);
    t = null;
    boton.classList.remove('pulsando');
  };
  boton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    boton.classList.add('pulsando');
    t = setTimeout(() => {
      cancelar();
      accion();
    }, ms);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) boton.addEventListener(ev, cancelar);
}
