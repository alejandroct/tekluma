/**
 * Demo content for development stages (local, `dev`). Incremental: missing articles and cards are
 * added to existing standards and their decks are republished.
 * ⚠️ Cards and article numbers must go through editorial review before production.
 */
import { and, eq } from "drizzle-orm";
import type { ContenidoTarjeta } from "@tekluma/shared";
import { db } from "./db/client";
import { articles, cardCitations, cards, decks, standards, standardVersions, users } from "./db/schema";
import { publicarMazo } from "./publicacion";
import { canonico } from "./util";

type TarjetaSemilla = { contenido: ContenidoTarjeta; articulo: string; extracto: string };

type NormaSemilla = {
  codigo: string;
  titulo: string;
  disciplina: (typeof standards.$inferInsert)["discipline"];
  dispositivo: string;
  publicadaEn: string;
  articulos: Record<string, string>; // number → heading
  mazo: Pick<typeof decks.$inferInsert, "slug" | "title" | "description" | "access" | "sortOrder">;
  tarjetas: TarjetaSemilla[];
};

const PENDIENTE = "Resumen editorial; pendiente de transcribir el texto oficial.";

const contenido: NormaSemilla[] = [
  {
    codigo: "E.030",
    titulo: "Diseño Sismorresistente",
    disciplina: "structures",
    dispositivo: "DS 003-2016-VIVIENDA (mod. 2018)",
    publicadaEn: "2018-01-22",
    articulos: {
      "10": "Zonificación",
      "12": "Perfiles de suelo",
      "15": "Categoría de las edificaciones y factor de uso (U)",
      "18": "Sistemas estructurales y coeficiente básico de reducción",
      "28.2": "Fuerza cortante en la base",
      "32": "Desplazamientos laterales relativos admisibles",
    },
    mazo: {
      slug: "e030-fundamentos",
      title: "E.030 · Diseño sismorresistente",
      description: "Zonificación, factor de uso y cortante basal.",
      access: "free",
      sortOrder: 1,
    },
    tarjetas: [
      {
        articulo: "10",
        extracto: `Factores de zona Z por zona sísmica. ${PENDIENTE}`,
        contenido: {
          tipo: "tabla",
          titulo: "Factor de zona Z",
          columnas: ["Z"],
          filas: [
            { etiqueta: "Zona 4", valores: ["0.45"] },
            { etiqueta: "Zona 3", valores: ["0.35"] },
            { etiqueta: "Zona 2", valores: ["0.25"] },
            { etiqueta: "Zona 1", valores: ["0.10"] },
          ],
          pregunta: { fila: 0, columna: 0 },
          explicacion:
            "Z es la aceleración máxima horizontal en suelo rígido con 10% de probabilidad de excedencia en 50 años, como fracción de g.",
        },
      },
      {
        articulo: "15",
        extracto: `Edificaciones esenciales (categoría A): U = 1.5. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Qué factor de uso U corresponde a un hospital (edificación esencial, categoría A)?",
          opciones: ["1.0", "1.3", "1.5", "1.8"],
          correcta: 2,
          explicacion:
            "Las edificaciones esenciales de categoría A usan U = 1.5 (con las excepciones de aislamiento sísmico indicadas en la norma).",
        },
      },
      {
        articulo: "28.2",
        extracto: `V = Z·U·C·S/R · P, con C/R ≥ 0.11. ${PENDIENTE}`,
        contenido: {
          tipo: "concepto",
          pregunta: "¿Cuál es la expresión de la fuerza cortante en la base V?",
          respuesta: "V = (Z · U · C · S / R) · P, con C/R ≥ 0.11",
        },
      },
      {
        articulo: "28.2",
        extracto: `V = Z·U·C·S/R · P. ${PENDIENTE}`,
        contenido: {
          tipo: "caso_numerico",
          enunciado: "Calcula V para Z = {Z}, U = {U}, C = 2.5, S = {S}, R = 8 y P = {P} tf.",
          variables: {
            Z: { etiqueta: "Factor de zona", valores: [0.45, 0.35, 0.25] },
            U: { etiqueta: "Factor de uso", valores: [1.0, 1.3, 1.5] },
            S: { etiqueta: "Factor de suelo", valores: [1.0, 1.05, 1.1] },
            P: { etiqueta: "Peso sísmico", valores: [800, 1200, 1500], unidad: "tf" },
          },
          formula: "Z*U*2.5*S/8*P",
          unidadResultado: "tf",
          tolerancia: 0.02,
        },
      },
      {
        articulo: "10",
        extracto: `El territorio nacional se divide en cuatro zonas sísmicas. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿En cuántas zonas sísmicas divide la E.030 el territorio peruano?",
          opciones: ["3", "4", "5", "6"],
          correcta: 1,
        },
      },
      {
        articulo: "10",
        extracto: `Zona 4: Z = 0.45. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Qué factor de zona Z corresponde a la zona 4?",
          opciones: ["0.25", "0.35", "0.45", "0.55"],
          correcta: 2,
          explicacion: "La zona 4 es la de mayor sismicidad, a lo largo de la costa.",
        },
      },
      {
        articulo: "12",
        extracto: `Perfil S0: roca dura. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Qué perfil de suelo corresponde a roca dura?",
          opciones: ["S0", "S1", "S2", "S3"],
          correcta: 0,
          explicacion: "S1 es roca o suelos muy rígidos; S2, suelos intermedios; S3, suelos blandos.",
        },
      },
      {
        articulo: "18",
        extracto: `Pórticos de concreto armado: R0 = 8. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Cuál es el coeficiente básico de reducción R0 para pórticos de concreto armado?",
          opciones: ["3", "6", "7", "8"],
          correcta: 3,
        },
      },
      {
        articulo: "18",
        extracto: `Muros estructurales de concreto armado: R0 = 6. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Cuál es el R0 para un sistema de muros estructurales de concreto armado?",
          opciones: ["4", "6", "7", "8"],
          correcta: 1,
          explicacion: "Dual: 7; muros de ductilidad limitada: 4; albañilería armada o confinada: 3.",
        },
      },
      {
        articulo: "32",
        extracto: `Concreto armado: Δi/hei = 0.007. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Cuál es la deriva máxima de entrepiso permitida para concreto armado?",
          opciones: ["0.005", "0.007", "0.010", "0.015"],
          correcta: 1,
        },
      },
      {
        articulo: "32",
        extracto: `Albañilería: Δi/hei = 0.005. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Cuál es la deriva máxima de entrepiso permitida para albañilería?",
          opciones: ["0.005", "0.007", "0.010", "0.015"],
          correcta: 0,
          explicacion: "Acero y madera: 0.010; concreto armado: 0.007.",
        },
      },
    ],
  },
  {
    codigo: "E.060",
    titulo: "Concreto Armado",
    disciplina: "structures",
    dispositivo: "DS 010-2009-VIVIENDA",
    publicadaEn: "2009-05-09",
    articulos: {
      "3.5": "Acero de refuerzo",
      "5.1.1": "Resistencia mínima del concreto estructural",
      "7.7.1": "Recubrimientos para concreto vaciado en sitio",
      "9.3.2": "Factores de reducción de resistencia",
    },
    mazo: {
      slug: "e060-basico",
      title: "E.060 · Concreto armado",
      description: "Resistencias mínimas y recubrimientos.",
      access: "free",
      sortOrder: 2,
    },
    tarjetas: [
      {
        articulo: "7.7.1",
        extracto: `Concreto vaciado contra el suelo y permanentemente en contacto con él: 70 mm. ${PENDIENTE}`,
        contenido: {
          tipo: "completar",
          texto: "El recubrimiento mínimo del concreto vaciado contra el suelo y en contacto permanente con él es {{70 mm}}.",
        },
      },
      {
        articulo: "5.1.1",
        extracto: `f'c mínimo para concreto estructural: 17 MPa. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Cuál es la resistencia mínima f'c del concreto estructural según la E.060?",
          opciones: ["14 MPa", "17 MPa", "21 MPa", "28 MPa"],
          correcta: 1,
        },
      },
      {
        articulo: "3.5",
        extracto: `Acero grado 60: fy = 420 MPa. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Qué esfuerzo de fluencia fy tiene el acero de refuerzo grado 60?",
          opciones: ["280 MPa", "350 MPa", "420 MPa", "520 MPa"],
          correcta: 2,
        },
      },
      {
        articulo: "9.3.2",
        extracto: `Flexión sin carga axial: φ = 0.90. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Qué factor de reducción φ se usa para flexión sin carga axial?",
          opciones: ["0.70", "0.75", "0.85", "0.90"],
          correcta: 3,
        },
      },
      {
        articulo: "9.3.2",
        extracto: `Cortante y torsión: φ = 0.85. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Qué factor de reducción φ se usa para cortante y torsión?",
          opciones: ["0.70", "0.75", "0.85", "0.90"],
          correcta: 2,
        },
      },
      {
        articulo: "7.7.1",
        extracto: `Vigas y columnas no expuestas a la intemperie ni en contacto con el suelo: 40 mm. ${PENDIENTE}`,
        contenido: {
          tipo: "opcion_multiple",
          pregunta: "¿Cuál es el recubrimiento mínimo de vigas y columnas no expuestas a la intemperie?",
          opciones: ["20 mm", "25 mm", "40 mm", "50 mm"],
          correcta: 2,
          explicacion: "Losas, muros y viguetas en las mismas condiciones: 20 mm.",
        },
      },
    ],
  },
];

