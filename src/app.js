// Aplicación: pantallas del adulto, sesión del niño y descarga del registro.
// El motor (src/engine) ejecuta la ficha; aquí solo se arma la sesión y se dibuja.
import { createLog, toCSV, toJSON, comoSeExporta, download, VERSION_APP, SESION_COLUMNS, SESION_KEY, REGISTRO_KEY } from './engine/logger.js';
import { pickItems, pickComposed, rng, seedOf, shuffle, disponibleEnSesion } from './engine/selector.js';
import { startBlock, NO_AUDIO_MSG } from './engine/trial.js';
import { browserEnv, eventTime } from './engine/clock.js';
import { createAudio } from './engine/audio.js';
import { marcarFueraDeTarea, paraExportar, frecuenciaSesion } from './engine/quality.js';
import { lineasDelBloque } from './resumen.js';
import { comprobarFrecuencia } from './frecuencia.js';
import { PANTALLAS, cargarCatalogo, requiereModoExperto } from './catalogo.js';
import { juegoDeSesion } from './activities/categorias.js';
import { elegirPorEmocion } from './activities/emociones.js';
import { esc, navHTML, marcaHTML, tituloHTML, chipHTML, renderGaleria, renderCreditos, renderCalibracion } from './paginas.js';
import { renderInicio as dibujarInicio, maxEnsayos, avisoDeAjuste } from './inicio.js';
import { muestraIndicadores, renderSesiones } from './sesiones.js';
import { pausaGuiada } from './pausa-guiada.js';
import { renderRevision } from './revision.js';
import { agregarEnlaceF3 } from './enlaces.js';
import { renderF3 } from './f3.js';
import { AVISO_VOZ_GRABADA } from './voz-grabada.js';
import { PAUSA_SOLO_EXPERTO, pausaGuiadaPermitida } from './pausa-permiso.js';
import { CLAVE_MODO_EXPERTO, fijarModoExperto, leerModoExperto, modoExpertoActivo } from './modo-experto.js';
import { crearMenu, ordenRegistro, menuHTML, mantenerPulsado } from './menu-terapeuta.js';
import { AVISO_SIN_REVISION, revisadaClinicamente } from './revision-estado.js';
import { NINO_KEY, NINO_COLUMNS, DEMO, participante } from './ninos.js';
import { renderNinos, confirmarNino } from './ninos-pantalla.js';
import { renderPanel } from './panel/panel-pantalla.js';
import { crearAlmacen, abrirIDB, memoriaIDB } from './almacen.js';
import { crearAuditoria, AUDITORIA_KEY, AUDITORIA_COLUMNS } from './auditoria.js';
import { renderBloqueo, crearInactividad, RUTAS_SIN_DATOS } from './bloqueo.js';
import { modoDe, fijarBanda } from './ninos.js';
import { rutinaInicioHTML, transicionHTML, cierreHTML } from './rutinas.js';
import { aplicarTema, temaPorId, TEMA_GENERAL } from './temas.js';
import { conSondas, conReapariciones, reaparicionesDeHoy, sesionesEnOrden, conceptoDeFila, codigoBase } from './sondas.js';
import { unidadesDominadas, criterioDe } from './indicadores/dominio.js';
import { VERSION_INDICADORES } from './indicadores/parametros.js';
import { calcularIndicadores, indicadoresCSV } from './indicadores/exportar.js';
import { lineaBaseRegulacion } from './adaptacion.js';
import { crearAdaptacionDeBloque } from './adaptacion-en-linea.js';
import { crearEnvolvente, huellaDeParametros } from './envolvente.js';
import { huellaDe } from './huella.js';
import { alertaDeSesion } from './alerta.js';
import { utilizable } from './indicadores/nucleo.js';
import { cargarVersion, textoVersion, versionActual } from './version.js';
import { registrosHTML, eventoHTML, episodiosMarcados, leerRegistros, faltantes, filaRegistros, datosDelFormulario } from './registros-terapeuta.js';
import { planDeSesion, primeraModalidadFase2, historialFase2, bloqueFase2, itemsDeMitad, limiteAlcanzado, decidirPaso, bandaAprobada, bandaPropuesta, siguePorEscalera, ensayosParaInclusion, avisoDeInclusion } from './fases.js';
import { planReferencia, iniciarReferencia } from './engine/referencia.js';
import * as referencia from './activities/referencia.js';
import { crearSalida, esDeNino, filtrarDescarga, SALIDA_KEY, HISTORIAL_KEY } from './transporte/salida.js';
import { crearTransporte, TRANSPORTE_DEL_PILOTO } from './transporte/index.js';
import { COLUMNAS_HISTORIAL } from './transporte/formato.js';

// Las actividades y el módulo que dibuja cada pantalla están en catalogo.js. Cada pantalla aporta
// toTrials (de ítems a ensayos) y createView (cómo se dibuja).
const PICTO_FIN = 'assets/picto/terminar.png';
// INV-8 (Arquitectura 7.4): al llegar a 15 minutos de uso no empieza un bloque nuevo.
const LIMITE_MSG = 'Se llegaron a los 15 minutos de uso de la sesión: se propone terminarla. No se puede empezar otro bloque (INV-8).';
// La regla de adaptación detectó una señal de regulación y ofrece una pausa (Modelo 9.2; Arquitectura 7.2).
const PAUSA_OFRECIDA_MSG = 'La plataforma ofrece una pausa: hubo una señal de regulación en los últimos 10 ensayos (más omisiones o respuestas prematuras de lo habitual, o una orden de malestar). Reanuda cuando el niño esté listo.';
const NIVELES_APOYO = ['ninguno', 'verbal', 'gestual', 'físico'];
const MODO_NOMBRE = { familiarizacion: 'Familiarización', fase1: 'Fase 1', fase2: 'Fase 2', fase3: 'Fase 3', cierre: 'Cierre' };

const ICONO_PAUSA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>';
const ICONO_ADULTO =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>';

const app = document.getElementById('app');
// Almacén cifrado (H6.2): los registros con datos de niños viven en IndexedDB, cifrados con la
// llave derivada del PIN del terapeuta. Sin IndexedDB (navegación privada estricta), en memoria.
const almacen = crearAlmacen({
  db: (() => {
    try {
      return globalThis.indexedDB ? abrirIDB() : memoriaIDB();
    } catch {
      return memoriaIDB();
    }
  })(),
  claves: [REGISTRO_KEY, SESION_KEY, NINO_KEY, AUDITORIA_KEY, HISTORIAL_KEY, SALIDA_KEY],
});
const log = createLog(almacen.storage);
// Una fila por sesión: inicio, fin, pausas, terminación anticipada y nivel de apoyo por bloque.
const sesiones = createLog(almacen.storage, { key: SESION_KEY, columns: SESION_COLUMNS });
// Si el adulto borró el registro durante la sesión, la fila ya no existe y no se cambia nada.
const editSesion = (id, fn) =>
  sesiones.edit((rows) => {
    const r = rows.find((x) => x.sesion_id === id);
    if (r) fn(r);
  });
// Padrón local de niños: solo código seudónimo, ícono, color, edad en meses y consentimiento.
const ninos = createLog(almacen.storage, { key: NINO_KEY, columns: NINO_COLUMNS });
// Registro de auditoría encadenado (H6.3; Arquitectura 10.1).
const registroAuditoria = createLog(almacen.storage, { key: AUDITORIA_KEY, columns: AUDITORIA_COLUMNS });
const auditoria = crearAuditoria(registroAuditoria);
const auditar = (tipo, datos) => (almacen.desbloqueado ? auditoria.agregar(tipo, datos) : null);
// Historial de los ensayos que ya salieron en un lote con recibo (decisión D6; Arquitectura 6.1 y
// 9.3): solo las columnas que usan el panel, la regla, las sondas y el dominio.
const historial = createLog(almacen.storage, { key: HISTORIAL_KEY, columns: COLUMNAS_HISTORIAL });
const recargarRegistros = () => [log, sesiones, ninos, registroAuditoria, historial].forEach((x) => x.recargar());
// Ensayos en la forma exportada (tiempos a 0.1 ms y fuera de tarea marcado) y, con ellos, el
// historial: lo que usan el panel, la regla de adaptación, las sondas y la auditoría.
const exportados = () => paraExportar(comoSeExporta(log.rows()), { sinTiempos: sinTiempos() });
const ensayosHistoricos = () => [...historial.rows(), ...exportados()];
// Salida de datos (decisión D6): lotes cifrados con la llave pública del investigador, recibos y
// configuración firmados. El transporte del piloto es «archivo» (src/transporte/index.js).
const transporte = crearTransporte(TRANSPORTE_DEL_PILOTO.tipo, { ...TRANSPORTE_DEL_PILOTO, descargar: download });
let salida = null; // se crea al cargar las llaves públicas (config/investigador.json)
const enEstudio = () => Boolean(salida?.estudio);
// En modo de estudio, lo que se descarga sin cifrar es solo lo ficticio (demostración y modo
// experto): los datos de los niños solo salen en lotes cifrados (Arquitectura 9.2).
const descargables = (rows) => filtrarDescarga(rows, enEstudio());
const audio = createAudio();
const state = {
  catalogo: [], // las 17 actividades del Catálogo, con su estado
  fichas: {}, // id → ficha válida
  pausa: null, // ficha de la pausa guiada (ACT-17), que no tiene ensayos
  problemas: {}, // id → problemas de la ficha (o del banco de ítems)
  items: [],
  conceptos: [],
  running: false, // hay un bloque en curso: la navegación no cambia de pantalla
  images: new Map(), // imágenes ya decodificadas
  session: null, // { id, codigo, bloque, usados: { [actividad]: Set } }
  last: null, // último bloque: { rows, ficha, banda, modalidad }
  form: {}, // últimas elecciones del inicio
};

const prefs = {
  get(k, fallback) {
    try {
      return localStorage.getItem(k) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      // sin almacenamiento: se usa el valor por defecto la próxima vez
    }
  },
};

// El cm de CSS no mide un centímetro real en tabletas. Se estima suponiendo una tableta
// de 10" (pantalla táctil) o un monitor de 96 ppp (computadora); la página de
// Calibración guarda el valor medido en el dispositivo.
const cm = {
  estimated: () =>
    matchMedia('(pointer: coarse)').matches ? Math.hypot(screen.width, screen.height) / (10 * 2.54) : 96 / 2.54,
  saved: () => Number(prefs.get('nbm.cm', '')) || null,
  set: (px) => document.documentElement.style.setProperty('--cm', `${px}px`),
};
const applyCm = () => cm.set(cm.saved() ?? cm.estimated());

