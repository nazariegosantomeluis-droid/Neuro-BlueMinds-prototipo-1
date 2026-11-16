// Lo que el inicio muestra cuando el participante es un niño inscrito: la sesión completa que
// corresponde a su modo de fase (fases.js). El adulto no elige actividad, banda ni modalidad.
import { esc } from './html.js';
import { planDeSesion, bloqueFase2 } from './fases.js';
import { modoDe } from './ninos.js';

export const NOMBRE_MODO = { familiarizacion: 'Familiarización', fase1: 'Fase 1: medición estable', fase2: 'Fase 2: comparación de modalidades', fase3: 'Fase 3: uso con apoyo', cierre: 'Cierre' };
const MODALIDAD = { V: 'visual (V)', AV: 'con voz (AV)', mixta: 'V y AV mezcladas' };

// historial: modalidades que abrieron las sesiones de fase 2 anteriores del niño.
export function planNinoHTML({ nino, config, fichas, historial = [] }) {
  const modo = modoDe(nino);
  const fase2 = modo === 'fase2' ? { version: fichas[config.fase2.actividad]?.fase2?.version ?? 'protocolo', numero: historial.length + 1, primera: 'V' } : null;
  let plan;
  try {
    plan = planDeSesion({ modo, fichas, config, bandasNino: nino.bandas ?? {}, fase2 });
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
      <p class="ayuda">El modo de fase y la banda los fija el investigador en <a href="#ninos">Niños inscritos</a>. Entre actividades hay una transición de ${config.transicionMs / 1000} s; a los ${config.limiteMinutos} minutos no empieza otro bloque.</p>
    </div>`;
}
