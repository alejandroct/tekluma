"""Genera la marca de DCC: isotipo (cubo BIM), logotipo DCC geométrico y bajada en Archivo trazada.

Uso: python generar.py <Archivo[wdth,wght].ttf> <carpeta de salida>  (fuente: github.com/google/fonts, ofl/archivo).
Los PNG se exportan con png.mjs (@resvg/resvg-js). Resultado en apps/dcc/marca.
"""
import math, sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FUENTE, SALIDA = sys.argv[1], sys.argv[2]
os.makedirs(SALIDA, exist_ok=True)

COLOR = {"izq": "#13283F", "der": "#2E5A87", "sup": "#D99A3E", "texto": "#13283F", "bajada": "#4A5868"}
NEG = {"izq": "#FFFFFF", "der": "#8FB6DC", "sup": "#E0A24C", "texto": "#FFFFFF", "bajada": "#C9D2DC"}
MONO = {"izq": "#13202E", "der": "#13202E", "sup": "#13202E", "texto": "#13202E", "bajada": "#13202E"}


# ── Isotipo: cubo isométrico (el modelo BIM); la cara derecha en tres niveles (el edificio). ──
def interseccion(p1, d1, p2, d2):
    det = d1[0] * d2[1] - d1[1] * d2[0]
    t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / det
    return (p1[0] + t * d1[0], p1[1] + t * d1[1])


def contraer(poli, g):
    """Desplaza cada lado de un polígono convexo g hacia adentro (separación entre caras)."""
    n = len(poli)
    area = sum(poli[i][0] * poli[(i + 1) % n][1] - poli[(i + 1) % n][0] * poli[i][1] for i in range(n))
    signo = 1 if area > 0 else -1
    lados = []
    for i in range(n):
        a, b = poli[i], poli[(i + 1) % n]
        d = (b[0] - a[0], b[1] - a[1])
        L = math.hypot(*d)
        nrm = (-d[1] / L * signo, d[0] / L * signo)  # normal hacia adentro
        lados.append(((a[0] + nrm[0] * g, a[1] + nrm[1] * g), d))
    return [interseccion(*lados[i - 1], *lados[i]) for i in range(n)]


def poli_d(p):
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in p) + " Z"


R = 42  # radio del hexágono
C = (R * math.cos(math.radians(30)), R)  # centro, con el borde izquierdo en x=0
ax, ay = R * math.cos(math.radians(30)), R / 2
cx, cy = C
arriba, abajo = (cx, cy - R), (cx, cy + R)
sup_izq, sup_der = (cx - ax, cy - ay), (cx + ax, cy - ay)
inf_izq, inf_der = (cx - ax, cy + ay), (cx + ax, cy + ay)
G = 1.6  # media separación entre piezas

caras = {
    "sup": [contraer([arriba, sup_der, C, sup_izq], G)],
    "izq": [contraer([sup_izq, C, abajo, inf_izq], G)],
}
niveles = []
for k in range(3):
    v0, v1 = k / 3, (k + 1) / 3
    p = lambda u, v: (cx + u * ax, cy - u * ay + v * R)
    niveles.append(contraer([p(0, v0), p(1, v0), p(1, v1), p(0, v1)], G))
caras["der"] = niveles
ISO_W, ISO_H = 2 * ax, 2 * R


def isotipo(col, dx=0.0, dy=0.0, esc=1.0):
    out = []
    for cara in ("izq", "der", "sup"):
        for pol in caras[cara]:
            pts = [(dx + x * esc, dy + y * esc) for x, y in pol]
            out.append(f'<path fill="{col[cara]}" d="{poli_d(pts)}"/>')
    return "".join(out)


# ── Logotipo DCC: letras geométricas de trazo (asta 9 sobre 40 de alto). ──
T, H = 9.0, 40.0
r = (H - T) / 2


def letra_d(x):
    return (f'M{x + T / 2:.2f} {T / 2:.2f} H{x + 18:.2f} A{r:.2f} {r:.2f} 0 0 1 {x + 18:.2f} {H - T / 2:.2f} '
            f'H{x + T / 2:.2f} Z')


