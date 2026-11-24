// PIN del terapeuta y bloqueo por inactividad (H6.2; Arquitectura 9.3). Las pantallas que leen los
// registros del dispositivo (inicio, sesiones, niños inscritos y panel) piden el PIN; la galería,
// la revisión clínica, el formulario F3, los créditos y la calibración no tienen datos de niños y
// se abren sin él. El modo del terapeuta se bloquea tras 5 minutos sin uso, pero nunca durante la
// pantalla del niño: la sesión no se interrumpe y el bloqueo llega al volver al adulto.
import { esc, marcaHTML, tituloHTML } from './paginas.js';
import { PIN_MINIMO, pinValido } from './almacen.js';

export const INACTIVIDAD_MS = 5 * 60 * 1000;
// Pantallas sin datos de niños: se abren sin PIN. Todas las demás lo piden.
export const RUTAS_SIN_DATOS = new Set(['galeria', 'revision', 'formulario', 'creditos', 'calibracion', 'pausa']);

// Temporizador de inactividad. puedeBloquear(): false mientras se ve la pantalla del niño.
export function crearInactividad({ limiteMs = INACTIVIDAD_MS, ahora = () => Date.now(), puedeBloquear = () => true, alBloquear }) {
  let ultimo = ahora();
  return {
    tocar() {
      ultimo = ahora();
    },
    // Revisa si toca bloquear; durante la pantalla del niño la cuenta vuelve a empezar.
    revisar() {
      if (!puedeBloquear()) {
        ultimo = ahora();
        return false;
      }
      if (ahora() - ultimo < limiteMs) return false;
      alBloquear();
      return true;
    },
  };
}

// Pantalla del PIN: crear (primer uso) o escribirlo. al(pin) devuelve un mensaje de error o null.
export function renderBloqueo(app, { configurado, alCrear, alDesbloquear, mensaje = '' }) {
  app.innerHTML = `
    <div class="adulto bloqueo">
      ${marcaHTML()}
      ${tituloHTML(configurado ? 'Escribe el PIN' : 'Crea el PIN del terapeuta', configurado ? 'Los registros de este dispositivo están cifrados. Se bloquean tras 5 minutos sin uso.' : `Los registros de los niños se guardan cifrados con este PIN (${PIN_MINIMO} dígitos o más). Sin él no se pueden leer: no hay forma de recuperarlo.`)}
      <form class="panel" id="form-pin" autocomplete="off">
        <label>PIN <input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="${PIN_MINIMO}" required autocomplete="off"></label>
        ${configurado ? '' : `<label>Repite el PIN <input name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" minlength="${PIN_MINIMO}" required autocomplete="off"></label>`}
        <p class="aviso" role="alert" id="pin-mensaje" ${mensaje ? '' : 'hidden'}>${esc(mensaje)}</p>
        <div class="acciones"><button type="submit" class="primario">${configurado ? 'Desbloquear' : 'Crear el PIN'}</button></div>
        <p class="ayuda">Sin PIN puedes abrir la galería, la revisión clínica, el formulario F3, los créditos y la calibración.</p>
      </form>
    </div>`;
  const form = app.querySelector('#form-pin');
  const aviso = app.querySelector('#pin-mensaje');
  const mostrar = (m) => {
    aviso.hidden = !m;
    aviso.textContent = m ?? '';
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const pin = form.pin.value;
    if (!pinValido(pin)) return mostrar(`El PIN debe tener al menos ${PIN_MINIMO} dígitos.`);
    if (!configurado && pin !== form.pin2.value) return mostrar('Los dos PIN no coinciden.');
    form.querySelector('button').disabled = true;
    mostrar('Un momento…');
    const error = configurado ? await alDesbloquear(pin) : await alCrear(pin);
    form.querySelector('button').disabled = false;
    if (error) {
      mostrar(error);
      form.pin.value = '';
      form.pin.focus();
    }
  };
  form.pin.focus();
}
