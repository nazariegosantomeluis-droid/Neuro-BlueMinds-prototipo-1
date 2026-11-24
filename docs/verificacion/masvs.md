# Revisión de seguridad con OWASP MASVS, perfil básico, adaptado a la web (H8.5)

Borrador del 24 de noviembre de 2026. Arquitectura y software 9.5 y 13.1 piden evaluar la aplicación con el estándar de verificación de seguridad de aplicaciones móviles de OWASP (MASVS) antes del estudio, con el nivel básico. En la versión 2 de MASVS los niveles se volvieron perfiles de prueba; aquí se usa el perfil básico (MAS-L1) y se deja fuera el de resiliencia (MAS-R), que no pide el nivel básico.

AutiPal es una aplicación web instalable (decisión D1), no una aplicación nativa. Cada control se adaptó a lo que la web permite y, cuando no se puede cumplir igual, se dice como desviación. Lo que depende del servidor o de la salida de los datos queda pendiente de la decisión D6 (H7).

Estados:
- **Cumple**: hay una prueba automática o una revisión que lo muestra.
- **Cumple con desviación**: se cumple el objetivo del control por otro medio, declarado como desviación de Arquitectura por D1.
- **Pendiente**: depende de H7 (servidor o exportación), de H8.2 (tabletas reales) o de una decisión.
- **No aplica**: el control no tiene equivalente en esta aplicación.

Las comprobaciones automáticas están en `test/seguridad.test.js`, `test/almacen.test.js`, `test/auditoria.test.js` e `test/instalable.test.js`.

## MASVS-STORAGE

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| STORAGE-1: guarda los datos sensibles de forma segura | Ensayos, sesiones, padrón de niños y auditoría en IndexedDB, cifrados con AES-GCM de 256 bits; la llave sale del PIN del terapeuta (PBKDF2-SHA-256, 600,000 iteraciones). En `localStorage` solo quedan preferencias sin datos de niños (calibración, volumen, número de sesiones, modo experto) y, en el dispositivo del experto, sus respuestas del F3 y de la revisión clínica | Cumple | `test/almacen.test.js` (nada en claro en IndexedDB; sin el PIN no se lee); `test/seguridad.test.js` (qué guarda cada módulo) |
| STORAGE-2: evita que los datos sensibles se filtren | Sin registros en la consola; el trabajador de servicio solo guarda archivos de la aplicación; la política de seguridad del contenido no permite conexiones a otros sitios. Las descargas (CSV y JSON) salen sin cifrar, con el código seudónimo | Cumple, con un hallazgo documentado (H-06) | `test/seguridad.test.js`; `test/instalable.test.js` |

## MASVS-CRYPTO

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| CRYPTO-1: usa criptografía fuerte y actual | AES-GCM de 256 bits con vector inicial aleatorio de 12 bytes por escritura y la clave del registro como dato autenticado; PBKDF2-SHA-256 de 600,000 iteraciones con sal aleatoria de 16 bytes; SHA-256 (FIPS 180-4) para la huella de parámetros y la auditoría. Todo con WebCrypto, salvo la SHA-256 de las huellas (implementación propia, comprobada con los vectores de FIPS 180-4) | Cumple | `test/almacen.test.js`; `test/huella.test.js` |
| CRYPTO-2: maneja las llaves según buenas prácticas | La llave no se puede exportar, solo vive en memoria mientras la aplicación está desbloqueada y se olvida al bloquear. El PIN no se guarda. Arquitectura 9.3 pide guardar la llave en el almacén seguro del sistema operativo; la web no tiene acceso a él | Cumple con desviación (D1) | `test/almacen.test.js`; README, «Desviaciones de Arquitectura por la decisión D1» |

## MASVS-AUTH

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| AUTH-1: protocolos seguros de autenticación y autorización con un servidor | No hay servidor ni cuentas en el piloto mientras D6 no se decida. Roles, dos factores y registro de accesos (Arquitectura 9.2) son de H7 | Pendiente (H7, D6) | — |
| AUTH-2: autenticación local segura | PIN de 6 dígitos o más; derivar la llave tarda (600,000 iteraciones); después de 5 PIN equivocados seguidos, espera de 30 s que se duplica hasta 15 min, guardada en IndexedDB (recargar la página no la reinicia); bloqueo tras 5 minutos sin uso del adulto | Cumple | `test/almacen.test.js` |
| AUTH-3: autenticación adicional para operaciones sensibles | Borrar el registro pide confirmación y queda en la auditoría. No hay otra operación sensible sin el PIN | Cumple | `test/auditoria.test.js` |

## MASVS-NETWORK

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| NETWORK-1: protege todo el tráfico de red | La aplicación solo pide sus propios archivos (GitHub Pages, siempre con HTTPS). Ningún dato sale del dispositivo: sin `fetch` a otros sitios, sin `XMLHttpRequest`, `sendBeacon` ni conexiones abiertas. La sincronización o la exportación cifrada son de H7 | Cumple para lo que hay; la salida de los datos, pendiente (H7, D6) | `test/seguridad.test.js` |
| NETWORK-2: fija la identidad de los servidores remotos (pinning) | El navegador no permite fijar certificados desde una página | No aplica (web) | — |

