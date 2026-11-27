# Revisión integral de AutiPal (noviembre de 2026)

Fecha: 27 de noviembre de 2026. Versión revisada: `main` en 7654efd (527 pruebas en verde, `check-items` sin errores).

## Resumen

Nueve revisiones independientes, cada una con una sola lente, leyeron el código, corrieron pruebas y scripts propios y compararon contra los documentos rectores (zip del 8 de noviembre) y las decisiones D1 a D6, R1 a R18 y R6b:

| Revisión | Hallazgos | Crítica | Importante | Menor |
| --- | --- | --- | --- | --- |
| Revisión clínica y de actividades (CLI) | 7 | 0 | 5 | 2 |
| Revisión del Modelo matemático (MOD) | 13 | 0 | 8 | 5 |
| Revisión del Protocolo y ética (PRO) | 12 | 1 | 5 | 6 |
| Revisión de seguridad y privacidad (SEG) | 7 | 0 | 4 | 3 |
| Revisión de tiempos y motor (TIE) | 10 | 0 | 4 | 6 |
| Revisión de usabilidad y accesibilidad (USA) | 12 | 0 | 3 | 9 |
| Revisión de código y pruebas (COD) | 7 | 0 | 3 | 4 |
| Revisión de trazabilidad y documentos (TRA) | 10 | 0 | 3 | 7 |
| Revisión de innovación y competencia (INN) | 7 | 0 | 3 | 4 |
| **Total** | **85** | **1** | **38** | **46** |

Después, una comprobación independiente (que no participó en las revisiones) reprodujo la evidencia de cada hallazgo crítico e importante: corrió la prueba o un script propio, o releyó la cita del documento. Resultado: **1 crítico y 34 importantes confirmados** (30 filas en la tabla, porque algunos hallazgos de áreas distintas describen el mismo defecto), **3 rebajados a menor** y **1 descartado** como importante.

Lo más serio:

1. **PRO-01 (crítico).** En modo de estudio el selector «Banda fija» de «Niños inscritos» sigue activo: el terapeuta puede cambiar la banda de un niño en la fase 1, la fase 2 o el cierre, sin motivo y sin registro de auditoría. Rompe el diseño de las fases fijas (INV-7).
2. **El modo de estudio depende de que exista un archivo.** Si `config/investigador.json` no carga, o si no hay configuración firmada, la tableta deja descargar sin cifrar los datos de niños reales (SEG-02, PRO-06). La aplicación publicada usa llaves de prueba cuya parte privada está en el repositorio (SEG-01), y el niño de demostración puede convivir con niños reales en el mismo selector (SEG-03).
3. **Actividades sin revisión clínica e imágenes marcador** se pueden aplicar a un niño inscrito en modo de estudio (CLI-04, CLI-05).
4. **La pausa por señal de regulación nunca se ofrece en las fases fijas** (PRO-02 = INN-02), aunque Arquitectura 14 y el Protocolo 8.5 la piden en todas.
5. **Calidad del dato:** la respuesta anticipatoria se marca con el tiempo bruto (TIE-01 = MOD-02 = TRA-01), una consigna AV que no sonó puede quedar como ensayo válido (TIE-02), los cuadros perdidos se cuentan por pausa (TIE-03) y el bootstrap toma el valor 51.º en lugar del 50.º (MOD-01), lo que impide la réplica en R con lo que dice el README.
6. **Decisiones del Modelo** que la simulación mostró necesarias: la banda de 3 MAD con proporciones de pocos eventos (MOD-05) y con 3 valores de línea base (MOD-06), el umbral de la señal de regulación (MOD-07) y el peso de las anticipatorias en la calidad (MOD-03, MOD-04).

Lo comprobado sin hallazgo (resumen): la pantalla del niño no tiene marca, texto ni premios (salvo las imágenes marcador); la retroalimentación es neutra; las fichas coinciden con el Catálogo; con el modo experto apagado solo se ven ACT-01, ACT-02 y ACT-07; no hay lenguaje deficitario ni afirmaciones retiradas; la tabla de dominio del Modelo 4.3 se reproduce; Wilson, la mediana por estadísticos de orden y Theil-Sen son correctos; la regla de adaptación, la envolvente (INV-1 a INV-9) y la alerta temprana (R13, INV-9) cumplen; el panel nunca dice «sin cambio» (R17); el reloj es monótono y `event.timeStamp` está en la base de `performance.now()`; las opciones aparecen 1 a 2 cuadros tras insertarse; 0 infracciones automáticas de WCAG en 11 pantallas, en 1280×800 y 800×1280, claro y oscuro; pausa en 1.2–1.3 s; cobertura de líneas de `src/` de 88 %.

