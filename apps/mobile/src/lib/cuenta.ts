import { authClient, solicitar } from "./auth";
import { cerrarSesionCompras } from "./compras";
import { borrarDatosDeUsuario } from "./db";

/** Elimina la cuenta en el servidor y limpia el dispositivo. Lanza con el mensaje de la API si no se pudo. */
export async function eliminarCuenta() {
  const res = await solicitar("/cuenta", { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "No pudimos eliminar tu cuenta. Inténtalo de nuevo.");
  borrarDatosDeUsuario();
  await cerrarSesionCompras().catch(() => {});
  // La sesión ya no existe en el servidor; esto limpia la guardada en el llavero.
  await authClient.signOut().catch(() => {});
}
