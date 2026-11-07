/** Títulos del RNE y otras fuentes normativas, agrupados por público. */
export const DISCIPLINAS = [
  "habilitaciones_urbanas", // GH, OS
  "arquitectura", // A.010 – A.140
  "estructuras", // E.020 – E.090
  "instalaciones_sanitarias", // IS
  "instalaciones_electromecanicas", // EM
  "generales", // G.010 – G.050
] as const;
export type Disciplina = (typeof DISCIPLINAS)[number];

/** Flujo editorial: autor y revisor deben ser personas distintas. */
export const ESTADOS_EDITORIALES = [
  "borrador",
  "en_revision",
  "aprobado",
  "publicado",
  "obsoleto",
] as const;
export type EstadoEditorial = (typeof ESTADOS_EDITORIALES)[number];

export const ROLES_STAFF = ["autor", "revisor", "admin"] as const;
export type RolStaff = (typeof ROLES_STAFF)[number];

/** Cómo se accede a un mazo. */
export const ACCESOS_MAZO = ["gratis", "monedas", "premium"] as const;
export type AccesoMazo = (typeof ACCESOS_MAZO)[number];

export const MOTIVOS_MONEDAS = [
  "anuncio", // recompensa por ver un anuncio
  "compra", // paquete comprado vía IAP
  "desbloqueo", // gasto al abrir un mazo
  "bono", // racha, referidos, bienvenida
  "ajuste", // corrección manual de soporte
] as const;
export type MotivoMonedas = (typeof MOTIVOS_MONEDAS)[number];