const randomHex = () =>
  [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
// numero: sesiones iniciadas en este dispositivo; con él alternan las parejas de cajas de ACT-07.
// orden: por actividad, el orden de las dimensiones (por ejemplo, color y después forma).
// p es el resultado de participante(): las sesiones con niño empiezan con S-, las de demostración
// con DEMO- y las del modo experto con EXP-, para separarlas en el registro. valor es lo que se
// eligió en el inicio (el código del niño o DEMO).
const newSession = (p, valor) => ({
  id: `${p.prefijo}-${randomHex()}`,
  experto: p.tipo === 'experto',
  tipo: p.tipo,
  valor,
  nino: p.nino ?? null,
  codigo: p.codigo,
  bloque: 0,
  numero: Number(prefs.get('nbm.sesiones', '0')),
  usados: {},
  orden: {},
});
const dispositivo = () => `${navigator.userAgent} | ${screen.width}x${screen.height} @${devicePixelRatio}x`;
const volumen = () => Number(prefs.get('nbm.volumen', '80'));
// Actividades de respuesta «secuencia» (ACT-10 y ACT-16): sus tiempos entre toques no entran en
// «fuera de tarea» (Arquitectura 4.5).
const sinTiempos = () => Object.values(state.fichas).filter((f) => f.unidadDelBloque === 'secuencia').map((f) => f.id);

async function init() {
  // H8.5 (MASVS-PLATFORM-3): la aplicación no corre dentro de un marco de otra página (protege
  // contra el «clickjacking»; la cabecera frame-ancestors no se puede declarar en una página estática).
  if (window.top !== window.self) {
    app.innerHTML = '<p class="aviso" role="alert">AutiPal no se puede abrir dentro de otra página. Ábrelo directamente.</p>';
    return;
  }
  // Aplicación instalable que funciona sin conexión (H6.1): el trabajador de servicio guarda los
  // archivos de la aplicación (nunca datos de niños).
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  applyCm();
  audio.setVolume(volumen() / 100);
  // Versión y commit publicados: en el pie de las pantallas del adulto y en los CSV del F3 y de
  // la revisión clínica. El pie no se ve en la pantalla del niño (styles.css).
  cargarVersion().then((v) => {
    const pie = document.getElementById('pie-version');
    if (pie) pie.textContent = textoVersion(v);
  });
  const { catalogo, fichas, pausa, problemas } = await cargarCatalogo();
  Object.assign(state, { catalogo, fichas, pausa });
  Object.assign(state.problemas, problemas);
  try {
    state.items = (await (await fetch('items/items.json')).json()).items;
    state.conceptos = (await (await fetch('items/conceptos.json')).json()).conceptos;
    state.revision = await (await fetch('items/revision.json')).json();
  } catch {
    state.problemas.items = ['No se pudo cargar el banco de ítems (items/items.json, items/conceptos.json o items/revision.json).'];
  }
  // Estructura de la sesión con un niño (Catálogo 7.1, Arquitectura 14): sin ella solo hay bloques sueltos.
  try {
    state.sesion = await (await fetch('fichas/sesion.json')).json();
  } catch {
    state.problemas.sesion = ['No se pudo cargar la estructura de la sesión (fichas/sesion.json).'];
  }
  // Plantillas del panel del terapeuta (H5.3): sin ellas, el panel no muestra nada.
  try {
    state.plantillas = await (await fetch('src/panel/plantillas.json')).json();
  } catch {
    state.plantillas = null;
  }
  // Llaves públicas del investigador responsable (decisión D6): cifrar lotes y comprobar recibos y
  // configuración. Sin ellas no se puede exportar.
  try {
    state.llaves = await (await fetch('config/investigador.json')).json();
    salida = crearSalida({
      storage: almacen.storage,
      log,
      historial,
      sesiones,
      auditoria,
      ninos,
      llaves: { cifrado: state.llaves.cifrado, firma: state.llaves.firma },
      transporte,
      exportables: exportados,
      enCurso: () => state.session?.id ?? null,
      version: () => versionActual(),
    });
  } catch {
    state.llaves = null;
    state.problemas.llaves = ['No se pudieron cargar las llaves públicas del investigador (config/investigador.json): no se puede exportar.'];
  }
  // Temas de imágenes (Arquitectura 4.8): sin el archivo, todas las sesiones usan «general».
  try {
    state.temas = await (await fetch('fichas/temas.json')).json();
  } catch {
    state.temas = null;
  }
  // El banco de las actividades de uso posterior va aparte: si falta, el piloto sigue funcionando.
  try {
    state.items = [...state.items, ...(await (await fetch('items/items-posteriores.json')).json()).items];
  } catch {
    state.problemas.posteriores = ['No se pudo cargar el banco de las actividades de uso posterior (items/items-posteriores.json).'];
  }
  // «Saltar al contenido» lleva el foco al título de la pantalla sin cambiar la ruta.
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('a.saltar')) return;
    e.preventDefault();
    enfocarTitulo();
  });
  // Modo experto de la aplicación: apagado por defecto; el interruptor está en el encabezado.
  fijarModoExperto(leerModoExperto(prefs));
  document.addEventListener('change', (e) => {
    if (!e.target.matches?.('[data-modo-experto]')) return;
    fijarModoExperto(e.target.checked);
    prefs.set(CLAVE_MODO_EXPERTO, e.target.checked ? '1' : '0');
    route();
  });
  addEventListener('hashchange', route);
  route();
}

// PIN del terapeuta (H6.2): crearlo la primera vez (con los registros sin cifrar de versiones
// anteriores, que pasan al almacén cifrado) o escribirlo para desbloquear.
async function pedirPin(mensaje = '') {
  const configurado = await almacen.configurado();
  renderBloqueo(app, {
    configurado,
    mensaje,
    alCrear: async (pin) => {
      try {
        let previo = null;
        try {
          previo = globalThis.localStorage ?? null;
        } catch {
          previo = null;
        }
        await almacen.crearPin(pin, { previo });
      } catch (e) {
        return e.message;
      }
      recargarRegistros();
      inactividad.tocar();
      route();
      return null;
    },
    alDesbloquear: async (pin) => {
      const espera = await almacen.espera();
      if (espera > 0) return `Demasiados intentos. Espera ${Math.ceil(espera / 1000)} s antes de volver a intentarlo.`;
      if (!(await almacen.desbloquear(pin))) {
        const despues = await almacen.espera();
        return despues > 0 ? `PIN incorrecto. Demasiados intentos: espera ${Math.ceil(despues / 1000)} s.` : 'PIN incorrecto.';
      }
      recargarRegistros();
      const cadena = auditoria.verificar();
      inactividad.tocar();
      route();
      if (!cadena.ok) avisoAuditoria(cadena);
      return null;
    },
  });
}

// Si la cadena de auditoría no cuadra al desbloquear, se avisa (Arquitectura 10.1).
function avisoAuditoria(cadena) {
  const p = document.createElement('p');
  p.className = 'aviso';
  p.setAttribute('role', 'alert');
  p.textContent = `El registro de auditoría de este dispositivo no cuadra desde la entrada ${cadena.rota_en}: ${cadena.motivo}. Avisa al investigador responsable.`;
  app.prepend(p);
}

// Bloqueo tras 5 minutos sin uso del adulto; nunca con la pantalla del niño a la vista.
const inactividad = crearInactividad({
  puedeBloquear: () => almacen.desbloqueado && !state.running && !app.querySelector('.nino'),
  alBloquear: async () => {
    await almacen.bloquear();
    recargarRegistros();
    pedirPin('Se bloqueó tras 5 minutos sin uso.');
  },
});
for (const tipo of ['pointerdown', 'keydown']) addEventListener(tipo, () => inactividad.tocar(), { capture: true, passive: true });
// Revisa cada 15 s (con setTimeout: RNF-05 no permite temporizadores repetidos en la interfaz).
const vigilarInactividad = () => {
  inactividad.revisar();
  setTimeout(vigilarInactividad, 15000);
};
setTimeout(vigilarInactividad, 15000);

// Al cambiar de pantalla, el foco pasa al título (para lectores de pantalla) sin mover la vista.
function enfocarTitulo() {
  const h1 = app.querySelector('h1');
  if (!h1) return;
  h1.tabIndex = -1;
  h1.focus({ preventScroll: true });
}

// Rutas: #inicio, #galeria (con filtros: #galeria?actividad=ACT-02&banda=B3), #sesiones, #revision, #formulario (F3),
// #ninos (padrón), #panel?nino=CÓDIGO&sesion=k (panel del terapeuta), #creditos, #calibracion y #pausa (la pausa guiada).
// Cambiar un filtro de la galería no es cambiar de pantalla: ahí el foco se queda en el filtro.
let rutaAnterior = null;
function route() {
  if (state.running) return; // durante un bloque solo se sale con la pausa
  const [ruta, query = ''] = location.hash.slice(1).split('?');
  // Las pantallas con registros de niños piden el PIN (H6.2).
  if (!almacen.desbloqueado && !RUTAS_SIN_DATOS.has(ruta)) return pedirPin();
  if (ruta === 'galeria' && !state.problemas.items) {
    renderGaleria(app, state, new URLSearchParams(query));
    agregarEnlaceF3(app);
  } else if (ruta === 'sesiones') renderSesiones(app, { state, log, sesiones, padron: ninos.rows(), registroHTML, bindRegistro, completarRegistros: (id) => renderRegistros(id, { volver: 'sesiones' }), ensayos: ensayosHistoricos, puedeDescargar: (id) => !enEstudio() || !esDeNino(id) });
  else if (ruta === 'pausa' && state.pausa && modoExpertoActivo()) renderPausa();
  else if (ruta === 'revision' && !state.problemas.items) renderRevision(app, state);
  else if (ruta === 'formulario' && !state.problemas.items) renderF3(app, state);
  else if (ruta === 'ninos') renderNinos(app, { ninos, fichas: state.fichas, estudio: enEstudio() ? salida.estado().configuracion : null });
  else if (ruta === 'panel') renderPanel(app, { state, ensayos: ensayosHistoricos, sesiones, ninos, editSesion, auditar, params: new URLSearchParams(query), resultados: (codigo) => salida?.estado().configuracion?.resultados?.[codigo] ?? null });
  else if (ruta === 'creditos') renderCreditos(app, state);
  else if (ruta === 'calibracion') {
    renderCalibracion(app, {
      estimated: cm.estimated(),
      saved: cm.saved(),
      preview: cm.set,
      save: (px) => prefs.set('nbm.cm', String(px)),
      reset: () => {
        prefs.set('nbm.cm', '');
        applyCm();
      },
    });
  } else renderInicio();
  scrollTo(0, 0);
  if (rutaAnterior !== null && ruta !== rutaAnterior) enfocarTitulo();
  rutaAnterior = ruta;
}

// ---------- Inicio ----------

// Aviso del inicio mientras la ficha elegida no tenga revisión clínica registrada (Arquitectura 4.4).
const avisoSinRevision = (ficha) => (!revisadaClinicamente(ficha) ? AVISO_SIN_REVISION : '');

// La pantalla de inicio se dibuja en inicio.js; aquí está lo que necesita de la aplicación.
const renderInicio = (msg = '') =>
  dibujarInicio(
    app,
    {
      state,
      volumen,
      calibrada: cm.saved() !== null,
      padron: () => ninos.rows(),
      avisoSinRevision,
      registroHTML,
      bindRegistro,
      bindVolumen,
      cerrarSesion,
      empezar: start,
      empezarSesion,
      historialFase2: (codigo) => historialFase2(sesiones.rows(), codigo),
      desbloquearAudio: () => audio.unlock(),
    },
    msg,
  );

function bindVolumen(root) {
  for (const r of root.querySelectorAll('[data-volumen]')) {
    const valor = r.closest('label')?.querySelector('[data-volumen-valor]');
    r.oninput = () => {
      prefs.set('nbm.volumen', r.value);
      audio.setVolume(r.value / 100);
      if (valor) valor.textContent = `${r.value} %`;
    };
  }
}

// ---------- Registro ----------

// Borrar va aparte de las descargas; cada descarga confirma con el nombre del archivo.
// enlaceSesiones: en la página «Sesiones» el enlace a ella misma no se muestra.
// Modo de estudio (decisión D6; Arquitectura 9.2): las descargas sin cifrar solo llevan lo ficticio
// (demostración y modo experto); los datos de los niños salen solo en lotes cifrados.
function registroHTML({ enlaceSesiones = true } = {}) {
  const n = log.rows().length;
  const estudio = enEstudio();
  const ficticias = descargables(log.rows()).length;
  const off = (estudio ? ficticias : n) ? '' : 'disabled';
  const de = estudio ? ' de demostración' : '';
  const cuenta = n ? `${n === 1 ? '1 ensayo guardado' : `${n} ensayos guardados`} en este dispositivo.` : 'Todavía no hay ensayos guardados en este dispositivo.';
  return `
    <section class="panel registro" aria-labelledby="registro-titulo">
      <h2 id="registro-titulo">Registro</h2>
      <p class="meta${n ? '' : ' vacio-registro'}">${cuenta} ${estudio ? 'Los datos de los niños solo salen cifrados, en un lote para el investigador responsable.' : 'Nada se envía a ningún servidor.'}</p>
      ${log.stored && !almacen.error ? '' : '<p class="mensaje" role="alert">No se pudo guardar en el dispositivo. Exporta o descarga el registro antes de cerrar esta página.</p>'}
      <div class="acciones">
        <button type="button" data-descargar="csv" ${off}>Descargar registro${de} (CSV)</button>
        <button type="button" data-descargar="json" ${off}>Descargar registro${de} (JSON)</button>
        <button type="button" data-descargar="sesiones" ${off}>Descargar sesiones${de} (CSV)</button>
        <button type="button" data-descargar="sesiones-json" ${off}>Descargar sesiones${de} (JSON)</button>
        <button type="button" data-descargar="indicadores" ${off}>Descargar indicadores${de} (CSV)</button>
        ${estudio ? '' : `<button type="button" data-descargar="auditoria" ${registroAuditoria.rows().length ? '' : 'disabled'}>Descargar auditoría (JSON)</button>`}
      </div>
      <p class="meta estado" role="status"></p>
      ${n && enlaceSesiones ? '<p class="meta"><a href="#sesiones">Ver sesión por sesión</a></p>' : ''}
      <div class="acciones acciones-aparte">
        <button type="button" class="peligro" data-borrar ${off}>${estudio ? 'Borrar los datos de demostración' : 'Borrar registro'}</button>
      </div>
    </section>
    ${salidaHTML()}`;
}

