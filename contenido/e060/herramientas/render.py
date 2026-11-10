import os
import pymupdf, sys
doc=pymupdf.open("/Users/alejandrocabreratavara/Downloads/55 E.060 CONCRETO ARMADO DS N° 010-2009.pdf")
for n in map(int, sys.argv[1:]):
    pix=doc[n-1].get_pixmap(dpi=110)
    pix.save(f"/private/tmp/claude-501/e060/paginas/p{n:03}.png")
print("ok")
