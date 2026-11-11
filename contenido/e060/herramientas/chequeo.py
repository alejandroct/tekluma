import json,glob,re,sys,unicodedata
def norm(s):
    s=unicodedata.normalize("NFC",s)
    for a,b in [("’","'"),("′","'"),("”",'"'),("″",'"'),("“",'"'),("º","°"),("–","-"),("−","-")]: s=s.replace(a,b)
    return re.sub(r"\s+"," ",s).strip()
A={a['numero']:norm(a['texto']) for a in json.load(open('/Users/alejandrocabreratavara/Documents/tekluma/contenido/e060/00-e060-articulos.json'))['articulos']}
malos=0
for f in sorted(glob.glob('/Users/alejandrocabreratavara/Documents/tekluma/contenido/e060/[0-2]*.json')):
    if f.endswith('00-e060-articulos.json'): continue
    T=json.load(open(f))['mazos'][0]['tarjetas']
    for i,t in enumerate(T):
        for c in t['citas']:
            txt=A[c['articulo']]
            for seg in norm(c['extracto']).split('…'):
                seg=seg.strip(' .')
                if len(seg)>3 and seg not in txt:
                    malos+=1; print(f.split('/')[-1][:2],i,c['articulo'],'|',seg[:120]); break
print('no literales:',malos)
