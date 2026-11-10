"""Genera los archivos de importación de la E.060 (formato tekluma-mazos/1).

Fuente: E.060 Concreto Armado (DS N° 010-2009-VIVIENDA), PDF de 227 páginas.
Los artículos salen del texto literal del PDF (con su página); las tarjetas se escriben a mano
leyendo cada página, incluidas tablas, fórmulas y figuras.
"""
import base64, json, os

S = os.environ.get("E060_TRABAJO", "/private/tmp/claude-501/e060")
SALIDA = "/Users/alejandrocabreratavara/Documents/tekluma/contenido/e060"
os.makedirs(SALIDA, exist_ok=True)

ARTICULOS = [{k: v for k, v in a.items() if v is not None} for a in json.load(open(f"{S}/articulos.json"))]
POR_NUMERO = {a["numero"]: a for a in ARTICULOS}

NORMA = {
    "codigo": "E.060",
    "titulo": "Concreto Armado",
    "disciplina": "structures",
    "dispositivo": "DS N° 010-2009-VIVIENDA",
    "publicadaEn": "2009-05-09",
}
FUENTE = "Norma E.060 Concreto Armado (DS N° 010-2009-VIVIENDA), PDF oficial de 227 páginas"


def figura(nombre):
    datos = base64.b64encode(open(f"{S}/figuras/{nombre}.jpg", "rb").read()).decode()
    return f"data:image/jpeg;base64,{datos}"


def cita(numero, extracto):
    assert numero in POR_NUMERO, f"No existe el artículo {numero}"
    return [{"articulo": numero, "extracto": extracto}]


def _t(contenido, numero, extracto):
    return {"contenido": contenido, "citas": cita(numero, extracto)}


def concepto(pregunta, respuesta, numero, extracto, explicacion=None, imagen=None):
    c = {"tipo": "concepto", "pregunta": pregunta, "respuesta": respuesta}
    if explicacion: c["explicacion"] = explicacion
    if imagen: c["imagenUrl"] = imagen
    return _t(c, numero, extracto)


def opcion(pregunta, opciones, correcta, numero, extracto, explicacion=None, imagen=None):
    c = {"tipo": "opcion_multiple", "pregunta": pregunta, "opciones": opciones, "correcta": correcta}
    if explicacion: c["explicacion"] = explicacion
    if imagen: c["imagenUrl"] = imagen
    return _t(c, numero, extracto)


def completar(texto, numero, extracto, explicacion=None):
    assert texto.count("{{") == 1, texto
    c = {"tipo": "completar", "texto": texto}
    if explicacion: c["explicacion"] = explicacion
    return _t(c, numero, extracto)


def tabla(titulo, columnas, filas, fila, columna, numero, extracto, explicacion=None, imagen=None):
    c = {
        "tipo": "tabla",
        "titulo": titulo,
        "columnas": columnas,
        "filas": [{"etiqueta": e, "valores": v} for e, v in filas],
        "pregunta": {"fila": fila, "columna": columna},
    }
    if explicacion: c["explicacion"] = explicacion
    if imagen: c["imagenUrl"] = imagen
    return _t(c, numero, extracto)


def caso(enunciado, variables, formula, unidad, numero, extracto, explicacion=None, tolerancia=0.02):
    c = {
        "tipo": "caso_numerico",
        "enunciado": enunciado,
        "variables": variables,
        "formula": formula,
        "tolerancia": tolerancia,
    }
    if unidad: c["unidadResultado"] = unidad
    if explicacion: c["explicacion"] = explicacion
    return _t(c, numero, extracto)


def imagen(pregunta, uri, respuesta, numero, extracto, explicacion=None):
    c = {"tipo": "imagen", "pregunta": pregunta, "imagenUrl": uri, "respuesta": respuesta}
    if explicacion: c["explicacion"] = explicacion
    return _t(c, numero, extracto)


# ───────────────────────── Capítulo 3 · Materiales ─────────────────────────

