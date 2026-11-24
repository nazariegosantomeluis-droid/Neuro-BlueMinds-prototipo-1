// Pantallas del padrón local de niños (#ninos) y confirmación del niño antes de empezar (R6).
// La lógica está en ninos.js; aquí solo se dibuja. No hay ningún campo de texto: el padrón no puede
// recibir un nombre ni otro dato que identifique al niño.
import { esc, navHTML } from './paginas.js';
import { COLORES, EDAD_MIN, EDAD_MAX, MODOS_FASE, abreviar, nombreNino, crearNino, cambiarConsentimiento, modoDe, cambiarModo, fijarBanda } from './ninos.js';

// Nombre de cada modo de fase (Arquitectura 14).
export const NOMBRE_MODO = { familiarizacion: 'Familiarización', fase1: 'Fase 1', fase2: 'Fase 2', fase3: 'Fase 3', cierre: 'Cierre' };
// Actividades con banda fija por niño: las del piloto después de la familiarización.
export const CON_BANDA = ['ACT-02', 'ACT-07'];

export const LINEA_SIN_IDENTIDAD =
  'Esta tableta no guarda quién es cada niño: el investigador lleva la relación entre el código y el niño fuera de la aplicación (Arquitectura 9.1).';
const AVISO_PADRON =
  'Padrón local del prototipo. En el estudio lo entrega el servidor y el terapeuta no cambia el consentimiento (Arquitectura 9.6). Inscribe solo a niños cuya familia ya firmó el consentimiento.';

const FORMAS = {
  circulo: '<circle cx="12" cy="12" r="9"/>',
  cuadrado: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  triangulo: '<polygon points="12,3 22,21 2,21"/>',
  estrella: '<polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6"/>',
  rombo: '<polygon points="12,2 22,12 12,22 2,12"/>',
  corazon: '<path d="M12 21s-8-5.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.4-8 11-8 11z"/>',
  luna: '<path d="M20 14.5A9 9 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  hexagono: '<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>',
};

export function iconoSVG(nino, px = 36) {
  const hex = COLORES.find((c) => c.id === nino.color)?.hex ?? '#888888';
  return `<svg class="nino-icono" viewBox="0 0 24 24" width="${px}" height="${px}" role="img" aria-label="${esc(nombreNino(nino))}"><g fill="${hex}" stroke="#1d2226" stroke-width="1.5" stroke-linejoin="round">${FORMAS[nino.icono] ?? ''}</g></svg>`;
}

// Solo un número y una casilla: sin campos de texto, de correo, de teléfono ni de fecha.
export function inscripcionHTML() {
  return `
    <form class="panel" id="inscribir" novalidate>
      <label>Edad en meses al inscribirlo
        <input type="number" name="edad" min="${EDAD_MIN}" max="${EDAD_MAX}" step="1" inputmode="numeric" required>
        <span class="ayuda">De ${EDAD_MIN} a ${EDAD_MAX} meses (4 a 10 años).</span>
      </label>
      <label class="casilla"><input type="checkbox" name="video" value="1"> La familia autorizó el video</label>
      <p class="mensaje" role="alert" id="ninos-msg"></p>
      <div class="acciones"><button type="submit" class="primario">Inscribir</button></div>
    </form>`;
}

const ETIQUETA_CONSENTIMIENTO = { vigente: 'Vigente', suspendido: 'Suspendido', retirado: 'Retirado' };

// Modo de fase y banda fija de cada actividad: los fija el investigador responsable.
function faseHTML(n, fichas) {
  const modo = modoDe(n);
  const bandas = CON_BANDA.filter((id) => fichas[id])
    .map((id) => {
      const actual = n.bandas?.[id] ?? fichas[id].bandas[0].id;
      return `<label>${esc(id)}
        <select data-banda="${esc(id)}" data-codigo="${esc(n.codigo)}">${fichas[id].bandas.map((b) => `<option ${b.id === actual ? 'selected' : ''}>${esc(b.id)}</option>`).join('')}</select></label>`;
    })
    .join('');
  return `
    <label>Modo de fase
      <select data-modo data-codigo="${esc(n.codigo)}">${MODOS_FASE.map((m) => `<option value="${m}" ${m === modo ? 'selected' : ''}>${esc(NOMBRE_MODO[m])}</option>`).join('')}</select></label>
    <details class="nino-bandas"><summary>Banda fija</summary><div class="nino-bandas-campos">${bandas}</div></details>`;
}

function filaHTML(n, fichas) {
  const acciones =
    n.consentimiento === 'vigente'
      ? `<button type="button" data-cambiar="suspendido" data-codigo="${esc(n.codigo)}">Suspender</button>
         <button type="button" data-cambiar="retirado" data-codigo="${esc(n.codigo)}">Retirar</button>`
      : n.consentimiento === 'suspendido'
        ? `<button type="button" data-cambiar="vigente" data-codigo="${esc(n.codigo)}">Reanudar</button>
           <button type="button" data-cambiar="retirado" data-codigo="${esc(n.codigo)}">Retirar</button>`
        : '<span class="ayuda">No se revierte en la tableta</span>';
  return `
    <tr>
      <td><div class="nino-celda">${iconoSVG(n)}<span class="nino-nombre">${esc(nombreNino(n))}</span></div></td>
      <td><strong>${esc(abreviar(n.codigo))}</strong>
        <details><summary>Código completo</summary><code>${esc(n.codigo)}</code></details></td>
      <td>${esc(n.edad_meses)} meses</td>
      <td>${n.video ? 'Sí' : 'No'}</td>
      <td>${esc(ETIQUETA_CONSENTIMIENTO[n.consentimiento] ?? n.consentimiento)}</td>
      <td class="nino-fase">${faseHTML(n, fichas)}</td>
      <td><div class="acciones">${acciones}</div></td>
    </tr>`;
}

