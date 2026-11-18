"""Lo que el texto plano del PDF no trae bien y se transcribe a mano desde la imagen de cada página.

CORTES: (página, regex de la primera línea, regex de la línea donde se retoma o None = fin de página).
        Quita del flujo del artículo el texto desordenado de tablas, figuras y fórmulas.
PARCHES: {numero: [(texto extraído, texto leído en la imagen)]}.
TABLAS_FIGURAS: artículos «Tabla N» y «Figura N» transcritos desde la imagen; van después del
        numeral que los presenta. Las tablas se escriben fila por fila con « | » entre celdas.
"""
# Fuente: Normas Legales de El Peruano, lunes 3 de diciembre de 2018, págs. 22 a 68 (págs. 1 a 47 del PDF).
PRIMERA, ULTIMA = 3, 47
INICIO = r"^CAPÍTULO I$"            # el texto de la norma empieza después de la resolución y del índice
CABECERA = [r"^Lunes 3 de diciembre de 2018 /?$", r"^El Peruano( / Lunes 3 de diciembre de 2018)?$", r"^\d{2}$", r"^NORMAS LEGALES$"]
NUMEROS_ERRADOS = {"35.34": "35.3.4", "35.5.5": "35.3.5"}   # El Peruano imprime «35.34.» y «35.5.5.» por 35.3.4 y 35.3.5
NO_SON_NUMERALES = {"39.14.6"}          # remisión que cae a inicio de línea dentro del 39.13.8
TITULO_EN_LINEA = {"14.2.4": 2, "14.2.5": 1, "14.2.6": 1, "14.2.7": 2, "14.2.8": 1, "14.2.9": 2}   # líneas del título del numeral
NO_EPIGRAFE = {"2.2", "20.4", "25.4.1"}   # la primera línea es texto, no título

CORTES = [
    (7, r"^TABLA 1$", r"^13\.6"),
    (7, r"^TABLA 2$", None),
    (8, r"^TABLA 2$", r"^14\.2\."),
    (9, r"^TABLA 3$", r"^14\.3"),
    (10, r"^TABLA 4$", r"^14\.5"),
    (10, r"^TABLA 5$", r"^14\.6"),
    (11, r"^TABLA 6$", r"^n nunca"),
    (12, r"^FIGURA 1 \(c-1\)", None),
    (13, r"^\(iv\)", r"^c-2\)"),
    (13, r"^FIGURA 2", r"^d\) Distribución"),
    (15, r"^TABLA 7$", r"^16\.3\.2"),
    (15, r"^FIGURA 3$", None),
    (16, r"^DIVISIONES MAYORES", r"^CAPÍTULO III"),
    (17, r"^FIGURA 4$", r"^Artículo 20"),
    (21, r"^FIGURA 5$", None),
    (22, r"^B\) ÁREA REDUCIDA", r"^Artículo 31"),
    (24, r"^TABLA 9$", r"^d-2\)"),
    (24, r"^FIGURA 6$", None),
    (26, r"^FIGURA 7$", r"^35\.3\."),
    (26, r"^TABLA 10$", r"^35\.3\.5"),
    (28, r"^FIGURA 8$", r"^37\.3\."),
    (28, r"^TABLA 11$", r"^37\.4\."),
    (29, r"^TABLA 12$", r"^38\.4\.4"),
    (29, r"^TABLA 13$", r"^38\.5\.8"),
    (30, r"^TABLA 13A$", r"^38\.6"),
    (30, r"^FIGURA 9$", None),
    (31, r"^FIGURA 10$", None),
    (33, r"^FIGURA 12$", r"^39\.11\.7"),
    (34, r"^TABLA 14$", None),
    (35, r"^N° FHWA-IF-99-015", r"^d\) Aspectos"),
    (35, r"^FIGURA 13$", r"^Nota: En el eventual"),
    (36, r"^TABLA 15$", r"^La carga es mantenida"),
    (37, r"^TABLA 16$", r"^Un estadio de carga"),
    (37, r"^FIGURA 15$", None),
    (38, r"^FIGURA 16$", None),
    (39, r"^FIGURA 18$", r"^39\.12 Calzaduras"),
    (40, r"^FIGURA 19$", r"^39\.12\.8"),
    (40, r"^FIGURA 20$", None),
    (41, r"^FIGURA 21$", r"^39\.13\.5"),
    (42, r"^FIGURA 23$", r"^ANEXO I$"),
    (43, r"^FIGURA 1\. Alternativa", r"^4\.2"),
    (46, r"^FIGURA 2$", r"^ANEXO III"),
    (47, r"^FIGURA 1$", r"^5\. PROCEDIMIENTO"),
]
EPIGRAFES = {
    "35.4": "Cimentaciones en áreas de suelos colapsables (Ic > 6)",
    "16.2.9": "Parámetros para el diseño y construcción de obras de sostenimiento",
    "Anexo I": "Formato obligatorio de la hoja de resumen de las condiciones de cimentación",
    "Anexo II": "Norma española UNE 103-801-94 · Prueba de penetración dinámica superpesada",
    "Anexo III": "Auscultación dinámica mediante el Cono Tipo Peck (CTP)",
}

