// Servidor de prueba mínimo (decisión D6): implementa docs/servidor/contrato.yaml con Node, sin
// dependencias, en memoria. Solo para las pruebas del transporte «servidor»; no es el servidor del
// estudio (docs/servidor/plan.md dice lo que este no tiene: almacén de identidad separado, roles, dos
// factores, TLS, cifrado en reposo y respaldos).
//
// Importa cada lote con el mismo código que tools/importar.mjs (src/transporte/importacion.js): un
// servidor real haría lo mismo, con la llave privada en su almacén de secretos.
import { createServer } from 'node:http';
import { importarLote, baseVacia } from '../src/transporte/importacion.js';
import { verificarFirma } from '../src/transporte/cripto.js';
import { verificarConfiguracion } from '../src/transporte/formato.js';

export function crearServidorPrueba({ llaves, publicaFirma, tokens = null }) {
  const base = baseVacia();
  let configuracion = null;
  const responder = (res, estado, cuerpo) => {
    res.writeHead(estado, { 'content-type': 'application/json' });
    res.end(cuerpo === undefined ? '' : JSON.stringify(cuerpo));
  };
  const leerCuerpo = (req) =>
    new Promise((resolve, reject) => {
      const partes = [];
      req.on('data', (c) => partes.push(c));
      req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
      req.on('error', reject);
    });

  const servidor = createServer(async (req, res) => {
    try {
      // Token por tableta (contrato: bearerAuth). Sin tokens configurados, no se pide.
      const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
      if (tokens && !tokens.has(token)) return responder(res, 401, { motivo: 'sin autorización' });
      const ruta = new URL(req.url, 'http://x').pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (req.method === 'PUT' && ruta[0] === 'lotes' && ruta.length === 2) {
        const texto = await leerCuerpo(req);
        let sobre;
        try {
          sobre = JSON.parse(texto);
        } catch {
          return responder(res, 400, { motivo: 'el cuerpo no es JSON' });
        }
        if (sobre.lote_id !== ruta[1]) return responder(res, 400, { motivo: 'el id del lote no coincide con la ruta' });
        try {
          const r = await importarLote(base, sobre, llaves);
          return responder(res, r.repetido ? 200 : 201, { recibo: r.recibo });
        } catch (e) {
          if (!e.rechazo) throw e;
          return responder(res, 422, { motivo: e.message });
        }
      }
      if (req.method === 'GET' && ruta[0] === 'dispositivos' && ruta[2] === 'recibos') {
        return responder(res, 200, { recibos: Object.values(base.lotes).map((l) => l.recibo).filter((r) => r.dispositivo === ruta[1]) });
      }
      if (req.method === 'GET' && ruta[0] === 'dispositivos' && ruta[2] === 'configuracion') {
        const para = configuracion && (!configuracion.dispositivos?.length || configuracion.dispositivos.includes(ruta[1]));
        return para ? responder(res, 200, configuracion) : responder(res, 204);
      }
      if (req.method === 'PUT' && ruta[0] === 'configuracion' && ruta.length === 1) {
        const c = JSON.parse(await leerCuerpo(req));
        if (!(await verificarFirma(c, publicaFirma))) return responder(res, 422, { motivo: 'la firma no es válida' });
        const v = verificarConfiguracion(c);
        if (!v.ok) return responder(res, 422, { motivo: v.motivo });
        if (configuracion && c.numero <= configuracion.numero) return responder(res, 409, { motivo: 'hay una configuración igual o más nueva' });
        configuracion = c;
        return responder(res, 200, { numero: c.numero });
      }
      return responder(res, 404, { motivo: 'no existe' });
    } catch (e) {
      return responder(res, 500, { motivo: e.message });
    }
  });

  return {
    base,
    async iniciar() {
      await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
      return `http://127.0.0.1:${servidor.address().port}`;
    },
    cerrar: () => new Promise((r) => servidor.close(r)),
  };
}
