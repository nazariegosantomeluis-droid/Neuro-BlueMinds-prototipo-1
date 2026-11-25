# Paso a servidor (después del piloto)

Decisión D6 (24 de noviembre de 2026): el piloto va sin servidor. Los datos salen de la tableta en lotes cifrados que el terapeuta entrega como archivo al investigador responsable, y entran como archivos firmados (recibos y configuración). La aplicación queda lista para conectarse a un servidor después sin cambiar el formato de los datos.

## Qué cambia al pasar a servidor

Solo el transporte.

- En la tableta, `TRANSPORTE_DEL_PILOTO` de `src/transporte/index.js` pasa de `{ tipo: 'archivo' }` a `{ tipo: 'servidor', url: '…' }`, con el token de la tableta, y la política de seguridad del contenido de `index.html` (`connect-src`) agrega el origen del servidor. `src/transporte/salida.js`, el registro, el panel y todo lo demás quedan igual: solo llaman a `entregar(sobre)` y `recibir()`.
- Lotes, recibos y configuración son los mismos (`src/transporte/formato.js`): mismo cifrado, mismas firmas, mismos identificadores y sumas. El servidor los recibe en los recursos de `docs/servidor/contrato.yaml` y los importa con el mismo código que `tools/importar.mjs` (`src/transporte/importacion.js`), como hace el servidor de prueba (`test/servidor-prueba.mjs`).
- La llave privada de descifrado pasa al almacén de secretos del servidor. La de firma sigue con el investigador: él firma la configuración en su computadora y la publica (`PUT /configuracion`); los recibos los firma el servidor con una llave propia, que se agrega a `config/investigador.json` en una versión nueva de la aplicación.
- Los lotes del piloto ya importados entran a la base del servidor tal cual: sus registros tienen los mismos identificadores y sumas, así que nada se duplica.

## Requisitos que el servidor tendrá que cumplir (Arquitectura 9.1 a 9.6)

| Sección | Requisito | Cómo se comprueba |
| --- | --- | --- |
| 9.1 | Almacén de identidad en una base separada, con llaves propias y acceso solo del investigador responsable y la coordinación clínica. La API de las tabletas nunca toca la identidad | Revisión del despliegue; prueba de que ningún recurso del contrato devuelve identidad |
| 9.2 | Roles y permisos de la tabla 9.2 (terapeuta, coordinación clínica, investigador, analista, administrador técnico); dos factores para todo acceso web; registro de cada acceso a datos individuales con usuario, rol y motivo | Pruebas por rol; revisión del registro de accesos |
| 9.3 | Token por tableta, revocable; borrado remoto si se pierde; la tableta borra los ensayos solo con el recibo | Prueba de revocación; prueba de `test/transporte.test.js` |
| 9.4 | Envío idempotente con identificador único y suma por registro, confirmación por lote, reintento con espera creciente y aviso tras 7 días sin sincronizar | `test/sincronizacion.test.js` contra el servidor real (cero pérdidas y cero duplicados con cortes de red) |
| 9.5 | TLS 1.2 o superior; cifrado en reposo con AES-256, también en los respaldos; respaldos diarios cifrados con una prueba de restauración al mes; mínimo privilegio para servicios y personas | Auditoría de configuración (escaneo de TLS, configuración del almacenamiento); bitácora de restauraciones |
| 9.5 | Contrato con el proveedor de alojamiento como encargado del tratamiento; cualquier transferencia de datos informada en el aviso de privacidad | Contrato firmado; aviso de privacidad actualizado (Protocolo 9.2 y 9.5) |
| 9.6 | Consentimiento y modo de fase fijados por el investigador (configuración firmada); un retiro detiene la recogida de inmediato y se aplica lo que eligió la familia sobre lo ya recogido | Prueba funcional con una configuración nueva |
| 10.1 | Copia diaria de la huella del último eslabón de la auditoría de cada tableta en un registro independiente | Con servidor, cada lote ya la trae; falta el registro independiente |

## Lista de verificación de despliegue

1. Contrato de encargado del tratamiento firmado con el proveedor; aviso de privacidad actualizado; visto bueno del comité de ética al cambio.
2. Dos bases separadas (datos seudonimizados e identidad), cada una con su llave de cifrado en reposo, en el almacén de secretos del proveedor.
3. TLS 1.2 o superior con certificado válido; HTTP redirige a HTTPS; HSTS; cabeceras `Content-Security-Policy` y `frame-ancestors 'none'` para la aplicación (hallazgo H-03 de `docs/verificacion/masvs.md`).
4. Cuentas personales con dos factores para cada rol; ninguna cuenta compartida; el administrador técnico sin acceso a datos en claro.
5. Alta de cada tableta con su token; procedimiento de revocación y borrado remoto probado.
6. Llave privada de descifrado en el almacén de secretos; llave de firma de recibos del servidor generada ahí; la pública agregada a `config/investigador.json` y publicada en una versión nueva.
7. Importación de los lotes del piloto y comparación con la base del investigador (mismos registros, ninguno duplicado).
8. Respaldo diario cifrado programado y primera prueba de restauración hecha y registrada.
9. `test/sincronizacion.test.js` contra el servidor desplegado (con una tableta de prueba y datos ficticios), sin pérdidas ni duplicados.
10. Registro de accesos activo y revisado; registro independiente de la huella diaria de la auditoría.
11. Revisión de seguridad del servidor (MASVS para la aplicación y una revisión de la configuración del servidor) antes de recibir datos reales.
