"""Convierte las fórmulas del texto limpio («Vc = 0,17 √f’c bw d») a LaTeX («V_{c} = 0{,}17\\,\\sqrt{f'_{c}}\\,b_{w}\\,d»).

La notación de la norma es regular: un símbolo es una letra (latina o griega) seguida de sus subíndices
(Vc, fyt, ℓdg, αfm, M1ns), «f’c» lleva prima, los factores se yuxtaponen y «/» divide el producto que la
precede entre el factor que la sigue (si ese factor es un número, también los que lo acompañan: «Nu / 14 Ag»).
Lo que no encaja en estas reglas se escribe a mano en LATEX_MANUAL (limpieza.py).
"""
import re

GRIEGAS = {
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta", "ε": r"\varepsilon", "θ": r"\theta",
    "λ": r"\lambda", "μ": r"\mu", "µ": r"\mu", "ξ": r"\xi", "π": r"\pi", "ρ": r"\rho", "σ": r"\sigma",
    "φ": r"\phi", "ϕ": r"\phi", "ψ": r"\psi", "ω": r"\omega", "Δ": r"\Delta", "Σ": r"\Sigma", "Ψ": r"\Psi",
    "ℓ": r"\ell", "Ω": r"\Omega",
}
# Combinaciones de carga y otros nombres que van en redonda.
REDONDA = {"CM", "CV", "CS", "CVi", "CE", "CL", "CT", "MPa", "mm", "U"}
# Palabras dentro de una fórmula.
PALABRAS = {"en", "MPa", "promedio", "total", "min", "max", "ó", "con", "mm"}
FUNCIONES = {"sen": r"\operatorname{sen}", "cos": r"\cos", "cot": r"\cot", "e": "e"}
RELACIONES = {"=": "=", "≤": r"\leq", "≥": r"\geq", "<": "<", ">": ">", "≈": r"\approx"}
SUMAS = {"+": "+", "−": "-", "-": "-", "±": r"\pm", "–": "-"}

LETRA = "A-Za-zÁ-ú" + "".join(GRIEGAS) + "’′'"
TOKEN = re.compile(
    rf"(?P<num>\d+(?:[.,]\d+)?)"
    rf"|(?P<id>[{LETRA}][{LETRA}0-9]*(?:,(?:min|max))?)"
    rf"|(?P<sup>[²³])"
    rf"|(?P<op>[=≤≥<>≈+−\-±–/·×^√∛(){{}}\[\]:;,])"
    rf"|(?P<esp>\s+)"
)


class NoEsFormula(Exception):
    pass


def tokens(texto):
    pos, salida = 0, []
    while pos < len(texto):
        m = TOKEN.match(texto, pos)
        if not m:
            raise NoEsFormula(f"carácter inesperado {texto[pos]!r} en {texto!r}")
        pos = m.end()
        if m.lastgroup != "esp":
            salida.append((m.lastgroup, m.group()))
    return salida


def simbolo(t):
    """«Vc» → V_{c}; «f’c» → f'_{c}; «ΣPu» → \\Sigma P_{u}; «φMnx» → \\phi M_{nx}; «CM» → \\mathrm{CM}."""
    if t == "SO4":
        return r"\mathrm{SO_4}"
    if t in REDONDA:
        return rf"\mathrm{{{t}}}"
    if t in FUNCIONES:
        return FUNCIONES[t]
    if t[:3] in FUNCIONES and len(t) > 3:
        return FUNCIONES[t[:3]] + " " + simbolo(t[3:])
    if t in PALABRAS:
        return rf"\text{{ {t} }}"
    if len(t) > 1 and t[0] in "Σφ" and (t[1].isupper() or t[1] in GRIEGAS):
        return GRIEGAS[t[0]] + " " + simbolo(t[1:])
    t = t.replace("′", "’").replace("'", "’")
    sufijo = ""
    if "," in t:
        t, extra = t.split(",", 1)
        sufijo = "," + extra
    base, resto = t[0], t[1:]
    prima = ""
    if resto.startswith("’"):
        prima, resto = "'", resto[1:]
    if t.isupper() and len(t) > 1 and not any(c.isdigit() for c in t):
        return t  # EI
    base = GRIEGAS.get(base, base)
    sub = "".join(GRIEGAS.get(c, c) for c in resto) + (rf"\text{{{sufijo}}}" if sufijo else "")
    if base.startswith("\\") and not sub and not prima:
        return base + " "
    return f"{base}{prima}_{{{sub}}}" if sub else f"{base}{prima}"