## MASVS-PLATFORM

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| PLATFORM-1: usa los mecanismos de comunicación entre procesos de forma segura | El único es el trabajador de servicio, que solo atiende pedidos GET del mismo origen y nunca toca los registros | Cumple | `test/instalable.test.js`; `test/seguridad.test.js` |
| PLATFORM-2: usa las vistas web de forma segura | Es una página web: política de seguridad del contenido (solo recursos propios, sin scripts en línea ni `eval`, `object-src 'none'`), sin referente al salir y sin poder abrirse dentro de un marco de otra página | Cumple | `test/seguridad.test.js` |
| PLATFORM-3: usa la interfaz de usuario de forma segura | Lo que escribe el terapeuta se muestra escapado. La pantalla del niño no muestra datos. Arquitectura 9.3 pide impedir capturas de pantalla del panel; la web no puede hacerlo | Cumple con desviación (D1) | `test/seguridad.test.js`; README |

## MASVS-CODE

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| CODE-1: exige una versión actual de la plataforma | Las tabletas admitidas y su versión de Chrome se fijan con H8.2 | Pendiente (H8.2) | — |
| CODE-2: tiene un mecanismo para aplicar actualizaciones | Con red, el trabajador de servicio sirve siempre la versión publicada; sin red, la última guardada. Durante el estudio la versión está congelada (Protocolo 5.5); cada sesión registra la versión, el commit y la huella de los parámetros | Cumple | `test/instalable.test.js`; `huella_parametros` |
| CODE-3: solo usa componentes sin vulnerabilidades conocidas | No tiene dependencias de ejecución: ni bibliotecas de terceros en la página ni paquetes de npm (las pruebas usan solo Node) | Cumple | `package.json` sin dependencias |
| CODE-4: valida y limpia toda entrada no confiable | Lo que escribe el terapeuta se escapa al mostrarse; las fichas y el banco se validan al cargar; ninguna entrada se evalúa como código | Cumple | `test/seguridad.test.js`; `test/ficha.test.js` |

## MASVS-RESILIENCE

Fuera del perfil básico (es del perfil MAS-R). No se evaluó.

## MASVS-PRIVACY

| Control | En AutiPal | Estado | Evidencia |
| --- | --- | --- | --- |
| PRIVACY-1: minimiza el acceso a datos sensibles | El niño es un código seudónimo de 128 bits con ícono, color, edad en meses y consentimiento; nada más | Cumple | `test/almacen.test.js` (columnas del padrón) |
| PRIVACY-2: evita que se identifique al usuario | La correspondencia entre el código y la identidad nunca está en la tableta (Arquitectura 9.1; RNF-07) | Cumple | `test/almacen.test.js`; README, «Privacidad» |
| PRIVACY-3: es transparente sobre la recolección y el uso | Lo dicen el aviso de privacidad y el consentimiento del Protocolo 9.2 y 9.5, fuera de la aplicación; en la aplicación, «Privacidad» del README y los textos de las pantallas | Cumple (en el Protocolo) | Protocolo 9.2 y 9.5 |
| PRIVACY-4: da control al usuario sobre sus datos | El consentimiento (vigente, suspendido, retirado) bloquea las sesiones; borrar o conservar los datos de un niño que retira el consentimiento se aplica en el servidor o en la exportación | Cumple en la tableta; el resto, pendiente (H7, D6) | `test/ninos.test.js` |

## Hallazgos

| # | Hallazgo | Gravedad | Qué se hizo |
| --- | --- | --- | --- |
| H-01 | El PIN se podía probar sin límite | Alta | Corregido: espera creciente después de 5 intentos fallidos, guardada en IndexedDB |
| H-02 | Sin política de seguridad del contenido | Media | Corregido: `Content-Security-Policy` en `index.html` |
| H-03 | La página se podía abrir dentro de un marco de otro sitio («clickjacking»); una página estática no puede declarar `frame-ancestors` | Media | Corregido en la aplicación: no arranca dentro de un marco. Si se aloja en un servidor propio (H7), agregar la cabecera `frame-ancestors 'none'` |
| H-04 | La web no puede impedir capturas de pantalla del panel | Media | Documentado como desviación por D1. Lo reducen el bloqueo de la tableta, el bloqueo por inactividad y la capacitación |
| H-05 | La llave sale del PIN, no del almacén seguro del sistema operativo | Media | Documentado como desviación por D1 |
| H-06 | Las descargas del registro (CSV y JSON) salen sin cifrar, con el código seudónimo, y cualquiera con el PIN puede descargarlas; Arquitectura 9.2 dice que el terapeuta no exporta datos | Media | Documentado; se resuelve con D6 (exportación cifrada con la llave pública del investigador o servidor propio) |
| H-07 | Si el navegador borra los datos del sitio, se pierden los registros que no se descargaron | Media | Documentado; se resuelve con D6 (exportación o sincronización periódica y aviso a los 7 días) |
| H-08 | La copia diaria de la huella de la última entrada de la auditoría en un registro independiente (Arquitectura 10.1) todavía no existe; sin ella, quitar las últimas entradas no se detecta | Baja | Pendiente (H7, D6) |
| H-09 | En el dispositivo del experto, el F3 guarda su nombre en `localStorage` mientras lo llena | Baja | Documentado: es el dispositivo del propio experto, no hay datos de niños y él decide cuándo enviarlo |