const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'nunca');

// Salida de datos (decisión D6): exportar un lote cifrado y cargar recibos o la configuración.
function salidaHTML() {
  if (!salida) return state.problemas.llaves ? `<section class="panel salida"><h2>Salida de datos</h2><p class="mensaje">${esc(state.problemas.llaves[0])}</p></section>` : '';
  const e = salida.estado();
  const p = salida.porExportar();
  const aviso = salida.aviso();
  const c = e.configuracion;
  return `
    <section class="panel salida" aria-labelledby="salida-titulo">
      <h2 id="salida-titulo">Salida de datos</h2>
      <p class="meta" data-modo-tableta>${c ? `<strong>Modo de estudio</strong>: configuración ${esc(c.numero)} del investigador responsable.` : '<strong>Prototipo</strong>: sin configuración del investigador responsable.'}</p>
      ${state.llaves?.prueba ? '<p class="aviso" data-llaves-prueba>Llaves de prueba del investigador: no exportes datos reales con esta versión.</p>' : ''}
      ${aviso ? `<p class="aviso" role="alert" data-aviso-exportar>Pasaron ${aviso.dias} días sin exportar y hay datos de niños sin recibo del investigador. Exporta un lote y entrégalo; si el navegador borrara los datos del sitio, se perderían.</p>` : ''}
      <p class="meta">Por exportar: ${p.ensayos} ensayos de ${p.sesiones} sesiones de niños. Lotes sin recibo: ${e.pendientes.length}. Última exportación: ${esc(fechaCorta(e.ultima_exportacion))}.</p>
      <div class="acciones">
        <button type="button" class="primario" data-exportar ${p.ensayos || p.sesiones ? '' : 'disabled'}>Exportar lote cifrado</button>
        <label class="boton archivo">Cargar recibo o configuración<input type="file" accept=".json,application/json" data-cargar hidden></label>
      </div>
      <p class="ayuda">El lote va cifrado para el investigador responsable: esta tableta no lo puede abrir. Los ensayos se borran de la tableta solo al cargar el recibo firmado de ese lote.</p>
      <p class="meta" role="status" data-salida-estado></p>
    </section>`;
}

function bindRegistro(root, rerender) {
  const estado = root.querySelector('.estado');
  for (const b of root.querySelectorAll('[data-descargar]')) {
    b.onclick = () => {
      const tipo = b.dataset.descargar;
      const fecha = new Date().toISOString().slice(0, 10); // solo para el nombre del archivo
      const pre = enEstudio() ? 'demostracion' : 'registro';
      const filas = descargables(log.rows());
      const deSesiones = descargables(sesiones.rows());
      let nombre;
      if (tipo === 'json') download((nombre = `${pre}-neuro-blueminds-${fecha}.json`), toJSON(paraExportar(filas, { sinTiempos: sinTiempos() })), 'application/json');
      else if (tipo === 'csv') download((nombre = `${pre}-neuro-blueminds-${fecha}.csv`), toCSV(paraExportar(filas, { sinTiempos: sinTiempos() })), 'text/csv;charset=utf-8');
      else if (tipo === 'indicadores') {
        // Se calculan al descargar, desde el registro (con fuera_de_tarea provisional en una sesión abierta).
        const entrada = paraExportar(filas, { sinTiempos: sinTiempos() });
        const indicadores = calcularIndicadores(entrada, deSesiones, { fichas: state.fichas, items: state.items });
        auditar('indicadores', { sesion_id: null, version_indicadores: VERSION_INDICADORES, huella_entrada: huellaDe({ ensayos: entrada, sesiones: deSesiones.map((x) => x.sesion_id) }), filas: indicadores.length, huella_resultado: huellaDe(indicadores) });
        download((nombre = `indicadores-neuro-blueminds-${fecha}.csv`), indicadoresCSV(indicadores), 'text/csv;charset=utf-8');
      } else if (tipo === 'sesiones-json') {
        // Para tools/reproducir.mjs (Arquitectura 10.2): las sesiones con sus tipos, sin pasar por CSV.
        download((nombre = `sesiones-neuro-blueminds-${fecha}.json`), toJSON(deSesiones), 'application/json');
      } else if (tipo === 'auditoria') {
        if (enEstudio()) return;
        // La cadena entera, con su verificación: cualquiera puede volver a comprobarla (H6.3).
        download((nombre = `auditoria-neuro-blueminds-${fecha}.json`), JSON.stringify({ verificacion: auditoria.verificar(), entradas: auditoria.entradas() }, null, 2), 'application/json');
      } else download((nombre = `sesiones-neuro-blueminds-${fecha}.csv`), toCSV(deSesiones, SESION_COLUMNS), 'text/csv;charset=utf-8');
      if (estado) estado.textContent = `Se descargó ${nombre}.`;
    };
  }
  const borrar = root.querySelector('[data-borrar]');
  if (borrar) {
    borrar.onclick = () => {
      if (enEstudio()) {
        // En modo de estudio solo se borra lo ficticio: los datos de los niños salen en lotes y se
        // borran solo con su recibo.
        if (!confirm('¿Borrar los datos de la demostración y del modo experto de este dispositivo?')) return;
        const quedan = (rows) => rows.filter((r) => esDeNino(r.sesion_id) || r.sesion_id === state.session?.id);
        auditar('borrado', { ensayos: log.rows().length - quedan(log.rows()).length, sesiones: sesiones.rows().length - quedan(sesiones.rows()).length, solo_ficticios: true });
        log.edit((all) => all.splice(0, all.length, ...quedan(all)));
        sesiones.edit((all) => all.splice(0, all.length, ...quedan(all)));
        rerender();
        return;
      }
      if (confirm('¿Borrar todo el registro guardado en este dispositivo? Descárgalo antes si lo necesitas.')) {
        // El registro de auditoría no se borra: queda la entrada del borrado (Arquitectura 10.1).
        auditar('borrado', { ensayos: log.rows().length, sesiones: sesiones.rows().length });
        log.clear();
        sesiones.clear();
        rerender();
      }
    };
  }
  bindSalida(root, rerender);
}

function bindSalida(root, rerender) {
  const estado = root.querySelector('[data-salida-estado]');
  const decir = (t) => {
    if (estado) estado.textContent = t;
  };
  const exportar = root.querySelector('[data-exportar]');
  if (exportar) {
    exportar.onclick = async () => {
      exportar.disabled = true;
      try {
        const r = await salida.exportar();
        await almacen.listo();
        rerender();
        root.querySelector('[data-salida-estado]').textContent = `Lote ${r.lote_id.slice(-8)} exportado (${r.ensayos} ensayos de ${r.sesiones} sesiones). Entrégalo al investigador responsable; sus ensayos se borran de la tableta cuando cargues su recibo.`;
      } catch (err) {
        decir(err.message);
        exportar.disabled = false;
      }
    };
  }
  const cargar = root.querySelector('[data-cargar]');
  if (cargar) {
    cargar.onchange = async () => {
      const archivo = cargar.files?.[0];
      if (!archivo) return;
      try {
        transporte.depositar(await archivo.text());
        const rs = await salida.recibir();
        await almacen.listo(); // lo escrito queda cifrado en el dispositivo antes de avisar
        recargarRegistros();
        rerender();
        const t = rs.map((r) => (r.tipo === 'recibo' ? (r.repetido ? 'Ese recibo ya se había cargado.' : `Recibo cargado: se borraron ${r.borrados} ensayos que el investigador ya tiene.`) : `Configuración ${r.numero} cargada: ${r.ninos} niños. La tableta está en modo de estudio.`)).join(' ');
        root.querySelector('[data-salida-estado]').textContent = t;
      } catch (err) {
        decir(err.message);
      } finally {
        cargar.value = '';
      }
    };
  }
}

// ---------- Sesión ----------

// Al cerrar la sesión, fuera_de_tarea se calcula una sola vez y queda definitivo.
function cerrarSesion() {
  const id = state.session.id;
  log.edit((all) => marcarFueraDeTarea(all.filter((r) => r.sesion_id === id), false, { sinTiempos: sinTiempos() }));
  state.session = null;
}

async function preloadImages(srcs) {
  await Promise.all(
    [...new Set(srcs)]
      .filter((src) => !state.images.has(src))
      .map(async (src) => {
        const img = new Image();
        img.src = src;
        try {
          await img.decode();
        } catch {
          throw new Error(`No se pudo cargar la imagen ${src}.`);
        }
        state.images.set(src, img);
      }),
  );
}

async function start(form) {
  const antes = state.form;
  const f = (state.form = Object.fromEntries(new FormData(form)));
  const ficha = state.fichas[f.actividad];
  // Sin el modo experto de la aplicación, solo las actividades del piloto.
  if (!modoExpertoActivo() && requiereModoExperto(ficha)) return renderInicio('Esta actividad solo se abre con el modo experto encendido.');
  const banda = ficha.bandas.find((b) => b.id === f.banda) ?? ficha.bandas[0];
  const pantalla = PANTALLAS[ficha.pantalla];
  const n = Math.min(maxEnsayos(ficha, banda), Math.max(1, Math.floor(Number(f.ensayos)) || ficha.ensayosPorBloque));
  // Las actividades de uso posterior no se usan con niños: su sesión siempre es de demostración y en
  // modo experto. Esos dos controles van desactivados y no llegan en el formulario: se conserva lo elegido.
  const forzado = requiereModoExperto(ficha);
  if (forzado) Object.assign(f, { experto: antes.experto, participante: antes.participante });
  if (forzado && state.session && !state.session.experto) {
    return renderInicio('Esta actividad solo se abre en modo experto. Termina la sesión en curso y vuelve a intentarlo.');
  }
  // Quién participa se comprueba en cada bloque: si el consentimiento dejó de estar vigente, no se
  // inicia (Arquitectura 9.6). En una sesión en curso vale el participante con que empezó.
  const valor = state.session ? state.session.valor : forzado ? DEMO : f.participante;
  const p = participante(valor, state.session ? state.session.experto : forzado || f.experto === '1', ninos.rows());
  if (p.error) return renderInicio(p.error);
  // R6: el terapeuta confirma el ícono y el color antes del primer bloque de una sesión con niño.
  if (!state.session && p.tipo === 'nino' && !(await confirmarNino(app, p.nino))) return renderInicio();
  // La sesión empieza con su primer bloque; hasta entonces no existe.
  const s = state.session ?? newSession(p, valor);
  // INV-8: al llegar a 15 minutos de uso no empieza un bloque nuevo.
  if (state.session && s.inicioMs !== undefined && limiteAlcanzado(s.inicioMs, performance.now(), state.sesion?.limiteMinutos ?? 15)) {
    return renderInicio(LIMITE_MSG);
  }
  let preparado;
  try {
    preparado = await prepararBloque({ ficha, banda, modalidad: f.modalidad, n, s });
  } catch (e) {
    return renderInicio(e.message);
  }
  const { trials, usados } = preparado;
  if (f.modalidad === 'AV' && !(await audio.available(trials.map((t) => t.consigna.audio)))) {
    return renderInicio(NO_AUDIO_MSG);
  }
  // ACT-15 requiere la voz grabada: con la del navegador solo se abre después de un aviso, y sus
  // ensayos quedan como fallo técnico (el motor nunca los deja como válidos).
  if (f.modalidad === 'AV' && ficha.requiereVozGrabada && !(await audio.grabada(trials.map((t) => t.consigna.audio)))) {
    if (!(await confirmarVozGrabada())) return renderInicio();
  }
  // Si las opciones no caben a su tamaño mínimo, el adulto decide si sigue.
  const ajuste = avisoDeAjuste(ficha, banda);
  if (ajuste && !(await confirmarPantalla(ajuste))) return renderInicio();
  const { periodo, advertencia } = await comprobarFrecuencia(app);
  history.replaceState(null, '', '#inicio'); // al terminar el bloque se vuelve al inicio
  if (!state.session) {
    state.session = s;
    s.inicioMs = performance.now(); // reloj del límite de 15 minutos (INV-8)
    prefs.set('nbm.sesiones', String(s.numero + 1));
    // Fecha y hora (ISO 8601 en UTC, con «Z») solo para identificar la sesión; las duraciones
    // se miden con performance.now().
    sesiones.add({
      sesion_id: s.id, codigo_nino: s.codigo, dispositivo: dispositivo(), inicio: new Date().toISOString(),
      ensayos: 0, pausas: [], terminada_antes: false, nivel_apoyo: [], version_indicadores: VERSION_INDICADORES, advertencia_frecuencia: false,
    });
  }
  if (advertencia) editSesion(s.id, (r) => (r.advertencia_frecuencia = true));
  // Referencia motora (RF-03): al inicio de cada sesión con niño o de demostración, no en el modo experto.
  if (!s.referenciaHecha && s.tipo !== 'experto') {
    s.referenciaHecha = true;
    const ref = await ejecutarReferencia(s, periodo);
    if (ref.terminada) {
      editSesion(s.id, (r) => (r.fin = new Date().toISOString()));
      cerrarSesion();
      return renderInicio();
    }
  }
  s.bloque++;
  await runBlock({ ficha, banda, modalidad: f.modalidad, trials, s, usados, pantalla, periodo });
}

