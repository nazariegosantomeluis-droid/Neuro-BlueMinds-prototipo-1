// Registros del terapeuta al cerrar la sesión con un niño (H2.6; Arquitectura 8.4; Protocolo 5.4 y
// 8). En una sola pantalla: participación (PRPS adaptada, de 1 a 6), episodios de desregulación
// confirmados, eventos adversos con su gravedad y, en la fase 3, si consultó el panel y qué decisión
// informó. Puede completarse después, pero la sesión queda incompleta hasta hacerlo.
// Lógica pura y HTML; app.js la muestra y guarda lo leído en sesiones.csv.
import { esc } from './html.js';

// Participación (decisión R9, 23 nov 2026): Pittsburgh Rehabilitation Participation Scale adaptada
// (PRPS; Lenze et al., 2004), de 6 niveles, con las anclas de claude/Pendientes_clinicos_y_del_Modelo.md.
// Está validada en adultos en rehabilitación; el piloto mide su acuerdo entre evaluadores.
export const ANCLAS_PARTICIPACION = {
  1: ['Ninguna', 'Rechazó toda la sesión o no participó en ninguna actividad'],
  2: ['Escasa', 'Rechazó o no participó en al menos la mitad de la sesión'],
  3: ['Regular', 'Participó en la mayoría o en todas las actividades, pero sin esfuerzo sostenido o sin terminar la mayoría, o necesitó mucho estímulo para terminarlas'],
  4: ['Buena', 'Participó en todas con buen esfuerzo y terminó la mayoría, pero no todas'],
  5: ['Muy buena', 'Participó en todas con esfuerzo sostenido y las terminó todas, siguiendo las indicaciones de forma pasiva'],
  6: ['Excelente', 'Participó en todas con esfuerzo sostenido, las terminó todas y mostró interés activo (se acercó, inició o pidió seguir)'],
};
export const PARTICIPACION = Object.keys(ANCLAS_PARTICIPACION).map(Number);

// Protocolo 8.1.
export const GRAVEDADES = {
  leve: 'Leve: se resuelve dentro de la sesión con los apoyos habituales del terapeuta.',
  moderado: 'Moderado: obliga a terminar la actividad o la sesión, requiere apoyos fuera de lo habitual, o persiste después de la sesión sin superar 24 horas.',
  grave: 'Grave: lesión física que requiere atención médica, autolesión o agresión con daño, crisis que requiere contención física o atención de urgencia, convulsión, o cualquier suceso que el investigador responsable considere de importancia médica.',
};
export const RELACIONES = {
  no_relacionado: 'No relacionado: tiene una causa clara ajena a la plataforma.',
  improbable: 'Improbable: la relación temporal existe, pero otra causa es más probable.',
  posible: 'Posible: la relación temporal existe y no hay una causa alternativa más probable.',
  probable: 'Probable: ocurre durante la actividad o justo después, cede al detenerla y no hay otra explicación razonable.',
};
// Protocolo 7.6: tipos de decisión informada por el panel.
export const TIPOS_DECISION = ['ajustar el objetivo', 'cambiar el material', 'cambiar el nivel de apoyo', 'cambiar la duración de la actividad', 'comentar con la familia', 'otra'];

export const TEXTO_MAX = 120;
export const CRITERIO_EPISODIO =
  'Episodio: llanto, grito, agresión, autolesión, huida o rechazo de la actividad que dure 30 segundos o más, o que obligue a detenerla (Protocolo 8.4).';

// Episodios marcados con el menú del terapeuta durante la sesión.
export const episodiosMarcados = (ordenes = []) => ordenes.filter((o) => o.accion === 'episodio_desregulacion');

