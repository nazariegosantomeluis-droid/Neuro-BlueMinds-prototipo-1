// Páginas para el adulto y el panel de expertos: galería de ítems y créditos.
import { figuraSVG, simboloSVG, nombreFigura } from './activities/cambia-regla.js';

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const navHTML = (actual) => `
  <nav class="nav">
    ${[['inicio', 'Inicio'], ['galeria', 'Galería de ítems'], ['creditos', 'Créditos y licencias']]
      .map(([id, label]) => `<a href="#${id}" ${id === actual ? 'aria-current="page"' : ''}>${label}</a>`)
      .join('')}
  </nav>`;

const AVISO = '<p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>';

// ---------- Galería ----------

// Filtros en el enlace: #galeria?actividad=ACT-02&banda=B3&todos=1&pareja=1
export function renderGaleria(app, { items, fichas, conceptos }, params) {
  const ids = Object.keys(fichas);
  const actividad = ids.includes(params.get('actividad')) ? params.get('actividad') : ids.includes('ACT-02') ? 'ACT-02' : ids[0];
  const ficha = fichas[actividad];
  const banda = ficha.bandas.some((b) => b.id === params.get('banda')) ? params.get('banda') : 'todas';
  const todos = params.get('todos') === '1';
  const pareja = ficha.parejas ? Number(params.get('pareja')) % ficha.parejas.length || 0 : 0;
  const nombre = new Map(conceptos.map((c) => [c.id, c]));
  const deActividad = items.filter((i) => i.actividad === actividad && (banda === 'todas' || i.banda === banda));
  const visibles = deActividad.filter((i) => todos || i.muestraExpertos);
  const revisada = ficha.revisionClinica.revisor && ficha.revisionClinica.fecha;

  app.innerHTML = `
    <div class="adulto ancho">
      ${navHTML('galeria')}
      <h1>Galería de ítems</h1>
      ${AVISO}
      <form class="panel filtros" id="filtros">
        <label>Actividad
          <select name="actividad">${ids.map((id) => `<option value="${id}" ${id === actividad ? 'selected' : ''}>${id} · ${esc(fichas[id].nombre)}</option>`).join('')}</select>
        </label>
        <label>Banda
          <select name="banda">
            <option value="todas">Todas</option>
            ${ficha.bandas.map((b) => `<option value="${b.id}" ${b.id === banda ? 'selected' : ''}>${b.id} · ${esc(b.descripcion)}</option>`).join('')}
          </select>
        </label>
        ${
          ficha.parejas
            ? `<label>Pareja de cajas
                <select name="pareja">${ficha.parejas.map((p, k) => `<option value="${k}" ${k === pareja ? 'selected' : ''}>${p.map((c) => nombreFigura(c.forma, c.color)).join(' y ')}</option>`).join('')}</select>
              </label>`
            : ''
        }
        <label class="casilla"><input type="checkbox" name="todos" value="1" ${todos ? 'checked' : ''}> Mostrar todos los ítems, no solo la muestra para expertos</label>
      </form>
      <details class="panel ficha">
        <summary>Ficha técnica de ${esc(ficha.id)} (versión ${esc(ficha.version)}) · ${revisada ? `revisada por ${esc(ficha.revisionClinica.revisor)}, ${esc(ficha.revisionClinica.fecha)}` : 'sin revisión clínica'}</summary>
        ${fichaHTML(ficha)}
      </details>
      <p class="meta">Mostrando ${visibles.length} de ${deActividad.length} ítems${todos ? '' : ' (solo la muestra para expertos)'}.</p>
      <div class="galeria">
        ${visibles.map((it) => (it.ensayos ? secuenciaHTML(it, ficha.parejas[pareja]) : itemHTML(it, nombre))).join('')}
      </div>
    </div>`;

  const form = app.querySelector('#filtros');
  form.onchange = () => {
    const p = new URLSearchParams();
    for (const [k, v] of new FormData(form)) p.set(k, v);
    if (form.actividad.value !== actividad) p.delete('banda');
    location.hash = `#galeria?${p}`;
  };
}

function fichaHTML(f) {
  const lista = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `
    <dl>
      <dt>Objetivo</dt><dd>${esc(f.objetivo)}</dd>
      <dt>Paradigma</dt><dd>${esc(f.paradigma)}</dd>
      ${f.fases ? `<dt>Fases</dt><dd>${esc(f.fases)}</dd>` : ''}
      <dt>Bandas</dt><dd>${lista(f.bandas.map((b) => `${b.id}: ${b.descripcion}`))}</dd>
      <dt>Lecturas permitidas</dt><dd>${lista(f.lecturasPermitidas)}</dd>
      <dt>Lecturas no permitidas</dt><dd>${lista(f.lecturasNoPermitidas)}</dd>
      <dt>Contraindicaciones</dt><dd>${lista(f.contraindicaciones)}</dd>
      <dt>Tiempos</dt><dd>Intervalo ${f.intervaloMs} ms · consigna V ${f.consignaVMs} ms · límite de respuesta ${f.limiteRespuestaMs} ms · retroalimentación ${f.retroalimentacionMs} ms</dd>
    </dl>`;
}

