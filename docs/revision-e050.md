# Revisión de las tarjetas de la E.050 (noviembre de 2026)

Mazos de la **E.050 Suelos y Cimentaciones (RM N° 406-2018-VIVIENDA)**. Los archivos están en `contenido/e050/` y el método en `contenido/e050/README.md`.

La fuente es la publicación oficial en Normas Legales de *El Peruano* (3 de diciembre de 2018, págs. 22–68; PDF de 47 páginas). Una primera versión se hizo con la edición digital del SENCICO (2020, 82 págs.); se cambió a El Peruano porque es el texto oficial y sus figuras no llevan marca de agua. Las páginas de este documento son las del PDF de El Peruano: la página impresa es la del PDF + 21.

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
2. **Citas**: `python3 contenido/e050/herramientas/chequeo.py` da 0 extractos no literales con el texto de El Peruano. El generador también rechaza cualquier cita que no esté en el texto del artículo. Cada extracto contiene el valor o la condición que pregunta la tarjeta.
3. **Texto comparado entre las dos ediciones**: se compararon palabra por palabra los 420 numerales de El Peruano con los de la edición SENCICO.
   - Salieron los mismos 460 artículos en el mismo orden.
   - 44 numerales difieren. Casi todo son espacios, puntuación, fórmulas y la posición de las notas al pie de los anexos.
   - Las diferencias de redacción están en la tabla de abajo; las tarjetas usan el texto de El Peruano.
4. **Páginas leídas como imagen**: 4, 7–18, 21–24, 26–30, 33–37, 39–41. Son todas las páginas con tabla, fórmula o figura usada en tarjetas, y las de cada diferencia entre ediciones.
   - Las 17 tablas se compararon de nuevo celda por celda con la imagen de El Peruano. Los valores son idénticos a los de la edición SENCICO.
   - Solo cambian rótulos: «Sensitividad» por «Sensibilidad» en la Tabla 3, «T - n» en la Tabla 7, la viñeta de la Tabla 1 y «TABLA 13A».
5. **Texto tachado**: se buscaron en todo el PDF las líneas horizontales que cruzan texto. El único tachado es «una faja» en 39.12.7 a) (pág. 39); se quitó del texto. El resto eran barras de fracción.
6. **Fórmulas**: se transcribieron desde la imagen las de 5.27, 5.28, 15.3.2 c), 20.2–20.4, 23.3, 28.1, 28.2, 32.3.2, 32.3.3, 35.3.3, la Fig. 8, la Fig. 22 y 39.11.7 a), b) y f). En el texto plano de El Peruano salen como caracteres de otros alfabetos.
7. **Figuras**: los 11 recortes se rehicieron desde El Peruano (150–300 dpi, todos por debajo de 60 KB) y se revisaron uno por uno. Ya no llevan la marca de agua «SENCICO».
   - Se armaron de nuevo las hojas de revisión (imagen + pregunta + respuesta + cita) de las 10 tarjetas con figura y se miraron.
   - La Fig. 12 b es pequeña y de trazo claro en el original. Las Figs. 6 y 19 son imágenes de baja resolución en el propio PDF.
8. **Casos numéricos**: se calcularon todas las combinaciones de valores de los 22 casos y los resultados son razonables (qd en arcilla 276–617 kPa, Pw de un anclaje 398–842 kN, Ea de un muro 22–83 kN/m). Los casos que cuentan puntos o controles siempre dan enteros.
9. **Redacción**: las 244 opciones múltiples pasan la prueba de «quien no conoce la norma»:
   - nombran el elemento, la condición y la magnitud;
   - explican los símbolos;
   - dicen la categoría cuando la regla depende de ella;
   - no terminan en «…» ni usan opciones de relleno.

   La correcta queda en la posición 1 en 41 tarjetas, en la 2 en 67, en la 3 en 73 y en la 4 en 63.

No quedó ninguna tarjeta marcada **VERIFICAR**.

## Diferencias entre El Peruano y la edición SENCICO

