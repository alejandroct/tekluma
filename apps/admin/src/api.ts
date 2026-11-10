import type { ContenidoTarjeta, DeckAccess, Discipline, EditorialStatus, StaffRole } from "@tekluma/shared";

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
