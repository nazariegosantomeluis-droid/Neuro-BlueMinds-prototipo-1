// Mide, al tamaño real en centímetros, cuánto se diferencian las escenas de ACT-04 «Oración e
// imagen» que pueden aparecer juntas: dos acciones, dos objetos de la misma acción, el niño y la
// niña, y dos relaciones de lugar. Cada par se dibuja con el mismo personaje, como en un ítem.
//
// Cómo mide: dibuja las dos escenas en un lienzo con la densidad de una tableta de 10 pulgadas
// (59 px CSS por centímetro y 1.5 píxeles físicos por px CSS), marca los píxeles que cambian
// (más de 48 de 255 en algún canal), junta los cambios que están a menos de 1 mm (para que las dos
// coletas o una falda cuenten como una sola diferencia) y busca la mayor zona de cambio. Reporta
// su área en mm² (solo píxeles que cambian) y el lado menor de su rectángulo. Es un filtro para la revisión, no un criterio clínico:
// el umbral (UMBRAL) es una propuesta y la decisión es de los clínicos.
//
// Escribe docs/medicion-escenas.json y docs/escenas-tamano-real.png: los pares que la ficha lista
// como ambiguos («accionesAmbiguas», de la revisión a ojo) y los que no pasan el filtro, a tamaño
// real en una tableta de 10 pulgadas, con escenas de «opcionMinCm». Necesita Playwright con Chromium; no corre en la
// verificación de GitHub.
// Uso: node tools/medir-escenas.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ROOT, readJSON } from './build-items.mjs';

// Densidad de la tableta de referencia: 1280 × 800 px CSS en 21.7 × 13.6 cm.
export const CM_PX = 59;
export const DPR = 1.5;
export const TAMANOS_CM = [3, 4, 4.5, 5, 6];
// Umbral propuesto: la mayor zona de cambio debe medir al menos 4 mm de lado menor y 25 mm² de
// área. Con menos, la diferencia es un detalle (la posición de una mano) más que una escena distinta.
export const UMBRAL = { ladoMm: 4, areaMm2: 25 };

const SUJETOS = ['nina', 'nino'];

// Los pares que se miden, con el mismo personaje (look 0) en las dos escenas.
export function paresDeEscenas(ficha) {
  const acciones = Object.keys(ficha.acciones);
  const recorte = (c) => ({ concepto: c, src: `assets/escenas/${c}.png` });
  const objetoDe = (accion, k = 0) => {
    const a = ficha.acciones[accion];
    const c = a.objeto ?? a.objetos?.[k];
    return c ? recorte(c) : undefined;
  };
  const accion = (sujeto, a, objeto = objetoDe(a)) => ({ tipo: 'accion', sujeto, look: 0, accion: a, ...(objeto ? { objeto } : {}) });
  const pares = [];
  for (const sujeto of SUJETOS) {
    for (let i = 0; i < acciones.length; i++) {
      for (let j = i + 1; j < acciones.length; j++) {
        pares.push({ tipo: 'accion', clave: `${sujeto}: ${acciones[i]} / ${acciones[j]}`, a: accion(sujeto, acciones[i]), b: accion(sujeto, acciones[j]) });
      }
    }
  }
  for (const a of ficha.conObjeto) {
    const objetos = ficha.acciones[a].objetos;
    for (let i = 0; i < objetos.length; i++) {
      for (let j = i + 1; j < objetos.length; j++) {
        pares.push({ tipo: 'objeto', clave: `${a}: ${objetos[i]} / ${objetos[j]}`, a: accion('nina', a, recorte(objetos[i])), b: accion('nina', a, recorte(objetos[j])) });
      }
    }
  }
  // El niño y la niña solo van juntos en B2, con las acciones que llevan objeto.
  for (const a of ficha.conObjeto) pares.push({ tipo: 'sujeto', clave: `${a}: niña / niño`, a: accion('nina', a), b: accion('nino', a) });
  for (const figura of ficha.figuras) {
    for (const [referencia, relaciones] of Object.entries(ficha.lugares)) {
      for (let i = 0; i < relaciones.length; i++) {
        for (let j = i + 1; j < relaciones.length; j++) {
          const lugar = (relacion) => ({ tipo: 'lugar', figura: recorte(figura), referencia, relacion });
          pares.push({ tipo: 'lugar', clave: `${figura} ${referencia}: ${relaciones[i]} / ${relaciones[j]}`, a: lugar(relaciones[i]), b: lugar(relaciones[j]) });
        }
      }
    }
  }
  return pares;
}