def sin_parentesis(factores):
    """Un numerador que es un solo grupo «(Ie1 + Ie2 + 2 Ie3)» no necesita sus paréntesis sobre la raya."""
    if len(factores) == 1 and factores[0].startswith(r"\left(") and factores[0].endswith(r"\right)"):
        dentro = factores[0][len(r"\left(") : -len(r"\right)")]
        if dentro.count(r"\left") == dentro.count(r"\right"):
            return dentro
    return r"\,".join(factores)


class Lector:
    def __init__(self, texto):
        self.t = tokens(texto)
        self.i = 0

    def ver(self, k=0):
        return self.t[self.i + k] if self.i + k < len(self.t) else (None, None)

    def tomar(self):
        tok = self.ver()
        self.i += 1
        return tok

    def todo(self):
        salida = self.relacion()
        if self.i < len(self.t):
            raise NoEsFormula(f"sobra {self.t[self.i:]}")
        return salida

    def relacion(self):
        partes = [self.suma()]
        while self.ver()[1] in RELACIONES or self.ver()[1] in (":", ";", ","):
            op = self.tomar()[1]
            if op in (":", ";", ","):
                partes.append(op + r"\quad ")
            else:
                partes.append(f" {RELACIONES[op]} ")
            partes.append(self.suma())
        return "".join(partes)

    def suma(self):
        partes = []
        if self.ver()[1] in SUMAS:
            partes.append(SUMAS[self.tomar()[1]])
        partes.append(self.termino())
        while self.ver()[1] in SUMAS:
            partes.append(f" {SUMAS[self.tomar()[1]]} ")
            partes.append(self.termino())
        return "".join(partes)

    def termino(self):
        factores = []
        while True:
            tipo, v = self.ver()
            if v == "/":
                self.tomar()
                if not factores:
                    raise NoEsFormula("«/» sin numerador")
                den = [self.factor(sin_parentesis=True)]
                # «Nu / 14 Ag», «Atr fyt / 10 s n»: un número en el denominador arrastra a los factores que siguen.
                if self.t[self.i - 1][0] == "num":
                    while self.empieza_factor():
                        den.append(self.factor())
                factores = [rf"\dfrac{{{sin_parentesis(factores)}}}{{{r'\,'.join(den)}}}"]
                continue
            if v in ("·", "×"):
                self.tomar()
                factores.append(r"\cdot")
                continue
            if not self.empieza_factor():
                break
            factores.append(self.factor())
        if not factores:
            raise NoEsFormula(f"término vacío en {self.ver()}")
        return r"\,".join(factores)

    def empieza_factor(self):
        tipo, v = self.ver()
        return tipo in ("num", "id") or v in ("(", "[", "{", "√", "∛")

    def factor(self, sin_parentesis=False):
        tipo, v = self.tomar()
        if tipo == "num":
            base = v.replace(",", "{,}").replace(".", "{.}")
        elif tipo == "id":
            base = simbolo(v)
        elif v in ("√", "∛"):
            raiz = r"\sqrt" if v == "√" else r"\sqrt[3]"
            if self.ver()[1] in ("(", "["):
                base = rf"{raiz}{{{self.grupo(sin_delimitadores=True)}}}"
            else:
                base = rf"{raiz}{{{self.factor()}}}"
        elif v in ("(", "[", "{"):
            self.i -= 1
            base = self.grupo(sin_delimitadores=sin_parentesis and not self.lleva_potencia_tras_grupo())
        else:
            raise NoEsFormula(f"factor inesperado {v!r}")
        return base + self.potencia()

    def lleva_potencia_tras_grupo(self):
        prof, j = 0, self.i
        while j < len(self.t):
            v = self.t[j][1]
            if v in ("(", "[", "{"):
                prof += 1
            elif v in (")", "]", "}"):
                prof -= 1
                if prof == 0:
                    return j + 1 < len(self.t) and (self.t[j + 1][0] == "sup" or self.t[j + 1][1] == "^")
            j += 1
        return False

    def grupo(self, sin_delimitadores=False):
        abre = self.tomar()[1]
        cierra = {"(": ")", "[": "]", "{": "}"}[abre]
        # «(en MPa)», «(a)»: texto entre paréntesis.
        j, palabras = self.i, []
        while j < len(self.t) and self.t[j][1] != cierra:
            palabras.append(self.t[j][1])
            j += 1
        if palabras and all(p in PALABRAS or re.fullmatch(r"[a-z]|[a-záéíóúñ]{3,}", p) for p in palabras) and len(palabras) <= 3:
            self.i = j + 1
            return rf"\text{{({' '.join(palabras)})}}"
        dentro = self.relacion()
        if self.tomar()[1] != cierra:
            raise NoEsFormula(f"falta {cierra}")
        if sin_delimitadores:
            return dentro
        izq, der = {"(": (r"\left(", r"\right)"), "[": (r"\left[", r"\right]"), "{": (r"\left\{", r"\right\}")}[abre]
        return f"{izq}{dentro}{der}"

    def potencia(self):
        tipo, v = self.ver()
        if tipo == "sup":
            self.tomar()
            return "^{" + {"²": "2", "³": "3"}[v] + "}"
        if v == "^":
            self.tomar()
            signo = ""
            if self.ver()[1] in ("−", "-"):
                self.tomar()
                signo = "-"
            return "^{" + signo + self.factor() + "}"
        return ""


