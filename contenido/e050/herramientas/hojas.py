"""Hojas de revisión: imagen + pregunta + opciones (correcta marcada) + respuesta + cita, una por tarjeta con figura.
Uso: HOJAS=carpeta python -I hojas.py"""
import json, glob, base64, pymupdf, os
OUT = os.environ["HOJAS"]
n = 0
for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "0[1-9]*.json"))):
    for i, t in enumerate(json.load(open(f))["mazos"][0]["tarjetas"]):
        c = t["contenido"]
        if "imagenUrl" not in c: continue
        img = base64.b64decode(c["imagenUrl"].split(",", 1)[1])
        doc = pymupdf.open(); pg = doc.new_page(width=600, height=900)
        pix = pymupdf.Pixmap(img); w, h = pix.width, pix.height; esc = min(560 / w, 420 / h)
        pg.insert_image(pymupdf.Rect(20, 20, 20 + w * esc, 20 + h * esc), stream=img)
        txt = f"{os.path.basename(f)[:2]} · tarjeta {i} · {c['tipo']}\n\nPREGUNTA: {c['pregunta']}\n\n"
        if c["tipo"] == "opcion_multiple":
            txt += "\n".join(("✔ " if k == c["correcta"] else "   ") + o for k, o in enumerate(c["opciones"])) + "\n\n"
        else:
            txt += f"RESPUESTA: {c['respuesta']}\n\n"
        if c.get("explicacion"): txt += f"EXPLICACIÓN: {c['explicacion']}\n\n"
        txt += "CITA: " + " / ".join(f"[{x['articulo']}] {x['extracto']}" for x in t["citas"])
        pg.insert_textbox(pymupdf.Rect(20, 30 + h * esc, 580, 890), txt, fontsize=10, fontname="helv")
        pg.get_pixmap(dpi=90).save(f"{OUT}/hoja{n:02}.png"); n += 1
print(n, "hojas")
