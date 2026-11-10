import pymupdf, os, collections
F="/Users/alejandrocabreratavara/Downloads/55 E.060 CONCRETO ARMADO DS N° 010-2009.pdf"
S=os.environ.get("E060_TRABAJO", "/private/tmp/claude-501/e060")
griego="αβχδεφγηιϕκλμνοπθρστυϖωξψζ"; GRIEGO="ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ"
SYMBOL={chr(0x61+i):griego[i] for i in range(26)}|{chr(0x41+i):GRIEGO[i] for i in range(26)}|{
 "\xa3":"≤","\xb3":"≥","\xb1":"±","\xb4":"×","\xb8":"÷","\xa2":"′","\xb2":"″","\xd6":"√","\xa5":"∞","\xb0":"°",
 "\xe5":"Σ","\xb9":"≠","\xbb":"≈","\xae":"→","\xd7":"·","\xb7":"•","\xa0":" ","\x2d":"−","\xbc":"…","\xf2":"∫","\xb6":"∂","\xc6":"∅","\xe6":"(","\xe8":"(","\xf6":")","\xf8":")","\xe7":"","\xf7":"","\xe9":"[","\xeb":"[","\xf9":"]","\xfb":"]","\xea":"","\xfa":""}
MTEXTRA={"l":"ℓ","\x5f":"‿"}
desconocidos=collections.Counter()
def mapear(ch,fuente):
    o=ord(ch)
    if 0xF000<=o<=0xF0FF:
        ch=chr(o-0xF000)
        if "MT Extra" not in fuente: fuente="Symbol"   # glifo de Symbol dibujado con otra fuente
    elif "Symbol" not in fuente and "MT Extra" not in fuente: return ch
    if "Symbol" in fuente:
        if ch in SYMBOL: return SYMBOL[ch]
        if ch.isascii() and not ch.isalpha(): return ch
    if "MT Extra" in fuente:
        if ch in MTEXTRA: return MTEXTRA[ch]
    desconocidos[(fuente,hex(ord(ch)))]+=1
    return ch
doc=pymupdf.open(F)
for i,p in enumerate(doc):
    lineas=[]
    for b in p.get_text("rawdict", flags=pymupdf.TEXTFLAGS_RAWDICT | pymupdf.TEXT_ACCURATE_SIDE_BEARINGS)["blocks"]:
        for l in b.get("lines",[]):
            lineas.append("".join(mapear(c["c"],s["font"]) for s in l["spans"] for c in s["chars"]))
        lineas.append("")
    open(f"{S}/texto/p{i+1:03}.txt","w").write("\n".join(lineas))
print(desconocidos.most_common(15))
