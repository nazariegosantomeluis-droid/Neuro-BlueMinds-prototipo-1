# Informe de verificación de AutiPal (borrador, H8.6)

Borrador del 24 de noviembre de 2026 (actualizado con la decisión D6), para la solicitud al comité de ética (Arquitectura y software 13.5; Protocolo de validación 1.5 y 5.5). Todavía no es la versión que se congela. La etiqueta `v1.0`, la versión verificada (commit y huellas) y la fecha se completan cuando se cierre lo pendiente.

## Cómo se verificó

- **Pruebas automáticas:** `npm test` (Node 20 y 22) y `npm run check-items`, en cada envío y en cada pull request (GitHub Actions, H8.1). Ningún commit entra a `main` con pruebas fallidas.
- **Revisión en el navegador:** Chromium con Playwright, a 1280×800 y 800×1280, en tema claro y oscuro, sin errores en la consola, en cada tanda de trabajo. Todavía no en tabletas reales (H8.2).
- **Simulación:** sesiones completas con el motor de ensayos real en tiempo simulado (`tools/simular-sesiones.mjs`): las 500 de la prueba de integración y las 20 de la reproducción.

Estados:
- **Verificado:** cumple el criterio de Arquitectura con la prueba citada.
- **Parcial:** cumple lo que se puede probar sin lo pendiente.
- **Pendiente:** depende de H8.2 (latencia en tabletas reales), H8.4 (usabilidad con terapeutas), H3.7 (implementación en R) o del servidor posterior al piloto (H7; decisión D6: el piloto va sin servidor, con lotes cifrados y configuración firmada).

## Requisitos funcionales