def letra_c(x):
    a = math.radians(42)
    x0, y0 = x + H / 2 + r * math.cos(a), H / 2 - r * math.sin(a)
    y1 = H / 2 + r * math.sin(a)
    return f"M{x0:.2f} {y0:.2f} A{r:.2f} {r:.2f} 0 1 0 {x0:.2f} {y1:.2f}"


ANCHO_C = H / 2 + (r + T / 2) * math.cos(math.radians(42))  # extremo derecho visual de la C
ESP = 6.5
X_C1 = 38 + ESP
X_C2 = X_C1 + ANCHO_C + ESP
DCC_W = X_C2 + ANCHO_C


def logotipo(col, dx, dy, esc):
    tr = f'transform="translate({dx:.2f} {dy:.2f}) scale({esc:.4f})"'
    return (f'<g {tr} fill="none" stroke="{col["texto"]}" stroke-width="{T}">'
            f'<path stroke-linejoin="miter" d="{letra_d(0)}"/>'
            f'<path stroke-linecap="butt" d="{letra_c(X_C1)}"/>'
            f'<path stroke-linecap="butt" d="{letra_c(X_C2)}"/></g>')


# ── Bajada en Archivo SemiBold, trazada (no depende de fuentes instaladas). ──
var = TTFont(FUENTE)
inst = instantiateVariableFont(var, {"wght": 600, "wdth": 100})
gs, cmap, hmtx = inst.getGlyphSet(), inst.getBestCmap(), inst["hmtx"]
UPM = inst["head"].unitsPerEm
CAP = inst["OS/2"].sCapHeight


def texto(cadena, alto_cap, tracking_em=0.0):
    """Path SVG de la cadena con su línea base en y=0; devuelve (d, ancho)."""
    esc = alto_cap / CAP
    x, partes = 0.0, []
    for i, ch in enumerate(cadena):
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (esc, 0, 0, -esc, x, 0)))
        partes.append(pen.getCommands())
        x += hmtx[g][0] * esc
        if i < len(cadena) - 1:
            x += tracking_em * UPM * esc
    return " ".join(p for p in partes if p), x


def svg(w, h, cuerpo, titulo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" role="img" aria-label="{titulo}">'
            f"<title>{titulo}</title>{cuerpo}</svg>\n")


TITULO = "DCC Ingeniería y Construcción"

# Isotipo
for nombre, col in (("isotipo", COLOR), ("isotipo-negativo", NEG), ("isotipo-mono", MONO)):
    open(f"{SALIDA}/dcc-{nombre}.svg", "w").write(svg(ISO_W, ISO_H, isotipo(col), TITULO))

# Horizontal: isotipo · DCC sobre dos líneas de bajada alineadas al ancho de DCC.
def horizontal(col):
    alto = ISO_H
    esc_dcc = (alto * 0.56) / H
    x_txt = ISO_W + alto * 0.30
    cap = alto * 0.122
    l1, w1 = texto("INGENIERÍA Y", cap, 0.12)
    l2, w2 = texto("CONSTRUCCIÓN", cap, 0.12)
    # tracking para que la línea larga mida lo mismo que DCC
    extra = (DCC_W * esc_dcc - w2) / (len("CONSTRUCCIÓN") - 1)
    l1, w1 = texto("INGENIERÍA Y", cap, 0.12 + extra / (UPM * cap / CAP))
    l2, w2 = texto("CONSTRUCCIÓN", cap, 0.12 + extra / (UPM * cap / CAP))
    y_dcc = 0
    b1 = alto * 0.56 + alto * 0.075 + cap
    b2 = b1 + cap * 1.75
    cuerpo = (isotipo(col) + logotipo(col, x_txt, y_dcc, esc_dcc)
              + f'<g fill="{col["bajada"]}"><path transform="translate({x_txt:.2f} {b1:.2f})" d="{l1}"/>'
              + f'<path transform="translate({x_txt:.2f} {b2:.2f})" d="{l2}"/></g>')
    return svg(x_txt + max(DCC_W * esc_dcc, w2), max(alto, b2), cuerpo, TITULO)


for nombre, col in (("horizontal", COLOR), ("horizontal-negativo", NEG), ("horizontal-mono", MONO)):
    open(f"{SALIDA}/dcc-logo-{nombre}.svg", "w").write(horizontal(col))


