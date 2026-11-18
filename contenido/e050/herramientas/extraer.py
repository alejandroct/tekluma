"""Texto por página de la E.050 con los símbolos de la fuente «Symbol» traducidos.
Uso: E050_PDF=ruta.pdf E050_TRABAJO=carpeta python -I extraer.py"""
import pymupdf, os, collections, re
F=os.environ.get("E050_PDF","/Users/alejandrocabreratavara/Downloads/E.050 Suelos y Cimentaciones 2018.pdf")
S=os.environ["E050_TRABAJO"]
griego="αβχδεφγηιϕκλμνοπθρστυϖωξψζ"; GRIEGO="ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ"
SYMBOL={chr(0x61+i):griego[i] for i in range(26)}|{chr(0x41+i):GRIEGO[i] for i in range(26)}|{
 "\xa3":"≤","\xb3":"≥","\xb1":"±","\xb4":"×","\xb8":"÷","\xa2":"′","\xb2":"″","\xd6":"√","\xa5":"∞","\xb0":"°",
 "\xe5":"Σ","\xb9":"≠","\xbb":"≈","\xae":"→","\xd7":"·","\xb7":"•","\xa0":" ","\x2d":"−","\xbc":"…","\xf2":"∫","\xb6":"∂","\xc6":"∅","\xe6":"(","\xe8":"(","\xf6":")","\xf8":")","\xe7":"","\xf7":"","\xe9":"[","\xeb":"[","\xf9":"]","\xfb":"]","\xea":"","\xfa":""}
LIGADURAS={"ﬁ":"fi","ﬂ":"fl","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ƒ":"f"}   # ƒ: la f cursiva de Df y fy
MTEXTRA={"l":"ℓ","\x5f":"‿"}
desconocidos=collections.Counter(); simbolos=collections.Counter()
def mapear(ch,fuente):
    o=ord(ch)
    if 0xF000<=o<=0xF0FF:
        ch=chr(o-0xF000)
        if "MT Extra" not in fuente: fuente="Symbol"
    elif "Symbol" not in fuente and "MT Extra" not in fuente: return ch
    if "Symbol" in fuente:
        if ch in SYMBOL: simbolos[SYMBOL[ch]]+=1; return SYMBOL[ch]
        if ch.isascii() and not ch.isalpha(): return ch
    if "MT Extra" in fuente and ch in MTEXTRA: return MTEXTRA[ch]
    desconocidos[(fuente,hex(ord(ch)))]+=1
    return ch
doc=pymupdf.open(F)
os.makedirs(f"{S}/texto",exist_ok=True)
for i,p in enumerate(doc):
    lineas=[]
    for b in p.get_text("rawdict", flags=pymupdf.TEXTFLAGS_RAWDICT | pymupdf.TEXT_ACCURATE_SIDE_BEARINGS)["blocks"]:
        for l in b.get("lines",[]):
            lineas.append("".join(mapear(c["c"],s["font"]) for s in l["spans"] for c in s["chars"]))
        lineas.append("")
    texto="\n".join(lineas)
    for a,b in LIGADURAS.items(): texto=texto.replace(a,b)
    texto=re.sub(r"(f[il]) (?=[a-záéíóúñ])", r"\1", texto)   # El Peruano parte «fi»/«fl»: «Edifi caciones»
    open(f"{S}/texto/p{i+1:03}.txt","w").write(texto)
print("símbolos:",simbolos.most_common()); print("desconocidos:",desconocidos.most_common(15))