const estadoHTML = (it) => `
  ${it.muestraExpertos ? '<span class="etiqueta">Muestra</span>' : ''}
  <span class="etiqueta ${it.revisionPendiente ? 'pendiente' : ''}">${it.revisionPendiente ? 'Revisión pendiente' : 'Sin pendientes'}</span>`;

const motivosHTML = (it) =>
  it.motivosRevision.length ? `<ul class="motivos">${it.motivosRevision.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '';

function itemHTML(it, nombre) {
  const c = nombre.get(it.concepto);
  const consigna = it.consigna.tipo === 'pictograma' ? 'Pictograma' : 'Muestra';
  return `
    <article class="item">
      <header><strong>${esc(it.codigo)}</strong> ${estadoHTML(it)}</header>
      <div class="item-consigna">
        <img src="${esc(it.consigna.src)}" alt="" loading="lazy">
        <p>${consigna}: <strong>${esc(c.articulo)} ${esc(c.nombre)}</strong>${it.mitad ? ` · mitad ${it.mitad}` : ''}<br>
           <span class="ayuda">Voz en AV: «${esc(it.consigna.texto)}»</span></p>
      </div>
      <ul class="item-opciones">
        ${it.opciones
          .map((o) => {
            const oc = nombre.get(o.concepto);
            return `<li class="${o.correcta ? 'correcta' : ''}">
              <img src="${esc(o.src)}" alt="" loading="lazy">
              <span>${esc(oc.nombre)} · ej. ${o.ejemplar}${o.correcta ? ' · <strong>correcta</strong>' : ''}</span>
            </li>`;
          })
          .join('')}
      </ul>
      ${motivosHTML(it)}
    </article>`;
}

function secuenciaHTML(it, pareja) {
  return `
    <article class="item">
      <header><strong>${esc(it.codigo)}</strong> <span class="meta">${esc(it.tipo)}</span> ${estadoHTML(it)}</header>
      <ol class="secuencia">
        ${it.ensayos
          .map((e) => {
            const tarjeta = { forma: pareja[e.tarjeta.forma - 1].forma, color: pareja[e.tarjeta.color - 1].color };
            return `<li>
              <span class="cod">${esc(e.codigo.slice(-5))}</span>
              <span class="mini">${simboloSVG(e.regla, tarjeta.forma)}</span>
              <span class="mini tarjeta-mini">${figuraSVG(tarjeta.forma, tarjeta.color)}</span>
              <span class="mini-cajas">${pareja
                .map((c, k) => `<span class="mini caja-mini ${k + 1 === e.caja ? 'correcta' : ''}">${figuraSVG(c.forma, c.color)}</span>`)
                .join('')}</span>
              <span class="ayuda">por ${esc(e.regla)} · caja ${e.caja === 1 ? 'izquierda' : 'derecha'}</span>
            </li>`;
          })
          .join('')}
      </ol>
      ${motivosHTML(it)}
    </article>`;
}

// ---------- Créditos ----------

export function renderCreditos(app, { conceptos }) {
  app.innerHTML = `
    <div class="adulto">
      ${navHTML('creditos')}
      <h1>Créditos y licencias</h1>
      ${AVISO}
      <section class="panel">
        <h2>Pictogramas</h2>
        <p>Los pictogramas son de ARASAAC y se distribuyen bajo la licencia Creative Commons BY-NC-SA, que autoriza su uso sin fines de lucro citando la fuente y el autor, y obliga a compartir las obras derivadas con la misma licencia.</p>
        <blockquote>Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido creados por Sergio Palao para ARASAAC (http://www.arasaac.org), que los distribuye bajo Licencia Creative Commons BY-NC-SA.</blockquote>
        <blockquote>Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España)</blockquote>
        <details>
          <summary>Identificador de cada pictograma en ARASAAC</summary>
          <ul class="columnas">
            ${conceptos.map((c) => `<li>${esc(c.nombre)}: ${c.arasaac}</li>`).join('')}
            <li>fin de bloque («terminar»): 5358</li>
          </ul>
        </details>
      </section>
      <section class="panel">
        <h2>Fotografías y audio</h2>
        <p>Las imágenes de los ejemplares son marcadores provisionales. Se reemplazarán por fotografías reales con licencia libre. Mientras no haya archivos de audio, las consignas usan la voz del navegador. El origen y la licencia de cada archivo están en <a href="items/licencias.csv">items/licencias.csv</a>.</p>
      </section>
      <section class="panel">
        <h2>Aplicación</h2>
        <p>© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.</p>
        <p>Incluye el código, las fichas técnicas, el banco de ítems y las figuras de la actividad «Cambia la regla». No incluye los pictogramas de ARASAAC, que conservan su propia licencia.</p>
      </section>
    </div>`;
}