CAP3 = [
    completar("El tamaño máximo nominal del agregado grueso no debe superar {{1/5}} de la menor separación entre los lados del encofrado.",
              "3.3.2", "(a) 1/5 de la menor separación entre los lados del encofrado."),
    completar("El tamaño máximo nominal del agregado grueso no debe superar {{1/3}} de la altura de la losa.",
              "3.3.2", "(b) 1/3 de la altura de la losa, de ser el caso."),
    completar("El tamaño máximo nominal del agregado grueso no debe superar {{3/4}} del espaciamiento mínimo libre entre barras de refuerzo.",
              "3.3.2", "(c) 3/4 del espaciamiento mínimo libre entre las barras o alambres individuales de refuerzo, paquetes de barras, tendones individuales, paquetes de tendones o ductos."),
    opcion("En una losa maciza de 15 cm de espesor, ¿cuál es el tamaño máximo nominal del agregado grueso que permite el criterio de la altura de la losa?",
           ["30 mm", "50 mm", "75 mm", "100 mm"], 1, "3.3.2", "(b) 1/3 de la altura de la losa, de ser el caso.",
           "1/3 × 150 mm = 50 mm. Además debe cumplir los criterios (a) y (c): manda el menor."),
    caso("Si el espaciamiento mínimo libre entre barras es {S} mm, ¿cuál es el tamaño máximo nominal del agregado grueso según el criterio de las barras?",
         {"S": {"etiqueta": "Espaciamiento libre", "valores": [25, 32, 40, 50], "unidad": "mm"}}, "0.75*S", "mm",
         "3.3.2", "(c) 3/4 del espaciamiento mínimo libre entre las barras o alambres individuales de refuerzo…"),
    concepto("¿Cuándo se pueden omitir los límites de tamaño máximo nominal del agregado grueso?",
             "Cuando se demuestra que la trabajabilidad y los métodos de compactación permiten colocar el concreto sin vacíos ni «cangrejeras».",
             "3.3.2", "Estas limitaciones se pueden omitir si se demuestra que la trabajabilidad y los métodos de compactación son tales que el concreto se puede colocar sin la formación de vacíos o “cangrejeras”."),
    concepto("¿En qué concretos se permite usar «hormigón» (mezcla natural de grava y arena)?",
             "Solo en concretos con resistencia en compresión no mayor de 10 MPa a los 28 días, con un contenido mínimo de cemento de 255 kg/m³.",
             "3.3.10", "El “hormigón” sólo podrá emplearse en la elaboración de concretos con resistencia en compresión no mayor de 10 MPa a los 28 días. El contenido mínimo de cemento será de 255 Kg/m3."),
    opcion("¿Cuál es el contenido mínimo de cemento en un concreto hecho con «hormigón»?",
           ["210 kg/m³", "255 kg/m³", "300 kg/m³", "350 kg/m³"], 1,
           "3.3.10", "El contenido mínimo de cemento será de 255 Kg/m3."),
    concepto("¿En qué casos no se puede usar agua de mar para preparar concreto?",
             "En concreto armado y preesforzado; en concretos de más de 17 MPa a los 28 días; con elementos embebidos de fierro galvanizado o aluminio; y en concretos con acabado superficial de importancia.",
             "3.4.5", "No se utilizará en los siguientes casos: - Concreto armado y preesforzado. - Concretos con resistencias mayores de 17 MPa a los 28 días. - Concretos con elementos embebidos de fierro galvanizado o aluminio. - Concretos con un acabado superficial de importancia.",
             "Aun en los casos permitidos, requiere autorización del Ingeniero Proyectista y de la Supervisión."),
    opcion("¿Quién debe autorizar el uso de agua de mar en la preparación del concreto?",
           ["Solo el Constructor", "El Ingeniero Proyectista y la Supervisión", "El proveedor de concreto", "No se requiere autorización"], 1,
           "3.4.5", "El agua de mar sólo podrá emplearse en la preparación del concreto si se cuenta con la autorización del Ingeniero Proyectista y de la Supervisión."),
    opcion("Como regla general, ¿qué tipo de refuerzo exige la E.060?",
           ["Liso", "Corrugado", "Galvanizado", "Con recubrimiento epóxico"], 1,
           "3.5.1", "El refuerzo debe ser corrugado, excepto en los casos indicados en 3.5.4."),
    concepto("¿En qué casos se permiten barras y alambres lisos?",
             "En espirales (refuerzo transversal o de confinamiento), en acero de preesfuerzo y como refuerzo por cambios volumétricos en losas nervadas, con diámetro no mayor de 1/4”.",
             "3.5.4.1", "Las barras y alambres lisos sólo se permiten en los siguientes casos: (a) Espirales… (b) Acero de preesfuerzo; (c) Refuerzo por cambios volumétricos en losas nervadas que cumplan con 8.11. El diámetro de este refuerzo no deberá ser mayor de 1/4”."),
    completar("Para barras con fy mayor que 420 MPa, la resistencia a la fluencia se toma como el esfuerzo correspondiente a una deformación unitaria de {{0,35 %}}.",
              "3.5.3.2", "…para barras con fy mayor que 420 MPa, la resistencia a la fluencia debe tomarse como el esfuerzo correspondiente a una deformación unitaria de 0,35%."),
    completar("El alambre corrugado para refuerzo no debe tener un diámetro menor que {{5,5 mm}}.",
              "3.5.3.4", "…el diámetro del alambre no debe ser menor que 5,5 mm…"),
    completar("En mallas electrosoldadas de alambre liso, las intersecciones soldadas no deben estar espaciadas más de {{300 mm}} en el sentido del esfuerzo calculado.",
              "3.5.3.5", "Las intersecciones soldadas no deben estar espaciadas en más de 300 mm en el sentido del esfuerzo calculado…"),
    opcion("¿En cuál de estos concretos no debe emplearse cloruro de calcio como aditivo?",
           ["Zapatas de concreto armado", "Concreto preesforzado", "Cimientos de concreto simple", "Solados"], 1,
           "3.6.3", "El cloruro de calcio o los aditivos que contengan cloruros… no deben emplearse en concreto preesforzado, en concreto que contenga aluminio embebido o en concreto construido en encofrados permanentes de acero galvanizado.",
           "Tampoco en concreto con aluminio embebido ni en encofrados permanentes de acero galvanizado."),
    opcion("¿Quién debe aprobar los aditivos que se usen en el concreto?",
           ["El fabricante del aditivo", "La Supervisión", "El maestro de obra", "El Colegio de Ingenieros"], 1,
           "3.6.1", "Los aditivos que se usen en el concreto deben someterse a la aprobación de la Supervisión."),
    completar("En obra, el cemento en bolsas se almacena en pilas de hasta {{10}} bolsas, en un lugar techado y sin contacto con el suelo.",
              "3.7.3", "(b) El cemento en bolsas se almacenará en obra en un lugar techado, fresco, libre de humedad, sin contacto con el suelo. Se almacenará en pilas de hasta 10 bolsas…"),
    concepto("¿Cómo deben almacenarse las barras de acero de refuerzo en obra?",
             "En un lugar seco, aislado del suelo y protegido de la humedad, tierra, sales, aceite y grasas.",
             "3.7.5", "Las barras de acero de refuerzo, alambre, tendones y ductos metálicos se almacenarán en un lugar seco, aislado del suelo y protegido de la humedad, tierra, sales, aceite y grasas."),
]

# ───────────────────────── Capítulo 4 · Durabilidad ─────────────────────────

TABLA_41 = [("9,5 mm", ["7,5", "6,0"]), ("12,5 mm", ["7,0", "5,5"]), ("19,0 mm", ["6,0", "5,0"]), ("25,0 mm", ["6,0", "4,5"]),
            ("37,5 mm", ["5,5", "4,5"]), ("50,0 mm", ["5,0", "4,0"]), ("75,0 mm", ["4,5", "3,5"])]
TABLA_42 = [("Baja permeabilidad en exposición al agua", ["0,50", "28"]),
            ("Congelamiento y deshielo en condición húmeda o con descongelantes", ["0,45", "31"]),
            ("Protección del refuerzo frente a cloruros (sal, agua salobre, agua de mar)", ["0,40", "35"])]
TABLA_44 = [("Moderada (incluye agua de mar)", ["150 ≤ SO₄ < 1500", "II, IP(MS), IS(MS), P(MS), I(PM)(MS), I(SM)(MS)", "0,50", "28"]),
            ("Severa", ["1500 ≤ SO₄ < 10000", "V", "0,45", "31"]),
            ("Muy severa", ["SO₄ > 10000", "V más puzolana", "0,45", "31"])]