// datos: lo leído del formulario, ya como objeto plano (app.js lo arma desde FormData).
// Devuelve el registro listo para sesiones.csv.
// bandaInicial: en la familiarización, las actividades cuya banda inicial de la fase 1 se fija al
// cerrar (Protocolo 3.2), cada una con { id, bandas }.
export function leerRegistros(datos, { marcados = [], fase3 = false, bandaInicial = [] }) {
  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
  const texto = (v) => String(v ?? '').trim().slice(0, TEXTO_MAX);
  const eventos = (datos.eventos ?? []).map((e) => ({
    hora: e.hora || null,
    descripcion: texto(e.descripcion),
    actividad: e.actividad || null,
    banda: e.banda || null,
    duracion_min: num(e.duracion_min),
    medidas: texto(e.medidas),
    gravedad: e.gravedad || null,
    relacion: e.relacion || null,
  }));
  return {
    participacion: num(datos.participacion),
    episodios_confirmados: marcados.map((m, i) => ({ hora: m.hora, ms: m.ms ?? null, bloque: m.bloque ?? null, ensayo: m.ensayo ?? null, confirmado: Boolean(datos.confirmados?.includes(i)) })),
    episodios_no_marcados: num(datos.no_marcados) ?? 0,
    eventos_adversos: eventos,
    consulto_panel: fase3 ? (datos.consulto_panel === 'si' ? true : datos.consulto_panel === 'no' ? false : null) : null,
    decision_informada: fase3 ? (datos.decision === 'si' ? true : datos.decision === 'no' ? false : null) : null,
    tipo_decision: fase3 && datos.decision === 'si' ? datos.tipo_decision || null : null,
    banda_inicial_fase1: bandaInicial.length ? Object.fromEntries(bandaInicial.map(({ id }) => [id, datos.banda_inicial?.[id] || null])) : null,
  };
}

// Lo que falta para que los registros estén completos.
export function faltantes(reg, { fase3 = false, bandaInicial = [] }) {
  const f = [];
  if (!PARTICIPACION.includes(reg.participacion)) f.push('Elige la participación, de 1 a 6.');
  if (!Number.isInteger(reg.episodios_no_marcados) || reg.episodios_no_marcados < 0) f.push('Los episodios no marcados deben ser un número entero (0 o más).');
  reg.eventos_adversos.forEach((e, i) => {
    const n = i + 1;
    if (!e.descripcion) f.push(`Evento adverso ${n}: describe qué pasó.`);
    if (!(e.gravedad in GRAVEDADES)) f.push(`Evento adverso ${n}: elige la gravedad.`);
    if (!(e.relacion in RELACIONES)) f.push(`Evento adverso ${n}: elige la relación con la plataforma.`);
    if (!e.hora) f.push(`Evento adverso ${n}: anota la hora.`);
  });
  for (const { id, bandas } of bandaInicial) {
    if (!bandas.includes(reg.banda_inicial_fase1?.[id])) f.push(`Elige la banda inicial de ${id} para la fase 1.`);
  }
  if (fase3) {
    if (reg.consulto_panel === null) f.push('Indica si consultaste el panel.');
    if (reg.decision_informada === null) f.push('Indica si la información contribuyó a alguna decisión.');
    if (reg.decision_informada && !TIPOS_DECISION.includes(reg.tipo_decision)) f.push('Elige el tipo de decisión.');
  }
  return f;
}

const opcion = (valor, etiqueta, actual) => `<option value="${esc(valor)}" ${valor === actual ? 'selected' : ''}>${esc(etiqueta)}</option>`;
const radio = (name, valor, etiqueta, actual) =>
  `<label class="chip"><input type="radio" name="${name}" value="${esc(valor)}" ${String(valor) === String(actual) ? 'checked' : ''}><span>${esc(etiqueta)}</span></label>`;