## Hallazgos confirmados

Naturaleza: **C** = se corrige en el código; **D** = decisión clínica o del Modelo (va a `Pendientes_clinicos_y_del_Modelo.md`); **Doc** = corrección de documento (va a `Correcciones_de_documentos.md`).

### Crítico

| Id | Área | Dónde | Qué está mal | Evidencia reproducida | Naturaleza |
| --- | --- | --- | --- | --- | --- |
| PRO-01 | Protocolo | `src/ninos-pantalla.js` 50-61, 151-158 | En modo de estudio el selector «Banda fija» sigue activo y cambia la banda del niño sin motivo ni auditoría | Script con `estudio:{numero:5}` y niño en fase 2: `select data-banda disabled: false`; `ACT-02 antes B3 → después B1` | C |

### Importantes

| Id | Área | Dónde | Qué está mal | Evidencia reproducida | Naturaleza |
| --- | --- | --- | --- | --- | --- |
| PRO-02 (= INN-02) | Protocolo | `src/app.js` 1259; `fichas/sesion.json` | En familiarización, fases 1 y 2 y cierre no se crea la regla, así que nunca se ofrece la pausa por omisiones o prematuras | `adaptacion: false` en esos modos; Arquitectura 14: «Las pausas se ofrecen, pero la banda no cambia»; Protocolo 8.5 | C |
| PRO-03 | Protocolo | `src/sesiones.js` 155; `src/registros-terapeuta.js` 209 | Un evento adverso de las 24 h siguientes o del aviso semanal no se puede registrar una vez completados los registros | Único acceso: botón que solo aparece con `registros_completos === false` | C + D |
| PRO-04 | Protocolo | `src/app.js` 1672 | El resumen de un bloque de demostración o del modo experto falla: `ReferenceError: modo is not defined` | Ejecución de `renderResumen` aislada | C |
| PRO-05 | Protocolo | `src/registros-terapeuta.js` 112, 117, 136; `src/app.js` 1435; `src/panel/panel.js` 193 | Cinco campos de texto libre salen en los lotes; solo dos avisan que no lleven nombres (RNF-07) | `grep "Sin nombres"` solo en dos campos | C + D |
| PRO-06 (con SEG-02) | Protocolo y seguridad | `src/app.js` 110-111, 225-243, 459-483; `src/transporte/salida.js` 29 | El modo de estudio se define por la existencia de `salida`: sin configuración o si falla `config/investigador.json`, los datos de niños reales se descargan sin cifrar, el borrado no pide recibo y R16 no se aplica a las descargas | `filtrarDescarga(rows, false)` devuelve todo; `enEstudio()` falso al fallar la carga | C |
| SEG-01 | Seguridad | `config/investigador.json` (`"prueba": true`); `src/app.js` 550 | La aplicación publicada usa llaves de prueba cuya privada está en el repositorio; solo muestra un aviso y acepta configuración firmada con ellas | Firma con la privada del repositorio verifica con la pública desplegada; lote descifrado | C (crítico si se usa con datos reales) |
| SEG-03 | Seguridad | `src/app.js` 492-506; `src/inicio.js` 331; `src/transporte/salida.js` 130 | El niño de demostración se crea en modo de estudio y la configuración no lo quita; comparte selector e íconos con niños reales | Simulación: en 2000 padrones de 6 niños, ~10 % tiene un niño real con estrella verde | C |
| CLI-01 | Actividades | `src/app.js` 1075-1076 | En ACT-07 B1 la regla se sortea en cada sesión en vez de alternar color y forma (Catálogo 5.3) | `s.orden[ficha.id] ??= shuffle(...)` con semilla de la sesión | C |
| CLI-02 | Actividades | `src/app.js` 160-173, 1085 | Las parejas de cajas de ACT-07 alternan según las sesiones de la tableta, no las del niño | `numero: Number(prefs.get('nbm.sesiones'))` | C |
| CLI-03 | Actividades y Modelo | `src/panel/panel.js` 145-158 | Las frases de costo de cambio salen de una sola sesión con 10 + 10 ensayos, sin intervalo, ante 1 ms o 1 error; el Catálogo pide 20 + 20 acumulados | Una diferencia de 1 ms produce «Tardó en promedio 1 ms más al cambiar de regla» | C + D |
| CLI-04 | Actividades | `src/app.js` 415-427; `src/engine/ficha.js` 60-61 | Fichas sin revisión clínica se ejecutan con aviso con un niño inscrito y en modo de estudio; Arquitectura 4.4 pide no habilitarlas | Ejecución con ficha sin `revisor` | C (o Doc si se mantiene el aviso) |
| CLI-05 | Actividades | `assets/img/*/*.svg`; `src/app.js` | Las imágenes marcador tienen texto y son grises; nada impide usarlas con un niño inscrito | `check-items`: 180 marcadores | C (crítico si se usara en el estudio) |
| USA-01 | Usabilidad | `src/menu-terapeuta.js` 61-71, 146; `src/app.js` 1476 | En las fases fijas el menú ofrece fijar banda y adaptación, que nunca funcionan; tras la orden bloqueada la banda queda marcada como si hubiera cambiado y se muestra «INV-7» | Recorrido en el navegador | C |
| USA-02 | Usabilidad | `src/engine/trial.js` 18; `src/app.js` 822; `src/inicio.js` 306 | Sin audio, la sesión vuelve al inicio con un aviso fuera de la vista, sin foco, que pide una modalidad que la sesión completa no permite elegir | Recorrido en el navegador | C |
| USA-03 | Usabilidad | `src/app.js` 1012, 1014, 1561 | Para salir de la pantalla del niño hay que tocar dos veces la esquina, y eso solo está en el `aria-label` | Recorrido en el navegador | C |
| COD-01 | Código | `src/engine/logger.js` 93-105; `src/almacen.js` | Con cada ensayo se cifra y pasa a base64 todo el registro pendiente en el hilo principal | 3,000 filas: 236 a 382 ms por ensayo en PC | C |
| COD-02 | Código | `sw.js` 6-20; `tools/generar-sw.mjs` | `sw.js` no tiene versión: los archivos nuevos no quedan disponibles sin conexión y la caché no se limpia | Archivo nuevo en la lista sin cambiar `sw.js`: no se reinstala | C |
| COD-03 | Código | `src/app.js` | Ninguna prueba ejecuta `app.js`; solo se busca texto con expresiones regulares | Mutación en `app.js:1024`: las 305 pruebas siguieron pasando | C |
| MOD-01 | Modelo | `src/indicadores/estadistica.js` 116, 248 | (1 − 0.95)/2 da 0.025000000000000022 y el bootstrap toma el 51.º de 2000 como límite inferior, no el 50.º del README | Recálculo independiente en Python | C |
| MOD-03 | Modelo | `src/engine/quality.js` 28 | Un ensayo fuera de tarea no baja la plausibilidad, aunque el Modelo 3.4 la define con las reglas de 3.3 | Lectura y simulación | D + Doc |
| MOD-04 | Modelo | `src/engine/quality.js` 28; `src/indicadores/nucleo.js` 15, 61 | Cada anticipatoria vale 0 en la calidad, así que A4 nunca se reporta por encima de ~20 %: con 7 de 30 la calidad es 0.77 y desaparecen todos los indicadores | Cálculo directo | D |
| MOD-05 | Modelo | `src/panel/panel.js` | Con proporciones de pocos eventos la MAD vale 0 y las falsas señales suben a 15–19 % (R12 calibró con ruido continuo) | Simulación propia con semilla fija | D |
| MOD-06 | Modelo | `src/panel/panel.js` (`xs.length < 3`) | La banda se calcula con 3 o 4 valores de línea base; con 3 las falsas señales llegan a 13.4 % | Simulación propia | D + C |
| MOD-07 | Modelo | `src/adaptacion.js` 58-64 | Con línea base, el percentil 90 hace que una omisión dispare la señal: ~9 % de las ventanas y ~24 % de las sesiones de un niño estable (con omisiones y prematuras juntas, 18 % y 42 %) | Simulación propia | D |
| MOD-13 | Modelo | `test/vectores/indicadores.json` | Los vectores no bastan para R: traen calidad ya calculada y no cubren sondas, pérdida de foco, latencia corregida, casos límite, regla, envolvente ni banda | Lectura de los vectores | C |
| TIE-01 (= MOD-02 = TRA-01) | Tiempos | `src/engine/quality.js` 24-25; `src/engine/trial.js` 296 | La respuesta anticipatoria se marca con el tiempo bruto; el Modelo 3.3 y Arquitectura 5.2 piden el corregido. El registro de referencia de las pruebas protege el error | Latencia 80 ms: toque de 200 ms (120 corregido) no se marca | C (latente hasta H8.2) |
| TIE-02 | Tiempos | `src/engine/trial.js`; `src/engine/audio.js` | Si el fin del audio no llega, el ensayo AV queda válido con peso 1 aunque la consigna no haya sonado | Simulación con audio sin eventos | C + D |
| TIE-03 | Tiempos | `src/engine/trial.js` | Los cuadros perdidos se cuentan por pausa: un congelamiento de 500 ms cuenta 1 en vez de ~29 | Simulación de cuadros | C |
| TIE-04 | Tiempos | `src/engine/logger.js` | El modelo de tableta se toma de `navigator.userAgent`, que en Chrome para Android ya no lo trae; no hay campo para el modelo | Lectura del código (no se probó en tableta) | C |
| TRA-03 | Documentos | Arquitectura 8.4 | Dice participación «de 1 a 5»; R9 fija 6 niveles, y no está en Correcciones | `02_Arquitectura.md` 8.4 | Doc |

