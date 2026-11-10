import pymupdf, os
doc=pymupdf.open("/Users/alejandrocabreratavara/Downloads/55 E.060 CONCRETO ARMADO DS N° 010-2009.pdf")
p=doc[45]
clip=pymupdf.Rect(318,474,428,552)
pix=p.get_pixmap(dpi=220,clip=clip)
ruta="/private/tmp/claude-501/e060/figuras/estribo-135.jpg"; pix.save(ruta,jpg_quality=75)
print(pix.width,pix.height,os.path.getsize(ruta)//1024,"KB")
