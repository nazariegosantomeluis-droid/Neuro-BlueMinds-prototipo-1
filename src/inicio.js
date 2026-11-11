// Pantalla de inicio: el adulto prepara el bloque en tres pasos (actividad, ajustes y sesión),
// ve un ejemplo de lo que verá el niño y empieza. El botón «Empezar» siempre queda a la vista.
import { esc, navHTML, tituloHTML, chipHTML } from './paginas.js';
import { EN_UNA_LINEA, ESQUEMAS, PANTALLAS, grupos, requiereModoExperto } from './catalogo.js';
import { itemDeEjemplo, previaHTML } from './previa.js';
import { comprobarPantalla, avisoPantalla } from './ajuste-pantalla.js';

export const MODALIDADES = { V: 'V · solo visual', AV: 'AV · visual con voz' };

// Un bloque armado por composición (ACT-07) tiene tantos ensayos como sus secuencias.
export const maxEnsayos = (ficha, banda) => (banda.composicion ? banda.composicion.length * ficha.ensayosPorSecuencia : 200);
const ensayosAyuda = (ficha, banda) => `De 1 a ${maxEnsayos(ficha, banda)}. La ficha propone ${Math.min(ficha.ensayosPorBloque, maxEnsayos(ficha, banda))}.`;

// El número de ensayos se revisa al salir del campo y al empezar; el aviso queda junto al campo.
const ensayosOk = (campo) => {
  const n = Number(campo.value);
  return campo.value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= Number(campo.max);
};

function revisarEnsayos(form, enfocar) {
  const campo = form.ensayos;
  const ok = ensayosOk(campo);
  form.querySelector('#ensayos-error').textContent = ok ? '' : `Escribe un número entero del 1 al ${campo.max}.`;
  if (ok) campo.removeAttribute('aria-invalid');
  else campo.setAttribute('aria-invalid', 'true');
  if (!ok && enfocar) campo.focus();
  return ok;
}

// Píxeles por centímetro que usa la hoja de estilos (variable --cm).
const cmPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cm')) || 37.8;

