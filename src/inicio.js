// Pantalla de inicio: el adulto prepara el bloque en tres pasos (actividad, ajustes y sesión),
// ve un ejemplo de lo que verá el niño y empieza. El botón «Empezar» siempre queda a la vista.
import { esc, navHTML, tituloHTML, chipHTML } from './paginas.js';
import { EN_UNA_LINEA, ESQUEMAS, PANTALLAS, grupos, requiereModoExperto } from './catalogo.js';
import { itemDeEjemplo, previaHTML } from './previa.js';
import { comprobarPantalla, avisoPantalla } from './ajuste-pantalla.js';
import { DEMO, nombreNino, abreviar } from './ninos.js';
import { REF_MIN_APARICIONES, REF_MAX_APARICIONES } from './engine/referencia.js';

export const MODALIDADES = { V: 'V · solo visual', AV: 'AV · visual con voz' };

// Un bloque armado por composición (ACT-07) tiene tantos ensayos como sus secuencias. Una banda
// puede fijar su propio máximo (ACT-12 y ACT-13: el largo de sus programas).
export const maxEnsayos = (ficha, banda) =>
  banda.composicion ? banda.composicion.length * ficha.ensayosPorSecuencia : (banda.ensayosMax ?? ficha.ensayosMax ?? 200);
// En «Ordena la secuencia» y «Forma la palabra» el bloque se cuenta en secuencias; cada paso es un ensayo.
export const unidadDelBloque = (ficha) => (ficha.unidadDelBloque === 'secuencia' ? { una: 'secuencia', varias: 'secuencias', campo: 'Número de secuencias' } : { una: 'ensayo', varias: 'ensayos', campo: 'Número de ensayos' });
const ensayosAyuda = (ficha, banda) =>
  `De 1 a ${maxEnsayos(ficha, banda)}. La ficha propone ${Math.min(ficha.ensayosPorBloque, maxEnsayos(ficha, banda))}.${ficha.unidadDelBloque === 'secuencia' ? ' Cada paso de una secuencia queda como un ensayo en el registro.' : ''}`;
// Nota de la modalidad cuando la actividad solo tiene una.
const NOTA_MODALIDAD = { V: 'Esta actividad solo tiene modalidad visual.', AV: 'Esta actividad solo tiene modalidad con sonido: revisa el volumen antes de empezar.' };

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

// Con niños inscritos hay que elegir al participante antes de empezar; el aviso queda junto al campo.
function revisarParticipante(form, enfocar) {
  const campo = form.participante;
  if (!campo || campo.disabled) return true;
  const ok = campo.value !== '';
  form.querySelector('#participante-error').textContent = ok ? '' : ELIGE_PARTICIPANTE;
  if (ok) campo.removeAttribute('aria-invalid');
  else campo.setAttribute('aria-invalid', 'true');
  if (!ok && enfocar) campo.focus();
  return ok;
}

// Píxeles por centímetro que usa la hoja de estilos (variable --cm).
const cmPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cm')) || 37.8;

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

const NOTA_GRUPO = {
  posterior: 'Prototipos de actividades que el Catálogo deja para después del piloto. Solo se abren en modo experto y todavía no se usan con niños.',
  investigacion:
    'El Catálogo deja estas actividades en investigación: antes de usarlas hay que definir sus indicadores en el Modelo matemático. Sus prototipos solo se abren en modo experto, para revisarlas.',
};

