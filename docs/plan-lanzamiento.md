# Plan de lanzamiento de Tekluma

Lista viva: marca cada punto con [x] al terminarlo. Lo que dice **(tú)** lo haces tú (trámites, pagos, cuentas);
lo que dice **(código)** lo programo yo y queda en el repositorio.

Plazo realista desde hoy: **3 a 4 semanas** hasta estar publicados en las dos tiendas, si el D-U-N-S llega a tiempo.

**Titular de las cuentas:** DCC INGENIERIA Y CONSTRUCCION S.A.C. · RUC 20612731951 · domicilio fiscal Mz. B1 Lote 12,
Urb. Bello Horizonte Etapa Uno (Av. Los Rubíes, frente al Pampón), Piura. Úsalo **idéntico** en D-U-N-S, Apple, Google y el banco.
En las tiendas aparecerá como vendedor; la app se sigue llamando Tekluma.

**Sitio web de la empresa:** `https://tekluma.app/empresa` (razón social, RUC, domicilio y contacto; enlazado desde el pie de
todas las páginas). Es el que se declara a Apple, Google y D&B. Hoy está en dev; se publica en `tekluma.app` con el punto 8.

---

## Semana 1 · Trámites que tardan (empezar hoy)

### 1. Correo con el dominio de la empresa **(tú)** — 1 día
Apple pide un correo del dominio de la organización (no Gmail) y las dos tiendas piden un sitio web público.
Hoy `tekluma.app` no recibe correo (no tiene registros MX).

Tu Gmail (`dcc.ingenieria.construccion@…`) **no sirve** para Apple: tiene que ser `@tekluma.app`. Sí puede ser la cuenta
de Google con la que abras Play Console, y el correo nuevo se puede reenviar a ese Gmail.

1. Crea un buzón `hola@tekluma.app` (o con tu nombre) en Zoho Mail (plan gratuito, hasta 5 buzones) o Google Workspace (≈ US$7/mes).
2. El proveedor te dará registros MX y TXT: pásamelos y los agrego al DNS (Route 53, ya administrado por SST),
   o agrégalos tú en la consola de AWS → Route 53 → `tekluma.app`.
3. Prueba enviando un correo a esa dirección.

### 2. Número D-U-N-S **(tú)** — gratis, hasta 5 días hábiles (a veces más en Perú)
Lo necesitan **Apple y Google** para cuentas de organización.

1. Entra a la herramienta de Apple: <https://developer.apple.com/enroll/duns-lookup/>
2. Inicia sesión con tu Apple Account (la misma que usarás para el programa de desarrolladores; activa la verificación en dos pasos).
3. Busca la empresa **con la razón social exacta de SUNAT** (tal cual aparece en la ficha RUC) y la dirección fiscal.
   - Si aparece: anota el número de 9 dígitos. Ya lo tienes.
   - Si no aparece: llena el formulario «Submit your information». Datos que te piden:
     razón social, nombre comercial, dirección fiscal, teléfono de la empresa, nombre y cargo del contacto
     (el representante legal o alguien con poder), correo del dominio (paso 1) y sitio web.
4. Dun & Bradstreet te escribe al correo con el número. Si te piden documentos, envía la **ficha RUC** y la **vigencia de poder**.
5. Cuando llegue el número, espera hasta **2 días hábiles** antes de usarlo en Apple (D&B se lo tiene que pasar).

Consejo: que la razón social, la dirección y el teléfono sean idénticos en SUNAT, D-U-N-S, Apple y Google.
Las diferencias (una «S.A.C.» de más o de menos) son la causa más común de rechazo.

### 3. Cuenta corriente empresarial en dólares **(tú)** — 1 a 2 semanas
No frena la publicación, pero sin ella no puedes cobrar Premium (Apple no activa las compras) ni recibir lo de AdMob.

1. Banco: BCP, Interbank o BBVA (pregunta cuál cobra menos por recibir transferencias internacionales).
2. Lleva: ficha RUC, vigencia de poder del representante (SUNARP, reciente), DNI del representante, escritura de constitución.
3. Pide: **cuenta corriente en dólares**, el **código SWIFT** del banco y tu número de cuenta / CCI.
4. La cuenta debe estar **a nombre de la empresa** (igual que las cuentas de desarrollador).

### 4. Contador **(tú)**
Pregúntale también si conviene agregar en la SUNAT una actividad económica secundaria de software o servicios digitales
(hoy la única es 7110, arquitectura e ingeniería), porque los ingresos de la app vienen de ahí. Pregúntale por: cómo facturar/declarar los pagos de Apple, Google y AdMob (vienen del exterior), y el formulario fiscal
de EE. UU. que piden las tiendas (W-8BEN-E para la empresa). Perú no tiene convenio de doble imposición con EE. UU.

---

## Semana 1–2 · Cuentas de desarrollador

### 5. Apple Developer Program (organización) **(tú)** — US$99 al año
Requisitos: D-U-N-S, correo del dominio, sitio web público (`tekluma.app`, ver punto 8) y ser el representante legal
o tener autoridad para firmar por la empresa.