// El código de la sesión nunca debe ser el nombre del niño. Un código hecho solo de letras
// puede serlo: se avisa, sin impedir que el adulto siga. «DEMO» es el código de ejemplo.
export function pareceNombre(codigo) {
  const c = String(codigo ?? '').trim();
  return c.length >= 3 && c.toUpperCase() !== 'DEMO' && /^\p{L}[\p{L} .'’-]*$/u.test(c);
}
const avisoDeCodigo = (codigo) =>
  pareceNombre(codigo) ? `«${codigo.trim()}» no lleva números. Si es el nombre del niño, cámbialo por un código que no lo identifique, por ejemplo N07.` : '';

// ¿Cabe la banda en esta ventana? Devuelve el aviso para el adulto, o '' si cabe.
export function avisoDeAjuste(ficha, banda) {
  const r = comprobarPantalla({
    pantalla: ficha.pantalla,
    disposicion: banda.disposicion ?? `1x${banda.opciones}`,
    // La serie más larga de la banda, más el lugar vacío (ACT-11).
    lugares: banda.largos ? Math.max(...banda.largos) + 1 : 0,
    anchoPx: innerWidth,
    altoPx: innerHeight,
    cmPx: cmPx(),
  });
  return r.cabe ? '' : avisoPantalla(r, banda.opciones);
}

// Al girar la tableta o cambiar el tamaño de la ventana se vuelve a revisar si la banda cabe.
let alCambiarTamano = null;

const paso = (n, id, titulo) =>
  `<h2 class="grupo-titulo paso-titulo" id="${id}"><span class="paso-num" aria-hidden="true">${n}</span>${titulo}</h2>`;

// ---------- Paso 1: actividad ----------

function actividadesHTML({ state, actual }) {
  // Con una sesión normal en curso no se puede cambiar a modo experto: se termina primero.
  const sesionNormal = Boolean(state.session && !state.session.experto);
  return grupos(state.catalogo, state.fichas, state.problemas)
    .filter((g) => g.actividades.length)
    .map((g) => {
      const posterior = g.id === 'posterior';
      const nota = !posterior
        ? ''
        : sesionNormal
          ? 'Hay una sesión normal en curso. Termínala para probar estas actividades, que solo se abren en modo experto.'
          : 'Prototipos de actividades que el Catálogo deja para después del piloto. Solo se abren en modo experto y todavía no se usan con niños.';
      const tarjetas = g.actividades
          .map(
            ({ id }) => `
          <label class="actividad-tarjeta">
            <input type="radio" name="actividad" value="${id}" ${id === actual ? 'checked' : ''} ${posterior && sesionNormal ? 'disabled' : ''}>
            <span class="act-cuerpo">
              <span class="act-esquema">${ESQUEMAS[id] ?? ''}</span>
              <span class="act-codigo">${id}</span>
              <span class="act-nombre">${esc(state.fichas[id]?.nombre ?? 'Ficha con problemas')}</span>
              <span class="act-linea">${esc(EN_UNA_LINEA[id] ?? '')}</span>
            </span>
          </label>`,
          )
          .join('');
      // Las del piloto se ven siempre. Las de uso posterior van plegadas, para que preparar una
      // sesión normal siga siendo corto; se abren solas cuando la elegida es una de ellas.
      if (!posterior) return `<fieldset class="actividades"><legend>${g.titulo}</legend>${tarjetas}</fieldset>`;
      const abierta = g.actividades.some((a) => a.id === actual);
      return `
      <details class="grupo-posterior" ${abierta ? 'open' : ''}>
        <summary>${g.titulo} (${g.actividades.length})</summary>
        <fieldset class="actividades">
          <legend class="oculto">${g.titulo}</legend>
          <p class="ayuda actividades-nota">${nota}</p>
          ${tarjetas}
        </fieldset>
      </details>`;
    })
    .join('');
}

// ---------- Paso 2: ajustes del bloque ----------

function bloqueHTML(ficha, f, volumen) {
  const banda = ficha.bandas.find((b) => b.id === f.banda) ?? ficha.bandas[0];
  const modalidad = ficha.modalidades.includes(f.modalidad) ? f.modalidad : ficha.modalidades[0];
  return `
    <fieldset class="chips">
      <legend>Modalidad</legend>
      ${ficha.modalidades.map((m) => chipHTML('modalidad', m, MODALIDADES[m], m === modalidad)).join('')}
      ${ficha.modalidades.length === 1 ? '<p class="ayuda">Esta actividad solo tiene modalidad visual.</p>' : ''}
    </fieldset>
    <label id="campo-volumen" for="volumen-inicio" ${modalidad === 'AV' ? '' : 'hidden'}>Volumen de la voz <output data-volumen-valor>${volumen} %</output>
      <input type="range" id="volumen-inicio" min="0" max="100" value="${volumen}" data-volumen>
    </label>
    <fieldset class="bandas">
      <legend>Banda inicial</legend>
      ${ficha.bandas
        .map(
          (b) => `
        <label class="banda-tarjeta">
          <input type="radio" name="banda" value="${esc(b.id)}" ${b.id === banda.id ? 'checked' : ''}>
          <span class="banda-cuerpo">
            <span class="banda-id">${esc(b.id)}</span>
            <span class="banda-opciones">${b.opciones} opciones</span>
            <span class="banda-desc">${esc(b.descripcion)}</span>
          </span>
        </label>`,
        )
        .join('')}
      ${ficha.bandasPendientes?.length ? `<p class="ayuda bandas-nota">Todavía sin prototipo: ${esc(ficha.bandasPendientes.join(' '))}</p>` : ''}
    </fieldset>
    <label>Número de ensayos
      <input type="number" name="ensayos" min="1" max="${maxEnsayos(ficha, banda)}" step="1" inputmode="numeric" value="${esc(f.ensayos ?? ficha.ensayosPorBloque)}" aria-describedby="ensayos-ayuda ensayos-error">
      <span class="ayuda" id="ensayos-ayuda">${ensayosAyuda(ficha, banda)}</span>
      <span class="error-campo" id="ensayos-error"></span>
    </label>`;
}

// ---------- Paso 3: sesión ----------

function sesionHTML(state, f, forzado) {
  const s = state.session;
  const experto = forzado
    ? `<label class="casilla"><input type="checkbox" name="experto" value="1" checked disabled> Modo experto
         <span class="ayuda">Esta actividad es de uso posterior: solo se abre en modo experto. Sus registros llevan un sesion_id que empieza con EXP-.</span>
       </label>`
    : `<label class="casilla"><input type="checkbox" name="experto" value="1" ${f.experto ? 'checked' : ''}> Modo experto
         <span class="ayuda">Muestra el código de cada ítem y un botón «Siguiente» para avanzar sin esperar los tiempos. Sus registros llevan un sesion_id que empieza con EXP-.</span>
       </label>`;
  return `
    <div class="grupo paso" role="group" aria-labelledby="grupo-sesion">
      ${paso(3, 'grupo-sesion', 'Sesión')}
      ${
        s
          ? `<div class="sesion-actual"><p class="meta">${s.experto ? 'Sesión de modo experto' : 'Sesión en curso'} <strong>${esc(s.id)}</strong> · código ${esc(s.codigo)} · bloques: ${s.bloque}</p>
             <div class="acciones"><button type="button" id="cerrar-sesion">Terminar sesión</button></div></div>`
          : `<label>Código del niño (opcional)
               <input name="codigo" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(f.codigo ?? 'DEMO')}">
               <span class="ayuda">Usa un código, nunca el nombre ni otro dato que identifique al niño.</span>
             </label>
             <p class="nota-pantalla" id="aviso-codigo" role="status" ${avisoDeCodigo(f.codigo) ? '' : 'hidden'}>${esc(avisoDeCodigo(f.codigo))}</p>
             ${experto}`
      }
    </div>`;
}

