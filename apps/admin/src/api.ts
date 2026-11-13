import type { ContenidoTarjeta, DeckAccess, Discipline, EditorialStatus, EstadoReclamo, StaffRole, TipoReclamo } from "@tekluma/shared";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export class ErrorApi extends Error {
  readonly status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

/** Calls the API with the session cookie (shared between admin.<domain> and api.<domain>). */
export async function api<T>(ruta: string, opciones: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(BASE + ruta, {
    method: opciones.method ?? (opciones.body === undefined ? "GET" : "POST"),
    credentials: "include",
    headers: opciones.body === undefined ? undefined : { "content-type": "application/json" },
    body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
  });
  if (!r.ok) {
    const texto = await r.text();
    let mensaje = texto || r.statusText;
    try {
      const json = JSON.parse(texto);
      mensaje = json.message ?? json.error?.issues?.[0]?.message ?? mensaje;
    } catch {
      // plain-text error (HTTPException)
    }
    throw new ErrorApi(r.status, mensaje);
  }
  return r.json() as Promise<T>;
}

export const auth = {
  enviarCodigo: (email: string) => api("/auth/email-otp/send-verification-otp", { body: { email, type: "sign-in" } }),
  ingresar: (email: string, otp: string) => api("/auth/sign-in/email-otp", { body: { email, otp } }),
  salir: () => api("/auth/sign-out", { body: {} }),
};

export type Yo = { id: string; email: string; name: string; rol: StaffRole };
export type Norma = {
  id: string;
  code: string;
  title: string;
  discipline: Discipline;
  versionId: string | null;
  decree: string | null;
  articleCount: number;
};
export type Articulo = { id: string; number: string; heading: string | null; body: string; sourcePage?: number | null };
export type Mazo = {
  id: string;
  slug: string;
  title: string;
  access: DeckAccess;
  standardId: string;
  standardCode: string;
  version: number | null;
  counts: Partial<Record<EditorialStatus, number>>;
};
export type Cita = { articleId: string; excerpt: string; number?: string };
export type Tarjeta = {
  id: string;
  content: ContenidoTarjeta;
  status: EditorialStatus;
  revision: number;
  authorId: string;
  authorName: string;
  updatedAt: string;
  citations: Cita[];
  lastReview: { approved: boolean; comment: string | null } | null;
};
export type Miembro = { id: string; email: string; name: string; staffRole: StaffRole };

export type Reclamo = {
  id: string;
  codigo: string;
  kind: TipoReclamo;
  name: string;
  documentType: string;
  documentNumber: string;
  address: string;
  phone: string;
  email: string;
  isMinor: boolean;
  guardian: string | null;
  itemType: string;
  itemDescription: string;
  amountCents: number | null;
  detail: string;
  request: string;
  status: EstadoReclamo;
  dueAt: string;
  receiptSentAt: string | null;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
};

export type Metricas = {
  hoy: string;
  totales: Record<
    | "usuarios" | "conPerfil" | "premium" | "nuevosHoy" | "nuevos7" | "nuevos30" | "activosHoy" | "activos7" | "activos30"
    | "tarjetasHoy" | "tarjetas7" | "diariaHoy" | "diariaAciertosHoy" | "duelos7" | "partidas7" | "anuncios7" | "monedasEnCirculacion",
    number
  >;
  serie: { dia: string; nuevos: number; activos: number; tarjetas: number }[];
  retencion: { cohorte: number; d1: number; d7: number };
  monedas: { motivo: string; ganadas: number; gastadas: number; movimientos: number }[];
  profesiones: { valor: string | null; usuarios: number }[];
  regiones: { valor: string | null; usuarios: number }[];
  universidades: { valor: string | null; usuarios: number }[];
};

export type FilaUsuario = {
  id: string;
  email: string;
  name: string;
  profession: string | null;
  university: string | null;
  region: string | null;
  createdAt: string;
  premiumUntil: string | null;
  staffRole: StaffRole | null;
  monedas: number;
  tarjetas: number;
  puntos: number;
  ultima: string | null;
};
export type ListaUsuarios = { usuarios: FilaUsuario[]; total: number; pagina: number; porPagina: number };

export type FichaUsuario = {
  usuario: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    profession: string | null;
    university: string | null;
    region: string | null;
    staffRole: StaffRole | null;
    premiumUntil: string | null;
    createdAt: string;
  };
  acceso: { proveedores: string[]; ultimaSesion: string | null; plataforma: string | null; sesionesAbiertas: number };
  monedas: number;
  racha: number;
  cupoHoy: { limite: number; usadas: number; anuncios: number };
  progreso: { tarjetas: number; dominadas: number; aprendiendo: number; pendientes: number; repasos: number; olvidos: number; ultimoRepaso: string | null };
  mazos: { mazo: string; tarjetas: number; dominadas: number }[];
  juego: {
    diariaJugadas: number;
    diariaAciertos: number;
    duelosCreados: number;
    duelosJugados: number;
    puntosTotal: number;
    puntosSemana: number;
    division: string | null;
    anuncios: number;
  };
  movimientos: { fecha: string; monto: number; motivo: string }[];
  serie: { dia: string; tarjetas: number; activo: boolean }[];
  soporte: AccionSoporte[];
};
export type AccionSoporte = {
  id: string;
  kind: "monedas" | "premium" | "quitar_premium";
  coins: number | null;
  premiumUntil: string | null;
  note: string;
  createdAt: string;
  staff: string | null;
  staffEmail: string | null;
};

export type Embudo = Record<
  | "primeraApertura" | "tutorialVisto" | "codigoPedido" | "sesionIniciada" | "perfilCompleto"
  | "primeraTarjeta" | "diezTarjetas" | "volvioDia1" | "premiumVisto" | "premiumComprado",
  number
>;