| Requisito | Criterio de Arquitectura | Cómo se verificó | Pruebas | Estado |
| --- | --- | --- | --- | --- |
| RF-01 Actividades descritas por una ficha declarativa, sin código propio para el registro ni el cálculo | Revisión de código; prueba con una actividad nueva solo con su ficha | Una actividad nueva (ACT-99), solo con su ficha, se registra con el motor y se calcula con las funciones de siempre; el motor, el registro y los indicadores no nombran actividades. Cada actividad sí tiene su pantalla (cómo se dibuja), como prevé Arquitectura 4.4 | `test/requisitos.test.js`; `test/ficha.test.js`; `test/actividades-nuevas.test.js` | Verificado |
| RF-02 Registro de cada ensayo con todos los campos | Prueba de integración | 500 sesiones simuladas de todos los modos de fase sin campos obligatorios vacíos (H8.3). Los campos que solo llena la interfaz (referencia motora, rutinas, registros del terapeuta) se revisaron en sesiones reales en el navegador | `test/integracion.test.js`; `tools/campos-obligatorios.mjs`; `test/logger.test.js`; `test/trial.test.js` | Verificado (la parte de la interfaz, en pocas sesiones del navegador) |
| RF-03 Referencia motora al inicio | Prueba funcional | Con tiempo simulado: 6 a 8 apariciones, mediana y «no disponible» con menos de 5 toques | `test/referencia.test.js` | Verificado; en tabletas reales, pendiente (H8.2) |
| RF-04 Los 12 indicadores del núcleo, con la versión de cada definición | Pruebas unitarias con ejemplos conocidos | Valores calculados a mano, tablas del Modelo 4.3 y referencias publicadas; vectores de prueba para la implementación en R | `test/indicadores-*.test.js`; `test/vectores-indicadores.test.js` | Parcial: falta la doble implementación en R (H3.7) |
| RF-05 Ocultar un indicador sin sus mínimos o con calidad menor de 0.80 | Prueba unitaria | Cada indicador dice «disponible» y su motivo; el panel no muestra indicadores de una sesión con calidad menor de 0.80 | `test/indicadores-nucleo.test.js`; `test/calidad-sesion.test.js`; `test/panel.test.js` | Verificado |
| RF-06 Regla de adaptación por bandas y prioridad de la regulación | Pruebas basadas en propiedades y simulación | Cada rama de la regla y de la señal de regulación; envolvente con INV-1 a INV-9 en 1 millón de sesiones simuladas y 20 000 con la regla real, sin violaciones ni ciclos en menos de 30 ensayos | `test/adaptacion.test.js`; `test/envolvente.test.js` | Verificado; la estabilidad con datos reales se observa en la fase 3 (Protocolo 7.7) |
| RF-07 Pausar, terminar, fijar la banda, desactivar la adaptación y anular un cambio, en dos toques o menos | Prueba de usabilidad | Cada acción en dos toques o menos (prueba automática del menú) y revisión en el navegador | `test/menu-terapeuta.test.js` | Parcial: falta la usabilidad con 5 terapeutas (H8.4) |
| RF-08 Un cambio respecto a la línea base solo si persiste dos sesiones | Prueba unitaria | Banda de mediana ± 3 MAD (decisión R12) y dos sesiones seguidas hacia el mismo lado; simulación con menos de 5 % de falsas señales con ruido normal y t5 | `test/panel.test.js`; `tools/simular-banda.mjs` | Verificado |
| RF-09 Funciona sin conexión y sincroniza sin pérdida ni duplicación | Prueba de sincronización con cortes de red | Sin conexión: la aplicación instalable arranca y funciona sin red. Salida (D6): lotes cifrados con identificador, versión y suma por registro; importación idempotente con recibo firmado; la tableta borra los ensayos solo con el recibo. Cero pérdidas y cero duplicados con lotes repetidos, cortados, alterados y en desorden, y con el transporte «servidor» contra el servidor de prueba con cortes de red al azar (8 semillas) | `test/instalable.test.js`; `test/transporte.test.js`; `test/sincronizacion.test.js` | Verificado para el piloto (archivo); con un servidor real, cuando exista |
| RF-10 Configurar el modo de cada fase y registrarlo en cada sesión | Prueba funcional | Modos de fase por niño, `modo_fase` en cada ensayo y sesión; regla de orden de la fase 2; qué ve el terapeuta en cada fase según la tabla del Protocolo 3.1 (R16). El modo y el consentimiento los fija la configuración firmada del investigador; la tableta rechaza una firma inválida o una configuración vieja y lo registra | `test/fases.test.js`; `test/funciones-por-fase.test.js`; `test/familiarizacion.test.js`; `test/transporte.test.js` | Verificado |
| RF-11 Señales de alerta temprana sin mostrarlas ni usarlas | Revisión de código y prueba de que ninguna salida depende de ellas | Solo `app.js` importa el módulo, para escribir el resultado; el panel da lo mismo con cualquier valor de la alerta; la envolvente rechaza cualquier acción que dependa de ella (INV-9) | `test/alerta.test.js`; `test/panel.test.js`; `test/envolvente.test.js` | Verificado |
| RF-12 Registrar episodios, eventos adversos, participación y decisiones informadas | Prueba funcional | Registros al cerrar en una sola pantalla; sesión incompleta si faltan | `test/registros-terapeuta.test.js` | Verificado; usabilidad, pendiente (H8.4) |

## Requisitos no funcionales