# Vertical: isotipo arriba, DCC centrado, bajada en una línea.
def vertical(col):
    esc_dcc = 0.95
    w_dcc = DCC_W * esc_dcc
    cap = 5.4
    linea, w_l = texto("INGENIERÍA Y CONSTRUCCIÓN", cap, 0.16)
    ancho = max(w_dcc, w_l, ISO_W)
    y_dcc = ISO_H + 15
    b = y_dcc + H * esc_dcc + 10 + cap
    cuerpo = (isotipo(col, (ancho - ISO_W) / 2, 0) + logotipo(col, (ancho - w_dcc) / 2, y_dcc, esc_dcc)
              + f'<path fill="{col["bajada"]}" transform="translate({(ancho - w_l) / 2:.2f} {b:.2f})" d="{linea}"/>')
    return svg(ancho, b + 1, cuerpo, TITULO)


for nombre, col in (("vertical", COLOR), ("vertical-negativo", NEG)):
    open(f"{SALIDA}/dcc-logo-{nombre}.svg", "w").write(vertical(col))

# Favicon / ícono de app: isotipo en negativo sobre cuadrado azul marino redondeado.
lado = 100
e = 62 / ISO_H
cuerpo = (f'<rect width="{lado}" height="{lado}" rx="22" fill="#13283F"/>'
          + isotipo(NEG, (lado - ISO_W * e) / 2, (lado - ISO_H * e) / 2, e))
open(f"{SALIDA}/dcc-icono.svg", "w").write(svg(lado, lado, cuerpo, TITULO))
print("ok", round(DCC_W, 2))


# ── Composiciones para usos concretos (encajan los SVG anteriores dentro de otro lienzo). ──
def interior(nombre):
    s = open(f"{SALIDA}/{nombre}.svg").read()
    vb = s.split('viewBox="')[1].split('"')[0].split()
    cuerpo = s.split("</title>", 1)[1].rsplit("</svg>", 1)[0]
    return float(vb[2]), float(vb[3]), cuerpo


def encajar(nombre, x, y, ancho):
    w, h, cuerpo = interior(nombre)
    return f'<svg x="{x:.2f}" y="{y:.2f}" width="{ancho:.2f}" height="{ancho * h / w:.2f}" viewBox="0 0 {w:.2f} {h:.2f}">{cuerpo}</svg>', ancho * h / w


# Avatar cuadrado (foto de perfil de Google, WhatsApp, LinkedIn): el círculo de recorte deja aire.
lado, w_iso = 100, 50
w, h, _ = interior("dcc-isotipo-negativo")
iso, _ = encajar("dcc-isotipo-negativo", (lado - w_iso) / 2, (lado - w_iso * h / w) / 2, w_iso)
open(f"{SALIDA}/dcc-avatar.svg", "w").write(svg(lado, lado, f'<rect width="{lado}" height="{lado}" fill="#13283F"/>' + iso, TITULO))

# Logo de la consola de Google Workspace (320 × 132, fondo transparente).
w, h, _ = interior("dcc-logo-horizontal")
logo, _ = encajar("dcc-logo-horizontal", 24, (132 - 272 * h / w) / 2, 272)
open(f"{SALIDA}/dcc-workspace.svg", "w").write(svg(320, 132, logo, TITULO))

# Imagen para compartir enlaces (Open Graph, 1200 × 630).
logo, _ = encajar("dcc-logo-horizontal", 220, (630 - 760 * h / w) / 2 - 20, 760)
url, w_url = texto("dccingenieriayconstruccion.com", 15, 0.06)
og = (f'<rect width="1200" height="630" fill="#F4F2EE"/><rect y="600" width="1200" height="30" fill="#13283F"/>'
      f'<rect y="594" width="1200" height="6" fill="#D99A3E"/>' + logo
      + f'<path fill="#4A5868" transform="translate({(1200 - w_url) / 2:.2f} 548)" d="{url}"/>')
open(f"{SALIDA}/dcc-og.svg", "w").write(svg(1200, 630, og, TITULO))
print("composiciones ok")