// ---------- Sesión con un niño (H2.3 y Catálogo 7.1) ----------

// Con un niño, la sesión sigue un plan fijo según su modo de fase: referencia motora, ACT-02 y
// ACT-07 (en la familiarización, antes ACT-01). Todos los bloques se preparan antes de empezar, para
// que la sesión no se detenga entre uno y otro. El adulto no elige actividad, banda ni modalidad.
async function empezarSesion(form) {
  state.form = { ...state.form, ...Object.fromEntries(new FormData(form)) };
  const cfg = state.sesion;
  if (!cfg) return renderInicio(state.problemas.sesion?.[0] ?? 'Falta la estructura de la sesión.');
  const p = participante(state.form.participante, false, ninos.rows());
  if (p.error) return renderInicio(p.error);
  if (p.tipo !== 'nino') return renderInicio('La sesión completa es solo con un niño inscrito.');
  if (!(await confirmarNino(app, p.nino))) return renderInicio();
  const modo = modoDe(p.nino);
  const s = Object.assign(newSession(p, state.form.participante), { modo, tema: temaPorId(state.temas, state.form.tema)?.id ?? TEMA_GENERAL });
  // Fase 2: número de sesión, bloque del análisis y modalidad que abre (sorteada, Protocolo 3.3).
  let fase2 = null;
  if (modo === 'fase2') {
    const previas = historialFase2(sesiones.rows(), p.codigo);
    const version = state.fichas[cfg.fase2.actividad]?.fase2?.version ?? 'protocolo';
    const primera = primeraModalidadFase2(previas, rng(seedOf(`${s.id}:fase2`)), cfg.fase2.maxSeguidasMismaModalidad);
    fase2 = { version, numero: previas.length + 1, primera };
  }
  let plan;
  try {
    plan = planDeSesion({ modo, fichas: state.fichas, config: cfg, bandasNino: p.nino.bandas ?? {}, fase2 });
  } catch (e) {
    return renderInicio(e.message);
  }
  const bloques = [];
  // Escalera de la familiarización (decisión R6): un bloque de 10 ensayos por banda, preparados desde
  // el principio (para comprobar el audio); se ejecutan mientras el niño apruebe.
  const escaleras = new Map();
  try {
    let k = 0;
    for (const paso of plan.filter((x) => x.tipo === 'bloque' || x.tipo === 'escalera')) {
      const ficha = state.fichas[paso.actividad];
      if (paso.tipo === 'escalera') {
        const peldanos = [];
        for (const id of paso.bandas) {
          const banda = ficha.bandas.find((b) => b.id === id);
          s.bloque = k++;
          // Decisión R6b: un peldaño puede tener su propia composición (B2 de ACT-07: 5 + 5).
          const composicion = paso.composicion?.[id] ?? null;
          peldanos.push({ paso: { ...paso, banda: id, ensayos: paso.ensayosPorBanda }, ficha, banda, ...(await prepararBloque({ ficha, banda, modalidad: paso.modalidad, n: paso.ensayosPorBanda, s, composicion })) });
        }
        escaleras.set(paso.actividad, peldanos);
        continue;
      }
      const banda = ficha.bandas.find((b) => b.id === paso.banda);
      s.bloque = k++; // semilla de cada bloque, como en los bloques sueltos
      const preparado = await prepararBloque({ ficha, banda, modalidad: paso.modalidad, n: paso.ensayos, s, mitad: paso.mitad ?? null, mitades: paso.mitades ?? null });
      bloques.push({ paso, ficha, banda, ...preparado });
    }
  } catch (e) {
    return renderInicio(e.message);
  } finally {
    s.bloque = 0;
  }
  const todos = [...bloques, ...[...escaleras.values()].flat()];
  const conAudio = todos.flatMap((b) => b.trials.filter((t) => (t.modalidad ?? b.paso.modalidad) === 'AV').map((t) => t.consigna.audio));
  if (conAudio.length && !(await audio.available(conAudio))) return renderInicio(NO_AUDIO_MSG);
  for (const b of todos) {
    const ajuste = avisoDeAjuste(b.ficha, b.banda);
    if (ajuste && !(await confirmarPantalla(ajuste))) return renderInicio();
  }
  const { periodo, advertencia } = await comprobarFrecuencia(app);
  history.replaceState(null, '', '#inicio');
  state.session = s;
  s.inicioMs = performance.now();
  prefs.set('nbm.sesiones', String(s.numero + 1));
  // Envolvente de seguridad (C9; Arquitectura 7.1 y 7.4) con la huella de los parámetros de la regla
  // cargados al iniciar (INV-6). Las bandas iniciales son las del plan.
  const conBanda = plan.filter((x) => x.tipo === 'bloque' && state.fichas[x.actividad]?.bandas);
  s.envolvente = crearEnvolvente({
    bandas: Object.fromEntries(conBanda.map((x) => [x.actividad, state.fichas[x.actividad].bandas.map((b) => b.id)])),
    iniciales: Object.fromEntries(conBanda.map((x) => [x.actividad, x.banda])),
    dificultad: cfg.modos[modo].dificultad,
    adaptacion: Boolean(cfg.modos[modo].adaptacion),
    huella: huellaDeParametros(),
  });
  sesiones.add({
    sesion_id: s.id, codigo_nino: s.codigo, dispositivo: dispositivo(), inicio: new Date().toISOString(),
    ensayos: 0, pausas: [], terminada_antes: false, nivel_apoyo: [], version_indicadores: VERSION_INDICADORES, advertencia_frecuencia: Boolean(advertencia),
    modo_fase: modo,
    huella_parametros: s.envolvente.huellaInicial,
    fase2_version: fase2?.version ?? null,
    fase2_sesion: fase2?.numero ?? null,
    fase2_bloque: fase2 ? bloqueFase2(fase2.numero, cfg.fase2.sesionesPorBloque) : null,
    fase2_primera: fase2?.primera ?? null,
    registros_completos: false,
    tema_imagenes: s.tema,
    plan_sesion: plan
      .filter((x) => x.tipo === 'bloque' || x.tipo === 'escalera')
      .map((paso) =>
        paso.tipo === 'escalera'
          ? { actividad: paso.actividad, escalera: true, bandas: paso.bandas, modalidad: paso.modalidad, ensayos_por_banda: paso.ensayosPorBanda, aciertos_para_subir: paso.aciertosParaSubir }
          : { actividad: paso.actividad, banda: paso.banda, modalidad: paso.modalidad, ensayos: paso.ensayos, ...(paso.mitad ? { mitad: paso.mitad } : {}), ...(paso.mitades ? { mitades: paso.mitades } : {}) },
      ),
  });
  // Auditoría (Arquitectura 10.1): inicio de sesión con todas las versiones en uso y el modo de fase.
  auditar('inicio_sesion', {
    sesion_id: s.id,
    codigo_nino: s.codigo,
    modo_fase: modo,
    version_app: VERSION_APP,
    version_indicadores: VERSION_INDICADORES,
    huella_parametros: s.envolvente.huellaInicial,
    fichas: Object.fromEntries([...new Set(plan.map((x) => x.actividad).filter(Boolean))].map((a) => [a, state.fichas[a]?.version ?? null])),
    sesion_config: cfg.version ?? null,
    plantillas_panel: state.plantillas?.version ?? null,
  });
  const resultados = [];
  let terminar = false;
  let k = 0;
  // Cada paso queda en pasos_sesion con su inicio y su fin, en ms desde el inicio de la sesión.
  const pasos = [];
  const marca = (tipo, extra = {}) => {
    const p = { paso: tipo, ...extra, inicio_ms: performance.now() - s.inicioMs, fin_ms: null };
    pasos.push(p);
    return () => {
      p.fin_ms = performance.now() - s.inicioMs;
      editSesion(s.id, (r) => (r.pasos_sesion = pasos));
    };
  };
  const omitidos = [];
  for (const paso of plan) {
    // INV-8: al llegar a los 15 minutos de uso, no empieza otro bloque; la sesión va al cierre.
    const decision = decidirPaso(paso, { usoMs: performance.now() - s.inicioMs, limiteMinutos: cfg.limiteMinutos, terminada: terminar });
    if (decision !== 'ejecutar') {
      if (paso.tipo === 'escalera') omitidos.push({ actividad: paso.actividad, modalidad: paso.modalidad, motivo: decision === 'limite' ? 'limite_15_min' : 'sesion_terminada' });
      if (paso.tipo === 'bloque') {
        k++;
        omitidos.push({ actividad: paso.actividad, modalidad: paso.modalidad, motivo: decision === 'limite' ? 'limite_15_min' : 'sesion_terminada' });
      }
      if (decision === 'limite') {
        s.limiteAlcanzado = true;
        editSesion(s.id, (r) => (r.limite_15_min = true));
      }
      continue;
    }
    if (paso.tipo === 'rutina-inicio') {
      const fin = marca('rutina-inicio');
      if ((await mostrarRutina(rutinaInicioHTML(paso.actividades, PICTO_FIN), cfg.rutinaInicioMs, s)) === 'terminar') terminar = true;
      fin();
    } else if (paso.tipo === 'transicion') {
      const fin = marca('transicion', { siguiente: paso.siguiente });
      if ((await mostrarRutina(transicionHTML(paso.siguiente), cfg.transicionMs, s)) === 'terminar') terminar = true;
      fin();
    } else if (paso.tipo === 'rutina-cierre') {
      // Igual en todas las sesiones e independiente del desempeño (Catálogo 7.1).
      const fin = marca('rutina-cierre');
      await mostrarRutina(cierreHTML(PICTO_FIN), cfg.rutinaCierreMs);
      fin();
    } else if (paso.tipo === 'referencia') {
      const fin = marca('referencia');
      s.referenciaHecha = true;
      const ref = await ejecutarReferencia(s, periodo);
      fin();
      if (ref.terminada) terminar = true;
    } else if (paso.tipo === 'escalera') {
      // Decisión R6: 10 ensayos por banda desde B1; sube con 8 o más aciertos y se detiene en la
      // primera banda no aprobada. A los 15 minutos no empieza otra banda (INV-8).
      for (const b of escaleras.get(paso.actividad)) {
        if (terminar) break;
        if (decidirPaso({ tipo: 'bloque' }, { usoMs: performance.now() - s.inicioMs, limiteMinutos: cfg.limiteMinutos }) === 'limite') {
          s.limiteAlcanzado = true;
          editSesion(s.id, (r) => (r.limite_15_min = true));
          omitidos.push({ actividad: paso.actividad, banda: b.banda.id, modalidad: paso.modalidad, motivo: 'limite_15_min' });
          break;
        }
        s.bloque++;
        s.bandaActual = b.banda.id;
        const finBloque = marca('bloque', { bloque: s.bloque, actividad: paso.actividad, modalidad: paso.modalidad, banda: b.banda.id, escalera: true });
        const r = await ejecutarBloque({ ficha: b.ficha, banda: b.banda, modalidad: paso.modalidad, trials: b.trials, s, usados: b.usados, pantalla: b.pantalla, periodo });
        finBloque();
        if (r.error) {
          terminar = true;
          break;
        }
        resultados.push(r.last);
        if (r.terminarSesion) terminar = true;
        const peldano = { actividad: paso.actividad, banda: b.banda.id, ensayos: r.rows.length, aciertos: r.rows.filter((x) => x.acierto).length };
        peldano.aprobada = bandaAprobada(peldano, paso);
        (s.escalera ??= []).push(peldano);
        editSesion(s.id, (x) => (x.escalera_familiarizacion = s.escalera));
        if (!siguePorEscalera(peldano, paso.bandas)) break;
      }
    } else if (paso.tipo === 'bloque') {
      const b = bloques[k++];
      // El bloque puede partirse: si la envolvente ejecuta un cambio de banda a mitad del bloque, los
      // ensayos que faltan siguen en la banda nueva, en otro bloque (Arquitectura 7.1 y 7.2).
      let restantes = paso.ensayos;
      for (let parte = 0; restantes > 0 && !terminar; parte++) {
        // Banda del bloque: la de la envolvente (adaptación y órdenes del terapeuta) o, sin ella, la
        // que el terapeuta fijó desde el menú.
        const objetivo = s.envolvente?.estado.bandas[paso.actividad] ?? s.bandaFijada?.[paso.actividad];
        if (parte > 0 || (objetivo && objetivo !== b.banda.id)) {
          if (parte > 0 && decidirPaso({ tipo: 'bloque' }, { usoMs: performance.now() - s.inicioMs, limiteMinutos: cfg.limiteMinutos }) === 'limite') {
            s.limiteAlcanzado = true;
            editSesion(s.id, (r) => (r.limite_15_min = true));
            omitidos.push({ actividad: paso.actividad, banda: objetivo ?? b.banda.id, modalidad: paso.modalidad, ensayos: restantes, motivo: 'limite_15_min' });
            break;
          }
          try {
            const banda = b.ficha.bandas.find((x) => x.id === (objetivo ?? b.banda.id));
            Object.assign(b, { banda, ...(await prepararBloque({ ficha: b.ficha, banda, modalidad: paso.modalidad, n: restantes, s, mitad: paso.mitad ?? null, mitades: paso.mitades ?? null })) });
          } catch {
            // Sin ítems en esa banda: el bloque sigue en la que tenía.
            if (parte > 0) b.trials = b.trials.slice(0, restantes);
          }
        }
        s.bloque++;
        s.bandaActual = b.banda.id;
        const finBloque = marca('bloque', { bloque: s.bloque, actividad: paso.actividad, modalidad: paso.modalidad, banda: b.banda.id, ...(parte > 0 ? { continuacion: true } : {}) });
        const r = await ejecutarBloque({ ficha: b.ficha, banda: b.banda, modalidad: paso.modalidad, trials: b.trials, s, usados: b.usados, pantalla: b.pantalla, periodo });
        finBloque();
        if (r.error) {
          terminar = true;
          break;
        }
        resultados.push(r.last);
        if (r.terminarSesion) terminar = true;
        restantes -= r.rows.length;
        if (!r.cortado) break;
      }
    }
  }
  editSesion(s.id, (r) => Object.assign(r, { bloques_omitidos: omitidos, duracion_uso_ms: performance.now() - s.inicioMs, limite_15_min: Boolean(s.limiteAlcanzado) }));
  // Señales de alerta temprana (H4.4): solo se calculan y se guardan; nunca se muestran ni se usan (INV-9).
  // Con las filas tal como se exportan (tiempos a 0.1 ms y fuera de tarea marcado), para que se reproduzcan.
  editSesion(s.id, (r) => (r.alerta_temprana = alertaDeSesion(paraExportar(comoSeExporta(log.rows().filter((x) => x.sesion_id === s.id)), { sinTiempos: sinTiempos() }))));
  // Cálculo de los indicadores de la sesión, a la auditoría (Arquitectura 10.1 y 10.2).
  auditarIndicadores(s);
  // Familiarización (decisión R6): la plataforma propone la banda inicial de la fase 1 (la última
  // aprobada, B1 si ninguna) y, al cerrar la sesión, avisa si en toda la sesión hubo menos de 10
  // ensayos con respuesta sin interrumpir (decisión R6b; Protocolo 4.2, criterio 4).
  const famil = cfg.modos[modo];
  if (famil.escalera) {
    const propuesta = Object.fromEntries(
      famil.escalera.actividades.filter((a) => state.fichas[a]).map((a) => [a, bandaPropuesta((s.escalera ?? []).filter((x) => x.actividad === a), state.fichas[a].bandas.map((b) => b.id))]),
    );
    const deSesion = log.rows().filter((r) => r.sesion_id === s.id);
    const minimo = famil.minimoEnsayosInclusion?.valor ?? 10;
    editSesion(s.id, (r) => Object.assign(r, { escalera_familiarizacion: s.escalera ?? [], banda_inicial_propuesta: propuesta, ensayos_inclusion: ensayosParaInclusion(deSesion), aviso_inclusion: avisoDeInclusion(deSesion, minimo) }));
  }
  state.ultimaSesion = { s, resultados };
  // Después del cierre, el adulto toca dos veces la esquina para ver el resumen.
  app.innerHTML = `
    <div class="nino">
      ${cierreHTML(PICTO_FIN).replace(' rutina-aparece', '')}
      <button type="button" class="esquina" id="adulto" aria-label="Resumen para el adulto: tocar dos veces">${ICONO_ADULTO}</button>
    </div>`;
  twoTaps(app.querySelector('#adulto'), renderResumenSesion);
}

