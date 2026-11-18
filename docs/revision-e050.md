# Revisión de las tarjetas de la E.050 (noviembre de 2026)

Primera versión de los mazos de la **E.050 Suelos y Cimentaciones (RM N° 406-2018-VIVIENDA)**, hecha a partir de la edición digital del SENCICO (82 páginas). Los archivos están en `contenido/e050/` y el método en `contenido/e050/README.md`. Este documento resume qué se verificó, qué erratas trae la propia norma y qué debe revisar un ingeniero antes de publicar.

## Tarjetas por capítulo y tipo

| Cap. | Archivo | Total | Opción múltiple | Caso numérico | Tabla | Concepto | Completar | Imagen |
|---|---|---|---|---|---|---|---|---|
| I | `01-disposiciones-generales.json` | 45 | 35 | 0 | 2 | 5 | 3 | 0 |
| II | `02-estudios.json` | 72 | 57 | 4 | 5 | 4 | 1 | 1 |
| III | `03-analisis-cimentacion.json` | 30 | 20 | 6 | 1 | 1 | 1 | 1 |
| IV | `04-cimentaciones-superficiales.json` | 34 | 24 | 3 | 2 | 3 | 1 | 1 |
| V | `05-cimentaciones-profundas.json` | 39 | 29 | 2 | 2 | 4 | 1 | 1 |
| VI | `06-problemas-especiales.json` | 104 | 79 | 7 | 7 | 3 | 2 | 6 |
| | **Total** | **324** | **244** | **22** | **19** | **20** | **9** | **10** |

`00-e050-articulos.json` trae los 460 artículos de la norma: numerales, 17 tablas, 23 figuras y Anexos I a III.

## Verificación hecha

1. **Esquema**: `node_modules/.bin/tsx contenido/e050/herramientas/validar.ts` valida los 7 archivos contra `importacionSchema`. También comprueba que cada cita apunte a un artículo del mismo archivo y que la respuesta de cada opción múltiple y de cada tabla exista.
2. **Citas**: `python3 contenido/e050/herramientas/chequeo.py` da 0 extractos no literales. Además, el generador rechaza cualquier cita que no esté en el texto del artículo. Cada extracto contiene el valor o la condición que pregunta la tarjeta: cuando la norma da varios valores en un mismo numeral, se cita el inciso que corresponde (por ejemplo, 25.4.2 a) para el 90 % y b) para el 95 %).
3. **Páginas leídas como imagen**: 9, 16, 17, 20–27, 30–33, 35, 36, 38–40, 43, 44, 47, 48, 50, 52–54, 57–65, 70–73. Son todas las páginas con tabla o fórmula y las de las figuras usadas en tarjetas. Las 17 tablas se compararon celda por celda con la imagen. Dos correcciones salieron de ahí:
   - El texto plano había perdido el «0» de «Ninguno» en la Tabla 10.
   - En la Tabla 2, «(ver ANEXO III)» del CTP va en la columna de la norma.

   No se miraron como imagen las páginas de figuras que no se usan en tarjetas: 55 y 66–68 (Figs. 11, 16, 17 y 18), 74–79 y 80–82 (anexos).
4. **Fórmulas**: se transcribieron desde la imagen las de 5.27, 15.3.2 c), 20.2, 20.4, 23.3, 28.1, 28.2, 35.3.3, la Fig. 8, la Fig. 22 y 39.11.7 a), b) y f). En el texto plano salían desordenadas o no salían.
5. **Figuras**: 11 recortes, todos por debajo de 60 KB, cada uno revisado como imagen. Se armaron hojas de revisión (imagen + pregunta + opciones con la correcta marcada + cita) para las tarjetas con figura y se miraron una por una. Cambios que salieron de esa revisión:
   - Se volvió a recortar la Fig. 5: se colaba texto del costado.
   - Se volvió a recortar la Fig. 6: el rótulo del caso (b) quedaba cortado.
   - Se volvió a recortar la Fig. 19: quedaba fuera la cota «Máximo 1.0 m típico». En esa misma figura, la transcripción decía «Mínimo 0.30 m» y la figura dice «Mínimo 0.20 m»; se corrigió.
   - Se quitó la figura de una opción múltiple (distancia del bulbo a una cimentación vecina, 3,00 m) porque la imagen mostraba la respuesta. La figura quedó solo en la tarjeta de imagen equivalente.
