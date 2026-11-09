import { Platform } from "react-native";
import MobileAds, { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";
import { acreditarAnuncioDePrueba, obtenerCupo } from "./cupo";
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
 * Muestra un anuncio con recompensa. En producción AdMob avisa al servidor (SSV) con el
 * `userId`, y el servidor amplía el cupo; aquí solo se espera y se refresca el estado.
 * Devuelve el estado nuevo, o null si el usuario cerró el anuncio sin terminarlo.
 */
export async function verAnuncioConRecompensa(usuarioId: string) {
  await iniciarAnuncios();
  const ganado = await new Promise<boolean>((resolve, reject) => {
    const anuncio = RewardedAd.createForAdRequest(ID_RECOMPENSA, { serverSideVerificationOptions: { userId: usuarioId } });
    let recompensa = false;
    anuncio.addAdEventListener(RewardedAdEventType.LOADED, () => anuncio.show().catch(reject));
    anuncio.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (recompensa = true));
    anuncio.addAdEventListener(AdEventType.CLOSED, () => resolve(recompensa));
    anuncio.addAdEventListener(AdEventType.ERROR, reject);
    anuncio.load();
  });
  if (!ganado) return null;
  if (__DEV__) return acreditarAnuncioDePrueba();
  // La llamada de AdMob al servidor tarda un momento.
  await new Promise((r) => setTimeout(r, 1500));
  return obtenerCupo();
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
