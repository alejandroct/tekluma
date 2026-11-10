import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

/**
 * Cifrado en reposo de los mazos descargados (AES-256-GCM).
 * La clave se genera en el dispositivo y vive en el Keychain / Keystore, sin salir en copias de
 * seguridad ni pasar a otro equipo; al cerrar sesión se borra y lo que quede en disco es ilegible.
 */
const NOMBRE_CLAVE = "tekluma_clave_mazos";
const OPCIONES: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

let clave: Promise<AESEncryptionKey> | null = null;

function obtenerClave() {
  clave ??= (async () => {
    const guardada = await SecureStore.getItemAsync(NOMBRE_CLAVE, OPCIONES);
    if (guardada) return AESEncryptionKey.import(guardada, "base64");
    const nueva = await AESEncryptionKey.generate(AESKeySize.AES256);
    await SecureStore.setItemAsync(NOMBRE_CLAVE, await nueva.encoded("base64"), OPCIONES);
    return nueva;
  })().catch((e) => {
    clave = null;
    throw e;
  });
  return clave;
}

const aBytes = (texto: string) => new TextEncoder().encode(texto);
const aTexto = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** Cifra `texto` ligándolo a `contexto` (p. ej. el id del mazo): no se puede mover a otra fila. */
export async function cifrar(texto: string, contexto: string): Promise<string> {
  const sellado = await aesEncryptAsync(aBytes(texto), await obtenerClave(), { additionalData: aBytes(contexto) });
  return sellado.combined("base64");
}

/** Lanza si la clave no corresponde o el contenido fue alterado. */
export async function descifrar(cifrado: string, contexto: string): Promise<string> {
  const bytes = await aesDecryptAsync(AESSealedData.fromCombined(cifrado), await obtenerClave(), { additionalData: aBytes(contexto) });
  return aTexto(bytes);
}

export async function borrarClave() {
  clave = null;
  await SecureStore.deleteItemAsync(NOMBRE_CLAVE, OPCIONES);
}
