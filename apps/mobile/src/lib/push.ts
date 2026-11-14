import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api, solicitar } from "./auth";
import { guardarAjuste, leerAjuste } from "./db";

/**
 * Notificaciones del servidor (por ahora, «tu racha está en riesgo»). El token del teléfono se manda
 * solo si la persona ya dio permiso de notificaciones: aquí nunca se pide el permiso de sorpresa.
 */
const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;

export async function registrarPush() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const res = await solicitar("/cuenta/push", { method: "POST", body: JSON.stringify({ token, plataforma: Platform.OS }) });
  if (res.ok) guardarAjuste("push", token);
}

/** Al cerrar sesión: este teléfono deja de recibir los avisos de la cuenta. */
export async function olvidarPush() {
  const token = leerAjuste<string>("push");
  if (token) await solicitar("/cuenta/push", { method: "DELETE", body: JSON.stringify({ token }) });
}

export const leerAvisos = () => api<{ racha: boolean }>("/cuenta/avisos");
export const guardarAvisos = (racha: boolean) => api<{ ok: boolean }>("/cuenta/avisos", { method: "PUT", body: JSON.stringify({ racha }) });

/** Pide el permiso (si aún se puede) y registra el teléfono. Devuelve false si no hay permiso. */
export async function permitirAvisos() {
  const actual = await Notifications.getPermissionsAsync();
  const concedido = actual.granted || (actual.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (concedido) await registrarPush().catch(() => {});
  return concedido;
}