TABLA_45 = [("Concreto preesforzado", ["0,06"]), ("Concreto armado expuesto a cloruros en servicio", ["0,15"]),
            ("Concreto armado seco o protegido de la humedad en servicio", ["1,00"]), ("Otras construcciones de concreto armado", ["0,30"])]

CAP4 = [
    concepto("¿Qué condiciones de exposición quedan fuera del alcance del Capítulo 4 de la E.060?",
             "Las especialmente severas, como ácidos o altas temperaturas, y las condiciones estéticas como el acabado de superficies; deben cubrirse en las especificaciones del proyecto.",
             "4.0", "Esta Norma no incluye disposiciones para las condiciones de exposición especialmente severas, tales como la exposición a ácidos o a altas temperaturas, ni cubre condiciones estéticas tales como el acabado de las superficies del concreto."),
    tabla("Tabla 4.1 · Aire total para concreto resistente al congelamiento (%)", ["Exposición severa", "Exposición moderada"], TABLA_41, 2, 1,
          "4.2.1", "…deben tener aire incorporado, con el contenido total de aire indicado en la Tabla 4.1.",
          "Para TMN 19 mm: 6,0 % (severa) y 5,0 % (moderada)."),
    tabla("Tabla 4.1 · Aire total para concreto resistente al congelamiento (%)", ["Exposición severa", "Exposición moderada"], TABLA_41, 4, 0,
          "4.2.1", "…deben tener aire incorporado, con el contenido total de aire indicado en la Tabla 4.1."),
    completar("La tolerancia en el contenido total de aire incorporado debe ser de {{±1,5 %}}.",
              "4.2.1", "La tolerancia en el contenido total de aire incorporado debe ser de ±1,5%."),
    completar("Para concretos con f′c mayor de 35 MPa, el aire incorporado de la Tabla 4.1 se puede reducir en {{1 %}}.",
              "4.2.1", "Para concretos con f’c mayor de 35 MPa, se puede reducir el aire incorporado indicado en la Tabla 4.1 en 1%."),
    tabla("Tabla 4.2 · Condiciones especiales de exposición", ["a/mc máx.", "f′c mín. (MPa)"], TABLA_42, 0, 0,
          "4.2.2", "Los concretos expuestos a las condiciones especiales de exposición señaladas en la Tabla 4.2 deben cumplir con las relaciones máximas agua-material cementante y con la resistencia mínima f’c señaladas en ésta."),
    tabla("Tabla 4.2 · Condiciones especiales de exposición", ["a/mc máx.", "f′c mín. (MPa)"], TABLA_42, 2, 1,
          "4.2.2", "Los concretos expuestos a las condiciones especiales de exposición señaladas en la Tabla 4.2 deben cumplir con las relaciones máximas agua-material cementante y con la resistencia mínima f’c señaladas en ésta."),
    opcion("Para proteger el refuerzo de un muelle expuesto a salpicaduras de agua de mar, ¿qué relación agua-material cementante máxima exige la E.060?",
           ["0,50", "0,45", "0,40", "0,35"], 2,
           "4.4.2", "Cuando el concreto con refuerzo vaya a estar expuesto a cloruros de químicos descongelantes, sal, agua salobre, agua de mar o salpicaduras de las mismas, deben cumplirse los requisitos de la Tabla 4.2 para la máxima relación agua-material cementante y valor mínimo de f’c…",
           "Tabla 4.2: 0,40 y f′c mínimo de 35 MPa, además del recubrimiento mínimo de 7.7."),
    concepto("Si se aplican simultáneamente las Tablas 4.2 y 4.4, ¿qué valores se usan?",
             "La menor relación máxima agua-material cementante aplicable y el mayor f′c mínimo.",
             "4.2.2", "Cuando se utilicen las Tablas 4.2 y 4.4 simultáneamente, se debe utilizar la menor relación máxima agua-material cementante aplicable y el mayor f’c mínimo."),
    opcion("En concretos expuestos a productos químicos descongelantes, ¿cuál es el máximo de microsílice respecto al total de materiales cementantes?",
           ["5 %", "10 %", "25 %", "50 %"], 1,
           "4.2.3", "…el peso máximo de las cenizas volantes, otras puzolanas, microsílice o las escorias incluidas en el concreto, no debe exceder los porcentajes… dados en la Tabla 4.3.",
           "Tabla 4.3: cenizas volantes u otras puzolanas 25 %, escoria 50 %, microsílice 10 %."),
    tabla("Tabla 4.4 · Concreto expuesto a sulfatos", ["SO₄ en agua (ppm)", "Tipo de cemento", "a/mc máx.", "f′c mín. (MPa)"], TABLA_44, 1, 1,
          "4.3.1", "El concreto que va a estar expuesto a soluciones o suelos que contengan sulfatos debe cumplir con los requisitos de la Tabla 4.4."),
    tabla("Tabla 4.4 · Concreto expuesto a sulfatos", ["SO₄ en agua (ppm)", "Tipo de cemento", "a/mc máx.", "f′c mín. (MPa)"], TABLA_44, 0, 2,
          "4.3.1", "El concreto que va a estar expuesto a soluciones o suelos que contengan sulfatos debe cumplir con los requisitos de la Tabla 4.4."),
    opcion("¿Cómo clasifica la Tabla 4.4 al agua de mar en cuanto a exposición a sulfatos?",
           ["Insignificante", "Moderada", "Severa", "Muy severa"], 1,
           "4.3.1", "Tabla 4.4, nota **: Se considera el caso del agua de mar como exposición moderada."),
    completar("El cloruro de calcio no debe emplearse como aditivo en concretos con exposición a sulfatos severa o {{muy severa}}.",
              "4.3.2", "El cloruro de calcio no debe emplearse como aditivo en concretos sometidos a exposición a sulfatos severa o muy severa, tal como se definen en la Tabla 4.4."),
    tabla("Tabla 4.5 · Ion cloruro máximo (% del peso del cemento)", ["Cl⁻ máx."], TABLA_45, 0, 0,
          "4.4.1", "…las concentraciones máximas de iones cloruro solubles en agua en el concreto endurecido a edades que van de 28 a 42 días… no deben exceder los límites de la Tabla 4.5."),
    tabla("Tabla 4.5 · Ion cloruro máximo (% del peso del cemento)", ["Cl⁻ máx."], TABLA_45, 1, 0,
          "4.4.1", "…las concentraciones máximas de iones cloruro solubles en agua en el concreto endurecido a edades que van de 28 a 42 días… no deben exceder los límites de la Tabla 4.5."),
    opcion("¿A qué edad del concreto endurecido se controla el contenido máximo de iones cloruro de la Tabla 4.5?",
           ["7 a 14 días", "14 a 28 días", "28 a 42 días", "90 días"], 2,
           "4.4.1", "…las concentraciones máximas de iones cloruro solubles en agua en el concreto endurecido a edades que van de 28 a 42 días…"),
]

