# Revisión de las tarjetas de la E.060 (noviembre de 2026)

Motivo: en la partida en vivo varias preguntas no se entendían sin ver la cita («¿cuánto vale Cm?», «¿cuándo aplican las limitaciones de 22.2?»). Se revisaron los 22 mazos de `contenido/e060/` contra el texto de `apps/web/normas/e060/norma.json`.

## Resultado

| | Tarjetas |
|---|---|
| Revisadas | 1 304 (804 de opción múltiple, 162 de concepto, 118 de completar, 102 casos numéricos, 96 de tabla, 22 de imagen) |
| Con el texto cambiado | 765 (671 de opción múltiple y 94 casos numéricos) |
| Solo con la cita corregida | 13 |
| Sin cambios | 526 |
| Agregadas o eliminadas | 0 (mismo número y orden en cada mazo) |

Por capítulo (cambiadas / total): 1: 4/23 · 2: 14/57 · 3: 11/44 · 4: 15/36 · 5: 24/51 · 6: 15/32 · 7: 31/80 · 8: 46/65 · 9: 52/85 · 10: 71/105 · 11: 84/120 · 12: 63/91 · 13: 53/79 · 14: 18/33 · 15: 28/41 · 16: 26/33 · 17: 19/25 · 18: 52/72 · 19: 17/26 · 20: 23/30 · 21: 82/131 · 22: 30/45.

Las tarjetas de concepto, completar, tabla e imagen se leyeron todas y no necesitaron cambios de texto: ya eran oraciones completas. El problema estaba en las de opción múltiple (las que usan la partida en vivo, los duelos, el simulacro y la pregunta del día) y en los enunciados de los casos numéricos.

## Qué se cambió y por qué

1. **Pregunta que no se sostenía sola** (la gran mayoría). Faltaba decir el elemento, la condición o la magnitud: «Viga en voladizo: ¿peralte mínimo de la Tabla 9.1?», «¿Cuál es el tope de Vs?». Ahora cada pregunta nombra de qué elemento se trata, en qué condición y qué se pide.
2. **Símbolos sin explicar**: Cm, β1, Pon, Q, δns, Vc, Vs, Vnh, Mo, γf, αf, fps, fse, f′ci, ψt/ψe/ψs, entre otros. La pregunta ahora dice qué es el símbolo la primera vez («Vc, la resistencia al cortante que aporta el concreto») o se reformuló sin él.
3. **Dependía de recordar un número de artículo**: «las limitaciones de 22.2», «el método del 17.5.4», «la ec. 10-7», «el 11.9». Se reemplazó por lo que dice ese artículo; el número queda, como mucho, entre paréntesis.
4. **Capítulo 21 sin decir el sistema estructural**: las reglas de vigas y columnas cambian entre «muros estructurales o dual tipo I» (21.4) y «pórticos o dual tipo II» (21.5 a 21.7). Cada pregunta ahora lo dice.
5. **Textos con «…»**: 14 preguntas terminaban en puntos suspensivos para que la opción completara la frase. Se reescribieron como preguntas.
6. **Opciones** (367 tarjetas): se quitaron los distractores de relleno («Nada», «Nunca», «Siempre», «Ninguno», «Sin límite», «Donde sea», «Por costo») y se pusieron alternativas del mismo tipo y unidad que la correcta. No había ninguna «Todas las anteriores».
7. **Citas** (70 tarjetas): extractos que no eran literales (fórmulas reescritas), que estaban cortados a media frase o que citaban otro inciso del artículo. Ahora los 1 304 extractos aparecen literalmente en el artículo citado (`herramientas/chequeo.py` da 0 diferencias; antes daba 28).

## Ejemplos (antes → después)