Las tarjetas siguen a El Peruano. Al cambiar de fuente, cambió el contenido de 12 tarjetas:
- las 10 de imagen, porque llevan los recortes nuevos;
- 2 del cap. II, por la redacción de la tabla de abajo.

En 19 tarjetas más solo se ajustó el extracto de la cita.

| Pág. | Numeral | El Peruano (oficial) | Edición SENCICO |
|---|---|---|---|
| 11–13 | 15.3.2 c) | h y Df se miden desde el piso terminado «del sótano **más profundo**» (3 veces); «(pilote, **pilar**, etc.)»; «se **puede** adoptar», «no **debe** ser menor», «el PR **debe** llevar a cabo» | «del sótano»; «pilares»; «podrá», «deberá», «deberá» |
| 13–14 | 15.3.2 d), 16.1.2 | «puntos de **exploración**» | «puntos de Investigación» |
| 13 | 15.3.2 e) | «el número de muestras que» | «el número de muestras muestras que» |
| 9 | Tabla 3 | «St = **Sensitividad**» | «Sensibilidad» |
| 37 | Figura 15 | «…Anclajes **Permanentes**» | «Permanente» |
| 13 | Nota de la Fig. 2 | «no **deben** invadir» | «no deberán invadir» |
| 26–27 | 35.3.4, 35.3.5 | Impresos como «**35.34.**» y «**35.5.5.**» | 35.3.4 y 35.3.5 |
| 23 | 32.2 | «artículo **15.B**» | «artículo 15.» |
| 34 | 39.11.7 b-3) | «el **τult** a su juicio… del parámetro **;**»: el símbolo τult quedó impreso sobre «PRS» y falta en «parámetro» | «el PRS a su juicio… del parámetro τult;» |
| 39 | 39.12.7 a) | «hasta construir ~~una faja~~ un anillo continuo» (tachado) | «hasta construir un anillo continuo» |

En 32.2 se dejó el texto literal «15.B». En 35.3.4/35.3.5 se usa el número correcto, porque el impreso rompería el orden de la numeración. En 39.11.7 b-3) el texto sigue la capa de texto del PDF («el PRS») y se repuso τult en «parámetro», como dice la edición SENCICO.

## Erratas e incoherencias de la propia norma

Están en las dos ediciones. El texto de los artículos se dejó literal. Ninguna tarjeta se apoya en estos puntos, salvo las dos que se indican, que lo explican en su `explicacion`.

