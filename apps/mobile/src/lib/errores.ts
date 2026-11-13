import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";

/**
 * Registro de errores (Sentry). Solo en builds con EXPO_PUBLIC_SENTRY_DSN y fuera de desarrollo.
 * No se envían datos personales: ni IP, ni correo, ni cabeceras; solo el id del usuario.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const erroresActivos = Boolean(DSN) && !__DEV__;

if (erroresActivos) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.EXPO_PUBLIC_API_URL?.includes("api.tekluma.app") ? "produccion" : "pruebas",
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Ni capturas de pantalla ni el árbol de vistas: podrían mostrar datos de la persona.
    attachScreenshot: false,
    attachViewHierarchy: false,
  });
}

/** Asocia los errores al usuario solo por su id (null al cerrar sesión). */
export function usuarioDeErrores(id: string | null) {
  if (erroresActivos) Sentry.setUser(id ? { id } : null);
}

/** Envuelve el componente raíz para capturar los errores de render. */
export const conErrores = (Componente: ComponentType<Record<string, unknown>>) => (erroresActivos ? Sentry.wrap(Componente) : Componente);
