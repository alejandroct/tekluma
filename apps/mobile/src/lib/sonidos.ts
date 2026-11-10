import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * Efectos de sonido cortos. Respetan el modo silencio del iPhone y no cortan
 * la música que el usuario esté escuchando.
 */
let moneda: AudioPlayer | null = null;

export function iniciarSonidos() {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
  moneda ??= createAudioPlayer(require("../../assets/sonidos/moneda.wav"));
}

export function sonarMoneda() {
  if (!moneda) iniciarSonidos();
  const jugador = moneda!;
  jugador
    .seekTo(0)
    .then(() => jugador.play())
    .catch(() => {});
}