// Auditoría (Arquitectura 10.1): los indicadores de la sesión, con la huella de los datos de entrada
// (el registro del niño hasta esta sesión), la versión de las definiciones y el resultado.
function auditarIndicadores(s) {
  const delNino = sesiones.rows().filter((x) => x.codigo_nino === s.codigo && String(x.sesion_id).startsWith('S-'));
  const hasta = delNino.slice(0, delNino.findIndex((x) => x.sesion_id === s.id) + 1);
  const ids = new Set(hasta.map((x) => x.sesion_id));
  const ensayos = ensayosHistoricos().filter((r) => ids.has(r.sesion_id));
  const resultado = calcularIndicadores(ensayos, hasta, { fichas: state.fichas, items: state.items }).filter((x) => x.sesion_id === s.id);
  auditar('indicadores', { sesion_id: s.id, version_indicadores: VERSION_INDICADORES, huella_entrada: huellaDe({ ensayos, sesiones: [...ids] }), resultado, huella_resultado: huellaDe(resultado) });
}

// Pantalla del niño con una rutina o una transición, el tiempo fijado. Sin texto.
// Con s, la esquina abre el menú del terapeuta; si se abre, la rutina espera a que se cierre.
// Devuelve 'terminar' si desde el menú se terminó la sesión.
async function mostrarRutina(html, ms, s = null) {
  app.innerHTML = `<div class="nino">${html}${s ? `<button type="button" class="esquina" id="pausa" aria-label="Menú del terapeuta: mantener pulsado">${ICONO_PAUSA}</button>` : ''}</div>`;
  const wrap = app.firstElementChild;
  state.running = true;
  // El cierre aparece con su transición en el cuadro siguiente.
  requestAnimationFrame(() => requestAnimationFrame(() => app.querySelector('.rutina-aparece')?.classList.add('visible')));
  let menu = null;
  if (s) mantenerPulsado(wrap.querySelector('#pausa'), () => (menu ??= abrirMenu(wrap, { s, enRutina: true })));
  await new Promise((r) => setTimeout(r, ms));
  const res = menu ? await menu : null;
  state.running = false;
  if (res?.accion === 'terminar') {
    s.terminarSesion = true;
    editSesion(s.id, (r) => Object.assign(r, { terminada_antes: true, motivo_terminacion: res.motivo || null, nota_terminacion: res.nota || null }));
    return 'terminar';
  }
  return 'continuar';
}

// Arma los ensayos de un bloque: elige los ítems de la banda y carga sus imágenes. Lanza un error con
// un mensaje para el adulto si no se puede. mitad: en la fase 2, solo los conceptos de esa mitad.
// mitades: en la versión del Catálogo 5.2, la mitad de cada modalidad ({ V: 'A', AV: 'B' }): la
// mitad de los ensayos va en V y la otra en AV, en orden al azar.
async function prepararBloque({ ficha, banda, modalidad, n, s, mitad = null, mitades = null, composicion = null }) {
  const pantalla = PANTALLAS[ficha.pantalla];
  const rand = rng(seedOf(`${s.id}:${s.bloque + 1}`));
  const usados = (s.usados[ficha.id] ??= new Set());
  const repeat = ficha.repetirItems !== false;
  // Los ítems retirados en la revisión clínica no entran en las sesiones.
  let bandItems = state.items.filter((i) => i.actividad === ficha.id && i.banda === banda.id && disponibleEnSesion(i));
  // Juego de cajas de la sesión (ACT-06): alterna entre sesiones, como las parejas de ACT-07.
  if (banda.juegos) bandItems = bandItems.filter((i) => i.juego === juegoDeSesion(banda, s.numero));
  // Algunos ítems son de una sola modalidad (ACT-10: historias en V, instrucciones habladas en AV).
  if (modalidad !== 'mixta') bandItems = bandItems.filter((i) => !i.modalidad || i.modalidad === modalidad);
  const elegir = (deItems, cuantos) => {
    try {
      if (pantalla.elegir) {
        // La pantalla arma el bloque a su manera: un programa de premios (ACT-12), una serie de
        // presentaciones (ACT-13) o n secuencias completas (ACT-10 y ACT-16).
        // previas: lo ya registrado de esta actividad y banda en la sesión (ACT-12 junta bloques).
        const previas = log.rows().filter((r) => r.sesion_id === s.id && r.actividad === ficha.id && r.banda === banda.id);
        return pantalla.elegir(deItems, cuantos, rand, { ficha, banda, repeat, previas });
      }
      if (composicion ?? banda.composicion) {
        // El orden de las dimensiones se sortea una vez por sesión: en B1 la regla es la misma toda la sesión.
        s.orden[ficha.id] ??= shuffle(ficha.dimensiones, rand);
        return pickComposed(deItems, composicion ?? banda.composicion, s.orden[ficha.id], rand);
      }
      if (ficha.estratificarPor === 'emocion') return elegirPorEmocion(deItems, cuantos, rand);
      return pickItems(deItems, cuantos, rand, { repeat, exclude: repeat ? new Set() : usados });
    } catch (e) {
      throw new Error(`${e.message} Elige menos ensayos o termina la sesión para empezar una nueva.`);
    }
  };
  const pareja = ficha.parejas?.[s.numero % ficha.parejas.length];
  let trials;
  if (mitades) {
    // Fase 2, versión del Catálogo 5.2: cada modalidad con su mitad de conceptos, mezcladas al azar.
    const mitadN = Math.floor(n / 2);
    const de = (m, cuantos) =>
      pantalla.toTrials(elegir(itemsDeMitad(bandItems, mitades[m]), cuantos), { ficha, banda, pareja, modalidad: m }).map((t) => ({ ...t, modalidad: m }));
    trials = shuffle([...de('V', mitadN), ...de('AV', n - mitadN)], rand);
  } else {
    // En las actividades por secuencias, n cuenta secuencias completas y cada paso es un ensayo.
    const todos = pantalla.toTrials(elegir(itemsDeMitad(bandItems, mitad), n), { ficha, banda, pareja, modalidad });
    trials = ficha.unidadDelBloque === 'secuencia' ? todos : todos.slice(0, n);
  }
  // Sondas de generalización y presentación distribuida (Catálogo 7.2 y 7.3): solo en los modos
  // de fase que dicen la ficha y fichas/sesion.json (en el piloto, la fase 3).
  if (!mitades) trials = conMecanismos(trials, { ficha, s, rand, deConcepto: (c) => {
    const it = bandItems.find((i) => i.concepto === c);
    return it ? pantalla.toTrials([it], { ficha, banda, pareja, modalidad })[0] : null;
  } });
  // El tema de la sesión solo cambia las imágenes (Arquitectura 4.8).
  trials = aplicarTema(trials, temaPorId(state.temas, s.tema));
  const srcs = trials.flatMap((t) => [t.consigna.src, ...t.opciones.map((o) => o.src), ...(t.imagenes ?? [])]).filter(Boolean);
  await preloadImages([PICTO_FIN, ...srcs]);
  return { trials, usados, pantalla };
}