TEXTOS = {}
PARCHES_SENCICO = {
    "5.27": [("σ′νο", "σ′vo"), ("igual a 7.5.\n", "igual a 7.5.\n(N1)60 = CN N60    N60 = CR CB CS CE    CN = (100kPa / σ′vo)^0.5\n")],
    "15.3.2 c)": [("c-1) Cimentación Superficial Se determina de la siguiente manera:",
                   "c-1) Cimentación Superficial\nSe determina de la siguiente manera:\nEDIFICACIÓN SIN SÓTANO: p = Df + z\nEDIFICACIÓN CON SÓTANO: p = h + Df + z"),
                  ("c-2) Cimentación Profunda La profundidad", "c-2) Cimentación Profunda\nLa profundidad"),
                  ("más la profundidad z.\n", "más la profundidad z.\np = h + Df + z\n")],
    "16.2.9": [("Parámetros para el diseño y construcción de obras de sostenimiento. Luego", "Luego")],
    "20.2": [("qd = sc icc Nc", "\nqd = sc ic c Nc")],
    "20.3": [("igual a cero. qd", "igual a cero.\nqd")],
    "20.4": [("se tiene:\n", "se tiene:\nNq = ε^(π tan φ′) tan² (45 + φ′/2)\nNc = (Nq − 1) cot φ′\nNγ = (Nq − 1) tan(1,4 φ′)\nSc = 1 + 0,2 B/L\nic = iq = (1 − α°/90°)²\nSγ = 1 − 0,2 B/L\niγ = (1 − α°/φ°)²\n")],
    "23.3": [("definida como: B´ y L´", "definida como:\nqap = Q / (B′ L′)\nB´ y L´"),
             ("Español 314/2006\n", "Español 314/2006\nZapata | Dimensiones\nCuadrada | L = B\nRectangular | L ≤ 10 B\nCircular | Diámetro = B\nContinua | L > 10 B\nCombinada | L ≤ 10 B\nAnillo continuo | Perímetro medio P ≥ 10 B\n")],
    "28.1": [("(ex, ey) siendo:", "(ex, ey) siendo:\nex = Mx / Q    ey = My / Q")],
    "28.2": [("«área efectiva = B’L’»", "«área efectiva = B’L’»\nB′ = B − 2ex    L′ = L − 2ey")],
    "35.3.3": [("expresión: Δe", "expresión:\nIC (%) = Δe / (1 + e0)  o  IC (%) = Δh / h0\nΔe")],
    "39.11.7 c)": [("sistema suelo\n- estructura", "sistema suelo - estructura")],
    "39.11.7 a)": [("expresión:\nReferencia", "expresión:\nPw = 0.90 fy As / η\nReferencia")],
    "39.11.7 b)": [("determinada por:\nReferencia", "determinada por:\nLb = Pw / (π D τw)\nReferencia")],
    "39.11.7 f)": [("carga de trabajo es:\nDonde:", "carga de trabajo es:\nPw = Pult / FSη\nDonde:"),
                   ("en el literal\nf-7) (ciclos", "en el literal f-7) (ciclos")],
    "Anexo I": [("CIMENTACIÓN Nombre del solicitante", "Nombre del solicitante")],
}

