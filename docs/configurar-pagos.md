# Configurar pagos (RevenueCat + App Store) y anuncios (AdMob)

El código ya está listo; estos pasos son de cuentas y paneles externos. En desarrollo, sin claves, la app
muestra los planes con precios de referencia y usa anuncios de prueba de Google.

## 1. App Store Connect

1. Inscríbete en el **Apple Developer Program** y acepta el **Paid Applications Agreement**
   (Business → Agreements), con datos bancarios y fiscales. Sin esto no se pueden vender suscripciones.
2. Crea la app con el bundle id `app.tekluma`.
3. En **Monetización → Suscripciones**, crea un grupo `Tekluma Premium` con tres productos:

   | Product ID | Duración | Precio sugerido (Perú) | Oferta introductoria |
   |---|---|---|---|
   | `tekluma_premium_semanal` | 1 semana | S/ 6.90 | — |
   | `tekluma_premium_mensual` | 1 mes | S/ 19.90 | Prueba gratis de 1 semana |
   | `tekluma_premium_anual` | 1 año | S/ 149 | — |

4. Crea una **clave de In-App Purchase** (Users and Access → Integrations → In-App Purchase) para RevenueCat.

## 2. RevenueCat

1. Crea el proyecto y añade la app iOS (bundle `app.tekluma`) con la clave de In-App Purchase del paso anterior.
2. **Entitlement**: identificador `premium`, con los tres productos asignados.
3. **Offering** `default` (marcada como actual) con los paquetes predefinidos:
   `$rc_weekly` → semanal, `$rc_monthly` → mensual, `$rc_annual` → anual.
4. **Webhook** (Integrations → Webhooks):
   - URL: `https://<api>/webhooks/revenuecat`
   - Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>`
5. Claves:
   - App: `EXPO_PUBLIC_REVENUECAT_IOS=appl_...` (clave pública del SDK) en `apps/mobile/.env`.
   - API: `REVENUECAT_SECRET_KEY=sk_...` y `REVENUECAT_WEBHOOK_SECRET=...` en `apps/api/.env`
     (en AWS: `npx sst secret set ...`).

El id de usuario en RevenueCat es el mismo que en la API (`usuarios.id`), así que el webhook sabe a quién
activar Premium. Tras comprar o restaurar, la app pide a la API que consulte RevenueCat de inmediato.

**Probar compras:** usa una cuenta **Sandbox** (App Store Connect → Users and Access → Sandbox) en un
iPhone físico o en el simulador. En sandbox una suscripción mensual dura ~5 minutos.

## 3. Páginas legales

Apple exige enlaces a **Términos de uso** y **Política de privacidad** en la pantalla de suscripción.
La app apunta a `https://tekluma.app/terminos` y `https://tekluma.app/privacidad`: hay que publicarlas.

## 4. AdMob

1. Crea la app en AdMob y dos bloques: **Con recompensa** e **Intersticial**.
2. En el bloque con recompensa activa **Verificación del lado del servidor** con la URL
   `https://<api>/webhooks/admob`.
3. Reemplaza en `apps/mobile/app.json` los App IDs de prueba (`ca-app-pub-3940256099942544~...`) por los tuyos,
   y define en `apps/mobile/.env`:
   `EXPO_PUBLIC_ADMOB_RECOMPENSA_IOS` y `EXPO_PUBLIC_ADMOB_INTERSTICIAL_IOS`.
4. Recompila la app (`pnpm --filter @tekluma/mobile ios`).
