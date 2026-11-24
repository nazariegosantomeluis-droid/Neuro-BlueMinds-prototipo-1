// Envolvente de seguridad (C9, H4.3; Arquitectura 7.1 y 7.4) y huella de los parámetros (H4.5;
// INV-6). Lógica pura, sin DOM.
//
// La regla de adaptación (C8, src/adaptacion.js) propone; la envolvente decide si la propuesta se
// ejecuta. Una acción bloqueada no se ejecuta y queda registrada con el invariante que la bloqueó;
// a los 3 bloqueos en una sesión se avisa al terapeuta en el panel.
//
//   INV-1  La banda cambia como máximo un nivel por ventana de 10 ensayos válidos.
//   INV-2  Después de una señal de regulación, la banda no sube en lo que resta de la sesión.
//   INV-3  No más de 4 subidas por sesión; las bajadas no se limitan.
//   INV-4  Después de una bajada, la banda no sube antes de 30 ensayos válidos.
//   INV-5  Si el terapeuta fijó la banda o desactivó la adaptación, ninguna acción automática la cambia.
//   INV-6  Los parámetros de la regla son los cargados al iniciar; su huella se comprueba antes de cada acción.
//   INV-7  En los modos con dificultad fija ninguna acción cambia la banda; solo se ofrece pausa.
//   INV-8  A los 15 minutos de uso no se sube (y la sesión no empieza otro bloque).
//   INV-9  Ninguna acción depende de las señales de alerta temprana.
//
// Ningún invariante bloquea una pausa, y solo INV-5 e INV-7 bloquean una bajada (Arquitectura 7.4).
// Las únicas excepciones son propuestas que la regla no puede producir (saltar más de un nivel, una
// banda que no existe o una evidencia con señales de alerta temprana): se bloquean siempre, con
// INV-1 o INV-9, porque ejecutarlas violaría el invariante.
//
// Los ensayos se cuentan por actividad: ensayosValidos es el número de ensayos válidos (sin
// interrupción técnica) de la actividad en la sesión al cerrar la ventana de la propuesta.
import { PARAMETROS, VERSIONES } from './indicadores/parametros.js';
import { huellaDe } from './huella.js';

export const INVARIANTES = Object.freeze({
  'INV-1': 'La banda cambia como máximo un nivel por ventana de 10 ensayos.',
  'INV-2': 'Después de una señal de regulación, la banda no sube en lo que resta de la sesión.',
  'INV-3': 'No hay más de 4 subidas de banda por sesión.',
  'INV-4': 'Después de una bajada, la banda no vuelve a subir antes de 30 ensayos.',
  'INV-5': 'El terapeuta fijó la banda o desactivó la adaptación: ninguna acción automática cambia la banda.',
  'INV-6': 'Los parámetros de la regla no son los cargados al iniciar la sesión (la huella no coincide).',
  'INV-7': 'En este modo de fase la dificultad es fija: ninguna acción cambia la banda; solo se ofrece pausa.',
  'INV-8': 'Se llegó a 15 minutos de uso: la banda no sube y no empieza otro bloque.',
  'INV-9': 'Ninguna acción depende de las señales de alerta temprana.',
});

// Parámetros de la regla que cubre la huella (INV-6).
export const parametrosDeLaRegla = (P = PARAMETROS, V = VERSIONES) => ({
  adaptacion: P.adaptacion,
  regulacion: P.regulacion,
  lineaBase: P.lineaBase,
  envolvente: P.envolvente,
  versiones: { C8: V.C8, C9: V.C9, regulacion: V.regulacion },
});

export const huellaDeParametros = (parametros = parametrosDeLaRegla()) => huellaDe(parametros);

// Campos que delatan una señal de alerta temprana en la evidencia de una acción (INV-9).
const CLAVES_ALERTA = /alerta|rho|kendall|tau|varianza_residuo/i;
const dependeDeAlerta = (evidencia) => Object.keys(evidencia ?? {}).some((k) => CLAVES_ALERTA.test(k));

const CAMBIAN_BANDA = new Set(['subir', 'bajar', 'pausa_y_bajar']);

