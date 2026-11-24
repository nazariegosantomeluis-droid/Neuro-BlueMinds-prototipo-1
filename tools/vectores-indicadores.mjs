// Genera test/vectores/indicadores.json (H3.6): casos de prueba para reimplementar A1 a A12 en otro
// programa (H3.7, en R) y comparar. Cada caso trae sus entradas (filas del registro por ensayo y de
// sesiones.csv, solo con las columnas que usan los indicadores) y las salidas que da la aplicación
// (las filas de indicadores.csv). Las entradas se generan con el mismo generador con semilla que
// usa el bootstrap, así que el archivo es reproducible.
//
//   node tools/vectores-indicadores.mjs          escribe el archivo
//   test/vectores-indicadores.test.js            falla si el archivo no coincide con lo generado
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rng, seedOf } from '../src/engine/selector.js';
import { marcarFueraDeTarea } from '../src/engine/quality.js';
import { PARAMETROS, VERSION_INDICADORES, VERSIONES } from '../src/indicadores/parametros.js';
import { calcularIndicadores, INDICADORES_COLUMNS } from '../src/indicadores/exportar.js';

export const RUTA_VECTORES = new URL('../test/vectores/indicadores.json', import.meta.url);

export const COLUMNAS_ENTRADA = [
  'sesion_id', 'codigo_nino', 'modo_fase', 'actividad', 'bloque', 'ensayo', 'item', 'banda', 'n_opciones', 't_opciones_insercion', 't_opciones', 'periodo_cuadro_ms',
  'opcion_elegida', 'opcion_elegida_id', 'acierto', 'omision', 'anticipatoria', 'interrumpido', 'perdida_foco',
  'cuadros_perdidos', 'fallo_tecnico', 'tr_bruto_ms', 'tr_corregido_ms', 'fuera_de_tarea', 'peso_calidad', 'sonda',
];

// Normal estándar por Box-Muller con dos números del generador.
const normal = (u) => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
const redondear = (x) => Math.round(x * 10) / 10;

// Una sesión simulada de una actividad. p: probabilidades de cada desenlace; lento: pendiente de ln RT
// por minuto; las opciones elegidas en un error se reparten entre dos distractores para A10.
function sesion({ id, nino, modo = 'fase1', actividad, banda = 'B2', g = 3, n = 30, bloque = 1, semilla, pAcierto = 0.8, pOmision = 0.05, pAnticip = 0.03, pInterrump = 0.02, pCuadro = 0.08, lento = 0, items = (k) => `${actividad}-I${String(k).padStart(2, '0')}` }) {
  const u = rng(seedOf(semilla));
  const filas = [];
  for (let k = 1; k <= n; k++) {
    const t = 3000 + (k - 1) * 12000 + Math.floor(u() * 2000);
    const x = u();
    const omision = x < pOmision;
    const anticipatoria = !omision && x < pOmision + pAnticip;
    const acierto = !omision && u() < pAcierto;
    const tr = omision ? null : anticipatoria ? redondear(60 + u() * 80) : redondear(Math.exp(Math.log(900) + 0.35 * normal(u) + lento * ((t - 3000) / 60000)));
    const interrumpido = u() < pInterrump;
    // Cuadros perdidos: a veces 1 (a tiempo) y a veces 2 (las opciones aparecen 4 cuadros después de
    // insertarlas: tarde para las latencias, decisión R7).
    const cuadros = u() < pCuadro ? (u() < 0.5 ? 1 : 2) : 0;
    filas.push({
      sesion_id: id, codigo_nino: nino, modo_fase: modo, actividad, bloque, ensayo: k, item: items(k), banda, n_opciones: g,
      t_opciones_insercion: redondear(t - (cuadros === 2 ? 4 : 2) * 16.7), t_opciones: t, periodo_cuadro_ms: 16.7,
      opcion_elegida: omision ? null : acierto ? 1 : 2, opcion_elegida_id: omision ? null : acierto ? 'correcta' : u() < 0.6 ? 'distractor-a' : 'distractor-b',
      acierto, omision, anticipatoria, interrumpido, perdida_foco: false, cuadros_perdidos: cuadros, fallo_tecnico: false,
      tr_bruto_ms: tr, tr_corregido_ms: null, fuera_de_tarea: null,
      peso_calidad: interrumpido ? 0 : anticipatoria ? 0 : cuadros ? redondear(1 - 1 / 60) : 1, sonda: false,
    });
  }
  marcarFueraDeTarea(filas, false);
  return filas;
}