export const AVISO_FASE =
  'El modo de fase y la banda fija de cada niño los fija el investigador responsable (Arquitectura 14). En el estudio vienen del servidor; en este prototipo se fijan aquí. La banda fija se usa en las fases 1, 2, 3 y en el cierre. En la familiarización, una escalera de 10 ensayos por banda propone la banda inicial de la fase 1; el terapeuta la confirma o la cambia al cerrar y queda aquí.';

export function renderNinos(app, { ninos, fichas = {} }) {
  let msg = '';
  let exito = false; // el aviso de éxito no usa el estilo rojo de los errores
  const dibujar = () => {
    const filas = ninos.rows();
    app.innerHTML = `
      <div class="adulto ancho ninos">
        ${navHTML('inicio')}
        <h1>Niños inscritos</h1>
        <p class="aviso" id="sin-identidad">${esc(LINEA_SIN_IDENTIDAD)}</p>
        <p class="meta">${esc(AVISO_PADRON)}</p>
        ${ninos.stored ? '' : '<p class="mensaje">No se pudo guardar en el dispositivo. Los cambios se pierden al cerrar esta página.</p>'}
        ${
          filas.length
            ? `<div class="panel"><table class="nino-tabla">
                <thead><tr><th>Ícono</th><th>Código</th><th>Edad</th><th>Video</th><th>Consentimiento</th><th>Fase</th><th></th></tr></thead>
                <tbody>${filas.map((n) => filaHTML(n, fichas)).join('')}</tbody></table>
                <p class="ayuda">${esc(AVISO_FASE)}</p></div>`
            : '<p class="meta">Todavía no hay niños inscritos. Sin ellos solo se puede usar la demostración.</p>'
        }
        <section><h2>Inscribir un niño</h2>${inscripcionHTML()}</section>
      </div>`;
    const mensaje = app.querySelector('#ninos-msg');
    mensaje.textContent = msg;
    if (exito) mensaje.className = 'meta';

    app.querySelector('#inscribir').onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const n = crearNino({ edad_meses: Number(f.edad.value), video: f.video.checked }, ninos.rows());
        ninos.add(n);
        msg = `Inscrito: ${nombreNino(n)}, código ${abreviar(n.codigo)}. Código completo (anótalo fuera de la aplicación): ${n.codigo}`;
        exito = true;
      } catch (err) {
        msg = err.message;
        exito = false;
      }
      dibujar();
    };
    const editar = (codigo, fn) =>
      ninos.edit((rows) => {
        const r = rows.find((x) => x.codigo === codigo);
        if (r) fn(r);
      });
    for (const s of app.querySelectorAll('[data-modo]')) {
      s.onchange = () => {
        editar(s.dataset.codigo, (r) => (r.modo_fase = cambiarModo(s.value)));
        msg = `Modo de fase: ${NOMBRE_MODO[s.value]}.`;
        exito = true;
        dibujar();
      };
    }
    for (const s of app.querySelectorAll('[data-banda]')) {
      s.onchange = () => {
        editar(s.dataset.codigo, (r) => (r.bandas = fijarBanda(r.bandas, fichas[s.dataset.banda], s.value)));
        msg = `Banda fija de ${s.dataset.banda}: ${s.value}.`;
        exito = true;
        dibujar();
      };
    }
    for (const b of app.querySelectorAll('[data-cambiar]')) {
      b.onclick = () => {
        const nuevo = b.dataset.cambiar;
        if (nuevo === 'retirado' && !confirm('El consentimiento retirado no se puede revertir en la tableta. ¿Continuar?')) return;
        try {
          ninos.edit((rows) => {
            const r = rows.find((x) => x.codigo === b.dataset.codigo);
            if (r) r.consentimiento = cambiarConsentimiento(r.consentimiento, nuevo);
          });
          msg = '';
        } catch (err) {
          msg = err.message;
          exito = false;
        }
        dibujar();
      };
    }
  };
  dibujar();
}

// R6: antes del primer bloque, el terapeuta confirma que el ícono y el color son los del niño que
// tiene enfrente. Devuelve true si confirma.
export function confirmarNino(app, nino) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <div class="adulto ninos">
        <h1>¿Es este niño?</h1>
        <div class="panel nino-confirmar">
          ${iconoSVG(nino, 160)}
          <p class="nino-nombre grande">${esc(nombreNino(nino))}</p>
          <p class="meta">Código ${esc(abreviar(nino.codigo))} · ${esc(nino.edad_meses)} meses</p>
          <div class="acciones">
            <button type="button" class="primario" data-r="si">Sí, es este niño</button>
            <button type="button" data-r="no">No, volver</button>
          </div>
        </div>
      </div>`;
    for (const b of app.querySelectorAll('[data-r]')) b.onclick = () => resolve(b.dataset.r === 'si');
  });
}