Duplicados: PRO-02 = INN-02; TIE-01 = MOD-02 = TRA-01; MOD-01 está dentro de MOD-13; PRO-06 y SEG-02 se resuelven juntos; CLI-01 y CLI-02 tienen la misma causa (la alternancia no se calcula por niño); CLI-04 y CLI-05 también (falta una compuerta antes de la sesión con un niño inscrito); MOD-03 y MOD-04 tienen la misma raíz; PRO-05 abarca a SEG-07.

## Rebajados a menor

| Id | Motivo |
| --- | --- |
| SEG-04 | El ataque al PIN de 6 dígitos exige copiar la base del dispositivo; con 600,000 iteraciones son unas 28 a 38 h en un hilo. Es decisión (PIN más largo o alfanumérico) y corrección de `masvs.md`, que lo da por «Cumple» |
| INN-05 | Afecta solo a la nota de novedad (idea 1 con Jacobson y Truax y un semáforo); el código ya sigue el Modelo 6.3 |
| TRA-02 | Ningún código cambia los parámetros de los indicadores; lo incorrecto es que el informe de verificación dé RNF-09 por «Verificado» con una huella que solo cubre los de la regla |

## Descartado

| Id | Motivo |
| --- | --- |
| INN-01 (como importante) | La fase 3 cambia la banda sin aprobación previa del terapeuta, pero así lo deciden el Documento rector («el profesional puede fijar, desactivar o anular cualquier adaptación»), la decisión del 8 de octubre y Arquitectura 3.3. No es un defecto del código. Como toca el posicionamiento («adaptación sin aprobación del terapeuta» está en «Lo que no conviene hacer» de la nota de novedad), queda como decisión en Pendientes |