# ─────────────────────── Capítulo 7 · Detalles del refuerzo ───────────────────────

TABLA_71 = [("1/4” a 1”", ["6 db"]), ("1 1/8” a 1 3/8”", ["8 db"]), ("1 11/16” a 2 1/4”", ["10 db"])]
TOLERANCIAS = [("d ≤ 200 mm", ["± 10 mm", "−10 mm"]), ("d > 200 mm", ["± 13 mm", "−13 mm"])]
RECUBRIMIENTOS = [
    ("Contra el suelo y expuesto permanentemente a él", ["70 mm"]),
    ("Suelo o intemperie · barras de 3/4” y mayores", ["50 mm"]),
    ("Suelo o intemperie · barras de 5/8” y menores, mallas", ["40 mm"]),
    ("No expuesto · losas, muros, viguetas, barras de 1 3/8” y menores", ["20 mm"]),
    ("No expuesto · vigas y columnas (principal, estribos, espirales)", ["40 mm"]),
]

CAP7 = [
    concepto("En la Fig. 7.1, ¿qué estribo usa una extensión de 12 db y para qué diámetros de barra corresponde?",
             "El estribo con doblez a 90° para barras desde 3/4” hasta 1” (db > 5/8”).",
             "7.1.3", "(b) Para barras desde 3/4” hasta 1” inclusive, un doblez de 90º más una extensión de 12 db al extremo libre de la barra",
             "Para 5/8” y menores, el doblez a 90° lleva 6 db. Con 135° y 6 db se cubren barras de 1” y menores.",
             imagen=figura("fig-7-1")),
    imagen("¿Qué detalle es este y para qué diámetros de barra se permite?", figura("estribo-135"),
           "Estribo con gancho a 135° y extensión de 6 db; se permite para barras de 1” y menores.",
           "7.1.3", "(c) Para barras de 1” y menores, un doblez de 135º más una extensión de 6 db al extremo libre de la barra."),
    completar("Gancho estándar de 180°: doblez más una extensión de 4 db, pero no menor de {{65 mm}} hasta el extremo libre.",
              "7.1.1", "Un doblez de 180º más una extensión de 4 db, pero no menor de 65 mm hasta el extremo libre de la barra."),
    completar("Gancho estándar de 90°: doblez más una extensión de {{12 db}} hasta el extremo libre de la barra.",
              "7.1.2", "Un doblez de 90º más una extensión de 12 db hasta el extremo libre de la barra."),
    opcion("Gancho de estribo a 90° con barra de 1/2”: ¿qué extensión exige la E.060 al extremo libre?",
           ["4 db", "6 db", "8 db", "12 db"], 1,
           "7.1.3", "(a) Para barras de 5/8” y menores, un doblez de 90º más una extensión de 6 db al extremo libre de la barra"),
    tabla("Tabla 7.1 · Diámetros interiores mínimos de doblado", ["Diámetro mínimo de doblado"], TABLA_71, 1, 0,
          "7.2.1", "El diámetro de doblado, medido en la cara interior de la barra… no debe ser menor que lo indicado en la Tabla 7.1.",
          imagen=figura("fig-7-2")),
    tabla("Tabla 7.1 · Diámetros interiores mínimos de doblado", ["Diámetro mínimo de doblado"], TABLA_71, 0, 0,
          "7.2.1", "El diámetro de doblado, medido en la cara interior de la barra… no debe ser menor que lo indicado en la Tabla 7.1."),
    completar("El diámetro interior de doblado de estribos de 5/8” y menores no debe ser menor que {{4 db}}.",
              "7.2.2", "El diámetro interior de doblado para estribos no debe ser menor que 4 db para barras de 5/8” y menores."),
    concepto("¿Se puede doblar en caliente el refuerzo o doblar barras ya embebidas en el concreto?",
             "Todo el refuerzo se dobla en frío, salvo que el Ingeniero Proyectista permita otra cosa; y ninguna barra parcialmente embebida se dobla en obra, salvo que lo indiquen los planos o lo permita el Proyectista.",
             "7.3.1", "Todo el refuerzo deberá doblarse en frío, a menos que el Ingeniero Proyectista permita hacerlo de otra manera."),
    tabla("Tolerancias de colocación (7.5.2.1)", ["Tolerancia en d", "Tolerancia en el recubrimiento mínimo"], TOLERANCIAS, 1, 0,
          "7.5.2.1", "La tolerancia para el peralte efectivo d y para el recubrimiento mínimo de concreto en elementos sometidos a flexión, muros y elementos sometidos a compresión debe ser la siguiente…"),
    opcion("¿Cuál es la tolerancia para la ubicación longitudinal de dobleces y extremos del refuerzo, en general?",
           ["± 13 mm", "± 25 mm", "± 50 mm", "± 75 mm"], 2,
           "7.5.2.2", "La tolerancia para la ubicación longitudinal de los dobleces y extremos del refuerzo debe ser de ±50 mm, excepto en los extremos discontinuos de las ménsulas o cartelas donde la tolerancia debe ser ±13 mm…"),
    completar("La distancia libre mínima entre barras paralelas de una capa debe ser db, pero no menor de {{25 mm}}.",
              "7.6.1", "La distancia libre mínima entre barras paralelas de una capa debe ser db, pero no menor de 25 mm."),
    opcion("En una columna con estribos, ¿cuál es la distancia libre mínima entre barras longitudinales?",
           ["db y 25 mm", "1,5 db y 40 mm", "2 db y 50 mm", "1,5 db y 25 mm"], 1,
           "7.6.3", "…la distancia libre entre barras longitudinales no debe ser menor de 1,5 db ni de 40 mm."),
    completar("Un paquete de barras paralelas que trabaja como unidad debe limitarse a un máximo de {{4}} barras.",
              "7.6.5.1", "Los grupos de barras paralelas dispuestas en un paquete para trabajar como una unidad, deben limitarse a un máximo de 4 barras por cada paquete."),
    opcion("En vigas, ¿cuál es el diámetro máximo de las barras agrupadas en paquetes?",
           ["1”", "1 1/4”", "1 3/8”", "1 11/16”"], 2,
           "7.6.5.3", "En vigas, el diámetro máximo de las barras agrupadas en paquetes será de 1 3/8”."),
    completar("En elementos a flexión, las barras de un paquete que se cortan dentro del tramo deben terminar en lugares separados al menos {{40 db}}.",
              "7.6.5.4", "…cada una de las barras de un paquete que se corta dentro del tramo debe terminarse en lugares diferentes separados al menos 40 db."),
    tabla("Recubrimiento mínimo · concreto en sitio no preesforzado", ["Recubrimiento"], RECUBRIMIENTOS, 0, 0,
          "7.7.1", "(a) Concreto colocado contra el suelo y expuesto permanentemente a él … 70 mm"),
    tabla("Recubrimiento mínimo · concreto en sitio no preesforzado", ["Recubrimiento"], RECUBRIMIENTOS, 4, 0,
          "7.7.1", "- Vigas y columnas: Armadura principal, estribos y espirales … 40 mm"),
    opcion("Muro de contención con barras de 3/4” en la cara expuesta a la intemperie: ¿qué recubrimiento mínimo exige la E.060?",
           ["40 mm", "50 mm", "70 mm", "75 mm"], 1,
           "7.7.1", "(b) Concreto en contacto permanente con el suelo o la intemperie: Barras de 3/4” y mayores … 50 mm"),
    completar("El recubrimiento mínimo de un paquete de barras es su diámetro equivalente, sin necesidad de exceder {{50 mm}}, salvo contra el suelo (70 mm).",
              "7.7.4", "El recubrimiento mínimo para los paquetes de barras debe ser igual al diámetro equivalente del paquete, pero no necesita ser mayor de 50 mm, excepto para concreto construido contra el suelo y permanentemente expuesto a él, caso en el cual el recubrimiento mínimo debe ser de 70 mm."),
    completar("En columnas, la pendiente de la parte inclinada de una barra doblada por cambio de sección no debe exceder de 1 a {{6}} respecto al eje.",
              "7.8.1.1", "La pendiente de la parte inclinada de una barra de este tipo no debe exceder de 1 a 6 con respecto al eje de la columna."),
    opcion("Si la cara de una columna se desalinea 75 mm o más por cambio de sección, ¿qué se hace con las barras longitudinales?",
           ["Se doblan con pendiente 1 a 6", "Se doblan en caliente", "No se doblan: se usan espigas (dowels) empalmadas por traslape", "Se sueldan a las barras superiores"], 2,
           "7.8.1.5", "Cuando la cara de una columna está desalineada 75 mm o más por cambio de sección, las barras longitudinales no se deben doblar. Se deben proporcionar espigas (dowels) empalmados por traslape…"),
    opcion("¿Qué espaciamiento libre entre hélices permite la E.060 en espirales?",
           ["Entre 25 y 75 mm", "Entre 40 y 100 mm", "Entre 25 y 150 mm", "Máximo 16 db"], 0,
           "7.10.4.3", "El espaciamiento libre entre hélices de la espiral no debe exceder de 75 mm ni ser menor de 25 mm."),
    completar("El anclaje de una espiral consiste en {{1,5}} vueltas adicionales de la barra o alambre en cada extremo.",
              "7.10.4.4", "El anclaje de la espiral debe consistir en 1,5 vueltas adicionales de la barra o alambre en cada extremo de la espiral."),
    opcion("Columna con barras longitudinales de 3/4”: ¿cuál es el diámetro mínimo de sus estribos?",
           ["8 mm", "3/8”", "1/2”", "5/8”"], 1,
           "7.10.5.1", "…estribos transversales de por lo menos 8 mm para barras de hasta 5/8”, de 3/8” para barras longitudinales de más de 5/8” hasta 1” y de 1/2” para barras longitudinales de mayor diámetro y para los paquetes de barras."),
    concepto("Columna de 30 × 50 cm, barras longitudinales de 3/4” (19,1 mm) y estribos de 3/8” (9,5 mm). ¿Cuál es el espaciamiento vertical máximo de estribos según 7.10.5.2?",
             "300 mm: el menor entre 16 × 19,1 = 306 mm, 48 × 9,5 = 456 mm y la menor dimensión de la sección, 300 mm.",
             "7.10.5.2", "El espaciamiento vertical de los estribos no debe exceder 16 veces el diámetro de las barras longitudinales, 48 veces el diámetro de la barra o alambre de los estribos ni la menor dimensión transversal del elemento sometido a compresión.",
             "En elementos con responsabilidad sísmica rigen además los requisitos del Capítulo 21."),
    completar("Ninguna barra longitudinal de una columna debe estar separada más de {{150 mm}} libres de una barra apoyada lateralmente por un estribo.",
              "7.10.5.3", "…ninguna barra longitudinal esté separada a más de 150 mm libres de una barra apoyada lateralmente."),
    concepto("¿Qué ángulo interior máximo debe tener la esquina del estribo que da apoyo lateral a una barra longitudinal?",
             "135°: cada barra de esquina y cada barra alterna debe apoyarse en una esquina de estribo con ángulo interior no mayor de 135°.",
             "7.10.5.3", "…cada barra longitudinal de esquina y cada barra alterna tenga apoyo lateral proporcionado por la esquina de un estribo con un ángulo interior no mayor de 135º…"),
    opcion("¿A qué distancia máxima de la zapata o losa se coloca el primer estribo de una columna?",
           ["50 mm", "A la mitad del espaciamiento entre estribos", "A un espaciamiento completo", "150 mm"], 1,
           "7.10.5.4", "La distancia vertical entre el primer estribo y la parte superior de la zapata, viga o losa no debe ser mayor a la mitad del espaciamiento entre estribos."),
    completar("Las vigas del perímetro deben tener refuerzo corrido de al menos {{un sexto}} del refuerzo de tracción para momento negativo en el apoyo, con mínimo dos barras.",
              "7.13.2.2", "(a) Al menos un sexto del refuerzo de tracción requerido para momento negativo en el apoyo, compuesto por un mínimo de dos barras."),
    completar("Las vigas del perímetro deben tener refuerzo corrido de al menos {{un cuarto}} del refuerzo de tracción para momento positivo en la mitad del tramo.",
              "7.13.2.2", "(b) Al menos un cuarto del refuerzo de tracción para momento positivo requerido en la mitad del tramo, compuesto por un mínimo de dos barras."),
]

