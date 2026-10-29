# Neuro-BlueMinds · Prototipo E13

Herramienta de apoyo y medición para terapeutas que trabajan con niñas y niños autistas de 4 a 10 años. Registra con precisión lo que el niño hace en actividades breves de selección en una pantalla táctil.

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

## Pruebas

Requiere Node.js 20 o posterior. No hay dependencias que instalar.

```
npm test
```

(equivale a `node --test`).

## Estructura del proyecto

```
index.html            Inicio, sesión, galería, créditos y calibración
src/engine/           Motor común: ensayo, reloj, audio, registro, selección, calidad, fichas
src/activities/       Presentación visual de cada tipo de pantalla
fichas/               Ficha técnica de cada actividad (JSON)
items/                Conceptos, banco de ítems generado y licencias de cada archivo
tools/                Generador del banco de ítems y verificador de archivos y licencias
assets/               Imágenes, pictogramas y audios
test/                 Pruebas (node --test)
```

## Fichas técnicas

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

Campos opcionales que usa el motor: `pantalla` (tipo de pantalla), `resumen` (frase descriptiva del fin de bloque), `itemsPorBanda`, `repetirItems` (si es `false`, ningún ítem se repite en la sesión) y `barajarOpciones` (si es `false`, las opciones conservan su posición).

Los textos clínicos de las fichas (objetivo, lecturas y contraindicaciones) son borradores para la revisión del panel de expertos.

## Registro

Cada ensayo produce una fila con las columnas siguientes, en este orden. El registro vive en memoria y en el almacenamiento local del navegador, y se descarga con los botones «Descargar registro (CSV)» y «(JSON)». Cualquier campo que no esté en esta lista se descarta antes de guardar.

Todos los tiempos `t_*` están en milisegundos con decimales, en el reloj monótono del navegador (`performance.now()`; el cero es la carga de la página). Sirven para restarse entre sí dentro de la misma sesión.

| Columna | Contenido |
|---|---|
| `sesion_id` | Identificador aleatorio de la sesión. Empieza con `EXP-` en modo experto. |
| `bloque`, `ensayo` | Número de bloque en la sesión y de ensayo en el bloque. |
| `codigo_nino` | Código libre opcional, por defecto `DEMO`. Nunca el nombre. |
| `dispositivo` | userAgent y tamaño de pantalla. |
| `version_app`, `actividad`, `version_ficha` | Versiones y actividad. |
| `item` | Código del ítem, por ejemplo `ACT01-B2-05`. En ACT-07 incluye la secuencia y el ensayo: `ACT07-B2-04-07`. |
| `banda`, `modalidad` | Banda y modalidad (`V` o `AV`). |
| `n_opciones`, `pos_correcta` | Número de opciones y posición de la correcta (desde 1, de izquierda a derecha). |
| `pos_distractores` | Lista JSON de `{id, pos}`: qué distractor quedó en qué posición. |
| `t_consigna_inicio`, `t_consigna_fin` | Cuadro en que aparece la consigna y fin de ese estado. |
| `t_audio_inicio`, `t_audio_fin` | Inicio programado del audio y su evento de fin. |
| `audio_fuente` | `archivo`, `sintesis` (voz del navegador, de inicio impreciso) o `ninguna`. |
| `audio_latencia_ms` | Latencia de salida de audio del dispositivo, si el navegador la informa. |
| `audio_fin_por_tope` | `true` si el evento de fin del audio no llegó en 5 s. En ese caso `t_audio_fin` queda vacío. |
| `t_opciones_insercion`, `t_opciones` | Inserción de las opciones y cuadro en que aparecen en pantalla. |
| `t_toque` | `event.timeStamp` del primer `pointerdown` sobre una opción. |
| `t_retro_inicio`, `t_retro_fin` | Retroalimentación. |
| `opcion_elegida`, `acierto`, `omision` | Posición tocada; si fue la correcta; si no hubo respuesta en 10 s. |
| `toques_fuera` | Lista JSON de `{t, x, y}` de los toques fuera de las opciones. |
| `toques_repetidos` | Toques ignorados por llegar a menos de 100 ms del anterior. |
| `perdida_foco` | `true` si la página se ocultó o perdió el foco durante el ensayo. |
| `cuadros_perdidos`, `cuadros_total` | Intervalos entre cuadros mayores a 1.5 veces el periodo normal, y total de intervalos medidos. |
| `interrumpido` | `true` si el terapeuta pausó durante el ensayo. Ese ensayo no se repite. |
| `tr_bruto_ms` | `t_toque − t_opciones`. |
| `anticipatoria` | `true` si `tr_bruto_ms` < 150 ms. |
| `peso_calidad` | Foco (0 o 1) × proporción de cuadros a tiempo × plausibilidad (0 si es anticipatoria). |

Solo las tres últimas columnas se calculan a partir de otras; todo lo demás se guarda tal como se midió.

## Autoría y licencia

© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.
