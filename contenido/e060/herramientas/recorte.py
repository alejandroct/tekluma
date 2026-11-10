"""Recorta una zona de una página del PDF como JPEG: python recorte.py nombre página x0 y0 x1 y1 [dpi]
Coordenadas en puntos PDF (la página mide 612 × 792; en las imágenes de render.py, 1 pt ≈ 1,5 px)."""
import os, sys
import pymupdf

S = os.environ.get("E060_TRABAJO", "/private/tmp/claude-501/e060")
doc = pymupdf.open("/Users/alejandrocabreratavara/Downloads/55 E.060 CONCRETO ARMADO DS N° 010-2009.pdf")
nombre, pagina, *caja = sys.argv[1:7]
dpi = int(sys.argv[7]) if len(sys.argv) > 7 else 170
pix = doc[int(pagina) - 1].get_pixmap(dpi=dpi, clip=pymupdf.Rect(*map(float, caja)))
ruta = f"{S}/figuras/{nombre}.jpg"
pix.save(ruta, jpg_quality=72)
print(nombre, pix.width, "x", pix.height, os.path.getsize(ruta) // 1024, "KB")
