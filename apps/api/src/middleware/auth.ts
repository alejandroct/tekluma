import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth";

export type AuthVars = { Variables: { usuarioId: string } };

/** Exige una sesión válida de Better Auth (cookie o header enviado por la app). */
export const requiereUsuario = createMiddleware<AuthVars>(async (c, next) => {
  const sesion = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!sesion) throw new HTTPException(401, { message: "No autenticado" });
  c.set("usuarioId", sesion.user.id);
  return next();
});
