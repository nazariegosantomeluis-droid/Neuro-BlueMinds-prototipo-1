// Parámetros de los indicadores del núcleo (H3; Modelo matemático e indicadores, documento 03).
// Todos los umbrales, mínimos de datos y constantes viven aquí, cada uno con la sección de la que
// sale. Las funciones de src/indicadores/ no tienen números propios. Cambiar un valor de este
// archivo es cambiar una definición: sube su versión en VERSIONES (Arquitectura 6.2).
//
// Fuente: el Modelo matemático del zip del proyecto del 8 de noviembre de 2026, con las decisiones
// D2 a D5 del 12 de noviembre (hoja de ruta del prototipo, sección 2) y las decisiones R1 a R11 del
// 23 de noviembre (claude/Pendientes_clinicos_y_del_Modelo.md, sección 1), que mandan sobre los
// valores provisionales.

export const VERSION_INDICADORES = '0.3.0';

export const PARAMETROS = Object.freeze({
  // Todo indicador se reporta con su intervalo de 95 % (Modelo 2.3).
  confianza: { valor: 0.95, seccion: 'Modelo 2.3' },
  // Calidad media mínima de la sesión para mostrar cualquier indicador (Modelo 3.4 y 7.2;
  // Arquitectura 6.4).
  calidadMinima: { valor: 0.8, seccion: 'Modelo 3.4 y 7.2; Arquitectura 6.4' },
  // MAD escalada: comparable con una desviación estándar con datos normales (Modelo 3.2).
  madEscala: { valor: 1.4826, seccion: 'Modelo 3.2' },
  // Cuadros perdidos (decisión R7, 23 nov 2026): la pérdida de foco excluye el ensayo de todo; la
  // pérdida de cuadros no lo excluye de A1 ni de A9 (no cambia si la respuesta fue correcta). Para
  // las latencias (A2, A3, A6 y A7) se excluye solo si las opciones aparecieron tarde: más de 2
  // cuadros entre t_opciones_insercion y t_opciones. Fuera de eso, los cuadros perdidos solo bajan
  // el peso de calidad (Modelo 3.4). Las pérdidas importan sobre todo en el momento de aparición
  // (Anwyl-Irvine et al., 2021). Sin periodo_cuadro_ms registrado, se supone 60 Hz.
  cuadrosAparicionMaximos: { valor: 2, seccion: 'Decisión R7, 23 nov 2026 (Modelo 3.3 y 3.4)' },
  periodoCuadroSupuestoMs: { valor: 1000 / 60, seccion: 'Decisión R7, 23 nov 2026; Arquitectura 5.3 (60 Hz)' },
  // Intervalos (Modelo 7.1 y decisión D2): Wilson para proporciones; estadísticos de orden para
  // medianas; A6 con Theil-Sen e intervalo por tau de Kendall; A3 y A7 con bootstrap de percentiles,
  // 2,000 remuestras, generador mulberry32 y semilla FNV-1a del texto «sesion:actividad:indicador».
  bootstrap: { remuestras: 2000, metodo: 'percentiles (cuantil tipo 1)', generador: 'mulberry32', semilla: 'FNV-1a de «sesion_id:actividad:indicador»', seccion: 'Modelo 7.1; decisión D2' },
  // Mínimos de datos de planeación (Modelo 4.1).
  minimos: {
    A1: { valor: 20, unidad: 'ensayos con respuesta', seccion: 'Modelo 4.1; decisión R3, 23 nov 2026' },
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
  // Omisiones (decisión R3, 23 nov 2026): A1 y A9 se calculan sobre los ensayos con respuesta; la
  // corrección por azar 1/G supone que el niño eligió una opción, y puntuar las omisiones como
  // errores sesga la estimación de la habilidad (Lord, 1974; Pohl et al., 2014). Las omisiones solo
  // entran en A5, que se reporta siempre junto a A1 (Modelo 3.3).
  omisionesEnA1yA9: { valor: 'excluidas', seccion: 'Decisión R3, 23 nov 2026 (Modelo 3.3, 4.2 y 4.3)' },
  // - con número de opciones distinto entre ensayos, el azar de A1 es la media de 1/G;
  azarConOpcionesVariables: { valor: 'media de 1/G', seccion: 'Modelo 4.2 define A1 con G fijo (pendiente)' },
  // Los ensayos de sonda (Catálogo 7.3) no entran en A1 a A10 ni en el dominio: son otro tipo de
  // ensayo (ejemplar no entrenado, sin corrección) (decisión R4, 23 nov 2026).
  sondasEnIndicadoresDeSesion: { valor: false, seccion: 'Decisión R4, 23 nov 2026 (Catálogo 7.3)' },
  // A11 y A12 (decisión R8, 23 nov 2026): por niño, acumulados dentro de la fase y reiniciados al
  // cambiar de fase; disponibles desde 5 actividades o 5 sesiones; se reportan como resumen de fase,
  // no como indicador por sesión para detectar cambios (las fases tienen estructura distinta).
  // Una actividad (bloque) se completa si no se terminó desde el menú; una sesión termina antes de lo
  // previsto si se terminó desde el menú (el límite de 15 minutos no cuenta: lo impone la plataforma).
  ventanaPersistencia: { valor: 'la fase actual del niño, desde su primera sesión en ella', seccion: 'Decisión R8, 23 nov 2026 (Modelo 4.1; Arquitectura 6.1)' },
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
  // Envolvente de seguridad (C9, H4.3; Arquitectura 7.4): entre dos cambios de banda automáticos de
  // una actividad, al menos una ventana de 10 ensayos válidos (INV-1); no más de 4 subidas por
  // sesión (INV-3); después de una bajada, 30 ensayos válidos antes de volver a subir (INV-4); a los
  // 15 minutos de uso no se sube (INV-8); un aviso al terapeuta cuando se bloquean 3 acciones en una
  // sesión.
  envolvente: { ensayosEntreCambios: 10, subidasPorSesion: 4, ensayosTrasBajada: 30, limiteMinutos: 15, bloqueosParaAviso: 3, seccion: 'Arquitectura 7.4 (INV-1, INV-3, INV-4, INV-8)' },
  // Señales de alerta temprana (H4.4; Modelo 10.1 y 13.7): autocorrelación de orden 1 y varianza del
  // residuo del tiempo de respuesta (ln TR menos la media de ln TR de la actividad en la sesión) en
  // una ventana móvil de W ensayos; τ de Kendall de cada serie contra el tiempo. Los umbrales c_ρ y
  // c_V se calibran con series simuladas sin transición (ruido normal independiente del mismo largo)
  // como el cuantil 1 − α; W = 10 y α = 0.05 son valores de planeación (el Modelo no los fija). Solo
  // en modo de observación: se calculan y se guardan, nunca se muestran ni se usan (INV-9).
  alertaTemprana: { ventana: 10, alfa: 0.05, simulaciones: 2000, semilla: 'FNV-1a de «alerta:n_ventanas»', seccion: 'Modelo 10.1 y 13.7; RF-11; INV-9 (W y α de planeación)' },
});

// Versión de definición de cada indicador (Arquitectura 6.2). Remite a la versión del Modelo con
// la que se programó; un cambio de fórmula, umbral o mínimo crea una versión nueva.
export const VERSIONES = Object.freeze({
  A1: '0.3.0', A2: '0.2.0', A3: '0.2.0', A4: '0.2.0', A5: '0.2.0', A6: '0.2.0', A7: '0.2.0', A8: '0.2.0', A9: '0.3.0', A10: '0.2.0', A11: '0.2.0', A12: '0.2.0',
  C8: '0.2.0', regulacion: '0.2.0', C9: '0.1.0', alerta: '0.1.0',
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
  C9: 'Envolvente de seguridad',
  alerta: 'Señales de alerta temprana (solo observación)',
  IG: 'IG, generalización',
  IRet: 'IRet, retención',
});
