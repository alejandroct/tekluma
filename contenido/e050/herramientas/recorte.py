"""Recorta una zona de una página del PDF como JPEG: python -I recorte.py nombre página x0 y0 x1 y1 [dpi]
Coordenadas en puntos PDF (la página A4 mide 595 × 842)."""
import os, sys
import pymupdf

S = os.environ["E050_TRABAJO"]
doc = pymupdf.open(os.environ.get("E050_PDF", "/Users/alejandrocabreratavara/Downloads/Norma E.050 Suelos y cimentaciones.pdf"))
nombre, pagina, *caja = sys.argv[1:7]
dpi = int(sys.argv[7]) if len(sys.argv) > 7 else 170
pix = doc[int(pagina) - 1].get_pixmap(dpi=dpi, clip=pymupdf.Rect(*map(float, caja)))
os.makedirs(f"{S}/figuras", exist_ok=True)
ruta = f"{S}/figuras/{nombre}.jpg"
pix.save(ruta, jpg_quality=72)
print(nombre, pix.width, "x", pix.height, os.path.getsize(ruta) // 1024, "KB")
