# E.060 Concreto Armado · archivos de importación

Fuente: **Norma E.060 Concreto Armado, DS N° 010-2009-VIVIENDA** (PDF oficial de 227 páginas).
Formato: `tekluma-mazos/1` (ver `packages/shared/src/importacion.ts`). Se cargan en el panel editorial → **Importar**.

| Archivo | Contenido |
|---|---|
| `00-e060-articulos.json` | Los 1 621 artículos de los 22 capítulos, con texto literal y página del PDF. Sin mazos. |
| `01-requisitos-generales.json` | Cap. 1 · 8 tarjetas (alcance, responsabilidades, planos, Cuaderno de Obra) |
| `02-definiciones.json` | Cap. 2 · 16 tarjetas (glosario esencial) |
| `03-materiales.json` | Cap. 3 · 19 tarjetas |
| `04-durabilidad.json` | Cap. 4 · 17 tarjetas (Tablas 4.1 a 4.5) |
| `05-calidad-concreto.json` | Cap. 5 · 23 tarjetas (f′cr y Tablas 5.1 a 5.3, muestreo, aceptación, núcleos, curado) |
| `06-encofrados-juntas.json` | Cap. 6 · 16 tarjetas (desencofrado, tuberías embebidas, juntas de construcción) |
| `07-detalles-refuerzo.json` | Cap. 7 · 31 tarjetas, con la Fig. 7.1, un estribo a 135° y la Fig. 7.2 |
| `08-analisis-diseno.json` | Cap. 8 · 27 tarjetas (coeficientes aproximados, redistribución, Ec, vigas T, aligerados; Fig. 8.4.1) |
| `09-resistencia-servicio.json` | Cap. 9 · 35 tarjetas (combinaciones, φ, Tabla 9.1, Tabla 9.2, Fig. 9.6.2.5, casos numéricos) |
| `10-flexion-carga-axial.json` | Cap. 10 · 54 tarjetas (bloque equivalente, β1, φPn máx., acero mínimo, columnas, esbeltez, Fig. 10.17.1, flexión biaxial) |
| `11-cortante-torsion.json` | Cap. 11 · 61 tarjetas (Vc, Vs, estribos, torsión, fricción, muros, punzonamiento; Figs. 11.5.8, 11.6.1, 11.6.2.1, 11.6.2.2 y 11.6.3) |
| `12-desarrollo-empalmes.json` | Cap. 12 · 39 tarjetas (Tablas 12.1 a 12.3, ganchos, corte de barras, empalmes; Figs. 12.2.2, 12.5.2 y 12.5.3.a) |
| `13-losas-dos-direcciones.json` | Cap. 13 · 32 tarjetas (franjas, Método Directo, γf, Método de Coeficientes; Tabla 13.1) |
| `14-muros.json` | Cap. 14 · 13 tarjetas (refuerzo mínimo, método empírico, espesores, aberturas) |
| `15-zapatas.json` | Cap. 15 · 18 tarjetas (presiones, secciones críticas, γs, pilotes, dowels) |
| `16-prefabricado.json` | Cap. 16 · 10 tarjetas (integridad, amarres, longitudes de apoyo) |
| `17-elementos-compuestos.json` | Cap. 17 · 8 tarjetas (cortante horizontal, estribos de conexión) |
| `18-preesforzado.json` | Cap. 18 · 26 tarjetas (Clases U y T, esfuerzos admisibles, fricción, fps, refuerzo adherido, ductos) |
| `19-cascaras.json` | Cap. 19 · 8 tarjetas (materiales, refuerzo, anclajes y empalmes) |
| `20-evaluacion-existentes.json` | Cap. 20 · 10 tarjetas (φ máximos, prueba de carga, criterios de deflexión) |
| `21-diseno-sismico.json` | Cap. 21 · 65 tarjetas (vigas, columnas y nudos por sistema, columna fuerte, muros y elementos de borde, ductilidad limitada; 11 figuras) |
| `22-concreto-simple.json` | Cap. 22 · 19 tarjetas (límites de uso, Mn, Pn, Vn, muros, zapatas, concreto ciclópeo) |

Los 22 capítulos tienen mazo (555 tarjetas). Orden sugerido: primero `00` (carga toda la norma como fuente), luego los capítulos; cada mazo se ubica en el catálogo según su número de capítulo (`orden` = 100 + capítulo). Cada archivo de capítulo trae también sus artículos, así que se puede importar solo.

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
