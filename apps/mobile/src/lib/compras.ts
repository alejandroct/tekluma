import { Platform } from "react-native";
import Purchases, { PACKAGE_TYPE, type PurchasesError, type PurchasesPackage } from "react-native-purchases";
import type { EstadoCupo } from "@tekluma/shared";
import { api } from "./auth";

/** Entitlement de RevenueCat que habilita Premium (debe coincidir con la API). */
const ENTITLEMENT = "premium";

const CLAVE = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID,
});

/** Sin clave de RevenueCat (desarrollo) la pantalla de Premium solo muestra los planes. */
export const comprasDisponibles = Boolean(CLAVE);

let configurado = false;

/** Vincula las compras de la tienda con el usuario de Tekluma (mismo id que en la API). */
export async function iniciarCompras(usuarioId: string) {
  if (!CLAVE) return;
  if (!configurado) {
    Purchases.configure({ apiKey: CLAVE, appUserID: usuarioId });
    configurado = true;
  } else {
    await Purchases.logIn(usuarioId);
  }
}

export async function cerrarSesionCompras() {
  if (configurado) await Purchases.logOut().catch(() => {});
}

export type IdPlan = "semanal" | "mensual" | "anual";
export type PlanTienda = { id: IdPlan; paquete: PurchasesPackage; precio: string; conPrueba: boolean };

const POR_TIPO: Partial<Record<PACKAGE_TYPE, IdPlan>> = {
  [PACKAGE_TYPE.WEEKLY]: "semanal",
  [PACKAGE_TYPE.MONTHLY]: "mensual",
  [PACKAGE_TYPE.ANNUAL]: "anual",
};

/** Planes de la oferta actual, con el precio localizado que muestra la tienda. */
export async function obtenerPlanes(): Promise<PlanTienda[]> {
  if (!configurado) return [];
  const { current } = await Purchases.getOfferings();
  return (current?.availablePackages ?? []).flatMap((paquete) => {
    const id = POR_TIPO[paquete.packageType];
    if (!id) return [];
    return [{ id, paquete, precio: paquete.product.priceString, conPrueba: paquete.product.introPrice?.price === 0 }];
  });
}

/** Pide a la API que lea el estado en RevenueCat sin esperar al webhook. */
const sincronizar = () => api<EstadoCupo>("/cupo/premium/sincronizar", { method: "POST" });

export async function comprar(paquete: PurchasesPackage): Promise<"ok" | "cancelado"> {
  try {
    await Purchases.purchasePackage(paquete);
  } catch (e) {
    if ((e as PurchasesError).userCancelled) return "cancelado";
    throw e;
  }
  await sincronizar();
  return "ok";
}

/** Apple exige ofrecer "Restaurar compras". Devuelve si el usuario quedó con Premium. */
export async function restaurar() {
  const info = await Purchases.restorePurchases();
  await sincronizar();
  return Boolean(info.entitlements.active[ENTITLEMENT]);
}