const fila = (r) => Object.fromEntries(COLUMNAS_ENTRADA.map((c) => [c, r[c] ?? null]));
const sesionCSV = (id, nino, modo, ordenes = []) => ({ sesion_id: id, codigo_nino: nino, modo_fase: modo, ordenes_terapeuta: ordenes });

export function generarVectores() {
  const casos = [];
  // 1. Una sesión típica de ACT-02 (G = 3) y de ACT-07 (G = 2), en la fase 1.
  {
    const ensayos = [
      ...sesion({ id: 'S-v1', nino: 'nino-a', actividad: 'ACT-02', g: 3, semilla: 'v1:ACT-02', lento: 0.03 }),
      ...sesion({ id: 'S-v1', nino: 'nino-a', actividad: 'ACT-07', g: 2, bloque: 2, n: 30, semilla: 'v1:ACT-07', pAcierto: 0.7, items: (k) => `ACT07-B2-01-${String(k).padStart(2, '0')}` }),
    ];
    casos.push({ nombre: 'sesion-tipica', descripcion: 'Una sesión de fase 1 con ACT-02 (30 ensayos, G = 3, la latencia sube 0.03 ln(ms) por minuto) y ACT-07 (30 ensayos, G = 2).', ensayos, sesiones: [sesionCSV('S-v1', 'nino-a', 'fase1')] });
  }
  // 2. Sesión larga: dos bloques de 40 ensayos de ACT-07 con muchos errores (A3, A6, A7 y A8 disponibles).
  {
    const ensayos = [1, 2].flatMap((b) => sesion({ id: 'S-v6', nino: 'nino-e', actividad: 'ACT-07', g: 2, bloque: b, n: 40, semilla: `v6:${b}`, pAcierto: 0.65, pOmision: 0.02, pAnticip: 0.01, pInterrump: 0, pCuadro: 0, lento: 0.02, items: (k) => `ACT07-B3-${b}-${String(k).padStart(2, '0')}` }).map((r) => ({ ...r, t_opciones: r.t_opciones + (b - 1) * 600000, t_opciones_insercion: r.t_opciones_insercion + (b - 1) * 600000 })));
    casos.push({ nombre: 'sesion-larga', descripcion: 'Dos bloques de 40 ensayos de ACT-07 con precisión cercana a 0.65: A3, A6, A7 y A8 disponibles.', ensayos, sesiones: [sesionCSV('S-v6', 'nino-e', 'fase1')] });
  }
  // 3. Pocos ensayos: casi nada disponible.
  casos.push({ nombre: 'pocos-ensayos', descripcion: '12 ensayos: ningún indicador alcanza su mínimo.', ensayos: sesion({ id: 'S-v2', nino: 'nino-b', actividad: 'ACT-02', n: 12, semilla: 'v2' }), sesiones: [sesionCSV('S-v2', 'nino-b', 'fase1')] });
  // 4. Calidad baja: muchas interrupciones y respuestas anticipatorias.
  casos.push({ nombre: 'calidad-baja', descripcion: 'Calidad de la sesión menor de 0.80 (interrupciones y respuestas anticipatorias frecuentes).', ensayos: sesion({ id: 'S-v3', nino: 'nino-c', actividad: 'ACT-02', semilla: 'v3', pInterrump: 0.15, pAnticip: 0.3 }), sesiones: [sesionCSV('S-v3', 'nino-c', 'fase1')] });
  // 5. Historia: 6 sesiones del mismo niño con los mismos 10 ítems (A9, A10, A11 y A12).
  {
    const ensayos = [];
    const sesiones = [];
    for (let s = 1; s <= 6; s++) {
      const id = `S-v4-${s}`;
      ensayos.push(...sesion({ id, nino: 'nino-d', actividad: 'ACT-02', n: 30, semilla: `v4:${s}`, pAcierto: 0.6 + s * 0.05, items: (k) => `ACT02-B2-${String(((k - 1) % 10) + 1).padStart(2, '0')}` }));
      const ordenes = s === 3 ? [{ accion: 'terminar_bloque', bloque: 1, ensayo: 30 }] : s === 5 ? [{ accion: 'terminar_sesion', bloque: 1, ensayo: 30 }] : [];
      sesiones.push(sesionCSV(id, 'nino-d', 'fase1', ordenes));
    }
    casos.push({ nombre: 'historia-seis-sesiones', descripcion: 'Seis sesiones del mismo niño con 10 ítems que se repiten 3 veces por sesión: dominio acumulado (A9), errores perseverativos contra la sesión anterior (A10), un bloque terminado en la sesión 3 y una sesión terminada en la 5 (A11 y A12).', ensayos, sesiones });
  }
  // 6. Bloque suelto de demostración (sin historia del niño, sin A11 ni A12).
  casos.push({ nombre: 'demostracion', descripcion: 'Sesión de demostración (DEMO-): A9 y A10 solo miran la propia sesión; no hay A11 ni A12.', ensayos: sesion({ id: 'DEMO-v5', nino: 'DEMO', modo: 'prototipo', actividad: 'ACT-01', g: 4, n: 20, semilla: 'v5' }), sesiones: [sesionCSV('DEMO-v5', 'DEMO', 'prototipo')] });

  const u = rng(seedOf('S-v1:ACT-02:A3'));
  return {
    descripcion: 'Vectores de prueba de los indicadores A1 a A12 del prototipo AutiPal (H3.6). Para reimplementarlos en R (H3.7) y comparar: con las entradas de cada caso, las salidas deben coincidir con tolerancia de 1 ms en latencias y exacta en proporciones (Arquitectura 6.3). Las definiciones y los parámetros están en el README («Indicadores del núcleo») y en src/indicadores/parametros.js.',
    version_indicadores: VERSION_INDICADORES,
    versiones_definicion: VERSIONES,
    parametros: PARAMETROS,
    generador: {
      nombre: 'mulberry32',
      algoritmo: 'a = (a + 0x6D2B79F5) mod 2^32; t = a; t = imul(t XOR (t >>> 15), t OR 1); t = t XOR (t + imul(t XOR (t >>> 7), t OR 61)); u = ((t XOR (t >>> 14)) mod 2^32) / 2^32. imul es la multiplicación de enteros de 32 bits con signo y resultado truncado a 32 bits.',
      semilla: 'FNV-1a de 32 bits del texto: h = 0x811C9DC5; por cada punto de código c: h = (h XOR c) · 0x01000193 mod 2^32.',
      remuestreo: 'índice = floor(u · n), con un número u por elemento, grupo por grupo, remuestra por remuestra.',
      comprobacion: { texto: 'S-v1:ACT-02:A3', semilla: seedOf('S-v1:ACT-02:A3'), primeros: [u(), u(), u(), u(), u()] },
    },
    columnas_entrada: COLUMNAS_ENTRADA,
    columnas_salida: INDICADORES_COLUMNS,
    casos: casos.map((c) => ({
      nombre: c.nombre,
      descripcion: c.descripcion,
      entradas: { ensayos: c.ensayos.map(fila), sesiones: c.sesiones },
      salidas: calcularIndicadores(c.ensayos.map(fila), c.sesiones, { fichas: {}, items: [] }),
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const v = generarVectores();
  writeFileSync(RUTA_VECTORES, JSON.stringify(v, null, 1) + '\n');
  console.log(`Escrito test/vectores/indicadores.json: ${v.casos.length} casos, ${v.casos.reduce((t, c) => t + c.salidas.length, 0)} filas de salida.`);
}