## Menores

| Id | Qué |
| --- | --- |
| CLI-06 | En AV la muestra de ACT-01 se ve sola lo que dura el audio (~1 s), no 1.5 s |
| CLI-07 | Fuller y Fienup aparece como 2018 en la ficha y 2017 en el registro de decisiones |
| MOD-08 | Fuera de tarea toma como referencia también sondas y ensayos con pérdida de foco |
| MOD-09 | La regla y el panel definen distinto la sesión válida de la línea base |
| MOD-10 | A11 y A12 (resumen de fase) se ocultan por la calidad de la sesión del día |
| MOD-11 | El panel describe un valor fuera de la banda desde la primera sesión (Modelo 6.3 y 6.4 se contradicen) |
| MOD-12 | El README dice versión 0.2.0 de A1 y A9; el código dice 0.3.0 |
| PRO-07 | La configuración no valida edad, bandas ni video; una banda inexistente cae a B1 en silencio |
| PRO-08 | No hay tope ni aviso del número de sesiones por fase |
| PRO-09 | No hay avisos de las reglas de detención |
| PRO-10 | El límite de 15 min no avisa a mitad de bloque |
| PRO-11 | El panel muestra indicadores de la fase 3 durante el cierre |
| PRO-12 | Faltan campos obligatorios del evento adverso (actividad, banda, duración, medidas) |
| SEG-04 | Ver «Rebajados» |
| SEG-05 | La migración desde `localStorage` puede perder o dejar en claro el registro si falla a mitad |
| SEG-06 | El importador acepta una cadena de auditoría recortada; una cadena vacía se da por correcta |
| SEG-07 | Campos de texto libre sin aviso (incluido en PRO-05) |
| TIE-05 | No hay vía para cargar la latencia del dispositivo (correcto mientras H8.2 está pendiente) |
| TIE-06 | En AV las opciones aparecen mientras suena el final del audio; error de mapeo de `t_audio_inicio` |
| TIE-07 | Si las imágenes no se decodifican, el ensayo sigue con peso 1 |
| TIE-08 | Los toques después de la respuesta o de una omisión no se registran |
| TIE-09 | El validador de fichas no impone el límite de respuesta de 5 a 20 s (ACT-13 tiene 2 s) |
| TIE-10 | La simulación usa `audio_fuente = 'grabada'`, valor que el motor nunca produce |
| USA-04 | En bloques sueltos «la banda vuelve a null» y ninguna banda aparece marcada |
| USA-05 | El menú no recibe el foco, no es diálogo y no se abre con teclado |
| USA-06 | El botón de la esquina tiene contraste de 1.43:1 en reposo |
| USA-07 | «Niños inscritos» no está en la barra de navegación |
| USA-08 | El aviso «no deja guardar» del F3 y de opinión nunca aparece |
| USA-09 | La validación del F3 no dice qué preguntas faltan |
| USA-10 | El panel muestra rangos de variación imposibles para una proporción (relacionado con MOD-05) |
| USA-11 | «CSV» y «JSON» en el inicio del terapeuta |
| USA-12 | Sin indicación de espera tras «Sí, es este niño» |
| COD-04 | Mediana y percentil duplicados; la prueba del percentil de la alerta no detecta quitar la interpolación |
| COD-05 | 6.84 MB de precarga, 2.2 MB de ítems de uso posterior |
| COD-06 | Código del investigador instalado en la tableta |
| COD-07 | La verificación corre en Node 20 (sin mantenimiento), sin límite de tiempo |
| TRA-02 | Ver «Rebajados» |
| TRA-04 | Protocolo 2.4 (20 a 40 ensayos, 10 a 15 min) frente a ACT-01 (10 ensayos, 6 a 8 min): falta en Correcciones |
| TRA-05 | RF-07 cuenta los dos toques «en cualquier momento»; Arquitectura 8.1, con el menú abierto |
| TRA-06 | La prueba de RNF-05 (destellos) no revisa las imágenes |
| TRA-07 | Dos comentarios del código citan una nota con el nombre de una herramienta |
| TRA-08 | El árbol de archivos del README no lista 52 archivos |
| TRA-09 | La tabla del registro del README tiene `opcion_elegida_id` en otro orden que el código |
| TRA-10 | No hay licencia ni CITATION; `package.json` solo nombra a un autor |
| INN-03 | Los documentos dejan cámara y micrófono «pospuestos», no descartados (el código no los usa) |
| INN-04 | El README dice «registra con precisión» sin latencia medida y «pruebas con iPad» que fueron en Chromium |
| INN-05 | Ver «Rebajados» |
| INN-06 | «Todos los derechos reservados» impide presentar el formato abierto como diferencia |
| INN-07 | El README no dice que los recortes de ACT-04 se hicieron con IA (procedencia en `items/licencias.csv`) |

## Método

Cada revisión trabajó en su propia copia del repositorio, sin cambiar código, con el formato: id, área, archivo y línea, qué está mal, evidencia (cita o salida de una prueba), severidad (crítica, importante, menor) y corrección propuesta. Sin evidencia no hubo hallazgo. La comprobación repitió las simulaciones con generadores y semillas propias y ejecutó el código en copias aparte. Los informes de trabajo de cada revisión no se incluyen en el repositorio; este documento los consolida.
