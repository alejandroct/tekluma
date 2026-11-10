import re, json, glob, os
S=os.environ.get("E060_TRABAJO", "/private/tmp/claude-501/e060")
num_re=re.compile(r"^\s*(\d{1,2}(?:\.\d{1,2}){1,5})\s*$")
linea_re=re.compile(r"^\s*(\d{1,2}(?:\.\d{1,2}){2,5})\s+(\S.*)$")
def tupla(n): return tuple(int(x) for x in n.split("."))
paginas=sorted(glob.glob(f"{S}/texto/p*.txt"))
articulos=[]; actual=None; capitulo=0
def cerrar():
    if actual:
        lineas=[l.strip() for l in actual["lineas"]]
        # quitar vacías al inicio/fin
        while lineas and not lineas[0]: lineas.pop(0)
        while lineas and not lineas[-1]: lineas.pop()
        epigrafe=None
        if lineas and len(lineas[0])<90 and "…" not in lineas[0] and ".." not in lineas[0] and not lineas[0].endswith((".",":",";",",")) and (len(lineas)==1 or lineas[0][:1].isupper()):
            # título corto: sección (ej. "ALCANCE", "Requisitos Generales")
            if len(lineas)==1 or not lineas[1] or lineas[0].isupper() or len(lineas[0].split())<=8:
                epigrafe=lineas.pop(0)
        # unir párrafos: líneas vacías separan párrafos
        texto=re.sub(r"[ \t]+"," ","\n".join(lineas))
        texto=re.sub(r"\n(?!\n)"," ",texto)            # saltos simples → espacio
        texto=re.sub(r"\n{2,}","\n\n",texto).strip()
        texto=re.sub(r" +\n","\n",texto)
        texto=re.sub(r"\s*[.…]{3,}[.… ]*\s*"," … ",texto)   # líneas de puntos de los índices
        texto=re.sub(r"(?<![.:;])\n\n\s*(?=[a-záéíóúñ(])"," ",texto)   # frase cortada por salto de página
        # El título del capítulo siguiente se cuela al final del último artículo
        texto=re.sub(r"\n\n[A-ZÁÉÍÓÚÑ —-]{12,}$","",texto).strip()
        articulos.append({"numero":actual["numero"],"epigrafe":epigrafe.title() if epigrafe and epigrafe.isupper() else epigrafe,"texto":texto or (epigrafe or actual["numero"]),"pagina":actual["pagina"]})
for ruta in paginas:
    pagina=int(os.path.basename(ruta)[1:4])
    for linea in open(ruta).read().split("\n"):
        if linea.strip().startswith("CAPÍTULO"): continue
        m=num_re.match(linea) or linea_re.match(linea)
        # «12.11.3 deben cumplirse.» es una referencia partida por el salto de línea, no un artículo.
        if m and m.lastindex==2 and m.group(2)[:1].islower(): m=None
        if m:
            n=m.group(1); cap=int(n.split(".")[0])
            # Solo es un artículo nuevo si va después del actual (evita confundir referencias "véase 8.5").
            if (capitulo==0 or cap in (capitulo, capitulo+1)) and (not actual or tupla(n)>tupla(actual["numero"])):
                cerrar(); capitulo=cap
                actual={"numero":n,"pagina":pagina,"lineas":[m.group(2)] if m.lastindex==2 else []}
                continue
        if actual: actual["lineas"].append(linea)
cerrar()
# quitar duplicados (mismo número): conservar el primero
vistos=set(); unicos=[]
for a in articulos:
    if a["numero"] in vistos: continue
    vistos.add(a["numero"]); unicos.append(a)
json.dump(unicos,open(f"{S}/articulos.json","w"),ensure_ascii=False,indent=1)
from collections import Counter
c=Counter(a["numero"].split(".")[0] for a in unicos)
print("total",len(unicos)); print(sorted(c.items(),key=lambda x:int(x[0])))
for a in unicos:
    if a["numero"] in ("1.1","1.1.1","3.2.1","7.7.1","9.3.2","9.3.2.1","9.3.2.3","9.2.1"): print(json.dumps(a,ensure_ascii=False)[:400])
