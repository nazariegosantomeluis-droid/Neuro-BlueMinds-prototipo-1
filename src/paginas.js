// Páginas para el adulto y el panel de expertos: galería de ítems y créditos.
import { figuraSVG, simboloSVG, nombreFigura } from './activities/cambia-regla.js';
import { PANTALLAS, esPiloto } from './catalogo.js';
import { esc } from './html.js';
import { ETIQUETAS_REVISION, revisadaClinicamente, filtrarPorEstado, notasDe, textoFiguras } from './revision-estado.js';

export { esc };

// Isotipo y logotipo de AutiPal: versión positiva en tema claro e invertida (blanca) en tema
// oscuro, las versiones autorizadas por el Manual de marca. El nombre se muestra con el
// logotipo oficial (letra More Sugar), no con texto. Solo en las pantallas del adulto.
const FIRMA = `
  <span class="marca-firma">
    <picture class="marca-logo">
      <source srcset="assets/marca/isotipo-invertido.svg" media="(prefers-color-scheme: dark)">
      <img src="assets/marca/isotipo.svg" alt="" width="40" height="40">
    </picture>
    <picture class="marca-logotipo">
      <source srcset="assets/marca/logotipo-invertido.svg" media="(prefers-color-scheme: dark)">
      <img src="assets/marca/logotipo.svg" alt="AutiPal" width="101" height="28">
    </picture>
  </span>`;

// Encabezado del adulto: isotipo, logotipo y la etiqueta del prototipo. En el inicio lleva
// además la línea que describe la herramienta.
export const marcaHTML = (inicio = false) => `
  <header class="marca">
    ${FIRMA}
    <span class="marca-etiqueta">Prototipo E13</span>
    ${inicio ? '<p class="marca-linea">Herramienta de apoyo y medición para el terapeuta</p>' : ''}
  </header>`;

// Título de cada pantalla con una línea que dice para qué sirve. Recibe texto ya escapado.
export const tituloHTML = (titulo, subtitulo = '') => `
  <div class="titulo-pagina">
    <h1>${titulo}</h1>
    ${subtitulo ? `<p class="subtitulo">${subtitulo}</p>` : ''}
  </div>`;

// «Saltar al contenido» lleva el foco al título de la pantalla (app.js lo atiende sin cambiar la ruta).
export const navHTML = (actual) => `
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  ${marcaHTML(actual === 'inicio')}
  <nav class="nav" aria-label="Secciones">
    ${[['inicio', 'Inicio'], ['galeria', 'Galería'], ['sesiones', 'Sesiones'], ['revision', 'Revisión'], ['formulario', 'Formulario F3'], ['calibracion', 'Calibración'], ['creditos', 'Créditos']]
      .map(([id, label]) => `<a href="#${id}" ${id === actual ? 'aria-current="page"' : ''}>${label}</a>`)
      .join('')}
  </nav>`;

const AVISO = '<p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>';

// ---------- Galería ----------

// La galería se vuelve a dibujar con cada filtro; el foco regresa al filtro que se cambió.
let focoFiltro = null;

