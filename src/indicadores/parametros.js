// Parámetros de los indicadores del núcleo (H3; Modelo matemático e indicadores, documento 03).
// Todos los umbrales, mínimos de datos y constantes viven aquí, cada uno con la sección de la que
// sale. Las funciones de src/indicadores/ no tienen números propios. Cambiar un valor de este
// archivo es cambiar una definición: sube su versión en VERSIONES (Arquitectura 6.2).
//
// Fuente: el Modelo matemático del zip del proyecto del 8 de noviembre de 2026, con las decisiones
// D2 a D5 del 12 de noviembre (hoja de ruta del prototipo, sección 2).

export const VERSION_INDICADORES = '0.2.0';

export const PARAMETROS = Object.freeze({
  // Todo indicador se reporta con su intervalo de 95 % (Modelo 2.3).
  confianza: { valor: 0.95, seccion: 'Modelo 2.3' },
  // Calidad media mínima de la sesión para mostrar cualquier indicador (Modelo 3.4 y 7.2;
  // Arquitectura 6.4).
  calidadMinima: { valor: 0.8, seccion: 'Modelo 3.4 y 7.2; Arquitectura 6.4' },
  // MAD escalada: comparable con una desviación estándar con datos normales (Modelo 3.2).
  madEscala: { valor: 1.4826, seccion: 'Modelo 3.2' },
  // Interrupción técnica: pérdida de foco o de cuadros durante el ensayo; el ensayo sale de todos
  // los indicadores (Modelo 3.3; Arquitectura 5.2). Con 1, basta un cuadro perdido.
  cuadrosPerdidosExcluyen: { valor: 1, seccion: 'Modelo 3.3; Arquitectura 5.2' },
  // Intervalos (Modelo 7.1 y decisión D2): Wilson para proporciones; estadísticos de orden para
  // medianas; A6 con Theil-Sen e intervalo por tau de Kendall; A3 y A7 con bootstrap de percentiles,
  // 2,000 remuestras, generador mulberry32 y semilla FNV-1a del texto «sesion:actividad:indicador».
  bootstrap: { remuestras: 2000, metodo: 'percentiles (cuantil tipo 1)', generador: 'mulberry32', semilla: 'FNV-1a de «sesion_id:actividad:indicador»', seccion: 'Modelo 7.1; decisión D2' },
  // Mínimos de datos de planeación (Modelo 4.1).
  minimos: {
    A1: { valor: 20, unidad: 'ensayos', seccion: 'Modelo 4.1' },
    A2: { valor: 20, unidad: 'ensayos válidos', seccion: 'Modelo 4.1' },
    A3: { valor: 30, unidad: 'ensayos válidos', seccion: 'Modelo 4.1' },
    A4: { valor: 20, unidad: 'ensayos', seccion: 'Modelo 4.1' },
    A5: { valor: 20, unidad: 'ensayos', seccion: 'Modelo 4.1' },
    A6: { valor: 30, unidad: 'ensayos válidos', seccion: 'Modelo 4.1' },
    A7: { valor: 10, unidad: 'ensayos de cada tipo', seccion: 'Modelo 4.1' },
    A8: { valor: 10, unidad: 'errores', seccion: 'Modelo 4.1' },
    A10: { valor: 10, unidad: 'oportunidades', seccion: 'Modelo 4.1' },
    A11: { valor: 5, unidad: 'actividades', seccion: 'Modelo 4.1' },
    A12: { valor: 5, unidad: 'sesiones', seccion: 'Modelo 4.1' },
  },
  // A6: los 30 ensayos deben abarcar al menos 5 minutos, con dificultad constante (Modelo 4.1 y 4.2).
  a6MinutosMinimos: { valor: 5, seccion: 'Modelo 4.1' },
  // A9: posterior Beta(1 + a, 1 + e); dominado si P(θ > θ*) > confianza. θ* = 0.70 con 95 %
  // (decisión D5), configurable en la ficha («dominio.thetaEstrella»); 0.80 solo como análisis de
  // sensibilidad (Documento rector 4.4; Protocolo 2.4).
  dominio: { thetaEstrella: 0.7, confianza: 0.95, sensibilidad: 0.8, porCada: 100, seccion: 'Modelo 4.3; decisión D5' },
  // Decisiones que el Modelo no precisa (pendientes; README, «Indicadores»):
  // - en el dominio, una omisión cuenta como presentación sin acierto (e incluye omisiones);
  omisionCuentaComoErrorEnDominio: { valor: true, seccion: 'Modelo 4.3 no lo precisa (pendiente)' },
  // - con número de opciones distinto entre ensayos, el azar de A1 es la media de 1/G;
  azarConOpcionesVariables: { valor: 'media de 1/G', seccion: 'Modelo 4.2 define A1 con G fijo (pendiente)' },
  // - los ensayos de sonda (Catálogo 7.3) no entran en A1 a A10 ni en el dominio.
  sondasEnIndicadoresDeSesion: { valor: false, seccion: 'Catálogo 7.3 no lo precisa (pendiente)' },
  // A11 y A12 se calculan al cerrar la sesión sobre las últimas actividades y sesiones del niño
  // (Arquitectura 6.1), sin decir cuántas: el prototipo usa todas las de este dispositivo (pendiente).
  // Una actividad (bloque) se completa si no se terminó desde el menú; una sesión termina antes de lo
  // previsto si se terminó desde el menú (el límite de 15 minutos no cuenta: lo impone la plataforma).
  ventanaPersistencia: { valor: 'todas las del niño en el dispositivo', seccion: 'Arquitectura 6.1 no lo precisa (pendiente)' },
  // Regla de adaptación (C8; Modelo 9.1; Arquitectura 7.2): ventanas de 10 ensayos válidos; subir si
  // la precisión es mayor de 0.85 en dos ventanas consecutivas; bajar si es menor de 0.70 en una;
  // mantener entre 0.70 y 0.85; con señal de regulación, ofrecer pausa y bajar, y no subir en el
  // resto de la sesión. La banda de 0.70 a 0.85 es de planeación (Modelo 9.1).
  adaptacion: { ventana: 10, subirSiMayorDe: 0.85, ventanasParaSubir: 2, bajarSiMenorDe: 0.7, seccion: 'Modelo 9.1; Arquitectura 7.2' },
  // Señal de regulación (Arquitectura 7.3; Modelo 9.2): con línea base, la proporción de omisiones o
  // de respuestas prematuras de la ventana supera el percentil 90 de esa proporción en las ventanas
  // de la línea base del niño; sin línea base, 3 o más omisiones o 3 o más prematuras en la ventana;
  // siempre, un episodio de desregulación marcado o terminar por malestar. Valores de planeación.
  regulacion: { percentil: 0.9, sinLineaBaseOmisiones: 3, sinLineaBasePrematuras: 3, motivoMalestar: 'Desregulación o malestar del niño', seccion: 'Arquitectura 7.3; Modelo 9.2' },
  // Línea base: 5 sesiones válidas (decisión D3; Protocolo 2.4), las primeras de la fase 1 con
  // calidad de 0.80 o más en la actividad. El percentil es el de tipo 7 (interpolación lineal; el que
  // usa R por defecto).
  lineaBase: { sesiones: 5, modo: 'fase1', seccion: 'Modelo 6.2 corregido por D3; Protocolo 2.4 y 3.2' },
  // A6: unidad de la pendiente.
  a6Unidad: { valor: 'ln(ms) por minuto', seccion: 'Modelo 4.2 (t en minutos desde el primer ensayo de la actividad)' },
});

