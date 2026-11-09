import { Platform } from "react-native";
import MobileAds, { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";
import { acreditarAnuncioDePrueba, obtenerCupo, type TipoRecompensa } from "./cupo";
import { guardarAjuste, leerAjuste } from "./db";

/** En desarrollo se usan los bloques de prueba de Google; en producción, los de AdMob vía variables de entorno. */
const ID_RECOMPENSA = __DEV__
  ? TestIds.REWARDED
  : (Platform.select({ ios: process.env.EXPO_PUBLIC_ADMOB_RECOMPENSA_IOS, android: process.env.EXPO_PUBLIC_ADMOB_RECOMPENSA_ANDROID }) ?? TestIds.REWARDED);
const ID_INTERSTICIAL = __DEV__
  ? TestIds.INTERSTITIAL
  : (Platform.select({ ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTICIAL_IOS, android: process.env.EXPO_PUBLIC_ADMOB_INTERSTICIAL_ANDROID }) ?? TestIds.INTERSTITIAL);

let iniciado: Promise<unknown> | null = null;
export const iniciarAnuncios = () => (iniciado ??= MobileAds().initialize());

/**
 * Muestra un anuncio con recompensa: tarjetas extra para hoy o monedas. En producción AdMob
 * avisa al servidor (SSV) con el `userId` y el tipo en `customData`, y el servidor acredita.
 * Devuelve true si el usuario terminó el anuncio (quien llama debe refrescar su estado).
 */
export async function verAnuncioConRecompensa(usuarioId: string, tipo: TipoRecompensa) {
  await iniciarAnuncios();
  const ganado = await new Promise<boolean>((resolve, reject) => {
    const anuncio = RewardedAd.createForAdRequest(ID_RECOMPENSA, {
      serverSideVerificationOptions: { userId: usuarioId, customData: tipo },
    });
    let recompensa = false;
    anuncio.addAdEventListener(RewardedAdEventType.LOADED, () => anuncio.show().catch(reject));
    anuncio.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (recompensa = true));
    anuncio.addAdEventListener(AdEventType.CLOSED, () => resolve(recompensa));
    anuncio.addAdEventListener(AdEventType.ERROR, reject);
    anuncio.load();
  });
  if (!ganado) return false;
  if (__DEV__) await acreditarAnuncioDePrueba(tipo);
  // En producción la llamada de AdMob al servidor tarda un momento.
  else await new Promise((r) => setTimeout(r, 1500));
  await obtenerCupo().catch(() => {});
  return true;
}

/** Intersticial al terminar una sesión, con tope diario. Nunca a usuarios Premium. */
export async function intersticialAlTerminar(maxPorDia: number, premium: boolean) {
  if (premium || maxPorDia <= 0) return;
  const hoy = new Date().toDateString();
  const registro = leerAjuste<{ dia: string; vistos: number }>("intersticiales");
  const vistos = registro?.dia === hoy ? registro.vistos : 0;
  if (vistos >= maxPorDia) return;

  await iniciarAnuncios();
  const anuncio = InterstitialAd.createForAdRequest(ID_INTERSTICIAL);
  anuncio.addAdEventListener(AdEventType.LOADED, () => {
    guardarAjuste("intersticiales", { dia: hoy, vistos: vistos + 1 });
    anuncio.show().catch(() => {});
  });
  anuncio.load();
}