PARCHES = {
    "5.27": [("75 μ m", "75 μm"), ("igual a 7.5.\n- Donde:", "igual a 7.5.\n(N1)60 = CN N60    N60 = CR CB CS CE    CN = (100kPa / σ´vo)^0.5\nDonde:")],
    "37.2.1": [("2μ m", "2 μm")],             # espacio mal ubicado por la fuente Symbol
    "5.28": [("diferente de 7.5", "diferente de 7.5\nCRRM = FSM × CRR7.5")],
    "15.3.2 c)": [("c-1) Cimentación Superficial Se determina de la siguiente manera: EDIFICACIÓN SIN SÓTANO: EDIFICACIÓN CON SÓTANO:",
                   "c-1) Cimentación Superficial\nSe determina de la siguiente manera:\nEDIFICACIÓN SIN SÓTANO: p = Df + z\nEDIFICACIÓN CON SÓTANO: p = h + Df + z"),
                  ("c-2) Cimentación Profunda La profundidad", "c-2) Cimentación Profunda\nLa profundidad"),
                  ("más la profundidad z.\n", "más la profundidad z.\np = h + Df + z\n")],
    "20.2": [("igual a cero.", "igual a cero.\nqd = sc ic c Nc")],
    "20.3": [("igual a cero.", "igual a cero.\nqd = iq γ1 Df Nq + 0,5 sγ iγ γ2 B´ Nγ")],
    "20.4": [("20.2 y 20.3 se\nDonde:", "20.2 y 20.3 se tiene:\nNq = ε^(π tan φ′) tan² (45 + φ′/2)\nNc = (Nq − 1) cot φ′\nNγ = (Nq − 1) tan(1,4 φ′)\nSc = 1 + 0,2 B/L\nic = iq = (1 − α°/90°)²\nSγ = 1 − 0,2 B/L\niγ = (1 − α°/φ°)²\nDonde:")],
    "23.3": [("definida como: B´ y L´", "definida como:\nqap = Q / (B′ L′)\nB´ y L´"),
             ("Español 314/2006 Zapata Dimensiones Forma Cuadrada L = B Zapata Dimensiones Forma Rectangular L ≤ 10 B Circular Diámetro = B Continua L > 10 B Combinada L ≤ 10 B Zapata Dimensiones Forma Anillo continuo Perímetro medio P ≥ 10 B",
              "Español 314/2006\nZapata | Dimensiones\nCuadrada | L = B\nRectangular | L ≤ 10 B\nCircular | Diámetro = B\nContinua | L > 10 B\nCombinada | L ≤ 10 B\nAnillo continuo | Perímetro medio P ≥ 10 B")],
    "28.1": [("(ex, ey) siendo:", "(ex, ey) siendo:\nex = Mx / Q    ey = My / Q")],
    "28.2": [("«área efectiva = B’L’»", "«área efectiva = B’L’»\nB′ = B − 2ex    L′ = L − 2ey")],
    "32.3.2": [("que se expresa como:\nDonde: Capacidad última del pilote. Capacidad última tomada por la punta del pilote. Capacidad última tomada por la fricción superficial desarrollada en los lados del pilote, por los estratos que intervienen en el efecto de fricción. es muy pequeña:",
                "que se expresa como:\nQu = Qp + Σ Qf\nDonde: Qu = Capacidad última del pilote. Qp = Capacidad última tomada por la punta del pilote. Σ Qf = Capacidad última tomada por la fricción superficial desarrollada en los lados del pilote, por los estratos que intervienen en el efecto de fricción.\nSi Σ Qf es muy pequeña: Qu = Qp")],
    "32.3.3": [("que se expresa como\nDonde: Capacidad última del pilote Capacidad última tomada por la punta del pilote. Capacidad última tomada por la fricción superficial desarrollada en los lados del pilote, por los estratos que intervienen en el efecto de fricción. Sin embargo, si el valor de es pequeño: Éstos",
                "que se expresa como\nQu = Qp + Σ Qf\nDonde: Qu = Capacidad última del pilote Qp = Capacidad última tomada por la punta del pilote. Σ Qf = Capacidad última tomada por la fricción superficial desarrollada en los lados del pilote, por los estratos que intervienen en el efecto de fricción.\nSin embargo, si el valor de Qp es pequeño: Qu = Σ Qf\nÉstos")],
    "35.3.3": [("expresión: Δe", "expresión:\nIC (%) = Δe / (1 + e0)  o  IC (%) = Δh / h0\nΔe")],
    "39.11.7 a)": [("es definida por la siguiente\nReferencia", "es definida por la siguiente expresión:\nPw = 0.90 fy As / η\nReferencia"),
                   ("Agosto 1996. esfuerzo de fluencia del acero área del acero de refuerzo carga de trabajo del anclaje coeficiente de seguridad. para anclajes provisionales, o para el caso de anclajes permanentes.",
                    "Agosto 1996.\nDonde: fy : esfuerzo de fluencia del acero As : área del acero de refuerzo Pw : carga de trabajo del anclaje η : coeficiente de seguridad. η = 1.50 para anclajes provisionales, o η = 1.75 para el caso de anclajes permanentes.")],
    "39.11.7 b)": [("determinada por:\nReferencia", "determinada por:\nLb = Pw / (π D τw)\nReferencia"),
                   ("Donde: longitud del bulbo del anclaje carga de trabajo del anclaje diámetro de la perforación capacidad de adherencia de trabajo en el contacto suelo - Material Cementante capacidad de adherencia última en el contacto suelo - material cementante",
                    "Donde: Lb : longitud del bulbo del anclaje Pw : carga de trabajo del anclaje D : diámetro de la perforación τw : capacidad de adherencia de trabajo en el contacto suelo - Material Cementante τw = τult / FS FS ≥ 2.00 τult : capacidad de adherencia última en el contacto suelo - material cementante"),
                   ("del parámetro ;", "del parámetro τult;")],
    "39.11.7 f)": [("cualquier tipo de ensayo\nf-3)", "cualquier tipo de ensayo es:\nPe = Ps Lim. = 0.90 fy As\nf-3)"),
                   ("la carga de trabajo carga correspondiente al aumento brusco de las deformaciones permanentes factor de seguridad del anclaje postensado",
                    "la carga de trabajo es:\nPw = Pult / FSη\nDonde: Pult : carga correspondiente al aumento brusco de las deformaciones permanentes FSη : factor de seguridad del anclaje postensado")],
    "16.2.9": [("Parámetros para el diseño y construcción de obras de sostenimiento. Luego", "Luego")],
    "39.12.7": [("hasta construir una faja un anillo continuo", "hasta construir un anillo continuo")],   # «una faja» está tachado en el impreso
    "Anexo I": [("FORMATO OBLIGATORIO DE LA HOJA DE RESUMEN DE LAS CONDICIONES DE CIMENTACIÓN Nombre del solicitante", "Nombre del solicitante")],
}

def tabla(numero, epigrafe, pagina, despues_de, texto):
    return {"numero": numero, "epigrafe": epigrafe, "texto": texto.strip() or epigrafe, "pagina": pagina, "despues_de": despues_de}