| Pág. | Numeral | Qué dice | Qué debería decir o el problema |
|---|---|---|---|
| 4 | 5.29 | Define el CSR y lista sus términos | **Falta la fórmula** del CSR. Además, en El Peruano se lee «σ’v0» (con cero) por σ′vo. |
| 4–5, 22 | 5.22, 5.23, 5.42, 5.43, 31.1 | Pilar: Df/B ≥ 5 (5.22) o > 5 (5.42). Pilote: d/b ≥ 10 (5.23) o Df/B > 5 (5.43 y 31.1). | Criterios distintos para lo mismo. Las tarjetas no preguntan por el valor límite. |
| 9 | 14.3 | «Cono tipo Peck (CPT)» | La sigla del Cono Tipo Peck es CTP; CPT es el cono estático. |
| 11 | 15.3.2 | «(Ver Capítulo VI, Artículo 24)» | El artículo 24 está en el Capítulo IV. |
| 14 | 16.2.8 | Licuación «de acuerdo con el artículo 36» | Es el artículo 38. **La tarjeta lo explica** (cap. II). |
| 16 | 17.2 | «Norma Técnica de Edificación E .020 Cargas» | Solo en El Peruano: espacio de más («E.020»). Se dejó literal. |
| 17 | 20.4 | Nq = **ε**^(π tan φ′) tan²(45 + φ′/2) | Debería ser e, no épsilon. Nc se da como 5,14 y como (Nq − 1) cot φ′. Ninguna tarjeta usa Nq. |
| 18 | 23.3 | «B´ y L´ se calcularán de acuerdo a lo indicado en 4.5» | No existe el 4.5. Es el 28.2. |
| 21 | 26.6 | Sostenimiento de la cimentación vecina «según el numeral 39.8» | El 39.8 es efectos de sismo. Lo pertinente parece ser 39.12 (calzaduras). |
| 22 | 31.3 | FS «del artículo 20» y asentamientos «del artículo 18» | Son los artículos 21 y 19. |
| 25 | 32.4.3 c) | «el problema generado por el cumplimiento» | «incumplimiento». |
| 30 | 38.6.4 | Nuevo análisis de licuación «según el numeral 38.4» | El análisis está en 38.5. |
| 32 | 39.2 | Excavaciones sin sostenimiento «según el numeral 39.8» | Es 39.7. |
| 34 | 39.11.7 c-1) | «sub numeral 39.12.6» | Es 39.11.6. |
| 34 | 39.11.7 c-2) | Longitud libre: «Véase aplicación en la Tabla 14» | La Tabla 14 es de adherencia del bulbo. |
| 35 | Nota de la Fig. 14 | «profundidad mínima de cimentación (ver artículo 24)» | Es el artículo 26. |
| 37 | 39.11.7 f-8) | En recibimiento: «Las cargas máximas para los ensayos de capacidad…» | Debería decir «de calidad o recibimiento». |
| 40 | Figura 20 | «TIPOS DE MUROS» | Muestra tipos de **drenaje** de muros. |
| 41 | 39.13.8 | FS «del numeral 39.14.6» | No existe el 39.14. Es 39.13.6. |
| 46–47 | Anexo III.3 y III.5.3 | Cn por 15 cm (III.3) o suma de dos intervalos de 15 cm (III.5.3; la Tabla 3 dice 0,30 m) | Incoherencia interna. **La tarjeta sigue a III.5.3 y a la Tabla 3, y lo explica** (cap. II). |
| 45, 47 | Anexo II.7.3 y III.5.3 | «se anota cono N20 / Cn»; «introducciones mayores de 15 minutos» | «como» e «interrupciones». |
| 33 | Figura 12 | Rótulos sin tildes («traccion», «inyeccion») y j) antes de i) | Se transcribió tal cual. |

## Lo que debe revisar un ingeniero

1. **Tabla 13.A**: da el FSL mínimo para las categorías «A, B, C» de la E.030, que hoy subdivide la A (A1, A2). Ver si conviene aclararlo en la tarjeta.
2. **Cn del Cono Tipo Peck** (Anexo III): decidir si la tarjeta sigue a la Tabla 3 (30 cm, como está) o solo señala la incoherencia.
3. **Criterios de pilote y pilar**: decidir cómo se enseña la frontera: Df/B > 5 en el artículo 31, ≥ 5 y ≥ 10 en el glosario, y el diámetro de 90 cm.
4. **39.11.7 b-3)**: confirmar la lectura «el PRS… del parámetro τult» frente a lo impreso en El Peruano.
5. **Casos numéricos**:
   - Los valores de longitud de bulbo y carga de trabajo del anclaje son ilustrativos.
   - En la distorsión angular la respuesta se pide como «x» de α = 1/x; confirmar que la app lo presenta bien.
6. **Figuras como texto**: los artículos `Figura N` llevan los rótulos de la figura y, entre corchetes, una descripción marcada «[Transcripción: …]».
7. **Distractores**: los de las Tablas 8, 11, 13 y 14 son valores vecinos de la misma tabla, a propósito. Revisar que ninguno sea también defendible.

## Notas

- Algunas tarjetas citan artículos de otros capítulos: 5.27 y 5.28 desde el cap. VI y el artículo 21 desde el cap. V. Van incluidos en cada archivo, así que cada uno se puede importar solo.
- Si alguna versión anterior de estos mazos ya se importó, marcar los cambios antes de reimportar con `python3 contenido/e050/herramientas/reemplazos.py <commit importado> contenido/e050/0[1-6]*.json`. No agregar, quitar ni reordenar tarjetas: las nuevas van al final.
