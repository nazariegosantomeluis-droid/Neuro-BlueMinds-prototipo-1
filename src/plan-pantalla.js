// Lo que el inicio muestra cuando el participante es un niño inscrito: la sesión completa que
// corresponde a su modo de fase (fases.js). El adulto no elige actividad, banda ni modalidad.
import { esc } from './html.js';
import { selectorTemaHTML, TEMA_GENERAL } from './temas.js';
import { planDeSesion, bloqueFase2 } from './fases.js';
import { modoDe } from './ninos.js';

export const NOMBRE_MODO = { familiarizacion: 'Familiarización', fase1: 'Fase 1: medición estable', fase2: 'Fase 2: comparación de modalidades', fase3: 'Fase 3: uso con apoyo', cierre: 'Cierre' };
const MODALIDAD = { V: 'visual (V)', AV: 'con voz (AV)', mixta: 'V y AV mezcladas' };

// historial: modalidades que abrieron las sesiones de fase 2 anteriores del niño.
// En la familiarización, la banda que el terapeuta elige probar en cada actividad (Protocolo 3.2).
// datos: lo del formulario; los campos se llaman prueba-ACT-02, prueba-ACT-07.
export const leerBandasPrueba = (datos = {}) =>
  Object.fromEntries(Object.entries(datos).filter(([k, v]) => k.startsWith('prueba-') && v).map(([k, v]) => [k.slice(7), v]));

function probarBandasHTML(modo, config, fichas, bandasPrueba) {
  const ids = config.modos[modo]?.probarBandas ?? [];
  if (!ids.length) return '';
  return `
    <fieldset class="probar-bandas">
      <legend>Bandas para probar</legend>
      ${ids
        .map((id) => {
          const f = fichas[id];
          const actual = bandasPrueba[id] ?? f.bandas[0].id;
          return `<label>${esc(id)} ${esc(f.nombre)} <select name="prueba-${esc(id)}" data-probar>${f.bandas.map((b) => `<option ${b.id === actual ? 'selected' : ''}>${esc(b.id)}</option>`).join('')}</select></label>`;
        })
        .join('')}
      <p class="ayuda">La familiarización empieza en la banda mínima. Puedes probar otra para elegir la banda inicial de la fase 1, que fijas al cerrar la sesión (Protocolo 3.2). La regla para elegirla está pendiente de decisión clínica.</p>
    </fieldset>`;
}

export function planNinoHTML({ nino, config, fichas, historial = [], temas = null, tema = TEMA_GENERAL, bandasPrueba = {} }) {
  const modo = modoDe(nino);
  const fase2 = modo === 'fase2' ? { version: fichas[config.fase2.actividad]?.fase2?.version ?? 'protocolo', numero: historial.length + 1, primera: 'V' } : null;
  let plan;
  try {
    plan = planDeSesion({ modo, fichas, config, bandasNino: nino.bandas ?? {}, fase2, bandasPrueba });
  } catch (e) {
    return `<p class="mensaje">${esc(e.message)}</p>`;
  }
  const bloques = plan.filter((p) => p.tipo === 'bloque');
  const linea = (b) =>
    fase2 && b.actividad === config.fase2.actividad && b.modalidad !== 'mixta'
      ? `${esc(b.actividad)} ${esc(fichas[b.actividad].nombre)}: banda ${esc(b.banda)}, ${b.ensayos} ensayos en una modalidad (mitad ${esc(b.mitad)})`
      : `${esc(b.actividad)} ${esc(fichas[b.actividad].nombre)}: banda ${esc(b.banda)}, ${MODALIDAD[b.modalidad]}, ${b.ensayos} ensayos`;
  const notaFase2 = fase2
    ? `<p class="ayuda">Sesión ${fase2.numero} de la fase 2 (bloque ${bloqueFase2(fase2.numero, config.fase2.sesionesPorBloque)} del análisis), versión «${esc(fase2.version)}». La modalidad que abre se sortea al empezar, sin que una abra más de ${config.fase2.maxSeguidasMismaModalidad} sesiones seguidas.</p>`
    : '';
  return `
    <div class="plan-nino-cuerpo">
      <p><strong>Sesión completa</strong> · ${esc(NOMBRE_MODO[modo])}</p>
      <ol class="plan-pasos">
        <li>Rutina de inicio y referencia motora</li>
        ${bloques.map((b) => `<li>${linea(b)}</li>`).join('')}
        <li>Rutina de cierre y registros del terapeuta</li>
      </ol>
      ${notaFase2}
      ${probarBandasHTML(modo, config, fichas, bandasPrueba)}
      ${selectorTemaHTML(temas, tema, esc)}
      <p class="ayuda">El modo de fase y la banda los fija el investigador en <a href="#ninos">Niños inscritos</a>. Entre actividades hay una transición de ${config.transicionMs / 1000} s; a los ${config.limiteMinutos} minutos no empieza otro bloque.</p>
    </div>`;
}
