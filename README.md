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

## Uso

1. **Inicio (para el adulto).** Se eligen la actividad, la modalidad, la banda inicial y el número de ensayos. También se puede escribir un código opcional del niño (nunca el nombre) y ajustar el volumen. Después se toca «Empezar».
2. **Sesión.** Es la pantalla del niño: fondo neutro y sin texto.
   - El botón de pausa del terapeuta está en la esquina superior derecha y se toca dos veces: el primer toque lo arma durante 3 s.
   - El ensayo en curso queda registrado como interrumpido y no se repite.
   - En la pausa se puede ajustar el volumen, continuar o terminar el bloque.
3. **Fin de bloque.** Aparece una pantalla de «terminamos», igual sin importar el desempeño. El adulto toca dos veces el botón de la esquina para ver el resumen.
4. **Resumen (para el adulto).** Es descriptivo: aciertos, omisiones y mediana del tiempo de respuesta, sin puntajes. Desde ahí se inicia otro bloque de la misma sesión o se termina la sesión.

En iPad, el sonido se activa con el toque en «Empezar»; antes de eso, Safari no permite reproducir audio.

## Pruebas

Requiere Node.js 20 o posterior. No hay dependencias que instalar.

```
npm test
```

(equivale a `node --test`).

## Arquitectura

El motor ejecuta la ficha. La secuencia del ensayo y el registro no tienen código propio por actividad; cada actividad solo aporta cómo se dibuja su pantalla.

```
index.html               Inicio, sesión, galería, créditos y calibración
src/engine/trial.js      Máquina de estados del ensayo y ejecución del bloque
src/engine/clock.js      Medición del tiempo: performance.now, cuadros, foco
src/engine/logger.js     Registro por ensayo; almacenamiento local; CSV y JSON
src/engine/selector.js   Selección de ítems por banda, con semilla
src/engine/quality.js    Reglas de calidad (tr_bruto_ms, anticipatoria, peso_calidad)
src/engine/ficha.js      Carga y validación de fichas
src/activities/          Presentación visual de cada tipo de pantalla
fichas/                  Ficha técnica de cada actividad (JSON)
items/                   Conceptos, banco de ítems generado y licencias de cada archivo
tools/                   Generadores y verificadores (banco de ítems, registro de ejemplo)
assets/                  Imágenes, pictogramas y audios
docs/                    Registro de ejemplo
test/                    Pruebas (node --test)
```

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

Cada ensayo produce una fila con las columnas siguientes, en este orden. El registro vive en memoria y en el almacenamiento local del navegador, y se descarga con los botones «Descargar registro (CSV)» y «(JSON)». Cualquier campo que no esté en esta lista se descarta antes de guardar.

[`docs/ejemplo-registro.csv`](docs/ejemplo-registro.csv) es una sesión simulada de 10 ensayos de ACT-01, para revisar el formato sin correr la aplicación. A propósito incluye:

- un error y una omisión;
- un toque fuera de las opciones y un toque repetido;
- una respuesta anticipatoria y una pausa;
- un audio sin evento de fin y un fallo de audio.

Se regenera con `node tools/ejemplo-registro.mjs`.

**Posiciones.** Las opciones se numeran por filas, de izquierda a derecha y de arriba abajo, empezando en 1. En `1x4` las posiciones son 1, 2, 3 y 4 de izquierda a derecha; en `2x2`, 1 y 2 son la fila de arriba, y 3 y 4 la de abajo. `pos_correcta`, `pos_distractores` y `opcion_elegida` usan esta numeración.

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
| `n_opciones` | Número de opciones. |
| `disposicion` | Filas x columnas de las opciones: `1x2`, `1x3`, `1x4` o `2x2`. |
| `pos_correcta` | Posición de la opción correcta. |
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
| `toques_repetidos` | Toques sobre una opción ignorados por llegar a menos de 100 ms de la respuesta, incluido el segundo dedo en un toque multitáctil. |
| `perdida_foco` | `true` si la página se ocultó o perdió el foco durante el ensayo. |
| `cuadros_perdidos`, `cuadros_total` | Intervalos entre cuadros mayores a 1.5 veces el periodo normal, y total de intervalos medidos. |
| `interrumpido` | `true` si el terapeuta pausó durante el ensayo. Ese ensayo no se repite. |
| `fallo_tecnico` | `true` si el audio de la consigna AV no arrancó o falló. |
| `tr_bruto_ms` | `t_toque − t_opciones`. |
| `anticipatoria` | `true` si `tr_bruto_ms` < 150 ms. |
| `peso_calidad` | Foco (0 o 1) × proporción de cuadros a tiempo × plausibilidad (0 si es anticipatoria) × técnico (0 si hubo fallo técnico). |

Solo las tres últimas columnas se calculan a partir de otras; todo lo demás se guarda tal como se midió.

**Columnas agregadas a la especificación original** (aprobadas en la revisión del motor):