// Un evento adverso: i es su número en la lista; e, lo ya guardado (si se completa después).
export function eventoHTML(i, { actividades = [], bandas = [], e = {} } = {}) {
  return `
    <fieldset class="evento-adverso" data-evento="${i}">
      <legend>Evento adverso ${i + 1}</legend>
      <label>Hora <input type="time" name="ev-hora-${i}" value="${esc(e.hora ?? '')}"></label>
      <label>Qué pasó <input name="ev-descripcion-${i}" maxlength="${TEXTO_MAX}" autocomplete="off" value="${esc(e.descripcion ?? '')}">
        <span class="ayuda">Sin nombres ni datos personales.</span></label>
      <label>Actividad en curso <select name="ev-actividad-${i}">${opcion('', '—', e.actividad ?? '')}${actividades.map((a) => opcion(a, a, e.actividad)).join('')}${opcion('fuera', 'Fuera de la plataforma (en las 24 horas siguientes)', e.actividad)}</select></label>
      <label>Banda <select name="ev-banda-${i}">${opcion('', '—', e.banda ?? '')}${bandas.map((b) => opcion(b, b, e.banda)).join('')}</select></label>
      <label>Duración (minutos) <input type="number" name="ev-duracion-${i}" min="0" step="1" inputmode="numeric" value="${esc(e.duracion_min ?? '')}"></label>
      <label>Medidas tomadas <input name="ev-medidas-${i}" maxlength="${TEXTO_MAX}" autocomplete="off" value="${esc(e.medidas ?? '')}"></label>
      <label>Gravedad <select name="ev-gravedad-${i}">${opcion('', '—', e.gravedad ?? '')}${Object.entries(GRAVEDADES).map(([k, v]) => opcion(k, v, e.gravedad)).join('')}</select></label>
      <label>Relación con la plataforma <select name="ev-relacion-${i}">${opcion('', '—', e.relacion ?? '')}${Object.entries(RELACIONES).map(([k, v]) => opcion(k, v, e.relacion)).join('')}</select></label>
    </fieldset>`;
}

