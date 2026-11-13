import { useSyncExternalStore } from "react";
import { guardarAjuste, leerAjuste } from "./db";
import { registrarEvento } from "./embudo";

/** El tutorial de inicio se ve una sola vez por dispositivo, antes del login. */
let visto = leerAjuste<boolean>("tutorial") ?? false;
const oyentes = new Set<() => void>();

export function terminarTutorial() {
  guardarAjuste("tutorial", true);
  registrarEvento("tutorial_visto");
  visto = true;
  oyentes.forEach((o) => o());
}

export function useTutorialVisto() {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    () => visto,
  );
}