1. Entra a <https://developer.apple.com/programs/enroll/> (o desde la app «Apple Developer» en tu iPhone, que es más rápido).
2. «Start Your Enrollment» → tipo de entidad **Company / Organization**.
3. Llena: razón social (igual que en D-U-N-S), número D-U-N-S, sitio web, correo del dominio, teléfono.
4. Apple puede **llamarte** para confirmar que tienes autoridad. Contesta (llaman desde EE. UU. o Irlanda).
5. Paga los US$99 con tarjeta.
6. Verificación: normalmente de 2 a 7 días.
7. Ya dentro, en App Store Connect:
   - **Business → Agreements**: acepta el acuerdo de apps de pago (Paid Apps). Ahí cargas la cuenta bancaria (punto 3)
     y el formulario fiscal W-8BEN-E.
   - Inscríbete en el **App Store Small Business Program** (comisión de 15 % en vez de 30 %):
     <https://developer.apple.com/app-store/small-business-program/>
   - Invítame como usuario con rol **App Manager** o **Developer** si quieres que suba las versiones.

### 6. Google Play Console (organización) **(tú)** — US$25, pago único
Las cuentas **de organización** no tienen la prueba obligatoria de 14 días con 12 testers que sí tienen las personales nuevas
(<https://support.google.com/googleplay/android-developer/answer/14151465>).

1. Entra a <https://play.google.com/console/signup> con una cuenta de Google (puede ser la del correo del dominio).
2. Elige **«Una organización o empresa»**.
3. Crea el **perfil de pagos de Google** como organización: razón social, dirección fiscal, D-U-N-S.
4. Datos de contacto: correo y teléfono (los verifican con un código).
5. Paga los US$25.
6. Google verifica la organización (puede pedir documentos: ficha RUC). Unos días.
7. Configura el **perfil de comerciante** (para cobrar Premium) con la cuenta bancaria del punto 3.
8. Invítame en **Usuarios y permisos** si quieres que suba las versiones.

### 7. AdMob y RevenueCat **(tú, 30 min)** → **(código)**
1. Crea la cuenta en <https://admob.google.com> como la empresa; registra la app de iOS y la de Android.
2. Crea las unidades de anuncio (intersticial y la recompensada) y **pásame los ID** (no son secretos): reemplazo los ID de prueba
   que hoy están en `apps/mobile/app.json` y en el código.
3. En App Store Connect y Play Console crea los productos de suscripción Premium (mensual y anual) y conéctalos en RevenueCat
   (ver `docs/configurar-pagos.md`).

---

## Semana 2–3 · Producto (lo programo yo)

- [x] Eliminar cuenta desde la app (Perfil → «Eliminar mi cuenta»; Apple lo exige). Ya existe.
- [x] Privacidad y términos con los datos de la empresa (`/privacidad`, `/terminos`) y página `/empresa`.
- [ ] **(tú)** Inscribir el banco de datos «Usuarios de Tekluma» ante la Autoridad Nacional de Protección de Datos Personales (Ley 29733)
      y pasarme el código para ponerlo en la política de privacidad.
- [ ] **(código)** Libro de Reclamaciones virtual (obligatorio para vender a consumidores en Perú): formulario en la web que guarda
      el reclamo y envía copia al usuario y a `hola@tekluma.app`.
- [ ] **(código)** Recordatorio diario de la pregunta del día (notificación local; el usuario elige la hora y puede apagarlo).
- [ ] **(código)** Métricas propias del embudo (instala → primera tarjeta → vuelve al día siguiente → Premium), sin terceros.
- [ ] **(código)** Registro de errores con Sentry (queda listo; se activa cuando crees el proyecto y me pases el DSN, que no es secreto).
- [ ] **(código)** Una página web por artículo de la norma (`/normas/e060/21.6.4/`) para que Google las indexe: es el canal gratuito de usuarios.
- [ ] **(código)** Configuración de compilación con EAS (`eas.json`), íconos y pantallas de arranque finales, número de versión.
- [ ] **(código)** Textos de las tiendas (nombre, subtítulo, descripción, palabras clave) y capturas desde el simulador.

### 8. Producción **(tú da el visto bueno)**
- Desplegar el stage `produccion` (dominio raíz `tekluma.app`, API `api.tekluma.app`) con sus propios secretos
  (los cargas tú con `sst secret set … --stage produccion`) y su base de datos de Neon.
- Importar los mazos de la E.060 en producción y publicarlos desde el panel.
- Apuntar la app de las tiendas a `https://api.tekluma.app`.

---

## Semana 3–4 · Beta y publicación

1. **Beta cerrada** con 20–50 ingenieros: TestFlight (iOS) y prueba interna/cerrada (Android). Una semana.
2. Corregir lo que salga de la beta.
3. Enviar a revisión: Apple suele tardar 24–48 h; Google, para una app nueva, de unos días a una semana.
4. Lanzamiento: publicar el mismo día en grupos de ingenieros, CIP, universidades; el lector web como puerta de entrada.

---

## Cronograma resumido

| Semana | Tú | Código |
|---|---|---|
| 1 | Correo del dominio, D-U-N-S, cuenta bancaria, contador | Recordatorios, métricas, Sentry |
| 2 | Apple y Google (cuando llegue el D-U-N-S), AdMob | Páginas por artículo, EAS, textos de tienda |
| 3 | Productos Premium, producción, invitar beta | Builds de beta, correcciones |
| 4 | Revisión de tiendas | Correcciones finales, lanzamiento |
