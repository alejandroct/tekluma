"""Páginas como imagen para leer tablas, fórmulas y figuras: python -I render.py 12 13 [--dpi 130]"""
import os, sys, pymupdf
F=os.environ.get("E050_PDF","/Users/alejandrocabreratavara/Downloads/Norma E.050 Suelos y cimentaciones.pdf")
S=os.environ["E050_TRABAJO"]; os.makedirs(f"{S}/paginas",exist_ok=True)
doc=pymupdf.open(F)
dpi=int(os.environ.get("DPI","110"))
for n in map(int, sys.argv[1:]):
    doc[n-1].get_pixmap(dpi=dpi).save(f"{S}/paginas/p{n:03}.png")
print("ok")