// Un par se distingue a un tamaño si su mayor zona de cambio pasa el umbral.
export const seDistingue = (m, umbral = UMBRAL) => m.ladoMm >= umbral.ladoMm && m.areaMm2 >= umbral.areaMm2;

// Los pares que no pasan el filtro a un tamaño.
export const noPasan = (pares, cm) => pares.filter((p) => !seDistingue(p.porTamano[cm])).map((p) => p.clave);

// El menor de TAMANOS_CM en que todos los pares pasan el filtro (null si ninguno).
export const tamanoDelFiltro = (pares) => TAMANOS_CM.find((cm) => noPasan(pares, cm).length === 0) ?? null;

// En el navegador: dibuja las dos escenas y mide la mayor zona de cambio.
async function medirEnPagina(page, pares) {
  return page.evaluate(
    async ({ pares, TAMANOS_CM, CM_PX, DPR }) => {
      const { escenaSVG } = await import('/src/activities/escenas.js');
      const cache = new Map();
      const dataURI = async (src) => {
        if (!cache.has(src)) {
          const blob = await (await fetch(`/${src}`)).blob();
          cache.set(src, await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }));
        }
        return cache.get(src);
      };
      const pintar = async (escena, lado) => {
        let svg = escenaSVG(escena).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" `);
        for (const [, src] of svg.matchAll(/href="([^"]+)"/g)) svg = svg.replaceAll(`href="${src}"`, `href="${await dataURI(src)}"`);
        const img = new Image();
        img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        await img.decode();
        const c = new OffscreenCanvas(lado, lado);
        const g = c.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, lado, lado);
        g.drawImage(img, 0, 0, lado, lado);
        return g.getImageData(0, 0, lado, lado).data;
      };
      const zonaMayor = (a, b, lado, radio) => {
        const original = new Uint8Array(lado * lado);
        for (let k = 0; k < lado * lado; k++) {
          const i = k * 4;
          original[k] = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 48 ? 1 : 0;
        }
        // Dilatación cuadrada de «radio» píxeles, en dos pasadas (filas y columnas).
        const filas = new Uint8Array(lado * lado);
        for (let y = 0; y < lado; y++) {
          for (let x = 0; x < lado; x++) {
            if (!original[y * lado + x]) continue;
            for (let d = Math.max(0, x - radio); d <= Math.min(lado - 1, x + radio); d++) filas[y * lado + d] = 1;
          }
        }
        const cambia = new Uint8Array(lado * lado);
        for (let x = 0; x < lado; x++) {
          for (let y = 0; y < lado; y++) {
            if (!filas[y * lado + x]) continue;
            for (let d = Math.max(0, y - radio); d <= Math.min(lado - 1, y + radio); d++) cambia[d * lado + x] = 1;
          }
        }
        const visto = new Uint8Array(lado * lado);
        let mejor = { n: 0, x0: 0, y0: 0, x1: -1, y1: -1 };
        const pila = [];
        for (let k = 0; k < lado * lado; k++) {
          if (!cambia[k] || visto[k]) continue;
          const z = { n: 0, x0: lado, y0: lado, x1: 0, y1: 0 };
          pila.push(k);
          visto[k] = 1;
          while (pila.length) {
            const q = pila.pop();
            const x = q % lado;
            const y = (q - x) / lado;
            if (original[q]) {
              z.n++;
              z.x0 = Math.min(z.x0, x); z.x1 = Math.max(z.x1, x); z.y0 = Math.min(z.y0, y); z.y1 = Math.max(z.y1, y);
            }
            for (const v of [q - 1, q + 1, q - lado, q + lado]) {
              if (v < 0 || v >= lado * lado || visto[v] || !cambia[v]) continue;
              if ((v === q - 1 && x === 0) || (v === q + 1 && x === lado - 1)) continue;
              visto[v] = 1;
              pila.push(v);
            }
          }
          if (z.n > mejor.n) mejor = z;
        }
        return mejor;
      };
      const salida = [];
      for (const par of pares) {
        const porTamano = {};
        for (const cm of TAMANOS_CM) {
          const lado = Math.round(cm * CM_PX * DPR);
          const pxMm = (CM_PX * DPR) / 10;
          const z = zonaMayor(await pintar(par.a, lado), await pintar(par.b, lado), lado, Math.round(pxMm));
          const ancho = (z.x1 - z.x0 + 1) / pxMm;
          const alto = (z.y1 - z.y0 + 1) / pxMm;
          porTamano[cm] = { areaMm2: +(z.n / pxMm ** 2).toFixed(1), ladoMm: +Math.min(ancho, alto).toFixed(1) };
        }
        salida.push({ tipo: par.tipo, clave: par.clave, porTamano });
      }
      return salida;
    },
    { pares, TAMANOS_CM, CM_PX, DPR },
  );
}

