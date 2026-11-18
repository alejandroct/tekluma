# E.050 Suelos y Cimentaciones · archivos de importación

Fuente: **Norma E.050 Suelos y Cimentaciones, RM N° 406-2018-VIVIENDA**, que modifica la versión aprobada por el DS N° 011-2006-VIVIENDA. Es la publicación oficial: Normas Legales de *El Peruano* del lunes 3 de diciembre de 2018, págs. 22 a 68 (PDF de 47 páginas). Las páginas citadas son las del PDF; la página impresa de El Peruano es la del PDF + 21. Una primera versión se hizo con la edición digital del SENCICO (2020); las diferencias entre ambas están en `docs/revision-e050.md`.

Formato: `tekluma-mazos/1` (ver `packages/shared/src/importacion.ts`). Se cargan en el panel editorial → **Importar**.

| Archivo | Contenido |
|---|---|
| `00-e050-articulos.json` | Los 460 «artículos» de la norma, con texto literal y página del PDF. Incluye los 39 artículos y sus numerales, las 17 tablas y 23 figuras (como `Tabla N` y `Figura N`) y los Anexos I a III. Sin mazos. |
| `01-disposiciones-generales.json` | Cap. I · 45 tarjetas, 35 de opción múltiple (objeto, glosario, obligatoriedad del EMS y del ITS, responsabilidades) |
| `02-estudios.json` | Cap. II · 72 tarjetas, 57 de opción múltiple (información previa, técnicas de exploración, Tablas 1 a 7, programa mínimo, profundidad p, informe del EMS, Anexos II y III; Fig. 1 (c-1)) |
| `03-analisis-cimentacion.json` | Cap. III · 30 tarjetas, 20 de opción múltiple (cargas, asentamientos, Tabla 8, capacidad de carga, factores de seguridad, presión admisible; Fig. 4) |
| `04-cimentaciones-superficiales.json` | Cap. IV · 34 tarjetas, 24 de opción múltiple (formas, rellenos controlados, profundidad mínima, plateas, cargas excéntricas, taludes; Fig. 5) |
| `05-cimentaciones-profundas.json` | Cap. V · 39 tarjetas, 29 de opción múltiple (pilotes, Tabla 9, fricción negativa, pruebas, tolerancias, pilares, cajones; Fig. 6) |
| `06-problemas-especiales.json` | Cap. VI · 104 tarjetas, 79 de opción múltiple (colapso, ataque químico, expansión, licuación, sostenimiento, anclajes, calzaduras, muros; Tablas 10 a 16 y Figs. 7, 8, 12, 13, 19 y 22) |

En total hay 324 tarjetas: 244 de opción múltiple, 22 casos numéricos, 20 de concepto, 19 de tabla, 9 de completar y 10 de imagen. Las 10 tarjetas de imagen son las únicas que llevan figura. Cada mazo tiene `orden` = 200 + capítulo y acceso `free`. Cada archivo de capítulo trae sus artículos (con sus tablas y figuras) y los de otros capítulos que cita, así que se puede importar solo. Conviene importar primero `00`.

## Cómo se hicieron

1. **Texto literal y páginas** (`herramientas/extraer.py`, `articulos.py`). El texto se extrae con PyMuPDF:
   - Los símbolos de la fuente «Symbol» (γ, φ, σ, Δ, ≤…) se traducen carácter por carácter.
   - Se unen las ligaduras que El Peruano parte («Edifi caciones» → «Edificaciones»).
   - Se quitan las cabeceras de página y la resolución con su índice.
   - Se descartan los restos de las fórmulas (la fuente Cambria Math sale como caracteres de otros alfabetos).
   - Dos numerales mal impresos se leen con su número correcto: «35.34» por 35.3.4 y «35.5.5» por 35.3.5. Cada numeral (6.2.1, 25.4.2…) es un artículo. Los tres numerales más largos se parten por literal para que la cita lleve la página correcta: `15.3.2 a)` a `f)`, `32.3.4 a)` a `f)` y `39.11.7 a)` a `g)`.