# ─────────────────── Capítulo 9 · Requisitos de resistencia y de servicio ───────────────────

FACTORES_PHI = [("Flexión sin carga axial", ["0,90"]), ("Tracción axial con o sin flexión", ["0,90"]),
                ("Compresión con o sin flexión · espiral (10.9.3)", ["0,75"]), ("Compresión con o sin flexión · otros elementos", ["0,70"]),
                ("Cortante y torsión", ["0,85"]), ("Aplastamiento del concreto", ["0,70"]), ("Zonas de anclaje de postensado", ["0,85"])]
TABLA_91 = [("Losas macizas en una dirección", ["ℓ/20", "ℓ/24", "ℓ/28", "ℓ/10"]),
            ("Vigas o losas nervadas en una dirección", ["ℓ/16", "ℓ/18,5", "ℓ/21", "ℓ/8"])]
COL_91 = ["Simplemente apoyados", "Un extremo continuo", "Ambos extremos continuos", "En voladizo"]
TABLA_92 = [("Techos planos sin elementos no estructurales frágiles · inmediata por carga viva", ["ℓ/180"]),
            ("Pisos sin elementos no estructurales frágiles · inmediata por carga viva", ["ℓ/360"]),
            ("Pisos o techos con elementos no estructurales susceptibles de daño", ["ℓ/480"]),
            ("Pisos o techos con elementos no estructurales no susceptibles de daño", ["ℓ/240"])]
