"""Publica las páginas del PDF oficial como imágenes livianas para el lector de normas.

Uso: paginas_web.py <pdf> <carpeta_salida>   (escribe p001.jpg, p002.jpg, …)
Escala de grises a 96 ppp: el texto se lee bien en el teléfono y cada página pesa ~70 KB.
"""
import sys, pymupdf

pdf, salida = sys.argv[1], sys.argv[2]
doc = pymupdf.open(pdf)
for i, pagina in enumerate(doc, start=1):
    pix = pagina.get_pixmap(dpi=96, colorspace=pymupdf.csGRAY)
    pix.save(f"{salida}/p{i:03}.jpg", jpg_quality=40)
print(len(doc), "páginas")