6. **Casos numéricos**: se calcularon todas las combinaciones de valores de los 22 casos. Los resultados son físicamente razonables, por ejemplo:
   - qd en arcilla: 276–617 kPa.
   - Pw de un anclaje: 398–842 kN.
   - Ea de un muro: 22–83 kN/m.
   - Los casos que cuentan puntos o controles siempre dan números enteros.
7. **Redacción**: se repasaron las 244 opciones múltiples con la prueba de «quien no conoce la norma»:
   - Cada pregunta nombra el elemento, la condición y la magnitud.
   - Explica los símbolos (Df, B, Pw, η, CRRM, CSR, FSL…) o los evita.
   - Cuando la regla cambia según la categoría, la pregunta dice cuál: tipo de edificación I–IV, categoría A/B/C de la E.030, anclaje permanente o provisional, suelo cohesivo o granular, con o sin sótano, pilote individual o grupo, carga estática o sísmica.
   - Ninguna termina en «…» ni usa «Nada», «Nunca», «Siempre», «Ninguno», «Sin límite» o «Todas las anteriores». El generador las rechaza.
   - La correcta queda en la posición 1 en 41 tarjetas, en la 2 en 67, en la 3 en 73 y en la 4 en 63.

No quedó ninguna tarjeta marcada **VERIFICAR**: todos los valores usados se leyeron bien en la imagen.

## Erratas e incoherencias de la propia norma

El texto literal de los artículos se dejó tal como está en el PDF. Ninguna tarjeta se apoya en estos puntos, salvo las dos que se indican, que lo explican en su `explicacion`.

| Pág. | Numeral | Qué dice | Qué debería decir o el problema |
|---|---|---|---|
| 9 | 5.29 | Define el CSR y lista los términos («Donde: σvo, σ′vo, amax/g, rd») | **Falta la fórmula** del CSR: la página no la trae. |
| 9–10, 41 | 5.22, 5.23, 5.42, 5.43, 31.1 | Pilar: Df/B «mayor o igual que 5» (5.22) o «mayor a 5» (5.42). Pilote: d/b «mayor o igual a 10» (5.23) o Df/B «mayor a 5» (5.43 y 31.1). | Criterios distintos para lo mismo. Las tarjetas no preguntan por el valor límite y usan el diámetro de 90 cm o el criterio del artículo 31. |
| 20 | 14.3 | «Cono tipo Peck (CPT)» | La sigla del Cono Tipo Peck es CTP; CPT es el cono estático. |
| 22 | 15.3.2 | «(Ver Capítulo VI, Artículo 24)» | El artículo 24 está en el Capítulo IV. |
| 29 | 16.2.8 | Análisis de licuación «de acuerdo con el artículo 36» | La licuación es el artículo 38; el 36 es ataque químico. **La tarjeta lo explica** (cap. II). |
| 33 | 20.4 | Nq = **ε**^(π tan φ′) tan²(45 + φ′/2) | Debería ser e (base de los logaritmos naturales), no épsilon. Además Nc se da a la vez como 5,14 y como (Nq − 1) cot φ′. Ninguna tarjeta usa Nq. |
| 35 | 23.3 | «B´ y L´ se calcularán de acuerdo a lo indicado en 4.5» | No existe el 4.5. B′ y L′ se calculan según 28.2. |
| 38 | 26.6 | Sostenimiento de la cimentación vecina «según lo indicado en el numeral 39.8» | El 39.8 trata de los efectos de sismo. Lo pertinente parece ser 39.12 (calzaduras). |
| 41 | 31.3 | FS «indicados en el artículo 20» y asentamientos «indicados en el artículo 18» | Los FS están en el artículo 21 y el asentamiento tolerable en el 19. |
| 45 | 32.4.3 c) | «el problema generado por el cumplimiento» | Debería decir «incumplimiento». |
| 53 | 38.6.4 | Nuevo análisis de licuación «de acuerdo a lo indicado en el numeral 38.4» | El análisis está en 38.5; el 38.4 es la exploración. |
| 55 | 39.2 | Excavaciones sin sostenimiento «de acuerdo a lo indicado en el numeral 39.8» | El 39.8 es efectos de sismo. Lo pertinente es 39.7 (excavaciones sin estructuras de sostenimiento). |
| 59 | 39.11.7 c-1) | Estabilidad global «descrito en el sub numeral 39.12.6» | Es 39.11.6; el 39.12.6 es la altura de las calzaduras. |
| 59 | 39.11.7 c-2) | Longitud libre mínima: «Véase aplicación en la Tabla 14» | La Tabla 14 es de adherencia del bulbo, no de longitud libre. |
| 61 | Nota bajo la Fig. 14 | «profundidad mínima de cimentación (ver artículo 24)» | La profundidad mínima está en el artículo 26. |
| 63 | 39.11.7 f-8) | En los ensayos de recibimiento: «Las cargas máximas para los ensayos de capacidad son…» | Copiado del f-7: debería decir «ensayos de calidad o recibimiento». |
| 71 | Figura 20 | Título «TIPOS DE MUROS» | La figura muestra tipos de **drenaje** de muros (lloraderos, drenes, capas). |
| 73 | 39.13.8 | FS «indicados en el numeral 39.14.6» | No existe el 39.14. Es 39.13.6. |
| 80–81 | Anexo III.3 y III.5.3 | III.3 define Cn como los golpes para 15 cm. III.5.3 dice que Cn es la suma de dos intervalos de 15 cm, y la Tabla 3 lo define por 0,30 m. | Incoherencia interna. **La tarjeta sigue a III.5.3 y a la Tabla 3 (30 cm) y lo explica** (cap. II). |
| 78, 81 | Anexo II.7.3 y III.5.3 | «se anota cono N20 / Cn»; «todas las introducciones mayores de 15 minutos» | Erratas tipográficas: «como» e «interrupciones». |
| 58 | Figura 12 | Los rótulos j) e i) están en ese orden | Orden alterado en el PDF. Se transcribió tal cual. |