XI = [("5 años o más", ["2,0"]), ("12 meses", ["1,4"]), ("6 meses", ["1,2"]), ("3 meses", ["1,0"])]
CUANTIAS = [("Barras lisas", ["0,0025"]), ("Corrugadas con fy < 420 MPa", ["0,0020"]),
            ("Corrugadas o malla electrosoldada con fy ≥ 420 MPa", ["0,0018"])]

CAP9 = [
    concepto("¿Cuál es la condición básica de diseño por resistencia de la E.060?",
             "Que en todas las secciones la resistencia de diseño φRn sea por lo menos igual a la resistencia requerida Ru calculada con las cargas amplificadas.",
             "9.1.1", "Las estructuras y los elementos estructurales deberán diseñarse para obtener en todas sus secciones resistencias de diseño (φRn) por lo menos iguales a las resistencias requeridas (Ru)…"),
    completar("Combinación básica de la E.060: U = {{1,4}} CM + 1,7 CV.", "9.2.1", "U = 1,4 CM + 1,7 CV (9-1)"),
    completar("Combinación básica de la E.060: U = 1,4 CM + {{1,7}} CV.", "9.2.1", "U = 1,4 CM + 1,7 CV (9-1)"),
    caso("Una viga soporta un momento por carga muerta de {CM} kN·m y por carga viva de {CV} kN·m. ¿Cuál es el momento último con U = 1,4 CM + 1,7 CV?",
         {"CM": {"etiqueta": "Momento por carga muerta", "valores": [40, 55, 72, 90], "unidad": "kN·m"},
          "CV": {"etiqueta": "Momento por carga viva", "valores": [18, 25, 32, 40], "unidad": "kN·m"}},
         "1.4*CM+1.7*CV", "kN·m", "9.2.1", "U = 1,4 CM + 1,7 CV (9-1)"),
    caso("Con sismo, una columna tiene carga axial muerta de {CM} kN, viva de {CV} kN y por sismo de {CS} kN. ¿Cuál es Pu con U = 1,25 (CM + CV) + CS?",
         {"CM": {"etiqueta": "Carga muerta", "valores": [600, 850, 1100], "unidad": "kN"},
          "CV": {"etiqueta": "Carga viva", "valores": [200, 300, 400], "unidad": "kN"},
          "CS": {"etiqueta": "Carga de sismo", "valores": [150, 250, 350], "unidad": "kN"}},
         "1.25*(CM+CV)+CS", "kN", "9.2.3", "U = 1,25 (CM + CV) ± CS (9-4)"),
    caso("Para verificar levantamiento, una columna tiene carga muerta de {CM} kN y carga de sismo de {CS} kN en tracción. ¿Cuál es U = 0,9 CM − CS?",
         {"CM": {"etiqueta": "Carga muerta", "valores": [400, 550, 700], "unidad": "kN"},
          "CS": {"etiqueta": "Carga de sismo", "valores": [150, 250, 350], "unidad": "kN"}},
         "0.9*CM-CS", "kN", "9.2.3", "U = 0,9 CM ± CS (9-5)",
         "Si el resultado es negativo, la columna queda en tracción y la cimentación debe resistirla."),
    opcion("¿Qué combinación aplica la E.060 con cargas de viento, además de U = 1,4 CM + 1,7 CV?",
           ["U = 1,25 (CM + CV ± CVi)", "U = 1,2 CM + 1,6 CVi", "U = 1,4 (CM + CVi)", "U = CM + CV + CVi"], 0,
           "9.2.2", "U = 1,25 ( CM + CV ± CVi ) (9-2) U = 0,9 CM ± 1,25 CVi (9-3)"),
    concepto("¿Se consideran sismo y viento actuando a la vez?", "No: no es necesario considerar acciones de sismo y de viento simultáneamente.",
             "9.2.4", "No será necesario considerar acciones de sismo y de viento simultáneamente."),
    opcion("Según la E.060, las cargas de nieve o granizo se consideran como:",
           ["Carga muerta", "Carga viva", "Carga de impacto", "Carga ambiental aparte"], 1,
           "9.2.8", "Si fuera necesario incluir en el diseño el efecto de las cargas de nieve o granizo, éstas deberán considerarse como cargas vivas (CV)."),
    completar("Para diseñar zonas de anclaje de postensado se aplica un factor de carga de {{1,2}} a la fuerza máxima del gato.",
              "9.2.11", "Para el diseño de zonas de anclaje de tendones de postensado, se aplicará un factor de carga de 1,2 a la fuerza máxima aplicada por el gato."),
    tabla("Factores de reducción de resistencia φ (9.3.2)", ["φ"], FACTORES_PHI, 2, 0,
          "9.3.2.2", "(b) Carga axial de compresión con o sin flexión: Elementos con refuerzo en espiral según 10.9.3 … 0,75 Otros elementos … 0,70"),
    tabla("Factores de reducción de resistencia φ (9.3.2)", ["φ"], FACTORES_PHI, 3, 0,
          "9.3.2.2", "(b) Carga axial de compresión con o sin flexión: Elementos con refuerzo en espiral según 10.9.3 … 0,75 Otros elementos … 0,70"),
    tabla("Factores de reducción de resistencia φ (9.3.2)", ["φ"], FACTORES_PHI, 5, 0,
          "9.3.2.4", "Aplastamiento en el concreto (excepto para las zonas de anclajes de postensado) … 0,70"),
    opcion("¿Qué φ se usa en concreto estructural simple (Capítulo 22)?", ["0,55", "0,65", "0,70", "0,90"], 1,
           "9.3.2.8", "En el Capítulo 22, concreto estructural simple, φ debe ser 0,65 para flexión, compresión, cortante y aplastamiento."),
    concepto("En flexocompresión, ¿cuándo puede incrementarse φ desde 0,70 (o 0,75) hacia 0,90?",
             "Linealmente, a medida que φPn disminuye desde 0,1 f′c Ag o φPb (el que sea menor) hasta cero.",
             "9.3.2.2", "Para elementos en flexocompresión φ puede incrementarse linealmente hasta 0,90 en la medida que φPn disminuye desde 0,1 f’c Ag ó φPb, el que sea menor, hasta cero."),
    completar("Para concreto estructural, f′c no debe ser inferior a {{17 MPa}}, salvo concreto estructural simple.",
              "9.4.1", "Para el concreto estructural, f’c no debe ser inferior a 17 MPa, salvo para concreto estructural simple (véase 22.2.4)."),
    opcion("¿Cuál es el valor máximo de fy que se puede usar en los cálculos de diseño (salvo excepciones como preesfuerzo)?",
           ["420 MPa", "500 MPa", "550 MPa", "620 MPa"], 2,
           "9.5.1", "Los valores de fy y fyt usados en los cálculos de diseño no deben exceder de 550 MPa…"),
    tabla("Tabla 9.1 · Peralte mínimo h sin verificar deflexiones (fy = 420 MPa)", COL_91, TABLA_91, 1, 2,
          "9.6.2.1", "Los peraltes o espesores mínimos para no verificar deflexiones, que se señalan en la Tabla 9.1 pueden utilizarse como referencia en elementos armados en una dirección (aligerados, losas macizas y vigas)…"),
    tabla("Tabla 9.1 · Peralte mínimo h sin verificar deflexiones (fy = 420 MPa)", COL_91, TABLA_91, 0, 3,
          "9.6.2.1", "Los peraltes o espesores mínimos para no verificar deflexiones, que se señalan en la Tabla 9.1 pueden utilizarse como referencia en elementos armados en una dirección (aligerados, losas macizas y vigas)…"),
    caso("Viga simplemente apoyada de {L} m de luz (fy = 420 MPa, concreto normal). ¿Peralte mínimo para no verificar deflexiones, según la Tabla 9.1?",
         {"L": {"etiqueta": "Luz", "valores": [4.8, 5.6, 6.4, 7.2], "unidad": "m"}}, "L/16", "m",
         "9.6.2.1", "Tabla 9.1: vigas o losas nervadas en una dirección, simplemente apoyadas, h = ℓ/16."),
    caso("Aligerado (losa nervada) con un extremo continuo y luz de {L} m (fy = 420 MPa). ¿Espesor mínimo según la Tabla 9.1?",
         {"L": {"etiqueta": "Luz", "valores": [3.7, 4.2, 4.6, 5.0], "unidad": "m"}}, "L/18.5", "m",
         "9.6.2.1", "Tabla 9.1: vigas o losas nervadas en una dirección, con un extremo continuo, h = ℓ/18,5."),
    completar("Si fy es distinto de 420 MPa, los valores de la Tabla 9.1 se multiplican por (0,4 + fy / {{700}}).",
              "9.6.2.1", "(b) Para fy distinto de 420 MPa, los valores de la Tabla deben multiplicarse por (0,4 + fy / 700)."),
    caso("Concreto de peso normal con f′c = {FC} MPa. ¿Cuál es el módulo de rotura fr = 0,62 √f′c?",
         {"FC": {"etiqueta": "f′c", "valores": [21, 24, 28, 35], "unidad": "MPa"}}, "0.62*sqrt(FC)", "MPa",
         "9.6.2.3", "fr = 0,62 √f’c (9-12)", "Se usa para el momento de agrietamiento: Mcr = fr Ig / Yt (9-11)."),
    completar("El momento de agrietamiento se calcula como Mcr = fr Ig / {{Yt}}.", "9.6.2.3", "Mcr = fr Ig / Yt (9-11)"),
    completar("En elementos continuos en ambos extremos: Ie promedio = (Ie1 + Ie2 + {{2}} Ie3) / 4.",
              "9.6.2.4", "(a) En elementos continuos en ambos extremos: Ie promedio = ( Ie1 + Ie2 + 2 Ie3 ) / 4 (9-13)"),
    tabla("Factor ξ por duración de cargas sostenidas", ["ξ"], XI, 1, 0,
          "9.6.2.5", "ξ, el factor dependiente del tiempo para cargas sostenidas, igual a: 5 años o más … 2,0; 12 meses … 1,4; 6 meses … 1,2; 3 meses … 1,0"),
    imagen("Según la curva de la Fig. 9.6.2.5, ¿hacia qué valor tiende ξ para cargas sostenidas de 5 años o más?", figura("fig-9-6-2-5"),
           "ξ = 2,0", "9.6.2.5", "5 años o más … 2,0"),
    caso("Deflexión diferida: con ξ = {X} y cuantía de acero en compresión ρ′ = {R}, ¿cuánto vale λΔ = ξ / (1 + 50 ρ′)?",
         {"X": {"etiqueta": "ξ", "valores": [1.0, 1.2, 1.4, 2.0]}, "R": {"etiqueta": "ρ′", "valores": [0, 0.004, 0.006, 0.01]}},
         "X/(1+50*R)", None, "9.6.2.5", "λΔ = ξ / (1 + 50 ρ’) (9-15)",
         "La deflexión diferida es λΔ por la deflexión inmediata de las cargas sostenidas."),
    tabla("Tabla 9.2 · Deflexiones máximas admisibles", ["Límite"], TABLA_92, 1, 0,
          "9.6.2.6", "La deflexión calculada de acuerdo con 9.6.2.2 a 9.6.2.5 no debe exceder los límites establecidos en la Tabla 9.2"),
    opcion("Piso que soporta tabiques de albañilería susceptibles de dañarse: ¿qué límite de deflexión (posterior a la unión de los tabiques) aplica la Tabla 9.2?",
           ["ℓ/180", "ℓ/240", "ℓ/360", "ℓ/480"], 3,
           "9.6.2.6", "La deflexión calculada… no debe exceder los límites establecidos en la Tabla 9.2",
           "ℓ/480 para pisos o techos que soportan elementos no estructurales susceptibles de daño; ℓ/240 si no son susceptibles."),
    tabla("Cuantía mínima de retracción y temperatura en losas (9.7.2)", ["As / Ag"], CUANTIAS, 2, 0,
          "9.7.2", "- Barras lisas 0,0025 - Barras corrugadas con fy < 420 Mpa 0,0020 - Barras corrugadas o malla de alambre (liso o corrugado) de intersecciones soldadas, con fy ≥ 420 Mpa 0,0018"),
    caso("Losa maciza de {H} cm de espesor con barras corrugadas fy = 420 MPa. ¿Área mínima de acero por retracción y temperatura por metro de ancho (cm²/m)?",
         {"H": {"etiqueta": "Espesor", "valores": [12, 15, 17, 20, 25], "unidad": "cm"}}, "0.0018*100*H", "cm²/m",
         "9.7.2", "Barras corrugadas o malla de alambre… con fy ≥ 420 Mpa 0,0018",
         "As = 0,0018 × b × h, con b = 100 cm."),
    completar("El refuerzo por retracción y temperatura se coloca a no más de tres veces el espesor de la losa, sin exceder {{400 mm}}.",
              "9.7.3", "…deberá colocarse con un espaciamiento entre ejes menor o igual a tres veces el espesor de la losa, sin exceder de 400 mm."),
    completar("En aligerados con ladrillos de techo, el refuerzo de temperatura perpendicular a los nervios puede espaciarse hasta {{cinco}} veces el espesor de la losa, sin exceder 400 mm.",
              "9.7.3", "En losas nervadas en una dirección (aligerados) donde se usen bloques de relleno (ladrillos de techo) permanentes… el espaciamiento máximo del refuerzo perpendicular a los nervios podrá extenderse a cinco veces el espesor de la losa sin exceder de 400 mm."),
    completar("Si el peralte de una viga excede {{900 mm}}, se coloca armadura superficial longitudinal en ambas caras laterales del alma.",
              "9.9.6", "Si el peralte h de una viga o nervadura excede de 900 mm, se deberá colocar armadura (superficial) longitudinal uniformemente distribuida en ambas caras laterales del alma…"),
]

