import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { guardarAjuste, leerAjuste } from "./db";

/** Recordatorio diario local: no pasa por el servidor ni necesita cuenta. */
export type Recordatorio = { activo: boolean; hora: number; minuto: number };

const CLAVE = "recordatorio";
const CANAL = "recordatorios";
export const RECORDATORIO_INICIAL: Recordatorio = { activo: false, hora: 20, minuto: 0 };

export function leerRecordatorio(): Recordatorio {
  return leerAjuste<Recordatorio>(CLAVE) ?? RECORDATORIO_INICIAL;
}

export const horaTexto = ({ hora, minuto }: Pick<Recordatorio, "hora" | "minuto">) =>
  `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

/** Se llama una vez al abrir la app: cómo se muestra con la app abierta y el canal de Android. */
export function iniciarNotificaciones() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  // En Android 13+ el diálogo de permiso no aparece hasta que exista un canal.
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(CANAL, {
      name: "Recordatorio diario",
      description: "Un aviso al día para repasar la norma",
      importance: AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

async function permiso() {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted || actual.ios?.status === IosAuthorizationStatus.PROVISIONAL) return true;
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return pedido.granted;
}

/**
 * Activa (o mueve) el recordatorio. Devuelve false si el usuario no dio permiso:
 * en ese caso queda guardado como apagado para no insistir.
 */
export async function activarRecordatorio(hora: number, minuto: number): Promise<boolean> {
  const concedido = await permiso();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!concedido) {
    guardarAjuste(CLAVE, { activo: false, hora, minuto });
    return false;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Tu repaso de hoy",
      body: "La pregunta del día ya está lista y tus tarjetas te esperan. Diez minutos bastan.",
      data: { url: "/diaria" },
    },
    // iOS repite con un disparador de calendario; Android tiene uno diario propio.
    trigger:
      Platform.OS === "android"
        ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hora, minute: minuto, channelId: CANAL }
        : { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: hora, minute: minuto, repeats: true },
  });
  guardarAjuste(CLAVE, { activo: true, hora, minuto });
  return true;
}

export async function apagarRecordatorio() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  guardarAjuste(CLAVE, { ...leerRecordatorio(), activo: false });
}