| Columna | Motivo |
|---|---|
| `disposicion` | Hace explícito cómo se numeran las posiciones. |
| `audio_latencia_ms` | La medición del audio pide registrar `outputLatency`, que no tenía columna. |
| `audio_fin_por_tope` | Distingue un audio sin evento de fin; en ese caso `t_audio_fin` queda vacío y no se rellena con la hora del tope. |
| `cuadros_total` | Permite recalcular `peso_calidad` desde el CSV. |
| `fallo_tecnico` | Marca los ensayos AV en que el audio no arrancó o falló. |

## Banco de ítems

- [`items/conceptos.json`](items/conceptos.json) tiene los 60 conceptos de ACT-02, cada uno con:
  - artículo y categoría;
  - mitad (`A` o `B`, para la fase 2);
  - color típico (provisional, hasta tener las fotografías);
  - notas, pictograma de ARASAAC y conceptos que nunca aparecen juntos en una pantalla (`excluir`).
- [`items/items.json`](items/items.json) se genera con `npm run build-items` a partir de los conceptos y de las reglas de bandas de las fichas. El azar usa semillas fijas, así que el resultado es reproducible. No se edita a mano: se cambian los conceptos o las fichas y se regenera.
- Códigos: `ACT01-B2-05` significa actividad, banda y número.
  - ACT-01 tiene 10 ítems por banda.
  - ACT-02 tiene un ítem por concepto y banda; el número sigue el orden de `conceptos.json` (`ACT02-B3-01` a `ACT02-B3-60`). Un bloque de ACT-02 usa 30 conceptos distintos, elegidos al azar. En una misma sesión ningún concepto se repite, aunque cambie la banda: con 60 conceptos caben dos bloques de 30.
- `muestraExpertos`: en ACT-02, 10 ítems por banda, cerca de 2 por categoría y con las dos mitades representadas. Es la muestra que revisa el panel.
- `revisionPendiente` y `motivosRevision` marcan lo que un clínico debe confirmar:
  - los distractores «de aspecto parecido» de B4;
  - el color en ACT-01 B1;
  - los conceptos pendientes (`short`, `camión`).
- Ejemplares: el 1 y el 2 se usan en la práctica; el 3 se reserva para sondas de generalización y no aparece en los ensayos normales.

`npm run check-items` verifica que todo archivo usado exista y tenga su fila en [`items/licencias.csv`](items/licencias.csv), y falla si no. También lista los marcadores provisionales que siguen en uso y los audios que faltan.

## Imágenes, pictogramas y audio

**Fotografías.** Por ahora cada ejemplar es un marcador provisional en `assets/img/<concepto>/<n>.svg` (fondo gris con el nombre del concepto y «EJEMPLAR n PENDIENTE»). Para reemplazar uno por una fotografía real con licencia libre:

1. Guarda la fotografía como `assets/img/<concepto>/<n>.jpg` (también sirven `.png` o `.webp`). El identificador del concepto está en `conceptos.json`; por ejemplo, `cepillo-de-dientes`.
2. Borra el marcador `.svg` y su fila en `items/licencias.csv`.
3. Agrega la fila de la fotografía en `items/licencias.csv`: origen, autor, licencia y dirección de origen.
4. Corre `npm run build-items` (el banco pasa a usar la fotografía) y `npm run check-items`.

No se usan fotografías inventadas ni generadas. Respeta las notas de cada concepto; por ejemplo, el pollito sin gallina y la misma forma de paleta en sus tres ejemplares.

**Audio.** Cada consigna tiene una clave, y su archivo va en `assets/audio/<clave>.mp3`; por ejemplo, `cual-es-igual.mp3` o `donde-esta-el-perro.mp3`. `npm run check-items` lista las claves que faltan. Cada archivo necesita su fila en `licencias.csv`. Mientras falte, la aplicación usa la voz del navegador en español de México y lo registra como `audio_fuente` = `sintesis`.

**Pictogramas.** Se descargan una sola vez de ARASAAC con `npm run pictos`, a `assets/picto/<concepto>.png`. El identificador de cada uno está en `conceptos.json` (`arasaac`) y en `licencias.csv`. Para cambiar uno:

1. Cambia el identificador en `conceptos.json`.
2. Borra el `.png` y su fila en `licencias.csv`.
3. Vuelve a correr `npm run pictos`.

## Autoría y licencia

© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.

### Pictogramas de ARASAAC

Los pictogramas de `assets/picto/` no están bajo los derechos anteriores. Se distribuyen bajo la licencia Creative Commons BY-NC-SA, que autoriza su uso sin fines de lucro citando la fuente y el autor, y obliga a compartir las obras derivadas con la misma licencia. Atribución, según las condiciones de uso de ARASAAC:

> Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido creados por Sergio Palao para ARASAAC (http://www.arasaac.org), que los distribuye bajo Licencia Creative Commons BY-NC-SA.

> Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España)