2. **Tablas, fórmulas y figuras** (`herramientas/transcripciones.py`). Se leyeron en la imagen de cada página y se escribieron a mano:
   - Las tablas van fila por fila, con « | » entre celdas.
   - Las fórmulas se escriben en texto (`qd = sc ic c Nc`, `Pw = 0.90 fy As / η`…).
   - Se quitó el texto tachado en el impreso («una faja» en 39.12.7 a)). Es el único tachado: se buscó en todo el PDF.
   - En los artículos `Figura N` van solo los rótulos que trae la figura. Lo que es descripción nuestra va entre corchetes: «[Transcripción: …]».
   - Las tablas que siguen en la página siguiente se unieron (Tabla 5).
3. **Figuras**. Se recortaron del PDF de El Peruano con `herramientas/recorte.py` (JPEG, 150–300 dpi, calidad 72, todas por debajo de 60 KB) y se revisaron una por una. No llevan marca de agua. La mayoría son vectoriales y se ven nítidas; las Figs. 6 y 19 son imágenes de baja resolución en el original, y la Fig. 12 es pequeña y de trazo claro.
4. **Tarjetas** (`herramientas/tarjetas/c01.py` … `c06.py`). Cada tarjeta se escribió a mano con su cita. `lib.py` comprueba al generar que cada extracto esté literalmente en su artículo y que no haya opciones de relleno. También baraja la posición de la opción correcta de forma determinista.
5. **Verificación**:
   - `herramientas/validar.ts` valida contra `importacionSchema`: 7/7 archivos válidos.
   - `herramientas/chequeo.py` compara las citas con el texto de los artículos: 0 extractos no literales.
   - `herramientas/hojas.py` arma las hojas de revisión de las tarjetas con figura.
   - El detalle está en `docs/revision-e050.md`.

## Regenerar o corregir

**Los JSON de esta carpeta son la fuente de las tarjetas.** Los scripts de `herramientas/tarjetas/` hicieron la primera versión. Volver a ejecutarlos sobrescribe cualquier corrección hecha después en los JSON.

Para corregir tarjetas ya importadas, edita el JSON sin agregar, quitar ni reordenar tarjetas (las nuevas van al final del mazo). Luego marca los reemplazos comparando con la versión importada:

```bash
python3 contenido/e050/herramientas/reemplazos.py main contenido/e050/0[1-6]*.json
python3 contenido/e050/herramientas/chequeo.py
node_modules/.bin/tsx contenido/e050/herramientas/validar.ts
```

Herramientas (Python 3 + `pymupdf`; ejecuta los scripts con `python -I`):

```bash
python3 -m venv $E050_TRABAJO/venv && $E050_TRABAJO/venv/bin/pip install pymupdf
export E050_TRABAJO=/ruta/de/trabajo E050_PDF="/ruta/E.050 Suelos y Cimentaciones 2018.pdf"
$E050_TRABAJO/venv/bin/python -I herramientas/extraer.py           # texto por página
E050_ESCRIBIR_00=1 $E050_TRABAJO/venv/bin/python -I herramientas/articulos.py   # artículos (+ 00-e050-articulos.json)
DPI=120 $E050_TRABAJO/venv/bin/python -I herramientas/render.py 17 34   # páginas como imagen
$E050_TRABAJO/venv/bin/python -I herramientas/recorte.py fig04 17 118 98 420 297 200   # recorte en puntos PDF (489 × 780)
HOJAS=/ruta/hojas $E050_TRABAJO/venv/bin/python -I herramientas/hojas.py
```

## Límites conocidos

- **Versión**: es la E.050 de 2018. La de 2006 (DS N° 011-2006-VIVIENDA, artículos 1 a 33) no se usó. Según la disposición transitoria de la RM, la de 2006 sigue rigiendo para los proyectos que ya tenían expediente aprobado o licencia solicitada al entrar en vigencia la de 2018.
- **Figuras como texto**: los artículos `Figura N` traen los rótulos de la figura, no la figura. Las Figuras 11, 16, 17 y 18 (curvas y gráficas de ensayo) quedan solo con su título.
- **Erratas de la propia norma**: hay remisiones internas equivocadas y alguna incoherencia (lista en `docs/revision-e050.md`). El texto se dejó tal como está en el PDF. Las tarjetas afectadas lo explican en `explicacion`.
- **Revisión pendiente**: es contenido para revisión editorial. Antes de publicar, un ingeniero debe revisar cada tarjeta contra la norma.
