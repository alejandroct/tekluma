import * as Sentry from "@sentry/aws-serverless";

/**
 * Registro de errores (Sentry). Solo se activa con SENTRY_DSN: en local y sin el secreto no
 * envía nada. No se mandan datos personales: ni IP, ni cuerpos, ni cabeceras; solo el id del usuario.
 */
export const sentryActivo = Boolean(process.env.SENTRY_DSN);

if (sentryActivo) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENTORNO ?? "desarrollo",
    tracesSampleRate: 0,
    // Por defecto Sentry 11 adjunta cabeceras, cookies y cuerpos: aquí no se envía nada de eso.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  });
}

/** Envuelve el handler de una Lambda: captura lo que se escape y espera a que se envíe antes de terminar. */
export const conSentry: typeof Sentry.wrapHandler = ((handler: Parameters<typeof Sentry.wrapHandler>[0]) =>
  sentryActivo ? Sentry.wrapHandler(handler) : handler) as typeof Sentry.wrapHandler;

/** Reporta un error inesperado de una ruta, con la ruta y el usuario (solo su id) como contexto. */
export function reportarError(error: unknown, contexto: { metodo: string; ruta: string; usuarioId?: string }) {
  if (!sentryActivo) return;
  Sentry.withScope((scope) => {
    scope.setTag("ruta", `${contexto.metodo} ${contexto.ruta}`);
    if (contexto.usuarioId) scope.setUser({ id: contexto.usuarioId });
    Sentry.captureException(error);
  });
}
