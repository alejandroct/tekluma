/**
 * Carga contenido de demostración para desarrollo: `pnpm --filter @tekluma/api db:seed`.
 * ⚠️ Las tarjetas y los números de artículo deben pasar por revisión editorial antes de producción.
 * Es idempotente: si la norma ya existe, no hace nada.
 */
import { eq } from "drizzle-orm";
import type { ContenidoTarjeta } from "@tekluma/shared";
import { db } from "./db/client";
import { articulos, citasTarjeta, mazos, normas, tarjetas, usuarios, versionesNorma } from "./db/schema";
import { publicarMazo } from "./publicacion";

type TarjetaSemilla = { contenido: ContenidoTarjeta; articulo: string; extracto: string };

type NormaSemilla = {
  codigo: string;
  titulo: string;
  disciplina: (typeof normas.$inferInsert)["disciplina"];
  dispositivo: string;
  publicadaEn: string;
  articulos: Record<string, string>; // número → encabezado
  mazo: Pick<typeof mazos.$inferInsert, "slug" | "titulo" | "descripcion" | "acceso" | "precioMonedas" | "orden">;
  tarjetas: TarjetaSemilla[];
};

const PENDIENTE = "Resumen editorial; pendiente de transcribir el texto oficial.";

const contenido: NormaSemilla[] = [
  {
    codigo: "E.030",
    titulo: "Diseño Sismorresistente",
    disciplina: "estructuras",
    dispositivo: "DS 003-2016-VIVIENDA (mod. 2018)",
    publicadaEn: "2018-01-22",
    articulos: { "10": "Zonificación", "15": "Categoría de las edificaciones y factor de uso (U)", "28.2": "Fuerza cortante en la base" },
    mazo: {
      slug: "e030-fundamentos",
      titulo: "E.030 · Diseño sismorresistente",
      descripcion: "Zonificación, factor de uso y cortante basal.",
      acceso: "gratis",
      precioMonedas: null,
      orden: 1,
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
    ],
  },
  {
    codigo: "E.060",
    titulo: "Concreto Armado",
    disciplina: "estructuras",
    dispositivo: "DS 010-2009-VIVIENDA",
    publicadaEn: "2009-05-09",
    articulos: { "5.1.1": "Resistencia mínima del concreto estructural", "7.7.1": "Recubrimientos para concreto vaciado en sitio" },
    mazo: {
      slug: "e060-basico",
      titulo: "E.060 · Concreto armado",
      descripcion: "Resistencias mínimas y recubrimientos.",
      acceso: "monedas",
      precioMonedas: 50,
      orden: 2,
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
    ],
  },
];

async function staff(email: string, nombre: string, rol: "autor" | "revisor") {
  const [existente] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  if (existente) return existente.id;
  const [nuevo] = await db.insert(usuarios).values({ email, nombre, rolStaff: rol, emailVerificado: true }).returning();
  return nuevo!.id;
}

const autorId = await staff("autor@tekluma.app", "Autor de contenido", "autor");
const revisorId = await staff("revisor@tekluma.app", "Revisor técnico", "revisor");

for (const n of contenido) {
  const [existe] = await db.select().from(normas).where(eq(normas.codigo, n.codigo));
  if (existe) {
    console.log(`${n.codigo}: ya existe, se omite`);
    continue;
  }

  const [norma] = await db.insert(normas).values({ codigo: n.codigo, titulo: n.titulo, disciplina: n.disciplina }).returning();
  const [version] = await db
    .insert(versionesNorma)
    .values({ normaId: norma!.id, dispositivo: n.dispositivo, publicadaEn: new Date(n.publicadaEn), vigente: true })
    .returning();
  const filasArticulos = await db
    .insert(articulos)
    .values(Object.entries(n.articulos).map(([numero, encabezado]) => ({ versionNormaId: version!.id, numero, encabezado, texto: PENDIENTE })))
    .returning();
  const articuloPorNumero = new Map(filasArticulos.map((a) => [a.numero, a.id]));

  const [mazo] = await db.insert(mazos).values({ ...n.mazo, normaId: norma!.id }).returning();
  for (const t of n.tarjetas) {
    const [tarjeta] = await db
      .insert(tarjetas)
      .values({ mazoId: mazo!.id, contenido: t.contenido, estado: "aprobado", autorId, revisorId })
      .returning();
    await db.insert(citasTarjeta).values({ tarjetaId: tarjeta!.id, articuloId: articuloPorNumero.get(t.articulo)!, extracto: t.extracto });
  }

  const pub = await publicarMazo(mazo!.id, revisorId);
  console.log(`${n.codigo}: mazo "${n.mazo.titulo}" publicado v${pub.version} con ${pub.totalTarjetas} tarjetas`);
}

process.exit(0);