CAPITULOS = [
    ("03", "3", "e060-c03-materiales", "E.060 · Cap. 3 · Materiales", "Agregados, agua, acero de refuerzo, aditivos y almacenamiento.", CAP3),
    ("04", "4", "e060-c04-durabilidad", "E.060 · Cap. 4 · Durabilidad", "Aire incorporado, exposición especial, sulfatos y cloruros (Tablas 4.1 a 4.5).", CAP4),
    ("07", "7", "e060-c07-detalles-refuerzo", "E.060 · Cap. 7 · Detalles del refuerzo", "Ganchos, doblado, tolerancias, espaciamiento, recubrimientos, estribos y espirales.", CAP7),
    ("09", "9", "e060-c09-resistencia-servicio", "E.060 · Cap. 9 · Resistencia y servicio", "Combinaciones de carga, factores φ, deflexiones y refuerzo por temperatura.", CAP9),
]


def guardar(nombre, datos):
    ruta = f"{SALIDA}/{nombre}"
    json.dump(datos, open(ruta, "w"), ensure_ascii=False, indent=1)
    return ruta, os.path.getsize(ruta)


# Todos los artículos de la norma: carga la fuente completa de una vez.
r = guardar("00-e060-articulos.json", {"formato": "tekluma-mazos/1", "norma": NORMA, "fuente": FUENTE, "articulos": ARTICULOS, "mazos": []})
print(r[0], len(ARTICULOS), "artículos", r[1] // 1024, "KB")

for orden, (num, cap, slug, titulo, descripcion, tarjetas) in enumerate(CAPITULOS, start=1):
    articulos = [a for a in ARTICULOS if a["numero"].split(".")[0] == cap]
    datos = {
        "formato": "tekluma-mazos/1",
        "norma": NORMA,
        "fuente": FUENTE,
        "articulos": articulos,
        "mazos": [{"slug": slug, "titulo": titulo, "descripcion": descripcion, "acceso": "free", "orden": 10 + orden, "tarjetas": tarjetas}],
    }
    ruta, tam = guardar(f"{num}-{slug.split('-', 2)[2]}.json", datos)
    tipos = {}
    for t in tarjetas:
        tipos[t["contenido"]["tipo"]] = tipos.get(t["contenido"]["tipo"], 0) + 1
    print(ruta.split("/")[-1], len(articulos), "artículos,", len(tarjetas), "tarjetas", tipos, tam // 1024, "KB")
