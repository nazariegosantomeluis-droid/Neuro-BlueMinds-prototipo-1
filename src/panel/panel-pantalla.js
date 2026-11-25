// Pantalla del panel del terapeuta (#panel?nino=CÓDIGO&sesion=k). Dibuja lo que arma panel.js con
// los datos del dispositivo y guarda las marcas «coincide / no coincide» (H5.5). Funciona sin
// conexión: todo sale del registro local. El niño aparece por su ícono y su código abreviado.
import { esc, navHTML } from '../paginas.js';
import { iconoSVG } from '../ninos-pantalla.js';
import { nombreNino, abreviar } from '../ninos.js';
import { historialDelNino, historialHTML, sesionHTML, texto, marcaRegistro } from './panel.js';

// Código del ensayo de ACT-07 → regla (para las lecturas de la ficha).
const reglasDe = (items) => new Map(items.filter((i) => i.actividad === 'ACT-07' && i.ensayos).flatMap((i) => i.ensayos.map((e) => [e.codigo, e.regla])));

// ctx: { state, ensayos, sesiones, ninos, editSesion, params, auditar, resultados }. ensayos(): los
// del registro más el historial de los que ya salieron en un lote con recibo (decisión D6).
// resultados(codigo): los del entorno de análisis que trajo la configuración firmada.
export function renderPanel(app, { state, ensayos, sesiones, ninos, editSesion, params, auditar = () => {}, resultados = () => null }) {
  const plantillas = state.plantillas;
  const nino = ninos.rows().find((n) => n.codigo === params.get('nino'));
  const cabecera = `${navHTML('sesiones')}<h1 data-plantilla="ETQ-01">${esc(plantillas ? texto(plantillas, 'ETQ-01') : 'Panel del terapeuta')}</h1>`;
  if (!plantillas || !nino) {
    app.innerHTML = `<div class="adulto ancho panel-terapeuta">${cabecera}<p class="mensaje">${!plantillas ? 'No se pudieron cargar las plantillas del panel (src/panel/plantillas.json).' : 'Elige un niño desde «Niños inscritos».'}</p><div class="acciones"><a class="boton" href="#ninos">Niños inscritos</a></div></div>`;
    return;
  }
  const historial = historialDelNino({ codigo: nino.codigo, sesiones: sesiones.rows(), ensayos: ensayos(), fichas: state.fichas, items: state.items });
  const k = Number(params.get('sesion'));
  const enSesion = params.has('sesion') && Number.isInteger(k) && k >= 0 && k < historial.length;
  const base = `#panel?nino=${encodeURIComponent(nino.codigo)}`;
  const cuerpo = enSesion
    ? `${sesionHTML(plantillas, historial, k, { config: state.sesion, fichas: state.fichas, reglas: reglasDe(state.items), resultados: resultados(nino.codigo) })}
       <div class="acciones"><a class="boton" href="${esc(base)}" data-plantilla="ETQ-17">${esc(texto(plantillas, 'ETQ-17'))}</a></div>`
    : historialHTML(plantillas, historial, { config: state.sesion, fichas: state.fichas, enlace: (i) => `${base}&sesion=${i}` });
  app.innerHTML = `
    <div class="adulto ancho panel-terapeuta">
      ${cabecera}
      <div class="nino-celda">${iconoSVG(nino)}<span class="nino-nombre">${esc(nombreNino(nino))}</span> <strong>${esc(abreviar(nino.codigo))}</strong></div>
      <div class="panel" id="contenido">${cuerpo}</div>
      <p class="mensaje" role="status" data-panel-mensaje></p>
    </div>`;
  // Auditoría (Arquitectura 10.1): qué se mostró en el panel y cuándo (las plantillas usadas).
  auditar('panel', {
    codigo_nino: nino.codigo,
    sesion_id: enSesion ? historial[k].sesion.sesion_id : null,
    plantillas: [...new Set([...app.querySelectorAll('[data-plantilla]')].map((e) => e.dataset.plantilla))],
    version_plantillas: plantillas.version,
  });
  if (!enSesion) return;
  // Marca «coincide / no coincide con mi observación» (H5.5): un dato más de la sesión.
  const sesionId = historial[k].sesion.sesion_id;
  for (const b of app.querySelectorAll('[data-marca]')) {
    b.onclick = () => {
      const comentario = app.querySelector(`[data-comentario][data-actividad="${CSS.escape(b.dataset.actividad)}"][data-indicador="${CSS.escape(b.dataset.indicador)}"]`)?.value.trim() ?? '';
      const marca = marcaRegistro({ actividad: b.dataset.actividad, indicador: b.dataset.indicador, coincide: b.dataset.coincide === 'true', comentario, hora: new Date().toISOString() });
      editSesion(sesionId, (r) => (r.marcas_observacion = [...(r.marcas_observacion ?? []), marca]));
      for (const otro of app.querySelectorAll(`[data-marca][data-actividad="${CSS.escape(b.dataset.actividad)}"][data-indicador="${CSS.escape(b.dataset.indicador)}"]`)) otro.setAttribute('aria-pressed', String(otro === b));
      app.querySelector('[data-panel-mensaje]').textContent = texto(plantillas, 'PNL-09');
    };
  }
}
