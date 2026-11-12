"""Fórmulas y tablas que la extracción del PDF dejó ilegibles, transcritas leyendo cada página.

Convenciones del texto limpio (el lector de la app y el de la web las muestran con formato):
- Una fórmula numerada va sola en su línea y termina con su número: « Vc = 0,17 √f’c bw d (11-3)».
- Una tabla sin imagen va fila por fila con « | » entre celdas; la primera fila es el encabezado.
- Los subíndices se escriben a continuación (bw, ℓd, f’c); potencias con ² y ³; raíces con √.

Cada entrada es (artículo, texto viejo, texto nuevo) y se aplica una sola vez; si el texto viejo ya no
aparece, la generación se detiene para revisar.
"""

# Restos de figuras volcados como texto al final de un artículo: se corta desde el marcador.
CORTES = {
    "11.12.6.2": "\n 3 3 2\n ( )\n 1 2",
    "20.7.2.1": "\n 2 5 r Δ Δ≤",
}

LIMPIEZA = [
    # ───── Cap. 4 ─────
    ("4.3.1", """ TABLA 4.4 REQUISITOS PARA CONCRETO EXPUESTO A SOLUCIONES DE SULFATOS
 Exposición
 a sulfatos
 Sulfato soluble
 en agua (SO4) presente en el
 suelo, porcentaje en
 peso
 Sulfato (SO4) en el
 agua, ppm
 Tipo de Cemento
 Relación máxima agua
 - material cementante
 (en peso)
 para concretos de peso normal*
 f’c mínimo
 (MPa)
 para concreto
 s de peso normal y
 ligero* Insignificant
 e
 0,0 ≤ SO4 < 0,1 0 ≤ SO4< 150 — — —
 Moderada** 0,1 ≤ SO4 < 0,2 150 ≤ SO4 < 1500
 II, IP(MS),
 IS(MS),
 P(MS), I(PM)(MS),
 I(SM)(MS)
 0,50

 28

 Severa 0,2 ≤ SO4 < 2,0 1500 ≤ SO4 < 10000 V 0,45 31

 Muy severa 2,0 < SO4 10000 < SO4
 Tipo V
 más puzolana**
 *
 0,45 31
""", """ TABLA 4.4 REQUISITOS PARA CONCRETO EXPUESTO A SOLUCIONES DE SULFATOS
 | Exposición a sulfatos | SO4 soluble en agua presente en el suelo (% en peso) | SO4 en el agua (ppm) | Tipo de cemento | Relación máxima agua-material cementante (en peso)* | f’c mínimo (MPa)*
 | Insignificante | 0,0 ≤ SO4 < 0,1 | 0 ≤ SO4 < 150 | — | — | —
 | Moderada** | 0,1 ≤ SO4 < 0,2 | 150 ≤ SO4 < 1500 | II, IP(MS), IS(MS), P(MS), I(PM)(MS), I(SM)(MS) | 0,50 | 28
 | Severa | 0,2 ≤ SO4 < 2,0 | 1500 ≤ SO4 < 10000 | V | 0,45 | 31
 | Muy severa | 2,0 < SO4 | 10000 < SO4 | Tipo V más puzolana*** | 0,45 | 31
"""),
    ("4.4.1", """ Tipo de elemento
 Contenido máximo de iones de cloruro
 solubles en agua en el concreto (porcentaje en peso del cemento)
 Concreto preesforzado 0,06
 Concreto armado que en servicio estará expuesto a cloruros 0,15
 Concreto armado que en servicio estará seco o protegido contra la humedad
 1,00
 Otras construcciones de concreto armado 0,30""", ""),
    # ───── Cap. 5 ─────
    ("5.3.2.1", """
 Resistencia especificada a la
 compresión, MPa
 Resistencia promedio requerida a la
 compresión, MPa
 f’c ≤ 35
 Usar el mayor valor obtenido de las ecuaciones (5-1) y (5-2): f’cr = f’c + 1,34 Ss (5-1) f’cr = f’c + 2,33 Ss - 3,5 (5-2)
 f’c > 35
 Usar el mayor valor obtenido de las ecuaciones (5-1) y (5-3): f’cr = f’c + 1,34 Ss (5-1) f’cr =0,90 f’c + 2,33 Ss (5-3)""", """
 Para f’c ≤ 35 MPa, usar el mayor valor obtenido de las ecuaciones (5-1) y (5-2):
 f’cr = f’c + 1,34 Ss (5-1)
 f’cr = f’c + 2,33 Ss − 3,5 (5-2)
 Para f’c > 35 MPa, usar el mayor valor obtenido de las ecuaciones (5-1) y (5-3):
 f’cr = f’c + 1,34 Ss (5-1)
 f’cr = 0,90 f’c + 2,33 Ss (5-3)"""),
    ("5.3.2.2", """ Resistencia especificada a la
 compresión, MPa
 Resistencia promedio requerida
 a la compresión, MPa f’c < 21 f’cr = f’c + 7,0 21 ≤ f’c ≤ 35 f’cr = f’c + 8,5 f’c > 35 f’cr = 1,1 f’c + 5,0""", """ | Resistencia especificada a la compresión, MPa | Resistencia promedio requerida a la compresión, MPa
 | f’c < 21 | f’cr = f’c + 7,0
 | 21 ≤ f’c ≤ 35 | f’cr = f’c + 8,5
 | f’c > 35 | f’cr = 1,1 f’c + 5,0"""),
    # ───── Cap. 7 ─────
    ("7.5.2.1", """ Tolerancia en d Tolerancia en el recubrimiento
 mínimo de concreto
 d ≤ 200 mm ± 10 mm -10 mm
 d > 200 mm ± 13 mm -13 mm""", """ | Peralte | Tolerancia en d | Tolerancia en el recubrimiento mínimo de concreto
 | d ≤ 200 mm | ± 10 mm | −10 mm
 | d > 200 mm | ± 13 mm | −13 mm"""),
    # ───── Cap. 8 ─────
    ("8.3.4", """ • Momento positivo
 (a) Tramos extremos El extremo discontinuo no está restringido … 2 ( ) 1/11 n u w

 El extremo discontinuo es monolítico con el apoyo … 2 (1/14) n u w (b) Tramos interiores … 2 (1/16) n u w

 • Momento negativo en la cara exterior del primer apoyo interior
 (a) Dos tramos: … 2 (1/ 9) n u w (b) Más de dos tramos: … 2 (1/10) n u w

 • Momento negativo en las demás caras de apoyos interiores … 2 (1/11) n u w

 • Momento negativo en la cara de todos los apoyos para losas con luces que no excedan de 3 m y vigas en las cuales el cociente entre la suma de las rigideces de las columnas y la rigidez de la viga exceda de 8 en cada extremo del tramo: … 2 (1/12) n u w

 • Momento negativo en la cara interior de los apoyos exteriores para los elementos construidos monolíticamente con sus apoyos:
 Cuando el apoyo es una viga de borde: … 2 (1/ 24) n u w

 Cuando el apoyo es una columna: … 2 (1/16) n u w

 • Fuerza Cortante
 Cara exterior del primer apoyo interior: … 2 1.15 (1/ 2) n u w

 Caras de todos los demás apoyos: … 2 (1/ 2) n u w

 El valor de n es la luz libre del tramo. Para el cálculo de los momentos negativos en las caras de los apoyos interiores, n se tomará""", """ • Momento positivo
 (a) Tramos extremos
 El extremo discontinuo no está restringido: (1/11) wu ℓn²
 El extremo discontinuo es monolítico con el apoyo: (1/14) wu ℓn²
 (b) Tramos interiores: (1/16) wu ℓn²
 • Momento negativo en la cara exterior del primer apoyo interior
 (a) Dos tramos: (1/9) wu ℓn²
 (b) Más de dos tramos: (1/10) wu ℓn²
 • Momento negativo en las demás caras de apoyos interiores: (1/11) wu ℓn²
 • Momento negativo en la cara de todos los apoyos para losas con luces que no excedan de 3 m y vigas en las cuales el cociente entre la suma de las rigideces de las columnas y la rigidez de la viga exceda de 8 en cada extremo del tramo: (1/12) wu ℓn²
 • Momento negativo en la cara interior de los apoyos exteriores para los elementos construidos monolíticamente con sus apoyos:
 Cuando el apoyo es una viga de borde: (1/24) wu ℓn²
 Cuando el apoyo es una columna: (1/16) wu ℓn²
 • Fuerza Cortante
 Cara exterior del primer apoyo interior: 1,15 (1/2) wu ℓn²
 Caras de todos los demás apoyos: (1/2) wu ℓn²
 El valor de ℓn es la luz libre del tramo. Para el cálculo de los momentos negativos en las caras de los apoyos interiores, ℓn se tomará"""),
    ("8.5.1", "\n\n 1,5 ( ) 0,043 c Ec w f c′ = (en MPa)\n (8-2)", "\n Ec = (wc)^1,5 0,043 √f’c (en MPa) (8-2)"),
    ("8.5.2", "\n 4700 Ec f c′ = (en MPa) (8-3)", "\n Ec = 4700 √f’c (en MPa) (8-3)"),
    ("8.5.2", "kg/m3)", "kg/m³)"),
    ("8.5.4", "\n\n 2,3\n Ec G = (8-4)", "\n G = Ec / 2,3 (8-4)"),
    ("8.4.1", "\n\n 1000 εt (en porcentaje) (8-1)\n\n", "\n 1000 εt (en porcentaje) (8-1)\n"),
    # ───── Cap. 9 ─────
    ("9.2.3", "± CS\n (9-4)", "± CS (9-4)"),
    ("9.2.6", "\n\n U = 1,4 CM", "\n U = 1,4 CM"),
    ("9.3.2.7", "de un factor\n\n φ.", "de un factor φ."),
    ("9.6.2.3", "\n\n fr Ig Mcr\n Yt = (9-11) donde fr", "\n Mcr = fr Ig / Yt (9-11)\n donde fr"),
    ("9.6.2.3", "\n\n 0,62 fr f c′ =\n (9-12)\n", "\n fr = 0,62 √f’c (9-12)\n"),
    ("9.6.2.3", "sustituyendo f c′ por 1,8 fct, pero el valor de 1,8 fct utilizado no debe exceder de f c′.", "sustituyendo √f’c por 1,8 fct, pero el valor de 1,8 fct utilizado no debe exceder de √f’c."),
    ("9.6.2.6", "\n\n Duración de la carga (meses)\n ξ\n", ""),
    ("9.6.2.6", """ Tipo de elemento Deflexión considerada Límite de
 deflexión Techos planos que no soporten ni estén ligados a elementos no estructurales susceptibles de sufrir daños debido a deflexiones grandes.
 Deflexión inmediata debida a la carga viva 180 / *

 Pisos que no soporten ni estén ligados a elementos no estructurales susceptibles de sufrir daños debido a deflexiones grandes.
 Deflexión inmediata debida a la carga viva 360 /

 Pisos o techos que soporten o estén ligados a elementos no estructurales susceptibles de sufrir daños debido a deflexiones grandes.
 La parte de la deflexión total que ocurre después de la unión de los elementos no estructurales (la suma de la deflexión a largo plazo debida a todas las cargas permanentes, y la deflexión inmediata debida a cualquier carga viva adicional)†
 480 /

 ‡
 Pisos o techos que soporten o estén ligados a elementos no estructurales no susceptibles de sufrir daños debido a deflexiones grandes.
 240 /

 §
 * Este límite""", """ * Este límite"""),
    ("9.6.2.6", " † Las deflexiones a largo plazo se pueden reducir en la cantidad de deflexión\n calculada", "\n † Las deflexiones a largo plazo se pueden reducir en la cantidad de deflexión calculada"),
    ("9.6.2.6", " ‡ Este límite se puede exceder si se toman medidas adecuadas para prevenir\n daños en elementos apoyados o unidos. § Pero", "\n ‡ Este límite se puede exceder si se toman medidas adecuadas para prevenir daños en elementos apoyados o unidos.\n § Pero"),
    ("9.6.3.2", """ fy MPa †
 Sin ábacos ‡ Con ábacos ‡
 Paneles exteriores Paneles interiores Paneles exteriores Paneles interiores Sin vigas de
 borde
 Con vigas de
 borde §

 Sin vigas de
 borde
 Con vigas de
 borde §

 280 33
 n

 36
 n

 36
 n

 36
 n

 40
 n

 40
 n

 420 30
 n

 33
 n

 33
 n

 33
 n

 36
 n

 36
 n

 520 28
 n

 31
 n

 31
 n

 31
 n

 34
 n

 34
 n

 * Para construcción en dos direcciones, n

 , es la luz libre""", """ * Para construcción en dos direcciones, ℓn, es la luz libre"""),
    ("9.6.3.2", " † Para fy", "\n † Para fy"),
    ("9.6.3.2", " ‡ Ábaco, como se define en 13.2.6. § Losas con vigas entre las columnas a lo largo de los bordes exteriores. El valor\n de αf", "\n ‡ Ábaco, como se define en 13.2.6.\n § Losas con vigas entre las columnas a lo largo de los bordes exteriores. El valor de αf"),
    ("9.6.3.2", "(a) Losas sin ábacos como se definen en 13.2.6 … 125 mm (b) Losas", "(a) Losas sin ábacos como se definen en 13.2.6: 125 mm\n (b) Losas"),
    ("9.6.3.2", "13.2.6 … 100 mm", "13.2.6: 100 mm"),
    ("9.6.3.3", """debe ser: (a) Para 0,2 αfm ≤ ; se aplican las disposiciones de 9.6.3.2.
 (b) Para 0,2 2,0 αfm < < ; h no debe ser menor que:
 ( ) 1400 0,8
 36 5β α 0,2
 n
 fm
 fy
 h
 ( ) + ( ) = + − (9-16)
 pero no menor que 125 mm.
 (c) Para 2,0 αfm > ; h no debe ser menor que:
 0,8 1400 36 9β
 n fy
 h
 ( ) + ( ) = + (9-17)""", """debe ser:
 (a) Para αfm ≤ 0,2; se aplican las disposiciones de 9.6.3.2.
 (b) Para 0,2 < αfm < 2,0; h no debe ser menor que:
 h = ℓn (0,8 + fy/1400) / [36 + 5β (αfm − 0,2)] (9-16)
 pero no menor que 125 mm.
 (c) Para αfm > 2,0; h no debe ser menor que:
 h = ℓn (0,8 + fy/1400) / (36 + 9β) (9-17)"""),
    ("9.6.3.3", "El término n en (b) y (c)", "El término ℓn en (b) y (c)"),
    ("9.7.2", """

 - Barras lisas

 0,0025
 - Barras corrugadas con fy < 420 Mpa 0,0020 - Barras corrugadas o malla de alambre (liso o corrugado) de intersecciones soldadas, con fy ≥ 420 Mpa
 0,0018""", """
 | Tipo de acero de refuerzo | Cuantía mínima
 | Barras lisas | 0,0025
 | Barras corrugadas con fy < 420 MPa | 0,0020
 | Barras corrugadas o malla de alambre (liso o corrugado) de intersecciones soldadas, con fy ≥ 420 MPa | 0,0018"""),
    ("9.7.7", "temperatura en una\n losa.", "temperatura en una losa."),
    ("9.9.3", """

 3 Z fs dc Act = (9-18)
 donde fs es el esfuerzo en el acero, en MPa, el cual puede estimarse sobre la base del momento flector en condiciones de servicio Ms, mediante:
 ( ) 0,9
 Ms fs
 d As = (9-19)
 dc: espesor del recubrimiento (mm) de concreto medido desde la fibra extrema en
 tracción""", """
 Z = fs ∛(dc Act) (9-18)
 donde fs es el esfuerzo en el acero, en MPa, el cual puede estimarse sobre la base del momento flector en condiciones de servicio Ms, mediante:
 fs = Ms / (0,9 d As) (9-19)
 dc: espesor del recubrimiento (mm) de concreto medido desde la fibra extrema en tracción"""),
    ("9.9.3", "(mm2) que rodea al refuerzo principal de\n tracción", "(mm²) que rodea al refuerzo principal de tracción"),
    ("9.9.6", "\n\n s ≤ 300 mm, s ≤ 380 (250 / fs) – 2,5 Cc (9-20) s ≤ 300 (250 / fs) (9-21)\n", "\n s ≤ 300 mm,\n s ≤ 380 (250 / fs) − 2,5 Cc (9-20)\n s ≤ 300 (250 / fs) (9-21)\n"),
    ("9.9.6", "\n\n Act = 2 ys b ys = Centroide del refuerzo principal\n de tracción por flexión", ""),
    # ───── Cap. 10 ─────
    ("10.3.6.1", "φ[0,85 ( ) ] f c Ag Ast fy Ast ′ − + (10-1)", "φ [0,85 f’c (Ag − Ast) + fy Ast] (10-1)"),
    ("10.3.6.2", "φ[0,85 ( ) ] f c Ag Ast fy Ast ′ − + (10-2)", "φ [0,85 f’c (Ag − Ast) + fy Ast] (10-2)"),
    ("10.5.1", "donde:\n fr Ig Mcr\n Yt =\n 0,62 fr f c′ =", "donde:\n Mcr = fr Ig / Yt\n fr = 0,62 √f’c"),
    ("10.5.2", "\n\n min 0,22 w f c As b d fy\n ′ = (10-\n 3)", "\n As min = (0,22 √f’c / fy) bw d (10-3)"),
    ("10.9.3", "\n s 0,45 1 ρ Ag f c\n Ach fyt\n ′ = − ( ) ( )\n (10-\n 5)\n el valor", "\n ρs = 0,45 (Ag / Ach − 1) (f’c / fyt) (10-5)\n el valor"),
    ("10.11.4.2", "Q :\n\n ( ) o Pu Q\n Vus he\n Σ Δ = (10-6)\n", "Q:\n Q = (ΣPu Δo) / (Vus he) (10-6)\n"),
    ("10.11.4.2", "Pu Σ : Suma", "ΣPu: Suma"),
    ("10.11.4.2", "sísmicas Pu Σ debe", "sísmicas ΣPu debe"),
    ("10.11.4.2", "laterales. o Δ: Deformación", "laterales.\n Δo: Deformación"),
    ("10.11.4.2", "sismo, o Δ deberá", "sismo, Δo deberá"),
    ("10.11.4.2", "E.030 Diseño Sismorresistente. Vus:", "E.030 Diseño Sismorresistente.\n Vus:"),
    ("10.11.4.2", "laterales. he:", "laterales.\n he:"),
    ("10.12.2", "\n\n 1\n 2 34 12 k u M\n r M ≤ − ( ) ( ) (10-7)\n\n En la ecuación 10-7, el término ( ) 1 2 34 12 / M M − [ ] [ ] no", "\n k ℓu / r ≤ 34 − 12 (M1 / M2) (10-7)\n En la ecuación 10-7, el término [34 − 12 (M1/M2)] no"),
    ("10.12.2", "El término 1 2 / M M es", "El término M1/M2 es"),
    ("10.12.3", "\n\n 2 Mc ns M =δ (10-8) donde:\n δ 1,0 1 0,75\n Cm ns Pu\n Pc\n = ≥ −\n (10-\n 9)\n ( )\n 2\n 2 π EI Pc\n k u = (10-\n 10)\n EI debe tomarse como:\n ( ) 0,2 1 Ec Ig Es Ise EI d + = +β (10-\n 11)\n Alternativamente:\n 0,4\n 1 β\n Ec Ig EI\n d =\n +\n (10-\n 12)", "\n Mc = δns M2 (10-8)\n donde:\n δns = Cm / [1 − Pu / (0,75 Pc)] ≥ 1,0 (10-9)\n Pc = π² EI / (k ℓu)² (10-10)\n EI debe tomarse como:\n EI = (0,2 Ec Ig + Es Ise) / (1 + βd) (10-11)\n Alternativamente:\n EI = 0,4 Ec Ig / (1 + βd) (10-12)"),
    ("10.12.3.1", "\n 1\n 2 0,6 0,4 0,4 M Cm M ( ) = + ≥ ( )\n (10-\n 13)\n donde 1/ 2 M M es", "\n Cm = 0,6 + 0,4 (M1 / M2) ≥ 0,4 (10-13)\n donde M1/M2 es"),
    ("10.12.3.2", "( ) 2 min , 15 0,03 M Pu h = + (10-14)\n", "El momento amplificado, M2, en la ecuación (10-8) no debe tomarse menor que\n M2,min = Pu (15 + 0,03 h) (10-14)\n"),
    ("10.12.3.2", "M 2,min supera a M 2 , el valor", "M2,min supera a M2, el valor"),
    ("10.12.3.2", "dividiendo M 1 por M 2 .", "dividiendo M1 por M2."),
    ("10.13.3", "Los momentos M 1 y M 2 en", "Los momentos M1 y M2 en"),
    ("10.13.3", "\n 1 1 1 δ ns s M M s M = + (10- 15)\n 2 2 2 δ ns s M M s M = + (10-16)\n donde 1 δ s s M y 2 δ s s M deben", "\n M1 = M1ns + δs M1s (10-15)\n M2 = M2ns + δs M2s (10-16)\n donde δs M1s y δs M2s deben"),
    ("10.13.4.2", "1 δ\n 1 s Ms Ms Ms Q = ≥ −\n (10-17)\n", "Alternativamente, se permite calcular δs Ms como\n δs Ms = Ms / (1 − Q) ≥ Ms (10-17)\n"),
    ("10.13.4.3", "δs Ms , como:\n δ\n 1 0,75\n Ms s Ms Ms Pu\n Pc\n = ≥ Σ −\n Σ\n (10-18)\n donde Pu Σ es", "δs Ms, como:\n δs Ms = Ms / [1 − ΣPu / (0,75 ΣPc)] ≥ Ms (10-18)\n donde ΣPu es"),
    ("10.13.4.3", "considerado y Pc Σ es", "considerado y ΣPc es"),
    ("10.13.5", "\n\n 35 u\n r Pu f c Ag\n >\n ′ (10-\n 19)\n éste", "\n ℓu / r > 35 / √[Pu / (f’c Ag)] (10-19)\n éste"),
    ("10.13.5", "en donde M 1 y M 2 se", "en donde M1 y M2 se"),
    ("10.16.5", "dado por ( ) ( )\n /5\n /5\n Ec Ig Es Isx r\n Ec Ag Es Asx\n + =\n +\n (10-20) y como", "dado por\n r = √[(Ec Ig / 5 + Es Isx) / (Ec Ag / 5 + Es Asx)] (10-20)\n y como"),
    ("10.16.5", "por medio de ( ) /5\n 1 βd\n Ec Ig EI Es Isx = + +\n (10-21)", "por medio de\n EI = (Ec Ig / 5) / (1 + βd) + Es Isx (10-21)"),
    ("10.16.6.1", "menor que:\n 3\n fy b\n Es\n , para cada cara de ancho b\n ni que:\n 8\n fy D\n Es\n , para", "menor que:\n b √(fy / 3Es), para cada cara de ancho b\n ni que:\n D √(fy / 8Es), para"),
    ("10.18", "\n\n 1 1 1 1\n Pn Pnx Pny Pon = + − (10-22)\n donde :", "\n 1/Pn = 1/Pnx + 1/Pny − 1/Pon (10-22)\n donde:"),
    ("10.18", "ex = ey = 0)\n que se calcula mediante: 0,85 ( ) f c Ag Ast fy Ast ′ − +\n\n", "ex = ey = 0) que se calcula mediante:\n Pon = 0,85 f’c (Ag − Ast) + fy Ast\n"),
    ("10.18", "\n\n 1.0 Mux Muy\n Mnx Mny + ≤ φ φ\n (10-23)", "\n Mux / φMnx + Muy / φMny ≤ 1,0 (10-23)"),
    # ───── Cap. 11 ─────
    ("11.1.1", "Vn = Vc + Vs\n (11-2)", "Vn = Vc + Vs (11-2)"),
    ("11.1.2", "f c′ usados", "Los valores de √f’c usados"),
    ("11.1.2.1", "f c′mayores que", "Se permite usar valores de √f’c mayores que"),
    ("11.2.1", "en el término f c′contenido", "en el término √f’c contenido"),
    ("11.2.1.1", "debe reemplazarse f c′ por 1,8 fct, pero el valor de 1,8 fct no debe\n exceder de f c′.", "debe reemplazarse √f’c por 1,8 fct, pero el valor de 1,8 fct no debe exceder de √f’c."),
    ("11.2.1.2", "todos los valores de f c′ deben multiplicarse por 0,75 para concreto liviano en todos sus componentes, y por 0,85\n Fig. 11.1.3.1.b Condiciones de apoyo y de aplicación de las cargas externas\n en las cuales no se puede reducir la fuerza Vu de diseño.\n\n para concreto liviano", "todos los valores de √f’c deben multiplicarse por 0,75 para concreto liviano en todos sus componentes, y por 0,85 para concreto liviano"),
    ("11.2.1.2", "se sustituya parcialmente.", "se sustituya parcialmente.\n\n Fig. 11.1.3.1.b Condiciones de apoyo y de aplicación de las cargas externas en las cuales no se puede reducir la fuerza Vu de diseño."),
    ("11.3.1.1", "\n\n 0,17 w Vc f c b d ′ = (11- 3)", "\n Vc = 0,17 √f’c bw d (11-3)"),
    ("11.3.1.2", "\n 0,17 1 14 w Nu Vc f c b d Ag ( ) ′ = + ( )\n (11-\n 4)\n", "\n Vc = 0,17 (1 + Nu / 14 Ag) √f’c bw d (11-4)\n"),
    ("11.3.2.1", "\n (0,16 17 ) w Vu d Vc f c b d w Mu ′ = + ρ (11-5)\n pero no mayor que 0,29 w f c b d ′ . Además el término / Vu d Mu no", "\n Vc = (0,16 √f’c + 17 ρw Vu d / Mu) bw d (11-5)\n pero no mayor que 0,29 √f’c bw d. Además el término Vu d / Mu no"),
    ("11.3.2.2", "y / Vud Mu no limitada a 1,0 donde:\n 4\n 8 m h d M Mu Nu − − ( ) = ( )\n (11-6)\n\n Sin embargo, Vc no debe tomarse mayor que\n 0,29 0,29 1 w Nu Vc f c b d\n Ag ′ = + (11-7)\n\n", "y Vu d / Mu no limitada a 1,0 donde:\n Mm = Mu − Nu (4h − d) / 8 (11-6)\n Sin embargo, Vc no debe tomarse mayor que\n Vc = 0,29 √f’c bw d √(1 + 0,29 Nu / Ag) (11-7)\n"),
    ("11.3.2.3", "\n\n 0,29 0,17 1 w Nu Vc f c b d Ag ′ = − ( ) ( )\n (11-\n 8)\n", "\n Vc = 0,17 (1 + 0,29 Nu / Ag) √f’c bw d (11-8)\n"),
    ("11.4.2", "\n 0,05 4,8 w Vu dp Vc f c b d Mu ′ = + ( ) ( )\n (11-9)\n pero no es necesario considerar Vc menor que 0,17 w f c b d ′ . Sin embargo, Vc no\n debe tomarse mayor que 0,42 w f c b d ′ ni que el valor dado en 11.4.4 u 11.4.5. Además / Vu dp Mu no", "\n Vc = (0,05 √f’c + 4,8 Vu dp / Mu) bw d (11-9)\n pero no es necesario considerar Vc menor que 0,17 √f’c bw d. Sin embargo, Vc no debe tomarse mayor que 0,42 √f’c bw d ni que el valor dado en 11.4.4 u 11.4.5. Además Vu dp / Mu no"),
    ("11.4.3.1", "\n max 0,05 cre w Vi M Vci f c b dp Vd\n M ′ = + + (11-10)\n donde no hay necesidad de considerar dp menor que 0,80h y Mcre se calcula con:\n ( ) 0,5 cre I M f c fpe fd Yt\n ′ = + − ( ) ( )\n (11-11)\n los valores", "\n Vci = 0,05 √f’c bw dp + Vd + Vi Mcre / Mmax (11-10)\n donde no hay necesidad de considerar dp menor que 0,80h y Mcre se calcula con:\n Mcre = (I / Yt) (0,5 √f’c + fpe − fd) (11-11)\n Los valores"),
    ("11.4.3.1", "menor que 0,14 w f c b d ′ .", "menor que 0,14 √f’c bw d."),
    ("11.4.3.2", "\n ( ) 0,29 0,3 w Vcw f c fpc b dp Vp ′ = + + (11-\n 12)\n donde no hay necesidad de tomar dp menor de 0,80h.\n\n", "\n Vcw = (0,29 √f’c + 0,3 fpc) bw dp + Vp (11-12)\n donde no hay necesidad de tomar dp menor de 0,80h.\n"),
    ("11.4.3.2", "tracción de 0,33 f c′ en el eje", "tracción de 0,33 √f’c en el eje"),
    ("11.5.5.3", "w f c b d ′ , las separaciones", "Donde Vs sobrepase 0,33 √f’c bw d, las separaciones"),
    ("11.5.6.2", "\n min 0,062 w b s Av f c\n fyt ′ = (11-13)\n Pero no debe ser menor que 0,35 / w b s fyt .", "\n Av min = 0,062 √f’c bw s / fyt (11-13)\n Pero no debe ser menor que 0,35 bw s / fyt."),
    ("11.5.6.3", "\n min\n 80 w\n Aps fpu s d Av\n fyt d b = (11-14)", "\n Av min = (Aps fpu s / 80 fyt d) √(d / bw) (11-14)"),
    ("11.5.7.2", "\n\n Av fyt d Vs\n s = (11-\n 15)\n", "\n Vs = Av fyt d / s (11-15)\n"),
    ("11.5.7.4", "\n ( ) sen cos Av fyt d Vs\n s\n α+ α = (11-16)\n", "\n Vs = Av fyt (sen α + cos α) d / s (11-16)\n"),
    ("11.5.7.5", "\n sen Vs Av fyt = α (11-17)\n pero no mayor que 0,25 w f c b d ′ ,", "\n Vs = Av fyt sen α (11-17)\n pero no mayor que 0,25 √f’c bw d,"),
    ("11.5.7.9", "mayor que 0,66 w f c b d ′ .", "mayor que 0,66 √f’c bw d."),
    ("11.5.8.2", "\n\n hs Ah fy Vu\n hp φ ≥\n\n", "\n φ Ah fy ≥ Vu hs / hp\n"),
    ("11.6.1", "\n\n (a) en elementos no preesforzados:\n Fig. 11.5.8 Refuerzo de suspensión.\n\n 2 0,083 cp\n Acp f c\n P ′ φ\n ( ) ( ) (b) en elementos preesforzados:\n 2 0,083 1 0,33\n cp\n cp\n A fpc f c\n P f c ′ φ +\n ′\n ( ) ( ) (c) Para elementos no preesforzados sometidos a tracción axial o fuerzas de compresión:\n 2 0,083 1 0,33 cp\n A Nu cp f c\n P Ag f c ′ φ +\n ′\n ( ) ( )\n\n Nu es positivo", "\n (a) en elementos no preesforzados:\n φ 0,083 √f’c (Acp² / Pcp)\n (b) en elementos preesforzados:\n φ 0,083 √f’c (Acp² / Pcp) √(1 + fpc / 0,33 √f’c)\n (c) Para elementos no preesforzados sometidos a tracción axial o fuerzas de compresión:\n φ 0,083 √f’c (Acp² / Pcp) √(1 + Nu / 0,33 Ag √f’c)\n Nu es positivo"),
    ("11.6.2.2", "\n 2 0,33 cp\n cp\n A fc P ′ φ\n ( ) ( ) (b) En elementos preesforzados, en las secciones descritas en 11.6.2.5:\n\n (c) Para elementos no preesforzados sometidos a una fuerza axial de tracción o compresión:\n\n Fig. 11.6.2.2 Casos en los cuales la resistencia a la torsión no es indispensable para el\n equilibrio de la estructura (torsión de compatibilidad).\n Fig. 11.6.2.1 Casos en los cuales la resistencia a la torsión es indispensable para\n el equilibrio de la estructura (torsión de equilibrio).\n 2 0,33 1 0,33\n cp\n cp\n A fpc fc P fc ′ φ +\n ′\n ( ) ( )\n 2 0,33 1 0,33\n cp\n cp\n A Nu fc P Ag fc ′ φ +\n ′\n ( ) ( )\n\n En los casos", "\n φ 0,33 √f’c (Acp² / Pcp)\n (b) En elementos preesforzados, en las secciones descritas en 11.6.2.5:\n φ 0,33 √f’c (Acp² / Pcp) √(1 + fpc / 0,33 √f’c)\n (c) Para elementos no preesforzados sometidos a una fuerza axial de tracción o compresión:\n φ 0,33 √f’c (Acp² / Pcp) √(1 + Nu / 0,33 Ag √f’c)\n En los casos"),
    ("11.6.2.2", "en 11.6.2.2.", "en 11.6.2.2.\n\n Fig. 11.6.2.2 Casos en los cuales la resistencia a la torsión no es indispensable para el equilibrio de la estructura (torsión de compatibilidad).\n Fig. 11.6.2.1 Casos en los cuales la resistencia a la torsión es indispensable para el equilibrio de la estructura (torsión de equilibrio)."),
    ("11.6.3.1", "\n\n (a) en secciones sólidas:\n 2 2\n 2 0,66 1,7 w w oh\n Vu Tu Ph Vc f c b d A b d\n ′ + ≤φ + ( ) ( ) ( ) ( ) ( ) ( )\n (11-18)\n (b) en secciones huecas:\n 2 0,66 1,7\n h\n w w oh\n Vu Tu P Vc f c b d A b d\n ′ + ≤φ + ( ) ( ) ( ) ( ) ( ) ( )\n (11-19)\n", "\n (a) en secciones sólidas:\n √[(Vu / bw d)² + (Tu Ph / 1,7 Aoh²)²] ≤ φ (Vc / bw d + 0,66 √f’c) (11-18)\n (b) en secciones huecas:\n (Vu / bw d) + (Tu Ph / 1,7 Aoh²) ≤ φ (Vc / bw d + 0,66 √f’c) (11-19)\n"),
    ("11.6.3.3", "menor que / oh h A P , el segundo término en la expresión (11-19) debe ser tomado como:\n 1,7 oh\n Tu\n A t ( ) ( ) donde t", "menor que Aoh / Ph, el segundo término en la expresión (11-19) debe ser tomado como:\n Tu / (1,7 Aoh t)\n donde t"),
    ("11.6.3.5", "\n Tn Tu φ ≥ (11- 20)", "\n φ Tn ≥ Tu (11-20)"),
    ("11.6.3.6", "\n 2 cot Ao At fyt Tn\n s = θ (11-21)\n\n Ao debe", "\n Tn = (2 Ao At fyt / s) cot θ (11-21)\n Ao debe"),
    ("11.6.3.6", "en (b), (b) 37.5°", "en (b).\n (b) 37.5°"),
    ("11.6.3.7", "\n 2 cot At fyt A Ph s fy = θ ( ) ( ) (11-\n 22)\n", "\n Aℓ = (At / s) Ph (fyt / fy) cot² θ (11-22)\n"),
    ("11.6.5.2", "\n ( ) 2 0,062 w b s Av At f c\n fyt ′ + = (11-23)\n pero no debe ser menor de ( ) 0,35 / w b s fyt .", "\n (Av + 2 At) = 0,062 √f’c bw s / fyt (11-23)\n pero no debe ser menor de 0,35 bw s / fyt."),
    ("11.6.5.3", "para torsión, min , A\n\n , debe calcularse mediante:\n\n min 0,42 , cp h f c A At fyt A P fy s fy\n ′ = −( ) ( ) (11-\n 24)\n donde / At s no debe tomarse menor que 0,175 / w b fyt ;", "para torsión, Aℓ,min, debe calcularse mediante:\n Aℓ,min = 0,42 √f’c Acp / fy − (At / s) Ph (fyt / fy) (11-24)\n donde At / s no debe tomarse menor que 0,175 bw / fyt;"),
    ("11.7.4.1", "\n vf Vn A fy = μ (11-25)\n", "\n Vn = Avf fy μ (11-25)\n"),
    ("11.7.4.2", "\n ( ) sen cos vf Vn A fy = μ α+ α (11-26)\n", "\n Vn = Avf fy (μ sen α + cos α) (11-26)\n"),
    ("11.7.4.3", "debe ser:\n - Para concreto colocado monolíticamente … 1,4λ - Concreto colocado contra concreto endurecido con la superficie de contacto intencionalmente rugosa tal como se especifica en 11.7.9 … 1,0λ - Concreto colocado contra concreto endurecido con la superficie de contacto no intencionalmente rugosa … 0,6λ\n Fig. 11.7.4.2 Refuerzo de cortante por fricción inclinado con respecto a la fisura supuesta.\n α\n\n - Concreto anclado a acero estructural laminado mediante conectores (studs) con cabeza o mediante barras de refuerzo que cumplan con 11.7.10 … 0,7λ\n", "debe ser:\n | Condición | μ\n | Para concreto colocado monolíticamente | 1,4λ\n | Concreto colocado contra concreto endurecido con la superficie de contacto intencionalmente rugosa tal como se especifica en 11.7.9 | 1,0λ\n | Concreto colocado contra concreto endurecido con la superficie de contacto no intencionalmente rugosa | 0,6λ\n | Concreto anclado a acero estructural laminado mediante conectores (studs) con cabeza o mediante barras de refuerzo que cumplan con 11.7.10 | 0,7λ\n"),
    ("11.7.4.3", "sustitución parcial de arena.", "sustitución parcial de arena.\n\n Fig. 11.7.4.2 Refuerzo de cortante por fricción inclinado con respecto a la fisura supuesta."),
    ("11.8.3", "\n\n 0,83 w Vn f c b d ′ ≤\n (11-27)", "\n Vn ≤ 0,83 √f’c bw d (11-27)"),
    ("11.8.5", "\n\n 0,17 w Vc f c b d ′ = (11-28)", "\n Vc = 0,17 √f’c bw d (11-28)"),
    ("11.8.6", "\n 2\n 1 11\n 12 12\n n n Av Avh d d Vs fy d s s\n + − = +\n [ ] ( ) ( ) ( ) ( ) [ ] (11-29)\n\n Av: Área de refuerzo por corte, perpendicular al refuerzo de tracción por flexión\n espaciado una distancia s. Avh: Área de refuerzo por corte, paralelo al refuerzo de flexión espaciado una\n distancia s2.", "\n Vs = [(Av / s) (1 + ℓn/d) / 12 + (Avh / s2) (11 − ℓn/d) / 12] fy d (11-29)\n Av: Área de refuerzo por corte, perpendicular al refuerzo de tracción por flexión espaciado una distancia s.\n Avh: Área de refuerzo por corte, paralelo al refuerzo de flexión espaciado una distancia s2."),
    ("11.9.3.2.1", "el menor de 0,2 w f c b d ′ ó 5,5 w b d .", "el menor de 0,2 f’c bw d ó 5,5 bw d."),
    ("11.9.3.2.2", "el menor de ( ) 0,2 0,07 / w v d f c b d a ′ −\n ó ( ) 5,5 1,9 / w v d b d a − .", "el menor de (0,2 − 0,07 av/d) f’c bw d ó (5,5 − 1,9 av/d) bw d."),
    ("11.10.4", "\n 0,83 Vn f c Acw ′ ≤ donde Acw", "\n Vn ≤ 0,83 √f’c Acw\n donde Acw"),
    ("11.10.5", "\n ( ) c Vc Acw f c′ = α (11-\n 30)\n donde el coeficiente αc es 0,25 para [ ] / 1,5 hm m ≤\n\n ; 0,17 para [ ] / 2,0 hm m ≥ y\n varia linealmente entre 0,25 y 0,17 para [ ] / hm m entre 1,5 y 2,0. m es la longitud", "\n Vc = Acw (αc √f’c) (11-30)\n donde el coeficiente αc es 0,25 para hm/ℓm ≤ 1,5; 0,17 para hm/ℓm ≥ 2,0 y varía linealmente entre 0,25 y 0,17 para hm/ℓm entre 1,5 y 2,0. ℓm es la longitud"),
    ("11.10.6", "ecuación (11- 30)", "ecuación (11-30)"),
    ("11.10.7", "0,085 f c Acw ′ , el refuerzo distribuido debe proporcionarse según lo estipulado en 11.10.10 o de acuerdo con los siguientes mínimos: (a)", "Donde Vu sea menor que 0,085 √f’c Acw, el refuerzo distribuido debe proporcionarse según lo estipulado en 11.10.10 o de acuerdo con los siguientes mínimos:\n (a)"),
    ("11.10.7", "0,002. (b)", "0,002.\n (b)"),
    ("11.10.8", "f c Acw ′ el refuerzo", "Donde Vu sea mayor que 0,085 √f’c Acw el refuerzo"),
    ("11.10.10.1", "\n Vs Acw h fy = ρ (11-31)\n donde h ρ es", "\n Vs = Acw ρh fy (11-31)\n donde ρh es"),
    ("11.10.10.3", "ρ, no debe ser menor que:\n ( ) 0,0025 0,5 2,5 0,0025 0,0025 m\n m\n h v h ρ= + − ρ− ≥ ( ) ( ) (11-32)\n pero no necesita ser mayor que el valor de h ρ requerido por 11.10.10.1. En la ecuación (11-32), hm es la altura total del muro y m es", "La cuantía de refuerzo vertical para cortante, ρv, no debe ser menor que:\n ρv = 0,0025 + 0,5 (2,5 − hm/ℓm) (ρh − 0,0025) ≥ 0,0025 (11-32)\n pero no necesita ser mayor que el valor de ρh requerido por 11.10.10.1. En la ecuación (11-32), hm es la altura total del muro y ℓm es"),
    ("11.12.2.1", "\n (a)\n 2 0,17 1 o Vc f c b d ′ = +\n β ( ) ( )\n (11-\n 33)\n", "\n (a) Vc = 0,17 (1 + 2/β) √f’c bo d (11-33)\n"),
    ("11.12.2.1", "\n (b)\n 0,083 2 s o o\n d Vc f c b d b\n α ′ = + ( ) ( )\n (11-\n 34)\n", "\n (b) Vc = 0,083 (αs d / bo + 2) √f’c bo d (11-34)\n"),
    ("11.12.2.1", "\n (c)\n\n 0,33 o Vc f c b d ′ = (11- 35)\n\n β = an / bn", "\n (c) Vc = 0,33 √f’c bo d (11-35)\n β = an / bn"),
    ("11.12.2.2", "\n ( ) 0,3 p o Vc f c fpc b d Vp ′ =β + + (11-36)\n donde βp es el menor entre 0,29 y ( ) 0,0083 / 1,5 s o d b + α ,", "\n Vc = (βp √f’c + 0,3 fpc) bo d + Vp (11-36)\n donde βp es el menor entre 0,29 y 0,0083 (αs d / bo + 1,5),"),
    ("11.12.2.2", "11.12.1.2, pc f se toma", "11.12.1.2, fpc se toma"),
    ("11.12.2.2", "crítica. Se permite", "crítica.\n Se permite"),
    ("11.12.2.2", "(b) El valor de f c′ utilizado", "(b) El valor de √f’c utilizado"),
    ("11.12.2.2", "0,5 MPa. (c)", "0,5 MPa.\n (c)"),
    ("11.12.3.1", "mayor que 0,17 o f c b d ′ y Vs", "mayor que 0,17 √f’c bo d y Vs"),
    ("11.12.3.2", "o f c b d ′ .", "Vn no debe considerarse mayor que 0,5 √f’c bo d."),
    ("11.12.6.1", "\n ( ) 1 v f γ= −γ (11-\n 39)", "\n γv = (1 − γf) (11-39)"),
    ("11.12.6.2", "\n n\n o\n Vc v\n b d\n φ φ = (11-\n 40)\n", "\n φ vn = φ Vc / (bo d) (11-40)\n"),
    ("11.12.6.2", "\n\n Fig. 11.12.5.1 Aberturas y bordes libres en losas (las líneas discontinuas\n muestran el perímetro efectivo).\n\n ( ) n\n o\n Vc Vs v\n b d\n φ + φ = (11-\n 41)\n", "\n φ vn = φ (Vc + Vs) / (bo d) (11-41)\n"),
    ("11.12.6.2", "de\n 0,17 f c′ φ en la sección", "de φ 0,17 √f’c en la sección"),
    ("11.12.6.2", "\n\n a) Columna interior\n Fig. 11.12.6 Distribución de los esfuerzos cortantes en el perímetro de la sección crítica en\n conexiones losa a columna\n b) Columna de borde", "\n\n Fig. 11.12.5.1 Aberturas y bordes libres en losas (las líneas discontinuas muestran el perímetro efectivo).\n Fig. 11.12.6 Distribución de los esfuerzos cortantes en el perímetro de la sección crítica en conexiones losa a columna"),
    # ───── Fórmulas dentro del texto y oraciones que la extracción tomó por epígrafe ─────
    ("1.2.2.1", "indicados en la NTE", "La concepción estructural deberá hacerse de acuerdo a los criterios de estructuración indicados en la NTE"),
    ("9.6.2.5", "\n 1 50 ' ξ λΔ= + ρ (9-15) donde ρ′ es", "\n λΔ = ξ / (1 + 50 ρ’) (9-15)\n donde ρ’ es"),
    ("9.6.2.5", "igual a:\n 5 años o más … 2,0 12 meses … 1,4 6 meses … 1,2 3 meses … 1,0\n", "igual a:\n | Duración de la carga sostenida | ξ\n | 5 años o más | 2,0\n | 12 meses | 1,4\n | 6 meses | 1,2\n | 3 meses | 1,0\n"),
    ("11.6.3.8", "\n\n ( ) total 2 v t A Av At\n s s s\n + = + ( ) ( ) ( ) ( )\n\n", "\n (A(v+t) / s) total = Av / s + 2 (At / s)\n"),
    ("11.6.3.9", "igual a ( ) / 0,9 Mu d fy ,", "igual a Mu / (0,9 d fy),"),
    ("11.6.3.10", "igual a A fy\n\n , basada en el valor de Tu en esa sección, y (b)", "igual a Aℓ fy, basada en el valor de Tu en esa sección, y\n (b)"),
    ("11.6.4.4", "menor que 0,5 / oh A Ph .", "menor que 0,5 Aoh / Ph."),
    ("11.8.1", "que no exceda cuatro", "Las disposiciones de 11.8 deben ser aplicadas a elementos con ℓn que no exceda cuatro"),
    ("11.9.3", "amplificado ( ) Mu Vu v Nuc h d a = + − [ ] [ ] y una\n fuerza", "amplificado Mu = [Vu av + Nuc (h − d)] y una fuerza"),
    ("11.9.3.3", "( ) Mu Vu v Nuc h d a = + − [ ] [ ]\n debe", "El refuerzo Af para resistir el momento amplificado Mu = [Vu av + Nuc (h − d)] debe"),
    ("11.9.3.4", "mediante: An fy Nuc φ ≥ .", "mediante: φ An fy ≥ Nuc."),
    ("11.9.3.5", "entre (Af + An) y 2\n 3 Avf An + ( ) ( )\n .", "El área del refuerzo principal de tracción, Asc, no debe ser menor que la mayor entre (Af + An) y (2/3 Avf + An)."),
    ("11.9.4", "de los ( ) 2/3 d adyacentes", "de los (2/3) d adyacentes"),
    ("12.9.2", "ℓ en una sección", "Se permite un embebido menor que ℓd en una sección"),
    ("7.11.3", "(longitud de traslape de 1,3 d\n\n ) o anclándolas", "(longitud de traslape de 1,3 ℓd) o anclándolas"),
    ("9.3.2.2", "sin flexión … 0,90 (b) Carga axial de compresión con o sin flexión: Elementos con refuerzo en espiral según 10.9.3 … 0,75 Otros elementos … 0,70\n Para elementos en flexocompresión\n\n φ puede incrementarse linealmente hasta 0,90 en la medida que\n\n φPn disminuye desde 0,1 f’c Ag ó\n\n φPb, el que", "sin flexión: 0,90\n (b) Carga axial de compresión con o sin flexión:\n Elementos con refuerzo en espiral según 10.9.3: 0,75\n Otros elementos: 0,70\n Para elementos en flexocompresión φ puede incrementarse linealmente hasta 0,90 en la medida que φPn disminuye desde 0,1 f’c Ag ó φPb, el que"),
    ("9.6.2.1", "\n\n Espesor o peralte mínimo, h\n\n Simplemente\n apoyados\n Con un extremo continuo\n Ambos extremos continuos\n En voladizo\n Elementos\n Elementos que no soporten o estén ligados a divisiones u otro tipo de elementos no estructurales susceptibles de dañarse debido a deflexiones grandes. Losas macizas en una dirección 20 ℓ 24 ℓ 28 ℓ 10 ℓ\n Vigas o losas nervadas en una dirección 16 ℓ 5, 18 ℓ\n\n 21 ℓ 8 ℓ\n\n Notas:", "\n Notas:"),
    ("9.6.2.1", "no menos de 1,09 (b) Para fy", "no menos de 1,09.\n (b) Para fy"),
    ("10.7.1", "(a) luz libre, n\n\n , igual o menor a cuatro veces el peralte total del elemento, o (b)", "(a) luz libre, ℓn, igual o menor a cuatro veces el peralte total del elemento, o\n (b)"),
    # ───── Cap. 12 ─────
    ("12.2.2", "\n Condiciones\n Alambres corrugados o barras\n de 3/4” y menores\n Barras mayores de\n 3/4”\n Espaciamiento libre entre barras o alambres que están siendo empalmados o desarrolladas no menor que db, con recubrimiento libre no menor que db, y estribos a lo largo de ℓd por lo menos iguales al mínimo indicado en 11.5.6.\n Aplicable también cuando el espaciamiento libre entre barras o alambres que están siendo desarrolladas o empalmadas no sea menor que 2 db y el recubrimiento libre no menor que db (ver Fig.12.1).\n ψ ψ λ\n 2,6\n t e fy db f c′\n ( ) ( )\n\n ψ ψ λ\n 2,1\n t e fy db f c′\n ( ) ( )\n\n Otros casos Ver 12.2.3 Ver 12.2.3\n", "\n | Condiciones | Alambres corrugados o barras de 3/4” y menores | Barras mayores de 3/4”\n | Espaciamiento libre entre barras o alambres que están siendo empalmados o desarrolladas no menor que db, con recubrimiento libre no menor que db, y estribos a lo largo de ℓd por lo menos iguales al mínimo indicado en 11.5.6. Aplicable también cuando el espaciamiento libre entre barras o alambres que están siendo desarrolladas o empalmadas no sea menor que 2 db y el recubrimiento libre no menor que db (ver Fig. 12.2.2). | (fy ψt ψe λ / 2,6 √f’c) db | (fy ψt ψe λ / 2,1 √f’c) db\n | Otros casos | Ver 12.2.3 | Ver 12.2.3\n"),
    ("12.2.3", "\n\n λ\n 1,1\n t e s fy db cb Ktr f c\n db\n ΨΨΨ\n + ′\n ( ) ( ) ( ) ( )\n (12-1)\n\n El término cb Ktr\n db\n + ( ) ( )\n no debe tomarse mayor a 2,5 y\n 10\n Atr fyt Ktr\n s n = (12-2) en donde: n es el número de barras o alambres que se empalman o desarrollan dentro del plano de hendimiento (splitting). cb es la menor distancia entre:\n (a) La distancia del centro de una barra o alambre a la superficie más cercana del concreto. (b)", "\n ℓd = [fy Ψt Ψe Ψs λ / (1,1 √f’c (cb + Ktr) / db)] db (12-1)\n El término (cb + Ktr)/db no debe tomarse mayor a 2,5 y\n Ktr = Atr fyt / 10 s n (12-2)\n en donde:\n n es el número de barras o alambres que se empalman o desarrollan dentro del plano de hendimiento (splitting).\n cb es la menor distancia entre:\n (a) La distancia del centro de una barra o alambre a la superficie más cercana del concreto.\n (b)"),
    ("12.2.3", "que se desarrollan. Se permite", "que se desarrollan.\n Se permite"),
    ("12.2.4", "\n Factor Condiciones Valor\n Ψt\n Barras superiores.*\n Otras barras.\n 1,3\n 1,0\n\n Ψe\n Barras o alambres con tratamiento superficial epóxico y recubrimiento menor que 3db o espaciamiento libre menor que 6 db.\n Otras barras o alambres con tratamiento superficial epóxico.\n Barras sin tratamiento superficial\n\n 1,5\n\n 1,2\n 1,0\n Ψs\n Barras de 3/4” y menores.\n Barras mayores de 3/4”.\n 0,8\n 1,0\n λ\n Concreto liviano.\n Concreto de peso normal.\n 1,3\n 1,0\n El producto: Ψt Ψs no necesita considerarse mayor que 1,7 * Se consideran", "\n | Factor | Condiciones | Valor\n | Ψt | Barras superiores.* | 1,3\n | Ψt | Otras barras. | 1,0\n | Ψe | Barras o alambres con tratamiento superficial epóxico y recubrimiento menor que 3db o espaciamiento libre menor que 6 db. | 1,5\n | Ψe | Otras barras o alambres con tratamiento superficial epóxico. | 1,2\n | Ψe | Barras sin tratamiento superficial | 1,0\n | Ψs | Barras de 3/4” y menores. | 0,8\n | Ψs | Barras mayores de 3/4”. | 1,0\n | λ | Concreto liviano. | 1,3\n | λ | Concreto de peso normal. | 1,0\n El producto: Ψt Ψs no necesita considerarse mayor que 1,7\n * Se consideran"),
    ("12.3.2", "como el\n mayor entre (0,24 / ) fy f c db ′ y ( ) 0,043fy db, donde la constante 0,043 tiene la\n unidad de mm2/N.", "como el mayor entre (0,24 fy / √f’c) db y (0,043 fy) db, donde la constante 0,043 tiene la unidad de mm²/N."),
    ("12.5.2", "debe ser ( ) 0,24 λ / e fy f c db ′ Ψ con Ψe", "debe ser (0,24 Ψe λ fy / √f’c) db con Ψe"),
    ("12.5.3", """ (a) Para barras de 1 3/8” y menores, ganchos con recubrimiento lateral (normal al
 plano del gancho) no menor de 65 mm y para ganchos de 90º adicionalmente con recubrimiento en la extensión de la barra más allá del gancho no menor de 50 mm … 0,7

 Fig. 12.5.3.a Casos en los que se puede multiplicar ℓdg por 0,7
 (b) Para ganchos de 90º de barras 1 3/8” y menores que se encuentran confinados
 por estribos""", """ (a) Para barras de 1 3/8” y menores, ganchos con recubrimiento lateral (normal al plano del gancho) no menor de 65 mm y para ganchos de 90º adicionalmente con recubrimiento en la extensión de la barra más allá del gancho no menor de 50 mm: 0,7
 (b) Para ganchos de 90º de barras 1 3/8” y menores que se encuentran confinados por estribos"""),
    ("12.5.3", """ más el doblez … 0,8

 Fig. 12.5.3.b Casos con gancho estándar a 90º en los que se puede multiplicar ℓdg
 por 0,8 (c) Ganchos de 180º en barras de 1 3/8” y menores que se encuentran confinados
 con estribos perpendiculares a la barra que se está desarrollando, espaciados a no más de 3 db
 a lo largo de ℓdg … 0.8

 Fig. 12.5.3.c Caso con gancho estándar a 180º en el que se puede multiplicar ldg por
 0,8 (d) Para elementos""", """ más el doblez: 0,8
 (c) Ganchos de 180º en barras de 1 3/8” y menores que se encuentran confinados con estribos perpendiculares a la barra que se está desarrollando, espaciados a no más de 3 db a lo largo de ℓdg: 0,8
 (d) Para elementos"""),
    ("12.5.3", "requerida por análisis … As requerido\n As proporcionado\n\n En 12.5.3", "requerida por análisis: As requerido / As proporcionado\n En 12.5.3"),
    ("12.5.3", "borde exterior del gancho.", "borde exterior del gancho.\n\n Fig. 12.5.3.a Casos en los que se puede multiplicar ℓdg por 0,7\n Fig. 12.5.3.b Casos con gancho estándar a 90º en los que se puede multiplicar ℓdg por 0,8\n Fig. 12.5.3.c Caso con gancho estándar a 180º en el que se puede multiplicar ℓdg por 0,8"),
    ("12.7.2", "\n\n ( ) 240 fy\n fy\n − ó 5 db\n s ( ) ( ) pero", "\n (fy − 240) / fy ó 5 db / s\n pero"),
    ("12.8", "\n 3,3 λ b A fy d\n s f c =\n ′ ( ) ( ) ( )( ) (12-3) donde", "\n ℓd = 3,3 (Ab / s) (fy / √f’c) λ (12-3)\n donde"),
    ("12.9.1", "\n\n 21 7\n fse fps fse d db db − = + ( ) ( ) ( ) ( ) (12-4)\n", "\n ℓd = (fse / 21) db + ((fps − fse) / 7) db (12-4)\n"),
    ("12.11.3", "\n\n Mn d a Vu ≤ + (12-\n 5)\n donde Mn se calcula suponiendo que todo el refuerzo de la sección está sometido a fy, Vu se calcula en la sección y a ℓ en el apoyo debe ser la longitud embebida más allá del centro del apoyo.\n a ℓ en el punto", "\n ℓd ≤ Mn / Vu + ℓa (12-5)\n donde Mn se calcula suponiendo que todo el refuerzo de la sección está sometido a fy, Vu se calcula en la sección y ℓa en el apoyo debe ser la longitud embebida más allá del centro del apoyo.\n ℓa en el punto"),
    ("12.12.3", "ó /16 n\n\n, la que", "ó ℓn/16, la que"),
    ("12.15.2", "\n As proporcionado / As requerido (*) · Porcentaje máximo de As empalmado en la longitud requerida para dicho empalme: 50 100\n Igual o mayor que 2 Clase A Clase B Menor que 2 Clase B Clase B\n", "\n | As proporcionado / As requerido (*) | 50% de As empalmado en la longitud requerida | 100% de As empalmado en la longitud requerida\n | Igual o mayor que 2 | Clase A | Clase B\n | Menor que 2 | Clase B | Clase B\n"),
    # ───── Caps. 13 a 17 ─────
    ("13.2.2", "igual a 0,25 2 ó 0,25 1\n\n , el que", "igual a 0,25 ℓ2 ó 0,25 ℓ1, el que"),
    ("13.5.3.1", "transmitido y.\n\n ( ) 1 2\n 1 γ\n 1 2/3 / f\n b b =\n +\n (13-\n 1)", "transmitido y\n γf = 1 / (1 + (2/3) √(b1/b2)) (13-1)"),
    ("13.6.1.6", "\n 2\n 2 2\n 1\n α 1 0,2 5,0 α 2\n f\n f ≤ ≤ (13-2)\n Donde αf 1 y αf 2 se calculan de acuerdo con la ecuación (13-3).\n αf Ecb Ib\n Ecs Is = (13-\n 3)", "\n 0,2 ≤ (αf1 ℓ2²) / (αf2 ℓ1²) ≤ 5,0 (13-2)\n Donde αf1 y αf2 se calculan de acuerdo con la ecuación (13-3).\n αf = Ecb Ib / (Ecs Is) (13-3)"),
    ("13.6.2.2", "\n 2 2\n 8\n qu n Mo = (13-\n 4)\n donde n es", "\n Mo = qu ℓ2 ℓn² / 8 (13-4)\n donde ℓn es"),
    ("13.6.2.3", "apoyos, 2 en la ecuación", "apoyos, ℓ2 en la ecuación"),
    ("13.6.2.4", "considerarse como 2 en la ecuación", "considerarse como ℓ2 en la ecuación"),
    ("13.6.4.1", "\n\n 2\n 1\n\n 0,50 1,00 2,00\n 2 1 1 α 0 f ( )= ( )\n\n 0,75 0,75 0,75\n 2 1 1 α 1,0 f ( )≥ ( )\n\n 0,90 0,75 0,45\n", "\n | ℓ2/ℓ1 | 0,50 | 1,00 | 2,00\n | (αf1 ℓ2/ℓ1) = 0 | 0,75 | 0,75 | 0,75\n | (αf1 ℓ2/ℓ1) ≥ 1,0 | 0,90 | 0,75 | 0,45\n"),
    ("13.6.4.2", "\n\n 2\n 1\n\n 0,5 1,0 2,0\n 2 1 1 α 0 f ( )= ( )\n\n βt = 0 1,00 1,00 1,00\n βt ≥ 25 0,75 0,75 0,75\n 2 1 1 α 1,0 f ( )≥ ( )\n\n βt = 0 1,00 1,00 1,00\n βt ≥ 25 0,90 0,75 0,45\n", "\n | ℓ2/ℓ1 | | 0,5 | 1,0 | 2,0\n | (αf1 ℓ2/ℓ1) = 0 | βt = 0 | 1,00 | 1,00 | 1,00\n | (αf1 ℓ2/ℓ1) = 0 | βt ≥ 25 | 0,75 | 0,75 | 0,75\n | (αf1 ℓ2/ℓ1) ≥ 1,0 | βt = 0 | 1,00 | 1,00 | 1,00\n | (αf1 ℓ2/ℓ1) ≥ 1,0 | βt ≥ 25 | 0,90 | 0,75 | 0,45\n"),
    ("13.6.4.2", "\n\n β 2\n cb\n cs s E C t E I = (13-\n 5)\n\n 3 1 0,63 3 x x y C y ( ) =Σ − ( )\n (13-\n 6)\n", "\n βt = Ecb C / (2 Ecs Is) (13-5)\n C = Σ (1 − 0,63 x/y) (x³ y / 3) (13-6)\n"),
    ("13.6.4.3", "mayor que 0,75 2 utilizada para calcular Mo, los momentos negativos deben considerarse uniformemente distribuidos a lo largo de 2\n\n .", "mayor que 0,75 ℓ2 utilizada para calcular Mo, los momentos negativos deben considerarse uniformemente distribuidos a lo largo de ℓ2."),
    ("13.6.4.4", "\n\n 2\n 1\n\n 0,50 1,00 2,00\n 2 1 1 α 0 f ( )= ( )\n\n 0,60 0,60 0,60\n 2 1 1 α 1,0 f ( )≥ ( )\n\n 0,90 0,75 0,45\n", "\n | ℓ2/ℓ1 | 0,50 | 1,00 | 2,00\n | (αf1 ℓ2/ℓ1) = 0 | 0,60 | 0,60 | 0,60\n | (αf1 ℓ2/ℓ1) ≥ 1,0 | 0,90 | 0,75 | 0,45\n"),
    ("13.6.5.1", "si ( ) 1 2 1 α / f es igual", "si (αf1 ℓ2/ℓ1) es igual"),
    ("13.6.9.2", "\n\n ( ) ( ) 2 2 2 2 0,07 0,5 ( ) Du Lu Du n n M q q q′ = + − [ ] ′ ′ [ ] (13-\n 7) donde Du q′, 2′ y n′ se refieren", "\n M = 0,07 [(qDu + 0,5 qLu) ℓ2 ℓn² − q’Du ℓ’2 (ℓ’n)²] (13-7)\n donde q’Du, ℓ’2 y ℓ’n se refieren"),
    ("13.7.3.2", "(13-8) Mb = Cb wu B² (13-9) Donde: A:", "(13-8)\n Mb = Cb wu B² (13-9)\n Donde:\n A:"),
    ("13.7.3.2", "dirección B. Ca:", "dirección B.\n Ca:"),
    ("13.7.3.2", "dirección corta. Cb:", "dirección corta.\n Cb:"),
    ("13.7.4", "\n\n 1,0 0,5 2\n A A V w d\n B = − − ( )( ) ( )( ) (13-10)\n\n 13.7.3.2", "\n V = w (A/2 − d) (1,0 − 0,5 A/B) (13-10)\n 13.7.3.2"),
    ("14.5.2", "\n 2 0,55 1 32\n c Pn f c Ag\n h k ′ φ = φ − [ ] ( ) ( ) [ ] (14-1)\n", "\n φPn = 0,55 φ f’c Ag [1 − (k ℓc / 32h)²] (14-1)\n"),
    ("14.5.2", "inferior) … 0,8 (b) No restringidos contra la rotación en ambos extremos … 1,0\n Para muros no arriostrados con el fin de evitar el desplazamiento lateral … 2,0", "inferior): 0,8\n (b) No restringidos contra la rotación en ambos extremos: 1,0\n Para muros no arriostrados con el fin de evitar el desplazamiento lateral: 2,0"),
    ("15.4.4.2", "\n\n ( )\n 2 γ\n β 1 s =\n +\n (15-1)\n", "\n γs = 2 / (β + 1) (15-1)\n"),
    ("16.6.2.2", "sea al menos /180 n\n\n , pero no menos que: Para losas sólidas o alveolares … 50 mm Para vigas o elementos en forma de T … 75 mm\n", "sea al menos ℓn/180, pero no menos que:\n Para losas sólidas o alveolares: 50 mm\n Para vigas o elementos en forma de T: 75 mm\n"),
    ("17.5.3.3", "igual a\n (1,8 0,6 ) λ ρv fy bvd + , pero no mayor que 3,5 bv d. Deben usarse los valores de λ indicados en 11.7.4.3 y ρv es ( ) Av bv s .", "igual a (1,8 + 0,6 ρv fy) λ bv d, pero no mayor que 3,5 bv d. Deben usarse los valores de λ indicados en 11.7.4.3 y ρv es Av / (bv s)."),
    # ───── Cap. 18 ─────
    ("18.3.3", "(a) Clase U:\n 0,62 ft f c′ ≤ (b) Clase T:\n 0,62 1,0 f c ft f c ′ ′ < ≤\n\n Los sistemas de losas preesforzadas en dos direcciones deben ser diseñadas como Clase U, con 0,50 ft f c′ ≤ .", "(a) Clase U: ft ≤ 0,62 √f’c\n (b) Clase T: 0,62 √f’c < ft ≤ 1,0 √f’c\n Los sistemas de losas preesforzadas en dos direcciones deben ser diseñadas como Clase U, con ft ≤ 0,50 √f’c."),
    ("18.6.2.1", "a una distancia px\n\n , del extremo", "a una distancia ℓpx, del extremo"),
    ("18.6.2.1", "\n\n ( ) μ α K px p px Ppx Ppj e− + = (18-1)\n Cuando ( ) K px p px +μα no es mayor que 0,3; Ppx puede calcularse mediante:\n\n 1 (1 μ α ) Ppx Ppj K px p px − = + + (18-2) px debe", "\n Ppx = Ppj e^−(K ℓpx + μp αpx) (18-1)\n Cuando (K ℓpx + μp αpx) no es mayor que 0,3; Ppx puede calcularse mediante:\n Ppx = Ppj (1 + K ℓpx + μp αpx)^−1 (18-2)\n ℓpx debe"),
    ("18.6.2.2", "por curvatura p μ y por", "por curvatura μp y por"),
    ("18.7.2", "\n\n ( ) γ 1 ρ ω ω' β1\n p p fpu d fps fpu\n f c dp = − + − ′\n ( ) [ ]\n\n [ ] ( ) (18-3) donde p Aps bd ρ= ; fy f c′ ω=ρ ; ' ρ' fy f c′ ω= y γp es 0,55 para\n fpy fpu entre 0,80 y 0,85; 0,40 para fpy fpu entre 0,85 y 0,90 y 0,28 para\n fpy fpu mayor que 0,90.", "\n fps = fpu (1 − γp/β1 [ρp fpu/f’c + d/dp (ω − ω’)]) (18-3)\n donde ρp = Aps/bd; ω = ρ fy/f’c; ω’ = ρ’ fy/f’c y γp es 0,55 para fpy/fpu entre 0,80 y 0,85; 0,40 para fpy/fpu entre 0,85 y 0,90 y 0,28 para fpy/fpu mayor que 0,90."),
    ("18.7.2", "el término:\n\n Coeficiente por\n desviación accidental, K\n\n Coeficiente\n de curvatura,\n μp\n Tendones inyectados en ducto metálico\n Tendones de alambre Barras de alta resistencia\n Torones de 7 alambres\n 0,0033–0,0049 0,0003–0,0020 0,0016–0,0066\n\n 0,15 - 0,25 0,08 - 0,30 0,15 - 0,25\n Tendones no\n adheridos\n con mástique\n Tendones de alambre y\n torones de 7 alambres\n\n 0,0033–0,0066\n\n 0,05 - 0,15\n pre engrasados\n Tendones de alambre y\n torones de 7 alambres 0,0010–0,0066 0,05 - 0,15 ( ) ρ ' p fpu d f c dp [ ] + ω−ω\n\n ′ [ ] no debe", "el término:\n [ρp fpu / f’c + (d / dp) (ω − ω’)]\n no debe"),
    ("18.7.2", "\n 70 100 ρp\n f c fps fse ′ = + + (18-4)\n", "\n fps = fse + 70 + f’c / (100 ρp) (18-4)\n"),
    ("18.7.2", "\n 70 300 ρ\n f c fps fse\n p\n ′ = + + (18-5)\n", "\n fps = fse + 70 + f’c / (300 ρp) (18-5)\n"),
    ("18.8.1", "\n\n ωp , [ωp", "\n ωp, [ωp"),
    ("18.8.1", "como ρp fps f c′.", "como ρp fps / f’c."),
    ("18.9.2", "\n\n 0,004 As Act = (18-6) donde", "\n As = 0,004 Act (18-6)\n donde"),
    ("18.9.3.1", "no excede 0,17 f c′.", "no excede 0,17 √f’c."),
    ("18.9.3.2", "excede 0,17 f c′, el área", "excede 0,17 √f’c, el área"),
    ("18.9.3.2", "\n\n 0,5\n Nc As\n fy = (18-7) donde", "\n As = Nc / (0,5 fy) (18-7)\n donde"),
    ("18.9.4.1", "luz libre, n\n\n /3 , y estar", "luz libre, ℓn/3, y estar"),
    ("18.9.4.2", "luz libre, n\n\n /6 , a cada", "luz libre, ℓn/6, a cada"),
    ("18.13.4.2", "limitarse a\n 0,7λ f ci′.", "limitarse a 0,7 λ f’ci."),
    ("18.13.4.3", "de postensar, f ci′, debe", "de postensar, f’ci, debe"),
    # ───── Cap. 21 ─────
    ("21.6.2.2", "\n 1,2 Mnc Mnv ≥ Σ Σ (21-1)\n donde:\n Mnc Σ = suma", "\n ΣMnc ≥ 1,2 ΣMnv (21-1)\n donde:\n ΣMnc = suma"),
    ("21.6.2.2", "\n Mnv Σ = suma", "\n ΣMnv = suma"),
    ("21.6.2.2", "contribuye a Mnv , siempre", "contribuye a Mnv, siempre"),
    ("21.6.4.1", "circulares, ρs , no debe ser menor que la requerida en la ecuación (21-2).\n ρ 0,12 s\n f c fyt = ′ (21-\n 2) y no debe ser menor que la requerida en 10.9.3 por la ecuación (10-5). (b)", "circulares, ρs, no debe ser menor que la requerida en la ecuación (21-2)\n ρs = 0,12 f’c / fyt (21-2)\n y no debe ser menor que la requerida en 10.9.3 por la ecuación (10-5).\n (b)"),
    ("21.6.4.1", "ecuaciones (21-3) y (21-4)\n\n 0,3 1 c\n yh\n s b f Ag c Ash\n f Ach\n ′ = − [ ] ( ) ( ) [ ] (21-3)\n\n 0,09 c\n yh\n s b f c Ash\n f\n ′ = (21-4)\n", "ecuaciones (21-3) y (21-4)\n Ash = 0,3 (s bc f’c / fyh) [(Ag / Ach) − 1] (21-3)\n Ash = 0,09 s bc f’c / fyh (21-4)\n"),
    ("21.7.4.1", "peso normal: Para nudos confinados en las cuatro caras: … 1,7 f c Aj ′\n Para nudos confinados en tres caras o en dos caras opuestas: … 1,2 f c Aj ′\n Para otros casos … 1,0 f c Aj ′\n\n", "peso normal:\n | Nudo | Vn máximo\n | Para nudos confinados en las cuatro caras: | 1,7 √f’c Aj\n | Para nudos confinados en tres caras o en dos caras opuestas: | 1,2 √f’c Aj\n | Para otros casos | 1,0 √f’c Aj\n"),
    ("21.7.4.1", "el menor de (a) y (b): (a) el ancho", "el menor de (a) y (b):\n (a) el ancho"),
    ("21.9.4.3", "mm. (b) O cuando la fuerza cortante Vu exceda 0,17 Acv f c′", "mm.\n (b) O cuando la fuerza cortante Vu exceda 0,17 Acv √f’c"),
    ("21.9.5.3", "\n Mn Vu Vua\n Mua ≥ ( ) ( ) (21-5)\n", "\n Vu ≥ Vua (Mn / Mua) (21-5)\n"),
    ("21.9.5.3", "\n\n Esta disposición podrá limitarse a una altura del muro medida desde la base\n equivalente a la longitud del muro m\n\n ,\n 4\n Mu\n Vu\n ó la altura de los dos primeros pisos, la\n que sea mayor.", "\n Esta disposición podrá limitarse a una altura del muro medida desde la base equivalente a la longitud del muro ℓm, Mu / (4 Vu) ó la altura de los dos primeros pisos, la que sea mayor."),
    ("21.9.7.4", "\n\n (a) Los elementos", "\n (a) Los elementos"),
    ("21.9.7.4", "exceda de:\n 600 ( / )\n m\n m c\n u h δ ≥ (21-6)\n m es la longitud", "exceda de:\n c ≥ ℓm / [600 (δu / hm)] (21-6)\n ℓm es la longitud"),
    ("21.9.7.4", "correspondiente a m h y debe", "correspondiente a hm y debe"),
    ("21.9.7.4", "El cociente\n δ / m u h en la ecuación", "El cociente δu / hm en la ecuación"),
    ("21.9.7.4", "extremo del muro.\n\n (b)", "extremo del muro.\n (b)"),
    ("21.9.7.4", "a una distancia no\n menor que el mayor valor entre m y\n 4\n Mu\n Vu\n .", "a una distancia no menor que el mayor valor entre ℓm y Mu / (4 Vu)."),
    ("21.9.7.6", "entre ( ) 0,1 c m − y / 2 c ,", "entre (c − 0,1 ℓm) y c/2,"),
    ("21.9.7.6", "diámetro. - La menor dimensión de la sección transversal del elemento de borde. - 250 mm.", "diámetro.\n - La menor dimensión de la sección transversal del elemento de borde.\n - 250 mm."),
    ("21.9.7.6", "base del muro debe\n extenderse", "base del muro debe extenderse"),
    ("21.9.7.6", "para desarrollar\n fy,", "para desarrollar fy,"),
    ("21.9.8", "(Nu + Av fy) φ = 0,85 (21-7)", "(Nu + Av fy), con φ = 0,85 (21-7)"),
    ("21.9.9.4", "mayor que 0,83Acw f c′ donde", "mayor que 0,83 Acw √f’c donde"),
    ("21.9.9.5", "(f):\n\n (a) Vn, se debe determinar mediante:\n Vn = 2 Avd\n fy\n sen α\n ≤\n 0,83Acw f c′ (21-8)\n", "(f):\n (a) Vn, se debe determinar mediante:\n Vn = 2 Avd fy sen α ≤ 0,83 Acw √f’c (21-8)\n"),
    ("21.9.9.5", "especificado en c, podrá proveerse refuerzo\n transversal", "especificado en c, podrá proveerse refuerzo transversal"),
    ("21.11.7.1", "\n\n ( ) 0,17 ρ Vn Acv f c t fy ′ = + (21-9)", "\n Vn = Acv (0,17 √f’c + ρt fy) (21-9)"),
    ("21.11.7.2", "\n ( ) ρ Vn Acv t fy = (21-10)\n", "\n Vn = Acv ρt fy (21-10)\n"),
    # ───── Restos sueltos ─────
    ("10.17.1", "se multiplique por 2 1 / A A , pero", "se multiplique por √(A2/A1), pero"),
    ("18.14.2.3", "desde 3 8 h hasta\n 2 h delante", "desde 3/8 h hasta 2 h delante"),
    ("2.1", "espaciamiento 2s ,", "espaciamiento s2,"),
]

