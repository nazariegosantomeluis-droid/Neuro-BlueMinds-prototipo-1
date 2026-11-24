// Regla de adaptación y envolvente durante un bloque (H4.1 a H4.3; Arquitectura 7.1). Lógica pura,
// sin DOM: la usan app.js (en la sesión), tools/simular-sesiones.mjs (sesiones simuladas) y
// tools/reproducir.mjs (reproducción, Arquitectura 10.2), para que las tres decidan igual.
//
// Al cerrar cada ventana de 10 ensayos válidos del bloque, la regla propone y la envolvente decide.
// Si ejecuta un cambio de banda, el bloque se corta ahí. Una orden de malestar después de la última
// ventana también es señal: se decide al terminar el bloque (vale para el bloque siguiente).
//
// Cada decisión queda en un registro con lo necesario para reproducirla: los valores de la ventana,
// la decisión, el invariante, los ensayos válidos de la actividad en la sesión y el tiempo de uso
// (INV-8). Las órdenes del terapeuta llevan propuestas_previas (cuántas decisiones había cuando se
// dieron), así la reproducción las aplica en el mismo punto.
import { contextoDeRegla, proponerVentana, propuestasFinales, ventanas, ordenDeMalestar } from './adaptacion.js';
import { motivoDeBloqueo } from './envolvente.js';

// envolvente: la de la sesión. bandas: ids de la ficha. estado: el de la sesión ({ sinSubir }).
// base: lineaBaseRegulacion(…) o null. ordenesDelBloque(): las órdenes del terapeuta del bloque
// hasta ahora. ensayosValidos(): ensayos válidos de la actividad en la sesión (con los del bloque).
// usoMs(): tiempo de uso de la sesión. registrar(registro, res): guarda cada decisión.
export function crearAdaptacionDeBloque({ envolvente, actividad, bandas, estado, base = null, ordenesDelBloque = () => [], ensayosValidos, usoMs, registrar = () => {} }) {
  const regla = contextoDeRegla({ bandas, estado, base });
  let vistas = 0;

  function decidir(p) {
    const validos = ensayosValidos();
    const uso = usoMs();
    const accion = { tipo: p.accion, actividad, hasta: p.banda_propuesta, ensayosValidos: validos, usoMs: uso, senal: Boolean(p.senal), evidencia: { precision: p.precision, omisiones: p.omisiones, prematuras: p.prematuras } };
    const res = envolvente.evaluar(accion);
    const registro = {
      ...p,
      ejecutada: res.ejecutada,
      invariante: res.invariante,
      motivo_no_ejecutada: res.ejecutada ? null : (motivoDeBloqueo(res.invariante) ?? p.motivo),
      pausa_ofrecida: res.pausa,
      banda_resultante: res.banda,
      ensayos_validos: validos,
      uso_ms: uso,
      adaptacion_activa: envolvente.estado.adaptacion,
    };
    registrar(registro, res);
    return { ...res, cambio: res.ejecutada && res.banda !== res.desde, registro };
  }

  return {
    regla,
    // Después de cada ensayo del bloque: si cerró una ventana nueva, la decide. Devuelve la decisión
    // o null.
    alTerminarEnsayo(filasDelBloque) {
      const vs = ventanas(filasDelBloque);
      if (vs.length === vistas) return null;
      vistas = vs.length;
      regla.malestar = ordenesDelBloque().filter(ordenDeMalestar);
      return decidir(proponerVentana(vs.at(-1), vs.length - 1, regla));
    },
    // Al terminar el bloque: las órdenes de malestar que quedaron sin ventana.
    alTerminarBloque(filasDelBloque) {
      regla.malestar = ordenesDelBloque().filter(ordenDeMalestar);
      return propuestasFinales(filasDelBloque, regla).map(decidir);
    },
  };
}
