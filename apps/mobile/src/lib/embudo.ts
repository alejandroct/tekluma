import { Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import type { EventoEmbudo } from "@tekluma/shared";
import { solicitar } from "./auth";
import { guardarAjuste, leerAjuste } from "./db";

/**
 * Pasos del embudo de activación (ver packages/shared/src/embudo.ts). Cada uno se manda una sola vez
 * por instalación, con un id aleatorio propio: no es el IDFA ni el id de publicidad de Android.
 */
function instalacion() {
  let id = leerAjuste<string>("instalacion");
  if (!id) {
    id = randomUUID();
    guardarAjuste("instalacion", id);
  }
  return id;
}

/** Fire and forget: if it fails (no signal) it is retried the next time the same step happens. */
export function registrarEvento(evento: EventoEmbudo) {
  const enviados = leerAjuste<EventoEmbudo[]>("embudo") ?? [];
  if (enviados.includes(evento) || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
  // `solicitar` adds the session when there is one, which links this install to the user.
  solicitar("/eventos", { method: "POST", body: JSON.stringify({ instalacion: instalacion(), evento, plataforma: Platform.OS }) })
    .then((r) => {
      if (r.ok) guardarAjuste("embudo", [...(leerAjuste<EventoEmbudo[]>("embudo") ?? []), evento]);
    })
    .catch(() => {});
}
