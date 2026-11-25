// Historia sembrada del niño de demostración (tanda 10): para que los expertos vean el panel con
// indicadores sin hacer 15 sesiones. Las sesiones salen del simulador con el motor real en tiempo
// simulado (tools/simular-sesiones.mjs): familiarización, 5 de la fase 1 (la línea base), 2 de la
// fase 2 y 4 de la fase 3. El niño es ficticio (código «demo-nino», sesiones DN-…): nunca se exporta
// con los datos reales.
//   node tools/demo-historia.mjs      (escribe config/demo-historia.json)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simularSesiones } from './simular-sesiones.mjs';
import { comoSeExporta } from '../src/engine/logger.js';
import { paraExportar } from '../src/engine/quality.js';
import { NINO_DEMO, PREFIJO_DEMO_NINO } from '../src/ninos.js';

export const SECUENCIA_DEMO = [['familiarizacion', 1], ['fase1', 5], ['fase2', 2], ['fase3', 4]];

const sinNulos = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));

export async function historiaDemo() {
  const h = await simularSesiones({ ninos: 1, semilla: 4, secuencia: SECUENCIA_DEMO });
  const ids = new Map(h.sesiones.map((s, k) => [s.sesion_id, `${PREFIJO_DEMO_NINO}-${String(k + 1).padStart(2, '0')}`]));
  const ensayos = paraExportar(comoSeExporta(h.ensayos), { sinTiempos: [] }).map((r) => sinNulos({ ...r, sesion_id: ids.get(r.sesion_id), codigo_nino: NINO_DEMO, dispositivo: 'demostracion' }));
  const sesiones = h.sesiones.map((s) =>
    sinNulos({
      ...s,
      sesion_id: ids.get(s.sesion_id),
      codigo_nino: NINO_DEMO,
      dispositivo: 'demostracion',
      participacion: 5,
      episodios_confirmados: [],
      eventos_adversos: [],
      registros_completos: true,
      ...(s.modo_fase === 'fase3' ? { consulto_panel: false, decision_informada: false } : {}),
    }),
  );
  return { descripcion: 'Historia ficticia del niño de demostración (tools/demo-historia.mjs). No es de ningún niño real.', nino: { codigo: NINO_DEMO, icono: 'estrella', color: 'verde', edad_meses: 72, consentimiento: 'vigente', video: false, modo_fase: 'fase3', bandas: {} }, ensayos, sesiones };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const d = await historiaDemo();
  const bandas = d.sesiones.find((s) => s.modo_fase === 'familiarizacion')?.banda_inicial_propuesta ?? {};
  d.nino.bandas = bandas;
  writeFileSync(fileURLToPath(new URL('../config/demo-historia.json', import.meta.url)), JSON.stringify(d) + '\n');
  console.log(`config/demo-historia.json: ${d.sesiones.length} sesiones, ${d.ensayos.length} ensayos.`);
}