// Formulario completo. previo: lo ya guardado de la sesión (para completarlo después).
export function registrosHTML({ marcados = [], fase3 = false, actividades = [], bandas = [], previo = {}, bandaInicial = [] }) {
  const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
  const confirmado = (i) => previo.episodios_confirmados?.[i]?.confirmado;
  return `
    <form class="panel registros-terapeuta" id="registros" novalidate>
      ${
        bandaInicial.length
          ? `<fieldset class="banda-inicial">
               <legend>Banda inicial para la fase 1</legend>
               ${bandaInicial
                 .map(
                   ({ id, nombre, bandas: bs, actual }) =>
                     `<label>${esc(id)} ${esc(nombre ?? '')} <select name="banda-inicial-${esc(id)}">${opcion('', '—', actual ?? '')}${bs.map((b) => opcion(b, b, actual)).join('')}</select></label>`,
                 )
                 .join('')}
               <p class="ayuda">Queda en el padrón del niño y se usa en todas sus sesiones de la fase 1 y del cierre (Protocolo 3.2). La regla para elegirla está pendiente de decisión clínica (pendientesClinicos de cada ficha).</p>
             </fieldset>`
          : ''
      }
      <fieldset class="participacion">
        <legend>Participación en la sesión</legend>
        ${PARTICIPACION.map(
          (n) =>
            `<label class="ancla"><input type="radio" name="participacion" value="${n}" ${String(n) === String(previo.participacion) ? 'checked' : ''}><span><strong>${n} ${esc(ANCLAS_PARTICIPACION[n][0])}.</strong> ${esc(ANCLAS_PARTICIPACION[n][1])}.</span></label>`,
        ).join('')}
        <p class="ayuda">Escala de participación de Pittsburgh (PRPS) adaptada, de 1 a 6 (Lenze et al., 2004).</p>
      </fieldset>
      <fieldset>
        <legend>Episodios de desregulación</legend>
        <p class="ayuda">${esc(CRITERIO_EPISODIO)}</p>
        ${
          marcados.length
            ? marcados
                .map(
                  (m, i) =>
                    `<label class="casilla"><input type="checkbox" name="confirmado" value="${i}" ${confirmado(i) ? 'checked' : ''}> Confirmo el episodio marcado a las ${esc(hora(m.hora))}${m.bloque ? ` (bloque ${m.bloque}${m.ensayo ? `, ensayo ${m.ensayo}` : ''})` : ''}</label>`,
                )
                .join('')
            : '<p class="meta">No se marcó ningún episodio durante la sesión.</p>'
        }
        <label>Episodios que no se marcaron durante la sesión
          <input type="number" name="no_marcados" min="0" step="1" inputmode="numeric" value="${esc(previo.episodios_no_marcados ?? 0)}"></label>
      </fieldset>
      <fieldset>
        <legend>Eventos adversos</legend>
        <p class="ayuda">Cualquier suceso desfavorable para el niño durante la sesión o en las 24 horas siguientes que se relacione con ella (Protocolo 8.1). Un evento grave se comunica al investigador responsable en menos de 24 horas.</p>
        <div id="eventos">${(previo.eventos_adversos ?? []).map((e, i) => eventoHTML(i, { actividades, bandas, e })).join('')}</div>
        <div class="acciones"><button type="button" id="agregar-evento">Agregar un evento adverso</button></div>
      </fieldset>
      ${
        fase3
          ? `<fieldset>
               <legend>Panel (fase 3)</legend>
               <fieldset class="chips"><legend>¿Consultaste el panel?</legend>${radio('consulto_panel', 'si', 'Sí', previo.consulto_panel === true ? 'si' : previo.consulto_panel === false ? 'no' : '')}${radio('consulto_panel', 'no', 'No', previo.consulto_panel === true ? 'si' : previo.consulto_panel === false ? 'no' : '')}</fieldset>
               <fieldset class="chips"><legend>¿La información contribuyó a alguna decisión?</legend>${radio('decision', 'si', 'Sí', previo.decision_informada === true ? 'si' : previo.decision_informada === false ? 'no' : '')}${radio('decision', 'no', 'No', previo.decision_informada === true ? 'si' : previo.decision_informada === false ? 'no' : '')}</fieldset>
               <fieldset class="chips"><legend>Tipo de decisión</legend>${TIPOS_DECISION.map((t) => radio('tipo_decision', t, t[0].toUpperCase() + t.slice(1), previo.tipo_decision)).join('')}</fieldset>
             </fieldset>`
          : ''
      }
      <p class="mensaje" role="alert" id="registros-msg"></p>
      <div class="acciones">
        <button type="submit" class="primario">Guardar y terminar</button>
        <button type="button" id="despues">Completar después</button>
      </div>
      <p class="ayuda">Si los completas después, la sesión queda marcada como incompleta en «Sesiones» hasta hacerlo.</p>
    </form>`;
}

// Lo que se guarda en la fila de la sesión. completos: si se guardó con «Guardar y terminar».
export const filaRegistros = (reg, { completos, hora }) => ({ ...reg, registros_completos: Boolean(completos), registros_hora: hora });

// Sesión con un niño cuyos registros siguen pendientes (las demás no los piden).
export const registrosPendientes = (sesion) => sesion.registros_completos === false;

// Lee el formulario del DOM en el objeto que espera leerRegistros.
export function datosDelFormulario(form) {
  const fd = new FormData(form);
  const eventos = [...form.querySelectorAll('[data-evento]')].map((f) => {
    const i = f.dataset.evento;
    const v = (k) => fd.get(`ev-${k}-${i}`) ?? '';
    return { hora: v('hora'), descripcion: v('descripcion'), actividad: v('actividad'), banda: v('banda'), duracion_min: v('duracion'), medidas: v('medidas'), gravedad: v('gravedad'), relacion: v('relacion') };
  });
  return {
    participacion: fd.get('participacion') ?? '',
    confirmados: fd.getAll('confirmado').map(Number),
    no_marcados: fd.get('no_marcados') ?? '',
    eventos,
    consulto_panel: fd.get('consulto_panel') ?? '',
    decision: fd.get('decision') ?? '',
    tipo_decision: fd.get('tipo_decision') ?? '',
    banda_inicial: Object.fromEntries([...fd.entries()].filter(([k]) => k.startsWith('banda-inicial-')).map(([k, v]) => [k.slice(14), v])),
  };
}
