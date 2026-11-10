import { authClient, solicitar } from "./auth";
import { borrarClave } from "./cifrado";
import { cerrarSesionCompras } from "./compras";
import { borrarDatosLocales } from "./db";
import { olvidarPaquetes } from "./mazos";
import { sincronizar } from "./repaso";

async function salir() {
  borrarDatosLocales();
  olvidarPaquetes();
  await borrarClave().catch(() => {});
  await cerrarSesionCompras().catch(() => {});
  await authClient.signOut().catch(() => {});
}

/**
 * Sube el progreso pendiente y luego borra todo del dispositivo, mazos incluidos.
 * Lanza si no hay conexión, para no perder repasos sin sincronizar.
 */
export async function cerrarSesion() {
  while ((await sincronizar()) > 0);
  await salir();
}

/** Elimina la cuenta en el servidor y limpia el dispositivo. Lanza con el mensaje de la API si no se pudo. */
export async function eliminarCuenta() {
  const res = await solicitar("/cuenta", { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text()) || "No pudimos eliminar tu cuenta. Inténtalo de nuevo.");
  // La sesión ya no existe en el servidor; signOut solo limpia la guardada en el llavero.
  await salir();
}