TABLAS_FIGURAS = [
    tabla("Tabla 1", "Tipo de edificación u obra para determinar el número de puntos de exploración (Tabla 6)", 7, "13.5.4", """
DESCRIPCIÓN | DISTANCIA MAYOR ENTRE APOYOS • (m) | NÚMERO DE PISOS (Incluidos los sótanos): ≤ 3 | 4 a 8 | 9 a 12 | > 12
APORTICADA DE ACERO | < 12 | III | III | III | II
PÓRTICOS Y/O MUROS DE CONCRETO | < 10 | III | III | II | I
MUROS PORTANTES DE ALBAÑILERÍA | < 12 | II | I | --- | ---
BASES DE MÁQUINAS Y SIMILARES | Cualquiera | I | --- | --- | ---
ESTRUCTURAS ESPECIALES | Cualquiera | I | I | I | I
OTRAS ESTRUCTURAS | Cualquiera | II | I | I | I
- Cuando la distancia sobrepasa la indicada, se clasificará en el tipo de edificación inmediato superior.
TANQUES ELEVADOS Y SIMILARES | ≤ 9 m de altura: II | > 9 m de altura: I
PLANTAS DE TRATAMIENTO DE AGUA | III
INSTALACIONES SANITARIAS DE AGUA Y ALCANTARILLADO EN OBRAS URBANAS. | IV"""),
    tabla("Tabla 2", "Técnicas de exploración de campo", 7, "14.1", """
DESCRIPCIÓN | NORMA APLICABLE*
SUELOS. Método de ensayo de penetración estándar SPT. | NTP 339.133
SUELOS. Método para la clasificación de suelos con propósitos de ingeniería (sistema unificado de clasificación de suelos SUCS). | NTP 339.134
SUELOS. Método de ensayo estándar para la densidad y peso unitario del suelo in situ mediante el método del cono de arena. ** | NTP 339.143
SUELOS. Métodos de ensayos estándar para densidad in situ del suelo y suelo agregado por medio de métodos nucleares (profundidad superficial). | NTP 339.144
SUELOS. Ensayo de penetración cuasi-estática profunda de suelos con cono y cono de fricción (CPT).*** | NTP 339.148
SUELOS. Descripción e identificación de suelos. Procedimiento visual – manual. | NTP 339.150
SUELOS. Método de ensayo normalizado para la capacidad portante del suelo por carga estática y para cimientos aislados. | NTP 339.153
SUELOS. Método normalizado para ensayo de corte por veleta de campo de suelos cohesivos. | NTP 339.155
SUELOS. Método de ensayo normalizado para la auscultación con penetrómetro dinámico ligero de punta cónica (DPL). | NTP 339.159
SUELOS. Práctica para la investigación y muestreo de suelos por perforaciones con barrena. | NTP 339.161
SUELOS. Guía normalizada para caracterización de campo con fines de diseño de ingeniería y construcción. | NTP 339.162
SUELOS. Método de ensayo normalizado de corte por veleta en miniatura de laboratorio en suelos finos arcillosos saturados. | NTP 339.168
SUELOS. Práctica normalizada para la perforación de núcleos de roca para la investigación del sitio. | NTP 339.173
SUELOS. Método de ensayo normalizado para la medición de la densidad de suelos y rocas in-situ por el método de reemplazo con agua en un pozo de exploración. ** | NTP 339.253
SUELOS. Métodos de ensayo estándar para la determinación de la densidad y peso unitario de suelos in situ por el método del balón de jebe. ** | NTP 339.256
Método de ensayo normalizado para la medición del potencial de colapso de suelos. | NTP 339.163
Cono Dinámico Superpesado (DPSH) - ver ANEXO II | UNE 103-801
Auscultación Dinámica mediante el Cono Tipo Peck (CTP) | (ver ANEXO III)
Método de ensayo estándar para pruebas de integridad de impacto con baja deformación en cimentaciones profundas (Standard test method for low strain impact integrity testing of deep foundations) | ASTM D5882
Métodos de ensayo estándar para cimentaciones profundas bajo carga lateral (Standard test methods for deep foundations under lateral load) | ASTM D3966.
* En todos los casos se utiliza la última versión de la Norma.
** Estos ensayos solo se emplean para el control de la compactación de rellenos Controlados o de Ingeniería.
*** También conocido como “Ensayo de cono estático”
NOTA: Los ensayos de densidad de campo, no se emplean para determinar la densidad relativa y la presión admisible de un suelo granular. Solo se emplean para el control de la densidad de los Rellenos Controlados o de Ingeniería."""),
    tabla("Tabla 3", "Aplicación y limitaciones de los ensayos", 9, "14.2.9", """
Ensayos In Situ | Norma Aplicable | Permitida: Técnica de Exploración | Tipo de Suelo(1) | Parámetro a obtener(2) | No Permitida: Técnica de Exploración | Tipo de Suelo(1)
SPT | NTP 339.133 | Perforación | Todos excepto gravas | N | Calicata | Gravas
CPT | NTP 339.148 | Auscultación | Todos excepto gravas | qc, fc | Calicata | Gravas
DPSH | UNE 103 801:1994 | Auscultación | Todos excepto gravas | N20 | Calicata | Gravas
CTP | ANEXO III | Auscultación | Todos excepto gravas | Cn | Calicata | Gravas
DPL | NTP 339.159 | Auscultación | SP, SW, SM (con limos no plásticos) | n | Calicata | Lo restante
Veleta de Campo(3) | NTP 339.155 | Perforación/ Calicata | CL, ML, CH, MH. Para todos los casos con IP > 0 y saturados | Cu, St | --- | Lo restante
Prueba de carga | NTP 339.153 | --- | Rocas blandas y todo tipo de suelo excepto gravas | Asentamiento vs. Presión | --- | Gravas
(1) Según Clasificación SUCS, cuando los ensayos son aplicables a suelos de doble simbología, ambos están incluidos.
(2) Leyenda: Cu = Cohesión en condiciones no drenadas. N = Número de golpes por cada 0,30 m de penetración en el ensayo estándar de penetración. N20 = Número de golpes por cada 0,20 m de penetración mediante auscultación con DPSH. Cn = Número de golpes por cada 0,30 m de penetración mediante auscultación con Cono Tipo Peck. n = Número de golpes por cada 0,10 m de penetración mediante auscultación con DPL. qc = Resistencia de punta del cono en unidades de presión. fc = Fricción en el manguito. St = Sensitividad.
(3) Sólo para suelos finos saturados, sin arenas ni gravas.
Nota: Ver títulos de las Normas en la Tabla 2."""),
    tabla("Tabla 4", "Tipos de muestras", 10, "14.4", """
TIPO DE MUESTRA | NORMA APLICABLE | FORMAS DE OBTENER Y TRANSPORTAR | ESTADO DE LA MUESTRA | CARACTERÍSTICAS
Muestra inalterada en bloque (Mib) | NTP 339.151 SUELOS. Prácticas normalizadas para la preservación y transporte de suelos | Bloques | Inalterada | Debe mantener inalteradas las propiedades físicas y mecánicas del suelo en su estado natural al momento del muestreo (Aplicable solamente a suelos cohesivos, rocas blandas o suelos granulares finos suficientemente cementados para permitir su obtención).
Muestra inalterada en tubo de pared delgada (Mit) | NTP 339.169 SUELOS. Muestreo geotécnico de suelos con tubo de pared delgada | Tubos de pared delgada | Inalterada | [celda combinada con la fila anterior]
Muestra alterada en bolsa de plástico (Mab) | NTP 339.151 SUELOS. Prácticas normalizadas para la preservación y transporte de suelos | Con bolsas de plástico | Alterada | Debe mantener inalterada la granulometría del suelo en su estado natural al momento del muestreo.
Muestra alterada para humedad en lata sellada (Mah) | NTP 339.151 SUELOS. Prácticas normalizadas para la preservación y transporte de suelos | En lata sellada | Alterada | Debe mantener inalterado el contenido de agua."""),
    tabla("Tabla 5", "Ensayos de laboratorio", 10, "14.5", """
DESCRIPCIÓN | NORMA APLICABLE *
SUELOS. Métodos de ensayo para determinar el contenido de humedad de un suelo | NTP 339.127
SUELOS. Método de ensayo para el análisis granulométrico | NTP 339.128
SUELOS. Método de ensayo para determinar el límite líquido, límite Plástico e índice de plasticidad de suelos | NTP 339.129
SUELOS. Método de ensayo para determinar el peso específico relativo de las partículas sólidas de un suelo | NTP 339.131
SUELOS. Método para la clasificación de suelos con propósitos de ingeniería (sistema unificado de clasificación de suelos, SUCS). | NTP 339.134
SUELOS. Determinación del peso volumétrico de suelo cohesivo | NTP 339.139
SUELOS. Determinación de los factores de contracción de suelos mediante el método del mercurio | NTP 339.140
SUELOS. Método de ensayo para la compactación de suelos en Laboratorio utilizando una energía modificada ** (2700 kN- m/m3(56000 pie-lbf/ pie3)) | NTP 339.141
SUELOS. Descripción e identificación de suelos. Procedimiento visual - manual | NTP 339.150
SUELOS. Método de ensayo normalizado para la determinación del contenido de sales solubles en suelos y agua subterránea | NTP 339.152
SUELOS. Método normalizado de ensayo para propiedades de consolidación unidimensional de suelos. | NTP 339.154
SUELOS. Método de ensayo normalizado para la medición del potencial de colapso de suelos | NTP 339.163
SUELOS. Método de ensayo normalizado de compresión triaxial no consolidado no drenado para suelos cohesivos | NTP 339.164
SUELOS. Método de ensayo normalizado de compresión triaxial consolidado no drenado para suelos cohesivos | NTP 339.166
SUELOS. Método de ensayo estándar para la resistencia a la compresión no confinada de suelos cohesivos | NTP 339.167
SUELOS. Método de ensayo para la determinación cuantitativa de sulfatos solubles en suelos y agua subterránea. | NTP 339.169
SUELOS. Método de ensayo normalizado para la determinación del hinchamiento unidimensional o potencial de asentamiento de suelos cohesivos. | NTP 339.170
SUELOS. Método de ensayo normalizado para el ensayo de corte directo en suelos bajo condiciones consolidadas drenadas *** | NTP 339.171
SUELOS. Método de ensayo para la determinación cuantitativa de cloruros solubles en suelos y agua subterránea. | NTP 339.177
* En todos los casos se utiliza la última versión de la Norma.
** Este ensayo se emplea únicamente para el control de Rellenos de Ingeniería o Rellenos Controlados.
*** Este ensayo se emplea únicamente para determinar las propiedades mecánicas de los Rellenos de Ingeniería o Rellenos Controlados."""),
    tabla("Tabla 6", "Número de puntos de exploración", 11, "15.3.2 b)", """
Tipo de edificación u obra (Tabla 1) | Número de puntos de exploración (n)
I | uno por cada 225 m2 de área techada del primer piso
II | uno por cada 450 m2 de área techada del primer piso
III | uno por cada 900 m2 de área techada del primer piso*
IV | uno por cada 100 m de instalaciones sanitarias de agua y alcantarillado en obras urbanas
Habilitación urbana para Viviendas Unifamiliares de hasta 3 pisos | 3 por cada hectárea de terreno por habilitar
* Dentro de esta categoría se incluyen las plantas de tratamiento de agua en la que se considera en lugar de área techada, el área en planta de la misma."""),
    tabla("Figura 1 (c-1)", "Profundidad de cimentación (Df) y profundidad de exploración p en cimentaciones superficiales", 12, "15.3.2 c)", """
(i) Profundidad de Cimentación (Df) en Zapatas Superficiales
(ii) Profundidad de Cimentación (Df) en Zapatas Bajo Sótanos
(iii) Profundidad de Cimentación (Df) en Plateas o Losas (incluyendo reservorios y tanques elevados apoyados en estos elementos)
(iv) Profundidad de Cimentación (Df) en tuberías. D = 1.5 DP. e: espesor de la cama de arena
(v) Profundidad de cimentación (Df) en canales. z = 3 m. mínimo = B, cuando B < C = C, cuando B > C
Nota: Las zapatas ubicadas en el límite de propiedad no deben invadir el terreno vecino."""),
    tabla("Figura 2 (c-2)", "Profundidad de exploración p en cimentaciones profundas", 13, "Figura 1 (c-1)", """
P | h | Df | z | PRIMER PISO | SOTANO
[Transcripción: edificación con sótano cimentada sobre pilotes; P suma h, Df y z.]
Nota: Las zapatas ubicadas en el límite de propiedad no deben invadir el terreno vecino."""),
    tabla("Tabla 7", "Técnicas de exploración", 15, "16.3.1", """
TÉCNICA DE EXPLORACIÓN | SÍMBOLO
Pozo o Calicata | C – n
Perforación | P – n
Trinchera | T - n
Auscultación | A – n
n = número correlativo de sondaje o punto de exploración."""),
    tabla("Figura 3", "Simbología de Suelos (Referencial)", 15, "16.3.2", """
DIVISIONES MAYORES | SÍMBOLO SUCS | DESCRIPCIÓN
SUELOS GRANULARES · GRAVA Y SUELOS GRAVOSOS | GW | GRAVA BIEN GRADUADA
| GP | GRAVA MAL GRADUADA
| GM | GRAVA LIMOSA
| GC | GRAVA ARCILLOSA
SUELOS GRANULARES · ARENA Y SUELOS ARENOSOS | SW | ARENA BIEN GRADUADA
| SP | ARENA MAL GRADUADA
| SM | ARENA LIMOSA
| SC | ARENA ARCILLOSA
SUELOS FINOS · LIMOS Y ARCILLAS (LL < 50) | ML | LIMO INORGÁNICO DE BAJA PLASTICIDAD
| CL | ARCILLA INORGÁNICA DE BAJA PLASTICIDAD
| OL | LIMO ORGÁNICO O ARCILLA ORGÁNICA DE BAJA PLASTICIDAD
SUELOS FINOS · LIMOS Y ARCILLAS (LL > 50) | MH | LIMO INORGÁNICO DE ALTA PLASTICIDAD
| CH | ARCILLA INORGÁNICA DE ALTA PLASTICIDAD
| OH | LIMO ORGÁNICO O ARCILLA ORGÁNICA DE ALTA PLASTICIDAD
SUELOS ALTAMENTE ORGÁNICOS | Pt | TURBA Y OTROS SUELOS ALTAMENTE ORGÁNICOS."""),
    tabla("Figura 4", "Asentamiento Diferencial", 17, "19.2", """
Distorsión Angular (α) = δ / L
δTA = Asentamiento Total de A
δTB = Asentamiento Total de B
δ = Asentamiento Diferencial"""),
    tabla("Tabla 8", "Distorsión angular = α", 17, "Figura 4", """
α = δ/L | DESCRIPCIÓN
1/150 | Límite en el que se debe esperar daño estructural en edificios convencionales.
1/250 | Límite en que la pérdida de verticalidad de edificios altos y rígidos puede ser visible.
1/300 | Límite en que se debe esperar dificultades con puentes grúas.
1/300 | Límite en que se debe esperar las primeras grietas en paredes.
1/500 | Límite seguro para edificios en los que no se permiten grietas.
1/500 | Límite para cimentaciones rígidas circulares o para anillos de cimentación de estructuras rígidas, altas y esbeltas.
1/650 | Límite para edificios rígidos de concreto cimentados sobre un solado con espesor aproximado de 1,20 m.
1/750 | Límite donde se esperan dificultades en maquinaria sensible a asentamientos.
Ref.: NAVFAC DM 7"""),
    tabla("Figura 5", "Cimientos cargados excéntricamente", 21, "28.3", """
Ref.: NAVFAC DM 7
A) CARGAS EQUIVALENTES: e = M / Q. La fuerza resultante actúa en el centroide del área reducida.
B) ÁREA REDUCIDA – CIMIENTO RECTANGULAR: Para cimientos rectangulares se reducen las dimensiones siguientes: L' = L – 2e1, e1 = M1 / Q; B' = B – 2e2, e2 = M2 / Q
C) ÁREA REDUCIDA – CIMIENTO CIRCULAR: Para un cimiento circular de radio R, el área efectiva, A'e = 2 x (Área del segmento circular ADC), considerar A'e como un rectángulo con L’ y B’ (L’ > B’). e = M / Q; A'e = 2S = B'L'; L' = (2S √((R + e2)/(R – e2)))^(1/2); B' = L' √((R – e2)/(R + e2)); S = πR²/2 – [e2 √(R² – e2²) + R² Sen⁻¹(e2/R)]; e2 = M2 / Q; O'B = O'D; R = OD
Las cimentaciones no rectangulares podrán asimilarse a otras similares conservando la misma área y el mismo momento de inercia respecto al eje del momento resultante. Calculadas esas dimensiones equivalentes, se obtiene el valor de la presión uniforme aplicada definida de acuerdo a 23.3."""),
    tabla("Tabla 9", "Espaciamiento mínimo entre pilotes", 24, "32.3.4 d)", """
LONGITUD (m) | ESPACIAMIENTO ENTRE EJES
L < 10 | 3b
10 ≤ L < 25 | 4b
L ≥ 25 | 5b
Donde b = diámetro o mayor dimensión del pilote.
Ref.: Tomlinson (1977)"""),
    tabla("Figura 6", "Transferencia de carga al suelo, de un grupo de pilotes", 24, "32.3.5", """
Ampliación de carga 1:4 (Horizontal:Vertical) | Arcilla Blanda | Base de cimiento flotante equivalente | 2/3 D
Transferencia de Carga al suelo, de un grupo de pilotes
(a) Grupo de pilotes soportados mayormente por fricción lateral.
(b) Grupo de pilotes que atraviesa arcilla blanda hasta un suelo granular denso usando pilotes de fricción lateral y de punta.
(c) Grupo de pilotes de punta sobre estrato rocoso."""),
    tabla("Figura 7", "Criterios del Potencial de Colapso", 26, "35.2.2", """
Límite Líquido - % | Densidad Natural Seca (g/cm3) | COLAPSABLE | NO COLAPSABLE
Ref.: NAVFAC DM 7
[Transcripción: la curva va de LL = 20 % con 1,76 g/cm3 hasta LL ≈ 85 % con 0,80 g/cm3; la zona COLAPSABLE queda sobre la curva (menor densidad seca) y la NO COLAPSABLE, debajo.]"""),
    tabla("Tabla 10", "Clasificación del Índice de colapso Ic", 26, "35.3.4", """
Grado de Colapso | Índice de colapso Ic (%)
Ninguno | 0
Leve | 0,1 a 2,0
Moderado | 2,1 a 6,0
Moderadamente severo | 6,1 a 10,0
Severo | > 10,0
Ref.: NTP 339:163"""),
    tabla("Figura 8", "Clasificación de Cambio de Potencial de Volumen", 28, "37.2.2", """
Índice de Plasticidad de una Muestra | Porcentaje de Arcilla (< 2 μm) en una Muestra | Actividad 0.5 | Actividad 1.0 | Actividad 2.0 | Baja | Mediana | Alta | Muy Alta
Ref.: NAVFAC DM 7
Actividad (A) = IP / % < 2 μm
[Transcripción: ejes de 0 a 100; las zonas van de Baja, cerca del origen, a Muy Alta, con mucho porcentaje de arcilla y alto IP.]"""),
    tabla("Tabla 11", "Clasificación de suelos expansivos", 28, "37.3.2", """
Potencial de expansión Ep | Expansión en consolidómetro, bajo presión vertical de 7 kPa (0,07 kgf/cm2) % | Índice de plasticidad IP % | Porcentaje de partículas menores que dos micras %
Muy alto | > 30 | > 32 | > 37
Alto | 20 – 30 | 23 – 45 | 18 – 37
Medio | 10 – 20 | 12 – 34 | 12 – 27
Bajo | < 10 | < 20 | < 17
Ref.: Earth Manual, U.S. Bureau of Reclamation (1998)"""),
    tabla("Tabla 12", "Ensayos mínimos sobre las muestras del SPT para el análisis de licuación", 29, "38.4.3", """
SUELOS. Método de ensayo para el análisis granulométrico. | NTP 339.128
SUELOS. Método de ensayo para determinar el límite líquido, límite plástico e índice de plasticidad de suelos | NTP 339.129
SUELOS. Método de ensayo para determinar el peso específico relativo de las partículas sólidas de un suelo | NTP 339.131
SUELOS. Método para la clasificación de suelos con propósitos de ingeniería (sistema unificado de clasificación de suelos, SUCS). | NTP 339.134"""),
    tabla("Tabla 13", "Clasificación del potencial de licuación", 29, "38.5.7", """
Licuación | PL
Alta | > 50%
Moderada | 10% < PL ≤ 50%
Baja | 5% < PL ≤ 10%
Muy baja | < 5%
Ref.: Iwasaki (1984)"""),
    tabla("Tabla 13.A", "Factor de seguridad mínimo frente a la licuación", 30, "38.5.8", """
CATEGORIA DE LAS EDIFICACIONES (E.030) | FSL mínimo
A | 1.25
B | 1.15
C | 1.00"""),
    tabla("Figura 9", "Curvas simplificadas para el cálculo del CRR a partir del SPT (N1)60", 30, "38.6.4", """
Ref.: NCEER 1997
Número de Golpes Corregido (N1)60 | Relación de Resistencia Cíclica (CRR) | Licuación | Sin Licuación | Porcentaje de Finos = 35 | 15 | ≤5 | CRR curvas para 5,15, y 35 porcentaje de finos, respectivamente | CONTENIDO DE FINOS ≤ 5% | Ajuste NCEER (1996) Workshopp | Datos Pan-América | Datos Japón | Datos China"""),
    tabla("Figura 10", "Curvas simplificadas para el cálculo del CRR a partir del CPT (qc1N)", 31, "Figura 9", """
Ref.: NCEER 1997
Resistencia por punta corregida CPT, qc1N | Relación de Resistencia Cíclica (CRR) | M=7.5 | 0.25<D50 (mm)<2.0 | FC(%)<5 | Curva CRR | Licuación | Sin Licuación"""),
    tabla("Figura 11", "Curvas simplificadas para el cálculo del CRR a partir velocidades de ondas de corte (Vs1)", 31, "Figura 10", """
Ref.: NCEER 1997"""),
    tabla("Figura 12", "Posibles fallas en estructuras de sostenimiento ancladas", 33, "39.11.6", """
a) Falla por traccion el tendon
b) Falla por arrancamiento en la interfase suelo - inyeccion
c) Falla por arrancamiento en la interfase tendon - inyeccion
d) Falla por flexion del muro
e) Falla en el muro por una insuficiente resistencia (por empuje) pasiva
f) Falla por rotacion hacia adelante
g) Falla por insuficiente capacidad axial
h) Falla por volcamiento
j) Falla circular de la masa de suelo
i) Falla por deslizamiento
Referencia: FHWA (1999), “Geotechnical Engineering Circular N° 4, Ground Anchor and Anchored Systems” Publication N° FHWA-IF-99-015, U.S. Department of Transportation Federal Highway Administration, Washington, D.C. 1999."""),
    tabla("Tabla 14", "Capacidad de adherencia última en la interfase suelo/lechada de cemento del bulbo", 34, "39.11.7 c)", """
Roca: Tipo de roca | Capacidad última de adherencia promedio (MPa)
Granito y Basalto | 1.70 - 3.10
Caliza Dolomita | 1.40 - 2.10
Caliza blanda | 1.00 - 1.40
Pizarras y Lutitas duras | 0.80 - 1.40
Lutitas blandas | 0.20 - 0.80
Areniscas | 0.80 - 1.70
Areniscas intemperizadas | 0.70 - 0.80
Tiza, Yeso | 0.20 - 1.10
Marga intemperizada (arcilla calcárea) | 0.15 - 0.25
Concreto | 1.40 - 2.80
Suelos Cohesivos: Tipo de anclaje | Capacidad última de adherencia promedio (MPa)
Anclajes inyectados a gravedad (en dirección al eje) | 0.03 - 0.07
Anclajes inyectados a presión (en dirección al eje):
- Arcilla blanda limosa | 0.03 - 0.07
- Arcilla limosa | 0.03 - 0.07
- Arcilla rígida, mediana a alta plasticidad | 0.03 - 0.10
- Arcilla muy rígida, mediana a alta plasticidad | 0.07 - 0.17
- Arcilla rígida, mediana plasticidad | 0.10 - 0.25
- Arcilla muy rígida, mediana plasticidad | 0.14 - 0.35
- Limo arenoso muy rígido, mediana plasticidad | 0.28 - 0.38
Suelos No Cohesivos: Tipo de anclaje | Capacidad última de adherencia promedio (MPa)
Anclajes inyectados a gravedad (en dirección al eje) | 0.07 - 0.14
Anclajes inyectados a presión (en dirección al eje):
- Arena fina a media, medianamente densa a densa | 0.08 - 0.38
- Arena medianamente gruesa (con grava), medianamente densa | 0.11 - 0.66
- Arena medianamente gruesa (con grava), densa a muy densa | 0.25 - 0.97
- Arenas limosas | 0.17 - 0.41
- Morrena glacial densa | 0.30 - 0.52
- Grava arenosa, medianamente densa a densa | 0.21 - 1.38
- Grava arenosa, densa a muy densa | 0.28 - 1.38
Nota: Los valores reales para anclajes inyectados a presión dependerán de la capacidad de desarrollar las presiones en cada tipo de suelo
Referencia: Post-Tensioning Institute (2004), “Recommendations for Prestressed Rock and Soil Anchors” Fourth Edition, U.S.A.
Referencia: FHWA (1999), “Geotechnical Engineering Circular N° 4, Ground Anchor and Anchored Systems” Publication N° FHWA-IF-99-015, U.S. Department of Transportation Federal Highway Administration, Washington, D.C. 1999."""),
    tabla("Figura 13", "Requerimientos geométricos para sistemas anclados (sin estructuras sobre el anclaje)", 35, "39.11.7 d)", """
q | Superficie Crítica de Falla | Inicio de Cimentación del Bulbo | ≥ 4.50 m | ≥ 1.20 m | ≥ 1.50 m | Lb/2 | Lb/2 | H"""),
    tabla("Figura 14", "Requerimientos geométricos para sistemas anclados (con cimentación vecina)", 35, "Figura 13", """
q | Cimentación Vecina | Inicio de Cimentación del Bulbo | ≥ 3.00 m | ≥ 1.20 m | ≥ 1.50 m | Lb/2 | Lb/2 | H
Referencia: FHWA (1999), “Geotechnical Engineering Circular N° 4, Ground Anchor and Anchored Systems” Publication N° FHWA-IF-99-015, U.S. Department of Transportation Federal Highway Administration, Washington, D.C. 1999."""),
    tabla("Tabla 15", "Cargas a ser aplicadas en ensayos de capacidad o calificación", 36, "39.11.7 f)", """
Tipo Anclaje | Estadíos de Carga y Descarga: 1 | 2 | 3 | 4 | 5 | 6 | 7
Permanente | Po | 0.40 Pw | 0.75 Pw | 1.00 Pw | 1.25 Pw | 1.50 Pw | 1.75 Pw
Provisional | Po | 0.40 Pw | 0.75 Pw | 1.00 Pw | 1.25 Pw | 1.50 Pw |"""),
    tabla("Tabla 16", "Cargas a ser aplicadas en ensayos de calidad o recibimiento", 37, "Tabla 15", """
Tipo Anclaje | Estadíos de Carga y Descarga: 1 | 2 | 3 | 4 | 5 | 6 | 7
Permanente | Po | 0.30 Pw | 0.60 Pw | 0.80 Pw | 1.00 Pw | 1.20 Pw | 1.40 Pw
Provisional | Po | 0.30 Pw | 0.60 Pw | 0.80 Pw | 1.00 Pw | 1.20 Pw |"""),
    tabla("Figura 15", "Gráficas del Ensayo de Calificación para Anclajes Permanentes", 37, "Tabla 16", """
Po = 0.10 fy As | 0.40 Pw | 0.75 Pw | 1.00 Pw | 1.25 Pw | 1.50 Pw | 1.75 Pw | δt | δe | δr | Desplazamiento Elástico | Desplazamiento Residual | Línea A: 80% Longitud Libre | Línea B: Longitud Libre + 50% Longitud del Bulbo"""),
    tabla("Figura 16", "Gráficas del Ensayo de Calificación para Anclajes Provisionales", 38, "Figura 15", ""),
    tabla("Figura 17", "Gráficas del Ensayo de Recibimiento para Anclajes Permanentes", 38, "Figura 16", ""),
    tabla("Figura 18", "Gráficas del Ensayo de Recibimiento para Anclajes Provisionales", 39, "Figura 17", ""),
    tabla("Figura 19", "Detalles típicos de calzadura", 40, "39.12.7", """
CORTE | Cimentación Existente | CALZADURAS | Pendiente 1:10 | Mínimo 0.20 m | Obra a construir | Propiedad de Terceros
VISTA FRONTAL | Máximo 1.20 m típico | Máximo 1.0 m típico | Secuencia de Construcción: 3 1 2 3 1 2 / 4 5 6 4 5 / 7 8 9 7 8 9
Nota: 1) Los números indican la secuencia de construcción de los paños de la calzadura. 2) La figura no está a escala."""),
    tabla("Figura 20", "Tipos de muros", 40, "39.13.1", """
1.- Solo lloraderos
2.- Lloraderos y bolsas de material permeable
3.- Drenes continuos
4.- Capa continua
5.- Dren inclinado
6.- Relleno con material fino
(a) Dren continuo horizontal uniendo los tubos de salida con drenes verticales en el respaldo dispuestos entre tubos
(b) Dren continuo horizontal con descarga lateral, en lugar de tubos de salida. Puede tener drenes verticales intermedios"""),
    tabla("Figura 21", "Diagrama de cargas a considerar para el diseño de muros de contención (volteo y deslizamiento)", 41, "39.13.4", """
E activo | E pasivo | W suelo 1 | W suelo 2 | W muro | W zapata | Fricción | Punto de volteo"""),
    tabla("Figura 22", "Diagrama de cargas a considerar para el diseño de muros de contención (como zapata)", 41, "Figura 21", """
Eps = 0.85 Kp R γ Df² / 2    Ea = Ka γ H² / 2    ΔEas = (3/4) kh γ H² / 2
Eps | Df/3 | Df | Ea | H/3 | ΔEas | 0.6 H | H"""),
    tabla("Figura 23", "Esquema del sistema de drenaje para muros de contención", 42, "39.13.8", """
Relleno seleccionado; Geodrén; Tubería perforada.
*Geodrén usado como dren adyacente a la pared del muro
Referencia: Manual de Drenaje para carreteras. Instituto Nacional de Vías 2009 – Ministerio de Transporte de Colombia"""),
]