| Requisito | Criterio de Arquitectura | Cómo se verificó | Pruebas | Estado |
| --- | --- | --- | --- | --- |
| RNF-01 Reloj monótono de 1 ms o mejor | Revisión de código | Todos los tiempos salen de `performance.now()`, del cuadro de `requestAnimationFrame` o de `event.timeStamp`; el motor nunca usa `Date` | `test/requisitos.test.js`; `test/clock.test.js` | Verificado |
| RNF-02 Latencia por modelo de tableta con desviación estándar de 8 ms o menos | Medición con cámara de alta velocidad o montaje (13.2) | — | — | Pendiente (H8.2) |
| RNF-03 Menos de 2 % de cuadros perdidos | Prueba de rendimiento | El motor registra los cuadros perdidos de cada ensayo y el periodo del cuadro; falta medirlo en cada tableta | `test/clock.test.js` | Pendiente (H8.2) |
| RNF-04 Objetivos de 2 cm o más, separados 0.5 cm o más | Inspección de la interfaz | Prueba automática de las medidas en cm (con la calibración de la tableta) | `test/accesibilidad.test.js` | Verificado; en tabletas reales, con la calibración (H8.2) |
| RNF-05 Nada destella más de tres veces por segundo; volumen máximo por dispositivo | Inspección y prueba automatizada de los recursos | Sin animaciones en bucle ni temporizadores repetidos en la interfaz; transiciones de 200 a 300 ms; respeta «reducir movimiento». El volumen se fija en el dispositivo desde el menú | `test/accesibilidad.test.js` | Parcial: el volumen máximo de cada tableta, pendiente (H8.2) |
| RNF-06 Cifrado en tránsito (TLS 1.2 o más) y en reposo (AES-256) | Auditoría de configuración | En reposo, en la tableta: AES-GCM de 256 bits con llave del PIN (PBKDF2-SHA-256, 600,000 iteraciones). Salida: cada lote cifrado de extremo a extremo para el investigador (ECDH P-256, HKDF-SHA-256 y AES-GCM de 256 bits); la tableta no puede descifrarlo. Los lotes se guardan en el almacenamiento institucional cifrado (Protocolo 9.5) | `test/almacen.test.js`; `test/transporte.test.js`; `docs/verificacion/masvs.md` | Verificado en la tableta y en los lotes; TLS y cifrado en reposo del servidor, cuando exista (`docs/servidor/plan.md`) |
| RNF-07 Nada que identifique al niño en la tableta | Revisión del modelo de datos | Padrón con código seudónimo de 128 bits, ícono, color, edad en meses y consentimiento; la correspondencia con la identidad nunca está en la tableta | `test/almacen.test.js`; `test/ninos.test.js` | Verificado |
| RNF-08 Cada inferencia y adaptación reproducible desde el registro | Reproducción de 20 decisiones elegidas al azar | `tools/reproducir.mjs` reproduce exactamente 20 de 20 sesiones simuladas (con cambios de banda, bloqueos y órdenes del terapeuta) y una sesión real hecha en el navegador; detecta un acierto, una decisión o un indicador cambiados | `test/reproducir.test.js` | Verificado |
| RNF-09 Los parámetros no cambian durante una sesión | Prueba basada en propiedades | Huella SHA-256 de los parámetros al iniciar, comprobada antes de cada subida (INV-6); prueba que cambia un parámetro a mitad de la sesión | `test/envolvente.test.js`; `test/huella.test.js` | Verificado |
| RNF-10 Arranca una sesión en menos de 10 s en la tableta más lenta | Prueba de rendimiento | Arranca sin red en Chromium de escritorio | `test/instalable.test.js` | Pendiente (H8.2) |

## Pruebas de la sección 13.1

| Prueba | Criterio | Resultado | Estado |
| --- | --- | --- | --- |
| Unitarias de indicadores | 100 % de casos correctos, con los ejemplos del Modelo | Todas pasan | Verificado |
| Doble implementación | Diferencia de 1 ms o menos en latencias y nula en proporciones | Vectores listos (`test/vectores/indicadores.json`); falta la implementación en R | Pendiente (H3.7) |
| Basadas en propiedades | Ninguna violación en un millón de sesiones simuladas | Ninguna violación | Verificado |
| Simulación del Modelo | Criterios de la sección 16.1 del Modelo | Tasa de falsas señales menor de 5 % por indicador (R12) y sin ciclos de la regla de dificultad. La recuperación de parámetros del nivel B se hace en el entorno de análisis | Parcial (recuperación de parámetros, con H3.7) |
| Integración | Ningún campo obligatorio vacío en 500 sesiones simuladas | 500 sesiones (25 niños: familiarización, fases 1, 2 y 3 y cierre), ningún campo obligatorio vacío; la cadena de auditoría cuadra (`docs/verificacion/integracion.json`) | Verificado |
| Sincronización | Cero pérdidas y cero duplicados con cortes de red | Lotes repetidos, cortados, alterados y en desorden; transporte «servidor» contra el servidor de prueba con cortes de red al azar antes y después de que llegue el pedido (8 semillas): cero pérdidas y cero duplicados en el servidor y en la tableta | Verificado (piloto y servidor de prueba) |
| Reproducibilidad | 20 de 20 sesiones reproducidas exactamente | 20 de 20 | Verificado |
| Seguridad | Nivel básico de OWASP MASVS | Revisión con 9 hallazgos (`docs/verificacion/masvs.md`): 5 corregidos (3 con H8.5 y 2 con D6), 1 reducido con D6 y 3 documentados (2 desviaciones por D1 y uno de bajo riesgo) | Verificado (borrador para el comité) |

