// Filas sintéticas del registro por ensayo para las pruebas de los indicadores (tanda 4). Solo
// llenan las columnas que usan los indicadores; lo demás queda como en un ensayo sin incidentes.
export function fila(k, cambios = {}) {
  return {
    sesion_id: 'S-prueba',
    codigo_nino: 'n1',
    actividad: 'ACT-02',
    bloque: 1,
    ensayo: k,
    item: `I${k}`,
    banda: 'B2',
    modalidad: 'AV',
    n_opciones: 3,
    t_opciones: 10000 + k * 6000,
    opcion_elegida: 1,
    opcion_elegida_id: 'correcta',
    acierto: true,
    omision: false,
    anticipatoria: false,
    interrumpido: false,
    perdida_foco: false,
    cuadros_perdidos: 0,
    fallo_tecnico: false,
    tr_bruto_ms: 800,
    tr_corregido_ms: null,
    fuera_de_tarea: false,
    peso_calidad: 1,
    sonda: false,
    ...cambios,
  };
}

// n filas numeradas desde 1; f(k) da los cambios de cada una.
export const filas = (n, f = () => ({})) => Array.from({ length: n }, (_, i) => fila(i + 1, f(i + 1)));

export const omision = { opcion_elegida: null, opcion_elegida_id: null, acierto: false, omision: true, tr_bruto_ms: null };
export const errorCon = (id = 'otra') => ({ opcion_elegida: 2, opcion_elegida_id: id, acierto: false });
