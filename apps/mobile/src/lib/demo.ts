import type { PaqueteMazo } from "@tekluma/shared";

/**
 * Mazo de ejemplo embebido mientras no exista la API desplegada.
 * ⚠️ Contenido de demostración: debe pasar por revisión editorial antes de publicarse.
 */
export const mazoDemo: PaqueteMazo & { titulo: string } = {
  mazoId: "00000000-0000-4000-8000-000000000030",
  titulo: "E.030 · Diseño sismorresistente",
  version: 1,
  publicadoEn: "2026-11-07T00:00:00.000Z",
  norma: { codigo: "E.030", titulo: "Diseño Sismorresistente", version: "DS 003-2016-VIVIENDA (2018)" },
  tarjetas: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      revision: 1,
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
        explicacion: "Z es la aceleración máxima horizontal en suelo rígido con 10% de probabilidad de excedencia en 50 años, como fracción de g.",
      },
      citas: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      revision: 1,
      contenido: {
        tipo: "opcion_multiple",
        pregunta: "¿Qué factor de uso U corresponde a un hospital (edificación esencial, categoría A)?",
        opciones: ["1.0", "1.3", "1.5", "1.8"],
        correcta: 2,
        explicacion: "Las edificaciones esenciales de categoría A usan U = 1.5 (con las excepciones de aislamiento sísmico indicadas en la norma).",
      },
      citas: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000303",
      revision: 1,
      contenido: {
        tipo: "concepto",
        pregunta: "¿Cuál es la expresión de la fuerza cortante en la base V?",
        respuesta: "V = (Z · U · C · S / R) · P, con C/R ≥ 0.11",
      },
      citas: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000304",
      revision: 1,
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
      citas: [],
    },
  ],
};
