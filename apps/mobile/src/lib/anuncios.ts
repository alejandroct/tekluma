import { Platform } from "react-native";
import MobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { getTrackingPermissionsAsync, PermissionStatus, requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { acreditarAnuncioDePrueba, obtenerCupo, type TipoRecompensa } from "./cupo";
import { guardarAjuste, leerAjuste } from "./db";

/** En desarrollo se usan los bloques de prueba de Google; en producción, los de AdMob vía variables de entorno. */
const ID_RECOMPENSA = __DEV__
  ? TestIds.REWARDED
  : (Platform.select({ ios: process.env.EXPO_PUBLIC_ADMOB_RECOMPENSA_IOS, android: process.env.EXPO_PUBLIC_ADMOB_RECOMPENSA_ANDROID }) ?? TestIds.REWARDED);
const ID_INTERSTICIAL = __DEV__
  ? TestIds.INTERSTITIAL
  : (Platform.select({ ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTICIAL_IOS, android: process.env.EXPO_PUBLIC_ADMOB_INTERSTICIAL_ANDROID }) ?? TestIds.INTERSTITIAL);

let iniciado: Promise<boolean> | null = null;

/**
 * Antes del primer anuncio: el formulario de consentimiento de Google (UMP; solo aparece donde la ley lo
 * exige, como la UE o el Reino Unido), luego el permiso de rastreo de iOS (ATT) y recién ahí el SDK.
 * Devuelve false si no se pueden pedir anuncios. Si UMP falla, se intenta igual con lo que recuerde.
 */
async function prepararAnuncios() {
  const consentimiento = await AdsConsent.gatherConsent().catch(() => AdsConsent.getConsentInfo());
  if (Platform.OS === "ios") {
    const { status } = await getTrackingPermissionsAsync();
    if (status === PermissionStatus.UNDETERMINED) await requestTrackingPermissionsAsync().catch(() => {});
  }
  if (!consentimiento.canRequestAds) return false;
  await MobileAds().initialize();
  return true;
}

export const iniciarAnuncios = () => (iniciado ??= prepararAnuncios().catch(() => false));

async function anunciosListos() {
  if (!(await iniciarAnuncios())) throw new Error("Los anuncios no están disponibles con tus opciones de privacidad.");
}

/** Si el usuario está donde la ley exige poder cambiar su consentimiento (la UE, por ejemplo), Perfil muestra el enlace. */
export async function hayOpcionesDePrivacidad() {
  const info = await AdsConsent.getConsentInfo().catch(() => null);
  return info?.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

export const mostrarOpcionesDePrivacidad = () => AdsConsent.showPrivacyOptionsForm();

/**
 * Muestra un anuncio con recompensa: tarjetas extra para hoy o monedas. En producción AdMob
 * avisa al servidor (SSV) con el `userId` y el tipo en `customData`, y el servidor acredita.
 * Devuelve true si el usuario terminó el anuncio (quien llama debe refrescar su estado).
 */
export async function verAnuncioConRecompensa(usuarioId: string, tipo: TipoRecompensa) {
  await anunciosListos();
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

  if (!(await iniciarAnuncios())) return;
  const anuncio = InterstitialAd.createForAdRequest(ID_INTERSTICIAL);
  anuncio.addAdEventListener(AdEventType.LOADED, () => {
    guardarAjuste("intersticiales", { dia: hoy, vistos: vistos + 1 });
    anuncio.show().catch(() => {});
  });
  anuncio.load();
}
