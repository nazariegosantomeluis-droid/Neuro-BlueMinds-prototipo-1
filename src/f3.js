// Formulario F3 de validez de contenido (#formulario). Cualquier experto lo llena desde este sitio,
// sin cuenta: las respuestas se guardan en su dispositivo y se descargan en un CSV que envía al
// coordinador. tools/unir-f3.mjs une los archivos y calcula los índices.
import { esc, navHTML } from './paginas.js';
import { download, VERSION_APP } from './engine/logger.js';
import {
  ACTIVIDADES_F3, MECANICA, GENERALES, ESCALA, DISCIPLINAS, ANIOS, AMBITOS, SI_NO, PROBLEMAS,
  nuevaRespuesta, preguntas, faltantes, f3CSV, nombreArchivoF3, normalizarCodigo,
} from './f3-datos.js';

const CLAVE = 'nbm.f3.respuesta';
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
      localStorage.setItem(CLAVE, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};

const radios = (name, actual) =>
  `<div class="f3-escala" role="radiogroup">${ESCALA.map(
    (t, k) => `<label><input type="radio" name="${esc(name)}" value="${k + 1}" ${actual === k + 1 ? 'checked' : ''}><span>${esc(t)}</span></label>`,
  ).join('')}</div>`;

const opciones = (lista, actual) => `<option value="">—</option>${lista.map((o) => `<option ${o === actual ? 'selected' : ''}>${esc(o)}</option>`).join('')}`;

