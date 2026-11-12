# AutiPal · Prototipo E13

[![Verificación](https://github.com/nazariegosantomeluis-droid/Neuro-BlueMinds-prototipo-1/actions/workflows/verificacion.yml/badge.svg)](https://github.com/nazariegosantomeluis-droid/Neuro-BlueMinds-prototipo-1/actions/workflows/verificacion.yml)

AutiPal es la aplicación de Neuro-BlueMinds. Herramienta de apoyo y medición para terapeutas que trabajan con niñas y niños autistas de 4 a 10 años. Registra con precisión lo que el niño hace en actividades breves de selección en una pantalla táctil.

> **Prototipo para revisión de expertos. No es una herramienta diagnóstica.**
> No es una intervención ni un instrumento de diagnóstico. No calcula puntajes, niveles ni perfiles del niño.

Este prototipo sirve para que un panel de 6 a 9 expertos (terapia de lenguaje, terapia ocupacional, psicología y terapia conductual) juzgue si las actividades son relevantes y claras (validez de contenido). El motor definitivo se construirá en Flutter (entregable E17). Por eso las fichas de las actividades y el formato del registro son archivos de datos independientes del código.

## Actividades

El Catálogo de actividades de Neuro-BlueMinds tiene 17 actividades. [`fichas/catalogo.json`](fichas/catalogo.json) las lista con su estado, y el estado decide cómo aparece cada una en el prototipo.

**Piloto.** Son las tres que califica el panel de expertos y las únicas que se usan en una sesión con un niño.

| Código | Nombre | Ensayos por bloque | Bandas |
|---|---|---|---|
| ACT-01 | Igual a la muestra (familiarización) | 10 | B1 a B3 |
| ACT-02 | Pictograma e imagen | 30 | B1 a B4 |
| ACT-07 | Cambia la regla | 30 | B1 a B4 |

**Uso posterior, con prototipo.** El Catálogo las habilita después del piloto y de su propia validez de contenido. Aquí ya se pueden revisar, pero **solo se abren en modo experto**: sus sesiones llevan `EXP-`, y sus ítems no entran en la revisión clínica ni en el formulario F3.

| Código | Nombre | Qué hace el niño | Modalidad | Bandas |
|---|---|---|---|---|
| ACT-03 | Palabra escrita e imagen | Lee una palabra o una frase de dos palabras y toca su dibujo | V y AV | B1 a B3 |
| ACT-04 | Oración e imagen | Lee o escucha una oración y toca la escena que la muestra; en B5 dice con una palomita o un tache si la oración dice lo que muestra la escena | V y AV | B1 a B5 |
| ACT-05 | Sonido e imagen | Escucha un sonido que no es habla (un maullido, un tren) y toca lo que lo produce | Solo AV | B1 a B3 |
| ACT-06 | Clasifica por categoría | Pone cada dibujo en la caja de su categoría (2 o 3 cajas) | V y AV | B1 a B3 |
| ACT-08 | Busca el objetivo | Encuentra un dibujo entre 4, 8, 12 o 16 | V y AV | B1 a B4 |
| ACT-09 | Recuerda y encuentra | Ve un dibujo 2 s y lo encuentra después de una pausa de 0, 2, 5 o 10 s | V y AV | B1 a B4 |
| ACT-10 | Ordena la secuencia | Toca en orden los momentos de una historia (V) o los dibujos que nombra una instrucción de varios pasos (AV); de 2 a 5 tarjetas | V y AV | B1 a B4 |
| ACT-11 | Completa el patrón | Elige la figura que sigue en una serie: AB, AAB, ABC o dos reglas a la vez | V y AV | B1 a B4 |
| ACT-14 | Reconoce la emoción | Elige el pictograma de la emoción de un rostro dibujado | V y AV | B1 a B3 |
| ACT-15 | Sonidos de las palabras | Escucha una palabra y toca la que rima o la que empieza igual; en B4 dice si dos palabras suenan igual | Solo AV | B1 a B4 |
| ACT-16 | Forma la palabra | Forma el nombre de un dibujo tocando sus sílabas o sus letras en orden, o una frase con sus palabras; una pieza sobra | V y AV | B1 a B4 |
| ACT-17 | Pausa guiada | Mira un globo que se infla y se desinfla despacio. No mide nada | — | Sin bandas |

**En investigación, con prototipo.** El Catálogo deja dos actividades en investigación: antes de usarlas hay que definir sus indicadores en el Modelo matemático. Su prototipo sirve para que el equipo revise la mecánica. Se abren solo en modo experto, van aparte en el inicio, en un grupo plegado, y no entran en el piloto, en la revisión clínica ni en el formulario F3.

| Código | Nombre | Qué hace el niño | Modalidad | Bandas |
|---|---|---|---|---|
| ACT-12 | Elige y descubre | Elige entre dos cofres; uno tiene la estrella más veces que el otro (9, 8 o 7 de cada 10). En B3 y B4, a la mitad del bloque esa ventaja pasa al otro cofre | Solo V | B1 a B4 |
| ACT-13 | Espera la señal | Toca el globo cuando aparece y deja sin tocar la nube. Las bandas cambian la proporción de nubes (de 5 a 2 de cada 10) y el ritmo | Solo V | B1 a B4 |

Ya no hay actividades del Catálogo sin prototipo. Algunas bandas siguen pendientes; cada ficha las lista en `bandasPendientes` (ver [Pendientes](#pendientes)).

Cada actividad se describe en una ficha técnica en [`fichas/`](fichas/). El motor ejecuta la ficha: la secuencia del ensayo y el registro son iguales para todas las actividades; cada actividad solo aporta cómo se dibuja su pantalla.

En las fichas de uso posterior, el paradigma, la mecánica, las bandas, la evidencia, las lecturas no permitidas y las contraindicaciones vienen del Catálogo. Lo demás (el objetivo, las lecturas permitidas, la consigna en voz, el número de ensayos y los ítems) es una propuesta de este prototipo: cada ficha lo dice en `notaPrototipo`, y falta su revisión clínica.

## Privacidad

- Sin cuentas, sin inicio de sesión, sin servidor y sin analítica.
- En la tableta no existe nada que permita saber quién es el niño real: no se pide ni se guarda nombre, fecha de nacimiento, correo ni ningún dato que lo identifique. El niño es un código seudónimo aleatorio de 128 bits, con un ícono y un color para confirmar que es el correcto, su edad en meses y su estado de consentimiento. La relación entre el código y el niño la lleva el investigador fuera de la aplicación (Arquitectura 9.1).
- El registro se guarda únicamente en el navegador del dispositivo y se descarga como CSV o JSON. Nada se envía a ningún servidor.

## Cómo correrlo localmente

Los módulos de JavaScript no cargan desde `file://`, así que se necesita un servidor estático. Desde la carpeta del proyecto:

```
python3 -m http.server 8000
```

En Windows, el comando suele ser `python -m http.server 8000`. Después abre <http://localhost:8000>. Para probar en una tableta conectada a la misma red, abre `http://<IP-de-la-computadora>:8000`.

## Uso

1. **Inicio (para el adulto).** Tiene tres pasos: la actividad; los ajustes del bloque (modalidad, banda inicial y número de ensayos, y el volumen en AV), y la sesión (el participante y el modo experto). El participante es un niño inscrito (ver «Niños inscritos», más abajo) o la demostración, sin niño; no hay ningún campo de texto. Después se toca «Empezar», en la barra de abajo, que siempre está a la vista.
   - «Así lo verá el niño» dibuja en chico un ítem de ejemplo de la banda elegida.
   - Si las opciones de la banda no caben en la pantalla a 2 cm, se avisa antes de empezar. El adulto puede volver o continuar de todos modos.
   - Con niños inscritos hay que elegir a uno de forma deliberada; no hay ninguno preseleccionado.
   - Con un niño, antes del primer bloque aparece «¿Es este niño?» con su ícono y su color; hay que confirmar.
   - El consentimiento se comprueba al empezar cada bloque: si no está vigente, no se inicia.
   - Mientras la ficha de la actividad no tenga revisión clínica registrada, el inicio avisa que solo sirve para demostración y pruebas.
   - Las actividades del piloto van primero. Las de uso posterior y las de investigación van en dos grupos plegados, cada uno con una línea que dice para qué sirven.
   - Si la actividad tiene una sola modalidad (ACT-05 y ACT-15 solo con sonido; ACT-12 y ACT-13 solo visual), el inicio la fija y lo dice. En ACT-10 y ACT-16 el bloque se cuenta en secuencias («Número de secuencias»); cada paso queda como un ensayo en el registro.
2. **Referencia motora.** Al empezar cada sesión, antes del primer bloque, aparece un círculo liso en una celda de la pantalla (4 columnas por 3 filas) de 6 a 8 veces, con esperas de 800 a 1,500 ms, y el niño lo toca. La mediana de esos tiempos queda en `sesiones.csv` (`referencia_motora_ms`) y se reporta junto a la latencia de las actividades: no se resta.
   - Se hace en las sesiones con niño y en la demostración; **no** en el modo experto.
   - Si el niño no lo toca, el objetivo permanece 5 s y se registra como omisión. Ese tiempo es un valor de planeación, **por confirmar con los clínicos** (Arquitectura 4.6 no lo fija).
   - Los toques de menos de 150 ms (anticipatorios, el mismo umbral del Modelo matemático 3.3) se registran con su marca, se cuentan aparte y no entran en la mediana ni en el mínimo.
   - Con menos de 5 toques válidos la referencia queda «no disponible» (`referencia_motora_ms` vacía) y la sesión continúa.
   - La pausa del terapeuta funciona igual: descarta la aparición en curso, que no se repite. Si se termina desde ahí, la sesión termina sin bloques.
3. **Sesión.** Es la pantalla del niño: fondo neutro y sin texto.
   - Antes de cada bloque se mide un segundo de cuadros. Si la pantalla dibuja a menos de 50 Hz (periodo mayor de 20 ms; suele ser el ahorro de energía), se avisa al adulto, que puede volver a medir o continuar de todos modos. Si continúa, la sesión queda con `advertencia_frecuencia` = `true`.
   - El botón de pausa del terapeuta está en la esquina superior derecha y se toca dos veces: el primer toque lo arma durante 3 s.
   - El ensayo en curso queda registrado como interrumpido y no se repite.
   - En la pausa se puede ajustar el volumen, continuar o terminar el bloque. Si se termina, se elige el motivo de una lista y se puede agregar una nota breve (sin nombres ni datos personales).
4. **Fin de bloque.** Aparece una pantalla de «terminamos», igual sin importar el desempeño. El adulto toca dos veces el botón de la esquina para ver el resumen.
5. **Resumen (para el adulto).** Es descriptivo: aciertos, omisiones y mediana del tiempo de respuesta, sin puntajes. Ahí el adulto elige el nivel de apoyo que dio en el bloque (ninguno, verbal, gestual o físico). «Qué no se puede concluir de este bloque» abre las lecturas no permitidas de la ficha. Desde el resumen se inicia otro bloque de la misma sesión o se termina la sesión.

En iPad, el sonido se activa con el toque en «Empezar»; antes de eso, Safari no permite reproducir audio.

**Modo experto.** Se activa en el inicio, antes de empezar la sesión, y solo con la demostración (sin niño). Permite elegir cualquier actividad, banda y modalidad. No hace la referencia motora.
- Durante el ensayo muestra el código del ítem en la esquina inferior izquierda.
- El botón «Siguiente» pasa al ítem siguiente sin esperar los tiempos; el ensayo en curso queda como interrumpido.
- Sus registros llevan un `sesion_id` que empieza con `EXP-`.
- Las actividades de uso posterior y las de investigación lo exigen: al elegir una, el participante queda fijo en la demostración y la casilla queda marcada; ninguno de los dos se puede cambiar. Si hay una sesión con niño o de demostración en curso, hay que terminarla antes.

**Sesiones** (`#sesiones`). Lista las sesiones guardadas en el dispositivo, de la más reciente a la más antigua: fecha, tipo (con niño, demostración o modo experto), el niño por su ícono y su código abreviado, número de ensayos, la referencia motora, pausas y, de cada bloque, el mismo resumen descriptivo del fin de bloque. Cada sesión se descarga aparte (`sesion-<sesion_id>.csv`, con las columnas del registro por ensayo). El registro completo se sigue descargando desde ahí o desde el inicio.

**Pausa guiada** (`#pausa`, ACT-17). Un globo que se infla y se desinfla despacio, para acompañar una pausa de regulación. No mide nada.
- La inicia solo el terapeuta: desde el inicio o desde el panel de pausa de un bloque («Pausa guiada con el globo»). La aplicación nunca la propone ni la inicia sola.
- Se eligen el ritmo (lento o muy lento) y la duración (60, 90 o 120 s). Dos toques en la esquina la detienen en ese momento.
- No produce ensayos. En la fila de la sesión queda que ocurrió y cuánto duró (`pausas`).

**Galería de ítems** (`#galeria`). Muestra todos los ítems por actividad y banda: el código, la consigna, las opciones con la correcta marcada y el estado de revisión. También incluye la ficha técnica de la actividad y, plegada, la tabla de las 17 actividades del Catálogo con su estado.
- Por defecto muestra solo la muestra para expertos; una casilla muestra todos.
- Los filtros quedan en el enlace, así que una vista se puede compartir. Por ejemplo, `#galeria?actividad=ACT-02&banda=B4&todos=1` o `#galeria?actividad=ACT-07&banda=B2&pareja=1`.
- En las actividades con sonido (ACT-05) cada ítem tiene un reproductor para escuchar su grabación. Las secuencias (ACT-10 y ACT-16) muestran sus tarjetas con el número de su lugar; los programas de ACT-12 y las series de ACT-13, una tira con cada ensayo.
- Si [`config/enlaces.json`](config/enlaces.json) tiene el campo `formularioF3`, la galería muestra el botón «Calificar en el formulario F3», que abre ese enlace en otra pestaña. Sin el archivo (o sin el campo), no se muestra nada.

**Revisión clínica** (`#revision`). Dos clínicos califican los ítems de muestra antes del panel de expertos. Ver [Revisión clínica](#revisión-clínica).

**Niños inscritos** (`#ninos`). Es el padrón local del prototipo; en el estudio lo entrega el servidor (hoja de ruta, H7.4) y el terapeuta no cambia el consentimiento. La pantalla lo dice en una línea: la tableta no guarda quién es cada niño.
- Para inscribir solo se pide la edad en meses (de 48 a 131, es decir, de 4 a 10 años) y si la familia autorizó el video. El código, el ícono y el color los asigna la aplicación. No hay ningún campo de texto.
- El código tiene 128 bits (32 caracteres hexadecimales) y se muestra abreviado (por ejemplo, `7F3A-91C2`). El código completo está en cada fila, para que el investigador lo anote fuera de la aplicación; el registro guarda siempre el completo.
- El ícono es una forma (círculo, cuadrado, triángulo, estrella, rombo, corazón, luna o hexágono) con un color de una paleta apta para daltonismo. Mientras haya formas sin usar no se repite ninguna, así que la forma identifica al niño aunque no se distinga el color.
- El consentimiento es `vigente`, `suspendido` o `retirado`. Un niño nuevo queda vigente. Suspendido puede volver a vigente; retirado no se revierte en la tableta. Solo con consentimiento vigente se puede iniciar una sesión.
- El padrón se guarda en el navegador del dispositivo y no se borra con «Borrar registro».
- Las sesiones empiezan con `S-` (niño inscrito), `DEMO-` (demostración) o `EXP-` (modo experto).
- No incluye todavía lo que decide la familia al retirar el consentimiento (conservar o eliminar los datos): necesita el servidor.

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

**Aplicar la revisión al banco.** Primero se resuelven en una reunión con los clínicos los casos `Revisar en reunión`, y la decisión acordada se escribe en la columna `decision` de `revision-consolidada.csv`: `Aprobado`, `Corregir` o `Retirar` en los ítems y las figuras, y la opción elegida en las decisiones. Después:

```
node tools/aplicar-revision.mjs revision-consolidada.csv \
  --revisor "AB=Nombre Apellido, terapia de lenguaje" \
  --revisor "CD=Nombre Apellido, psicología" \
  --fecha 2026-11-15
```

- Hay un `--revisor` por cada columna de iniciales del CSV, con el nombre completo y la profesión (el CSV solo trae las iniciales). La fecha es la de la revisión; si se omite, se usa la de hoy.
- Con `--prueba` muestra el resumen sin escribir nada.
- No aplica nada mientras quede un caso sin decisión final, falte el nombre de un revisor o el CSV mencione un ítem que no existe.

Qué hace:

- Escribe [`items/revision.json`](items/revision.json): el estado de cada ítem revisado (`aprobado`, `corregir` o `retirado`), con sus problemas, los comentarios de cada revisor y la fecha; el de las figuras de ACT-07; las tres decisiones, y las rondas de revisión. Una segunda ronda sustituye solo los ítems que revisa.
- Anota en la ficha de cada actividad revisada el revisor y la fecha (`revisionClinica`), sin cambiar nada más.
- Regenera `items/items.json`: cada ítem de ACT-01 y ACT-02 lleva `estadoRevision`.
- Muestra un resumen: cuántos ítems quedan en cada estado, los retirados y por corregir con sus motivos, y las decisiones.

Efecto en la aplicación:

- **Retirado:** el ítem no se usa en ninguna sesión, aunque siga en el banco y en la galería. Solo se retira ese ítem. Si el motivo apunta al concepto o a su imagen («Imagen poco reconocible», «No adecuado para niños de México», «Molesto o aversivo»), el resumen lo señala para decidir si se retira el concepto completo; eso se hace en `conceptos.json`.
- **Por corregir:** sigue en las sesiones mientras se corrige (por ejemplo, otra fotografía). Una vez corregido, vuelve a revisarse en una ronda nueva.
- **Sin revisión clínica:** los ítems fuera de la muestra (200 de 270). Arquitectura 13.4 pide revisar cada ítem antes del estudio; queda pendiente una ronda con el resto del banco.
- **Figuras de ACT-07 y decisiones:** se registran, pero no cambian nada solas. Cambiar figuras, colores, conceptos o pictogramas es una decisión clínica y se hace aparte, en la ficha o en `conceptos.json`.
- La galería muestra el estado de cada ítem, las notas de los clínicos y, en ACT-07, el estado de las figuras; se puede filtrar por estado (`#galeria?actividad=ACT-02&estado=retirado&todos=1`).
- Mientras una ficha no tenga revisor y fecha, el inicio avisa que la actividad solo sirve para demostración. Arquitectura 4.4 pide que la aplicación se niegue a cargarla; ese bloqueo se activará con el modo de fase del estudio (hoja de ruta, H2.3), para no impedir las demostraciones.

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
- la referencia motora con tiempo simulado: plan de 6 a 8 apariciones, esperas, mediana, toques anticipatorios, mínimo de 5 toques válidos, permanencia, toques fuera, pausa y terminar;
- el padrón de niños: código de 128 bits, ícono y color sin repetirse, edad, consentimiento, quién puede participar y que el padrón no tiene ni puede recibir un dato que identifique al niño;
- la exportación de la revisión clínica, la regla para unir revisiones y su aplicación al banco (con el CSV de ejemplo `test/revision-consolidada-ejemplo.csv`): estados, casos sin resolver, rondas, fichas anotadas y que ningún ítem retirado entre en una sesión.
- el Catálogo y las actividades de uso posterior y de investigación (`test/catalogo.test.js`, `test/posteriores.test.js`, `test/pantallas.test.js` y `test/actividades-nuevas.test.js`): el índice de las 17 actividades, las fichas nuevas, las reglas de su banco de ítems (escenas que cambian una sola parte, sonidos de otro grupo o del mismo, rimas, secuencias con una pieza que sobra, proporciones de premios y de «no» sin rachas largas), que cada audio y cada recorte exista, las mismas reglas de tamaño y movimiento en sus pantallas, el resumen de las secuencias, de los cofres y de la señal, el aviso de tamaño de pantalla, la pausa guiada, la página de sesiones y la vista previa del inicio;
- la página de producto (`pagina-producto/pagina.test.js` y `novedades.test.js`): que sus números coincidan con las fichas, con las columnas del registro, con el Catálogo y con el número de pruebas; que no cargue nada de servidores externos; que respete las reglas de movimiento, y que la pantalla de las bandas use los ítems del banco.

Antes de publicar, corre también `npm run check-items`.

**Verificación automática.** En cada envío a cualquier rama y en cada pull request, GitHub Actions ([`.github/workflows/verificacion.yml`](.github/workflows/verificacion.yml)) corre, en Node 20 y 22:

1. `npm test`;
2. `npm run check-items`;
3. `node tools/build-items.mjs`, y falla si cambia algún archivo de `items/` o `assets/`: así detecta un banco desactualizado o editado a mano.

El resultado aparece en la pestaña Actions y en cada pull request. Para que GitHub no permita unir a `main` un cambio con la verificación fallida, el dueño del repositorio activa una regla en Settings → Rules → Rulesets (rama `main`, «Require status checks to pass», con las dos verificaciones de Node).

## Arquitectura

El motor ejecuta la ficha. La secuencia del ensayo y el registro no tienen código propio por actividad; cada actividad solo aporta cómo se dibuja su pantalla.

```
index.html                    Página única
src/app.js                    Sesión, pausa, fin de bloque y resumen; rutas
src/inicio.js                 Inicio: los tres pasos, la vista previa y la barra de «Empezar»
src/sesiones.js               Página de sesiones guardadas
src/paginas.js                Galería, calibración y créditos
src/catalogo.js               Qué actividades hay, su estado y qué pantalla dibuja cada una
src/previa.js                 Ítem de ejemplo en chico («Así lo verá el niño»)
src/resumen.js                Líneas del resumen de un bloque (las mismas en el fin de bloque y en Sesiones)
src/ajuste-pantalla.js        ¿Cabe la banda en esta pantalla con opciones de 2 cm?
src/pausa-guiada.js           Pausa guiada (ACT-17): el globo
src/html.js                   Utilidades de HTML
src/revision.js               Revisión clínica de ítems (pantalla)
src/revision-datos.js         Revisión clínica: ítems, faltantes y CSV
src/revision-estado.js        Estado de revisión clínica para el inicio y la galería
src/revision.css              Estilos de la revisión clínica
src/ninos.js                  Padrón de niños: código, ícono, color, edad y consentimiento
src/ninos-pantalla.js         Pantalla #ninos y confirmación «¿Es este niño?»
src/ninos.css                 Estilos del padrón
src/referencia.css            Estilos del objetivo de la referencia motora
src/frecuencia.js             Aviso de frecuencia de pantalla baja antes de cada bloque
src/enlaces.js                Botón del formulario F3 en la galería
src/styles.css                Estilos (temas claro y oscuro, unidad --cm)
src/actividades.css           Estilos de las pantallas de uso posterior y de la pausa guiada
src/engine/trial.js           Máquina de estados del ensayo y ejecución del bloque
src/engine/clock.js           Medición del tiempo: performance.now, cuadros, foco
src/engine/audio.js           Audio de las consignas: Web Audio y voz del navegador
src/engine/logger.js          Registro por ensayo; almacenamiento local; CSV y JSON
src/engine/selector.js        Selección de ítems por banda, con semilla
src/engine/quality.js         Reglas de calidad y resumen descriptivo
src/engine/referencia.js      Referencia motora: plan, ejecución y resumen
src/engine/ficha.js           Carga y validación de fichas
src/activities/seleccion.js   Pantalla de consigna y opciones (ACT-01 y ACT-02)
src/activities/cambia-regla.js  Pantalla de tarjeta y cajas, y figuras SVG (ACT-07)
src/activities/palabra.js     Palabra escrita y dibujos (ACT-03)
src/activities/categorias.js  Dibujo y cajas de categoría (ACT-06)
src/activities/busqueda.js    Objetivo y conjunto de dibujos (ACT-08)
src/activities/demora.js      Muestra que desaparece y opciones (ACT-09)
src/activities/patron.js      Serie de figuras y opciones (ACT-11)
src/activities/emociones.js   Rostro y pictogramas de emoción (ACT-14)
src/activities/rostros.js     Rostros y pictogramas de emoción, dibujados con código
src/activities/oracion.js     Oración y escenas; palomita y tache de la verificación (ACT-04)
src/activities/escenas.js     Escenas dibujadas con código: personas que hacen algo y lugares (ACT-04)
src/activities/sonido.js      Bocina y dibujos; reproductor de la galería (ACT-05)
src/activities/secuencia.js   Lugares y tarjetas de una secuencia por pasos (ACT-10 y ACT-16)
src/activities/historias.js   Los cinco momentos de cada historia, dibujados con código (ACT-10)
src/activities/cofres.js      Dos cofres y la estrella (ACT-12, en investigación)
src/activities/senal.js       Globo y nube, uno a la vez (ACT-13, en investigación)
src/activities/fonologia.js   Bocina y dibujos, o las figuras de «igual» y «diferente» (ACT-15)
src/activities/referencia.js  Pantalla del objetivo de la referencia motora
fichas/                       Ficha técnica de cada actividad (JSON) y catalogo.json
config/enlaces.json           Enlaces externos opcionales (formulario F3)
items/                        Conceptos, banco de ítems generado y licencias de cada archivo
tools/build-items.mjs         Genera items/items.json y los marcadores provisionales
tools/build-posteriores.mjs   Genera items/items-posteriores.json
tools/check-items.mjs         Verifica archivos y licencias del banco
tools/descargar-pictos.mjs    Descarga los pictogramas de ARASAAC
tools/ejemplo-registro.mjs    Genera docs/ejemplo-registro.csv
tools/unir-revisiones.mjs     Une las revisiones clínicas en revision-consolidada.csv
tools/aplicar-revision.mjs    Aplica la revisión consolidada al banco y a las fichas
assets/                       Imágenes, pictogramas, audios, tipografías (fonts/) y marca (marca/)
docs/                         Registro de ejemplo
test/                         Pruebas (node --test)
.github/workflows/            Verificación automática en GitHub Actions
```

Cada tipo de pantalla (`src/activities/`) aporta dos funciones: `toTrials` convierte los ítems de un bloque en ensayos, y `createView` dibuja la consigna, las opciones y la retroalimentación. Todo lo demás (tiempos, toques, audio, registro) lo hace el motor.

Las pantallas de uso posterior usan ese mismo contrato; el motor (`src/engine/`) no cambió para ellas. Algunas agregan funciones opcionales:

- `fichaDeBloque(ficha, banda)`: una copia de la ficha con los tiempos de esa banda. ACT-09 la usa para sumar la pausa en blanco al tiempo de la muestra; ACT-13, para el ritmo de cada banda; ACT-04 y ACT-15, para que la palomita y el tache (o «igual» y «diferente») no cambien de lugar.
- `elegir(ítems, n, azar, opciones)`: qué ítems entran en el bloque, si no son los del selector del motor. ACT-10 y ACT-16 eligen secuencias completas; ACT-12 y ACT-13, un programa o una serie para todo el bloque.
- `resumenExtra(filas, ítems, ficha)`: líneas propias para el resumen. ACT-14 cuenta qué pictograma se eligió ante cada emoción; ACT-10 y ACT-16, las secuencias completas y en orden; ACT-12, las elecciones antes y después del cambio.
- `resumen(filas, ítems, ficha)`: reemplaza el resumen del motor. Solo ACT-13 lo usa, porque ante la nube lo esperado es no tocar.
- `consignaHTML`, `opcionHTML`, `opcionTexto` y `consignaTexto`: cómo se ve un ítem en la galería y en la vista previa. `galeriaHTML` y `previa` lo dibujan completo cuando no es una consigna con opciones (secuencias, programas y series), y `escucharHTML` agrega un reproductor.

Ninguna de ellas cambia el motor: los tiempos, los toques, el audio y el registro de cada paso, de cada cofre y de cada globo son los de siempre.

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
| `tipoRespuesta` | Siempre `"seleccion_unica"`: el primer toque sobre una opción es la respuesta. En ACT-13, que muestra un solo estímulo, no tocar también es una respuesta (ver `respuesta`, más abajo). |
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
| `revisionClinica` | `{ "revisor": "", "fecha": "" }`. Vacío hasta la revisión clínica; lo llena `tools/aplicar-revision.mjs`. |

Campos opcionales que usa el motor:

- `fases`: fases y número de ensayos, según el Catálogo de actividades.
- `pantalla`: tipo de pantalla que dibuja la actividad.
- `resumen`: frase descriptiva del fin de bloque.
- `itemsPorBanda`.
- `repetirItems`: si es `false`, ningún ítem se repite en la sesión.
- `barajarOpciones`: si es `false`, las opciones conservan su posición.
- `disposicion`, en cada banda: filas x columnas de las opciones, por ejemplo `"1x4"` o `"2x2"`.

Campos de las fichas de uso posterior:

- `estado`: el del Catálogo (`"Uso posterior"`).
- `evidencia`, `mecanica` y `notaPrototipo`: el nivel de evidencia y la mecánica del Catálogo, y qué parte de la ficha es propuesta de este prototipo.
- `bandasPendientes`: bandas del Catálogo que todavía no se pueden construir, con el motivo.
- `muestraMs` (ACT-09): cuánto se ve la muestra; `demoraMs`, en cada banda, es la pausa en blanco.
- `juegos` (ACT-06), en cada banda: las cajas de cada juego; `emblemas` y `pocoTipicos` dicen qué pictogramas lleva cada caja y qué conceptos son poco típicos.
- `patron` y `largos` (ACT-11), en cada banda: la regla de la serie y cuántas figuras muestra.
- `emociones` e `intensidad` (ACT-14), en cada banda; `estratificarPor: "emocion"` reparte los ensayos por igual entre las emociones.
- `estructura` (ACT-04), en cada banda: `sujeto-verbo`, `sujeto-verbo-objeto`, `negacion`, `lugar` o `verificacion`. `acciones`, `sinObjeto`, `conObjeto`, `lugares`, `figuras` y `verificaciones` dicen qué escenas se pueden armar.
- `sonidos` (ACT-05): el grupo de cada concepto con sonido (animal, vehículo u objeto) y `grabacionesPorSonido`; `mismoGrupo`, en cada banda, dice si los distractores son del mismo grupo.
- `tarea` (ACT-15), en cada banda: `rima`, `inicio` o `igual`; `rimas`, `inicios` y `pares` son las listas de palabras.
- `unidadDelBloque: "secuencia"` (ACT-10 y ACT-16): el bloque se cuenta en secuencias y cada paso es un ensayo. `ensayosMax` es el tope de secuencias del campo del inicio. `elementos` y `momentos` (ACT-10), `unidad` y `piezas` (ACT-16), en cada banda; `historias`, `ordenesPorHistoria`, `instruccionesPorBanda`, `palabras` y `letrasSobrantes` arman los ítems. `resumenSecuencia` es la línea de las secuencias completas.
- `probabilidad` e `inversion` (ACT-12), en cada banda: cuántas veces premia el cofre favorable y si la ventaja pasa al otro a la mitad. `programasPorBanda` y `maxEnganososSeguidos` arman los programas.
- `respuesta: "tocar_o_no_tocar"` (ACT-13): cada ensayo muestra un solo estímulo (`opciones` = 1 en cada banda). `proporcionNo`, `limiteMs` e `intervaloMs`, en cada banda, son la proporción de nubes y el ritmo; `maxNoSeguidos`, `estimulos` y `anuncioMs` (la pantalla breve que muestra qué se toca y qué no, al empezar) completan la ficha.
- `ensayosMax`, en la ficha o en cada banda: el máximo que acepta el campo de ensayos del inicio.

[`fichas/ACT-17.json`](fichas/ACT-17.json) es descriptiva: la pausa guiada no tiene bandas ni ensayos, solo ritmos y duraciones.

Los textos clínicos (objetivo, paradigma, fases, lecturas y contraindicaciones) se copian tal cual del Catálogo de actividades (sección 5). `revisionClinica` queda vacío hasta la revisión clínica, y solo lo cambia `tools/aplicar-revision.mjs`.

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
| `sesion_id` | Identificador aleatorio de la sesión. Empieza con `S-` (niño inscrito), `DEMO-` (demostración) o `EXP-` (modo experto). |
| `bloque`, `ensayo` | Número de bloque en la sesión y de ensayo en el bloque. |
| `codigo_nino` | Código seudónimo aleatorio de 128 bits (32 caracteres hexadecimales) del niño inscrito; `DEMO` en demostración y en modo experto. |
| `dispositivo` | userAgent y tamaño de pantalla. |
| `version_app`, `actividad`, `version_ficha` | Versiones y actividad. |
| `version_parametros` | Versión de los umbrales del motor: anticipatoria (150 ms), toque repetido (100 ms), tope del audio (5 s), tope de la decodificación (1 s), periodo de cuadro máximo (20 ms) la regla de fuera de tarea (3 MAD escaladas, mínimo 10 ensayos) y los de la referencia motora (6 a 8 apariciones, esperas de 800 a 1,500 ms, permanencia de 5 s —valor de planeación, por confirmar con los clínicos—, anticipatoria de 150 ms y mínimo de 5 toques válidos). Vale `0.3.0`. |
| `item` | Código del ítem, por ejemplo `ACT01-B2-05`. En ACT-07 incluye la secuencia y el ensayo: `ACT07-B2-04-07`. En ACT-10 y ACT-16, la secuencia y el paso: `ACT10-B2-03-1`. En ACT-12 y ACT-13, el programa o la serie y el ensayo: `ACT12-B3-03-07`. |
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

**Actividades de uso posterior y de investigación.** Usan las mismas columnas, sin agregar ninguna:

- En ACT-10 y ACT-16 cada paso de una secuencia es una fila. Las opciones son las tarjetas que quedan, así que `n_opciones` baja paso a paso. Si al final queda una sola tarjeta y ninguna sobra, pasa sola a su lugar y no hay fila.
- En ACT-12, `acierto` dice si eligió el cofre que más premiaba en ese momento, tuviera o no la estrella en ese ensayo. Qué cofre tenía la estrella está en el ítem (`items-posteriores.json`), por su código.
- En ACT-13, ante la nube lo esperado es no tocar: la fila queda con `pos_correcta` = 0, y no tocar se guarda como `omision` = `true`. El resumen del bloque lo cuenta como «no tocó», no como omisión; las omisiones son las del globo.

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
| `pausas` | Lista JSON de `{bloque, ensayo, duracion_ms}`: en qué ensayo se pausó y cuánto duró la pausa. `bloque` 0 es la referencia motora, y entonces `ensayo` es el número de aparición del objetivo. Si en esa pausa se usó la pausa guiada, lleva además `pausa_guiada_ms`, lo que duró el globo. Una pausa guiada abierta desde `#pausa` con la sesión en curso queda con `ensayo` vacío. |
| `terminada_antes` | `true` si el adulto terminó un bloque desde la pausa. |
| `motivo_terminacion` | Motivo elegido al terminar el bloque: «Desregulación o malestar del niño», «Cansancio o falta de interés», «Petición del niño o de la familia», «Fallo técnico», «Decisión clínica» u «Otro». |
| `nota_terminacion` | Nota opcional de hasta 80 caracteres, sin nombres ni datos personales. |
| `nivel_apoyo` | Lista JSON de `{bloque, nivel}`. El adulto lo elige en el resumen de cada bloque: `ninguno`, `verbal`, `gestual` o `físico`. |
| `frecuencia_hz` | Frecuencia de la pantalla: 1000 / mediana de `periodo_cuadro_ms` de la sesión, redondeada. |
| `proporcion_periodo_lento` | Proporción de ensayos con `periodo_cuadro_ms` mayor de 20 ms. |
| `advertencia_frecuencia` | `true` si el adulto continuó después del aviso de frecuencia baja. |
| `referencia_motora_ms` | Mediana, en ms, del tiempo del toque al objetivo desde el cuadro en que aparece, con los toques válidos. Es bruta (no se le resta la latencia del dispositivo) y se reporta junto a la latencia de las actividades sin restarse. Vacía si hubo menos de 5 toques válidos («no disponible»), en el modo experto o si la sesión se terminó durante la referencia. |
| `referencia_motora_n` | Toques válidos: con tiempo, sin anticipar y sin pausa. El mínimo para tener referencia es 5. |
| `referencia_motora_anticipados` | Toques de menos de 150 ms desde la aparición (mismo umbral de respuesta anticipatoria del Modelo matemático 3.3). Se registran y se cuentan aparte; no entran en la mediana ni en el mínimo. |
| `referencia_motora_toques` | Lista JSON de las 6 a 8 apariciones: `aparicion`, `pos` (celda, por filas), `tr_ms` (vacío si no hubo toque), `x`, `y` (del toque), `anticipatorio`, `omision`, `interrumpida` (pausa) y `fuera`, los toques fuera del objetivo, con `t_ms` respecto de la aparición (o del inicio de la espera si `antes` es verdadero), `x` e `y`. |

## Banco de ítems

- [`items/conceptos.json`](items/conceptos.json) tiene los 60 conceptos de ACT-02, cada uno con:
  - artículo y categoría;
  - mitad (`A` o `B`, para la fase 2);
  - color típico, que es el del dibujo del ejemplar 1;
  - notas, pictograma de ARASAAC y conceptos que nunca aparecen juntos en una pantalla (`excluir`).
- [`items/items.json`](items/items.json) se genera con `npm run build-items` a partir de los conceptos, de las reglas de bandas de las fichas y de [`items/revision.json`](items/revision.json). El azar usa semillas fijas, así que el resultado es reproducible. No se edita a mano: se cambian los conceptos, las fichas o la revisión y se regenera.
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
- `estadoRevision` (ACT-01 y ACT-02): `sin-revisar`, `aprobado`, `corregir` o `retirado`, según la revisión clínica (ver «Aplicar la revisión al banco»). Los retirados no entran en las sesiones. Las secuencias de ACT-07 no tienen estado propio: sus figuras se revisan en conjunto.
- Ejemplares: el 1 y el 2 se usan en la práctica; el 3 se reserva para sondas de generalización y no aparece en los ensayos normales.

`npm run check-items` verifica que todo archivo usado exista y tenga su fila en [`items/licencias.csv`](items/licencias.csv), y falla si no. También lista los marcadores provisionales que siguen en uso, los audios que faltan y cuántos ítems hay en cada estado de revisión clínica.

### Banco de las actividades de uso posterior

[`items/items-posteriores.json`](items/items-posteriores.json) va aparte del banco del piloto, que no cambia. Se genera con `npm run build-posteriores` a partir de `conceptos.json` y de las fichas nuevas, con semillas fijas: 817 ítems, todos con `revisionPendiente`. En ACT-10 y ACT-16 un ítem es una secuencia completa, con sus pasos; en ACT-12 y ACT-13, el programa o la serie de un bloque, con sus ensayos.

| Actividad | Ítems | Cómo se arman |
|---|---|---|
| ACT-03 | 130 | B1 y B2: un ítem por concepto; la consigna es el nombre escrito. B3: 10 frases de objeto y color (lista `frases` de la ficha), con el mismo objeto en otro color, otro objeto del mismo color y otro objeto de otro color |
| ACT-06 | 84 | Un ítem por dibujo y juego de cajas. Las cajas no cambian de lugar; cada una lleva dos pictogramas de su categoría, y el dibujo nunca es uno de ellos. El juego de cajas alterna entre sesiones |
| ACT-08 | 40 | 10 por banda. El objetivo es la misma imagen de la muestra; en B3 y B4, 2 y 4 distractores son de su categoría |
| ACT-09 | 40 | 10 por banda. La opción correcta es la misma imagen de la muestra |
| ACT-11 | 40 | 10 por banda. Figuras (círculo, cuadrado, triángulo y estrella) en azul y amarillo; la opción correcta es la que sigue según la regla |
| ACT-14 | 60 | Cada uno de los 6 personajes muestra una vez cada emoción de la banda. Los pictogramas de emoción no cambian de lugar |
| ACT-04 | 88 | Escenas de una niña o un niño que duerme, come, bebe, corre, salta, se peina, barre, habla por teléfono o abraza a un animal, y de un animal u objeto dentro, arriba, abajo o al lado de una caja o una mesa. En B2 cada distractor cambia una sola parte de la oración: la persona, la acción o el objeto. En B5, la mitad de las oraciones dicen lo que muestra la escena |
| ACT-05 | 66 | Un ítem por grabación (12 sonidos, 2 grabaciones de cada uno) y banda. Los distractores también tienen sonido: de otro grupo en B1 y B2, del mismo grupo en B3 (todos animales o todos vehículos) |
| ACT-10 | 96 | V: 7 historias de 5 momentos (la planta que crece, la manzana que se come, el sándwich, el pollito, la vela, el vaso que se llena y el helado), cada una en 2 órdenes revueltos. AV: 10 instrucciones por banda con dibujos del banco de categorías distintas |
| ACT-12 | 24 | 6 programas de 40 ensayos por banda. En cada mitad del bloque el cofre favorable tiene la estrella en la proporción exacta de la banda, nunca más de 2 ensayos seguidos en el otro, y el cofre que empieza premiando alterna entre programas |
| ACT-13 | 24 | 6 series de 30 presentaciones por banda, con la proporción de nubes de la banda. Nunca empiezan con una nube ni ponen más de 2 seguidas |
| ACT-15 | 75 | Rimas (B1 y B2; en B2 un distractor empieza igual que la palabra, pero no rima), inicios con la misma sílaba (B3) y pares que cambian en un solo sonido, dichos iguales o distintos (B4) |
| ACT-16 | 50 | Palabras de 2 y 3 sílabas (B1 y B2), de 3 o 4 letras (B3) y las frases de objeto y color de ACT-03 (B4). Una pieza sobra, y nunca repite una pieza de la palabra |

- Ningún ítem usa el ejemplar 3, reservado para las sondas de generalización de ACT-02, ni junta en una pantalla conceptos que se excluyen.
- ACT-03, 05, 06, 08, 09, 10 (en AV), 15 y 16 usan los dibujos y pictogramas del banco. Las figuras de ACT-11, los rostros y pictogramas de emoción de ACT-14, las escenas de ACT-04, las historias de ACT-10, los cofres de ACT-12, el globo y la nube de ACT-13, y las figuras de «igual» y «diferente» de ACT-15 se dibujan con código.
- Las escenas de ACT-04 son personas dibujadas con código, con objetos y animales recortados de los dibujos del banco (`assets/escenas/`). Cada ítem fija el tono de piel, el pelo y la ropa de la persona, así que en sus opciones solo cambia lo que dice la oración.
- En la secuencia, las tarjetas se revuelven de modo que con 3 o más nunca quedan ya en orden.
- Los rostros de ACT-14 son dibujos, como pide el Catálogo para empezar: 6 personajes de distinta edad, género y tono de piel, con 4 emociones (alegría, tristeza, enojo y miedo) en 2 intensidades.
- Las frases de ACT-03 B3 dependen del color de cada dibujo. Si se cambia una imagen del banco, hay que revisar la lista `frases` de la ficha.

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

**Recortes para las escenas.** Los 16 archivos de `assets/escenas/<concepto>.png` son dibujos del banco sin el fondo blanco (manzana, plátano, galleta, paleta, naranja, leche, peine, escoba, teléfono, almohada, perro, gato, conejo, pato, pollito y zapato), para ponerlos dentro de una escena de ACT-04. Cada uno tiene su fila en `licencias.csv`, que dice de qué dibujo sale. Si se cambia el dibujo del banco, hay que repetir su recorte.

**Audio.** Cada consigna tiene una clave, y su archivo va en `assets/audio/<clave>.mp3`; por ejemplo, `cual-es-igual.mp3` o `donde-esta-el-perro.mp3`. `npm run check-items` lista las claves que faltan. Cada archivo necesita su fila en `licencias.csv`. Mientras falte, la aplicación usa la voz del navegador en español de México y lo registra como `audio_fuente` = `sintesis`.

**Sonidos de ACT-05.** Los 24 archivos `assets/audio/sonido-<concepto>-<1|2>.mp3` (el perro, el gato, la vaca, el pájaro, el tren, el avión, el helicóptero, el claxon del carro, la sirena del camión de bomberos, el cepillo de dientes, unas manos que aplauden y el agua que se sirve en un vaso) son grabaciones reales de [Freesound](https://freesound.org) reunidas en el conjunto ESC-50 (K. J. Piczak, 2015). Solo se usaron grabaciones con licencia CC0 o CC BY; cada una tiene su fila en `licencias.csv` con su autor, su licencia y su dirección en Freesound, como pide CC BY.

- Se procesaron igual: 2.1 s, mono, un volumen parejo (RMS de −24 dBFS, pico de −3 dBFS como máximo), 15 ms de entrada y 250 ms de salida, para que ningún sonido empiece o termine de golpe.
- Ninguno es un sonido de error ni de premio: son el estímulo.
- `silencio.mp3` es un archivo sin sonido. Lo usan los pasos de ACT-10 y ACT-16 después del primero, para que la instrucción no se repita en cada paso de la secuencia.
- Las consignas habladas de ACT-04, ACT-10, ACT-15 y ACT-16 todavía usan la voz del navegador.

**Pictogramas.** Se descargan una sola vez de ARASAAC con `npm run pictos`, a `assets/picto/<concepto>.png`. El identificador de cada uno está en `conceptos.json` (`arasaac`) y en `licencias.csv`. Para cambiar uno:

1. Cambia el identificador en `conceptos.json`.
2. Borra el `.png` y su fila en `licencias.csv`.
3. Vuelve a correr `npm run pictos`.

## Accesibilidad y seguridad sensorial

- **Tamaño de las opciones (RNF-04).** Cada opción tocable mide al menos 2 cm de lado (hasta 4 cm, según la pantalla) y hay al menos 1 cm entre opciones; las cajas de ACT-07 están separadas por 3 cm. En la búsqueda de ACT-08, con hasta 16 dibujos, la separación es de 0.5 cm. Si una banda no cabe en la pantalla con estas medidas, el inicio lo avisa antes de empezar (`src/ajuste-pantalla.js`). Los tamaños se expresan con la variable `--cm`:
  - En una tableta, el `cm` de CSS no mide un centímetro real; en un iPad de 10" mide unos 0.7 cm.
  - Por eso `--cm` se estima suponiendo una tableta de 10" (pantalla táctil) o un monitor de 96 ppp (computadora), y se ajusta en la página de Calibración.
  - En pruebas con pantallas de iPad de 10", tableta Android de 10" e iPad mini, las opciones midieron de 2.97 a 4 cm.
- **Sin destellos (RNF-05).**
  - No hay animaciones en bucle ni parpadeos.
  - Las únicas transiciones (el marco de retroalimentación y el botón de pausa) duran de 200 a 300 ms y se desactivan con `prefers-reduced-motion`.
  - Las opciones aparecen sin transición y con opacidad completa, para que el cuadro registrado como aparición sea el real. Sus imágenes se decodifican durante la consigna y se insertan ya decodificadas (`decodificacion_ok`).
  - El globo de la pausa guiada se mueve despacio y sin saltos: un ciclo dura 10 s o más y el tamaño cambia menos de 1 % por cuadro. Con `prefers-reduced-motion` solo alterna entre dos tamaños.
- **Pantalla del niño.** Fondo neutro, sin texto y sin elementos que distraigan. Las excepciones son el código del ítem en modo experto y el texto que es el estímulo: la palabra escrita de ACT-03, la oración escrita de ACT-04 en V y las sílabas, letras o palabras de ACT-16.
- **Retroalimentación.** Sin sonidos de error, sin la palabra «Incorrecto» y sin recompensas que dependan del desempeño: siempre se señala la opción correcta con el mismo marco.
  - En ACT-10 y ACT-16 la tarjeta correcta pasa a su lugar con ese marco, se haya tocado o no.
  - En ACT-12 la estrella es parte de la tarea, no un premio por acertar: solo se abre el cofre elegido, y la estrella sale según el programa del bloque, también a veces en el cofre que menos premia. La ficha pide vigilar la frustración.
  - En ACT-13 no hay marco: el globo o la nube desaparecen igual, se hayan tocado o no.
- **Contraste.** Los pictogramas y las figuras van sobre un fondo claro también en el tema oscuro. El azul y el amarillo de ACT-07 y de ACT-11 llevan contorno oscuro.
- **Lectores de pantalla.** Los estímulos de la pantalla del niño no se describen: las imágenes llevan `alt` vacío y los dibujos hechos con código, `aria-hidden`. Describirlos daría la respuesta.
- **Volumen.** Se ajusta en el inicio y en la pausa. Los sonidos de ACT-05 tienen el mismo volumen y empiezan y terminan suave (ver «Sonidos de ACT-05»).

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

- El encabezado lleva la marca y debajo las pestañas de las siete secciones, cada una con su ícono, sobre la franja azul claro. La pestaña actual se marca con una barra azul, además del color y el grosor. En el celular van cuatro por fila, con el ícono sobre el nombre.
- Los íconos son de [Phosphor Icons](https://phosphoricons.com) (estilo regular, licencia MIT). Se dibujan con máscaras de CSS (variables `--icono-*` en `src/styles.css`), así que toman el color del texto en los dos temas y los lectores de pantalla no los leen, porque siempre van junto a un texto.
- Cada pantalla tiene un título con una línea que dice para qué sirve. Al cambiar de pantalla, el foco pasa al título, y el enlace «Saltar al contenido» (visible con el teclado) lleva directo a él.
- En el inicio, el formulario tiene tres pasos numerados: **Actividad**, **Ajustes del bloque** (modalidad, volumen, banda y ensayos) y **Sesión** (código del niño y modo experto).
  - Las actividades se eligen en tarjetas, con un esquema de su pantalla y una línea que dice qué hace el niño. Las del piloto van primero; las de uso posterior y las de investigación, en dos grupos plegados.
  - La banda se elige en tarjetas que muestran su número de opciones y su descripción.
  - En pantallas anchas, como una tableta horizontal, la vista previa («Así lo verá el niño») va a un lado del formulario y lo acompaña al desplazarse.
  - La modalidad se elige con pastillas.
  - El volumen solo aparece en la modalidad AV.
  - El número de ensayos dice su rango permitido; si el valor no es válido, el aviso aparece junto al campo y el bloque no empieza.
  - La barra de «Empezar» queda fija abajo, con el resumen de lo elegido. Al final del formulario está la indicación para pausar (dos toques en la esquina).
  - Mientras se preparan las imágenes, el botón dice «Preparando…».
  - Debajo del formulario van el registro y el acceso a la pausa guiada.
- En el registro, cada descarga confirma el nombre del archivo, y «Borrar registro» va aparte, con su confirmación.
- En la galería, cada opción muestra su nombre y ejemplar en renglones separados. La correcta lleva el marco de la pantalla del niño y la etiqueta «Correcta». La etiqueta «Muestra» solo aparece cuando se ven todos los ítems.
- En el resumen, el nivel de apoyo se elige con pastillas.
- En «Sesiones», cada sesión es una tarjeta con su fecha, su código y sus pausas; el resumen de cada bloque se abre dentro de ella.
- Las secciones que se abren (ficha técnica, identificadores de ARASAAC) tienen una flecha que gira, sin animaciones de entrada.

**Logotipo.** Está en [`assets/marca/`](assets/marca/): isotipo y logotipo en versión positiva (`#7496BB`) e invertida (blanco, para el tema oscuro), `logo.png` y los íconos del navegador. El encabezado de las pantallas del adulto lleva el isotipo (40 px) junto al logotipo y la etiqueta «Prototipo E13». Los SVG se vectorizaron de las imágenes del manual; si el equipo de diseño tiene los archivos originales, reemplázalos con el mismo nombre. Según el manual, el logotipo no se deforma, no cambia de color, no lleva sombras ni efectos y no se pone sobre fondos que reduzcan su contraste.

## Página de producto

[`pagina-producto/`](pagina-producto/) es la página que presenta AutiPal, con la estructura de una página de producto de Apple y la marca AutiPal. Se abre con el mismo servidor que el prototipo: <http://localhost:8000/pagina-producto/>.

- **Qué tiene:** el héroe con la tableta, el carrusel de lo más destacado y las tres actividades con sus cifras. Siguen el diseño de las dos pantallas en tema claro y oscuro, las bandas, el recorrido de una sesión, el audio, el registro, el motor, la calibración y la familia Neuro-BlueMinds (con C&W). Después van las actividades en preparación (las once de uso posterior con prototipo, la pausa guiada y, aparte, las dos en investigación), lo que viene en investigación, las lecturas permitidas, la privacidad, las fichas, la comparación de las actividades, la accesibilidad, los valores y las notas.
- **Archivos:** `index.html` (todo el texto), `pagina.css` y `pagina.js`. Las capturas y figuras están en [`assets/pagina-producto/`](assets/pagina-producto/), con su fila en `items/licencias.csv`. El logotipo y el pictograma salen de `assets/marca/` y `assets/picto/`.
- **Sin JavaScript** la página se lee completa. El script solo agrega los selectores, el carrusel, el recorrido paso a paso y las apariciones al desplazarse. Nada se mueve solo si el sistema pide reducir el movimiento.
- **Datos que no se escriben a mano:** cada número que viene de una ficha lleva `data-ficha="ACT-02.ensayosPorBloque"` (o `data-ficha-s` para milisegundos mostrados en segundos, y `data-ficha-pct` para proporciones). `npm test` revisa que coincidan con `fichas/` y que el muro de columnas sea el de `src/engine/logger.js`. Si cambia una ficha, la prueba dice qué dato de la página actualizar. Igual con el Catálogo (`data-catalogo`, `data-posterior`, `data-investigacion` y `data-nombre`) y con el número de pruebas (`data-pruebas`).
- **Lo que todavía no existe va marcado:** las funciones del diseño de Neuro-BlueMinds que no están en el prototipo dicen «En diseño», y C&W aparece como reloj en desarrollo. Las actividades de uso posterior dicen «Uso posterior» y que solo se abren en modo experto. Las notas al pie lo aclaran.
- **Capturas e imágenes:** las capturas son del prototipo, con datos de demostración. Las de la pantalla del niño en «Cambia la regla» son del 6 de noviembre de 2026; las del terapeuta y las de las actividades en preparación, del 11 y el 12 de noviembre. La sección de bandas muestra el ítem del tren de cada banda con los dibujos del banco, y `npm test` revisa que coincida con `items/items.json`. Si cambian las imágenes del banco o las pantallas del terapeuta, hay que repetir las capturas donde aparecen.

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
- **Audio:** grabar los audios de las consignas (ver `npm run check-items`), incluidas las oraciones de ACT-04, las instrucciones de ACT-10, las palabras de ACT-15 y ACT-16; y que los clínicos escuchen los 24 sonidos de ACT-05.
- **Revisión clínica:**
  - aplicar la revisión de la muestra con `tools/aplicar-revision.mjs` (anota las fichas);
  - revisar los 200 ítems fuera de la muestra (Arquitectura 13.4);
  - los distractores de B4;
  - el color típico de ACT-01 B1;
  - los conceptos `short` y `camión`.
- **Pictogramas por confirmar:** `tortilla` (ARASAAC la etiqueta «torta de maíz») y `camión` (por ahora, autobús urbano).
- **Actividades de uso posterior y de investigación:**
  - la revisión clínica de sus fichas y de sus 817 ítems; lo que cada ficha propone está en su `notaPrototipo`;
  - su propia validez de contenido, antes de usarlas con niños;
  - que un clínico confirme los rostros y los pictogramas de emoción de ACT-14, los colores de las frases de ACT-03 B3, qué ejemplares son poco típicos en ACT-06, las escenas de ACT-04, las historias de ACT-10, la división en sílabas de ACT-16 y las palabras de ACT-15;
  - la voz grabada por una persona hablante nativa para ACT-15: la voz del navegador puede no distinguir bien los sonidos que cambian («gato» y «pato»);
  - las bandas que faltan: ACT-03 B4 (una oración; puede usar las escenas de ACT-04) y ACT-14 B4 (la emoción a partir de una situación; necesita escenas de situaciones); ACT-08 tiene pendiente la variante «el distinto»;
  - ACT-12 y ACT-13: definir sus indicadores en el Modelo matemático antes de usarlas, como pide el Catálogo.
- **Estructura fija de la sesión** (Catálogo, sección 7.1): la rutina de inicio con pictogramas y las transiciones de 5 s entre actividades no están implementadas; hoy el adulto inicia cada bloque.
- **Versión de la aplicación:** `version_app` sigue en `0.1.0` en el registro. Vive en el motor (`src/engine/logger.js`), que no se tocó; conviene subirla al integrar estos cambios.
- **Fase 2 de ACT-02:** los 15 ensayos en V y 15 en AV de un mismo bloque, por mitad, todavía no están implementados como modalidad mixta.
- **Pruebas en tabletas reales:** Safari en iPad y Chrome en Android. Hasta ahora se probó en Chromium de escritorio con tamaños de tableta.
- **Latencia de cada tableta:** `latencia_dispositivo_ms` (y con ella `tr_corregido_ms`) quedan vacías hasta medirla. La referencia motora no se probó en tabletas reales.
- **Referencia motora:** la permanencia del objetivo (5 s) y la exclusión de los toques anticipatorios son valores de planeación por confirmar con los clínicos y con la Dra. González Ureña.
- **Frecuencia de pantalla:** con el ahorro de energía activo (por ejemplo, con poca batería), Chrome y Edge dibujan a 30 Hz en lugar de 60 Hz. Entonces `t_opciones − t_opciones_insercion` mide unos 33 a 66 ms (1 o 2 cuadros de 33 ms). La aplicación lo avisa antes de cada bloque; para las sesiones, conecta el dispositivo a la corriente o desactiva el ahorro de energía.
- **Uso sin conexión:** no está implementado (era opcional en este hito).

## Autoría y licencia

| Persona | Rol en el proyecto | Qué hizo en este prototipo |
|---|---|---|
| Luis Nazariego Santome | Líder de proyecto; calidad y verificación | Catálogo de actividades y fichas técnicas, motor de medición y registro, banco de ítems, revisión clínica y formulario F3 |
| José Miguel Fausto Tapia | Líder de proyecto; diseño de experiencia y accesibilidad | Interfaz del terapeuta y del niño, marca AutiPal en la aplicación, dibujos del banco de imágenes, página de producto y prototipos de las actividades de uso posterior |

Los mismos créditos aparecen en la aplicación, en `#creditos`.

© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.

AutiPal, su isotipo y su logotipo son propiedad de Neuro-BlueMinds. Las tipografías Noto Sans y Noto Serif conservan su licencia SIL Open Font License 1.1 ([`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)). Roca Two (Elena Genova, My Creative Land) y More Sugar (Slidehack) no se incluyen en el repositorio; ver «Tipografías» en [Marca e interfaz](#marca-e-interfaz). Los íconos son de Phosphor Icons (© 2023 Phosphor Icons, licencia MIT); el aviso de la licencia está junto a ellos en `src/styles.css`.

### Pictogramas de ARASAAC

Los pictogramas de `assets/picto/` no están bajo los derechos anteriores. Se distribuyen bajo la licencia Creative Commons BY-NC-SA, que autoriza su uso sin fines de lucro citando la fuente y el autor, y obliga a compartir las obras derivadas con la misma licencia. Atribución, según las condiciones de uso de ARASAAC:

> Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido creados por Sergio Palao para ARASAAC (http://www.arasaac.org), que los distribuye bajo Licencia Creative Commons BY-NC-SA.

> Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España)