async function staff(email: string, name: string, staffRole: "author" | "reviewer") {
  const [existente] = await db.select().from(users).where(eq(users.email, email));
  if (existente) return existente.id;
  const [nuevo] = await db.insert(users).values({ email, name, staffRole, emailVerified: true }).returning();
  return nuevo!.id;
}

export async function sembrar() {
  const authorId = await staff("autor@tekluma.app", "Autor de contenido", "author");
  const reviewerId = await staff("revisor@tekluma.app", "Revisor técnico", "reviewer");
  const resultado: string[] = [];

  for (const n of contenido) {
    let [norma] = await db.select().from(standards).where(eq(standards.code, n.codigo));
    let version: typeof standardVersions.$inferSelect | undefined;
    if (!norma) {
      [norma] = await db.insert(standards).values({ code: n.codigo, title: n.titulo, discipline: n.disciplina }).returning();
      [version] = await db
        .insert(standardVersions)
        .values({ standardId: norma!.id, decree: n.dispositivo, publishedAt: new Date(n.publicadaEn), isCurrent: true })
        .returning();
    } else {
      [version] = await db
        .select()
        .from(standardVersions)
        .where(and(eq(standardVersions.standardId, norma.id), eq(standardVersions.isCurrent, true)));
    }

    // Missing articles.
    const existentes = await db.select().from(articles).where(eq(articles.standardVersionId, version!.id));
    const faltantes = Object.entries(n.articulos).filter(([number]) => !existentes.some((a) => a.number === number));
    const nuevos = faltantes.length
      ? await db
          .insert(articles)
          .values(faltantes.map(([number, heading]) => ({ standardVersionId: version!.id, number, heading, body: PENDIENTE })))
          .returning()
      : [];
    const articuloPorNumero = new Map([...existentes, ...nuevos].map((a) => [a.number, a.id]));

    let [mazo] = await db.select().from(decks).where(eq(decks.slug, n.mazo.slug));
    mazo ??= (await db.insert(decks).values({ ...n.mazo, standardId: norma!.id }).returning())[0];

    // Missing cards (same content = same card).
    const enMazo = await db.select({ content: cards.content }).from(cards).where(eq(cards.deckId, mazo!.id));
    const claves = new Set(enMazo.map((c) => canonico(c.content)));
    let agregadas = 0;
    for (const t of n.tarjetas) {
      if (claves.has(canonico(t.contenido))) continue;
      const [tarjeta] = await db.insert(cards).values({ deckId: mazo!.id, content: t.contenido, status: "approved", authorId, reviewerId }).returning();
      await db.insert(cardCitations).values({ cardId: tarjeta!.id, articleId: articuloPorNumero.get(t.articulo)!, excerpt: t.extracto });
      agregadas++;
    }

    if (agregadas === 0) {
      resultado.push(`${n.codigo}: sin cambios`);
      continue;
    }
    const pub = await publicarMazo(mazo!.id, reviewerId);
    resultado.push(`${n.codigo}: +${agregadas} tarjetas, mazo "${mazo!.title}" publicado v${pub.version} con ${pub.totalTarjetas} tarjetas`);
  }
  return resultado;
}