// bandas: { actividad: [ids de la más fácil a la más difícil] }; iniciales: { actividad: banda };
// dificultad: la del modo de fase ('fija', 'escalera', 'minima', 'adaptativa'…); adaptacion: si
// empieza activa; parametros: función que devuelve los parámetros vigentes (la envolvente calcula su
// huella antes de cada acción); huella: la de los parámetros al iniciar la sesión.
export function crearEnvolvente({ bandas, iniciales = {}, dificultad = 'adaptativa', adaptacion = true, parametros = () => parametrosDeLaRegla(), huella = null, P = PARAMETROS.envolvente }) {
  const huellaInicial = huella ?? huellaDeParametros(parametros());
  const E = { ...P }; // copia: los límites no cambian aunque cambien los parámetros vigentes
  const estado = {
    bandas: { ...Object.fromEntries(Object.entries(bandas).map(([a, bs]) => [a, iniciales[a] ?? bs[0]])) },
    adaptacion,
    fijadas: new Set(),
    senal: false,
    subidas: 0,
    ultimoCambio: {}, // actividad → ensayosValidos del último cambio automático
    ultimaBajada: {}, // actividad → ensayosValidos de la última bajada (automática o del terapeuta)
    bloqueos: [],
    cambios: [], // pila de cambios de banda (automáticos y del terapeuta), para «Anular el último cambio»
  };
  const fija = ['fija', 'escalera', 'minima'].includes(dificultad);

  function bloqueoDeCambio(a) {
    const bs = bandas[a.actividad] ?? [];
    const desde = estado.bandas[a.actividad];
    const i = bs.indexOf(desde);
    const j = bs.indexOf(a.hasta);
    const sube = a.tipo === 'subir';
    if (fija) return 'INV-7';
    if (!estado.adaptacion || estado.fijadas.has(a.actividad)) return 'INV-5';
    if (j < 0 || i < 0 || Math.abs(j - i) !== 1 || (sube ? j < i : j > i)) return 'INV-1';
    if (dependeDeAlerta(a.evidencia)) return 'INV-9';
    if (!sube) return null; // una bajada bien formada solo la bloquean INV-5 e INV-7
    if (huellaDeParametros(parametros()) !== huellaInicial) return 'INV-6';
    if ((a.usoMs ?? 0) >= E.limiteMinutos * 60000) return 'INV-8';
    if (estado.senal) return 'INV-2';
    if (estado.subidas >= E.subidasPorSesion) return 'INV-3';
    const bajada = estado.ultimaBajada[a.actividad];
    if (bajada !== undefined && a.ensayosValidos - bajada < E.ensayosTrasBajada) return 'INV-4';
    const previo = estado.ultimoCambio[a.actividad];
    if (previo !== undefined && a.ensayosValidos - previo < E.ensayosEntreCambios) return 'INV-1';
    return null;
  }

  function bloquear(a, invariante) {
    estado.bloqueos.push({ actividad: a.actividad, tipo: a.tipo, ensayosValidos: a.ensayosValidos ?? null, invariante });
  }

  return {
    estado,
    huellaInicial,
    // Decide una acción. a: { tipo: 'subir' | 'bajar' | 'pausa_y_bajar' | 'mantener' | 'pausa',
    // actividad, hasta (banda propuesta), ensayosValidos, usoMs, senal (si hubo señal de
    // regulación), evidencia (los valores que la activaron) }.
    // Devuelve { ejecutada, invariante, pausa, banda, desde, aviso }: ejecutada dice si el cambio de
    // banda (o la acción, si no cambia banda) se ejecutó; pausa, si se ofrece pausa.
    evaluar(a) {
      if (a.senal) estado.senal = true; // INV-2: la señal cuenta aunque la bajada se bloquee
      const desde = estado.bandas[a.actividad] ?? null;
      const pausa = a.tipo === 'pausa' || a.tipo === 'pausa_y_bajar';
      let ejecutada = true;
      let invariante = null;
      if (CAMBIAN_BANDA.has(a.tipo) && a.hasta !== desde) {
        invariante = bloqueoDeCambio(a);
        if (invariante) {
          ejecutada = false;
          bloquear(a, invariante);
        } else {
          estado.bandas[a.actividad] = a.hasta;
          estado.ultimoCambio[a.actividad] = a.ensayosValidos;
          if (a.tipo === 'subir') estado.subidas++;
          else estado.ultimaBajada[a.actividad] = a.ensayosValidos;
          estado.cambios.push({ actividad: a.actividad, de: desde, a: a.hasta, origen: 'regla', ensayosValidos: a.ensayosValidos });
        }
      } else if (CAMBIAN_BANDA.has(a.tipo)) {
        // Sin banda a la cual moverse (ya en la más alta o la más baja): nada que ejecutar.
        ejecutada = false;
      }
      return { ejecutada, invariante, pausa, desde, banda: estado.bandas[a.actividad] ?? null, aviso: estado.bloqueos.length >= E.bloqueosParaAviso };
    },
    // Órdenes del terapeuta (Arquitectura 8.1). Nunca las bloquea la envolvente: el terapeuta manda
    // (salvo INV-7, que bloquea el menú antes de llegar aquí).
    terapeuta(orden) {
      if (orden.accion === 'desactivar_adaptacion') estado.adaptacion = false;
      else if (orden.accion === 'reactivar_adaptacion') estado.adaptacion = true;
      else if (orden.accion === 'episodio_desregulacion') estado.senal = true;
      else if (orden.accion === 'fijar_banda') {
        const { actividad, a } = orden.detalle;
        estado.fijadas.add(actividad);
        if (estado.bandas[actividad] !== a) {
          estado.cambios.push({ actividad, de: estado.bandas[actividad], a, origen: 'terapeuta' });
          estado.bandas[actividad] = a;
        }
      } else if (orden.accion === 'anular_cambio_banda') {
        // Revierte el último cambio (de la regla o del terapeuta); la adaptación sigue como estaba.
        // Decisión R14 (23 nov 2026): si la banda baja (anular una subida), cuenta como bajada para
        // INV-4, porque anular una subida y volver a subir enseguida sería un ciclo.
        const ultimo = estado.cambios.pop();
        if (!ultimo) return null;
        const bs = bandas[ultimo.actividad] ?? [];
        if (bs.indexOf(ultimo.de) < bs.indexOf(ultimo.a)) estado.ultimaBajada[ultimo.actividad] = orden.ensayosValidos ?? estado.ultimoCambio[ultimo.actividad] ?? 0;
        // Decisión R14: la subida anulada sigue contando entre las 4 de INV-3 (el niño la vivió).
        estado.bandas[ultimo.actividad] = ultimo.de;
        return ultimo;
      }
      return null;
    },
  };
}

// Motivo legible de una propuesta que no se ejecutó.
export const motivoDeBloqueo = (invariante) => (invariante ? `${invariante}: ${INVARIANTES[invariante]}` : null);