export function renderF3(app, { fichas, items }) {
  const guardada = almacen.leer();
  const resp = Object.assign(nuevaRespuesta(), guardada ?? {});
  resp.perfil = Object.assign(nuevaRespuesta().perfil, guardada?.perfil ?? {});
  const codigos = new Set(items.map((i) => i.codigo));
  let guardado = true;

  const actividadHTML = (a, n) => {
    const f = fichas[a];
    if (!f) return `<section class="panel"><p class="mensaje">No se pudo cargar la ficha de ${a}.</p></section>`;
    return `
      <section class="panel f3-actividad">
        <p class="meta">Actividad ${n} de 3 · ${esc(a)}</p>
        <h2>${esc(f.nombre)}</h2>
        <dl class="f3-ficha">
          <dt>Objetivo</dt><dd>${esc(f.objetivo)}</dd>
          <dt>Mecánica</dt><dd>${esc(MECANICA[a])}</dd>
          <dt>Bandas</dt><dd>${f.bandas.map((b) => `${esc(b.id)}: ${esc(b.descripcion)}`).join('<br>')}</dd>
        </dl>
        <p class="acciones"><a href="#galeria?actividad=${esc(a)}" target="_blank" rel="noopener">Ver sus ítems en la galería</a> · <a href="#inicio" target="_blank" rel="noopener">Probar la actividad</a></p>
        ${preguntas(a, f)
          .map(
            (q) => `
          <fieldset class="f3-pregunta ${q.decide ? 'f3-decide' : ''}">
            <legend><strong>${esc(q.nombre)}</strong>${q.decide ? ' <span class="etiqueta">decide si la actividad se mantiene</span>' : ''}<br><span class="ayuda">${esc(q.pregunta)}</span></legend>
            ${radios(q.clave, resp.calificaciones[q.clave])}
          </fieldset>`,
          )
          .join('')}
        <label>Comentarios sobre ${esc(f.nombre)} (opcional)
          <textarea name="com-${esc(a)}" rows="3" maxlength="1500" placeholder="Qué corregiría, qué falta, qué no recomendaría">${esc(resp.comentarios[a] ?? '')}</textarea>
        </label>
      </section>`;
  };

  const itemHTML = (it, k) => `
    <div class="f3-item" data-k="${k}">
      <label>Código<input name="cod-${k}" list="f3-codigos" maxlength="16" autocomplete="off" spellcheck="false" placeholder="ACT02-B3-07" value="${esc(it.codigo ?? '')}"></label>
      <label>Problema<select name="prob-${k}">${opciones(PROBLEMAS, it.problema)}</select></label>
      <label>Qué propone<input name="sug-${k}" maxlength="300" value="${esc(it.sugerencia ?? '')}"></label>
      <button type="button" data-quitar="${k}">Quitar</button>
      <p class="mensaje" data-aviso="${k}" role="alert"></p>
    </div>`;

  function pintar() {
    const p = resp.perfil;
    app.innerHTML = `
      <div class="adulto f3">
        ${navHTML('formulario')}
        <h1>Formulario F3 · Validez de contenido</h1>
        <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
        <section class="panel">
          <p>Gracias por revisar las tres actividades que usará el estudio piloto. Para cada una, lea su descripción, recórrala en el prototipo o en la galería y califíquela aquí. Toma de 45 a 60 minutos.</p>
          <p>Sus respuestas se guardan en este dispositivo mientras las llena; puede cerrar la página y volver. <strong>Al terminar, descargue el archivo y envíelo por correo a <span class="f3-correo">${CORREO}</span>.</strong> Nada se envía a ningún servidor.</p>
          <p class="ayuda">Escala: 1 = nada, 2 = poco, 3 = bastante, 4 = mucho. Solo la relevancia decide si una actividad se mantiene; las demás preguntas indican qué corregir.</p>
        </section>
        ${guardado ? '' : '<p class="mensaje" role="alert">Este navegador no deja guardar el avance. No cierre la página antes de descargar el archivo.</p>'}
        <form id="f3" novalidate>
          <section class="panel">
            <h2>Sus datos profesionales</h2>
            <p class="ayuda">En los informes solo aparecen su disciplina y sus años de experiencia.</p>
            <div class="f3-grid">
              <label>Nombre completo<input name="nombre" autocomplete="name" maxlength="80" value="${esc(p.nombre)}"></label>
              <label>Disciplina<select name="disciplina">${opciones(DISCIPLINAS, p.disciplina)}</select></label>
              <label>Años de experiencia con niños autistas de 4 a 10 años<select name="anios">${opciones(ANIOS, p.anios)}</select></label>
              <label>Ámbito principal de trabajo<select name="ambito">${opciones(AMBITOS, p.ambito)}</select></label>
              <label>Ciudad y estado<input name="ciudad" maxlength="60" placeholder="Ej. Zapopan, Jalisco" value="${esc(p.ciudad)}"></label>
              <label>¿Participará como terapeuta, evaluador o investigador en el estudio piloto?<select name="piloto">${opciones(SI_NO, p.piloto)}</select></label>
              <label>¿Tiene un hijo o familiar directo que podría participar en el piloto, o en el equipo del proyecto?<select name="familiar">${opciones(SI_NO.slice(0, 2), p.familiar)}</select></label>
            </div>
            <label class="casilla"><input type="checkbox" name="consentimiento" ${p.consentimiento ? 'checked' : ''}> Acepto que mis calificaciones y comentarios se usen, sin mi nombre, en los documentos del proyecto y en los que se presenten a un comité de ética.</label>
            <label class="casilla"><input type="checkbox" name="agradecimientos" ${p.agradecimientos ? 'checked' : ''}> Autorizo que mi nombre aparezca en la sección de agradecimientos.</label>
          </section>
          ${ACTIVIDADES_F3.map((a, k) => actividadHTML(a, k + 1)).join('')}
          <section class="panel">
            <h2>Ítems con algún problema</h2>
            <p class="ayuda">Cada ítem tiene un código visible en la galería, por ejemplo ACT02-B3-07 (actividad, banda y número). Agregue los que deban cambiarse. Si ninguno tiene problemas, deje esta sección vacía.</p>
            <datalist id="f3-codigos">${[...codigos].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
            <div id="f3-items">${resp.items.map(itemHTML).join('')}</div>
            <div class="acciones"><button type="button" id="f3-agregar">Agregar un ítem</button></div>
          </section>
          <section class="panel">
            <h2>Valoración general</h2>
            ${GENERALES.map((g) => `<fieldset class="f3-pregunta"><legend>${esc(g.pregunta)}</legend>${radios(`gen-${g.id}`, resp.generales[g.id])}</fieldset>`).join('')}
            <label>¿Qué cambiaría o agregaría al conjunto? (opcional)<textarea name="comentarioGeneral" rows="3" maxlength="1500">${esc(resp.comentarioGeneral)}</textarea></label>
            <label>Minutos que le tomó la revisión (opcional)<input name="minutos" type="number" min="5" max="300" inputmode="numeric" value="${esc(resp.minutos)}"></label>
          </section>
        </form>
        <section class="panel">
          <p class="mensaje" id="f3-faltan" role="alert"></p>
          <div class="acciones">
            <button type="button" class="primario" id="f3-descargar">Descargar mis respuestas (CSV)</button>
            <button type="button" id="f3-copiar">Copiar mis respuestas</button>
          </div>
          <p class="ayuda">Envíe el archivo descargado a <span class="f3-correo">${CORREO}</span>. Si no puede descargarlo, use «Copiar mis respuestas» y pegue el texto en el correo.</p>
          <textarea id="f3-texto" rows="6" readonly hidden></textarea>
          <p class="ayuda"><button type="button" id="f3-borrar">Borrar mis respuestas de este dispositivo</button></p>
        </section>
      </div>`;
    enlazar();
  }

  function leerForm() {
    const form = app.querySelector('#f3');
    const p = resp.perfil;
    for (const k of ['nombre', 'disciplina', 'anios', 'ambito', 'ciudad', 'piloto', 'familiar']) p[k] = form.elements[k].value;
    p.consentimiento = form.elements.consentimiento.checked;
    p.agradecimientos = form.elements.agradecimientos.checked;
    for (const a of ACTIVIDADES_F3) {
      for (const q of preguntas(a, fichas[a])) {
        const v = form.querySelector(`input[name="${q.clave}"]:checked`);
        if (v) resp.calificaciones[q.clave] = Number(v.value);
        else delete resp.calificaciones[q.clave];
      }
      resp.comentarios[a] = form.elements[`com-${a}`]?.value ?? '';
    }
    resp.items = [...form.querySelectorAll('.f3-item')].map((d) => {
      const k = d.dataset.k;
      return { codigo: form.elements[`cod-${k}`].value, problema: form.elements[`prob-${k}`].value, sugerencia: form.elements[`sug-${k}`].value };
    });
    for (const g of GENERALES) {
      const v = form.querySelector(`input[name="gen-${g.id}"]:checked`);
      if (v) resp.generales[g.id] = Number(v.value);
    }
    resp.comentarioGeneral = form.elements.comentarioGeneral.value;
    resp.minutos = form.elements.minutos.value;
  }

  function avisarCodigos() {
    for (const d of app.querySelectorAll('.f3-item')) {
      const k = d.dataset.k;
      const c = normalizarCodigo(app.querySelector(`[name="cod-${k}"]`).value);
      app.querySelector(`[data-aviso="${k}"]`).textContent = c && !codigos.has(c) ? 'No encontramos ese código en la galería; revíselo.' : '';
    }
  }

  function enlazar() {
    const form = app.querySelector('#f3');
    form.oninput = form.onchange = () => {
      leerForm();
      guardado = almacen.escribir(resp);
      avisarCodigos();
    };
    app.querySelector('#f3-agregar').onclick = () => {
      leerForm();
      resp.items.push({ codigo: '', problema: '', sugerencia: '' });
      almacen.escribir(resp);
      pintar();
      app.querySelector(`[name="cod-${resp.items.length - 1}"]`)?.focus();
    };
    app.querySelector('#f3-items').onclick = (e) => {
      const k = e.target.dataset?.quitar;
      if (k === undefined) return;
      leerForm();
      resp.items.splice(Number(k), 1);
      almacen.escribir(resp);
      pintar();
    };
    const exportar = () => {
      leerForm();
      const falta = faltantes(resp, fichas);
      const msg = app.querySelector('#f3-faltan');
      if (falta.length) {
        msg.textContent = `Falta completar: ${falta.join(', ')}.`;
        return null;
      }
      msg.textContent = '';
      const fecha = new Date().toISOString();
      return { fecha, csv: f3CSV(resp, fichas, { fecha, version: VERSION_APP }) };
    };
    app.querySelector('#f3-descargar').onclick = () => {
      const r = exportar();
      if (r) download(nombreArchivoF3(resp.perfil.nombre, r.fecha), r.csv, 'text/csv;charset=utf-8');
    };
    app.querySelector('#f3-copiar').onclick = async () => {
      const r = exportar();
      if (!r) return;
      const caja = app.querySelector('#f3-texto');
      caja.value = r.csv.replace(/^﻿/, '');
      caja.hidden = false;
      try {
        await navigator.clipboard.writeText(caja.value);
        app.querySelector('#f3-faltan').textContent = 'Copiado. Péguelo en un correo.';
      } catch {
        caja.focus();
        caja.select();
        app.querySelector('#f3-faltan').textContent = 'Seleccione el texto de abajo y cópielo.';
      }
    };
    const borrar = app.querySelector('#f3-borrar');
    borrar.onclick = () => {
      if (borrar.dataset.confirmar !== '1') {
        borrar.dataset.confirmar = '1';
        borrar.textContent = 'Toque otra vez para confirmar el borrado';
        return;
      }
      Object.assign(resp, nuevaRespuesta());
      almacen.escribir(null);
      pintar();
    };
  }

  pintar();
}
