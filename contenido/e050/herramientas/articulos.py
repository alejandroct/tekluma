"""Artículos de la E.050 (2018) con su página, a partir del texto de extraer.py.

Uso: E050_TRABAJO=carpeta python -I articulos.py   → escribe {E050_TRABAJO}/articulos.json

Numeración:
- «6», «6.2.1»: artículos y numerales de la norma.
- «15.3.2 c)», «32.3.4 c)», «39.11.7 f)»: literales de los tres numerales más largos, para que la
  cita lleve la página correcta.
- «Tabla 8», «Figura 5»: tablas y figuras, transcritas a mano desde la imagen (transcripciones.py).
- «Anexo II.4.3»: numerales de los anexos.
El texto de las tablas, figuras y fórmulas se quita del flujo del artículo (CORTES) y se escribe a
mano en transcripciones.py, leído de la imagen de la página.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from transcripciones import CABECERA, CORTES, NO_SON_NUMERALES, NUMEROS_ERRADOS, EPIGRAFES, NO_EPIGRAFE, TITULO_EN_LINEA, INICIO, PARCHES, PRIMERA, TABLAS_FIGURAS, TEXTOS, ULTIMA

S = os.environ["E050_TRABAJO"]
LITERALES = {"15.3.2", "32.3.4", "39.11.7"}   # numerales que se parten por literal a), b)…

def tupla(n):
    return tuple(int(x) for x in n.split("."))

# Restos de fórmulas: la fuente Cambria Math sale como caracteres de otros alfabetos o como letras sueltas.
BASURA = re.compile(r"[\u0180-\u024f\u0500-\u1fff\u2c00-\ufaff]")
def limpiar(l):
    """Quita las palabras con restos de fórmula; devuelve '' si la línea entera es basura."""
    l = l.strip()
    if BASURA.search(l):
        l = " ".join(w for w in l.split() if not BASURA.search(w))
        l = re.sub(r"\s*[\x00-\x08\x0b-\x1f]\s*", " ", l).strip()
    corta = len(l) <= 4 and not l.endswith(".") and l not in ("-", "•", "−") and not re.fullmatch(r"[A-ZÁÉÍÓÚa-záéíóúñ][a-záéíóúñ]{3}", l)
    return "" if corta else l

lineas = []   # (página, línea)
empezo = False
for pag in range(PRIMERA, ULTIMA + 1):
    crudas = [l.rstrip() for l in open(f"{S}/texto/p{pag:03}.txt") if l.strip()]
    while crudas and any(re.match(c, crudas[0].strip()) for c in CABECERA):   # cabecera de la página
        crudas.pop(0)
    if not empezo:   # se salta la resolución y el índice
        k = next((k for k, l in enumerate(crudas) if re.match(INICIO, l.strip())), None)
        if k is None: continue
        crudas = crudas[k:]; empezo = True
    # cortes de tablas, figuras y fórmulas (se transcriben a mano)
    for p, ini, fin in CORTES:
        if p != pag: continue
        i = next(k for k, l in enumerate(crudas) if re.search(ini, l))
        j = next((k for k in range(i + 1, len(crudas)) if re.search(fin, crudas[k])), len(crudas)) if fin else len(crudas)
        del crudas[i:j]
    lineas += [(pag, x) for x in map(limpiar, crudas) if x]

art_re = re.compile(r"^Artículo (\d+)(?:\.-|\.)\s*([A-ZÁÉÍÓÚ].*)$")
num_re = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){1,3})\.?(?:\s+(.*))?$")
lit_re = re.compile(r"^([a-g])\)\s+(.*)$")
anexo_re = re.compile(r"^ANEXO (I{1,3})\s*$")
anx_num_re = re.compile(r"^(\d(?:\.\d{1,2})?)\.?(?:\s+(.*))?$")

articulos = []; actual = None; art = None; ultimo = None; anexo = None; capitulo_txt = False
def nuevo(numero, pagina, primera=None, epigrafe=None):
    global actual
    actual = {"numero": numero, "pagina": pagina, "lineas": [primera] if primera else [], "epigrafe": epigrafe}
    articulos.append(actual)

for pag, l in lineas:
    if l.startswith("CAPÍTULO") or l in ("DISPOSICIONES GENERALES", "ESTUDIOS", "ANÁLISIS DE LAS CONDICIONES DE CIMENTACIÓN",
                                         "CIMENTACIONES SUPERFICIALES", "CIMENTACIONES PROFUNDAS", "PROBLEMAS ESPECIALES DE CIMENTACIÓN"):
        continue
    m = anexo_re.match(l)
    if m:
        anexo = m.group(1); nuevo(f"Anexo {anexo}", pag); continue
    if anexo:
        m = anx_num_re.match(l)
        if anexo != "I" and m and (m.group(2) is None or m.group(2)[:1].isupper()):
            n = m.group(1); previo = actual["numero"].split(".", 1)[-1] if "." in actual["numero"] else "0"
            if tupla(n) > tupla(previo):
                nuevo(f"Anexo {anexo}.{n}", pag, m.group(2)); continue
        actual["lineas"].append(l); continue
    m = art_re.match(l)
    if m and (art is None or int(m.group(1)) == int(art) + 1):
        art = m.group(1); nuevo(art, pag, epigrafe=m.group(2).strip(" .-")); ultimo = None; continue
    m = num_re.match(l)
    if m and m.group(1) in NUMEROS_ERRADOS:   # numeración errada en el impreso (ver transcripciones.py)
        l = NUMEROS_ERRADOS[m.group(1)] + l[len(m.group(1)):]; m = num_re.match(l)
    if m and m.group(1) in NO_SON_NUMERALES: m = None
    if m and art and m.group(1).split(".")[0] == art and (ultimo is None or tupla(m.group(1)) > tupla(ultimo)):
        ultimo = m.group(1); nuevo(ultimo, pag, m.group(2)); continue
    base = actual["numero"].split(" ")[0] if actual else None
    m = lit_re.match(l)
    if m and base in LITERALES:
        nuevo(f"{base} {m.group(1)})", pag, epigrafe=None, primera=l); continue
    if actual: actual["lineas"].append(l)

VINETA = re.compile(r"^([a-z]-?\d?\)|[a-z]\.\s|\(\d+\)|[-•−]\s|\*|Donde|NOTA|Nota|Ref\.|Referencia|n nunca|Cuando se conozca|Siendo)")
def unir(lineas):
    parrafos = []
    pendiente = None
    for l in lineas:
        if l in ("-", "•", "−"):
            pendiente = "- "; continue
        if pendiente:
            parrafos.append(pendiente + l); pendiente = None; continue
        if not parrafos or VINETA.match(l):
            parrafos.append(l); continue
        prev = parrafos[-1]
        if (re.search(r"[a-záéíóúñ]-$", prev) and l[:1].islower()) or prev.endswith("/"):
            parrafos[-1] = prev + l
        else:
            parrafos[-1] = prev + " " + l
    return "\n".join(re.sub(r"\s+", " ", p).strip() for p in parrafos)

salida = []
for a in articulos:
    ls = [x for x in a["lineas"] if x]
    epigrafe = a["epigrafe"]
    literal = " " in a["numero"] and not a["numero"].startswith(("Anexo", "Tabla", "Figura"))
    if literal:
        epigrafe = re.sub(r"^[a-g]\)\s+", "", ls.pop(0)).rstrip(" .:")
    elif a["numero"] in TITULO_EN_LINEA:
        epigrafe = " ".join(ls.pop(0) for _ in range(TITULO_EN_LINEA[a["numero"]]))
    elif not epigrafe and ls and a["numero"] not in NO_EPIGRAFE and not a["numero"].startswith("5.") and len(ls[0]) < 75 and not ls[0].endswith((".", ":", ";", ",")):
        if len(ls) > 1 and (ls[1][:1].isupper() or ls[1][:1] in "(“" or re.match(r"^[a-z]\)\s", ls[1])) and not re.match(r"^([a-z]-?\d?\)|[-•−]\s)", ls[0]):
            epigrafe = ls.pop(0)
        elif len(ls) == 1 and not re.search(r"[:\d]", ls[0]):
            epigrafe = ls[0]
    texto = unir(ls) or epigrafe or a["numero"]
    texto = re.sub(r"\b(m[23]) ([,.;])", r"\1\2", texto)   # espacio que deja el superíndice de m²/m³
    salida.append({"numero": a["numero"], **({"epigrafe": epigrafe.rstrip(" .:")} if epigrafe else {}), "texto": texto, "pagina": a["pagina"]})

# textos y parches leídos de la imagen (fórmulas, caracteres que el texto plano pierde)
por_num = {a["numero"]: a for a in salida}
for numero, texto in TEXTOS.items():
    por_num[numero]["texto"] = texto.strip()
for numero, cambios in PARCHES.items():
    for viejo, nuevo_txt in cambios:
        assert viejo in por_num[numero]["texto"], (numero, viejo)
        por_num[numero]["texto"] = por_num[numero]["texto"].replace(viejo, nuevo_txt)

for numero, epigrafe in EPIGRAFES.items():
    if numero in por_num: por_num[numero]["epigrafe"] = epigrafe
for a in salida:
    if a["numero"].startswith("Anexo") and a.get("epigrafe", "").isupper():
        a["epigrafe"] = a["epigrafe"].capitalize()

# tablas y figuras: se insertan después del numeral que las presenta
for t in TABLAS_FIGURAS:
    despues = t.pop("despues_de")
    i = next((k for k, a in enumerate(salida) if a["numero"] == despues), None)
    if i is None: print("falta", despues, "para", t["numero"]); salida.append(t); continue
    salida.insert(i + 1, t)

vistos = set()
for a in salida:
    assert a["numero"] not in vistos, a["numero"]; vistos.add(a["numero"])
json.dump(salida, open(f"{S}/articulos.json", "w"), ensure_ascii=False, indent=1)
if os.environ.get("E050_ESCRIBIR_00"):   # escribe también contenido/e050/00-e050-articulos.json
    from norma import NORMA, FUENTE
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(f"{raiz}/00-e050-articulos.json", "w") as f:
        json.dump({"formato": "tekluma-mazos/1", "norma": NORMA, "fuente": FUENTE, "articulos": salida, "mazos": []}, f, ensure_ascii=False, indent=1)
print(len(salida), "artículos")
