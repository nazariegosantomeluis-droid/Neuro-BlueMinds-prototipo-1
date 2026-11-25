// Transporte intercambiable (decisión D6): todo lo que sale o entra a la tableta pasa por aquí.
// «archivo» es el del piloto; «servidor», el de después, con el mismo formato (formato.js) y los
// mismos lotes, recibos y configuración firmada. src/transporte/salida.js solo usa esta interfaz.
import { crearTransporteArchivo } from './archivo.js';
import { crearTransporteServidor } from './servidor.js';

export const TRANSPORTES = ['archivo', 'servidor'];

export function crearTransporte(tipo, opciones) {
  if (tipo === 'archivo') return crearTransporteArchivo(opciones);
  if (tipo === 'servidor') return crearTransporteServidor(opciones);
  throw new Error(`Transporte desconocido: ${tipo}.`);
}

// El del piloto (decisión D6). Para pasar a servidor: { tipo: 'servidor', url: '…' } y el
// identificador de la tableta (docs/servidor/plan.md); nada más cambia.
export const TRANSPORTE_DEL_PILOTO = { tipo: 'archivo' };
