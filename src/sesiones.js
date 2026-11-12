// Página «Sesiones»: las sesiones guardadas en este dispositivo, con el resumen de cada bloque
// y la descarga de cada sesión. Solo lee el registro; no cambia nada de lo medido.
import { toCSV, download } from './engine/logger.js';
import { summarize, paraExportar } from './engine/quality.js';
import { REF_MIN_VALIDOS } from './engine/referencia.js';
import { nombreNino, abreviar } from './ninos.js';
import { PANTALLAS } from './catalogo.js';
import { esc, navHTML, tituloHTML } from './paginas.js';

const AVISO = '<p class="aviso">Prototipo para revisión de expertos. No es una herramienta diagnóstica.</p>';

const fechaLocal = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
};
const plural = (n, uno, varios) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const duracion = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
};

// Tipo de sesión según el prefijo de su identificador: S- (niño inscrito), DEMO- (demostración)
// o EXP- (modo experto).
export const tipoDeSesion = (id) => (String(id).startsWith('EXP-') ? 'experto' : String(id).startsWith('DEMO-') ? 'demo' : 'nino');
const ETIQUETA_TIPO = { experto: 'Modo experto', demo: 'Demostración' };

// De quién es la sesión, sin nada que identifique al niño: su ícono y su color (si sigue en el
// padrón de este dispositivo) y el código abreviado. El registro guarda el código completo.
export function participanteDeSesion(sesion, padron = []) {
  if (tipoDeSesion(sesion.sesion_id) !== 'nino') return 'sin niño';
  const codigo = String(sesion.codigo_nino ?? '');
  const nino = padron.find((n) => n.codigo === codigo);
  if (nino) return `${nombreNino(nino)} · ${abreviar(codigo)}`;
  // Código de 128 bits de un niño que ya no está en el padrón, o un código de una versión anterior.
  return `código ${/^[0-9a-f]{32}$/.test(codigo) ? abreviar(codigo) : codigo}`;
}

// Referencia motora de la sesión, tal como quedó en sesiones.csv. Solo describe lo registrado:
// la mediana se reporta junto a los tiempos de las actividades y no se resta (Modelo 3.1).
export function lineaReferencia(sesion) {
  const n = sesion.referencia_motora_n;
  if (n == null) return ''; // modo experto, o una sesión anterior a la referencia motora
  const anticipados = sesion.referencia_motora_anticipados
    ? `; ${plural(sesion.referencia_motora_anticipados, 'toque anticipado', 'toques anticipados')}, que no ${sesion.referencia_motora_anticipados === 1 ? 'cuenta' : 'cuentan'}`
    : '';
  return sesion.referencia_motora_ms == null
    ? `referencia motora no disponible (${plural(n, 'toque válido', 'toques válidos')} de los ${REF_MIN_VALIDOS} necesarios${anticipados})`
    : `referencia motora: mediana de ${Math.round(sesion.referencia_motora_ms)} ms en ${plural(n, 'toque válido', 'toques válidos')}${anticipados}`;
}

// Agrupa los ensayos de una sesión por bloque, en orden.
export function bloquesDeSesion(rows) {
  const porBloque = new Map();
  for (const r of rows) {
    if (!porBloque.has(r.bloque)) porBloque.set(r.bloque, []);
    porBloque.get(r.bloque).push(r);
  }
  return [...porBloque.entries()].sort(([a], [b]) => a - b).map(([bloque, filas]) => ({ bloque, filas }));
}

// Índice del banco por código de ensayo. Los ítems de «Cambia la regla» son secuencias: ahí el
// código que queda en el registro es el de cada ensayo de la secuencia.
export function indiceDeItems(items) {
  const indice = new Map();
  for (const it of items) {
    if (it.ensayos) for (const e of it.ensayos) indice.set(e.codigo, e);
    else indice.set(it.codigo, it);
  }
  return indice;
}

// Lo que el resumen de un bloque necesita y el registro no guarda: en qué ensayos cambió la
// regla (ACT-07) y las líneas propias de la actividad (ACT-14: por emoción). Se reconstruye con
// el banco de ítems; si algún ítem ya no está en el banco, esas líneas se omiten.
export function contextoDeBloque(filas, ficha, indice) {
  const reglas = filas.map((r) => indice.get(r.item)?.regla ?? null);
  const cambiaron = new Set(filas.filter((r, k) => k > 0 && reglas[k] && reglas[k - 1] && reglas[k] !== reglas[k - 1]));
  const completo = filas.every((r) => indice.has(r.item));
  const extra = (completo && PANTALLAS[ficha.pantalla]?.resumenExtra?.(filas, indice)) || [];
  return { cambio: (r) => cambiaron.has(r), extra };
}

function bloqueHTML({ bloque, filas }, sesion, fichas, indice) {
  const [r] = filas;
  const ficha = fichas[r.actividad];
  const nivel = sesion.nivel_apoyo?.find((n) => n.bloque === bloque)?.nivel;
  // Sin la ficha (por ejemplo, un registro de otra versión) solo se cuentan los ensayos.
  let lineas = [plural(filas.length, 'ensayo registrado', 'ensayos registrados')];
  if (ficha) {
    const { cambio, extra } = contextoDeBloque(filas, ficha, indice);
    lineas = [...summarize(filas, ficha, { cambio }), ...extra];
  }
  return `
    <li class="sesion-bloque">
      <p class="sesion-bloque-titulo"><strong>Bloque ${bloque}</strong> · ${esc(r.actividad)} ${esc(ficha?.nombre ?? '')} · banda ${esc(r.banda)} · modalidad ${esc(r.modalidad)}${nivel ? ` · apoyo ${esc(nivel)}` : ''}</p>
      <ul class="resumen">${lineas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </li>`;
}