// Filtros en el enlace: #galeria?actividad=ACT-02&banda=B3&todos=1&pareja=1&estado=retirado
export function renderGaleria(app, { items, fichas, conceptos, catalogo = [], revision }, params) {
  const ids = Object.keys(fichas).sort(); // ACT-01, ACT-02…, sin depender del orden de carga
  const posteriores = ids.filter((id) => !esPiloto(id));
  const actividad = ids.includes(params.get('actividad')) ? params.get('actividad') : ids.includes('ACT-02') ? 'ACT-02' : ids[0];
  const ficha = fichas[actividad];
  const banda = ficha.bandas.some((b) => b.id === params.get('banda')) ? params.get('banda') : 'todas';
  const todos = params.get('todos') === '1';
  const pareja = ficha.parejas ? Number(params.get('pareja')) % ficha.parejas.length || 0 : 0;
  const nombre = new Map(conceptos.map((c) => [c.id, c]));
  const deActividad = items.filter((i) => i.actividad === actividad && (banda === 'todas' || i.banda === banda));
  // Solo los ítems con imágenes del piloto llevan estado de revisión clínica (items/revision.json).
  const conEstado = deActividad.some((i) => i.estadoRevision);
  const estado = conEstado && params.get('estado') in ETIQUETAS_REVISION ? params.get('estado') : 'todos';
  const visibles = filtrarPorEstado(deActividad.filter((i) => todos || i.muestraExpertos), estado);
  const revisada = revisadaClinicamente(ficha);
  // Las tarjetas se agrupan por banda, en el orden de la ficha, y dentro de cada banda por código.
  const bandas = banda === 'todas' ? ficha.bandas : ficha.bandas.filter((b) => b.id === banda);
  // La etiqueta «Muestra» solo distingue algo cuando se ven todos los ítems.
  const mod = PANTALLAS[ficha.pantalla];
  const tarjeta = (it) =>
    it.ensayos
      ? secuenciaHTML(it, ficha.parejas[pareja], todos)
      : mod?.consignaHTML
        ? itemPosteriorHTML(it, { mod, ficha, nombre, todos })
        : itemHTML(it, nombre, todos, revision?.items?.[it.codigo]);
  const cuantos = (n) => (n === 1 ? '1 ítem' : `${n} ítems`);
  const conEseEstado = estado === 'todos' ? '' : ` con estado «${ETIQUETAS_REVISION[estado].toLowerCase()}»`;
  const bandaVacia = conEseEstado
    ? `No hay ítems${conEseEstado} en esta banda.`
    : 'No hay ítems de la muestra en esta banda. Marca «Mostrar todos los ítems» para ver el banco completo.';

  app.innerHTML = `
    <div class="adulto ancho">
      ${navHTML('galeria')}
      ${tituloHTML('Galería de ítems', 'Cada ítem con su código, la consigna, las opciones y la respuesta correcta marcada.')}
      <div id="enlace-f3"></div>
      ${AVISO}
      <form class="panel filtros" id="filtros">
        <fieldset class="chips">
          <legend>${posteriores.length ? 'Actividades del piloto' : 'Actividad'}</legend>
          ${ids.filter(esPiloto).map((id) => chipHTML('actividad', id, `${id} · ${fichas[id].nombre}`, id === actividad)).join('')}
        </fieldset>
        ${
          posteriores.length
            ? `<fieldset class="chips">
                <legend>En preparación: uso posterior</legend>
                ${posteriores.map((id) => chipHTML('actividad', id, `${id} · ${fichas[id].nombre}`, id === actividad)).join('')}
              </fieldset>`
            : ''
        }
        <fieldset class="chips">
          <legend>Banda</legend>
          ${chipHTML('banda', 'todas', 'Todas', banda === 'todas')}
          ${ficha.bandas.map((b) => chipHTML('banda', b.id, b.id, b.id === banda)).join('')}
        </fieldset>
        <p class="ayuda ayuda-banda">${banda === 'todas' ? 'Todas las bandas de la actividad, en orden.' : esc(bandas[0].descripcion)}</p>
        ${
          ficha.parejas
            ? `<label>Pareja de cajas
                <select name="pareja">${ficha.parejas.map((p, k) => `<option value="${k}" ${k === pareja ? 'selected' : ''}>${p.map((c) => nombreFigura(c.forma, c.color)).join(' y ')}</option>`).join('')}</select>
              </label>`
            : ''
        }
        ${
          conEstado
            ? `<label>Revisión clínica
                <select name="estado">
                  <option value="todos">Todos</option>
                  ${Object.entries(ETIQUETAS_REVISION).map(([k, v]) => `<option value="${k}" ${k === estado ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </label>`
            : ''
        }
        <label class="casilla"><input type="checkbox" name="todos" value="1" ${todos ? 'checked' : ''}> Mostrar todos los ítems, no solo la muestra para expertos</label>
      </form>
      ${esPiloto(ficha.id) ? '' : '<p class="nota-pantalla">Actividad de uso posterior: es un prototipo. No forma parte del piloto, del formulario F3 ni de la revisión clínica, y solo se abre en modo experto.</p>'}
      <details class="panel ficha">
        <summary>Ficha técnica de ${esc(ficha.id)} (versión ${esc(ficha.version)}) · ${revisada ? `revisada por ${esc(ficha.revisionClinica.revisor)}, ${esc(ficha.revisionClinica.fecha)}` : 'sin revisión clínica'}</summary>
        ${fichaHTML(ficha)}
      </details>
      ${catalogo.length > 3 ? catalogoHTML(catalogo) : ''}
      ${ficha.parejas ? `<p class="meta">${esc(textoFiguras(revision))}</p>` : ''}
      <p class="meta">Mostrando ${visibles.length} de ${deActividad.length} ítems${todos ? '' : ' (solo la muestra para expertos)'}${conEseEstado}.</p>
      ${bandas
        .map((b) => {
          const deBanda = visibles.filter((i) => i.banda === b.id);
          return `
            <section>
              <h2 class="banda-titulo">${esc(b.id)} <span class="meta">${esc(b.descripcion)} · ${cuantos(deBanda.length)}</span></h2>
              ${deBanda.length ? `<div class="galeria">${deBanda.map(tarjeta).join('')}</div>` : `<p class="vacio">${bandaVacia}</p>`}
            </section>`;
        })
        .join('')}
    </div>`;

  const form = app.querySelector('#filtros');
  form.onchange = (e) => {
    focoFiltro = e.target.name;
    const p = new URLSearchParams();
    for (const [k, v] of new FormData(form)) p.set(k, v);
    if (form.actividad.value !== actividad) p.delete('banda');
    location.hash = `#galeria?${p}`;
  };
  if (focoFiltro) {
    const nombreFiltro = focoFiltro;
    focoFiltro = null;
    (form.querySelector(`[name="${nombreFiltro}"]:checked`) ?? form.querySelector(`[name="${nombreFiltro}"]`))?.focus();
  }
}