// Sondas y reapariciones del bloque, a partir de la historia del niño en esta actividad (sesiones
// anteriores en este dispositivo). Sin modo de fase o fuera de los modos activos, no cambia nada.
function conMecanismos(trials, { ficha, s, rand, deConcepto }) {
  const cfgS = ficha.sondas;
  const cfgD = state.sesion?.presentacionDistribuida;
  const sondas = Boolean(s.modo && cfgS?.desdeModos?.includes(s.modo));
  const distribuida = Boolean(s.modo && cfgD?.activaEnModos?.includes(s.modo) && cfgD.actividades?.includes(ficha.id));
  if (!sondas && !distribuida) return trials;
  const porCodigo = new Map(state.items.map((i) => [i.codigo, i]));
  const conceptoFila = conceptoDeFila(porCodigo);
  const conceptoEnsayo = (t) => porCodigo.get(codigoBase(t.codigo))?.concepto ?? null;
  const historia = ensayosHistoricos().filter((r) => r.codigo_nino === s.codigo && r.actividad === ficha.id && r.sesion_id !== s.id);
  const alcanzados = unidadesDominadas(historia, { unidad: (r) => conceptoFila(r) ?? r.item, criterio: criterioDe(ficha) });
  let out = trials;
  if (distribuida) {
    const hoy = reaparicionesDeHoy({ alcanzados, sesiones: sesionesEnOrden(historia), demoras: cfgD.demorasSesiones, activaEnModos: cfgD.activaEnModos });
    out = conReapariciones(out, hoy, { deConcepto, concepto: conceptoEnsayo, rand });
  }
  if (sondas) {
    const sondeados = new Set(historia.filter((r) => r.sonda).map(conceptoFila));
    const candidatos = shuffle([...alcanzados.keys()].filter((c) => !sondeados.has(c)), rand);
    out = conSondas(out, candidatos, { cada: cfgS.cadaEnsayos, ejemplar: cfgS.ejemplar, deConcepto, concepto: conceptoEnsayo, rand });
  }
  return out;
}

// Aviso antes del bloque: las opciones no caben en esta pantalla a su tamaño mínimo.
function confirmarPantalla(mensaje) {
  app.innerHTML = `
    <div class="adulto">
      <h1>Tamaño de la pantalla</h1>
      <div class="panel">
        <p class="mensaje" role="alert">${esc(mensaje)}</p>
        <p class="ayuda">Si continúas, las opciones pueden salirse de la pantalla o encimarse, y los tiempos de este bloque no se podrán comparar con los de otros.</p>
        <div class="acciones">
          <button type="button" class="primario" data-r="volver">Volver</button>
          <button type="button" data-r="continuar">Continuar de todos modos</button>
        </div>
      </div>
    </div>`;
  return new Promise((resolve) => {
    for (const b of app.querySelectorAll('[data-r]')) b.onclick = () => resolve(b.dataset.r === 'continuar');
  });
}

// Aviso antes del bloque: la actividad requiere la voz grabada y no está (ACT-15).
function confirmarVozGrabada() {
  app.innerHTML = `
    <div class="adulto">
      <h1>Requiere la voz grabada</h1>
      <div class="panel">
        <p class="mensaje" role="alert">${esc(AVISO_VOZ_GRABADA)}</p>
        <div class="acciones">
          <button type="button" class="primario" data-r="volver">Volver</button>
          <button type="button" data-r="continuar">Abrir para revisar la mecánica</button>
        </div>
      </div>
    </div>`;
  return new Promise((resolve) => {
    for (const b of app.querySelectorAll('[data-r]')) b.onclick = () => resolve(b.dataset.r === 'continuar');
  });
}

// Pantalla del niño: escenario y botón de pausa del terapeuta. En modo experto: el código del ítem en
// una esquina y un botón para pasar al siguiente ítem.
function montarNino({ experto = false, claseStage = '' } = {}) {
  app.innerHTML = `
    <div class="nino">
      <div class="stage ${claseStage}" id="stage"></div>
      <button type="button" class="esquina" id="pausa" aria-label="Menú del terapeuta: mantener pulsado">${ICONO_PAUSA}</button>
      ${experto ? '<p class="codigo-item" id="codigo-item"></p><button type="button" class="siguiente" id="siguiente">Siguiente</button>' : ''}
    </div>`;
  const wrap = app.firstElementChild;
  return { wrap, stage: wrap.querySelector('#stage') };
}

// Referencia motora al inicio de la sesión. Bloque 0 en la lista de pausas de sesiones.csv.
async function ejecutarReferencia(s, periodo) {
  const { wrap, stage } = montarNino({ claseStage: 'referencia' });
  state.running = true;
  const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
  const ref = iniciarReferencia({
    plan: planReferencia(rng(seedOf(`${s.id}:referencia`))),
    env: browserEnv({ framePeriod: periodo, audio }),
    view: referencia.createView(stage),
    onPause: async (aparicion) => {
      const t0 = performance.now();
      const { accion, motivo, nota, guiada_ms } = await abrirMenu(wrap, { s, enReferencia: true, ensayo: aparicion });
      editSesion(s.id, (r) => {
        r.pausas.push({ bloque: 0, ensayo: aparicion, duracion_ms: performance.now() - t0, ...(guiada_ms ? { pausa_guiada_ms: guiada_ms } : {}) });
        if (accion === 'terminar') Object.assign(r, { terminada_antes: true, motivo_terminacion: motivo || null, nota_terminacion: nota || null });
      });
      if (accion === 'terminar') s.terminarSesion = true;
      return accion;
    },
  });
  stage.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const objetivo = e.target.closest('[data-pos]');
    ref.pointer({ t: eventTime(e), x: Math.round(e.clientX), y: Math.round(e.clientY), pos: objetivo ? Number(objetivo.dataset.pos) : null });
  });
  mantenerPulsado(wrap.querySelector('#pausa'), () => ref.pause());
  try {
    const { terminada, ...resumen } = await ref.done;
    editSesion(s.id, (r) => Object.assign(r, resumen));
    return { terminada };
  } finally {
    state.running = false;
    wake?.release().catch(() => {});
  }
}

// Bloque suelto (demostración y modo experto): al terminar, el fin de bloque y su resumen.
async function runBlock(opciones) {
  const r = await ejecutarBloque(opciones);
  if (r.error) return renderInicio(r.error);
  state.last = r.last;
  renderFin();
  // Si desde el menú se terminó la sesión, el resumen ya no ofrece otro bloque.
}

// Ejecuta un bloque y devuelve { rows, last } o { error }. extra: campos del registro que dependen
// de la sesión con niño (por ejemplo, la mitad de conceptos de la fase 2).
async function ejecutarBloque({ ficha, banda: bandaDeFicha, modalidad, trials, s, usados, pantalla, periodo }) {
  const banda = bandaDeFicha.id;
  const { wrap, stage } = montarNino({ experto: s.experto });
  state.running = true;
  const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
  const env = browserEnv({ framePeriod: periodo, audio });
  const view = pantalla.createView(stage, state.images, { ficha, banda: bandaDeFicha, modalidad });
  let ensayo = 0;
  // Pausa: la del terapeuta (pulsación prolongada) o la que ofrece la regla con una señal de
  // regulación (aviso). Abre el menú del terapeuta; devuelve 'continuar' o 'terminar'.
  const atenderPausa = async (aviso = '') => {
    view.clear();
    const t0 = performance.now();
    const { accion, alcance, motivo, nota, guiada_ms } = await abrirMenu(wrap, { s, ficha, ensayo, aviso });
    if (accion === 'terminar' && alcance === 'sesion') s.terminarSesion = true;
    editSesion(s.id, (r) => {
      // De la pausa guiada solo se registra que ocurrió y cuánto duró.
      r.pausas.push({ bloque: s.bloque, ensayo, duracion_ms: performance.now() - t0, ...(guiada_ms ? { pausa_guiada_ms: guiada_ms } : {}), ...(aviso ? { ofrecida_por: 'regla' } : {}) });
      if (accion === 'terminar') Object.assign(r, { terminada_antes: true, motivo_terminacion: motivo || null, nota_terminacion: nota || null });
    });
    return accion;
  };
  // Regla de adaptación y envolvente (H4.1 a H4.3; Arquitectura 7.1): en los modos adaptativos, al
  // cerrar cada ventana de 10 ensayos válidos la regla propone y la envolvente decide. Si ejecuta un
  // cambio de banda, el bloque termina ahí y lo que falta sigue en la banda nueva.
  const adaptativo = Boolean(state.sesion?.modos?.[s.modo]?.adaptacion && s.envolvente);
  let cortado = false;
  const ordenesDelBloque = () => (sesiones.rows().find((r) => r.sesion_id === s.id)?.ordenes_terapeuta ?? []).filter((o) => o.bloque === s.bloque);
  let adaptacion = null;
  if (adaptativo) {
    const historialPrevio = ensayosHistoricos().filter((r) => r.codigo_nino === s.codigo && r.actividad === ficha.id && r.sesion_id !== s.id);
    s.estadoAdaptacion ??= { sinSubir: false };
    adaptacion = crearAdaptacionDeBloque({
      envolvente: s.envolvente,
      actividad: ficha.id,
      bandas: ficha.bandas.map((b) => b.id),
      estado: s.estadoAdaptacion,
      base: lineaBaseRegulacion(historialPrevio),
      ordenesDelBloque,
      ensayosValidos: () => log.rows().filter((r) => r.sesion_id === s.id && r.actividad === ficha.id && utilizable(r)).length,
      usoMs: () => performance.now() - s.inicioMs,
      registrar: (registro, res) => {
        editSesion(s.id, (r) => Object.assign(r, { adaptacion_propuestas: [...(r.adaptacion_propuestas ?? []), registro], envolvente_bloqueos: s.envolvente.estado.bloqueos.length, aviso_bloqueos: res.aviso }));
        auditar('adaptacion', { sesion_id: s.id, bloque: s.bloque, actividad: ficha.id, ventana: registro.ventana, accion: registro.accion, banda_actual: registro.banda_actual, banda_propuesta: registro.banda_propuesta, ejecutada: registro.ejecutada, invariante: registro.invariante });
      },
    });
  }
  const block = startBlock({
    // Algunas pantallas ajustan los tiempos del bloque según la banda (ACT-09: la pausa en blanco).
    ficha: pantalla.fichaDeBloque?.(ficha, bandaDeFicha) ?? ficha,
    modalidad,
    trials,
    env,
    view,
    log,
    // latencia_dispositivo_ms queda vacía hasta medir cada tableta.
    // modo_fase: el del niño en las sesiones con niño; «prototipo» en las de demostración y modo experto.
    base: { sesion_id: s.id, bloque: s.bloque, codigo_nino: s.codigo, dispositivo: dispositivo(), banda, version_app: VERSION_APP, modo_fase: s.modo ?? 'prototipo', tema_imagenes: s.tema ?? 'general' },
    rand: rng(seedOf(`${s.id}:${s.bloque}:posiciones`)),
    onPause: () => atenderPausa(),
    alTerminarEnsayo: async (hechos) => {
      if (!adaptacion) return false;
      const res = adaptacion.alTerminarEnsayo(hechos);
      if (!res) return false;
      // La pausa se ofrece aunque el cambio de banda se bloquee (ningún invariante bloquea una pausa).
      if (res.pausa && (await atenderPausa(PAUSA_OFRECIDA_MSG)) === 'terminar') return true;
      if (res.cambio) cortado = true;
      return res.cambio;
    },
    onTrial: (t, i) => {
      ensayo = i + 1;
      const label = wrap.querySelector('#codigo-item');
      if (label) label.textContent = t.codigo;
    },
  });
  wrap.querySelector('#siguiente')?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    block.skip(); // el ensayo en curso queda como interrumpido y empieza el siguiente
  });
  // Cada toque en la pantalla del niño llega al motor con su tiempo y posición.
  stage.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const opcion = e.target.closest('[data-pos]');
    block.pointer({ t: eventTime(e), x: Math.round(e.clientX), y: Math.round(e.clientY), pos: opcion ? Number(opcion.dataset.pos) : null });
  });
  mantenerPulsado(wrap.querySelector('#pausa'), () => block.pause());

  let rows;
  try {
    rows = await block.done;
  } catch (e) {
    return { error: e.message };
  } finally {
    state.running = false;
    wake?.release().catch(() => {});
  }
  // INV-8: si el bloque terminó después de los 15 minutos de uso, ya no empieza otro.
  if (s.inicioMs !== undefined && limiteAlcanzado(s.inicioMs, performance.now(), state.sesion?.limiteMinutos ?? 15)) {
    s.limiteAlcanzado = true;
    editSesion(s.id, (r) => (r.limite_15_min = true));
  }
  // Fase 2: la mitad de conceptos de cada ensayo (Protocolo 3.3, Catálogo 5.2).
  if (s.modo === 'fase2' && ficha.id === state.sesion?.fase2.actividad) {
    const mitad = new Map(state.items.filter((i) => i.actividad === ficha.id).map((i) => [i.codigo, i.mitad]));
    const delBloque = new Set(rows);
    log.edit((all) => all.filter((r) => delBloque.has(r)).forEach((r) => (r.mitad_fase2 = mitad.get(r.item) ?? null)));
  }
  const deLaSesion = log.rows().filter((r) => r.sesion_id === s.id);
  editSesion(s.id, (r) => Object.assign(r, { fin: new Date().toISOString(), ensayos: deLaSesion.length, ...frecuenciaSesion(deLaSesion) }));
  // Una orden de malestar después de la última ventana (por ejemplo, al terminar el bloque) también es
  // señal: la envolvente decide la bajada, que vale para el bloque siguiente.
  adaptacion?.alTerminarBloque(rows);
  const byCode = new Map(trials.map((t) => [t.codigo, t]));
  for (const r of rows) if (byCode.get(r.item).clave) usados.add(byCode.get(r.item).clave);
  // Para el resumen de ACT-07: ensayos en que la regla cambió respecto al anterior.
  const cambio = (r) => Boolean(byCode.get(r.item).cambio);
  const delBloque = new Set(rows);
  const previas = deLaSesion.filter((r) => !delBloque.has(r));
  return { rows, cortado, terminarSesion: Boolean(s.terminarSesion), last: { rows, ficha, banda, modalidad, bloque: s.bloque, lineas: lineasDelBloque(rows, ficha, pantalla, byCode, { cambio, previas }) } };
}