def a_latex(expresion, manual=None):
    """LaTeX de una fórmula del texto limpio; NoEsFormula si no se deja leer como fórmula."""
    texto = expresion.strip()
    if manual and texto in manual:
        return manual[texto]
    if texto == texto.upper() and re.search(r"[A-ZÁÉÍÓÚÑ]{4}", texto):
        raise NoEsFormula("rótulo en mayúsculas")
    etiqueta = ""
    m = re.match(r"^\(([a-g])\)\s+", texto)
    if m:
        etiqueta, texto = rf"\text{{({m[1]})}}\quad ", texto[m.end():]
    return etiqueta + Lector(texto).todo()


FORMULA_NUMERADA = re.compile(r"^(.+?)\s*\((\d{1,2}-\d{1,2}[a-z]?)\)$")
PROSA = re.compile(r"\b(?!(?:min|max|total|promedio|sen|cos|cot|con|MPa)\b)[a-záéíóúñ]{4,}\b")


def es_matematica(s):
    return bool(re.search(r"[=≤≥√∛]|\w / \w|\w/\w", s)) and not PROSA.search(s) and len(s) < 110


def formulas_del_texto(texto):
    """Lo que el lector dibuja como fórmula: la expresión de cada línea numerada, las líneas sueltas que son
    solo matemática y las celdas de tabla que lo son. Las mismas reglas usan la app y la web."""
    salida = []
    for linea in texto.split("\n"):
        linea = linea.strip()
        if linea.startswith("|"):
            salida += [c.strip() for c in linea[1:].split("|") if es_matematica(c.strip())]
            continue
        m = FORMULA_NUMERADA.match(linea) if len(linea) <= 130 else None
        if m and (re.search(r"[=≤≥<>]", m[1]) or len(m[1]) < 40):
            salida.append(m[1])
        elif es_matematica(linea):
            salida.append(linea)
    return salida
