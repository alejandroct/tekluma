# E.060 Concreto Armado · archivos de importación

Fuente: **Norma E.060 Concreto Armado, DS N° 010-2009-VIVIENDA** (PDF oficial de 227 páginas).
Formato: `tekluma-mazos/1` (ver `packages/shared/src/importacion.ts`). Se cargan en el panel editorial → **Importar**.

| Archivo | Contenido |
|---|---|
| `00-e060-articulos.json` | Los 1 621 artículos de los 22 capítulos, con texto literal y página del PDF. Sin mazos. |
| `01-requisitos-generales.json` | Cap. 1 · 23 tarjetas, 16 de opción múltiple (alcance, responsabilidades, planos, Cuaderno de Obra) |
| `02-definiciones.json` | Cap. 2 · 57 tarjetas, 42 de opción múltiple; 11 con figura de otros capítulos para la notación (ℓdg, Aoh, Aj, A2, hx…) |
| `03-materiales.json` | Cap. 3 · 44 tarjetas, 31 de opción múltiple |
| `04-durabilidad.json` | Cap. 4 · 36 tarjetas, 23 de opción múltiple (Tablas 4.1 a 4.5) |
| `05-calidad-concreto.json` | Cap. 5 · 51 tarjetas, 31 de opción múltiple (f′cr y Tablas 5.1 a 5.3, muestreo, aceptación, núcleos, curado) |
| `06-encofrados-juntas.json` | Cap. 6 · 32 tarjetas, 18 de opción múltiple (desencofrado, tuberías embebidas, juntas de construcción) |
| `07-detalles-refuerzo.json` | Cap. 7 · 80 tarjetas, 58 de opción múltiple, con la Fig. 7.1, un estribo a 135° y la Fig. 7.2 |
| `08-analisis-diseno.json` | Cap. 8 · 65 tarjetas, 39 de opción múltiple (coeficientes aproximados, redistribución, Ec, vigas T, aligerados; Fig. 8.4.1) |
| `09-resistencia-servicio.json` | Cap. 9 · 85 tarjetas, 55 de opción múltiple (combinaciones, φ, Tabla 9.1, Tabla 9.2, Fig. 9.6.2.5, casos numéricos) |
| `10-flexion-carga-axial.json` | Cap. 10 · 105 tarjetas, 59 de opción múltiple (bloque equivalente, β1, φPn máx., acero mínimo, columnas, esbeltez, Fig. 10.17.1, flexión biaxial) |
| `11-cortante-torsion.json` | Cap. 11 · 120 tarjetas, 64 de opción múltiple (Vc, Vs, estribos, torsión, fricción, muros, punzonamiento; Figs. 11.5.8, 11.6.1, 11.6.2.1, 11.6.2.2 y 11.6.3) |
| `12-desarrollo-empalmes.json` | Cap. 12 · 91 tarjetas, 55 de opción múltiple (Tablas 12.1 a 12.3, ganchos, corte de barras, empalmes; Figs. 12.2.2, 12.5.2 y 12.5.3.a) |
| `13-losas-dos-direcciones.json` | Cap. 13 · 79 tarjetas, 48 de opción múltiple (franjas, Método Directo, γf, Método de Coeficientes; Tabla 13.1) |
| `14-muros.json` | Cap. 14 · 33 tarjetas, 20 de opción múltiple (refuerzo mínimo, método empírico, espesores, aberturas) |
| `15-zapatas.json` | Cap. 15 · 41 tarjetas, 24 de opción múltiple (presiones, secciones críticas, γs, pilotes, dowels) |
| `16-prefabricado.json` | Cap. 16 · 33 tarjetas, 24 de opción múltiple (integridad, amarres, longitudes de apoyo) |
| `17-elementos-compuestos.json` | Cap. 17 · 25 tarjetas, 17 de opción múltiple (cortante horizontal, estribos de conexión) |
| `18-preesforzado.json` | Cap. 18 · 72 tarjetas, 46 de opción múltiple (Clases U y T, esfuerzos admisibles, fricción, fps, refuerzo adherido, ductos) |
| `19-cascaras.json` | Cap. 19 · 26 tarjetas, 18 de opción múltiple (materiales, refuerzo, anclajes y empalmes) |
| `20-evaluacion-existentes.json` | Cap. 20 · 30 tarjetas, 20 de opción múltiple (φ máximos, prueba de carga, criterios de deflexión) |
| `21-diseno-sismico.json` | Cap. 21 · 131 tarjetas, 69 de opción múltiple (vigas, columnas y nudos por sistema, columna fuerte, muros y elementos de borde, ductilidad limitada; 11 figuras) |
| `22-concreto-simple.json` | Cap. 22 · 45 tarjetas, 27 de opción múltiple (límites de uso, Mn, Pn, Vn, muros, zapatas, concreto ciclópeo) |

Los 22 capítulos tienen mazo (1304 tarjetas: 804 de opción múltiple, la base de la pregunta del día y los duelos, y 118 con figura o tabla del PDF). Orden sugerido: primero `00` (carga toda la norma como fuente), luego los capítulos; cada mazo se ubica en el catálogo según su número de capítulo (`orden` = 100 + capítulo). Cada archivo de capítulo trae también sus artículos, así que se puede importar solo.

## Cómo se hicieron

1. **Texto literal y páginas**: se extrae del PDF con PyMuPDF. Las letras griegas y símbolos del PDF vienen en la fuente «Symbol» de Windows (φ, ≥, λ…) y se traducen carácter por carácter.
2. **Tablas, fórmulas y figuras**: se leen en la imagen de cada página (el texto plano las desordena) y se escriben a mano en las tarjetas.
3. **Figuras**: se recortan del PDF original como JPEG y van embebidas en la tarjeta (`data:image/jpeg;base64,…`): viajan dentro del paquete del mazo y se cifran con él en el dispositivo.
4. **Fuente**: cada tarjeta cita su artículo con un extracto literal; la app muestra «E.060 · ART. 7.1.2 · PÁG. 46».
5. **Revisión hoja por hoja**: cada capítulo se revisó leyendo la imagen de cada página contra todas sus tarjetas (noviembre de 2026). `herramientas/chequeo.py` comprueba que los extractos estén en el texto del artículo; las diferencias que quedan son fórmulas transcritas desde la imagen.

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

**Límites conocidos de la extracción**: algunos artículos salían cortados o con fórmulas desordenadas cuando la línea llevaba ℓ o una fórmula. `generar.py` los corrige con `PARCHES` y `TEXTOS_CORREGIDOS`, leídos de la página. Las Tablas 13.1 a 13.3 se muestran como imagen en las tarjetas. La Fig. 21.4.3a no existe en el PDF oficial (la página solo trae el rótulo).

**Importante**: es contenido para revisión editorial. Antes de publicar, un ingeniero debe revisar cada tarjeta contra la norma.