| Cap. | Antes | Después |
|---|---|---|
| 10 | Columna con cargas transversales entre sus apoyos: ¿cuánto vale Cm? | Al magnificar momentos en una columna sin desplazamiento lateral se usa el factor Cm, que corrige el momento según la forma del diagrama de momentos. ¿Cuánto vale Cm si la columna tiene cargas transversales entre sus apoyos? |
| 3 | Respecto al espaciamiento libre entre barras, el agregado grueso no debe superar… (1/2 · 2/3 · 3/4 · Todo el espaciamiento) | ¿Qué fracción del espaciamiento mínimo libre entre barras de refuerzo no debe superar el tamaño máximo nominal del agregado grueso? (1/5 · 1/3 · 3/4 · 2/3) |
| 18 | ¿Se aplica el Capítulo 13 (losas en dos direcciones) al concreto preesforzado? (Sí, completo · No, salvo que se indique específicamente · Solo el Método Directo · Solo 13.3) | ¿Se aplican al concreto preesforzado las disposiciones del Capítulo 13 (losas en dos direcciones)? (Sí, se aplican completas · No se aplican, salvo donde la norma lo señale específicamente · Sí, pero con los momentos reducidos 10 % · Sí, si la losa es de Clase U) |
| 22 | Prefabricados de concreto simple: ¿cuándo aplican las limitaciones de 22.2? | Los límites de uso del concreto simple estructural (elementos con apoyo continuo, arcos en compresión, muros y pedestales), ¿en qué etapas se aplican a un elemento prefabricado de concreto simple? |
| 8 | Tramo interior de una viga continua: ¿coeficiente aproximado de momento positivo? | En el método de coeficientes para vigas continuas y losas en una dirección (momento = coeficiente × wu ℓn²), ¿qué coeficiente da el momento positivo en un tramo interior? |
| 9 | Control de fisuración: ¿qué valor máximo puede tener el parámetro Z? | Para controlar el ancho de las grietas por flexión, la E.060 limita el parámetro Z = fs ∛(dc Act), calculado en condiciones de servicio. ¿Cuál es su valor máximo? |
| 11 | ¿Cuál es el tope de Vs? | ¿Cuál es el máximo valor que puede considerarse para la resistencia al cortante que aporta el refuerzo, Vs? |
| 11 | Una sola barra doblada como refuerzo de cortante: ¿tope de Vs? | Cuando el refuerzo de cortante es una sola barra doblada (o un grupo de barras dobladas a la misma distancia del apoyo), ¿cuál es el máximo aporte Vs que puede considerarse? |
| 12 | Barra con epóxico y recubrimiento menor que 3 db: ¿factor ψe? | Al calcular la longitud de desarrollo en tracción, ¿qué factor ψe se aplica a una barra con recubrimiento epóxico y recubrimiento de concreto menor que 3 db? |
| 13 | Paño interior: ¿qué fracción de Mo va a momento negativo? | En el Método Directo para losas en dos direcciones, ¿qué fracción de Mo (momento estático total amplificado del paño) se asigna al momento negativo en un paño interior? |
| 17 | Si se usa el método alternativo del 17.5.4, ¿qué área sustituye a bv d? | Si el cortante horizontal de un elemento compuesto se calcula a partir del cambio de la fuerza de compresión o tracción en un segmento, ¿qué área sustituye a bv d en las expresiones de resistencia? |
| 21 | Columna (21.4): fuera de Lo, ¿espaciamiento máximo absoluto de estribos? | En columnas de edificios de muros estructurales o dual tipo I, fuera de la zona de confinamiento Lo, ¿cuál es el espaciamiento máximo absoluto de los estribos? |
| 21 | ¿Qué R tiene un sistema de pórticos de concreto armado? | ¿Qué coeficiente de reducción sísmica R asigna la E.060 a un sistema resistente formado por pórticos de concreto armado? |
| 16 | Si las fuerzas en el plano de un muro o piso prefabricado producen tracción, ¿qué se exige? (Juntas de mortero · Una trayectoria continua de refuerzo de acero · Llaves de cortante · Nada) | Si las fuerzas en el plano de un sistema de piso o muro prefabricado producen tracción, ¿qué debe proporcionarse? (Juntas rellenas de mortero · Una trayectoria continua de refuerzo de acero · Llaves de cortante · Apoyos de neopreno) |
| 5 (caso) | Registro de 20 ensayos consecutivos con desviación estándar calculada de {S} MPa. ¿Ss modificada (MPa)? | Una planta solo tiene un registro de 20 ensayos consecutivos de resistencia, con una desviación estándar calculada de {S} MPa. Aplicando el factor de modificación de la Tabla 5.1, ¿qué desviación estándar Ss (MPa) debe usarse para dosificar? |

## Lo que estaba mal respecto a la norma

No se encontró ninguna tarjeta cuya **respuesta** contradijera el texto de la norma. Lo incorrecto estaba en las citas y en algunos planteamientos:

**Citaban el inciso equivocado** (la respuesta era correcta, el extracto no la respaldaba):

- Cap. 4, tolerancia del aire incorporado (±1,5 %): citaba la frase de la Tabla 4.1.
- Cap. 7, extensión del estribo con gancho a 135° (6 db): citaba el inciso (b), del doblez a 90° con 12 db.
- Cap. 7, recubrimiento de losa interior (20 mm) y de columna a la intemperie (40 mm): ambas citaban el inciso (a), «concreto colocado contra el suelo … 70 mm».
- Cap. 10, φ de aplastamiento (0,70): citaba 10.17.1, que no da el valor; ahora cita 9.3.2.4.
- Cap. 11, φ de cortante (0,85): citaba 11.1.1; ahora cita 9.3.2.3.
- Cap. 12, ψe = 1,5 y ψs = 0,8: citaban la fila de ψt; ℓdc mínima de 200 mm: citaba 12.3.2 en lugar de 12.3.1; gancho de 90° confinado (0,8): citaba el inciso (a) en lugar del (b).
- Cap. 21, espesor mínimo de 100 mm en muros de ductilidad limitada, Lo y So de columnas, y espaciamiento en elementos de borde: el extracto no incluía el valor preguntado.

