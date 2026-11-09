/**
 * Verificación del lado del servidor (SSV) de los anuncios con recompensa de AdMob.
 * https://developers.google.com/admob/android/ssv
 *
 * AdMob llama a nuestra URL con la recompensa en el query string, firmada con ECDSA P-256.
 * Se firma todo lo que va antes de `&signature=`; la clave se identifica con `key_id`.
 */
const URL_CLAVES = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const VIGENCIA_CLAVES_MS = 24 * 60 * 60 * 1000;

let cache: { expira: number; claves: Map<string, CryptoKey> } | null = null;

async function obtenerClaves() {
  if (cache && cache.expira > Date.now()) return cache.claves;
  const res = await fetch(URL_CLAVES);
  if (!res.ok) throw new Error(`No se pudieron obtener las claves de AdMob (${res.status})`);
  const { keys } = (await res.json()) as { keys: { keyId: number; base64: string }[] };
  const claves = new Map<string, CryptoKey>();
  for (const k of keys) {
    const spki = Buffer.from(k.base64, "base64");
    claves.set(String(k.keyId), await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]));
  }
  cache = { expira: Date.now() + VIGENCIA_CLAVES_MS, claves };
  return claves;
}

/** AdMob firma en DER (SEQUENCE de dos INTEGER); WebCrypto espera r||s de 32 bytes cada uno. */
function derARaw(der: Uint8Array): Uint8Array<ArrayBuffer> {
  let i = 2; // 0x30 + longitud
  const leerEntero = () => {
    if (der[i++] !== 0x02) throw new Error("Firma DER inválida");
    const largo = der[i++]!;
    let entero = der.slice(i, i + largo);
    i += largo;
    while (entero.length > 32 && entero[0] === 0) entero = entero.slice(1);
    const relleno = new Uint8Array(32);
    relleno.set(entero, 32 - entero.length);
    return relleno;
  };
  const r = leerEntero();
  const s = leerEntero();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

/** Devuelve los parámetros de la recompensa si la firma es válida; si no, null. */
export async function verificarRecompensa(queryString: string): Promise<URLSearchParams | null> {
  const corte = queryString.indexOf("&signature=");
  if (corte < 0) return null;
  const params = new URLSearchParams(queryString);
  const firma = params.get("signature");
  const claveId = params.get("key_id");
  if (!firma || !claveId) return null;

  const clave = (await obtenerClaves()).get(claveId);
  if (!clave) return null;

  const valida = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    clave,
    derARaw(new Uint8Array(Buffer.from(firma, "base64url"))),
    new TextEncoder().encode(queryString.slice(0, corte)),
  );
  return valida ? params : null;
}