## Otras condiciones de la sección 13

| Condición | Estado |
| --- | --- |
| 13.2 Latencia de cada tableta | Pendiente (H8.2) |
| 13.3 Usabilidad con 5 terapeutas | Pendiente (H8.4). Para la revisión de expertos previa: formulario de opinión (`#opinion`) y niño de demostración con historia sembrada; `tools/unir-opinion.mjs` ordena los problemas por gravedad y número de expertos |
| 13.4 Revisión de estímulos | En curso: la revisión clínica de la muestra se aplica con `tools/aplicar-revision.mjs` (H1.3); faltan los 200 ítems fuera de la muestra, las fotografías y la voz grabada (H1.2) |

## Hallazgos de H8.5 que esperaban la decisión D6

Los 6 hallazgos que quedaron abiertos en H8.5 (H-04 a H-09), con la decisión D6:

| Hallazgo | Con D6 |
| --- | --- |
| H-04 La web no puede impedir capturas de pantalla del panel | Sin cambio: desviación por D1 (bloqueo de la tableta, bloqueo por inactividad y capacitación) |
| H-05 La llave del almacén sale del PIN | Sin cambio: desviación por D1 |
| H-06 Descargas del registro sin cifrar | Corregido: en modo de estudio las descargas sin cifrar solo llevan datos ficticios (demostración y modo experto); los datos de los niños solo salen en lotes cifrados con la llave pública del investigador |
| H-07 Pérdida si el navegador borra los datos | Reducido: lotes con recibo (la tableta borra solo lo que el investigador ya tiene), aviso a los 7 días sin exportar y almacenamiento persistente pedido al navegador (tanda 10) |
| H-08 Copia de la huella de la auditoría | Corregido para el piloto: cada lote lleva la huella del último eslabón y la importación comprueba que la cadena continúa la ya importada. Desviación: la copia se hace en cada exportación, no cada día |
| H-09 El nombre del experto en el F3, en su propio dispositivo | Sin cambio: bajo riesgo, sin datos de niños |

## Desviaciones de Arquitectura por la decisión D1

- La web no puede bloquear capturas de pantalla del panel (Arquitectura 9.3).
- La llave de cifrado se deriva del PIN del terapeuta en lugar de guardarse en el almacén seguro del sistema operativo (Arquitectura 9.3).
- Una página estática no puede declarar la cabecera `frame-ancestors`; la aplicación no arranca dentro de un marco ajeno.

## Pendiente antes de congelar `v1.0`

1. Llaves reales del investigador en `config/investigador.json` (hoy son de prueba; `tools/llaves.mjs`).
2. H8.2: latencia, cuadros perdidos, arranque en la tableta más lenta y volumen máximo de cada modelo.
3. H8.4: usabilidad con 5 terapeutas.
4. H3.7: implementación en R y comparación con los vectores.
5. H1.2, H1.3 y 13.4: voz grabada, fotografías y revisión clínica de todos los ítems.
6. Completar este informe con la versión verificada (commit, huellas de fichas y parámetros) y la fecha.