**Planteamiento impreciso**:

- Cap. 18: «¿Qué esfuerzo máximo se permite en el acero por la fuerza del gato?» con respuesta 0,80 fpu. La norma dice 0,94 fpy sin exceder 0,80 fpu; la pregunta ahora pide ese tope.
- Cap. 22: «¿Qué tamaño máximo puede tener la piedra del concreto ciclópeo?» con respuesta 250 mm. Falta el otro límite (la mitad de la menor dimensión del elemento); la pregunta ahora lo menciona y pide el tope absoluto.
- Cap. 7: se preguntaba por estribos de dos piezas y por empalmes de vigas perimetrales con condiciones que el artículo no pone; se ajustaron a 7.11.3 y 7.13.2.3.
- Cap. 11: el Vc mínimo con tracción axial se reformuló sin dar a entender un signo de Nu que la norma no fija.

## Pendiente de revisión por un ingeniero

- **Figuras y tablas en imagen**: las 118 tarjetas con figura se revisaron por su texto, no mirando la imagen. Conviene verlas una vez en el panel.
- **8.3.4, fuerza cortante del método de coeficientes**: en `norma.json` figura «1,15 (1/2) wu ℓn²» y «(1/2) wu ℓn²». Dimensionalmente debe ser wu ℓn (así lo dicen las tarjetas). Falta confirmar en el PDF si es errata de la norma o de la transcripción.
- **12.2.4, nota de la Tabla 12.2**: la E.060 escribe «el producto Ψt Ψs no necesita considerarse mayor que 1,7»; en el ACI 318 ese tope es para ψt ψe. La tarjeta sigue a la E.060 y lo advierte.
- Tres tarjetas citan un artículo de otro capítulo (9.3.2.4 desde el mazo del cap. 10; 9.3.2.3 y 2.1 desde el del cap. 11). Ya pasaba con una del cap. 2. Funciona porque toda la norma está cargada; en una base vacía hay que importar antes `00-e060-articulos.json`.

## Cómo llegan las correcciones a la base de datos

Antes, al reimportar un archivo, una tarjeta con el texto cambiado entraba como **nueva** y la anterior seguía publicada: habrían quedado 765 preguntas duplicadas.

Ahora (`apps/api/src/importacion.ts`):

- Cada tarjeta corregida lleva en el archivo un campo `reemplaza` con la huella (16 hex del SHA-256) del contenido anterior. Al importar, si en el mazo hay una tarjeta con esa huella, **se actualiza en su sitio**: mismo `id` (los usuarios conservan su progreso de repaso), `revision + 1` y sus citas nuevas.
- Si el contenido es el mismo y solo cambió la cita, se actualiza la cita.
- Si la base nunca tuvo la versión anterior, la tarjeta entra como nueva. Importar dos veces el mismo archivo no cambia nada.
- El resultado de la importación informa `reemplazadas` y `citasActualizadas` además de `tarjetasNuevas` y `repetidas`; el panel las muestra como «corregidas».
- `contenido/e060/herramientas/reemplazos.py <ref-git> <archivos>` escribe el campo `reemplaza` comparando con la versión ya importada. Regla para futuras correcciones: no agregar, quitar ni reordenar tarjetas en medio de un mazo; las nuevas van al final.

La tarjeta reemplazada toma el estado con que se importa. Igual que al editar una tarjeta en el panel, deja de estar «publicada» hasta que el mazo se publique otra vez, y mientras tanto no sale en duelos, simulacros ni partidas en vivo (la app sigue usando el paquete anterior). Por eso conviene importar como «aprobadas» y publicar enseguida.

Probado solo en local (PGlite):

- `pnpm --filter @tekluma/api prueba:reemplazo`: caso mínimo (reemplazo, cita corregida, reimportación sin cambios, base sin la versión anterior).
- Con los 22 archivos reales: se importó y publicó la versión anterior, luego la corregida. Resultado: 0 tarjetas nuevas, 765 reemplazadas, 13 con cita actualizada, 526 repetidas, los mismos 1 304 ids, y una segunda importación sin cambios.

## Para publicar (lo decide el dueño del proyecto)

1. Desplegar la API y el panel con este cambio. Con la API anterior el campo `reemplaza` se ignora y las tarjetas se duplicarían.
2. Probar primero en dev: panel → Importar → los 22 archivos `01` a `22`, con estado «aprobadas». Debe salir 0 tarjetas nuevas y 778 corregidas en total.
3. Publicar de nuevo cada uno de los 22 mazos para que la app reciba la versión corregida.
4. Repetir en producción.
