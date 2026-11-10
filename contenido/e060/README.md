# E.060 Concreto Armado · archivos de importación

Fuente: **Norma E.060 Concreto Armado, DS N° 010-2009-VIVIENDA** (PDF oficial de 227 páginas).
Formato: `tekluma-mazos/1` (ver `packages/shared/src/importacion.ts`). Se cargan en el panel editorial → **Importar**.

| Archivo | Contenido |
|---|---|
| `00-e060-articulos.json` | Los 1 595 artículos de los 22 capítulos, con texto literal y página del PDF. Sin mazos. |
| `03-materiales.json` | Cap. 3 · 19 tarjetas |
| `04-durabilidad.json` | Cap. 4 · 17 tarjetas (Tablas 4.1 a 4.5) |
| `07-detalles-refuerzo.json` | Cap. 7 · 31 tarjetas, con la Fig. 7.1, un estribo a 135° y la Fig. 7.2 |
| `09-resistencia-servicio.json` | Cap. 9 · 35 tarjetas (combinaciones, φ, Tabla 9.1, Tabla 9.2, Fig. 9.6.2.5, casos numéricos) |

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

Para generar capítulos nuevos con Claude, ver `docs/generar-mazos.md`.

**Importante**: es contenido para revisión editorial. Antes de publicar, un ingeniero debe revisar cada tarjeta contra la norma.
