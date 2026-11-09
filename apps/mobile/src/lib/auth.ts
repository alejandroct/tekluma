import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

/** En el simulador la API local es accesible por localhost. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

export const authClient = createAuthClient({
  baseURL: `${API_URL}/auth`,
  plugins: [
    // Guarda la sesión en el llavero del dispositivo (Keychain / Keystore).
    expoClient({ scheme: "tekluma", storagePrefix: "tekluma", storage: SecureStore }),
    emailOTPClient(),
    // Must match `user.additionalFields` in apps/api/src/auth.ts.
    inferAdditionalFields({ user: { profession: { type: "string", required: false } } }),
  ],
});

/** fetch a la API con la sesión del usuario adjunta; devuelve la respuesta tal cual. */
export async function solicitar(ruta: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: await authClient.getCookie(), ...init.headers },
  });
}

/** Como `solicitar`, pero lanza si la respuesta no es 2xx y devuelve el JSON. */
export async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await solicitar(ruta, init);
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${ruta} → ${res.status}`);
  return res.json() as Promise<T>;
}
