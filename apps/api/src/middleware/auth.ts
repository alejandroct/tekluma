import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export type AuthVars = { Variables: { usuarioId: string } };

/**
 * TODO: reemplazar por la verificación real del token (proveedor de auth por decidir).
 * Mientras tanto, solo fuera de producción se acepta el header `x-dev-usuario`.
 */
export const requiereUsuario = createMiddleware<AuthVars>(async (c, next) => {
  const devUsuario = c.req.header("x-dev-usuario");
  if (process.env.NODE_ENV !== "production" && devUsuario) {
    c.set("usuarioId", devUsuario);
    return next();
  }
  throw new HTTPException(401, { message: "No autenticado" });
});
