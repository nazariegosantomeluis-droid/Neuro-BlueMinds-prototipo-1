// Calibración del multiplicador k de la MAD de la banda de variación del panel (decisión R12;
// Modelo 6.3 y 13; H5.2). Se mantienen la línea base de 5 sesiones y las 2 sesiones consecutivas;
// se elige el menor k (en pasos de 0.1 desde 2.0) con menos de 5 % de falsas señales por indicador
// con ruido normal y con ruido t de Student de 5 grados de libertad (colas pesadas). «Menos de 5 %»
// se exige con el error de la simulación: el límite superior del intervalo de Wilson de 95 % de la
// tasa simulada debe quedar debajo de 5 %. Después se
// reporta la sensibilidad: proporción de señales cuando el valor real se desplaza 1 y 2
// desviaciones estándar del ruido después de la línea base.
//
// Generador: splitmix32 propio con semilla fija; normales por Box-Muller; t5 = Z / √(χ²₅ / 5),
// con χ²₅ como suma de 5 normales al cuadrado. Uso: node tools/simular-banda.mjs [repeticiones]
import { senalSimulada } from '../src/panel/panel.js';
import { wilson } from '../src/indicadores/estadistica.js';

export function generador(semilla) {
  // splitmix32: estado de 32 bits que avanza por una constante impar (periodo 2^32) y una mezcla.
  let x = semilla >>> 0;
  const u = () => {
    x = (x + 0x9e3779b9) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-300))) * Math.cos(2 * Math.PI * u());
  return { u, normal };
}

export const RUIDOS = {
  normal: { sd: 1, crear: (g) => g.normal },
  t5: { sd: Math.sqrt(5 / 3), crear: (g) => () => g.normal() / Math.sqrt(Array.from({ length: 5 }, () => g.normal() ** 2).reduce((x, y) => x + y, 0) / 5) },
};

// Proporción de señales con k, ruido y desplazamiento (en desviaciones estándar del ruido).
export function tasa({ k, ruido = 'normal', desviaciones = 0, repeticiones = 100000, semilla = 20261124 }) {
  const R = RUIDOS[ruido];
  const z = R.crear(generador(semilla));
  let senales = 0;
  for (let i = 0; i < repeticiones; i++) if (senalSimulada(z, { mads: k, desplazamiento: desviaciones * R.sd })) senales++;
  return senales / repeticiones;
}

// El menor k (pasos de 0.1 desde 2.0) con menos de 5 % de falsas señales con los dos ruidos.
export function elegirK({ repeticiones = 100000, semilla = 20261124, limite = 0.05 } = {}) {
  const filas = [];
  for (let k10 = 20; k10 <= 50; k10++) {
    const k = k10 / 10;
    const fila = { k, normal: tasa({ k, ruido: 'normal', repeticiones, semilla }), t5: tasa({ k, ruido: 't5', repeticiones, semilla }) };
    const superior = (p) => wilson(Math.round(p * repeticiones), repeticiones)[1];
    Object.assign(fila, { normalSuperior: superior(fila.normal), t5Superior: superior(fila.t5) });
    filas.push(fila);
    if (fila.normalSuperior < limite && fila.t5Superior < limite) return { k, filas };
  }
  return { k: null, filas };
}

export function sensibilidad(k, { repeticiones = 100000, semilla = 20261124 } = {}) {
  return Object.fromEntries(Object.keys(RUIDOS).map((ruido) => [ruido, Object.fromEntries([1, 2].map((d) => [`${d} DE`, tasa({ k, ruido, desviaciones: d, repeticiones, semilla })]))]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const repeticiones = Number(process.argv[2] ?? 100000);
  const { k, filas } = elegirK({ repeticiones });
  const pct = (x) => `${(100 * x).toFixed(2)} %`;
  console.log(`Falsas señales por indicador (línea base de 5, 2 sesiones consecutivas, ${repeticiones} repeticiones):`);
  for (const f of filas) console.log(`  k = ${f.k.toFixed(1)}: normal ${pct(f.normal)} (hasta ${pct(f.normalSuperior)}), t5 ${pct(f.t5)} (hasta ${pct(f.t5Superior)})`);
  console.log(`Menor k con menos de 5 % con los dos ruidos (límite superior de Wilson): ${k}`);
  const s = sensibilidad(k, { repeticiones });
  for (const [ruido, x] of Object.entries(s)) console.log(`  Sensibilidad con k = ${k} (${ruido}): ${Object.entries(x).map(([d, v]) => `${d} ${pct(v)}`).join('; ')}`);
}
