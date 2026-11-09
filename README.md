# AutiPal · Prototipo E13

AutiPal es la aplicación de Neuro-BlueMinds. Herramienta de apoyo y medición para terapeutas que trabajan con niñas y niños autistas de 4 a 10 años. Registra con precisión lo que el niño hace en actividades breves de selección en una pantalla táctil.

> **Prototipo para revisión de expertos. No es una herramienta diagnóstica.**
> No es una intervención ni un instrumento de diagnóstico. No calcula puntajes, niveles ni perfiles del niño.

Este prototipo sirve para que un panel de 6 a 9 expertos (terapia de lenguaje, terapia ocupacional, psicología y terapia conductual) juzgue si las actividades son relevantes y claras (validez de contenido). El motor definitivo se construirá en Flutter (entregable E17). Por eso las fichas de las actividades y el formato del registro son archivos de datos independientes del código.

## Actividades

| Código | Nombre | Ensayos por bloque | Bandas |
|---|---|---|---|
| ACT-01 | Igual a la muestra (familiarización) | 10 | B1 a B3 |
| ACT-02 | Pictograma e imagen | 30 | B1 a B4 |
| ACT-07 | Cambia la regla | 30 | B1 a B4 |

Cada actividad se describe en una ficha técnica en [`fichas/`](fichas/). El motor ejecuta la ficha: la secuencia del ensayo y el registro son iguales para todas las actividades; cada actividad solo aporta cómo se dibuja su pantalla.

## Privacidad

- Sin cuentas, sin inicio de sesión, sin servidor y sin analítica.
- No se pide nombre, fecha de nacimiento, correo ni ningún dato que identifique al niño. Solo un código libre opcional (por defecto `DEMO`).
- El registro se guarda únicamente en el navegador del dispositivo y se descarga como CSV o JSON. Nada se envía a ningún servidor.

## Cómo correrlo localmente

Los módulos de JavaScript no cargan desde `file://`, así que se necesita un servidor estático. Desde la carpeta del proyecto:

```
python3 -m http.server 8000
```

En Windows, el comando suele ser `python -m http.server 8000`. Después abre <http://localhost:8000>. Para probar en una tableta conectada a la misma red, abre `http://<IP-de-la-computadora>:8000`.

## Uso

1. **Inicio (para el adulto).** Se eligen la actividad, la modalidad, la banda inicial y el número de ensayos. También se puede escribir un código opcional del niño (nunca el nombre) y ajustar el volumen. Después se toca «Empezar».
2. **Sesión.** Es la pantalla del niño: fondo neutro y sin texto.
   - Antes de cada bloque se mide un segundo de cuadros. Si la pantalla dibuja a menos de 50 Hz (periodo mayor de 20 ms; suele ser el ahorro de energía), se avisa al adulto, que puede volver a medir o continuar de todos modos. Si continúa, la sesión queda con `advertencia_frecuencia` = `true`.
   - El botón de pausa del terapeuta está en la esquina superior derecha y se toca dos veces: el primer toque lo arma durante 3 s.
   - El ensayo en curso queda registrado como interrumpido y no se repite.
   - En la pausa se puede ajustar el volumen, continuar o terminar el bloque. Si se termina, se elige el motivo de una lista y se puede agregar una nota breve (sin nombres ni datos personales).
3. **Fin de bloque.** Aparece una pantalla de «terminamos», igual sin importar el desempeño. El adulto toca dos veces el botón de la esquina para ver el resumen.
4. **Resumen (para el adulto).** Es descriptivo: aciertos, omisiones y mediana del tiempo de respuesta, sin puntajes. Ahí el adulto elige el nivel de apoyo que dio en el bloque (ninguno, verbal, gestual o físico). Desde ahí se inicia otro bloque de la misma sesión o se termina la sesión.

En iPad, el sonido se activa con el toque en «Empezar»; antes de eso, Safari no permite reproducir audio.

**Modo experto.** Se activa en el inicio, antes de empezar la sesión. Permite elegir cualquier actividad, banda y modalidad.
- Durante el ensayo muestra el código del ítem en la esquina inferior izquierda.
- El botón «Siguiente» pasa al ítem siguiente sin esperar los tiempos; el ensayo en curso queda como interrumpido.
- Sus registros llevan un `sesion_id` que empieza con `EXP-`.

**Galería de ítems** (`#galeria`). Muestra todos los ítems por actividad y banda: el código, la consigna, las opciones con la correcta marcada y el estado de revisión. También incluye la ficha técnica de la actividad.
- Por defecto muestra solo la muestra para expertos; una casilla muestra todos.
- Los filtros quedan en el enlace, así que una vista se puede compartir. Por ejemplo, `#galeria?actividad=ACT-02&banda=B4&todos=1` o `#galeria?actividad=ACT-07&banda=B2&pareja=1`.
- Si [`config/enlaces.json`](config/enlaces.json) tiene el campo `formularioF3`, la galería muestra el botón «Calificar en el formulario F3», que abre ese enlace en otra pestaña. Sin el archivo (o sin el campo), no se muestra nada.