## Lo que debe revisar un ingeniero

1. **Versión y vigencia**:
   - Confirmar que se quiere estudiar la versión de 2018.
   - Confirmar la fecha de publicación en El Peruano: en `publicadaEn` va la fecha de la RM, 30/11/2018.
2. **Tabla 13.A**: da el FSL mínimo para las categorías «A, B, C» de la E.030. La E.030 vigente subdivide la categoría A (A1, A2). Ver si conviene aclararlo en la tarjeta.
3. **Cn del Cono Tipo Peck** (Anexo III): decidir si la tarjeta debe seguir a la Tabla 3 (30 cm, como está) o señalar solo la incoherencia.
4. **Criterios de pilote y pilar**: decidir cómo se enseña la frontera. La norma da Df/B > 5 en el artículo 31, ≥ 5 y ≥ 10 en el glosario, y el diámetro de 90 cm.
5. **Casos numéricos**:
   - Revisar los valores de la longitud de bulbo (P/(π D τw)) y de la carga de trabajo del anclaje: son ilustrativos.
   - En el caso de la distorsión angular la respuesta se pide como «x» de α = 1/x; confirmar que la app lo presenta bien.
6. **Figuras como texto**: los artículos `Figura N` tienen los rótulos de la figura y, entre corchetes, una descripción nuestra marcada como «[Transcripción: …]». Si el panel muestra el texto del artículo, decidir si se deja así.
7. **Distractores**: los de las Tablas 8, 11, 13 y 14 son valores vecinos de la misma tabla, a propósito. Revisar que ninguno sea también defendible.
8. **Figura 1 (c-1) (v) canales**: la cota «z = 3 m mínimo = B, cuando B < C = C, cuando B > C» está impresa en una imagen pequeña. No se usa en tarjetas.

## Notas

- Algunas tarjetas citan artículos de otros capítulos. Por ejemplo, el FSL y el CRR (5.27, 5.28) desde el cap. VI, y el artículo 21 desde el cap. V. Esos artículos se incluyeron en cada archivo, así que cada uno se puede importar solo.
- Para corregir tarjetas ya importadas: no agregar, quitar ni reordenar tarjetas (las nuevas van al final) y marcar los cambios con `contenido/e050/herramientas/reemplazos.py main contenido/e050/0[1-6]*.json`.