// Versión de definición de cada indicador (Arquitectura 6.2). Remite a la versión del Modelo con
// la que se programó; un cambio de fórmula, umbral o mínimo crea una versión nueva.
export const VERSIONES = Object.freeze({
  A1: '0.1.0', A2: '0.1.0', A3: '0.1.0', A4: '0.1.0', A5: '0.1.0', A6: '0.1.0', A7: '0.1.0', A8: '0.1.0', A9: '0.1.0', A10: '0.1.0', A11: '0.1.0', A12: '0.1.0',
  C8: '0.1.0', regulacion: '0.1.0',
  IG: '0.1.0', IRet: '0.1.0',
});

export const NOMBRES = Object.freeze({
  A1: 'PA, precisión ajustada',
  A2: 'LPR, latencia robusta',
  A3: 'IVI, variabilidad intraindividual',
  A4: 'IRP, respuestas prematuras',
  A5: 'IOM, omisiones',
  A6: 'IFC, pendiente intra-sesión',
  A7: 'PES, enlentecimiento tras error',
  A8: 'IRPE, precisión tras error',
  A9: 'DOM, dominio de ítem',
  A10: 'TEP, errores perseverativos',
  A11: 'IPF, persistencia',
  A12: 'IA, abandono',
  C8: 'Regla de adaptación por bandas',
  regulacion: 'Señal de regulación',
  IG: 'IG, generalización',
  IRet: 'IRet, retención',
});
