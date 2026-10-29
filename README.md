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

## Autoría y licencia

© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.
