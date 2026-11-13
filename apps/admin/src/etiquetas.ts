import type { CoinReason, ContenidoTarjeta, Discipline, EditorialStatus, StaffRole, TipoTarjeta } from "@tekluma/shared";

export const ESTADOS: Record<EditorialStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  published: "Publicada",
  deprecated: "Retirada",
};

export const ROLES: Record<StaffRole, string> = { author: "Autor", reviewer: "Revisor", admin: "Admin" };

export const DESCRIPCION_ROLES: Record<StaffRole, string> = {
  author: "Redacta tarjetas y las envía a revisión.",
  reviewer: "Aprueba o rechaza tarjetas de otras personas y publica mazos.",
  admin: "Además gestiona normas, mazos y el equipo.",
};

export const DISCIPLINAS: Record<Discipline, string> = {
  urban_development: "Habilitaciones urbanas",
  architecture: "Arquitectura",
  structures: "Estructuras",
  plumbing: "Instalaciones sanitarias",
  electromechanical: "Instalaciones electromecánicas",
  general: "Generales",
};

export const TIPOS: Record<TipoTarjeta, string> = {
  concepto: "Concepto",
  opcion_multiple: "Opción múltiple",
  completar: "Completar",
  tabla: "Tabla",
  caso_numerico: "Caso numérico",
  imagen: "Imagen",
};

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

export const MOTIVOS_MONEDAS: Record<CoinReason, string> = {
  ad: "Anuncio",
  purchase: "Compra",
  extra_cards: "Más tarjetas",
  daily_question: "Pregunta del día",
  check_in: "Check-in diario",
  bonus: "Bono",
  adjustment: "Ajuste manual",
};
