// Configuración firmada para las tabletas (decisión D6; Arquitectura 9.6 y 14). La prepara el
// investigador responsable en su computadora:
//   node tools/configuracion.mjs --llaves <investigador-privadas.json> entrada.json salida.json
// entrada.json: { "numero": 1, "dispositivos": ["<id de la tableta>", …] (opcional),
//   "ninos": [{ "codigo"?: "…", "edad_meses": 70, "consentimiento": "vigente", "modo_fase": "fase1",
//               "video": false, "bandas"?: { "ACT-02": "B2" } }],
//   "resultados"?: { "<codigo>": { "mejor_modalidad": [{ "actividad", "modalidad": "V"|"AV"|"sin_diferencia", "fecha" }],
//                                   "nivel_b": [{ "parametro", "valor", "ic_inferior", "ic_superior", "fecha" }] } } }
// A un niño sin código se le da uno nuevo de 128 bits con su ícono y color; el código se imprime
// para que el investigador lo anote en su lista de identidades, que nunca entra a la tableta.
// La configuración no admite ningún otro dato del niño. Cada configuración nueva lleva un número
// mayor: la tableta rechaza una igual o más vieja, y una con firma inválida.
import { readFileSync, writeFileSync } from 'node:fs';
import { firmar } from '../src/transporte/cripto.js';
import { verificarConfiguracion, FORMATO_CONFIGURACION, VERSION_LOTE } from '../src/transporte/formato.js';
import { nuevoCodigo, asignarIconoColor, abreviar } from '../src/ninos.js';

export async function prepararConfiguracion(entrada, privadas, { emitida = new Date().toISOString() } = {}) {
  const ninos = [];
  const nuevos = [];
  const permitidos = ['codigo', 'icono', 'color', 'edad_meses', 'consentimiento', 'video', 'modo_fase', 'bandas'];
  for (const n of entrada.ninos ?? []) {
    const extra = Object.keys(n).filter((k) => !permitidos.includes(k));
    if (extra.length) throw new Error(`Campo no permitido en el padrón: ${extra.join(', ')}. La configuración no lleva datos que identifiquen al niño.`);
    const codigo = n.codigo ?? nuevoCodigo();
    const iconoColor = n.icono && n.color ? { icono: n.icono, color: n.color } : asignarIconoColor(codigo, ninos);
    if (!n.codigo) nuevos.push(codigo);
    ninos.push({ codigo, ...iconoColor, edad_meses: n.edad_meses, consentimiento: n.consentimiento ?? 'vigente', video: Boolean(n.video), modo_fase: n.modo_fase ?? 'familiarizacion', ...(n.bandas ? { bandas: n.bandas } : {}) });
  }
  const c = { formato: FORMATO_CONFIGURACION, version: VERSION_LOTE, numero: entrada.numero, emitida, ...(entrada.dispositivos ? { dispositivos: entrada.dispositivos } : {}), ninos, resultados: entrada.resultados ?? {} };
  const v = verificarConfiguracion(c);
  if (!v.ok) throw new Error(`La configuración no es válida: ${v.motivo}.`);
  return { configuracion: await firmar(c, privadas.firma), nuevos };
}

if (process.argv[1]?.endsWith('configuracion.mjs')) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--llaves');
  const llaves = i >= 0 ? args.splice(i, 2)[1] : null;
  const [entrada, salida] = args;
  if (!llaves || !entrada || !salida) {
    console.error('Uso: node tools/configuracion.mjs --llaves <investigador-privadas.json> entrada.json salida.json');
    process.exit(1);
  }
  const { configuracion, nuevos } = await prepararConfiguracion(JSON.parse(readFileSync(entrada, 'utf8')), JSON.parse(readFileSync(llaves, 'utf8')));
  writeFileSync(salida, JSON.stringify(configuracion, null, 2) + '\n');
  console.log(`Configuración ${configuracion.numero} firmada en ${salida} (${configuracion.ninos.length} niños).`);
  for (const c of nuevos) console.log(`Código nuevo: ${c} (se muestra como ${abreviar(c)}). Anótalo en la lista de identidades, fuera de la plataforma.`);
}