// Control del adulto en una esquina: el primer toque lo arma y el segundo, antes de 3 s, lo ejecuta.
function twoTaps(button, action, ms = 3000) {
  let armedAt = -Infinity;
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    if (now - armedAt < ms) {
      armedAt = -Infinity;
      button.classList.remove('armado');
      action();
      return;
    }
    armedAt = now;
    button.classList.add('armado');
    setTimeout(() => {
      if (performance.now() - armedAt >= ms) button.classList.remove('armado');
    }, ms);
  });
}

// Menú del terapeuta (H2.4): se abre con una pulsación prolongada en la esquina y pausa la sesión.
// enReferencia: la pausa llegó durante la referencia motora, antes de cualquier bloque.
// ficha: la del bloque en curso (para fijar su banda); sin ella, el menú no ofrece la banda.
// Devuelve { accion: 'continuar' | 'terminar', alcance: 'bloque' | 'sesion', motivo, nota, guiada_ms }.
function abrirMenu(wrap, { s, ficha = null, enReferencia = false, enRutina = false, ensayo = null, aviso = '' }) {
  return new Promise((resolve) => {
    const cfg = state.sesion;
    // Con envolvente (sesiones con niño), la banda, la adaptación y la pila de cambios (de la regla y
    // del terapeuta) son las suyas; «Anular el último cambio» revierte el último, sea cual sea.
    const env = s.envolvente;
    const bandaActual = ficha ? (env?.estado.bandas[ficha.id] ?? s.bandaFijada?.[ficha.id] ?? s.bandaActual ?? null) : null;
    const menu = crearMenu({ modo: s.modo ?? null, config: cfg, actividad: ficha?.id, banda: bandaActual, adaptacion: env ? env.estado.adaptacion : (s.adaptacion ?? Boolean(cfg?.modos?.[s.modo]?.adaptacion)), cambios: env ? env.estado.cambios : (s.cambiosBanda ?? []) });
    const usoMs = s.inicioMs !== undefined ? performance.now() - s.inicioMs : null;
    // Cada orden queda en ordenes_terapeuta con su hora y el estado de la sesión en ese momento.
    // Ensayos válidos de la actividad en la sesión en el momento de la orden (para INV-4 y la reproducción).
    const validosAhora = () => (ficha ? log.rows().filter((r) => r.sesion_id === s.id && r.actividad === ficha.id && utilizable(r)).length : 0);
    const registrar = (orden) =>
      editSesion(s.id, (r) => {
        r.ordenes_terapeuta = [
          ...(r.ordenes_terapeuta ?? []),
          ordenRegistro(orden, {
            hora: new Date().toISOString(),
            ms: s.inicioMs !== undefined ? performance.now() - s.inicioMs : null,
            bloque: enReferencia ? 0 : enRutina ? null : s.bloque,
            ensayo,
            modo: s.modo ?? null,
            banda: menu.estado.banda,
            adaptacion: menu.estado.adaptacion,
            // Para reproducir la sesión (Arquitectura 10.2): cuántas decisiones de la regla había.
            propuestas_previas: (r.adaptacion_propuestas ?? []).length,
            ensayos_validos: validosAhora(),
            actividad: ficha?.id ?? null,
          }),
        ];
        const o = r.ordenes_terapeuta.at(-1);
        auditar('orden', { sesion_id: s.id, accion: o.accion, detalle: o.detalle, bloqueada: o.bloqueada, bloque: o.bloque, ensayo: o.ensayo, propuestas_previas: o.propuestas_previas });
      });
    registrar({ accion: 'pausar' });
    const minutos = (ms) => `${Math.floor(ms / 60000)} min ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')} s`;
    const limite = usoMs !== null && limiteAlcanzado(0, usoMs, cfg?.limiteMinutos ?? 15);
    if (limite) s.limiteAlcanzado = true;
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.innerHTML = `
      <div class="adulto">
        ${tituloHTML('Menú del terapeuta', 'La sesión está en pausa.')}
        <div class="panel">
          ${menuHTML({
            donde: enReferencia ? 'referencia' : enRutina ? 'rutina' : 'bloque',
            bandas: ficha && !enReferencia ? ficha.bandas.map((b) => b.id) : [],
            banda: menu.estado.banda,
            adaptacion: menu.estado.adaptacion,
            hayCambios: menu.estado.cambios.length > 0,
            uso: usoMs !== null ? minutos(usoMs) : '',
            aviso: [aviso, limite ? LIMITE_MSG : ''].filter(Boolean).join(' '),
          })}
          <label for="volumen-pausa">Volumen de la voz <output data-volumen-valor>${volumen()} %</output>
            <input type="range" id="volumen-pausa" min="0" max="100" value="${volumen()}" data-volumen>
          </label>
          <label>Nota (opcional)
            <input name="nota" maxlength="80" autocomplete="off">
            <span class="ayuda">Sin nombres ni datos personales.</span>
          </label>
          ${state.pausa && !enReferencia && pausaGuiadaPermitida({ sesion: s, ficha }) ? pausaOpcionesHTML(true) : ''}
        </div>
      </div>`;
    bindVolumen(capa);
    // La pausa guiada corre encima del menú y, al terminar, regresa a él.
    let guiada = 0;
    capa.querySelector('[data-guiada]')?.addEventListener('click', async () => {
      capa.hidden = true;
      const { duracion_ms } = await pausaGuiada(wrap, { ...opcionesDePausa(capa), icono: ICONO_ADULTO, dosToques: twoTaps });
      guiada += duracion_ms;
      capa.hidden = false;
      capa.querySelector('[data-guiada-estado]').textContent = `La pausa guiada duró ${Math.round(duracion_ms / 1000)} s.`;
    });
    const mensaje = capa.querySelector('[data-menu-mensaje]');
    const atender = (res) => {
      if (res.orden) registrar(res.orden);
      // La envolvente recibe las órdenes que el menú no bloqueó (INV-5: fijar la banda o desactivar la
      // adaptación detiene los cambios automáticos; el episodio de desregulación cuenta para INV-2).
      if (env && res.orden && !res.orden.bloqueada) env.terapeuta({ ...res.orden, ensayosValidos: validosAhora() });
      // Lo que el menú cambió queda en la sesión: banda fijada, pila de cambios y adaptación.
      s.adaptacion = menu.estado.adaptacion;
      s.cambiosBanda = menu.estado.cambios;
      if (ficha && menu.estado.banda && menu.estado.banda !== bandaActual) {
        s.bandaFijada = { ...(s.bandaFijada ?? {}), [ficha.id]: menu.estado.banda };
        state.form.banda = menu.estado.banda; // el siguiente bloque suelto empieza en esa banda
      }
      const anular = capa.querySelector('[data-menu=anular]');
      if (anular) anular.disabled = menu.estado.cambios.length === 0;
      const adaptacion = capa.querySelector('[data-menu=adaptacion]');
      if (adaptacion) adaptacion.textContent = menu.estado.adaptacion ? 'Desactivar la adaptación' : 'Reactivar la adaptación';
      mensaje.textContent = res.mensaje ?? '';
      if (res.cerrar) {
        capa.remove();
        resolve({ ...res.cerrar, nota: capa.querySelector('[name=nota]').value.trim(), guiada_ms: guiada });
      }
    };
    for (const b of capa.querySelectorAll('[data-menu]')) b.onclick = () => atender(menu.tocar(b.dataset.menu));
    for (const r of capa.querySelectorAll('[name=menu-motivo]')) r.onchange = () => atender(menu.tocar('motivo', r.value));
    for (const r of capa.querySelectorAll('[name=menu-banda]')) r.onchange = () => atender(menu.tocar('banda', r.value));
    wrap.append(capa);
  });
}

// ---------- Pausa guiada (ACT-17) ----------

// Duración y ritmo de la pausa. En el panel de pausa van plegadas, para no distraer.
function pausaOpcionesHTML(plegada) {
  const p = state.pausa;
  const minutos = (s) => (s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : s === 60 ? '1 minuto' : `${s / 60} minutos`);
  const cuerpo = `
    <p class="ayuda">La decide el terapeuta y el niño puede rechazarla. Para detenerla, toca dos veces el botón de la esquina.</p>
    <fieldset class="chips">
      <legend>Duración</legend>
      ${p.duracionesS.map((s, i) => chipHTML('guiada-duracion', s, minutos(s), i === 0)).join('')}
    </fieldset>
    <fieldset class="chips">
      <legend>Ritmo del globo</legend>
      ${p.ritmos.map((r, i) => chipHTML('guiada-ritmo', r.id, `${r.nombre}: ${r.inflarMs / 1000} s y ${r.desinflarMs / 1000} s`, i === 0)).join('')}
    </fieldset>
    <div class="acciones"><button type="button" data-guiada>Empezar la pausa guiada</button></div>
    <p class="meta" role="status" data-guiada-estado></p>`;
  return plegada ? `<details class="pausa-opciones"><summary>Pausa guiada con el globo</summary>${cuerpo}</details>` : cuerpo;
}

function opcionesDePausa(root) {
  const valor = (name) => root.querySelector(`[name=${name}]:checked`).value;
  return { duracionS: Number(valor('guiada-duracion')), ritmo: state.pausa.ritmos.find((r) => r.id === valor('guiada-ritmo')) };
}

