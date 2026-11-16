# AutiPal · Prototipo E13

> **Actividades fuera del piloto ocultas por defecto.** El repositorio tiene las 14 actividades del Catálogo que no son del piloto (sección 6), como prototipos para que el equipo revise su mecánica. Con el **modo experto** apagado, que es el valor por defecto (también en GitHub Pages), la aplicación muestra solo ACT-01, ACT-02 y ACT-07.

[![Verificación](https://github.com/nazariegosantomeluis-droid/Neuro-BlueMinds-prototipo-1/actions/workflows/verificacion.yml/badge.svg)](https://github.com/nazariegosantomeluis-droid/Neuro-BlueMinds-prototipo-1/actions/workflows/verificacion.yml)

**AutiPal** es la aplicación de Neuro-BlueMinds: una herramienta de apoyo y medición para el terapeuta que trabaja con niñas y niños autistas de 4 a 10 años. Registra con precisión lo que el niño hace en actividades breves de selección en una pantalla táctil.

> **Prototipo para revisión de expertos. No es una herramienta diagnóstica.**
> No es una intervención ni un instrumento de diagnóstico. No calcula puntajes, niveles ni perfiles del niño.

Este prototipo sirve para que un panel de 6 a 9 expertos (terapia de lenguaje, terapia ocupacional, psicología y terapia conductual) juzgue si las actividades son relevantes y claras (validez de contenido). La aplicación del estudio será esta misma web, instalable (PWA) en tabletas Android; la decisión es provisional hasta medir la latencia de cada tableta (hoja de ruta, H8.2). Las fichas de las actividades y el formato del registro son archivos de datos independientes del código.

## Actividades

| Código | Nombre | Ensayos por bloque | Bandas |
|---|---|---|---|
| ACT-01 | Igual a la muestra (familiarización) | 10 | B1 a B3 |
| ACT-02 | Pictograma e imagen | 30 | B1 a B4 |
| ACT-07 | Cambia la regla | 30 | B1 a B4 |

Son las tres del estudio piloto (Catálogo de actividades, sección 5) y las únicas que se usan en una sesión con un niño.

**Uso posterior, con prototipo.** El Catálogo las habilita después del piloto y de su propia validez de contenido. Aquí ya se pueden revisar, pero **solo se abren en modo experto**: sus sesiones llevan `EXP-`, y sus ítems no entran en la revisión clínica ni en el formulario F3.

| Código | Nombre | Qué hace el niño | Modalidad | Bandas |
|---|---|---|---|---|
| ACT-03 | Palabra escrita e imagen | Lee una palabra o una frase de dos palabras y toca su dibujo | V y AV | B1 a B3 |
| ACT-04 | Oración e imagen | Lee o escucha una oración y toca la escena que la muestra; en B5 dice con una palomita o un tache si la oración dice lo que muestra la escena | V y AV | B1 a B5 |
| ACT-05 | Sonido e imagen | Escucha un sonido que no es habla (un maullido, un tren) y toca lo que lo produce | Solo AV | B1 a B3 |
| ACT-06 | Clasifica por categoría | Pone cada dibujo en la caja de su categoría (2 o 3 cajas) | V y AV | B1 a B3 |
| ACT-08 | Busca el objetivo | Encuentra un dibujo entre 4, 8, 12 o 16 | V y AV | B1 a B4 |
| ACT-09 | Recuerda y encuentra | Ve un dibujo 2 s y lo encuentra después de una pausa de 0, 2, 5 o 10 s | Solo V | B1 a B4 |
| ACT-10 | Ordena la secuencia | Toca en orden los momentos de una historia (V) o los dibujos que nombra una instrucción de varios pasos (AV); de 2 a 5 tarjetas | V y AV | B1 a B4 |
| ACT-11 | Completa el patrón | Elige la figura que sigue en una serie: AB, AAB, ABC o dos reglas a la vez | V y AV | B1 a B4 |
| ACT-14 | Reconoce la emoción | Elige el pictograma de la emoción de un rostro dibujado con rasgos realistas; los pictogramas son esquemas de trazos | V y AV | B1 a B3 (falta B4) |
| ACT-15 | Sonidos de las palabras | Escucha una palabra y toca la que rima o la que empieza igual; en B4 dice si dos palabras suenan igual | Solo AV | B1 a B4 |
| ACT-16 | Forma la palabra | Forma el nombre de un dibujo tocando sus sílabas o sus letras en orden, o una frase con sus palabras; una pieza sobra | V y AV | B1 a B4 |
| ACT-17 | Pausa guiada | Mira un globo que se infla y se desinfla despacio. No mide nada. Solo en una sesión en modo experto | — | Sin bandas |

**En investigación, con prototipo.** El Catálogo deja dos actividades en investigación: antes de usarlas hay que definir sus indicadores en el Modelo matemático. Su prototipo sirve para que el equipo revise la mecánica. Se abren solo en modo experto, van aparte en el inicio, en un grupo plegado, y no entran en el piloto, en la revisión clínica ni en el formulario F3.

| Código | Nombre | Qué hace el niño | Modalidad | Bandas |
|---|---|---|---|---|
| ACT-12 | Elige y descubre | Elige entre dos cofres; uno tiene la estrella más veces que el otro (9, 8 o 7 de cada 10). En B3 y B4, en las 80 elecciones de dos bloques esa ventaja pasa al otro cofre una vez, en la elección 41 | Solo V | B1 a B4 |
| ACT-13 | Espera la señal | Toca el pez cuando aparece y deja sin tocar la nube. Las bandas cambian la proporción de nubes (de 5 a 2 de cada 10) y el ritmo | Solo V | B1 a B4 |

Todo el contenido clínico de las 14 actividades (oraciones, palabras, rimas, historias, emociones, ejemplares poco típicos, objetivos y contraindicaciones propias) es una **propuesta**: cada ficha lo dice en `notaPrototipo` y lista en `pendientesClinicos` las decisiones que faltan. Todas tienen `revisionClinica` vacío, se abren solo en modo experto y no entran en la revisión clínica ni en el formulario F3.

Ensayos por bloque (Arquitectura 4.4: de 20 a 40, 30 por defecto). Donde la mecánica no lo permite, la ficha lo explica en `ensayosExcepcion`:

| Actividades | Ensayos por bloque | Por qué |
|---|---|---|
| ACT-03, 04, 05, 06, 08, 09, 11, 13 y 15 | 30 | El valor por defecto. |
| ACT-12 | 40 | Dos bloques de 40 de la misma banda se juntan en la sesión para llegar a las 80 elecciones que pide el Catálogo (`juntarBloques`). |
| ACT-14 | 40 | 10 presentaciones por emoción en B2 y B3, el mínimo del Catálogo para la matriz de confusión. |
| ACT-10 y ACT-16 | 10 secuencias | Un ensayo es una secuencia completa (Arquitectura 4.5); 20 secuencias serían hasta 80 toques y repetirían secuencias. A1 necesita 20: dos bloques. |
| ACT-17 | Sin ensayos | Es una pausa sin respuesta evaluable. |

Cada actividad se describe en una ficha técnica en [`fichas/`](fichas/). El motor ejecuta la ficha: la secuencia del ensayo y el registro son iguales para todas las actividades; cada actividad solo aporta cómo se dibuja su pantalla.

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
   - Solo aparecen las tres actividades del piloto, cada una en una tarjeta con un esquema de su pantalla y una línea que dice qué hace el niño.
   - «Así lo verá el niño» dibuja en chico un ítem de ejemplo de la banda elegida.
   - Si las opciones de la banda no caben en la pantalla a 2 cm, se avisa antes de empezar. El adulto puede volver o continuar de todos modos.
   - Mientras la ficha de la actividad no tenga revisión clínica registrada, el inicio avisa que solo sirve para demostración y pruebas.
   - Con niños inscritos hay que elegir a uno de forma deliberada; no hay ninguno preseleccionado.
   - Con un niño, antes del primer bloque aparece «¿Es este niño?» con su ícono y su color; hay que confirmar.
   - El consentimiento se comprueba al empezar cada bloque: si no está vigente, no se inicia.
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
5. **Resumen (para el adulto).** Es descriptivo: aciertos, omisiones y mediana del tiempo de respuesta, sin puntajes. Ahí el adulto elige el nivel de apoyo que dio en el bloque (ninguno, verbal, gestual o físico). Desde ahí se inicia otro bloque de la misma sesión o se termina la sesión.

En iPad, el sonido se activa con el toque en «Empezar»; antes de eso, Safari no permite reproducir audio.

**Sesión con un niño (H2.3).** Con un niño inscrito, el inicio no pide actividad, banda ni modalidad: muestra la **sesión completa** que corresponde a su modo de fase y el botón «Empezar la sesión». La estructura está en [`fichas/sesion.json`](fichas/sesion.json) y la lógica, en `src/fases.js`.
- **Modo de fase.** Cada niño tiene uno: familiarización, fase 1, fase 2, fase 3 o cierre (Arquitectura 14). Lo fija el investigador responsable en «Niños inscritos», junto con la banda fija de ACT-02 y ACT-07. En el estudio vendrán del servidor (decisión D6 pendiente). Un niño nuevo empieza en la familiarización.
- **Plan.** Rutina de inicio, referencia motora, ACT-02 y después ACT-07 (en la familiarización, antes ACT-01 con 10 ensayos), y rutina de cierre. En la familiarización la banda es la mínima; en las fases 1, 2 y 3 y en el cierre, la fija del niño (o la mínima si no tiene). Fuera de la fase 2 la modalidad es AV, la presentación multimodal (pendiente de confirmar en `fichas/sesion.json`).
- **Fase 2, versión del Protocolo 3.3 (la que se usa).** ACT-02 se hace en dos bloques de 15 ensayos, uno en V y otro en AV, en la misma banda. La modalidad que abre se sortea en cada sesión, sin que una abra más de 2 sesiones seguidas. En las sesiones 1 a 6 los conceptos de la mitad A van en V y los de la B en AV; en las 7 a 12 se invierte. Los bloques de 15 son una excepción documentada al mínimo de 20 ensayos por bloque (Arquitectura 4.1).
- **Fase 2, versión del Catálogo 5.2 (alternativa).** Un bloque de 30 ensayos en el que cada mitad de conceptos va en su modalidad, en orden al azar. Se elige en la ficha de ACT-02 (`fase2.version`). Cada sesión registra qué versión usó (`fase2_version`).
- Todos los bloques se preparan antes de empezar: si falta una imagen o la voz, la sesión no empieza.

**Modo experto de la aplicación.** Es el interruptor «Modo experto» del encabezado de las pantallas del adulto (`src/modo-experto.js`). Empieza apagado y se guarda en este dispositivo (`localStorage`, clave `nbm.modoExperto`).
- **Apagado:** el inicio, la galería, las sesiones y el formulario F3 muestran solo ACT-01, ACT-02 y ACT-07, sin los grupos «En preparación» ni «En investigación» y sin la pausa guiada; tampoco hay sesiones en modo experto. «Sesiones» oculta los bloques de las demás actividades y dice cuántos ensayos no muestra; la descarga de cada sesión y la del registro siguen completas.
- **Encendido:** se ven todas las actividades, y en el inicio aparece la casilla de la sesión en modo experto.

**Sesión en modo experto.** Con el modo experto de la aplicación encendido, se elige en el inicio, antes de empezar la sesión, y solo con la demostración (sin niño). Permite elegir cualquier actividad, banda y modalidad. No hace la referencia motora.
- Durante el ensayo muestra el código del ítem en la esquina inferior izquierda.
- El botón «Siguiente» pasa al ítem siguiente sin esperar los tiempos; el ensayo en curso queda como interrumpido.
- Sus registros llevan un `sesion_id` que empieza con `EXP-`.

**Galería de ítems** (`#galeria`). Muestra todos los ítems por actividad y banda: el código, la consigna, las opciones con la correcta marcada y el estado de revisión. También incluye la ficha técnica de la actividad.
- Por defecto muestra solo la muestra para expertos; una casilla muestra todos.
- Los filtros quedan en el enlace, así que una vista se puede compartir. Por ejemplo, `#galeria?actividad=ACT-02&banda=B4&todos=1` o `#galeria?actividad=ACT-07&banda=B2&pareja=1`.
- Si [`config/enlaces.json`](config/enlaces.json) tiene el campo `formularioF3`, la galería muestra el botón «Calificar en el formulario F3», que abre ese enlace en otra pestaña. Sin el archivo (o sin el campo), no se muestra nada.

**Sesiones** (`#sesiones`). Cada sesión guardada en el dispositivo es una tarjeta con su fecha, su participante (por su ícono y su código abreviado, nunca por un dato personal), la referencia motora, sus pausas y el resumen de cada bloque, con las mismas líneas descriptivas del fin de bloque.

**Revisión clínica** (`#revision`). Dos clínicos califican los ítems de muestra antes del panel de expertos. Ver [Revisión clínica](#revisión-clínica).

**Niños inscritos** (`#ninos`). Es el padrón local del prototipo; en el estudio lo entrega el servidor (hoja de ruta, H7.4) y el terapeuta no cambia el consentimiento. La pantalla lo dice en una línea: la tableta no guarda quién es cada niño.
- Para inscribir solo se pide la edad en meses (de 48 a 131, es decir, de 4 a 10 años) y si la familia autorizó el video. El código, el ícono y el color los asigna la aplicación. No hay ningún campo de texto.
- El código tiene 128 bits (32 caracteres hexadecimales) y se muestra abreviado (por ejemplo, `7F3A-91C2`). El código completo está en cada fila, para que el investigador lo anote fuera de la aplicación; el registro guarda siempre el completo.
- El ícono es una forma (círculo, cuadrado, triángulo, estrella, rombo, corazón, luna o hexágono) con un color de una paleta apta para daltonismo. Mientras haya formas sin usar no se repite ninguna, así que la forma identifica al niño aunque no se distinga el color.
- El consentimiento es `vigente`, `suspendido` o `retirado`. Un niño nuevo queda vigente. Suspendido puede volver a vigente; retirado no se revierte en la tableta. Solo con consentimiento vigente se puede iniciar una sesión.
- El modo de fase y la banda fija de ACT-02 y ACT-07 se eligen en cada fila; los fija el investigador responsable (Arquitectura 14). Ver «Sesión con un niño».
- El padrón se guarda en el navegador del dispositivo y no se borra con «Borrar registro».
- Las sesiones empiezan con `S-` (niño inscrito), `DEMO-` (demostración) o `EXP-` (modo experto).
- No incluye todavía lo que decide la familia al retirar el consentimiento (conservar o eliminar los datos): necesita el servidor.

**Calibración** (`#calibracion`). Se hace una vez en cada dispositivo, antes de la primera sesión: se pone una regla física sobre la regla de 5 cm de la pantalla y se ajusta hasta que coincidan. Ver [Accesibilidad y seguridad sensorial](#accesibilidad-y-seguridad-sensorial).

**Créditos y licencias** (`#creditos`). Contiene el equipo, la marca y sus tipografías, la atribución de ARASAAC y la licencia de cada parte del prototipo.

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

Antes de publicar, corre también `npm run check-items`.

**Verificación automática.** En cada envío a cualquier rama y en cada pull request, GitHub Actions ([`.github/workflows/verificacion.yml`](.github/workflows/verificacion.yml)) corre, en Node 20 y 22:

1. `npm test`;
2. `npm run check-items`;
3. `node tools/build-items.mjs` y `node tools/build-posteriores.mjs`, y falla si cambia algún archivo de `items/` o `assets/`: así detecta un banco desactualizado o editado a mano, el del piloto o el de las actividades posteriores.

El resultado aparece en la pestaña Actions y en cada pull request. Para que GitHub no permita unir a `main` un cambio con la verificación fallida, el dueño del repositorio activa una regla en Settings → Rules → Rulesets (rama `main`, «Require status checks to pass», con las dos verificaciones de Node).

## Arquitectura

El motor ejecuta la ficha. La secuencia del ensayo y el registro no tienen código propio por actividad; cada actividad solo aporta cómo se dibuja su pantalla.

```
index.html                    Página única
src/app.js                    Sesión, pausa, fin de bloque y resumen; rutas
src/catalogo.js               Actividades del piloto y pantalla de cada una
src/inicio.js                 Inicio en tres pasos
src/previa.js                 «Así lo verá el niño»: ítem de ejemplo en chico
src/ajuste-pantalla.js        Aviso cuando las opciones no caben a 2 cm
src/sesiones.js               Página #sesiones
src/resumen.js                Líneas del resumen de un bloque
src/html.js                   Utilidades para armar HTML (escape, miniaturas)
src/paginas.js                Encabezado, galería, calibración y créditos
src/revision.js               Revisión clínica de ítems (pantalla)
src/revision-datos.js         Revisión clínica: ítems, faltantes y CSV
src/revision-estado.js        Estado de revisión clínica para el inicio y la galería
src/revision.css              Estilos de la revisión clínica
src/ninos.js                  Padrón de niños: código, ícono, color, edad, consentimiento, modo de fase y banda fija
src/fases.js                  Modos de fase, plan de la sesión con un niño, fase 2 y límite de 15 minutos
src/plan-pantalla.js          La sesión completa que el inicio muestra para un niño
src/ninos-pantalla.js         Pantalla #ninos y confirmación «¿Es este niño?»
src/ninos.css                 Estilos del padrón
src/referencia.css            Estilos del objetivo de la referencia motora
src/frecuencia.js             Aviso de frecuencia de pantalla baja antes de cada bloque
src/enlaces.js                Botón del formulario F3 en la galería
src/styles.css                Estilos: marca AutiPal en el adulto, pantalla del niño neutra, temas claro y oscuro, unidad --cm
src/engine/trial.js           Máquina de estados del ensayo y ejecución del bloque
src/engine/clock.js           Medición del tiempo: performance.now, cuadros, foco
src/engine/audio.js           Audio de las consignas: Web Audio y voz del navegador
src/voz-grabada.js            Aviso y resumen de las actividades que requieren la voz grabada (ACT-15)
src/pausa-permiso.js          Cuándo se puede abrir la pausa guiada (ACT-17)
src/modo-experto.js           Modo experto de la aplicación: qué actividades se muestran
src/engine/logger.js          Registro por ensayo; almacenamiento local; CSV y JSON
src/engine/selector.js        Selección de ítems por banda, con semilla
src/engine/quality.js         Reglas de calidad y resumen descriptivo
src/engine/referencia.js      Referencia motora: plan, ejecución y resumen
src/engine/ficha.js           Carga y validación de fichas
src/activities/seleccion.js   Pantalla de consigna y opciones (ACT-01 y ACT-02)
src/activities/cambia-regla.js  Pantalla de tarjeta y cajas, y figuras SVG (ACT-07)
src/activities/referencia.js  Pantalla del objetivo de la referencia motora
src/activities/demora.js      Pantalla de ACT-09: muestra, pausa en blanco y opciones
fichas/                       Ficha técnica de cada actividad (JSON) y estructura de la sesión (sesion.json)
config/enlaces.json           Enlaces externos opcionales (formulario F3)
items/                        Conceptos, banco de ítems generado y licencias de cada archivo
tools/build-items.mjs         Genera items/items.json y los marcadores provisionales
tools/check-items.mjs         Verifica archivos y licencias del banco
tools/descargar-pictos.mjs    Descarga los pictogramas de ARASAAC
tools/ejemplo-registro.mjs    Genera docs/ejemplo-registro.csv
tools/simular-piloto.mjs      Simula bloques del piloto; test/fixtures guarda lo que registraba el motor antes de la tanda 2
tools/build-posteriores.mjs   Genera items/items-posteriores.json (actividades de uso posterior)
tools/medir-escenas.mjs       Mide a tamaño real si las escenas de ACT-04 se distinguen
tools/sonidos.mjs             Mide y corrige la sonoridad y el inicio de los sonidos de ACT-05
tools/unir-revisiones.mjs     Une las revisiones clínicas en revision-consolidada.csv
tools/aplicar-revision.mjs    Aplica la revisión consolidada al banco y a las fichas
assets/                       Imágenes, pictogramas, audios, marca (assets/marca) y tipografías (assets/fonts)
docs/                         Registro de ejemplo y medidas de escenas (ACT-04) y sonidos (ACT-05)
test/                         Pruebas (node --test)
.github/workflows/            Verificación automática en GitHub Actions
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
| `revisionClinica` | `{ "revisor": "", "fecha": "" }`. Vacío hasta la revisión clínica; lo llena `tools/aplicar-revision.mjs`. |

Campos opcionales que usa el motor:

- `fases`: fases y número de ensayos, según el Catálogo de actividades.
- `pantalla`: tipo de pantalla que dibuja la actividad.
- `resumen`: frase descriptiva del fin de bloque.
- `itemsPorBanda`.
- `repetirItems`: si es `false`, ningún ítem se repite en la sesión.
- `barajarOpciones`: si es `false`, las opciones conservan su posición.
- `disposicion`, en cada banda: filas x columnas de las opciones, por ejemplo `"1x4"` o `"2x2"`.

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
| `item` | Código del ítem, por ejemplo `ACT01-B2-05`. En ACT-07 incluye la secuencia y el ensayo: `ACT07-B2-04-07`. |
| `banda`, `modalidad` | Banda y modalidad (`V` o `AV`). |
| `modo_fase` | En la sesión con un niño, su modo de fase: `familiarizacion`, `fase1`, `fase2`, `fase3` o `cierre` (Arquitectura 14). En los bloques sueltos de la demostración y del modo experto, `prototipo`. |
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
| `fallo_tecnico` | `true` si el audio de la consigna AV no arrancó o falló. En las actividades que requieren la voz grabada (ACT-15), también si la consigna sonó con la voz del navegador (`audio_fuente = sintesis`): ese ensayo nunca queda como válido. |
| `tr_bruto_ms` | `t_toque − t_opciones`. |
| `latencia_dispositivo_ms` | Latencia táctil y de pantalla de la tableta. Vacía hasta medir cada tableta. |
| `tr_corregido_ms` | `tr_bruto_ms − latencia_dispositivo_ms`. Vacío si no hay latencia. |
| `anticipatoria` | `true` si `tr_bruto_ms` < 150 ms. |
| `fuera_de_tarea` | `true` si ln(RT) está a más de 3 MAD de la mediana, según el Modelo matemático (3.2 y 3.3). Detalles abajo. |
| `fuera_de_tarea_provisional` | `false` si `fuera_de_tarea` se calculó al cerrar la sesión; `true` si la sesión seguía abierta al exportar. |
| `peso_calidad` | Foco (0 o 1) × proporción de cuadros a tiempo × plausibilidad (0 si es anticipatoria) × técnico (0 si hubo fallo técnico). |
| `t_muestra_fin` | Solo ACT-09: cuadro en que la muestra ya no se ve. La quita el motor, no la pantalla: en cada cuadro (`requestAnimationFrame`) mira si el siguiente llega a `t_consigna_inicio` + 2 s, con medio cuadro de margen; en ese cuadro la quita y guarda el timestamp del cuadro siguiente, como `t_opciones`. La pausa en blanco real es `t_opciones − t_muestra_fin`. Vacía en las demás actividades y si se pausó mientras se veía la muestra. Va al final para que las columnas anteriores no cambien de lugar. |
| `mitad_fase2` | Solo en la fase 2, en ACT-02: la mitad de conceptos del ítem (`A` o `B`). En las sesiones 1 a 6 la mitad A va en V y la B en AV; en las 7 a 12, al revés. Vacía en lo demás. |

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
| `pausas` | Lista JSON de `{bloque, ensayo, duracion_ms}`: en qué ensayo se pausó y cuánto duró la pausa. `bloque` 0 es la referencia motora, y entonces `ensayo` es el número de aparición del objetivo. |
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
| `modo_fase` | Modo de fase de la sesión con un niño (el de su padrón). Vacío en los bloques sueltos de la demostración y del modo experto. |
| `fase2_version` | Solo en la fase 2: `protocolo` (dos bloques de 15, uno por modalidad) o `catalogo` (un bloque de 30 con V y AV mezclados), según la ficha de ACT-02. |
| `fase2_sesion` | Solo en la fase 2: número de la sesión de fase 2 del niño (1 a 12), contado con las sesiones anteriores de este dispositivo. |
| `fase2_bloque` | Solo en la fase 2: bloque del análisis, 1 (sesiones 1 a 6) o 2 (7 a 12). |
| `fase2_primera` | Solo en la fase 2: modalidad que abrió la sesión, sorteada sin que una abra más de 2 sesiones seguidas. |
| `plan_sesion` | Lista JSON de los bloques planeados, en orden: `actividad`, `banda`, `modalidad` (`V`, `AV` o `mixta`), `ensayos` y, en la fase 2, `mitad` o `mitades`. |

## Banco de ítems

- [`items/conceptos.json`](items/conceptos.json) tiene los 60 conceptos de ACT-02, cada uno con:
  - artículo y categoría;
  - mitad (`A` o `B`, para la fase 2);
  - color típico (provisional, hasta tener las fotografías);
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

### Banco de las actividades de uso posterior

[`items/items-posteriores.json`](items/items-posteriores.json) va aparte del banco del piloto, que no cambia. Se genera con `npm run build-posteriores` a partir de `conceptos.json` y de las fichas nuevas, con semillas fijas: 829 ítems, todos con `revisionPendiente`. En ACT-10 y ACT-16 un ítem es una secuencia completa, con sus pasos; en ACT-12 y ACT-13, el programa o la serie de un bloque, con sus ensayos.

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
| ACT-12 | 36 | 6 programas de 40 ensayos por banda; en B3 y B4, 6 para el primer bloque y 6 para el segundo. Antes y después del cambio de ventaja el cofre favorable tiene la estrella en la proporción exacta de la banda, nunca más de 2 ensayos seguidos en el otro, y el cofre que empieza premiando alterna entre programas |
| ACT-13 | 24 | 6 series de 30 presentaciones por banda, con la proporción de nubes de la banda. Nunca empiezan con una nube ni ponen más de 2 seguidas |
| ACT-15 | 75 | Rimas (B1 y B2; en B2 un distractor empieza igual que la palabra, pero no rima), inicios con la misma sílaba (B3) y pares que cambian en un solo sonido, dichos iguales o distintos (B4) |
| ACT-16 | 50 | Palabras de 2 y 3 sílabas (B1 y B2), de 3 o 4 letras (B3) y las frases de objeto y color de ACT-03 (B4). Una pieza sobra (en B3, una o dos), y nunca repite una pieza de la palabra |

- Ningún ítem usa el ejemplar 3, reservado para las sondas de generalización de ACT-02, ni junta en una pantalla conceptos que se excluyen.
- ACT-03, 05, 06, 08, 09, 10 (en AV), 15 y 16 usan los dibujos y pictogramas del banco. Las figuras de ACT-11, los rostros y pictogramas de emoción de ACT-14, las escenas de ACT-04, las historias de ACT-10, los cofres de ACT-12, el pez y la nube de ACT-13 (no el globo de la pausa guiada), y las figuras de «igual» y «diferente» de ACT-15 se dibujan con código.
- Las escenas de ACT-04 son personas dibujadas con código, con objetos y animales recortados de los dibujos del banco (`assets/escenas/`). Cada ítem fija el tono de piel, el pelo y la ropa de la persona, así que en sus opciones solo cambia lo que dice la oración.
- **Tamaño de las escenas de ACT-04.** Miden al menos 4.5 cm (`opcionMinCm` de la ficha) y crecen hasta 8 cm si la pantalla lo permite. Si no caben a 4.5 cm (por ejemplo, las 4 escenas de B2 en una tableta en vertical), el inicio lo avisa antes de empezar.
- **Medición de las escenas.** `node tools/medir-escenas.mjs` (necesita Playwright con Chromium; no corre en la verificación de GitHub) dibuja, con la densidad de una tableta de 10 pulgadas (59 px CSS por cm), cada par de escenas que puede ir junto en un ítem: dos acciones, dos objetos de la misma acción, el niño y la niña, y dos relaciones de lugar. Mide la mayor zona en que cambian y la compara con un umbral propuesto (4 mm de lado menor y 25 mm²). Escribe [`docs/medicion-escenas.json`](docs/medicion-escenas.json) y [`docs/escenas-tamano-real.png`](docs/escenas-tamano-real.png). Es un filtro para la revisión, no un criterio clínico: «come» y «bebe», y todas las demás acciones, lo pasan a 4.5 cm.
- **Escenas que siguen siendo ambiguas** (revisión a ojo a 4.5 cm, lista `accionesAmbiguas` de la ficha): «se peina» frente a «habla por teléfono»; «dentro» frente a «arriba» de la caja con el pato, el pollito y el zapato; «abraza al conejo» frente a «abraza al pato»; y «arriba» frente a «abajo» de la mesa con el conejo y el pato, que a ojo se distinguen pero no pasan el filtro por debajo de 6 cm. Quedan para la revisión clínica.
- En la secuencia, las tarjetas se revuelven de modo que con 3 o más nunca quedan ya en orden.
- **ACT-10 y ACT-16: la secuencia completa es el ensayo** (Catálogo 6.2: A1 por secuencia completa, o por palabra).
  - El resumen del bloque empieza por las secuencias hechas completas y en orden. Las cortadas por una pausa o un salto no entran en la cuenta y se informan aparte. Los pasos van después, como detalle.
  - Los tiempos entre toques no son tiempos de respuesta comparables (Arquitectura 4.5): el resumen no da su mediana y sus filas quedan con `fuera_de_tarea` vacío.
  - El registro sigue guardando una fila por paso, con su código (`ACT10-B2-03-1`).
  - Un paso solo es ensayo si quedan al menos 2 tarjetas posibles. En ACT-10 no sobra ninguna: la última pasa sola a su lugar y no tiene fila. En ACT-16 siempre sobra una pieza, así que la última también se elige y es un ensayo.
  - Un bloque propone 10 secuencias; A1 necesita 20 (Modelo matemático 4.1), que se juntan con dos bloques.
- **ACT-14: rostro realista frente a pictograma esquemático.** El Catálogo dice «elige el pictograma de la emoción», así que las opciones son pictogramas con rostro. Para que no se resuelvan copiando la forma de la boca, el estímulo y las opciones tienen estilos claramente distintos: el rostro tiene rasgos realistas (piel con sombra, nariz, labios de color, dientes y lengua) y el pictograma es un esquema de trazos negros sobre un círculo, sin color ni relleno en la boca (`estiloPictograma: "esquema"`). Las figuras de cuerpo entero quedan como alternativa (`"postura"`) en `estilosPictograma`; el estilo final es una decisión clínica pendiente. Falta la banda B4, la emoción a partir de una situación, que necesita escenas de situaciones.
- **ACT-17, la pausa guiada, solo se abre en una sesión en modo experto**, y nunca durante una sesión del piloto ni en un bloque de una actividad del piloto (`src/pausa-permiso.js`). No aparece en el panel de pausa de las sesiones con niños ni en la referencia motora; la página «Pausa guiada» y el inicio solo la ofrecen con una sesión en modo experto en curso, y queda anotada en esa sesión.
- **ACT-15 requiere la voz grabada** (`requiereVozGrabada` en la ficha), que todavía no existe. Con la voz del navegador, antes del bloque aparece un aviso y el adulto decide si la abre solo para revisar la mecánica. El motor deja cada ensayo con `audio_fuente = sintesis` como fallo técnico (`fallo_tecnico = true`, `peso_calidad = 0`): nunca queda como válido, y el resumen del bloque no lo cuenta.
- **ACT-12: dos bloques de 40 se juntan en 80 elecciones.** El Catálogo pide 80 elecciones o más para verificar que se recuperan los parámetros del modelo de aprendizaje, y un bloque tiene como mucho 40 ensayos (Arquitectura 4.4). Por eso (`juntarBloques` de la ficha):
  - El segundo bloque de la misma banda en la sesión sigue el mismo programa de 80 elecciones. En B1 y B2 el mismo cofre premia más todo el tiempo. En B3 y B4, el Catálogo dice que «la ventaja se invierte» sin decir cuántas veces: se invierte una sola vez, en la elección 41 (al empezar el segundo bloque). El lugar se configura en la ficha (`juntarBloques.inversionEnEleccion`) y queda como pendiente para que lo confirme el Modelo matemático cuando defina α_RL. Cada ensayo del banco lleva su número de elección (`eleccion`) y su fase (1 antes del cambio, 2 después).
  - El resumen de cada bloque, al terminarlo y en «Sesiones», cuenta las elecciones de esa banda en la sesión y, si son menos de 80, pide otro bloque. Las omisiones y los ensayos interrumpidos no cuentan como elecciones.
  - Este prototipo no calcula los parámetros.
- Los rostros de ACT-14 son dibujos, como pide el Catálogo para empezar: 6 personajes de distinta edad, género y tono de piel, con 4 emociones (alegría, tristeza, enojo y miedo) en 2 intensidades.
- Las frases de ACT-03 B3 dependen del color de cada dibujo. Si se cambia una imagen del banco, hay que revisar la lista `frases` de la ficha.

`npm run check-items` verifica que todo archivo usado exista y tenga su fila en [`items/licencias.csv`](items/licencias.csv), y falla si no. También lista los marcadores provisionales que siguen en uso, los audios que faltan y cuántos ítems hay en cada estado de revisión clínica.

## Imágenes, pictogramas y audio

**Fotografías.** Por ahora cada ejemplar es un marcador provisional en `assets/img/<concepto>/<n>.svg` (fondo gris con el nombre del concepto y «EJEMPLAR n PENDIENTE»). Para reemplazar uno por una fotografía real con licencia libre:

1. Guarda la fotografía como `assets/img/<concepto>/<n>.jpg` (también sirven `.png` o `.webp`). El identificador del concepto está en `conceptos.json`; por ejemplo, `cepillo-de-dientes`.
2. Borra el marcador `.svg` y su fila en `items/licencias.csv`.
3. Agrega la fila de la fotografía en `items/licencias.csv`: origen, autor, licencia y dirección de origen.
4. Corre `npm run build-items` (el banco pasa a usar la fotografía) y `npm run check-items`.

No se usan fotografías inventadas ni generadas. Respeta las notas de cada concepto; por ejemplo, el pollito sin gallina y la misma forma de paleta en sus tres ejemplares.

**Audio.** Cada consigna tiene una clave, y su archivo va en `assets/audio/<clave>.mp3`; por ejemplo, `cual-es-igual.mp3` o `donde-esta-el-perro.mp3`. `npm run check-items` lista las claves que faltan. Cada archivo necesita su fila en `licencias.csv`. Mientras falte, la aplicación usa la voz del navegador en español de México y lo registra como `audio_fuente` = `sintesis`.

**Recortes para las escenas de ACT-04.** Los 16 archivos de `assets/escenas/<concepto>.png` son dibujos sin el fondo blanco (manzana, plátano, galleta, paleta, naranja, leche, peine, escoba, teléfono, almohada, perro, gato, conejo, pato, pollito y zapato), para ponerlos dentro de una escena. Cada uno tiene su fila en `licencias.csv`, que dice de qué dibujo sale.

**Sonidos de ACT-05.** Los 24 archivos `assets/audio/sonido-<concepto>-<1|2>.mp3` (el perro, el gato, la vaca, el pájaro, el tren, el avión, el helicóptero, el claxon del carro, la sirena del camión de bomberos, el cepillo de dientes, unas manos que aplauden y el agua que se sirve en un vaso) son grabaciones reales de [Freesound](https://freesound.org) reunidas en el conjunto ESC-50 (K. J. Piczak, 2015). Solo se usaron grabaciones con licencia CC0 o CC BY; cada una tiene su fila en `licencias.csv` con su autor, su licencia y su dirección en Freesound, como pide CC BY.

- Primero se recortaron a 2.1 s, mono, con 15 ms de entrada y 250 ms de salida. Ese paso decía dejar un volumen parejo, pero no lo dejó: la sonoridad iba de −29.2 a −20.8 LUFS, algunos picos llegaban a −1.4 dBTP, y ocho grabaciones tenían de 70 a 355 ms de ruido de fondo antes del sonido (carro-2, gato-2, mano-1, pájaro-1, perro-1, perro-2, vaca-1 y vaso-1).
- Ahora `node tools/sonidos.mjs` los mide con ffmpeg y `node tools/sonidos.mjs --corregir` los corrigió. Se corrió una sola vez sobre las grabaciones originales:
  - **Sonoridad:** todos quedan en −27 LUFS ± 1 (EBU R128), con pico verdadero de −3 dBTP o menos. −27 es el objetivo más alto en el que el sonido con más picos, el cepillo de dientes 2, no pasa de −3 dBTP.
  - **Inicio:** el sonido empieza en la primera ventana de 5 ms que está a 20 dB o menos de la ventana más fuerte del archivo. Así el ruido de fondo de la grabación no cuenta como inicio. Se recorta lo que hay antes de 15 ms del inicio y se pone una entrada suave de 10 ms. Todos empiezan antes de 50 ms (de 5 a 20 ms). Si un navegador no quita el retardo del codificador MP3 (unos 26 ms), siguen por debajo de 50 ms.
  - Duran ahora de 1.76 a 2.1 s, en MP3 mono de 44.1 kHz y 96 kbps.
- `docs/medicion-sonidos.json` guarda la medida de cada archivo y su huella SHA-256. Las pruebas comprueban que todos cumplen y que los archivos son los medidos. Si se cambia un sonido, hay que volver a correr `node tools/sonidos.mjs`.
- Ninguno es un sonido de error ni de premio: son el estímulo.
- `silencio.mp3` es un archivo sin sonido. Lo usan los pasos de ACT-10 y ACT-16 después del primero, para que la instrucción no se repita en cada paso de la secuencia.
- Las consignas habladas de ACT-04, ACT-10, ACT-15 y ACT-16 todavía usan la voz del navegador.

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
- **Pantalla del niño.** Fondo neutro, sin texto y sin elementos que distraigan. Las excepciones son los marcadores provisionales, que muestran el nombre del concepto hasta que lleguen las fotografías, y el código del ítem en modo experto.
- **Retroalimentación.** Sin sonidos de error, sin la palabra «Incorrecto» y sin recompensas que dependan del desempeño: siempre se señala la opción correcta con el mismo marco.
- **Contraste.** Los pictogramas y las figuras van sobre un fondo claro también en el tema oscuro. El azul y el amarillo de ACT-07 llevan contorno oscuro.
- **Volumen.** Se ajusta en el inicio y en la pausa.

## Marca e interfaz

**AutiPal** es la aplicación de Neuro-BlueMinds. La interfaz sigue el Manual de marca de AutiPal, y la marca solo va en un tipo de pantalla:

- **Pantallas del adulto** (inicio, galería, sesiones, revisión clínica, formulario F3, calibración, créditos, niños inscritos y resumen): llevan los colores, el isotipo, el logotipo y las tipografías de AutiPal. El encabezado de todas dice «Herramienta de apoyo y medición para el terapeuta» y muestra siempre el aviso «Prototipo para revisión de expertos. No es una herramienta diagnóstica.».
- **Pantalla del niño** (la referencia motora, la sesión y la pantalla de «terminamos»): queda neutra. Fondo liso, sin logotipo, sin colores de la marca, sin texto y sin decoración. Lo único que cambió respecto a la versión anterior es el color del marco de retroalimentación.

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
| `--borde-campo` | Contorno de campos y casillas (3 a 1 o más) | `#8A7E6C` | `#6A8392` |
| `--problema` | Mensajes de error de los formularios y «Borrar registro» | `#8B2A1F` | `#F0A597` |
| `--marca-2` | Solo decoración: franja del encabezado (Pantone 2169 C) | `#84B3CE` | `#5C93B5` |
| `--marco` | Marco de retroalimentación en la pantalla del niño | `#1F2937` | `#F3F4F6` |

- Todo texto tiene un contraste de al menos 4.5 a 1 con su fondo, en los dos temas (lo comprueba `test/estilo-autipal.test.js`).
- Ninguna pantalla usa verde ni rojo para aciertos o errores.
- `--fondo-nino`, `--opcion-fondo`, `--control` y `--cm` son los mismos de la versión anterior y no llevan colores de la marca.
- El marco de retroalimentación es gris muy oscuro (casi blanco en tema oscuro) y no azul, para que no se confunda con el azul que el niño clasifica en «Cambia la regla».

**Tipografías.**

| Dónde | Tipografía | Si no está instalada |
|---|---|---|
| Títulos (`--fuente-titulos`) | Roca Two Bold | Noto Serif |
| El nombre «AutiPal» dentro de un texto (`.nombre-marca`) | More Sugar | Noto Sans |
| Encabezado | Logotipo oficial | — |
| Texto, campos y botones (`--fuente-texto`) | Noto Sans | — |

- **Noto Sans y Noto Serif** están en [`assets/fonts/`](assets/fonts/). Son de The Noto Project Authors, con licencia SIL Open Font License 1.1; el texto de la licencia está en [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt) y cada archivo tiene su fila en `items/licencias.csv`.
- **Roca Two y More Sugar** son las del Manual de marca. No son de distribución libre, así que **no están en el repositorio**: la hoja de estilos solo las busca con `local()`, en la computadora donde se abre la aplicación. En el prototipo se usan solo para pruebas; antes de un uso comercial hay que comprar sus licencias para web y aplicación.
- Ninguna tipografía se carga de un servidor externo. La pantalla del niño usa la tipografía del sistema.

**Logotipo.** Está en [`assets/marca/`](assets/marca/): isotipo y logotipo en versión positiva (`#7496BB`) e invertida (blanco, para el tema oscuro), `logo.png` y los íconos del navegador. Son propiedad de Neuro-BlueMinds, con todos los derechos reservados, y cada archivo tiene su fila en `items/licencias.csv` con los autores del manual. Según el manual, el logotipo no se deforma, no cambia de color, no lleva sombras ni efectos y no se pone sobre fondos que reduzcan su contraste.

**Íconos.** Los íconos de las pantallas del adulto son de [Phosphor Icons](https://phosphoricons.com) (estilo regular, licencia MIT, incluida en `src/styles.css`). Se dibujan con máscaras de CSS, así que toman el color del texto en los dos temas.

**Medidas del adulto.** Espaciado en pasos de 4 y 8 px (`--esp-1` a `--esp-7`); letra de 14 px para ayudas, 16 px para el texto, 20 px para subtítulos y de 26 a 32 px para el título de cada pantalla; todo lo que se toca mide al menos 44 × 44 px (`--toque`); los párrafos llegan a unos 75 caracteres por renglón (`--medida`).

## Publicación en GitHub Pages

El prototipo es un sitio estático; no necesita compilación.

1. Sube la rama `main` al repositorio de GitHub.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, elige **Source: Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Guarda.
4. Después de uno o dos minutos, el sitio queda en `https://<usuario>.github.io/<repositorio>/`. Para este repositorio: `https://nazariegosantomeluis-droid.github.io/Neuro-BlueMinds-prototipo-1/`.
5. Comparte con el panel el enlace directo a la galería: `…/Neuro-BlueMinds-prototipo-1/#galeria`.

Notas:

- Todas las rutas son relativas, así que el sitio funciona dentro de la subcarpeta del repositorio.
- El registro se guarda en el navegador de cada dispositivo. Descárgalo antes de borrar los datos del navegador.
- Después de publicar cambios, el navegador puede mostrar la versión anterior por unos minutos. Recarga la página sin caché para ver la nueva.

## Pendientes

- **Fotografías:** reemplazar los 180 marcadores por fotografías reales con licencia libre.
- **Audio:** grabar los audios de las consignas (63 claves, ver `npm run check-items`).
- **Revisión clínica:**
  - aplicar la revisión de la muestra con `tools/aplicar-revision.mjs` (anota las fichas);
  - revisar los 200 ítems fuera de la muestra (Arquitectura 13.4);
  - los distractores de B4;
  - el color típico de ACT-01 B1;
  - los conceptos `short` y `camión`.
- **Pictogramas por confirmar:** `tortilla` (ARASAAC la etiqueta «torta de maíz») y `camión` (por ahora, autobús urbano).
- **Fase 2 de ACT-02:** los 15 ensayos en V y 15 en AV de un mismo bloque, por mitad, todavía no están implementados como modalidad mixta.
- **Pruebas en tabletas reales:** Safari en iPad y Chrome en Android. Hasta ahora se probó en Chromium de escritorio con tamaños de tableta.
- **Latencia de cada tableta:** `latencia_dispositivo_ms` (y con ella `tr_corregido_ms`) quedan vacías hasta medirla. La referencia motora no se probó en tabletas reales.
- **Referencia motora:** la permanencia del objetivo (5 s) y la exclusión de los toques anticipatorios son valores de planeación por confirmar con los clínicos y con la Dra. González Ureña.
- **Frecuencia de pantalla:** con el ahorro de energía activo (por ejemplo, con poca batería), Chrome y Edge dibujan a 30 Hz en lugar de 60 Hz. Entonces `t_opciones − t_opciones_insercion` mide unos 33 a 66 ms (1 o 2 cuadros de 33 ms). La aplicación lo avisa antes de cada bloque; para las sesiones, conecta el dispositivo a la corriente o desactiva el ahorro de energía.
- **Uso sin conexión:** no está implementado (era opcional en este hito).

## Autoría y licencia

© 2026 Luis Nazariego Santome y equipo Neuro-BlueMinds. Todos los derechos reservados.

Equipo del prototipo:

- **Luis Nazariego Santome**, fundador y CEO de Neuro-BlueMinds: Catálogo de actividades y fichas técnicas, motor de medición y registro, banco de ítems, revisión clínica y formulario F3.
- **José Miguel Fausto Tapia**, cofundador y co-CEO de Neuro-BlueMinds: interfaz del terapeuta y del niño, y marca AutiPal en la aplicación.

La marca AutiPal (isotipo, logotipo y Manual de marca) es propiedad de Neuro-BlueMinds. Las tipografías Noto conservan su licencia SIL Open Font License 1.1.

### Pictogramas de ARASAAC

Los pictogramas de `assets/picto/` no están bajo los derechos anteriores. Se distribuyen bajo la licencia Creative Commons BY-NC-SA, que autoriza su uso sin fines de lucro citando la fuente y el autor, y obliga a compartir las obras derivadas con la misma licencia. Atribución, según las condiciones de uso de ARASAAC:

> Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido creados por Sergio Palao para ARASAAC (http://www.arasaac.org), que los distribuye bajo Licencia Creative Commons BY-NC-SA.

> Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España)
