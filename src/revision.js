// Revisión clínica de ítems (#revision). Dos clínicos califican la muestra para expertos antes
// del panel (Catálogo, 5.4). El avance se guarda solo en este dispositivo, por revisor.
import { esc, navHTML } from './paginas.js';
import { figuraSVG, simboloSVG, nombreFigura } from './activities/cambia-regla.js';
import { download, VERSION_APP } from './engine/logger.js';
import {
  PROFESIONES, ESTADOS, PROBLEMAS, DECISIONES, FIGURAS, CAMBIAR_SHORT,
  itemsDeRevision, normalizarIniciales, nuevaRevision, calificado, faltantes, revisionCSV, nombreArchivo,
} from './revision-datos.js';

const ACTUAL = 'nbm.revision.actual';
const clave = (iniciales) => `nbm.revision.${iniciales}`;
const AVISO = '<p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>';

// localStorage puede estar bloqueado o lleno: entonces el avance solo vive en esta página.
const almacen = {
  leer(k) {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  },
  escribir(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};

export function renderRevision(app, { items, conceptos, fichas }) {
  const lista = itemsDeRevision(items);
  const paginas = [...lista.map((i) => i.codigo), FIGURAS, 'FINAL'];
  const total = paginas.length - 1; // tarjetas que se califican
  const nombre = new Map(conceptos.map((c) => [c.id, c]));
  const formas = [...new Set((fichas['ACT-07']?.parejas ?? []).flat().map((c) => c.forma))];
  const actual = almacen.leer(ACTUAL);
  let rev = actual ? almacen.leer(clave(actual)) : null;
  let guardado = true;

  const guardar = () => (guardado = almacen.escribir(clave(rev.revisor.iniciales), rev));
  const hechas = () => paginas.slice(0, total).filter((p) => calificado(rev, p)).length;

  if (rev) pagina();
  else entrar();

  // ---------- Revisor ----------

  function entrar(msg = '') {
    app.innerHTML = `
      <div class="adulto rev">
        ${navHTML('revision')}
        <h1>Revisión clínica de ítems</h1>
        ${AVISO}
        <form class="panel" id="rev-entrar" novalidate>
          <p>Califica uno por uno los ${lista.length} ítems de la muestra para expertos de ACT-01 y ACT-02, las figuras de ACT-07 y tres decisiones pendientes. El avance se guarda en este dispositivo para continuar después. Nada se envía a ningún servidor.</p>
          <label>Iniciales
            <input name="iniciales" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
            <span class="ayuda">Con las mismas iniciales se continúa una revisión empezada en este dispositivo.</span>
          </label>
          <label>Profesión
            <select name="profesion" required>
              <option value="">—</option>
              ${PROFESIONES.map((p) => `<option>${esc(p)}</option>`).join('')}
            </select>
          </label>
          <p class="mensaje" role="alert">${esc(msg)}</p>
          <div class="acciones"><button type="submit" class="primario">Empezar o continuar</button></div>
        </form>
      </div>`;
    const form = app.querySelector('#rev-entrar');
    form.onsubmit = (e) => {
      e.preventDefault();
      const iniciales = normalizarIniciales(form.iniciales.value);
      const profesion = form.profesion.value;
      if (iniciales.length < 2 || !profesion) return entrar('Escribe tus iniciales (al menos dos letras) y elige tu profesión.');
      rev = almacen.leer(clave(iniciales)) ?? nuevaRevision(iniciales, profesion);
      rev.revisor.profesion = profesion;
      almacen.escribir(ACTUAL, iniciales);
      guardar();
      pagina();
    };
  }

  // ---------- Páginas ----------

  function encabezado() {
    return `
      ${navHTML('revision')}
      <h1>Revisión clínica de ítems</h1>
      ${AVISO}
      <div class="rev-revisor">
        <p class="meta">Revisor: <strong>${esc(rev.revisor.iniciales)}</strong> · ${esc(rev.revisor.profesion)}</p>
        <button type="button" id="rev-cambiar">Cambiar de revisor</button>
      </div>
      ${guardado ? '' : '<p class="mensaje" role="alert">No se pudo guardar el avance en este dispositivo. Descarga la revisión antes de cerrar esta página.</p>'}
      <div class="rev-avance">
        <progress max="${total}" value="${hechas()}" aria-label="Avance de la revisión"></progress>
        <p class="meta" id="rev-cuenta"></p>
        <label class="casilla"><input type="checkbox" id="rev-pendientes" ${rev.soloPendientes ? 'checked' : ''}> Ver solo los pendientes</label>
      </div>`;
  }

  function cuenta() {
    const lugar = rev.pos < total ? `${rev.pos + 1} de ${total}` : 'Decisiones finales';
    app.querySelector('#rev-cuenta').textContent = `${lugar} · ${hechas()} de ${total} calificados`;
    app.querySelector('.rev-avance progress').value = hechas();
  }

  function pagina() {
    const id = paginas[rev.pos] ?? 'FINAL';
    if (id === 'FINAL') final();
    else tarjeta(id);
    cuenta();
    app.querySelector('#rev-cambiar').onclick = () => {
      almacen.escribir(ACTUAL, null);
      rev = null;
      entrar();
    };
    app.querySelector('#rev-pendientes').onchange = (e) => {
      rev.soloPendientes = e.target.checked;
      guardar();
    };
    app.querySelector('#rev-anterior').onclick = () => mover(-1);
    app.querySelector('#rev-siguiente')?.addEventListener('click', () => mover(1));
    scrollTo(0, 0);
  }

  // Con «Ver solo los pendientes», salta las tarjetas ya calificadas. La página final siempre se alcanza.
  function mover(paso) {
    let p = Math.min(rev.pos, total) + paso;
    if (rev.soloPendientes) while (p >= 0 && p < total && calificado(rev, paginas[p])) p += paso;
    if (p < 0) return;
    rev.pos = Math.min(p, total);
    guardar();
    pagina();
  }

  function tarjeta(id) {
    const c = rev.calificaciones[id] ?? {};
    const it = lista.find((i) => i.codigo === id);
    const conProblemas = c.estado === 'Corregir' || c.estado === 'Retirar';
    app.innerHTML = `
      <div class="adulto rev">
        ${encabezado()}
        ${it ? itemHTML(it) : figurasHTML()}
        <form class="panel" id="rev-calificacion">
          <fieldset>
            <legend>Estado (obligatorio)</legend>
            ${ESTADOS.map((e) => `<label><input type="radio" name="estado" value="${e}" ${c.estado === e ? 'checked' : ''}> ${e}</label>`).join('')}
          </fieldset>
          <fieldset name="tipos" ${conProblemas ? '' : 'disabled'}>
            <legend>Tipo de problema, si es Corregir o Retirar (puedes elegir varios)</legend>
            ${PROBLEMAS.map((p) => `<label><input type="checkbox" name="problema" value="${esc(p)}" ${c.problemas?.includes(p) ? 'checked' : ''}> ${esc(p)}</label>`).join('')}
          </fieldset>
          <label>Comentario (opcional)
            <textarea name="comentario" rows="3" maxlength="500">${esc(c.comentario ?? '')}</textarea>
          </label>
        </form>
        <div class="acciones">
          <button type="button" id="rev-anterior" ${rev.pos === 0 ? 'disabled' : ''}>Anterior</button>
          <button type="button" class="primario" id="rev-siguiente">Siguiente</button>
        </div>
      </div>`;
    const form = app.querySelector('#rev-calificacion');
    form.oninput = form.onchange = () => {
      const estado = form.estado.value || undefined;
      rev.calificaciones[id] = {
        estado,
        problemas: [...form.querySelectorAll('[name=problema]:checked')].map((x) => x.value),
        comentario: form.comentario.value.trim(),
      };
      form.elements.tipos.disabled = estado !== 'Corregir' && estado !== 'Retirar';
      guardar();
      cuenta();
    };
  }

  // Como en la galería: consigna, opciones y la correcta marcada.
  function itemHTML(it) {
    const c = nombre.get(it.concepto);
    const etiqueta = (o) => `${nombre.get(o.concepto)?.nombre ?? o.concepto}, ejemplar ${o.ejemplar}`;
    return `
      <article class="panel rev-item">
        <header>
          <strong>${esc(it.codigo)}</strong>
          <span class="meta">${esc(it.actividad)} · banda ${esc(it.banda)} · concepto: <strong>${esc(c ? `${c.articulo} ${c.nombre}` : it.concepto)}</strong></span>
        </header>
        <div class="rev-consigna">
          <img src="${esc(it.consigna.src)}" alt="${esc(c?.nombre ?? it.concepto)}">
          <p>${it.consigna.tipo === 'pictograma' ? 'Pictograma' : 'Muestra'}<br><span class="ayuda">Voz en AV: «${esc(it.consigna.texto)}»</span></p>
        </div>
        <ul class="rev-opciones">
          ${it.opciones
            .map((o) => `<li class="${o.correcta ? 'rev-correcta' : ''}"><img src="${esc(o.src)}" alt="${esc(etiqueta(o))}"><span>${esc(etiqueta(o))}${o.correcta ? ' · <strong>correcta</strong>' : ''}</span></li>`)
            .join('')}
        </ul>
        ${it.motivosRevision?.length ? `<ul class="ayuda">${it.motivosRevision.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      </article>`;
  }

  function figurasHTML() {
    if (!formas.length) return '<p class="mensaje">No se pudo cargar la ficha de ACT-07.</p>';
    const fig = (svg) => `<span class="rev-fig">${svg}</span>`;
    return `
      <article class="panel rev-item">
        <header><strong>${FIGURAS}</strong> <span class="meta">ACT-07 · figuras y símbolos de la regla</span></header>
        <p>¿Las figuras y los símbolos son reconocibles y se distinguen sin dudar?</p>
        <div class="rev-figuras">
          ${formas
            .map((f) => `<figure><div class="rev-par">${fig(figuraSVG(f, 'azul'))}${fig(figuraSVG(f, 'amarillo'))}</div><figcaption>${esc(nombreFigura(f, 'azul'))} y ${esc(nombreFigura(f, 'amarillo'))}</figcaption></figure>`)
            .join('')}
        </div>
        <h2>Símbolos de la regla</h2>
        <div class="rev-figuras">
          <figure>${fig(simboloSVG('color'))}<figcaption>Por color</figcaption></figure>
          <figure><div class="rev-par">${formas.map((f) => fig(simboloSVG('forma', f))).join('')}</div><figcaption>Por forma: la silueta gris de la figura de la tarjeta</figcaption></figure>
        </div>
      </article>`;
  }

  function final() {
    const d = rev.decisiones;
    app.innerHTML = `
      <div class="adulto rev">
        ${encabezado()}
        <form class="panel" id="rev-final">
          <h2>Decisiones</h2>
          ${DECISIONES.map(
            (x) => `
            <div class="rev-decision">
              <img src="assets/picto/${x.concepto}.png" alt="Pictograma actual de ${esc(x.concepto)}">
              <fieldset>
                <legend>${esc(x.pregunta)}</legend>
                ${x.opciones.map((o) => `<label><input type="radio" name="${x.clave}" value="${esc(o)}" ${d[x.clave] === o ? 'checked' : ''}> ${esc(o)}</label>`).join('')}
              </fieldset>
            </div>`,
          ).join('')}
          <label>¿Por cuál prenda cambiar el short?
            <input name="shortCual" maxlength="40" autocomplete="off" value="${esc(d.shortCual ?? '')}" ${d.short === CAMBIAR_SHORT ? '' : 'disabled'}>
          </label>
          <label>Comentario general (opcional)
            <textarea name="comentarioGeneral" rows="4" maxlength="1000">${esc(rev.comentarioGeneral)}</textarea>
          </label>
        </form>
        <div class="panel">
          <p class="mensaje" id="rev-faltan" role="alert"></p>
          <div class="acciones">
            <button type="button" id="rev-anterior">Anterior</button>
            <button type="button" class="primario" id="rev-descargar">Descargar revisión (CSV)</button>
          </div>
        </div>
      </div>`;
    const form = app.querySelector('#rev-final');
    form.oninput = form.onchange = () => {
      for (const x of DECISIONES) d[x.clave] = form[x.clave].value || undefined;
      d.shortCual = form.shortCual.value.trim();
      form.shortCual.disabled = d.short !== CAMBIAR_SHORT;
      rev.comentarioGeneral = form.comentarioGeneral.value.trim();
      guardar();
    };
    app.querySelector('#rev-descargar').onclick = () => {
      const f = faltantes(rev, lista);
      const msg = app.querySelector('#rev-faltan');
      if (f.sinEstado.length || f.decisiones.length) {
        const partes = [
          f.sinEstado.length ? `${f.sinEstado.length} ${f.sinEstado.length === 1 ? 'tarjeta' : 'tarjetas'} sin estado` : '',
          f.decisiones.length ? `las decisiones: ${f.decisiones.map((x) => x.pregunta).join('; ')}` : '',
        ].filter(Boolean);
        msg.textContent = `Falta calificar ${partes.join(' y ')}. Usa «Ver solo los pendientes» y «Anterior» para encontrarlas.`;
        return;
      }
      msg.textContent = '';
      const fecha = new Date().toISOString();
      download(nombreArchivo(rev.revisor.iniciales, fecha), revisionCSV(rev, lista, { fecha, version: VERSION_APP }), 'text/csv;charset=utf-8');
    };
  }
}