**Revisión clínica** (`#revision`). Dos clínicos califican los ítems de muestra antes del panel de expertos. Ver [Revisión clínica](#revisión-clínica).

**Calibración** (`#calibracion`). Se hace una vez en cada dispositivo, antes de la primera sesión: se pone una regla física sobre la regla de 5 cm de la pantalla y se ajusta hasta que coincidan. Ver [Accesibilidad y seguridad sensorial](#accesibilidad-y-seguridad-sensorial).

**Créditos y licencias** (`#creditos`). Contiene la atribución de ARASAAC y la licencia de cada parte del prototipo.

## Revisión clínica

Antes del panel de expertos, dos clínicos revisan los ítems de muestra (Catálogo, sección 5.4) en `#revision`, enlazada desde el menú del inicio y de la galería.

1. **Revisor.** Se escriben las iniciales y se elige la profesión: terapia de lenguaje, terapia ocupacional, psicología, terapia conductual u otra.
   - Las iniciales se guardan en mayúsculas y sin acentos.
   - El avance se guarda en el navegador por revisor: con las mismas iniciales se continúa donde se quedó, y dos revisores pueden usar el mismo dispositivo («Cambiar de revisor»).
   - Nada se envía a ningún servidor.
2. **Ítems.** Se recorren uno por uno los 70 ítems con `muestraExpertos` de ACT-01 (30) y ACT-02 (40).
   - Cada ítem se muestra como en la galería: código, concepto, consigna y opciones, con la correcta marcada.
   - **Estado** (obligatorio): Aprobado, Corregir o Retirar.
   - **Tipo de problema**, si es Corregir o Retirar (se pueden elegir varios): Ambiguo, otra opción también podría ser correcta; Imagen poco reconocible; Demasiado difícil para su banda; Demasiado fácil para su banda; No adecuado para niños de México; Molesto o aversivo; Otro.
   - **Comentario**, opcional.
   - «Anterior» y «Siguiente», una barra de avance (por ejemplo, «23 de 71 · 40 de 71 calificados») y la casilla «Ver solo los pendientes», que salta las tarjetas ya calificadas.
3. **Figuras de ACT-07.** Una tarjeta con las cuatro figuras en azul y en amarillo y los símbolos de regla (la mancha de color y la silueta gris de cada figura), con la misma calificación: ¿son reconocibles y se distinguen sin dudar?
4. **Decisiones.** Al final:
   - «el camión»: autobús urbano, camión de carga o quitar el concepto;
   - «el short»: se queda o cambiar por otra prenda (y cuál);
   - el pictograma de «tortilla»: sirve o no sirve;
   - un comentario general, opcional.
5. **Descarga.** «Descargar revisión (CSV)» guarda `revision-clinica-<iniciales>-<fecha>.csv`. Solo descarga cuando las 71 tarjetas tienen estado y las tres decisiones están elegidas; si falta algo, dice qué.

Columnas del CSV:

| Columna | Contenido |
|---|---|
| `revisor_iniciales`, `revisor_profesion` | El revisor. |
| `fecha_utc` | Momento de la descarga, en ISO 8601 UTC con «Z». |
| `version_app` | Versión de la aplicación. |
| `item`, `actividad`, `banda`, `concepto` | El ítem. |
| `estado` | `Aprobado`, `Corregir` o `Retirar`. |
| `problemas` | Tipos de problema separados por «;». Vacío si el estado es Aprobado. |
| `comentario` | Comentario del revisor. |

Después de los 70 ítems vienen, en este orden, las filas `DECISION-camion`, `DECISION-short` (el comentario es la prenda propuesta), `DECISION-tortilla`, `FIGURAS-ACT07` y `COMENTARIO-GENERAL`. En las decisiones, `estado` es la opción elegida.

**Unir las revisiones.** Con dos o más archivos:

```
node tools/unir-revisiones.mjs revision-clinica-AB-2026-11-03.csv revision-clinica-CD-2026-11-04.csv
```

Escribe `revision-consolidada.csv` en la carpeta actual, con una fila por ítem: el estado, los problemas y el comentario de cada revisor (columnas con sus iniciales) y la decisión. También muestra en la terminal cuántos ítems quedan en cada caso.

- **Ítems y figuras de ACT-07:**
  - `Aprobado` si todos aprueban;
  - `Corregir` si alguno pide corregir y nadie pide retirar;
  - `Revisar en reunión` si alguno pide retirar o si a algún revisor le falta el ítem.
- **Decisiones** (camión, short, tortilla): la opción elegida si todos coinciden; si no, `Revisar en reunión`.

## Formulario F3 de validez de contenido

`#formulario` es el formato F3 con el que el panel de expertos califica las tres actividades del piloto (Catálogo, sección 2.3). Cualquier persona con el enlace puede llenarlo, sin cuenta:

1. El experto recorre cada actividad (con enlaces a su galería y al inicio para probarla) y la califica de 1 (nada) a 4 (mucho) en relevancia, claridad de la mecánica, claridad de los ítems de cada banda, progresión de dificultad, adecuación cultural y seguridad sensorial. Solo la relevancia decide si la actividad se mantiene.
2. Puede señalar ítems por su código (por ejemplo, `ACT02-B3-07`); el formulario avisa si el código no existe.
3. Califica el conjunto, deja comentarios y responde los criterios de exclusión (si participa en el piloto o tiene un familiar en él) y el consentimiento.
4. Las respuestas se guardan en su navegador mientras llena el formulario. Al final descarga `f3-<nombre>-<fecha>.csv` y lo envía por correo al coordinador. Si no puede descargar, «Copiar mis respuestas» deja el texto listo para pegar en el correo. Nada se envía a ningún servidor.

**Análisis.** Con los archivos de todos los expertos:

```bash
node tools/unir-f3.mjs f3-*.csv
```

Escribe `f3-indices.csv` (I-CVI, κ* y decisión de cada pregunta), `f3-items.csv` (ítems señalados y cuántas veces) y `f3-comentarios.csv`, e imprime un resumen con el S-CVI/Ave. Sigue a Polit, Beck y Owen (2007):

- I-CVI = expertos que califican con 3 o 4 / expertos válidos. Criterio: 0.78 o más con 6 o más expertos; 1.00 con 3 a 5; con menos de 3 no se decide.
- κ* = (I-CVI − Pc) / (1 − Pc), con Pc = C(N, A) × 0.5^N; excelente si es mayor de 0.74, bueno de 0.60 a 0.74, regular de 0.40 a 0.59.
- S-CVI/Ave = promedio del I-CVI de relevancia de las tres actividades; criterio 0.90.
- No entran en los índices quien participa en el piloto, quien tiene un familiar en él o quien no dio su consentimiento. Si un experto envía dos veces, cuenta la respuesta más reciente.
- Un ítem señalado por 2 o más expertos se cambia o se retira.

El botón «Calificar en el formulario F3» de la galería abre `#formulario` según `config/enlaces.json` (`"formularioF3": "#formulario"`). También acepta una dirección `https://` externa.

## Pruebas

Requiere Node.js 20 o posterior. No hay dependencias que instalar.

```
npm test
```

(equivale a `node --test`). Las pruebas cubren:

- la máquina de estados: los seis estados, la omisión, los toques, la pausa, el audio y el fallo técnico;
- el registro, el selector, la validación de fichas y el resumen;
- las reglas de las bandas y de los conceptos;
- las secuencias de ACT-07 y `check-items`;
- los requisitos de tamaño y movimiento de la hoja de estilos;
- fuera de tarea y la frecuencia de la pantalla;
- la exportación de la revisión clínica y la regla para unir revisiones;
- la página de producto (`pagina-producto/pagina.test.js`): que sus números coincidan con las fichas y con las columnas del registro, que no cargue nada de servidores externos y que respete las reglas de movimiento.

Antes de publicar, corre también `npm run check-items`.

## Arquitectura

El motor ejecuta la ficha. La secuencia del ensayo y el registro no tienen código propio por actividad; cada actividad solo aporta cómo se dibuja su pantalla.

```
index.html                    Página única
src/app.js                    Inicio, sesión, fin de bloque y resumen; rutas
src/paginas.js                Galería, calibración y créditos
src/revision.js               Revisión clínica de ítems (pantalla)
src/revision-datos.js         Revisión clínica: ítems, faltantes y CSV
src/revision.css              Estilos de la revisión clínica
src/frecuencia.js             Aviso de frecuencia de pantalla baja antes de cada bloque
src/enlaces.js                Botón del formulario F3 en la galería
src/styles.css                Estilos (temas claro y oscuro, unidad --cm)
src/engine/trial.js           Máquina de estados del ensayo y ejecución del bloque
src/engine/clock.js           Medición del tiempo: performance.now, cuadros, foco
src/engine/audio.js           Audio de las consignas: Web Audio y voz del navegador
src/engine/logger.js          Registro por ensayo; almacenamiento local; CSV y JSON
src/engine/selector.js        Selección de ítems por banda, con semilla
src/engine/quality.js         Reglas de calidad y resumen descriptivo
src/engine/ficha.js           Carga y validación de fichas
src/activities/seleccion.js   Pantalla de consigna y opciones (ACT-01 y ACT-02)
src/activities/cambia-regla.js  Pantalla de tarjeta y cajas, y figuras SVG (ACT-07)
fichas/                       Ficha técnica de cada actividad (JSON)
config/enlaces.json           Enlaces externos opcionales (formulario F3)
items/                        Conceptos, banco de ítems generado y licencias de cada archivo
tools/build-items.mjs         Genera items/items.json y los marcadores provisionales
tools/check-items.mjs         Verifica archivos y licencias del banco
tools/descargar-pictos.mjs    Descarga los pictogramas de ARASAAC
tools/ejemplo-registro.mjs    Genera docs/ejemplo-registro.csv
tools/unir-revisiones.mjs     Une las revisiones clínicas en revision-consolidada.csv
assets/                       Imágenes, pictogramas, audios, tipografías (fonts/) y marca (marca/)
docs/                         Registro de ejemplo
test/                         Pruebas (node --test)
```

Cada tipo de pantalla (`src/activities/`) aporta dos funciones: `toTrials` convierte los ítems de un bloque en ensayos, y `createView` dibuja la consigna, las opciones y la retroalimentación. Todo lo demás (tiempos, toques, audio, registro) lo hace el motor.

### Estructura del ensayo

| Estado | Qué ocurre | Duración |
|---|---|---|
| 1. Intervalo | Pantalla neutra | `intervaloMs` (1000 ms) |
| 2. Consigna | Pictograma o muestra; en AV, además la voz | V: `consignaVMs` (1500 ms). AV: hasta que termina el audio (tope de 5 s) |
| 3. Opciones | Aparecen las opciones; la consigna sigue visible | Hasta la respuesta o `limiteRespuestaMs` (10 s) |
| 4. Respuesta | Primer toque sobre una opción, o la omisión | — |
| 5. Retroalimentación | Un marco suave alrededor de la opción correcta, igual en acierto, error u omisión | `retroalimentacionMs` (1000 ms) |
| 6. Cierre | Se guarda el registro completo del ensayo | — |

Reglas de toque:

- Un toque fuera de las opciones nunca anula una respuesta; solo se registra en `toques_fuera`.
- El primer toque sobre una opción es la respuesta. Otro toque sobre una opción a menos de 100 ms de la respuesta se ignora y se cuenta en `toques_repetidos`.
- Si dos dedos tocan a la vez opciones distintas, cuenta el de `event.timeStamp` más temprano y el otro se cuenta como repetido.

Audio en AV:

- Si el dispositivo no tiene audio (ni archivos ni voz del navegador), el bloque AV no empieza y se avisa al adulto: «No hay audio disponible en este dispositivo. Use la modalidad visual o revise el volumen.»
- Si el audio no arranca o falla a mitad del bloque, el ensayo continúa, pero se registra con `fallo_tecnico` = `true` y `peso_calidad` = 0. Si no arrancó, `audio_fuente` es `"ninguna"`.

### Fichas técnicas

Cada ficha es un archivo JSON. La aplicación rechaza cargar una ficha incompleta y muestra en pantalla qué campo falta.

| Campo | Descripción |
|---|---|
| `id`, `version`, `nombre` | Identificación de la actividad y de la versión de la ficha. |
| `objetivo` | Qué registra la actividad. |
| `paradigma` | Paradigma experimental en que se basa. |
| `tipoRespuesta` | Siempre `"seleccion_unica"`: el primer toque sobre una opción es la respuesta. |
| `bandas` | Lista de bandas. Cada una tiene `id`, `opciones` (número de opciones), `descripcion` y sus parámetros propios. |
| `modalidades` | `["V", "AV"]`: solo visual, o visual con voz. |
| `ensayosPorBloque` | Ensayos de un bloque. |
| `limiteRespuestaMs` | Tiempo máximo para responder, desde que aparecen las opciones (10000). |
| `intervaloMs` | Pantalla neutra entre ensayos (1000). |
| `consignaVMs` | Duración de la consigna en modalidad V (1500). |
| `retroalimentacionMs` | Duración de la retroalimentación (1000). |
| `consignaAV` | Texto de la voz. Puede ser un texto o un objeto con variantes. |
| `lecturasPermitidas` | Qué se puede decir a partir del registro. |
| `lecturasNoPermitidas` | Qué no se puede concluir. El resumen de la aplicación nunca usa estas frases. |
| `contraindicaciones` | Cuándo no usar la actividad o cuándo los datos no son interpretables. |
| `revisionClinica` | `{ "revisor": "", "fecha": "" }`. Vacío hasta que un clínico revise la ficha. |

Campos opcionales que usa el motor:

- `fases`: fases y número de ensayos, según el Catálogo de actividades.
- `pantalla`: tipo de pantalla que dibuja la actividad.
- `resumen`: frase descriptiva del fin de bloque.
- `itemsPorBanda`.
- `repetirItems`: si es `false`, ningún ítem se repite en la sesión.
- `barajarOpciones`: si es `false`, las opciones conservan su posición.
- `disposicion`, en cada banda: filas x columnas de las opciones, por ejemplo `"1x4"` o `"2x2"`.

Los textos clínicos (objetivo, paradigma, fases, lecturas y contraindicaciones) se copian tal cual del Catálogo de actividades (sección 5). `revisionClinica` queda vacío hasta la revisión clínica.

### Registro

Hay dos archivos de exportación:

- **Registro por ensayo:** una fila por ensayo. Se descarga con «Descargar registro (CSV)» y «(JSON)».
- **Sesiones:** una fila por sesión. Se descarga con «Descargar sesiones (CSV)» (ver [Sesiones](#sesiones)).

Ambos viven en memoria y en el almacenamiento local del navegador. Cualquier campo que no esté en sus listas de columnas se descarta antes de guardar. Si una columna no tiene valor, queda vacía.

[`docs/ejemplo-registro.csv`](docs/ejemplo-registro.csv) es una sesión simulada de 10 ensayos de ACT-01, para revisar el formato sin correr la aplicación. A propósito incluye:

- un error y una omisión;
- un toque fuera de las opciones y un toque repetido;
- una respuesta anticipatoria y una pausa;
- un audio sin evento de fin y un fallo de audio.

Se regenera con `node tools/ejemplo-registro.mjs`.

**Posiciones.** Las opciones se numeran por filas, de izquierda a derecha y de arriba abajo, empezando en 1. En `1x4` las posiciones son 1, 2, 3 y 4 de izquierda a derecha; en `2x2`, 1 y 2 son la fila de arriba, y 3 y 4 la de abajo. `pos_correcta`, `pos_distractores` y `opcion_elegida` usan esta numeración.

Todos los tiempos `t_*` están en milisegundos, en el reloj monótono del navegador (`performance.now()`; el cero es la carga de la página). Sirven para restarse entre sí dentro de la misma sesión.

Al exportar (CSV y JSON), los tiempos se redondean a 0.1 ms: las columnas `t_*` y `*_ms`, y los tiempos dentro de `toques_fuera` y `pausas`. En memoria y en el almacenamiento del dispositivo se guarda el valor completo.

| Columna | Contenido |
|---|---|
| `sesion_id` | Identificador aleatorio de la sesión. Empieza con `EXP-` en modo experto. |
| `bloque`, `ensayo` | Número de bloque en la sesión y de ensayo en el bloque. |
| `codigo_nino` | Código libre opcional, por defecto `DEMO`. Nunca el nombre. |
| `dispositivo` | userAgent y tamaño de pantalla. |
| `version_app`, `actividad`, `version_ficha` | Versiones y actividad. |
| `version_parametros` | Versión de los umbrales del motor: anticipatoria (150 ms), toque repetido (100 ms), tope del audio (5 s), tope de la decodificación (1 s), periodo de cuadro máximo (20 ms) y la regla de fuera de tarea (3 MAD escaladas, mínimo 10 ensayos). |
| `item` | Código del ítem, por ejemplo `ACT01-B2-05`. En ACT-07 incluye la secuencia y el ensayo: `ACT07-B2-04-07`. |
| `banda`, `modalidad` | Banda y modalidad (`V` o `AV`). |
| `modo_fase` | Por ahora siempre `prototipo`. |
| `tema_imagenes` | Por ahora siempre `general`. |
| `n_opciones` | Número de opciones. |
| `disposicion` | Filas x columnas de las opciones: `1x2`, `1x3`, `1x4` o `2x2`. |
| `pos_correcta` | Posición de la opción correcta. |
| `pos_distractores` | Lista JSON de `{id, pos}`: qué distractor quedó en qué posición. |
| `t_consigna_inicio`, `t_consigna_fin` | Cuadro en que aparece la consigna y fin de ese estado. |
| `t_audio_inicio`, `t_audio_fin` | Inicio programado del audio y su evento de fin. Las columnas de audio (de `t_audio_inicio` a `audio_fin_por_tope`) quedan vacías en modalidad V. |
| `audio_fuente` | `archivo`, `sintesis` (voz del navegador, de inicio impreciso) o `ninguna`. |
| `audio_latencia_ms` | Latencia de salida de audio del dispositivo, si el navegador la informa. |
| `audio_fin_por_tope` | `true` si el evento de fin del audio no llegó en 5 s. En ese caso `t_audio_fin` queda vacío. Vacío en V y si el audio no arrancó. |
| `t_opciones_insercion`, `t_opciones` | Inserción de las opciones y cuadro en que aparecen en pantalla. |
| `decodificacion_ok` | `true` si las imágenes de las opciones se decodificaron durante la consigna; `false` si fallaron o no terminaron en 1 s después de la consigna (las opciones aparecen de todos modos). Vacío en ACT-07, que no usa imágenes. |
| `t_toque` | `event.timeStamp` del primer `pointerdown` sobre una opción. |
| `t_retro_inicio`, `t_retro_fin` | Retroalimentación. |
| `opcion_elegida`, `acierto`, `omision` | Posición tocada; si fue la correcta; si no hubo respuesta en 10 s. |
| `opcion_elegida_id` | Identificador de la opción tocada, por ejemplo `gato-1` o, en ACT-07, `barco-amarillo`. |
| `toques_fuera` | Lista JSON de `{t, x, y}` de los toques fuera de las opciones. |
| `toques_repetidos` | Toques sobre una opción ignorados por llegar a menos de 100 ms de la respuesta, incluido el segundo dedo en un toque multitáctil. |
| `perdida_foco` | `true` si la página se ocultó o perdió el foco durante el ensayo. |
| `cuadros_perdidos`, `cuadros_total` | Intervalos entre cuadros mayores a 1.5 veces el periodo normal, y total de intervalos medidos. |
| `periodo_cuadro_ms` | Mediana de los intervalos entre cuadros (`requestAnimationFrame`) durante el ensayo: unos 16.7 ms a 60 Hz y 33.3 ms a 30 Hz. |
| `interrumpido` | `true` si el terapeuta pausó durante el ensayo. Ese ensayo no se repite. |
| `fallo_tecnico` | `true` si el audio de la consigna AV no arrancó o falló. |
| `tr_bruto_ms` | `t_toque − t_opciones`. |
| `latencia_dispositivo_ms` | Latencia táctil y de pantalla de la tableta. Vacía hasta medir cada tableta. |
| `tr_corregido_ms` | `tr_bruto_ms − latencia_dispositivo_ms`. Vacío si no hay latencia. |
| `anticipatoria` | `true` si `tr_bruto_ms` < 150 ms. |
| `fuera_de_tarea` | `true` si ln(RT) está a más de 3 MAD de la mediana, según el Modelo matemático (3.2 y 3.3). Detalles abajo. |
| `fuera_de_tarea_provisional` | `false` si `fuera_de_tarea` se calculó al cerrar la sesión; `true` si la sesión seguía abierta al exportar. |
| `peso_calidad` | Foco (0 o 1) × proporción de cuadros a tiempo × plausibilidad (0 si es anticipatoria) × técnico (0 si hubo fallo técnico). |

Solo `tr_bruto_ms`, `tr_corregido_ms`, `anticipatoria`, `fuera_de_tarea` y `peso_calidad` se calculan a partir de otras columnas; todo lo demás se guarda tal como se midió.

**Fuera de tarea.**

- RT es `tr_corregido_ms`; si está vacío, `tr_bruto_ms`.
- MAD = 1.4826 × mediana de |ln(RT) − mediana(ln RT)|. Un ensayo queda fuera de tarea si |ln(RT) − mediana| > 3 × MAD.
- La mediana y la MAD se calculan por actividad dentro de la sesión (todos los bloques de esa actividad), sin mezclar actividades.
- Solo entran, y solo se marcan, los ensayos con respuesta, no anticipatorios, sin interrupción ni fallo técnico. Los demás quedan vacíos.
- Si la actividad tiene menos de 10 ensayos válidos en la sesión, la columna queda vacía.
- Se calcula una sola vez, al tocar «Terminar sesión», y ese valor ya no cambia. Si se exporta una sesión que sigue abierta (o que nunca se terminó, por ejemplo porque se cerró la página), el valor se calcula solo para el archivo y se marca como provisional.

**Columnas agregadas a la especificación original** (aprobadas en la revisión del motor):

| Columna | Motivo |
|---|---|
| `disposicion` | Hace explícito cómo se numeran las posiciones. |
| `audio_latencia_ms` | La medición del audio pide registrar `outputLatency`, que no tenía columna. |
| `audio_fin_por_tope` | Distingue un audio sin evento de fin; en ese caso `t_audio_fin` queda vacío y no se rellena con la hora del tope. |
| `cuadros_total` | Permite recalcular `peso_calidad` desde el CSV. |
| `fallo_tecnico` | Marca los ensayos AV en que el audio no arrancó o falló. |
| `decodificacion_ok` | Muestra si las imágenes de las opciones estaban decodificadas antes de insertarlas. |

### Sesiones

Una fila por sesión, en este orden:

| Columna | Contenido |
|---|---|
| `sesion_id`, `codigo_nino`, `dispositivo` | Como en el registro por ensayo. |
| `inicio`, `fin` | Fecha y hora en ISO 8601, en UTC y con «Z» (por ejemplo, `2026-10-30T02:30:04.785Z`), del inicio del primer bloque y del fin del último. Solo identifican la sesión; las duraciones se miden con `performance.now()`. |
| `ensayos` | Ensayos registrados en la sesión, incluidos los interrumpidos. |
| `pausas` | Lista JSON de `{bloque, ensayo, duracion_ms}`: en qué ensayo se pausó y cuánto duró la pausa. |
| `terminada_antes` | `true` si el adulto terminó un bloque desde la pausa. |
| `motivo_terminacion` | Motivo elegido al terminar el bloque: «Desregulación o malestar del niño», «Cansancio o falta de interés», «Petición del niño o de la familia», «Fallo técnico», «Decisión clínica» u «Otro». |
| `nota_terminacion` | Nota opcional de hasta 80 caracteres, sin nombres ni datos personales. |
| `nivel_apoyo` | Lista JSON de `{bloque, nivel}`. El adulto lo elige en el resumen de cada bloque: `ninguno`, `verbal`, `gestual` o `físico`. |
| `frecuencia_hz` | Frecuencia de la pantalla: 1000 / mediana de `periodo_cuadro_ms` de la sesión, redondeada. |
| `proporcion_periodo_lento` | Proporción de ensayos con `periodo_cuadro_ms` mayor de 20 ms. |
| `advertencia_frecuencia` | `true` si el adulto continuó después del aviso de frecuencia baja. |
| `referencia_motora_ms` | Vacía por ahora. |

## Banco de ítems

- [`items/conceptos.json`](items/conceptos.json) tiene los 60 conceptos de ACT-02, cada uno con:
  - artículo y categoría;
  - mitad (`A` o `B`, para la fase 2);
  - color típico, que es el del dibujo del ejemplar 1;
  - notas, pictograma de ARASAAC y conceptos que nunca aparecen juntos en una pantalla (`excluir`).
- [`items/items.json`](items/items.json) se genera con `npm run build-items` a partir de los conceptos y de las reglas de bandas de las fichas. El azar usa semillas fijas, así que el resultado es reproducible. No se edita a mano: se cambian los conceptos o las fichas y se regenera.
- Códigos: `ACT01-B2-05` significa actividad, banda y número.
  - ACT-01 tiene 10 ítems por banda.
  - ACT-02 tiene un ítem por concepto y banda; el número sigue el orden de `conceptos.json` (`ACT02-B3-01` a `ACT02-B3-60`). Un bloque de ACT-02 usa 30 conceptos distintos, elegidos al azar. En una misma sesión ningún concepto se repite, aunque cambie la banda: con 60 conceptos caben dos bloques de 30.
  - ACT-07 tiene 10 secuencias de 10 ensayos por banda, generadas con la semilla fija de la ficha (`semilla`). Cada ensayo tiene código propio (`ACT07-B2-04-07`: secuencia 04, ensayo 7) y guarda:
    - la regla (`color` o `forma`);
    - la tarjeta: `forma` y `color` dicen con qué caja comparte cada atributo (1 es la izquierda y 2 la derecha);
    - la caja correcta.

    En cada secuencia la caja correcta no se repite más de 3 veces seguidas y es la correcta en 4 a 6 de los 10 ensayos.
- Composición de los bloques de ACT-07 (campo `composicion` de cada banda):
  - B1 usa tres secuencias de una sola regla; la regla se sortea una vez por sesión.
  - B2 usa una secuencia de la primera regla, una que cambia a la mitad y una de la segunda regla. Así cambia en el ensayo 16, que va precedido por una pantalla breve con el nuevo símbolo.
  - B3 y B4 usan tres secuencias mezcladas: la regla cambia en cerca del 30 % y del 50 % de los ensayos.
- Las dos parejas de cajas de ACT-07 alternan entre sesiones del mismo dispositivo. Las cajas no cambian de lugar dentro del bloque, y `pos_distractores` registra cuál era la caja (por ejemplo, `barco-amarillo`).
- `muestraExpertos`: en ACT-02, 10 ítems por banda, cerca de 2 por categoría y con las dos mitades representadas. Es la muestra que revisa el panel.
- `revisionPendiente` y `motivosRevision` marcan lo que un clínico debe confirmar:
  - los distractores «de aspecto parecido» de B4;
  - el color en ACT-01 B1;
  - los conceptos pendientes (`short`, `camión`).
- Ejemplares: el 1 y el 2 se usan en la práctica; el 3 se reserva para sondas de generalización y no aparece en los ensayos normales.

`npm run check-items` verifica que todo archivo usado exista y tenga su fila en [`items/licencias.csv`](items/licencias.csv), y falla si no. También lista los marcadores provisionales que siguen en uso y los audios que faltan.

## Imágenes, pictogramas y audio

**Imágenes del banco.** Los 180 ejemplares (60 conceptos, 3 de cada uno) están en `assets/img/<concepto>/<n>.jpg`. Son dibujos de colores al estilo de los dibujos de las libretas de estímulos que usa el equipo: dibujo plano, contorno negro parejo, casi sin sombra y un solo objeto. Son dibujos, no fotografías, porque así son los estímulos de las libretas: un solo objeto, claro y sin detalles que distraigan.

- 134 los generó Canva con inteligencia artificial, con una indicación escrita para cada ejemplar.
- 44 son variantes sin IA de esos dibujos: otro color o volteados en espejo. Se hicieron así porque se acabaron los créditos de IA de Canva del mes; desde el 30 de noviembre se pueden rehacer con IA.
- 2 se dibujaron con código: el huevo estrellado y la media naranja.

Todos tienen las mismas reglas:

- fondo blanco liso;
- el objeto completo, al centro, ocupando cerca del 70 % del cuadro;
- 1000 × 1000 px, sin texto, marcas ni logotipos.

Son dibujos originales: no copian láminas de ninguna prueba y no muestran a personas reales. Cada uno tiene su fila en `items/licencias.csv` con su origen (IA de Canva, variante sin IA o dibujo con código), el enlace al dibujo de Canva del que sale y estado `propuesta`, porque falta la revisión clínica.

- El ejemplar 1 tiene el color típico de `conceptos.json`. Los ejemplares 2 y 3 muestran el mismo concepto en otro color, tipo o ángulo.
- Se respetan las notas de cada concepto: el pollito sin gallina, la paleta de dulce en sus tres ejemplares, la leche que no parece agua, el vaso sin asa y el camión como autobús urbano.
- Las partes del cuerpo van sueltas, como en las libretas (la mano, el ojo, la oreja). No hay caras, salvo en «la cabeza», y los ejemplares cambian de tono de piel. La panza va sin ropa, para que no se confunda con «la playera» ni con «el short».

Para cambiar una imagen:

1. Guárdala como `assets/img/<concepto>/<n>.jpg` (también sirven `.png` o `.webp`). El identificador del concepto está en `conceptos.json`; por ejemplo, `cepillo-de-dientes`.
2. Cambia su fila en `items/licencias.csv`: origen, autor, licencia y dirección de origen.
3. Corre `npm run build-items` y `npm run check-items`.

**Audio.** Cada consigna tiene una clave, y su archivo va en `assets/audio/<clave>.mp3`; por ejemplo, `cual-es-igual.mp3` o `donde-esta-el-perro.mp3`. `npm run check-items` lista las claves que faltan. Cada archivo necesita su fila en `licencias.csv`. Mientras falte, la aplicación usa la voz del navegador en español de México y lo registra como `audio_fuente` = `sintesis`.

**Pictogramas.** Se descargan una sola vez de ARASAAC con `npm run pictos`, a `assets/picto/<concepto>.png`. El identificador de cada uno está en `conceptos.json` (`arasaac`) y en `licencias.csv`. Para cambiar uno:

1. Cambia el identificador en `conceptos.json`.
2. Borra el `.png` y su fila en `licencias.csv`.
3. Vuelve a correr `npm run pictos`.

## Accesibilidad y seguridad sensorial

- **Tamaño de las opciones (RNF-04).** Cada opción tocable mide al menos 2 cm de lado (hasta 4 cm, según la pantalla) y hay al menos 1 cm entre opciones; las cajas de ACT-07 están separadas por 3 cm. Los tamaños se expresan con la variable `--cm`:
  - En una tableta, el `cm` de CSS no mide un centímetro real; en un iPad de 10" mide unos 0.7 cm.
  - Por eso `--cm` se estima suponiendo una tableta de 10" (pantalla táctil) o un monitor de 96 ppp (computadora), y se ajusta en la página de Calibración.
  - En pruebas con pantallas de iPad de 10", tableta Android de 10" e iPad mini, las opciones midieron de 2.97 a 4 cm.
- **Sin destellos (RNF-05).**
  - No hay animaciones en bucle ni parpadeos.
  - Las únicas transiciones (el marco de retroalimentación y el botón de pausa) duran de 200 a 300 ms y se desactivan con `prefers-reduced-motion`.
  - Las opciones aparecen sin transición y con opacidad completa, para que el cuadro registrado como aparición sea el real. Sus imágenes se decodifican durante la consigna y se insertan ya decodificadas (`decodificacion_ok`).
- **Pantalla del niño.** Fondo neutro, sin texto y sin elementos que distraigan. La única excepción es el código del ítem en modo experto.
- **Retroalimentación.** Sin sonidos de error, sin la palabra «Incorrecto» y sin recompensas que dependan del desempeño: siempre se señala la opción correcta con el mismo marco.
- **Contraste.** Los pictogramas y las figuras van sobre un fondo claro también en el tema oscuro. El azul y el amarillo de ACT-07 llevan contorno oscuro.
- **Volumen.** Se ajusta en el inicio y en la pausa.

## Marca e interfaz

La interfaz sigue el Manual de marca de AutiPal. Hay dos tipos de pantalla y la marca solo va en una:

- **Pantallas del adulto** (inicio, galería, revisión clínica, calibración, créditos, pausa y resumen): llevan los colores, el isotipo, el logotipo y las tipografías de AutiPal.
- **Pantalla del niño** (la sesión y la pantalla de «terminamos» del fin de bloque): queda neutra, como pide el protocolo. Fondo liso, sin logotipo, sin colores de la marca, sin texto y sin decoración. Lo único que cambió ahí es el color del marco de retroalimentación.

**Colores.** Todo el estilo vive en variables al inicio de [`src/styles.css`](src/styles.css), con valores para tema claro y oscuro.

| Variable | Uso | Claro | Oscuro |
|---|---|---|---|
| `--acento` | Botones principales, enlaces, pestaña activa (Pantone 7700 C) | `#16587B` | `#8DBBD6` |
| `--acento-texto` | Texto sobre el botón principal | `#FFFFFF` | `#0B1820` |
| `--fondo` | Fondo de las pantallas del adulto (crema de la marca) | `#FBF5EA` | `#0E1B23` |
| `--tarjeta` | Tarjetas y paneles | `#FFFFFF` | `#15262F` |
| `--texto` | Texto principal | `#172A35` | `#E7EEF2` |
| `--titulo` | Títulos | `#16587B` | `#BFDCEC` |
| `--suave` | Texto secundario | `#4B5D68` | `#A6B7C1` |
| `--borde` | Bordes de tarjetas | `#E5DBCA` | `#263943` |
| `--borde-campo` | Contorno de campos y casillas (3 a 1 o más) | `#8A7E6C` | `#6A8392` |
| `--acento-presionado` | Fondo de un botón secundario mientras se toca | `#CFE2EE` | `#24485C` |
| `--problema` | Mensajes de error de los formularios y el botón «Borrar registro» | `#8B2A1F` | `#F0A597` |
| `--marca-2` | Solo decoración: franja del encabezado (Pantone 2169 C) | `#84B3CE` | `#5C93B5` |
| `--marco` | Marco de retroalimentación en la pantalla del niño | `#1F2937` | `#F3F4F6` |

- Todo texto tiene un contraste de al menos 4.5 a 1 con su fondo, en los dos temas.
- El azul claro de `--marca-2` nunca va como color de texto ni de botón: no alcanza el contraste.
- Ninguna pantalla usa verde ni rojo para aciertos o errores.
- `--fondo-nino`, `--opcion-fondo` y `--control` no llevan colores de la marca.
- El marco de retroalimentación es gris muy oscuro (blanco en tema oscuro) y no azul, para que no se confunda con el azul que el niño clasifica en «Cambia la regla».

**Tipografías.** El manual define Roca Two (serif) y More Sugar (manuscrita decorativa). La aplicación las usa así:

| Dónde | Tipografía | Si no está instalada |
|---|---|---|
| Títulos y lema (`--fuente-titulos`) | Roca Two Bold | Noto Serif |
| El nombre «AutiPal» dentro de un texto (`.nombre-marca`) | More Sugar, como en el manual | Noto Sans |
| Encabezado | Logotipo oficial, dibujado con More Sugar | — |
| Texto, campos y botones (`--fuente-texto`) | Noto Sans, como la aplicación digital del manual | — |

- Roca Two y More Sugar no son de distribución libre, así que **no están en el repositorio**: subirlas a un repositorio público equivale a distribuirlas. La hoja de estilos las busca con `local()`, es decir, en la computadora donde se abre la aplicación. Para verlas, instálalas (en Windows: doble clic en el archivo y «Instalar»). El archivo único del prototipo las lleva dentro.
- En el prototipo se usan solo para pruebas. Antes de vender la aplicación hay que comprar sus licencias comerciales para web y aplicación. Con la licencia, sus `.woff2` pueden ir en `assets/fonts/`, con su fila en `items/licencias.csv` y un `url()` en su `@font-face`. Adobe Fonts no sirve para esto, porque carga las tipografías desde sus servidores.
- Noto Sans y Noto Serif están en [`assets/fonts/`](assets/fonts/), con licencia SIL Open Font License 1.1. Ninguna tipografía se carga de un servidor externo.

**Medidas.** También están en variables, para que todas las pantallas del adulto sigan el mismo ritmo:

- espaciado en pasos de 4 y 8 px (`--esp-1` a `--esp-7`);
- letra de 14 px para ayudas y etiquetas, 16 px para el texto, 20 px para los subtítulos y de 26 a 32 px para el título de cada pantalla;
- todo lo que se toca mide al menos 44 × 44 px (`--toque`), con 8 px entre objetivos vecinos;
- los párrafos llegan a unos 75 caracteres por renglón (`--medida`).

**Interfaz del adulto.** Las pantallas se revisaron con las reglas de accesibilidad y uso de UI UX Pro Max:

- El encabezado lleva la marca y debajo las pestañas de las seis secciones, cada una con su ícono, sobre la franja azul claro. La pestaña actual se marca con una barra azul, además del color y el grosor. En el celular, las pestañas van en dos filas de tres, con el ícono sobre el nombre.
- Los íconos son de [Phosphor Icons](https://phosphoricons.com) (estilo regular, licencia MIT). Se dibujan con máscaras de CSS (variables `--icono-*` en `src/styles.css`), así que toman el color del texto en los dos temas y los lectores de pantalla no los leen, porque siempre van junto a un texto.
- Cada pantalla tiene un título con una línea que dice para qué sirve. Al cambiar de pantalla, el foco pasa al título, y el enlace «Saltar al contenido» (visible con el teclado) lleva directo a él.
- En el inicio, el formulario tiene dos grupos: **Bloque** (actividad, modalidad, volumen, banda y ensayos) y **Sesión** (código del niño y modo experto).
  - Las tres actividades se eligen en tarjetas que dicen qué hace el niño en cada una.
  - En pantallas anchas, como una tableta horizontal, el registro va a un lado del formulario.
  - La modalidad se elige con pastillas.
  - El volumen solo aparece en la modalidad AV.
  - El número de ensayos dice su rango permitido; si el valor no es válido, el aviso aparece junto al campo y el bloque no empieza.
  - Debajo de «Empezar» está la indicación para pausar (dos toques en la esquina).
  - Mientras se preparan las imágenes, el botón dice «Preparando…».
- En el registro, cada descarga confirma el nombre del archivo, y «Borrar registro» va aparte, con su confirmación.
- En la galería, cada opción muestra su nombre y ejemplar en renglones separados. La correcta lleva el marco de la pantalla del niño y la etiqueta «Correcta». La etiqueta «Muestra» solo aparece cuando se ven todos los ítems.
- En el resumen, el nivel de apoyo se elige con pastillas.
- Las secciones que se abren (ficha técnica, identificadores de ARASAAC) tienen una flecha que gira, sin animaciones de entrada.

**Logotipo.** Está en [`assets/marca/`](assets/marca/): isotipo y logotipo en versión positiva (`#7496BB`) e invertida (blanco, para el tema oscuro), `logo.png` y los íconos del navegador. El encabezado de las pantallas del adulto lleva el isotipo (40 px) junto al logotipo y la etiqueta «Prototipo E13». Los SVG se vectorizaron de las imágenes del manual; si el equipo de diseño tiene los archivos originales, reemplázalos con el mismo nombre. Según el manual, el logotipo no se deforma, no cambia de color, no lleva sombras ni efectos y no se pone sobre fondos que reduzcan su contraste.

## Página de producto

[`pagina-producto/`](pagina-producto/) es la página que presenta AutiPal, con la estructura de una página de producto de Apple y la marca AutiPal. Se abre con el mismo servidor que el prototipo: <http://localhost:8000/pagina-producto/>.

- **Qué tiene:** el héroe con la tableta, el carrusel de lo más destacado y las tres actividades con sus cifras. Siguen el diseño de las dos pantallas en tema claro y oscuro, las bandas, el recorrido de una sesión, el audio, el registro, el motor, la calibración y la familia Neuro-BlueMinds (con C&W). Al final van lo que viene en investigación, las lecturas permitidas, la privacidad, las fichas, la comparación de las actividades, la accesibilidad, los valores y las notas.
- **Archivos:** `index.html` (todo el texto), `pagina.css` y `pagina.js`. Las capturas y figuras están en [`assets/pagina-producto/`](assets/pagina-producto/), con su fila en `items/licencias.csv`. El logotipo y el pictograma salen de `assets/marca/` y `assets/picto/`.
- **Sin JavaScript** la página se lee completa. El script solo agrega los selectores, el carrusel, el recorrido paso a paso y las apariciones al desplazarse. Nada se mueve solo si el sistema pide reducir el movimiento.
- **Datos que no se escriben a mano:** cada número que viene de una ficha lleva `data-ficha="ACT-02.ensayosPorBloque"` (o `data-ficha-s` para milisegundos mostrados en segundos, y `data-ficha-pct` para proporciones). `npm test` revisa que coincidan con `fichas/` y que el muro de columnas sea el de `src/engine/logger.js`. Si cambia una ficha, la prueba dice qué dato de la página actualizar.
- **Lo que todavía no existe va marcado:** las funciones del diseño de Neuro-BlueMinds que no están en el prototipo dicen «En diseño», y C&W aparece como reloj en desarrollo. Las notas al pie lo aclaran.
- **Capturas:** son del prototipo del 6 de noviembre de 2026, con datos de demostración. Cuando lleguen las fotografías reales, conviene repetirlas para mostrar Igual a la muestra y Pictograma e imagen.

## Publicación en GitHub Pages

El prototipo es un sitio estático; no necesita compilación.

1. Sube la rama `main` al repositorio de GitHub.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, elige **Source: Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Guarda.
4. Después de uno o dos minutos, el sitio queda en `https://<usuario>.github.io/<repositorio>/`. Para este repositorio: `https://nazariegosantomeluis-droid.github.io/Neuro-BlueMinds-prototipo-1/`.
5. Comparte con el panel el enlace directo a la galería: `…/Neuro-BlueMinds-prototipo-1/#galeria`.
6. La página de producto queda en `…/Neuro-BlueMinds-prototipo-1/pagina-producto/`.

Notas:

- Todas las rutas son relativas, así que el sitio funciona dentro de la subcarpeta del repositorio.
- El registro se guarda en el navegador de cada dispositivo. Descárgalo antes de borrar los datos del navegador.
- Después de publicar cambios, el navegador puede mostrar la versión anterior por unos minutos. Recarga la página sin caché para ver la nueva.

## Pendientes

- **Imágenes:** que un clínico revise los 180 dibujos generados con IA (estado `propuesta` en `licencias.csv`).
- **Audio:** grabar los audios de las consignas (63 claves, ver `npm run check-items`).
- **Revisión clínica:**
  - las fichas (`revisionClinica`);
  - los distractores de B4;
  - el color típico de ACT-01 B1;
  - los conceptos `short` y `camión`.
- **Pictogramas por confirmar:** `tortilla` (ARASAAC la etiqueta «torta de maíz») y `camión` (por ahora, autobús urbano).
- **Fase 2 de ACT-02:** los 15 ensayos en V y 15 en AV de un mismo bloque, por mitad, todavía no están implementados como modalidad mixta.
- **Pruebas en tabletas reales:** Safari en iPad y Chrome en Android. Hasta ahora se probó en Chromium de escritorio con tamaños de tableta.
- **Latencia de cada tableta y referencia motora:** `latencia_dispositivo_ms` (y con ella `tr_corregido_ms`) y `referencia_motora_ms` quedan vacías hasta medirlas.
- **Frecuencia de pantalla:** con el ahorro de energía activo (por ejemplo, con poca batería), Chrome y Edge dibujan a 30 Hz en lugar de 60 Hz. Entonces `t_opciones − t_opciones_insercion` mide unos 33 a 66 ms (1 o 2 cuadros de 33 ms). La aplicación lo avisa antes de cada bloque; para las sesiones, conecta el dispositivo a la corriente o desactiva el ahorro de energía.
- **Uso sin conexión:** no está implementado (era opcional en este hito).

## Autoría y licencia

© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.

AutiPal, su isotipo y su logotipo son propiedad de Neuro-BlueMinds. Las tipografías Noto Sans y Noto Serif conservan su licencia SIL Open Font License 1.1 ([`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)). Roca Two (Elena Genova, My Creative Land) y More Sugar (Slidehack) no se incluyen en el repositorio; ver «Tipografías» en [Marca e interfaz](#marca-e-interfaz). Los íconos son de Phosphor Icons (© 2023 Phosphor Icons, licencia MIT); el aviso de la licencia está junto a ellos en `src/styles.css`.

### Pictogramas de ARASAAC

Los pictogramas de `assets/picto/` no están bajo los derechos anteriores. Se distribuyen bajo la licencia Creative Commons BY-NC-SA, que autoriza su uso sin fines de lucro citando la fuente y el autor, y obliga a compartir las obras derivadas con la misma licencia. Atribución, según las condiciones de uso de ARASAAC:

> Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido creados por Sergio Palao para ARASAAC (http://www.arasaac.org), que los distribuye bajo Licencia Creative Commons BY-NC-SA.

> Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España)