// Lámina de los pares ambiguos, a tamaño real en la tableta de referencia (escena de 4.5 cm).
async function lamina(page, pares, ruta, cm) {
  const lado = Math.round(cm * CM_PX);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(
    async ({ pares, lado }) => {
      const { escenaSVG } = await import('/src/activities/escenas.js');
      document.body.style.cssText = 'margin:0;background:#fff;font:14px sans-serif';
      document.body.innerHTML = pares
        .map((p) => `<div style="display:inline-block;margin:8px;padding:6px;border:1px solid #bbb"><div>${p.clave}</div>${[p.a, p.b].map((e) => `<span style="display:inline-block;width:${lado}px;height:${lado}px;margin:4px">${escenaSVG(e)}</span>`).join('')}</div>`)
        .join('');
      await Promise.all([...document.images].map((i) => i.decode?.().catch(() => {})));
    },
    { pares, lado },
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: ruta, fullPage: true });
}

async function main() {
  const require = createRequire(import.meta.url);
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.error('Este script necesita Playwright con Chromium (npm install playwright).');
    process.exit(1);
  }
  const http = await import('node:http');
  const tipos = { '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.html': 'text/html' };
  const servidor = http.createServer((req, res) => {
    const camino = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (camino === '/medicion') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><meta charset="utf-8"><title>Medición</title>');
    const ruta = join(ROOT, camino);
    try {
      const cuerpo = readFileSync(ruta);
      res.writeHead(200, { 'content-type': tipos[ruta.slice(ruta.lastIndexOf('.'))] ?? 'application/octet-stream' });
      res.end(cuerpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => servidor.listen(0, r));
  const base = `http://localhost:${servidor.address().port}`;
  const navegador = await playwright.chromium.launch();
  try {
    const page = await navegador.newPage({ deviceScaleFactor: DPR });
    await page.goto(`${base}/medicion`); // una página vacía del mismo origen
    const ficha = readJSON('fichas/ACT-04.json');
    const pares = paresDeEscenas(ficha);
    const medidos = await medirEnPagina(page, pares);
    const escena = ficha.opcionMinCm;
    const revisados = ficha.accionesAmbiguas.flatMap((a) => a.pares);
    const medicion = {
      tabletaCmPx: CM_PX,
      dpr: DPR,
      tamanosCm: TAMANOS_CM,
      umbral: UMBRAL,
      escenaCm: escena,
      noPasanAlTamanoDeEscena: noPasan(medidos, escena),
      tamanoEnQueTodosPasan: tamanoDelFiltro(medidos),
      ambiguosDeLaRevision: revisados,
      pares: medidos,
    };
    writeFileSync(join(ROOT, 'docs/medicion-escenas.json'), JSON.stringify(medicion, null, 2) + '\n');
    const claves = new Set([...revisados, ...medicion.noPasanAlTamanoDeEscena]);
    await lamina(page, pares.filter((p) => claves.has(p.clave)), join(ROOT, 'docs/escenas-tamano-real.png'), escena);
    console.log(`Pares medidos: ${medidos.length}. A ${escena} cm no pasan el filtro: ${medicion.noPasanAlTamanoDeEscena.join(', ') || 'ninguno'}. Todos pasan desde ${medicion.tamanoEnQueTodosPasan} cm.`);
  } finally {
    await navegador.close();
    servidor.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
