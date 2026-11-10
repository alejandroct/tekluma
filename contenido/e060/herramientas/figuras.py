import pymupdf, base64
doc=pymupdf.open("/Users/alejandrocabreratavara/Downloads/55 E.060 CONCRETO ARMADO DS N° 010-2009.pdf")
def union(pno):
    p=doc[pno-1]; r=None
    for img in p.get_images(full=True):
        for rect in p.get_image_rects(img[0]):
            r=rect if r is None else r|rect
    return p, r
for nombre,pno,pad in (("fig-7-1",46,6),("fig-7-2",47,6),("fig-9-6-2-5",68,6)):
    p,r=union(pno)
    print(nombre,pno,r)
import os
for nombre,pno in (("fig-7-1",46),("fig-7-2",47),("fig-9-6-2-5",68)):
    p,r=union(pno)
    clip=pymupdf.Rect(r.x0-6,r.y0-6,r.x1+6,r.y1+6)
    pix=p.get_pixmap(dpi=170,clip=clip)
    ruta=f"/private/tmp/claude-501/e060/figuras/{nombre}.jpg"
    pix.save(ruta, jpg_quality=72)
    print(nombre, pix.width,"x",pix.height, os.path.getsize(ruta)//1024,"KB")