function fichaHTML(f) {
  const lista = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `
    <dl>
      ${f.estado ? `<dt>Estado</dt><dd>${esc(f.estado)}</dd>` : ''}
      <dt>Objetivo</dt><dd>${esc(f.objetivo)}</dd>
      <dt>Paradigma</dt><dd>${esc(f.paradigma)}</dd>
      ${f.evidencia ? `<dt>Evidencia</dt><dd>${esc(f.evidencia)}</dd>` : ''}
      ${f.mecanica ? `<dt>Mecánica</dt><dd>${esc(f.mecanica)}</dd>` : ''}
      ${f.fases ? `<dt>Fases</dt><dd>${esc(f.fases)}</dd>` : ''}
      <dt>Bandas</dt><dd>${lista([...f.bandas.map((b) => `${b.id}: ${b.descripcion}`), ...(f.bandasPendientes ?? []).map((b) => `Sin prototipo. ${b}`)])}</dd>
      <dt>Lecturas permitidas</dt><dd>${lista(f.lecturasPermitidas)}</dd>
      <dt>Lecturas no permitidas</dt><dd>${lista(f.lecturasNoPermitidas)}</dd>
      <dt>Contraindicaciones</dt><dd>${lista(f.contraindicaciones)}</dd>
      <dt>Tiempos</dt><dd>Intervalo ${f.intervaloMs} ms · consigna V ${f.consignaVMs} ms · límite de respuesta ${f.limiteRespuestaMs} ms · retroalimentación ${f.retroalimentacionMs} ms</dd>
      ${f.notaPrototipo ? `<dt>Nota del prototipo</dt><dd>${esc(f.notaPrototipo)}</dd>` : ''}
    </dl>`;
}

