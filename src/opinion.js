// Formulario de opinión de expertos (#opinion; tanda 10): si la plataforma funciona como el experto
// espera en su práctica, área por área. Separado del F3 (validez de contenido). Sin cuenta: lo que
// escribe se guarda en su dispositivo mientras lo llena y se descarga en un CSV con la versión y el
// commit en cada fila; tools/unir-opinion.mjs une los archivos.
import { esc, navHTML } from './paginas.js';
import { download, VERSION_APP } from './engine/logger.js';
import { versionActual } from './version.js';
import { AREAS, FUNCIONA, GRAVEDAD, ABIERTAS, PROFESIONES, nuevaOpinion, faltantes, opinionCSV, nombreArchivoOpinion, necesitaGravedad } from './opinion-datos.js';

const CLAVE = 'nbm.opinion.respuesta';
const CORREO = 'luisnazariegosantome@gmail.com';

const almacen = {
  leer() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE));
    } catch {
      return null;
    }
  },
  escribir(v) {
    try {
      if (v === null) localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};

const radios = (name, lista, actual) =>
  `<div class="f3-escala" role="radiogroup">${lista.map((o) => `<label><input type="radio" name="${esc(name)}" value="${esc(o.id)}" ${actual === o.id ? 'checked' : ''}><span>${esc(o.texto)}</span></label>`).join('')}</div>`;

export function renderOpinion(app) {
  const guardada = almacen.leer();
  const op = Object.assign(nuevaOpinion(), guardada ?? {});
  op.perfil = Object.assign(nuevaOpinion().perfil, guardada?.perfil ?? {});
  let guardado = true;

  const areaHTML = (a, k) => {
    const r = op.areas[a.id] ?? {};
    return `
      <section class="panel opinion-area" data-area="${esc(a.id)}">
        <p class="meta">Área ${k + 1} de ${AREAS.length}</p>
        <h2>${esc(a.nombre)}</h2>
        <p class="ayuda">Qué revisar: ${esc(a.revisar)}</p>
        <fieldset class="f3-pregunta"><legend><strong>¿Funciona como esperaría en su práctica?</strong></legend>${radios(`f-${a.id}`, FUNCIONA, r.funciona)}</fieldset>
        <fieldset class="f3-pregunta" data-gravedad="${esc(a.id)}" ${necesitaGravedad(r.funciona) ? '' : 'hidden'}><legend><strong>Gravedad del problema</strong></legend>${radios(`g-${a.id}`, GRAVEDAD, r.gravedad)}</fieldset>
        <label>¿Qué cambiaría?<textarea name="c-${esc(a.id)}" rows="3" maxlength="1500">${esc(r.cambiaria ?? '')}</textarea></label>
      </section>`;
  };

  function pintar() {
    const p = op.perfil;
    app.innerHTML = `
      <div class="adulto f3 opinion">
        ${navHTML('opinion')}
        <h1>Opinión de expertos sobre la plataforma</h1>
        <section class="panel">
          <p>Este formulario pregunta si la plataforma funciona como usted esperaría en su práctica. Es distinto del <a href="#formulario">formulario F3</a>, que califica la validez de contenido de las actividades.</p>
          <p>Recorra cada área en la aplicación (en <a href="#inicio">Inicio</a> puede crear un <strong>niño de demostración</strong> con varias sesiones para ver el panel con indicadores) y responda aquí. Toma unos 30 minutos.</p>
          <p>No necesita cuenta ni se piden datos personales: solo sus iniciales, su profesión y sus años de experiencia. Sus respuestas se guardan en este dispositivo mientras lo llena. <strong>Al terminar, descargue el archivo y envíelo a <span class="f3-correo">${CORREO}</span>.</strong> Nada se envía a ningún servidor.</p>
        </section>
        ${guardado ? '' : '<p class="mensaje" role="alert">Este navegador no deja guardar el avance. No cierre la página antes de descargar el archivo.</p>'}
        <form id="opinion" novalidate>
          <section class="panel">
            <h2>Sus datos</h2>
            <div class="f3-grid">
              <label>Iniciales<input name="iniciales" maxlength="4" autocomplete="off" spellcheck="false" placeholder="Ej. MGR" value="${esc(p.iniciales)}"></label>
              <label>Profesión<select name="profesion"><option value="">—</option>${PROFESIONES.map((o) => `<option ${o === p.profesion ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
              <label>Años de experiencia<input name="anios" type="number" min="0" max="60" step="1" inputmode="numeric" value="${esc(p.anios)}"></label>
            </div>
          </section>
          ${AREAS.map(areaHTML).join('')}
          <section class="panel">
            <h2>Para terminar</h2>
            ${ABIERTAS.map((q) => `<label>${esc(q.pregunta)}<textarea name="a-${q.id}" rows="3" maxlength="2000">${esc(op.abiertas[q.id] ?? '')}</textarea></label>`).join('')}
          </section>
        </form>
        <section class="panel">
          <p class="mensaje" id="opinion-faltan" role="alert"></p>
          <div class="acciones"><button type="button" class="primario" id="opinion-descargar">Descargar mis respuestas (CSV)</button></div>
          <p class="ayuda">Cada fila lleva la versión y el commit de la plataforma que revisó.</p>
          <p class="ayuda"><button type="button" id="opinion-borrar">Borrar mis respuestas de este dispositivo</button></p>
        </section>
      </div>`;
    enlazar();
  }

  function leerForm() {
    const form = app.querySelector('#opinion');
    for (const k of ['iniciales', 'profesion', 'anios']) op.perfil[k] = form.elements[k].value;
    for (const a of AREAS) {
      const f = form.querySelector(`input[name="f-${a.id}"]:checked`)?.value;
      const g = form.querySelector(`input[name="g-${a.id}"]:checked`)?.value;
      op.areas[a.id] = { funciona: f, gravedad: g, cambiaria: form.elements[`c-${a.id}`].value };
      form.querySelector(`[data-gravedad="${a.id}"]`).hidden = !necesitaGravedad(f);
    }
    for (const q of ABIERTAS) op.abiertas[q.id] = form.elements[`a-${q.id}`].value;
  }

  function enlazar() {
    const form = app.querySelector('#opinion');
    form.oninput = form.onchange = () => {
      leerForm();
      guardado = almacen.escribir(op);
    };
    app.querySelector('#opinion-descargar').onclick = () => {
      leerForm();
      const falta = faltantes(op);
      const msg = app.querySelector('#opinion-faltan');
      if (falta.length) {
        msg.textContent = `Falta completar: ${falta.join('; ')}.`;
        return;
      }
      msg.textContent = '';
      const fecha = new Date().toISOString();
      download(nombreArchivoOpinion(op.perfil.iniciales, fecha), opinionCSV(op, { fecha, version: VERSION_APP, commit: versionActual().commit }), 'text/csv;charset=utf-8');
      msg.textContent = 'Se descargó el archivo. Envíelo por correo.';
    };
    const borrar = app.querySelector('#opinion-borrar');
    borrar.onclick = () => {
      if (borrar.dataset.confirmar !== '1') {
        borrar.dataset.confirmar = '1';
        borrar.textContent = 'Toque otra vez para confirmar el borrado';
        return;
      }
      Object.assign(op, nuevaOpinion());
      almacen.escribir(null);
      pintar();
    };
  }

  pintar();
}