# Oraciones que la extracción tomó por epígrafe (el texto ya las lleva completas): se quita el epígrafe.
EPIGRAFES_FALSOS = {
    "1.2.2.1", "10.12.3.2", "10.13.4.2", "11.1.2", "11.1.2.1", "11.5.5.3", "11.8.1", "11.9.3.3", "11.9.3.5",
    "11.10.7", "11.10.8", "11.10.10.3", "11.12.3.2", "12.1.2", "12.2.3", "12.3.3", "12.5.3", "12.9.2",
    "13.2.1", "13.6.2.5", "18.10.4", "21.5.1.2",
}

# Epígrafes que la extracción dejó incompletos.
EPIGRAFES = {
    "12.8": "Desarrollo de refuerzo electrosoldado de alambre liso a tracción",
}


# Símbolos con ℓ que la extracción dejó sueltos en la lista de notación (2.1): « A\n\n = …» es «Aℓ = …».
_SIMBOLOS_L = {
    "A": "Aℓ", ",min A": "Aℓ,min", "a": "ℓa", "c": "ℓc", "d": "ℓd", "dc": "ℓdc", "dg": "ℓdg", "n": "ℓn",
    "o": "ℓo", "px": "ℓpx", "t": "ℓt", "u": "ℓu", "1": "ℓ1", "2": "ℓ2", "ρ": "ρℓ",
}


def notacion(texto):
    """Una definición por línea («Ag = área bruta…»), con los símbolos ℓ restituidos."""
    import re
    texto = re.sub(r"\n (,min A|[A-Za-zρ12]{1,2}|px|dc|dg)\n\n =", lambda m: f"\n {_SIMBOLOS_L.get(m[1], m[1])} =", texto)
    texto = texto.replace("perpendicular a 1ℓ,", "perpendicular a ℓ1,").replace("distancia px ℓ del", "distancia ℓpx del").replace("longitud o ℓ,", "longitud ℓo,")
    texto = re.sub(r"en la dirección de ([12])\n\n , Capítulo 13\.?", r"en la dirección de ℓ\1, Capítulo 13.", texto)
    texto = re.sub(r"αf ([12]) =", r"αf\1 =", texto)
    lineas = []
    for linea in texto.split("\n"):
        l = linea.strip()
        if not l:
            continue
        if lineas and not re.match(r"^[^\s=]{1,14}( [^\s=]{1,10})? = ", l):
            lineas[-1] += " " + l
        else:
            lineas.append(l)
    return "\n ".join(lineas)
