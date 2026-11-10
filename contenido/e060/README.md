# E.060 Concreto Armado · archivos de importación

Fuente: **Norma E.060 Concreto Armado, DS N° 010-2009-VIVIENDA** (PDF oficial de 227 páginas).
Formato: `tekluma-mazos/1` (ver `packages/shared/src/importacion.ts`). Se cargan en el panel editorial → **Importar**.

| Archivo | Contenido |
|---|---|
| `00-e060-articulos.json` | Los 1 621 artículos de los 22 capítulos, con texto literal y página del PDF. Sin mazos. |
| `03-materiales.json` | Cap. 3 · 19 tarjetas |
| `04-durabilidad.json` | Cap. 4 · 17 tarjetas (Tablas 4.1 a 4.5) |
| `07-detalles-refuerzo.json` | Cap. 7 · 31 tarjetas, con la Fig. 7.1, un estribo a 135° y la Fig. 7.2 |
| `09-resistencia-servicio.json` | Cap. 9 · 35 tarjetas (combinaciones, φ, Tabla 9.1, Tabla 9.2, Fig. 9.6.2.5, casos numéricos) |
| `10-flexion-carga-axial.json` | Cap. 10 · 54 tarjetas (bloque equivalente, β1, φPn máx., acero mínimo, columnas, esbeltez, Fig. 10.17.1, flexión biaxial) |
| `11-cortante-torsion.json` | Cap. 11 · 61 tarjetas (Vc, Vs, estribos, torsión, fricción, muros, punzonamiento; Figs. 11.5.8, 11.6.1, 11.6.2.1, 11.6.2.2 y 11.6.3) |
| `12-desarrollo-empalmes.json` | Cap. 12 · 39 tarjetas (Tablas 12.1 a 12.3, ganchos, corte de barras, empalmes; Figs. 12.2.2, 12.5.2 y 12.5.3.a) |
| `21-diseno-sismico.json` | Cap. 21 · 65 tarjetas (vigas, columnas y nudos por sistema, columna fuerte, muros y elementos de borde, ductilidad limitada; 11 figuras) |

Orden sugerido: primero `00` (carga toda la norma como fuente), luego los capítulos. Cada archivo de capítulo trae también sus artículos, así que se puede importar solo.

## Cómo se hicieron

1. **Texto literal y páginas**: se extrae del PDF con PyMuPDF. Las letras griegas y símbolos del PDF vienen en la fuente «Symbol» de Windows (φ, ≥, λ…) y se traducen carácter por carácter.
2. **Tablas, fórmulas y figuras**: se leen en la imagen de cada página (el texto plano las desordena) y se escriben a mano en las tarjetas.
3. **Figuras**: se recortan del PDF original como JPEG y van embebidas en la tarjeta (`data:image/jpeg;base64,…`): viajan dentro del paquete del mazo y se cifran con él en el dispositivo.
4. **Fuente**: cada tarjeta cita su artículo con un extracto literal; la app muestra «E.060 · ART. 7.1.2 · PÁG. 46».

Para un concepto importante hay varias tarjetas de distinto tipo (concepto, opción múltiple, completar, tabla, caso numérico con valores aleatorios, imagen), para que se aprenda desde varios ángulos.

## Regenerar o seguir con otros capítulos

En `herramientas/` están los scripts (Python 3 + `pymupdf`):

```bash
python3 -m venv /tmp/e060/venv && /tmp/e060/venv/bin/pip install pymupdf
export E060_TRABAJO=/tmp/e060   # carpeta de trabajo (texto/, paginas/, figuras/)
/tmp/e060/venv/bin/python herramientas/extraer.py     # texto por página (ajusta la ruta del PDF dentro)
/tmp/e060/venv/bin/python herramientas/articulos.py   # artículos con página
/tmp/e060/venv/bin/python herramientas/render.py 46 47  # páginas como imagen para leer tablas y figuras
/tmp/e060/venv/bin/python herramientas/generar.py     # escribe los JSON de esta carpeta
```

Herramientas nuevas: `recorte.py nombre página x0 y0 x1 y1` recorta una figura vectorial por coordenadas (puntos PDF).

Para generar capítulos nuevos con Claude, ver `docs/generar-mazos.md`.

**Límites conocidos de la extracción**: unos 25 artículos (de 1 621) empiezan cortados cuando la línea lleva una fórmula en la misma altura (por ejemplo 11.1.2 «√f′c usados…»). Las tarjetas no se ven afectadas, porque sus extractos se escriben leyendo la imagen de la página. La Fig. 21.4.3a no existe en el PDF oficial (la página solo trae el rótulo).

**Importante**: es contenido para revisión editorial. Antes de publicar, un ingeniero debe revisar cada tarjeta contra la norma.