function actividadesHTML({ state, actual }) {
  // Con una sesión normal en curso no se puede cambiar a modo experto: se termina primero.
  const sesionNormal = Boolean(state.session && !state.session.experto);
  return grupos(state.catalogo, state.fichas, state.problemas)
    .filter((g) => g.actividades.length)
    .map((g) => {
      // Las de uso posterior y las de investigación solo se abren en modo experto.
      const posterior = g.id !== 'piloto';
      const nota = !posterior
        ? ''
        : sesionNormal
          ? 'Hay una sesión normal en curso. Termínala para probar estas actividades, que solo se abren en modo experto.'
          : NOTA_GRUPO[g.id];
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
      ${ficha.modalidades.length === 1 ? `<p class="ayuda">${NOTA_MODALIDAD[ficha.modalidades[0]]}</p>` : ''}
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
            <span class="banda-opciones">${opcionesDeBanda(ficha, b)}</span>
            <span class="banda-desc">${esc(b.descripcion)}</span>
          </span>
        </label>`,
        )
        .join('')}
      ${ficha.bandasPendientes?.length ? `<p class="ayuda bandas-nota">Todavía sin prototipo: ${esc(ficha.bandasPendientes.join(' '))}</p>` : ''}
    </fieldset>
    <label>${unidadDelBloque(ficha).campo}
      <input type="number" name="ensayos" min="1" max="${maxEnsayos(ficha, banda)}" step="1" inputmode="numeric" value="${esc(f.ensayos ?? ficha.ensayosPorBloque)}" aria-describedby="ensayos-ayuda ensayos-error">
      <span class="ayuda" id="ensayos-ayuda">${ensayosAyuda(ficha, banda)}</span>
      <span class="error-campo" id="ensayos-error"></span>
    </label>`;
}

// Qué muestra cada banda: opciones, tarjetas de una secuencia o un estímulo a la vez.
const opcionesDeBanda = (ficha, b) =>
  ficha.respuesta === 'tocar_o_no_tocar'
    ? 'Un estímulo a la vez'
    : ficha.unidadDelBloque === 'secuencia'
      ? `${b.opciones} tarjetas`
      : `${b.opciones} ${b.opciones === 1 ? 'opción' : 'opciones'}`;

// ---------- Paso 3: sesión ----------

// Cómo se dice el estado del Catálogo en las ayudas de la sesión.
const DE_ESTADO = {
  'Uso posterior': { grupo: 'de uso posterior', esta: 'es de uso posterior' },
  Investigación: { grupo: 'en investigación', esta: 'está en investigación' },
};

// Quién participa: un niño del padrón (ninos.js) o la demostración, sin niño. No hay ningún campo
// de texto: la tableta no guarda nada que diga quién es el niño.
const quien = (s) => (s.nino ? `${nombreNino(s.nino)} · ${abreviar(s.nino.codigo)}` : 'sin niño');
const tipoDeSesion = (s) => (s.experto ? 'Sesión de modo experto' : s.tipo === 'demo' ? 'Sesión de demostración' : 'Sesión en curso');
const CONSENTIMIENTO_NO_VIGENTE = { suspendido: ' · consentimiento suspendido', retirado: ' · consentimiento retirado' };
const ELIGE_PARTICIPANTE = 'Elige al niño o la demostración.';
const NOTA_REFERENCIA = `La sesión empieza con la referencia motora: antes del primer bloque, el niño toca un círculo que aparece de ${REF_MIN_APARICIONES} a ${REF_MAX_APARICIONES} veces.`;

// Lo elegido en el inicio, si sigue siendo válido. Con niños inscritos hay que elegir de forma
// deliberada (R6): no hay ninguno preseleccionado. Sin ellos solo existe la demostración.
export function participanteElegido(valor, padron, forzado = false) {
  if (forzado) return DEMO;
  if (valor === DEMO || padron.some((n) => n.codigo === valor)) return valor;
  return padron.length ? '' : DEMO;
}

function sesionHTML(state, f, forzado, padron, estado) {
  const de = DE_ESTADO[estado] ?? DE_ESTADO['Uso posterior'];
  const s = state.session;
  const elegido = participanteElegido(f.participante, padron, forzado);
  const opcionNino = (n) =>
    `<option value="${esc(n.codigo)}" ${elegido === n.codigo ? 'selected' : ''}>${esc(nombreNino(n))} · ${esc(abreviar(n.codigo))} · ${esc(n.edad_meses)} meses${CONSENTIMIENTO_NO_VIGENTE[n.consentimiento] ?? ''}</option>`;
  // Las actividades de uso posterior y las de investigación no se usan con niños: solo
  // demostración y modo experto.
  const participante = forzado
    ? `<label>Participante
         <select name="participante" disabled><option value="${DEMO}" selected>Demostración (sin niño)</option></select>
         <span class="ayuda">Las actividades ${de.grupo} solo se abren en la demostración, sin niño.</span>
       </label>`
    : `<label>Participante
         <select name="participante" aria-describedby="participante-ayuda participante-error">
           ${padron.length ? `<option value="" ${elegido === '' ? 'selected' : ''} disabled>Elige al niño o la demostración</option>` : ''}
           <option value="${DEMO}" ${elegido === DEMO ? 'selected' : ''}>Demostración (sin niño)</option>
           ${padron.map(opcionNino).join('')}
         </select>
         <span class="ayuda" id="participante-ayuda">Los niños se inscriben en <a href="#ninos">Niños inscritos</a>. No se guarda su nombre ni ningún otro dato que lo identifique.</span>
         <span class="error-campo" id="participante-error"></span>
       </label>`;
  const experto = forzado
    ? `<label class="casilla"><input type="checkbox" name="experto" value="1" checked disabled> Modo experto
         <span class="ayuda">Esta actividad ${de.esta}: solo se abre en modo experto. Sus registros llevan un sesion_id que empieza con EXP-.</span>
       </label>`
    : `<label class="casilla"><input type="checkbox" name="experto" value="1" ${f.experto ? 'checked' : ''}> Modo experto (solo en la demostración)
         <span class="ayuda">Muestra el código de cada ítem y un botón «Siguiente» para avanzar sin esperar los tiempos. No hace la referencia motora. Sus registros llevan un sesion_id que empieza con EXP-.</span>
       </label>`;
  return `
    <div class="grupo paso" role="group" aria-labelledby="grupo-sesion">
      ${paso(3, 'grupo-sesion', 'Sesión')}
      ${
        s
          ? `<div class="sesion-actual"><p class="meta">${tipoDeSesion(s)} <strong>${esc(s.id)}</strong> · ${esc(quien(s))} · bloques: ${s.bloque}</p>
             <div class="acciones"><button type="button" id="cerrar-sesion">Terminar sesión</button></div></div>`
          : `${participante}
             ${experto}
             <p class="ayuda" id="nota-referencia" ${forzado || f.experto ? 'hidden' : ''}>${esc(NOTA_REFERENCIA)}</p>`
      }
    </div>`;
}

// ---------- Vista previa y resumen de lo elegido ----------

function pieDePrevia(state, ficha, banda, modalidad) {
  const item = itemDeEjemplo(state.items, ficha, banda, modalidad);
  if (!item) return 'Esta banda todavía no tiene ítems.';
  // En ACT-05 la consigna es un sonido grabado, no la voz.
  if (item.consigna?.tipo === 'sonido') {
    const nombre = state.conceptos.find((c) => c.id === item.concepto)?.nombre ?? item.concepto;
    return `Ejemplo: ítem ${item.codigo}. Suena la grabación ${item.grabacion} de «${nombre}».`;
  }
  const voz = modalidad === 'AV' && (item.consigna?.texto || item.ensayos?.[0]?.consigna?.texto);
  // Algunas pantallas aclaran en qué se diferencia el bloque de este dibujo.
  const nota = PANTALLAS[ficha.pantalla]?.notaPrevia?.(ficha, banda);
  return `Ejemplo: ítem ${item.codigo}.${voz ? ` La voz dice «${voz}».` : ''}${nota ? ` ${nota}` : ''}`;
}

const resumenAjustes = (ficha, banda, modalidad, ensayos) => `Banda ${banda.id} · modalidad ${modalidad} · ${ensayos || '—'} ${unidadDelBloque(ficha).varias}`;

// ---------- Pantalla ----------

// ctx: { state, volumen, calibrada, padron, avisoSinRevision, registroHTML, bindRegistro, bindVolumen, cerrarSesion, empezar, desbloquearAudio }
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
  const padron = ctx.padron();
  // Mientras la ficha no tenga revisor y fecha, la actividad solo sirve para demostración y pruebas.
  const sinRevision = lista ? ctx.avisoSinRevision(ficha) : '';

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
          ${sinRevision ? `<p class="aviso" id="sin-revision">${esc(sinRevision)}</p>` : ''}
        </div>
        ${
          lista
            ? `<div class="grupo paso" role="group" aria-labelledby="grupo-bloque">
                 ${paso(2, 'grupo-bloque', 'Ajustes del bloque')}
                 ${bloqueHTML(ficha, f, ctx.volumen())}
               </div>
               ${sesionHTML(state, f, forzado, padron, ficha.estado)}`
            : ''
        }
        <p class="mensaje" role="alert">${esc(msg)}</p>
        ${lista ? '<p class="ayuda">Durante el bloque, para pausar o terminar, toca dos veces el botón de la esquina superior derecha.</p>' : ''}
        <div class="barra-empezar">
          <p class="barra-resumen">
            <strong>${lista ? `${esc(ficha.id)} · ${esc(ficha.nombre)}` : 'Elige una actividad'}</strong>
            <span id="resumen-ajustes">${lista ? esc(resumenAjustes(ficha, banda0, modalidad0, f.ensayos ?? ficha.ensayosPorBloque)) : ''}</span>
          </p>
          <button type="submit" class="primario" ${lista ? '' : 'disabled'}>Empezar</button>
        </div>
      </form>
      ${
        lista
          ? `<div class="lateral">
               <section class="panel previa" aria-labelledby="previa-titulo">
                 <h2 id="previa-titulo">Así lo verá el niño</h2>
                 <div id="previa">${previaHTML({ ficha, banda: banda0, items: state.items, modalidad: modalidad0 })}</div>
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

  // Al cambiar de actividad se conservan la modalidad, el participante y el modo experto ya elegidos.
  // En una actividad de uso posterior esos dos controles van fijos y se conserva lo de antes.
  for (const r of form.querySelectorAll('[name=actividad]')) {
    r.onchange = () => {
      const d = Object.fromEntries(new FormData(form));
      const libres = Boolean(form.participante) && !forzado;
      state.form = {
        actividad: d.actividad,
        modalidad: d.modalidad ?? f.modalidad,
        participante: libres ? d.participante : f.participante,
        experto: libres ? d.experto : f.experto,
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
      form.querySelector('#resumen-ajustes').textContent = resumenAjustes(ficha, banda, form.modalidad.value, ensayosOk(form.ensayos) ? form.ensayos.value : '');
      app.querySelector('#previa').innerHTML = previaHTML({ ficha, banda, items: state.items, modalidad: form.modalidad.value });
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
      form.querySelector('#resumen-ajustes').textContent = resumenAjustes(ficha, elegida(), form.modalidad.value, ensayosOk(form.ensayos) ? form.ensayos.value : '');
    };
  }
  // El modo experto solo existe en la demostración, sin niño. Con modo experto no hay referencia motora.
  const casillaExperto = form.querySelector('[name=experto]');
  const sincronizarExperto = () => {
    if (!form.participante || !casillaExperto || forzado) return;
    casillaExperto.disabled = form.participante.value !== DEMO;
    if (casillaExperto.disabled) casillaExperto.checked = false;
    form.querySelector('#nota-referencia').hidden = casillaExperto.checked;
  };
  form.participante?.addEventListener('change', () => {
    revisarParticipante(form, false);
    sincronizarExperto();
  });
  casillaExperto?.addEventListener('change', sincronizarExperto);
  sincronizarExperto();
  form.querySelector('#cerrar-sesion')?.addEventListener('click', () => {
    ctx.cerrarSesion();
    renderInicio(app, ctx);
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    if (!lista || !revisarEnsayos(form, true) || !revisarParticipante(form, true)) return;
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