// Página #pausa: la pausa guiada fuera de un bloque. Solo se abre en una sesión en modo experto
// y queda anotada en ella.
function renderPausa(msg = '') {
  const p = state.pausa;
  const permitida = pausaGuiadaPermitida({ sesion: state.session });
  const lista = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  app.innerHTML = `
    <div class="adulto">
      ${navHTML('pausa')}
      ${tituloHTML('Pausa guiada', esc(p.objetivo))}
      <div class="panel">
        <p>${esc(p.mecanica)}</p>
        ${
          permitida
            ? `${pausaOpcionesHTML(false).replace('data-guiada>', 'data-guiada class="primario">')}
        <p class="meta">Queda anotada en la sesión ${esc(state.session.id)}: solo que ocurrió y cuánto duró. ${esc(msg)}</p>`
            : `<p class="aviso" role="status">${esc(PAUSA_SOLO_EXPERTO)}</p>`
        }
      </div>
      <section class="panel ficha">
        <h2>${esc(p.id)} ${esc(p.nombre)} · ${esc(p.estado)}</h2>
        <dl>
          <dt>Paradigma</dt><dd>${esc(p.paradigma)}</dd>
          <dt>Evidencia</dt><dd>${esc(p.evidencia)}</dd>
          <dt>Condiciones de uso</dt><dd>${lista(p.contraindicaciones)}</dd>
          <dt>Lecturas no permitidas</dt><dd>${lista(p.lecturasNoPermitidas.map((l) => `«${l}»`))}</dd>
          <dt>Registro</dt><dd>${esc(p.registro)}</dd>
        </dl>
        <p class="ayuda">${esc(p.notaPrototipo)}</p>
      </section>
    </div>`;
  if (!permitida) return;
  app.querySelector('[data-guiada]').onclick = async () => {
    const opciones = opcionesDePausa(app);
    app.innerHTML = '<div class="nino"></div>';
    state.running = true;
    const wake = navigator.wakeLock ? await navigator.wakeLock.request('screen').catch(() => null) : null;
    const { duracion_ms, completa } = await pausaGuiada(app.firstElementChild, { ...opciones, icono: ICONO_ADULTO, dosToques: twoTaps });
    state.running = false;
    wake?.release().catch(() => {});
    const s = state.session;
    editSesion(s.id, (r) => r.pausas.push({ bloque: s.bloque, ensayo: null, duracion_ms, pausa_guiada_ms: duracion_ms }));
    renderPausa(`La última pausa duró ${Math.round(duracion_ms / 1000)} s${completa ? '' : ' y se detuvo antes de tiempo'}.`);
  };
}

// ---------- Fin de bloque ----------

// Igual para todos los niños, sin importar el desempeño.
function renderFin() {
  app.innerHTML = `
    <div class="nino fin">
      <img class="terminar" alt="" src="${PICTO_FIN}">
      <button type="button" class="esquina" id="adulto" aria-label="Resumen para el adulto: tocar dos veces">${ICONO_ADULTO}</button>
    </div>`;
  twoTaps(app.querySelector('#adulto'), renderResumen);
}

// Cierre de la sesión con un niño (H2.6): cada bloque con su resumen y su nivel de apoyo, y los
// registros del terapeuta en la misma pantalla. También se abre desde «Sesiones» para completar
// los registros de una sesión que quedó incompleta (entonces sin el resumen de cada bloque).
function renderResumenSesion() {
  const { s, resultados } = state.ultimaSesion;
  renderRegistros(s.id, { resultados, modo: s.modo });
}

function renderRegistros(id, { resultados = null, modo = null, volver = 'inicio' } = {}) {
  const fila = () => sesiones.rows().find((r) => r.sesion_id === id);
  const f = fila();
  if (!f) return renderInicio('La sesión ya no está en el registro de este dispositivo.');
  modo = modo ?? f.modo_fase;
  const fase3 = Boolean(state.sesion?.modos?.[modo]?.registroDecisiones);
  const marcados = episodiosMarcados(f.ordenes_terapeuta ?? []);
  const actividades = [...new Set((f.plan_sesion ?? []).map((b) => b.actividad))];
  const bandas = [...new Set(actividades.flatMap((a) => state.fichas[a]?.bandas.map((b) => b.id) ?? []))];
  // Familiarización (decisión R6): al cerrar, el terapeuta confirma la banda inicial de la fase 1 que
  // propone la escalera (la última aprobada) o la cambia con un motivo.
  const bandaInicial = (state.sesion?.modos?.[modo]?.escalera?.actividades ?? [])
    .filter((a) => state.fichas[a])
    .map((a) => {
      const bs = state.fichas[a].bandas.map((b) => b.id);
      const propuesta = f.banda_inicial_propuesta?.[a] ?? bs[0];
      return { id: a, nombre: state.fichas[a].nombre, bandas: bs, propuesta, actual: f.banda_inicial_fase1?.[a] ?? propuesta, motivo: f.banda_inicial_cambios?.find((c) => c.actividad === a)?.motivo ?? '', escalera: (f.escalera_familiarizacion ?? []).filter((x) => x.actividad === a) };
    });
  // Sin los resultados en memoria (desde «Sesiones»), los bloques salen del registro de ensayos.
  const bloques =
    resultados ??
    [...new Map(log.rows().filter((r) => r.sesion_id === id).map((r) => [r.bloque, r])).values()].map((r) => ({
      bloque: r.bloque, ficha: state.fichas[r.actividad] ?? { id: r.actividad, nombre: '' }, banda: r.banda, modalidad: r.modalidad, lineas: [],
    }));
  const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);
  // Decisión R16 (Protocolo 3.1): fuera de la fase 3 el terapeuta no ve aciertos, omisiones ni tiempos.
  const conIndicadores = muestraIndicadores(modo, state.sesion);
  app.innerHTML = `
    <div class="adulto">
      ${marcaHTML()}
      ${tituloHTML(resultados ? 'Resumen de la sesión' : 'Registros de la sesión', `Sesión ${esc(id)} · ${esc(MODO_NOMBRE[modo] ?? modo ?? '')}`)}
      ${bloques
        .map(
          (b) => `
        <section class="panel">
          <h2>Bloque ${b.bloque}: ${esc(b.ficha.id)} ${esc(b.ficha.nombre)} · banda ${esc(b.banda)} · ${esc(b.modalidad === 'mixta' ? 'V y AV' : b.modalidad)}</h2>
          ${conIndicadores && b.lineas.length ? `<ul class="resumen">${b.lineas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
          <fieldset class="chips">
            <legend>Nivel de apoyo en este bloque</legend>
            ${NIVELES_APOYO.map((n) => chipHTML(`apoyo-${b.bloque}`, n, mayuscula(n), fila()?.nivel_apoyo.find((x) => x.bloque === b.bloque)?.nivel === n)).join('')}
          </fieldset>
        </section>`,
        )
        .join('') || '<div class="panel"><p>La sesión terminó antes del primer bloque.</p></div>'}
      ${resultados && conIndicadores ? '<p class="ayuda">El resumen describe lo registrado. No es un puntaje ni una interpretación clínica.</p>' : ''}
      ${resultados && !conIndicadores ? `<p class="ayuda" data-sin-indicadores>En este modo de fase no se muestran aciertos, omisiones ni tiempos de respuesta (Protocolo 3.1: el terapeuta ve los indicadores solo en la fase 3). Quedan en el registro.</p>` : ''}
      <h2 class="registros-titulo">Registros del terapeuta</h2>
      ${registrosHTML({ marcados, fase3, actividades, bandas, previo: f.registros_hora ? f : {}, bandaInicial, avisoInclusion: Boolean(f.aviso_inclusion) })}
    </div>`;
  for (const r of app.querySelectorAll('[name^=apoyo-]')) {
    const bloque = Number(r.name.slice(6));
    r.onchange = () => editSesion(id, (x) => (x.nivel_apoyo = [...x.nivel_apoyo.filter((n) => n.bloque !== bloque), { bloque, nivel: r.value }]));
  }
  const form = app.querySelector('#registros');
  const msg = form.querySelector('#registros-msg');
  form.querySelector('#agregar-evento').onclick = () => {
    const n = form.querySelectorAll('[data-evento]').length;
    form.querySelector('#eventos').insertAdjacentHTML('beforeend', eventoHTML(n, { actividades, bandas }));
    form.querySelector(`[name="ev-hora-${n}"]`).focus();
  };
  // Al salir se cierra la sesión (si era la de esta pantalla) y fuera_de_tarea queda definitivo.
  const salir = () => {
    if (state.session?.id === id) cerrarSesion();
    if (volver === 'sesiones') route();
    else renderInicio();
  };
  const guardar = (completos) => {
    const reg = leerRegistros(datosDelFormulario(form), { marcados, fase3, bandaInicial });
    if (completos) {
      const f = faltantes(reg, { fase3, bandaInicial });
      if (f.length) {
        msg.textContent = f.join(' ');
        return;
      }
    }
    editSesion(id, (x) => Object.assign(x, filaRegistros(reg, { completos, hora: new Date().toISOString() })));
    // La banda inicial elegida queda en el padrón: es la banda fija de la fase 1 y del cierre.
    const elegidas = Object.entries(reg.banda_inicial_fase1 ?? {}).filter(([, b]) => b);
    if (elegidas.length)
      ninos.edit((rows) => {
        const n = rows.find((x) => x.codigo === f.codigo_nino);
        if (n) for (const [a, b] of elegidas) n.bandas = fijarBanda(n.bandas, state.fichas[a], b);
      });
    salir();
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    guardar(true);
  };
  form.querySelector('#despues').onclick = () => guardar(false);
}

function renderResumen() {
  const { ficha, banda, modalidad, lineas } = state.last;
  const s = state.session;
  const nivel = sesiones.rows().find((r) => r.sesion_id === s.id)?.nivel_apoyo.find((n) => n.bloque === s.bloque)?.nivel;
  const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);
  // Decisión R16 (Protocolo 3.1): fuera de la fase 3 el terapeuta no ve aciertos, omisiones ni tiempos.
  const conIndicadores = muestraIndicadores(modo, state.sesion);
  app.innerHTML = `
    <div class="adulto">
      ${marcaHTML()}
      ${tituloHTML('Resumen del bloque', `${esc(ficha.id)} ${esc(ficha.nombre)} · banda ${esc(banda)} · modalidad ${esc(modalidad)} · sesión ${esc(s.id)}, bloque ${s.bloque}`)}
      <div class="panel">
        <ul class="resumen">${lineas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="ayuda">Describe lo registrado en este bloque. No es un puntaje ni una interpretación clínica.</p>
        <details class="no-concluir">
          <summary>Qué no se puede concluir de este bloque</summary>
          <ul>${ficha.lecturasNoPermitidas.map((l) => `<li>«${esc(l)}»</li>`).join('')}</ul>
        </details>
        <fieldset class="chips">
          <legend>Nivel de apoyo en este bloque</legend>
          ${NIVELES_APOYO.map((n) => chipHTML('apoyo', n, mayuscula(n), nivel === n)).join('')}
        </fieldset>
        <div class="acciones">
          ${s.terminarSesion || s.limiteAlcanzado ? '' : '<button type="button" class="primario" id="otro">Otro bloque</button>'}
          <button type="button" id="cerrar">Terminar sesión</button>
        </div>
      </div>
      ${registroHTML()}
    </div>`;
  for (const r of app.querySelectorAll('[name=apoyo]')) {
    r.onchange = () =>
      editSesion(s.id, (fila) => {
        fila.nivel_apoyo = [...fila.nivel_apoyo.filter((n) => n.bloque !== s.bloque), { bloque: s.bloque, nivel: r.value }];
      });
  }
  if (s.terminarSesion || s.limiteAlcanzado) app.querySelector('.panel .acciones').insertAdjacentHTML('beforebegin', `<p class="aviso">${esc(s.terminarSesion ? 'La sesión se terminó desde el menú del terapeuta.' : LIMITE_MSG)}</p>`);
  app.querySelector('#otro')?.addEventListener('click', () => renderInicio());
  app.querySelector('#cerrar').onclick = () => {
    cerrarSesion();
    renderInicio();
  };
  bindRegistro(app, renderResumen);
}

init();