// Las 17 actividades del Catálogo: cuáles son del piloto, cuáles tienen prototipo y qué falta en las demás.
function catalogoHTML(catalogo) {
  const con = catalogo.filter((a) => a.prototipo).length;
  return `
    <details class="panel ficha">
      <summary>Las ${catalogo.length} actividades del Catálogo · ${con} con prototipo</summary>
      <div class="tabla-ancha">
        <table class="catalogo">
          <thead><tr><th scope="col">Actividad</th><th scope="col">Paradigma</th><th scope="col">Estado</th><th scope="col">En este prototipo</th></tr></thead>
          <tbody>
            ${catalogo
              .map(
                (a) => `<tr>
                  <th scope="row">${esc(a.id)} ${esc(a.nombre)}</th>
                  <td>${esc(a.paradigma)}</td>
                  <td>${esc(a.estado)}</td>
                  <td>${a.prototipo ? 'Sí' : `No. Falta: ${esc(a.falta)}`}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="ayuda">El estado es el del Catálogo de actividades, versión 1. Las de uso posterior se habilitan después del piloto y de la validez de contenido; las de investigación no se usan todavía.</p>
    </details>`;
}

// Pastilla: un botón de opción con su texto visible (filtros de la galería, modalidad y nivel de apoyo).
export const chipHTML = (name, value, label, checked) =>
  `<label class="chip"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;

// Etiquetas del ítem: si es de la muestra (solo distingue algo cuando se ven todos los ítems), su
// estado de revisión clínica y, mientras no se revise, si tiene puntos que los clínicos deben confirmar.
const estadoHTML = (it, todos) => `
  ${todos && it.muestraExpertos ? '<span class="etiqueta">Muestra</span>' : ''}
  ${it.estadoRevision ? `<span class="etiqueta ${it.estadoRevision}">${ETIQUETAS_REVISION[it.estadoRevision]}</span>` : ''}
  ${(it.estadoRevision ?? 'sin-revisar') === 'sin-revisar' && it.revisionPendiente ? '<span class="etiqueta pendiente">Puntos por revisar</span>' : ''}`;

const notasClinicasHTML = (entrada) => {
  const notas = notasDe(entrada);
  return notas.length ? `<p class="ayuda">Revisión clínica (${esc(entrada.fecha)}):</p><ul class="motivos">${notas.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
};

const motivosHTML = (it) =>
  it.motivosRevision.length ? `<ul class="motivos">${it.motivosRevision.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '';

function itemHTML(it, nombre, todos, clinica) {
  const c = nombre.get(it.concepto);
  const consigna = it.consigna.tipo === 'pictograma' ? 'Pictograma' : 'Muestra';
  return `
    <article class="item">
      <header><strong class="codigo">${esc(it.codigo)}</strong> ${estadoHTML(it, todos)}</header>
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
              <span>${esc(oc.nombre)}</span>
              <span class="item-ejemplar">ejemplar ${o.ejemplar}</span>
              ${o.correcta ? '<strong class="correcta-etiqueta">Correcta</strong>' : ''}
            </li>`;
          })
          .join('')}
      </ul>
      ${motivosHTML(it)}
      ${notasClinicasHTML(clinica)}
    </article>`;
}

// Tarjeta de un ítem de las actividades de uso posterior. Cada pantalla dice cómo se dibujan su
// consigna y sus opciones (consignaHTML y opcionHTML) y cómo se describen con palabras.
function itemPosteriorHTML(it, { mod, ficha, nombre, todos }) {
  const banda = ficha.bandas.find((b) => b.id === it.banda);
  const articulo = (id) => `${nombre.get(id).articulo} ${nombre.get(id).nombre}`;
  const voz = ficha.modalidades.includes('AV') && it.consigna.texto ? `<br><span class="ayuda">Voz en AV: «${esc(it.consigna.texto)}»</span>` : '';
  return `
    <article class="item">
      <header><strong class="codigo">${esc(it.codigo)}</strong> ${estadoHTML(it, todos)}</header>
      <div class="item-consigna item-consigna-${esc(it.consigna.tipo)}">
        <span class="item-estimulo">${mod.consignaHTML(it.consigna)}</span>
        <p>${esc(mod.consignaTexto(it, { ficha, banda, nombre: articulo }))}${voz}</p>
      </div>
      <ul class="item-opciones ${it.opciones.length > 4 ? 'muchas' : ''}">
        ${it.opciones
          .map(
            (o) => `<li class="${o.correcta ? 'correcta' : ''}">
              <span class="item-opcion">${mod.opcionHTML(o)}</span>
              <span>${esc(mod.opcionTexto ? mod.opcionTexto(o) : nombre.get(o.concepto).nombre)}</span>
              ${o.ejemplar ? `<span class="item-ejemplar">ejemplar ${o.ejemplar}</span>` : ''}
              ${o.correcta ? '<strong class="correcta-etiqueta">Correcta</strong>' : ''}
            </li>`,
          )
          .join('')}
      </ul>
      ${motivosHTML(it)}
    </article>`;
}

function secuenciaHTML(it, pareja, todos) {
  return `
    <article class="item">
      <header><strong class="codigo">${esc(it.codigo)}</strong> <span class="meta">${esc(it.tipo)}</span> ${estadoHTML(it, todos)}</header>
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

// ---------- Calibración ----------

// Regla de 5 cm dibujada con --cm. El adulto la compara con una regla física y ajusta
// los px por centímetro; el valor se guarda solo en este dispositivo.
export function renderCalibracion(app, { estimated, saved, preview, save, reset }) {
  let px = saved ?? estimated;
  app.innerHTML = `
    <div class="adulto">
      ${navHTML('calibracion')}
      ${tituloHTML('Calibración', 'Ajusta el tamaño real de las opciones en esta pantalla. Hazlo una vez en cada tableta.')}
      ${AVISO}
      <div class="panel">
        <p>En las tabletas, un centímetro de la pantalla no mide un centímetro real. Pon una regla física sobre la regla de abajo y ajusta hasta que las marcas de 0 y 5 cm coincidan. El ajuste se guarda solo en este dispositivo y se usa para el tamaño de las opciones.</p>
        <div class="regla" role="img" aria-label="Regla de 5 centímetros">
          ${[0, 1, 2, 3, 4, 5].map((i) => `<span style="left: calc(var(--cm) * ${i})">${i}</span>`).join('')}
        </div>
        <label>Ajuste fino <input type="range" min="20" max="120" step="0.1" value="${px}" id="cm-ajuste"></label>
        <div class="acciones">
          <button type="button" data-paso="-0.1" aria-label="Restar 0.1 px por centímetro">− 0.1</button>
          <button type="button" data-paso="0.1" aria-label="Sumar 0.1 px por centímetro">+ 0.1</button>
        </div>
        <p class="meta" id="cm-valor"></p>
        <div class="acciones">
          <button type="button" class="primario" id="cm-guardar">Guardar</button>
          <button type="button" id="cm-estimado">Volver al valor estimado</button>
        </div>
        <p class="meta" id="cm-estado" role="status"></p>
      </div>
      <div class="panel">
        <h2>Tamaño mínimo de las opciones</h2>
        <p>Cada opción mide al menos 2 cm de lado y hay al menos 0.5 cm entre opciones. Con la pantalla calibrada, estos dos cuadros miden 2 cm y están separados por 0.5 cm.</p>
        <div class="muestra-minima"><span></span><span></span></div>
      </div>
    </div>`;

  const ajuste = app.querySelector('#cm-ajuste');
  const estado = app.querySelector('#cm-estado');
  const show = () => {
    app.querySelector('#cm-valor').textContent =
      `${px.toFixed(1)} px por centímetro · valor estimado para este dispositivo: ${estimated.toFixed(1)}` + (saved ? ' · hay un valor guardado' : '');
  };
  const set = (v) => {
    px = Math.min(120, Math.max(20, Math.round(v * 10) / 10));
    ajuste.value = px;
    preview(px);
    estado.textContent = '';
    show();
  };
  ajuste.oninput = () => set(Number(ajuste.value));
  for (const b of app.querySelectorAll('[data-paso]')) b.onclick = () => set(px + Number(b.dataset.paso));
  app.querySelector('#cm-guardar').onclick = () => {
    save(px);
    saved = px;
    show();
    estado.textContent = 'Calibración guardada en este dispositivo.';
  };
  app.querySelector('#cm-estimado').onclick = () => {
    reset();
    saved = null;
    set(estimated);
    estado.textContent = 'Se usa el valor estimado.';
  };
  show();
}

// ---------- Créditos ----------

// Quién hizo el prototipo. El rol es el que cada persona declaró en el documento de
// contribuciones del proyecto; el aporte describe su trabajo en este repositorio.
export const EQUIPO = [
  {
    nombre: 'Luis Nazariego Santome',
    rol: 'Líder de proyecto · calidad y verificación',
    aporte: 'Catálogo de actividades y fichas técnicas, motor de medición y registro, banco de ítems, revisión clínica y formulario F3.',
  },
  {
    nombre: 'José Miguel Fausto Tapia',
    rol: 'Líder de proyecto · diseño de experiencia y accesibilidad',
    aporte: 'Interfaz del terapeuta y del niño, marca AutiPal en la aplicación, dibujos del banco de imágenes, página de producto y prototipos de las actividades de uso posterior.',
  },
];

export function renderCreditos(app, { conceptos }) {
  app.innerHTML = `
    <div class="adulto">
      ${navHTML('creditos')}
      ${tituloHTML('Créditos y licencias', 'Origen y licencia de la marca, los pictogramas, las imágenes y la aplicación.')}
      ${AVISO}
      <section class="panel">
        <h2>Equipo</h2>
        <p><span class="nombre-marca">AutiPal</span> es un proyecto de Neuro-BlueMinds. Este prototipo lo hicieron:</p>
        <dl class="equipo">
          ${EQUIPO.map((p) => `
          <div>
            <dt>${esc(p.nombre)}</dt>
            <dd class="equipo-rol">${esc(p.rol)}</dd>
            <dd>${esc(p.aporte)}</dd>
          </div>`).join('')}
        </dl>
      </section>
      <section class="panel">
        <h2>Marca</h2>
        <picture class="logotipo">
          <source srcset="assets/marca/logotipo-invertido.svg" media="(prefers-color-scheme: dark)">
          <img src="assets/marca/logotipo.svg" alt="AutiPal" width="174" height="48">
        </picture>
        <p class="lema">Amabilidad para cada mente</p>
        <p><span class="nombre-marca">AutiPal</span> es la aplicación de Neuro-BlueMinds. El isotipo, el logotipo y el Manual de marca de <span class="nombre-marca">AutiPal</span> son propiedad de Neuro-BlueMinds. Todos los derechos reservados.</p>
        <p>Las tipografías del Manual de marca son Roca Two, en los títulos, y More Sugar, en el logotipo y en el nombre <span class="nombre-marca">AutiPal</span>. En este prototipo se usan solo para pruebas y no vienen en el repositorio; antes de vender la aplicación se compran sus licencias comerciales. El texto usa Noto Sans, y Noto Serif reemplaza a Roca Two cuando no está instalada. Las dos son de The Noto Project Authors y se distribuyen bajo la licencia SIL Open Font License 1.1 (<a href="assets/fonts/OFL.txt">texto de la licencia</a>). Ninguna tipografía se carga de un servidor externo.</p>
      </section>
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
        <h2>Imágenes y audio</h2>
        <p>Las imágenes de los ejemplares son dibujos hechos para este prototipo: la mayoría con inteligencia artificial en Canva y otros como variantes de esos dibujos o con código. Son originales, no muestran a personas reales y están pendientes de revisión clínica. Mientras no haya archivos de audio, las consignas usan la voz del navegador. El origen y la licencia de cada archivo están en <a href="items/licencias.csv">items/licencias.csv</a>.</p>
      </section>
      <section class="panel">
        <h2>Aplicación</h2>
        <p>© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.</p>
        <p>Incluye el código, las fichas técnicas, el banco de ítems y las figuras de la actividad «Cambia la regla». No incluye los pictogramas de ARASAAC, que conservan su propia licencia.</p>
        <p>Los íconos de las pantallas del adulto son de Phosphor Icons (© 2023 Phosphor Icons), con licencia MIT.</p>
      </section>
    </div>`;
}
