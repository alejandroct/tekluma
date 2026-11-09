import type { ContenidoTarjeta, EditorialStatus, StaffRole, TipoTarjeta } from "@tekluma/shared";

export const ESTADOS: Record<EditorialStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  published: "Publicada",
  deprecated: "Retirada",
};

export const ROLES: Record<StaffRole, string> = { author: "Autor", reviewer: "Revisor", admin: "Admin" };

export const PLANTILLAS: Record<TipoTarjeta, object> = {
  concepto: { tipo: "concepto", pregunta: "", respuesta: "", explicacion: "" },
  opcion_multiple: { tipo: "opcion_multiple", pregunta: "", opciones: ["", "", "", ""], correcta: 0 },
  completar: { tipo: "completar", texto: "El recubrimiento mínimo es {{70 mm}}." },
  tabla: {
    tipo: "tabla",
    titulo: "",
    columnas: [""],
    filas: [{ etiqueta: "", valores: [""] }],
    pregunta: { fila: 0, columna: 0 },
  },
  caso_numerico: {
    tipo: "caso_numerico",
    enunciado: "Calcula V para Z = {Z} ...",
    variables: { Z: { etiqueta: "Factor de zona", valores: [0.45, 0.35] } },
    formula: "Z*1.0",
    unidadResultado: "tf",
    tolerancia: 0.02,
  },
  imagen: { tipo: "imagen", pregunta: "", imagenUrl: "https://", respuesta: "" },
};

/** One-line summary of a card for lists. */
export function resumen(c: ContenidoTarjeta): string {
  switch (c.tipo) {
    case "completar":
      return c.texto;
    case "tabla":
      return c.titulo;
    case "caso_numerico":
      return c.enunciado;
    default:
      return c.pregunta;
  }
}
