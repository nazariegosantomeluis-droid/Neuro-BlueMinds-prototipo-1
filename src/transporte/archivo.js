// Transporte «archivo» (piloto sin servidor; decisión D6). Lo que sale es un archivo que el
// terapeuta guarda y entrega al investigador responsable (el sobre cifrado: la tableta no puede
// leerlo); lo que entra (recibos y configuración firmada) son archivos que el terapeuta carga.
// La interfaz es la misma que la del transporte «servidor» (src/transporte/servidor.js):
//   entregar(sobre) → { entregado, recibo }   recibir() → [contenido]
// El resto de la aplicación no sabe cuál se usa (src/transporte/index.js).

export const nombreDeLote = (sobre) => `lote-autipal-${sobre.lote_id}.json`;

export function crearTransporteArchivo({ descargar }) {
  const cola = [];
  return {
    tipo: 'archivo',
    async entregar(sobre) {
      descargar(nombreDeLote(sobre), JSON.stringify(sobre), 'application/json');
      // Sin servidor, el recibo llega después, cuando el investigador lo genera con tools/importar.mjs.
      return { entregado: true, recibo: null };
    },
    // El terapeuta cargó un archivo (recibo o configuración): queda en cola para recibir().
    depositar(texto) {
      let contenido;
      try {
        contenido = JSON.parse(String(texto));
      } catch {
        throw new Error('El archivo no es un recibo ni una configuración de AutiPal (no es JSON).');
      }
      cola.push(contenido);
    },
    async recibir() {
      return cola.splice(0);
    },
  };
}