// ---------- Vista previa y resumen de lo elegido ----------

function pieDePrevia(state, ficha, banda, modalidad) {
  const item = itemDeEjemplo(state.items, ficha, banda);
  if (!item) return 'Esta banda todavía no tiene ítems.';
  const voz = modalidad === 'AV' && (item.consigna?.texto ?? item.ensayos?.[0]?.consigna?.texto);
  // Algunas pantallas aclaran en qué se diferencia el bloque de este dibujo.
  const nota = PANTALLAS[ficha.pantalla]?.notaPrevia?.(ficha, banda);
  return `Ejemplo: ítem ${item.codigo}.${voz ? ` La voz dice «${voz}».` : ''}${nota ? ` ${nota}` : ''}`;
}

const resumenAjustes = (banda, modalidad, ensayos) => `Banda ${banda.id} · modalidad ${modalidad} · ${ensayos || '—'} ensayos`;

// ---------- Pantalla ----------

// ctx: { state, volumen, calibrada, registroHTML, bindRegistro, bindVolumen, cerrarSesion, empezar, desbloquearAudio }
export function renderInicio(app, ctx, msg = '') {
  const { state } = ctx;
  const f = state.form;
  const disponibles = grupos(state.catalogo, state.fichas, state.problemas).flatMap((g) => g.actividades.map((a) => a.id));
  const actividad = disponibles.includes(f.actividad) ? f.actividad : disponibles[0];
  const ficha = state.fichas[actividad];
  const deUsoPosterior = Boolean(ficha && requiereModoExperto(ficha));
  const problemas = [...(state.problemas[actividad] ?? []), ...(state.problemas.items ?? []), ...(deUsoPosterior ? (state.problemas.posteriores ?? []) : [])];
  const lista = Boolean(ficha && !problemas.length);
  const forzado = lista && deUsoPosterior;
  const banda0 = lista ? (ficha.bandas.find((b) => b.id === f.banda) ?? ficha.bandas[0]) : null;
  const modalidad0 = lista ? (ficha.modalidades.includes(f.modalidad) ? f.modalidad : ficha.modalidades[0]) : null;

  app.innerHTML = `
    <div class="adulto medio">
      ${navHTML('inicio')}
      ${tituloHTML('Preparar el bloque', 'Elige la actividad y sus ajustes.')}
      <p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>
      <div class="inicio-columnas${lista ? '' : ' una-columna'}">
      <form class="panel" id="inicio" novalidate>
        <div class="grupo paso" role="group" aria-labelledby="grupo-actividad">
          ${paso(1, 'grupo-actividad', 'Actividad')}
          ${actividadesHTML({ state, actual: actividad })}
          ${problemas.length ? `<div class="problemas" role="alert">Esta actividad no se puede usar:<ul>${problemas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
        </div>
        ${
          lista
            ? `<div class="grupo paso" role="group" aria-labelledby="grupo-bloque">
                 ${paso(2, 'grupo-bloque', 'Ajustes del bloque')}
                 ${bloqueHTML(ficha, f, ctx.volumen())}
               </div>
               ${sesionHTML(state, f, forzado)}`
            : ''
        }
        <p class="mensaje" role="alert">${esc(msg)}</p>
        ${lista ? '<p class="ayuda">Durante el bloque, para pausar o terminar, toca dos veces el botón de la esquina superior derecha.</p>' : ''}
        <div class="barra-empezar">
          <p class="barra-resumen">
            <strong>${lista ? `${esc(ficha.id)} · ${esc(ficha.nombre)}` : 'Elige una actividad'}</strong>
            <span id="resumen-ajustes">${lista ? esc(resumenAjustes(banda0, modalidad0, f.ensayos ?? ficha.ensayosPorBloque)) : ''}</span>
          </p>
          <button type="submit" class="primario" ${lista ? '' : 'disabled'}>Empezar</button>
        </div>
      </form>
      ${
        lista
          ? `<div class="lateral">
               <section class="panel previa" aria-labelledby="previa-titulo">
                 <h2 id="previa-titulo">Así lo verá el niño</h2>
                 <div id="previa">${previaHTML({ ficha, banda: banda0, items: state.items })}</div>
                 <p class="meta" id="previa-pie">${esc(pieDePrevia(state, ficha, banda0, modalidad0))}</p>
                 <p class="nota-pantalla" id="previa-ajuste" role="status" ${avisoDeAjuste(ficha, banda0) ? '' : 'hidden'}>${esc(avisoDeAjuste(ficha, banda0))}</p>
                 ${ctx.calibrada ? '' : '<p class="meta previa-calibracion">Los tamaños en centímetros son una estimación: esta pantalla no está calibrada. <a href="#calibracion">Calibrarla</a> toma un minuto.</p>'}
               </section>
             </div>`
          : ''
      }
      </div>
      <div class="herramientas">
        ${ctx.registroHTML()}
        ${
          state.pausa
            ? `<section class="panel herramienta" aria-labelledby="pausa-titulo">
                 <h2 id="pausa-titulo">Pausa guiada</h2>
                 <p class="meta">${esc(EN_UNA_LINEA['ACT-17'])} No mide nada.</p>
                 <div class="acciones"><a class="boton" href="#pausa">Abrir la pausa guiada</a></div>
               </section>`
            : ''
        }
      </div>
    </div>`;

  const form = app.querySelector('#inicio');
  const elegida = () => ficha.bandas.find((b) => b.id === form.banda.value) ?? ficha.bandas[0];

  // Al cambiar de actividad se conservan la modalidad, el código y el modo experto ya elegidos.
  for (const r of form.querySelectorAll('[name=actividad]')) {
    r.onchange = () => {
      const d = Object.fromEntries(new FormData(form));
      const casilla = form.querySelector('[name=experto]');
      state.form = {
        actividad: d.actividad,
        modalidad: d.modalidad ?? f.modalidad,
        codigo: d.codigo ?? f.codigo,
        experto: casilla && !casilla.disabled ? d.experto : f.experto,
      };
      renderInicio(app, ctx);
      app.querySelector('[name=actividad]:checked')?.focus();
    };
  }

  if (lista) {
    // La vista previa, el resumen y los límites siguen a la banda y a la modalidad elegidas.
    const actualizar = () => {
      const banda = elegida();
      form.ensayos.max = maxEnsayos(ficha, banda);
      form.querySelector('#ensayos-ayuda').textContent = ensayosAyuda(ficha, banda);
      form.querySelector('#campo-volumen').hidden = form.modalidad.value !== 'AV';
      form.querySelector('#resumen-ajustes').textContent = resumenAjustes(banda, form.modalidad.value, ensayosOk(form.ensayos) ? form.ensayos.value : '');
      app.querySelector('#previa').innerHTML = previaHTML({ ficha, banda, items: state.items });
      app.querySelector('#previa-pie').textContent = pieDePrevia(state, ficha, banda, form.modalidad.value);
      const ajuste = app.querySelector('#previa-ajuste');
      ajuste.textContent = avisoDeAjuste(ficha, banda);
      ajuste.hidden = !ajuste.textContent;
    };
    for (const r of form.querySelectorAll('[name=banda], [name=modalidad]')) r.onchange = actualizar;
    removeEventListener('resize', alCambiarTamano);
    alCambiarTamano = () => {
      const ajuste = document.querySelector('#previa-ajuste');
      if (!ajuste || !form.isConnected) return;
      ajuste.textContent = avisoDeAjuste(ficha, elegida());
      ajuste.hidden = !ajuste.textContent;
    };
    addEventListener('resize', alCambiarTamano);
    // El aviso aparece al salir del campo con un valor inválido y se quita en cuanto se corrige,
    // mientras se escribe: así nada se mueve bajo el dedo al tocar «Empezar».
    form.ensayos.onblur = () => !ensayosOk(form.ensayos) && revisarEnsayos(form, false);
    form.ensayos.oninput = () => {
      if (form.ensayos.hasAttribute('aria-invalid')) revisarEnsayos(form, false);
      form.querySelector('#resumen-ajustes').textContent = resumenAjustes(elegida(), form.modalidad.value, ensayosOk(form.ensayos) ? form.ensayos.value : '');
    };
  }
  // El aviso del código acompaña a lo que se escribe; no bloquea.
  form.codigo?.addEventListener('input', () => {
    const aviso = form.querySelector('#aviso-codigo');
    aviso.textContent = avisoDeCodigo(form.codigo.value);
    aviso.hidden = !aviso.textContent;
  });
  form.querySelector('#cerrar-sesion')?.addEventListener('click', () => {
    ctx.cerrarSesion();
    renderInicio(app, ctx);
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    if (!lista || !revisarEnsayos(form, true)) return;
    ctx.desbloquearAudio(); // dentro del gesto del adulto
    const boton = form.querySelector('[type=submit]');
    boton.disabled = true; // un solo bloque aunque se toque dos veces
    boton.setAttribute('aria-busy', 'true');
    boton.textContent = 'Preparando…';
    ctx.empezar(form);
  };
  ctx.bindVolumen(app);
  ctx.bindRegistro(app, () => renderInicio(app, ctx));
}
