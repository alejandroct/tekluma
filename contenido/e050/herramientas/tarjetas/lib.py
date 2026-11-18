"""Ayudas para escribir las tarjetas de la E.050. Cada cita se comprueba contra el texto del artículo.

Uso (una vez, para la primera versión): cd contenido/e050/herramientas/tarjetas && E050_TRABAJO=… python -I c01.py
OJO: los JSON de contenido/e050 son ahora la fuente. Volver a ejecutar estos scripts sobrescribe las
correcciones que se hagan en los JSON (ver README de la carpeta)."""
import json, random, re, unicodedata, base64, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FIG = os.path.join(os.environ.get("E050_TRABAJO", ""), "figuras")   # recortes de recorte.py
BASE = json.load(open(f"{RAIZ}/00-e050-articulos.json"))
ART = {a["numero"]: a for a in BASE["articulos"]}
ORDEN = [a["numero"] for a in BASE["articulos"]]

def norm(s):
    s = unicodedata.normalize("NFC", s)
    for a, b in [("’", "'"), ("′", "'"), ("´", "'"), ("”", '"'), ("″", '"'), ("“", '"'), ("º", "°"), ("–", "-"), ("−", "-")]:
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s.replace("|", " ")).strip()

def cita(articulo, extracto):
    assert articulo in ART, f"no existe el artículo {articulo}"
    txt = norm(ART[articulo]["texto"])
    for seg in norm(extracto).split("…"):
        seg = seg.strip(" .")
        assert len(seg) <= 3 or seg in txt, f"\n[{articulo}] no literal: «{seg}»"
    return {"articulo": articulo, "extracto": extracto}

def _citas(c):
    return [cita(*x) for x in (c if isinstance(c[0], tuple) else [c])]

def imagen(nombre):
    ruta = f"{FIG}/{nombre}.jpg"
    assert os.path.getsize(ruta) < 60 * 1024, f"{nombre} pesa más de 60 KB"
    return "data:image/jpeg;base64," + base64.b64encode(open(ruta, "rb").read()).decode()

def _extra(c, explicacion, img):
    if explicacion: c["explicacion"] = explicacion
    if img: c["imagenUrl"] = imagen(img)
    return c

PROHIBIDAS = {"nada", "nunca", "siempre", "ninguno", "ninguna", "sin límite", "todas las anteriores", "por costo"}
def om(pregunta, correcta, distractores, cit, explicacion=None, img=None):
    assert len(distractores) == 3, pregunta
    assert not pregunta.rstrip().endswith("…") and pregunta.rstrip().endswith("?"), pregunta
    ops = [correcta] + list(distractores)
    assert len(set(ops)) == 4, pregunta
    for o in ops: assert o.lower().strip(" .") not in PROHIBIDAS, o
    rnd = random.Random(pregunta); rnd.shuffle(ops)
    c = {"tipo": "opcion_multiple", "pregunta": pregunta, "opciones": ops, "correcta": ops.index(correcta)}
    return {"contenido": _extra(c, explicacion, img), "citas": _citas(cit)}

def con(pregunta, respuesta, cit, explicacion=None, img=None):
    return {"contenido": _extra({"tipo": "concepto", "pregunta": pregunta, "respuesta": respuesta}, explicacion, img), "citas": _citas(cit)}

def comp(texto, cit, explicacion=None):
    assert texto.count("{{") == 1, texto
    return {"contenido": _extra({"tipo": "completar", "texto": texto}, explicacion, None), "citas": _citas(cit)}

def tab(titulo, columnas, filas, fila, columna, cit, explicacion=None):
    for f in filas: assert len(f[1]) == len(columnas), (titulo, f)
    c = {"tipo": "tabla", "titulo": titulo, "columnas": columnas,
         "filas": [{"etiqueta": e, "valores": v} for e, v in filas], "pregunta": {"fila": fila, "columna": columna}}
    return {"contenido": _extra(c, explicacion, None), "citas": _citas(cit)}

def caso(enunciado, variables, formula, unidad, cit, explicacion=None, tolerancia=0.02):
    for k in variables: assert "{" + k + "}" in enunciado, (k, enunciado)
    c = {"tipo": "caso_numerico", "enunciado": enunciado,
         "variables": {k: {"etiqueta": v[0], "valores": v[1], **({"unidad": v[2]} if len(v) > 2 and v[2] else {})} for k, v in variables.items()},
         "formula": formula, **({"unidadResultado": unidad} if unidad else {}), "tolerancia": tolerancia}
    return {"contenido": _extra(c, explicacion, None), "citas": _citas(cit)}

def img(pregunta, nombre, respuesta, cit, explicacion=None):
    c = {"tipo": "imagen", "pregunta": pregunta, "imagenUrl": imagen(nombre), "respuesta": respuesta}
    if explicacion: c["explicacion"] = explicacion
    return {"contenido": c, "citas": _citas(cit)}

def capitulo_de(numero):
    m = re.match(r"^(\d+)", numero)
    if not m: return None
    art = int(m.group(1))
    return next(c for c, ultimo in ((1, 12), (2, 16), (3, 22), (4, 30), (5, 34), (6, 39)) if art <= ultimo)

def articulos_del_capitulo(cap, tarjetas, extras=()):
    """Artículos del capítulo (con sus tablas y figuras, que van en orden después de su numeral) y los citados de otros."""
    actual = None; dentro = []
    for n in ORDEN:
        c = capitulo_de(n)
        if c is not None: actual = c
        elif n.startswith("Anexo"): actual = {"Anexo I": 1}.get(n, 2 if n.startswith(("Anexo II", "Anexo III")) else None)
        if actual == cap or n in extras: dentro.append(n)
    citados = {c["articulo"] for t in tarjetas for c in t["citas"]}
    dentro += [n for n in ORDEN if n in citados and n not in dentro]
    return [ART[n] for n in ORDEN if n in dentro]

def escribir(cap, archivo, slug, titulo, descripcion, tarjetas):
    d = {"formato": "tekluma-mazos/1", "norma": BASE["norma"], "fuente": BASE["fuente"],
         "articulos": articulos_del_capitulo(cap, tarjetas),
         "mazos": [{"slug": slug, "titulo": titulo, "descripcion": descripcion, "acceso": "free", "orden": 200 + cap, "tarjetas": tarjetas}]}
    open(f"{RAIZ}/{archivo}", "w").write(json.dumps(d, ensure_ascii=False, indent=1))
    from collections import Counter
    tipos = Counter(t["contenido"]["tipo"] for t in tarjetas)
    pos = Counter(t["contenido"]["correcta"] for t in tarjetas if t["contenido"]["tipo"] == "opcion_multiple")
    print(archivo, len(tarjetas), "tarjetas", dict(tipos), "posición correcta:", dict(sorted(pos.items())), "artículos:", len(d["articulos"]))
