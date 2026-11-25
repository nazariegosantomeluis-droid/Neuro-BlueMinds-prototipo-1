// Transporte «servidor» (después del piloto; decisión D6). Habla con la API de
// docs/servidor/contrato.yaml. Hoy solo se usa contra el servidor de prueba de las pruebas
// (test/servidor-prueba.mjs): no hay servidor desplegado.
//
// Misma interfaz que el transporte «archivo»: entregar(sobre) → { entregado, recibo } y
// recibir() → [contenido]. El envío es idempotente (PUT con el id del lote): si se corta la red y se
// reintenta, el servidor no duplica nada. Sin respuesta, reintenta con espera creciente
// (Arquitectura 9.4).

export const REINTENTOS = 6;
export const ESPERA_INICIAL_MS = 500;
export const ESPERA_MAXIMA_MS = 60000;
export const esperaDeIntento = (k) => Math.min(ESPERA_MAXIMA_MS, ESPERA_INICIAL_MS * 2 ** k);

export function crearTransporteServidor({ url, dispositivo, token = null, fetch = globalThis.fetch, esperar = (ms) => new Promise((r) => setTimeout(r, ms)), reintentos = REINTENTOS }) {
  const base = String(url).replace(/\/$/, '');
  let ultimaConfiguracion = 0;

  // Pide con reintentos: error de red o respuesta 5xx → espera y reintenta; 4xx → error sin reintentar.
  async function pedir(ruta, opciones = {}) {
    let ultimo;
    for (let k = 0; k <= reintentos; k++) {
      try {
        const r = await fetch(`${base}${ruta}`, { ...opciones, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(opciones.headers ?? {}) } });
        if (r.status >= 500) throw new Error(`El servidor respondió ${r.status}.`);
        return r;
      } catch (e) {
        ultimo = e;
        if (k < reintentos) await esperar(esperaDeIntento(k));
      }
    }
    throw new Error(`No se pudo contactar al servidor: ${ultimo?.message ?? 'sin respuesta'}.`);
  }

  return {
    tipo: 'servidor',
    async entregar(sobre) {
      const r = await pedir(`/lotes/${encodeURIComponent(sobre.lote_id)}`, { method: 'PUT', body: JSON.stringify(sobre) });
      const cuerpo = await r.json().catch(() => null);
      if (!r.ok) throw new Error(`El servidor rechazó el lote: ${cuerpo?.motivo ?? r.status}.`);
      return { entregado: true, recibo: cuerpo?.recibo ?? null };
    },
    // Recibos de los lotes de esta tableta (por si se perdió una respuesta) y la configuración vigente.
    async recibir() {
      const out = [];
      const rr = await pedir(`/dispositivos/${dispositivo}/recibos`);
      if (rr.ok) out.push(...((await rr.json()).recibos ?? []));
      const rc = await pedir(`/dispositivos/${dispositivo}/configuracion`);
      if (rc.status === 200) {
        const c = await rc.json();
        if (c?.numero > ultimaConfiguracion) {
          ultimaConfiguracion = c.numero;
          out.push(c);
        }
      }
      return out;
    },
  };
}
