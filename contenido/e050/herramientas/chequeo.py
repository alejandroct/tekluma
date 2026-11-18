"""Comprueba que cada extracto citado aparezca literalmente en el texto de su artículo (00-e050-articulos.json).
Los tramos se pueden unir con «…». Uso: python3 contenido/e050/herramientas/chequeo.py"""
import json, glob, os, re, unicodedata
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def norm(s):
    s = unicodedata.normalize("NFC", s)
    for a, b in [("’", "'"), ("′", "'"), ("´", "'"), ("”", '"'), ("″", '"'), ("“", '"'), ("º", "°"), ("–", "-"), ("−", "-")]:
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s.replace("|", " ")).strip()
A = {a["numero"]: norm(a["texto"]) for a in json.load(open(D + "/00-e050-articulos.json"))["articulos"]}
malos = 0
for f in sorted(glob.glob(D + "/0[1-9]*.json")):
    for i, t in enumerate(json.load(open(f))["mazos"][0]["tarjetas"]):
        for c in t["citas"]:
            txt = A[c["articulo"]]
            for seg in norm(c["extracto"]).split("…"):
                seg = seg.strip(" .")
                if len(seg) > 3 and seg not in txt:
                    malos += 1; print(os.path.basename(f)[:2], i, c["articulo"], "|", seg[:120]); break
print("no literales:", malos)