function sesionHTML(sesion, rows, fichas, indice, abierta, padron) {
  const bloques = bloquesDeSesion(rows);
  const tipo = ETIQUETA_TIPO[tipoDeSesion(sesion.sesion_id)];
  const pausas = sesion.pausas ?? [];
  const guiadas = pausas.filter((p) => p.pausa_guiada_ms);
  const notas = [
    lineaReferencia(sesion),
    pausas.length ? `${plural(pausas.length, 'pausa', 'pausas')} (${duracion(pausas.reduce((t, p) => t + (p.duracion_ms ?? 0), 0))})` : '',
    guiadas.length ? `${plural(guiadas.length, 'pausa guiada', 'pausas guiadas')} (${duracion(guiadas.reduce((t, p) => t + p.pausa_guiada_ms, 0))})` : '',
    sesion.terminada_antes ? `terminó antes de tiempo${sesion.motivo_terminacion ? `: ${sesion.motivo_terminacion}` : ''}` : '',
    sesion.advertencia_frecuencia ? 'se continuó con aviso de frecuencia de pantalla' : '',
  ].filter(Boolean);
  return `
    <article class="panel sesion" data-sesion="${esc(sesion.sesion_id)}">
      <header class="sesion-cabeza">
        <div>
          <h2>${esc(fechaLocal(sesion.inicio) || sesion.sesion_id)}</h2>
          <p class="meta">Sesión <strong>${esc(sesion.sesion_id)}</strong> · ${esc(participanteDeSesion(sesion, padron))} · ${plural(rows.length, 'ensayo', 'ensayos')} en ${plural(bloques.length, 'bloque', 'bloques')}</p>
        </div>
        <p class="sesion-etiquetas">
          ${abierta ? '<span class="etiqueta">En curso</span>' : ''}
          ${tipo ? `<span class="etiqueta">${tipo}</span>` : ''}
        </p>
      </header>
      ${notas.length ? `<p class="meta">${esc(mayuscula(notas.join(' · ')))}.</p>` : ''}
      ${
        bloques.length
          ? `<details class="sesion-detalle">
               <summary>Ver el resumen de ${bloques.length === 1 ? 'su bloque' : `sus ${bloques.length} bloques`}</summary>
               <ol class="sesion-bloques">${bloques.map((b) => bloqueHTML(b, sesion, fichas, indice)).join('')}</ol>
               <p class="ayuda">Describe lo registrado. No es un puntaje ni una interpretación clínica.</p>
             </details>`
          : '<p class="meta">Esta sesión no tiene ensayos guardados.</p>'
      }
      <div class="acciones">
        <button type="button" data-descargar-sesion="${esc(sesion.sesion_id)}" ${rows.length ? '' : 'disabled'}>Descargar esta sesión (CSV)</button>
      </div>
    </article>`;
}

// ctx: { state, log, sesiones, padron, registroHTML, bindRegistro }
export function renderSesiones(app, ctx) {
  const { state, log, sesiones, padron = [], registroHTML, bindRegistro } = ctx;
  const todas = [...sesiones.rows()].reverse(); // la más reciente primero
  const ensayos = log.rows();
  const deSesion = (id) => ensayos.filter((r) => r.sesion_id === id);
  const indice = indiceDeItems(state.items);
  app.innerHTML = `
    <div class="adulto medio">
      ${navHTML('sesiones')}
      ${tituloHTML('Sesiones', 'Lo que está guardado en este dispositivo, sesión por sesión. Nada se envía a ningún servidor.')}
      ${AVISO}
      <div class="inicio-columnas">
        <div class="sesiones-lista">
          ${
            todas.length
              ? todas.map((s) => sesionHTML(s, deSesion(s.sesion_id), state.fichas, indice, state.session?.id === s.sesion_id, padron)).join('')
              : `<div class="panel vacio">
                   <p><strong>Todavía no hay sesiones guardadas.</strong></p>
                   <p>Aquí aparecerá cada sesión con el resumen de sus bloques, en cuanto termines el primero.</p>
                   <div class="acciones"><a class="boton primario" href="#inicio">Preparar un bloque</a></div>
                 </div>`
          }
        </div>
        ${registroHTML({ enlaceSesiones: false })}
      </div>
    </div>`;
  const estado = app.querySelector('.estado');
  for (const b of app.querySelectorAll('[data-descargar-sesion]')) {
    b.onclick = () => {
      const id = b.dataset.descargarSesion;
      const nombre = `sesion-${id}.csv`;
      download(nombre, toCSV(paraExportar(deSesion(id))), 'text/csv;charset=utf-8');
      if (estado) estado.textContent = `Se descargó ${nombre}.`;
    };
  }
  bindRegistro(app, () => renderSesiones(app, ctx));
}
