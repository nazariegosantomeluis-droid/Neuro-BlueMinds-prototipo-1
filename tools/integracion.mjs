// Prueba de integración (H8.3; Arquitectura 13.1): 500 sesiones simuladas sin campos obligatorios
// vacíos. 25 niños ficticios con la secuencia del estudio, más corta: familiarización, 5 sesiones
// de la fase 1, 4 de la fase 2, 8 de la fase 3 y 2 de cierre (20 cada uno). Cada sesión pasa por el
// motor real en tiempo simulado, la regla de adaptación, la envolvente, la alerta temprana y la
// auditoría (tools/simular-sesiones.mjs), y lo guardado se revisa con tools/campos-obligatorios.mjs.
//   node tools/integracion.mjs [niños = 25]      (escribe docs/verificacion/integracion.json)
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simularSesiones } from './simular-sesiones.mjs';
import { camposVacios } from './campos-obligatorios.mjs';
import { paraExportar } from '../src/engine/quality.js';
import { verificarCadena } from '../src/auditoria.js';

export const SECUENCIA = [['familiarizacion', 1], ['fase1', 5], ['fase2', 4], ['fase3', 8], ['cierre', 2]];

export async function integracion({ ninos = 25, semilla = 8 } = {}) {
  const h = await simularSesiones({ ninos, semilla, secuencia: SECUENCIA });
  // Lo que se revisa es lo exportado (como lo descargaría el investigador).
  const ensayos = paraExportar(h.ensayos, { sinTiempos: [] });
  const vacios = camposVacios({ ensayos, sesiones: h.sesiones });
  const porModo = Object.fromEntries(SECUENCIA.map(([m]) => [m, h.sesiones.filter((s) => s.modo_fase === m).length]));
  return {
    sesiones: h.sesiones.length,
    ensayos: ensayos.length,
    decisiones: h.sesiones.reduce((t, s) => t + (s.adaptacion_propuestas ?? []).length, 0),
    porModo,
    vacios: vacios.length,
    ejemplos: vacios.slice(0, 20),
    auditoria: verificarCadena(h.auditoria),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ninos = Number(process.argv[2] ?? 25);
  const r = await integracion({ ninos });
  const dir = fileURLToPath(new URL('../docs/verificacion/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}integracion.json`, JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), ...r }, null, 2) + '\n');
  console.log(`${r.sesiones} sesiones, ${r.ensayos} ensayos, ${r.decisiones} decisiones de adaptación; campos obligatorios vacíos: ${r.vacios}.`);
}
