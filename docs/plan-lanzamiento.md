# Plan de lanzamiento de Tekluma

Lista viva: marca cada punto con [x] al terminarlo. Lo que dice **(tú)** lo haces tú (trámites, pagos, cuentas);
lo que dice **(código)** lo programo yo y queda en el repositorio.

Plazo realista desde hoy: **3 a 4 semanas** hasta estar publicados en las dos tiendas, si el D-U-N-S llega a tiempo.

**Titular de las cuentas:** DCC INGENIERIA Y CONSTRUCCION S.A.C. · RUC 20612731951 · domicilio fiscal Mz. B1 Lote 12,
Urb. Bello Horizonte Etapa Uno (Av. Los Rubíes, frente al Pampón), Piura. Úsalo **idéntico** en D-U-N-S, Apple, Google y el banco.
En las tiendas aparecerá como vendedor; la app se sigue llamando Tekluma.

**Sitio web de la empresa:** `https://dccingenieriayconstruccion.com` (publicado; código en `apps/dcc`). Es el que se
declara a D&B, Apple y Google, con un correo de ese dominio. El dominio está registrado en Cloudflare y su DNS se queda allí:
SST crea los registros con el token de `.env` (`CLOUDFLARE_API_TOKEN`, no versionado). `tekluma.app` queda como sitio del
producto (app, normas, soporte) y su página `/empresa` nombra a DCC como titular.

---

## Semana 1 · Trámites que tardan (empezar hoy)

### 1. Dominio y correo de la empresa **(tú)** — 1 día
Apple pide un correo del dominio de la organización (no Gmail) y las dos tiendas piden un sitio web público.

1. [x] Dominio `dccingenieriayconstruccion.com` comprado en Cloudflare y sitio publicado.
2. [x] Google Workspace con `dccingenieriayconstruccion.com` como dominio principal (MX, SPF, DKIM y DMARC en Cloudflare).
3. `tekluma.app` como dominio secundario de Workspace. Sus registros van en Route 53 y se cargan a mano
   (no con SST: son de todo el dominio, no de un stage):
   - [x] MX `1 smtp.google.com` y SPF `v=spf1 include:_spf.google.com include:amazonses.com ~all`;
   - [x] TXT de verificación de Google (va en el mismo conjunto TXT de la raíz que el SPF);
   - [x] DKIM `google._domainkey`. Es obligatorio: el DMARC de producción (`adkim=s; aspf=s`) rechaza lo que salga
     de `hola@tekluma.app` sin firma DKIM del propio dominio.
4. Alias del usuario principal: `contacto@dccingenieriayconstruccion.com`, `hola@tekluma.app` y `soporte@tekluma.app`.
5. Prueba enviando un correo a cada dirección desde otra cuenta.

### 2. Número D-U-N-S **(tú)** — gratis, hasta 5 días hábiles (a veces más en Perú)

- [x] **Solicitado el 12/11/2026** por la gerente general (Cinthia Chira Oliva) con su Apple Account corporativa.
  Esperar el correo de Dun & Bradstreet; cuando llegue el número, esperar 2 días hábiles y pasar a Apple y Google.
Lo necesitan **Apple y Google** para cuentas de organización.

1. Entra a la herramienta de Apple: <https://developer.apple.com/enroll/duns-lookup/>
2. Inicia sesión con tu Apple Account (la misma que usarás para el programa de desarrolladores; activa la verificación en dos pasos).
3. Busca la empresa **con la razón social exacta de SUNAT** (tal cual aparece en la ficha RUC) y la dirección fiscal.
   - Si aparece: anota el número de 9 dígitos. Ya lo tienes.
   - Si no aparece: llena el formulario «Submit your information». Datos que te piden:
     razón social, nombre comercial, dirección fiscal, teléfono de la empresa, nombre y cargo del contacto
     (la representante legal o alguien con poder), correo del dominio (paso 1) y sitio web `dccingenieriayconstruccion.com`.
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
Requisitos: D-U-N-S, correo del dominio, sitio web público (`dccingenieriayconstruccion.com`) y ser la representante legal
o tener autoridad para firmar por la empresa. Si la cuenta la abres tú y no ella, Apple puede pedir que la representante
confirme por teléfono o correo que tienes esa autoridad: tenla al tanto.

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
- [x] **(código)** Libro de Reclamaciones virtual: formulario en `/reclamaciones` (enlazado en el pie de la web y en Perfil de la app),
      hoja con número correlativo, constancia por correo al consumidor y copia a `hola@tekluma.app`, plazo de 15 días hábiles,
      y vista «Reclamos» en el panel (solo administradores) para responder.
- [x] **(código)** Recordatorio diario de la pregunta del día (notificación local; el usuario elige la hora y puede apagarlo),
      con tutorial de inicio de 4 pantallas antes del login.
- [x] **(código)** Consentimiento de anuncios de Google (UMP) y permiso de rastreo de iOS (ATT) antes del primer anuncio;
      enlace «Privacidad de los anuncios» en Perfil donde la ley lo exige. Manifiesto de privacidad de iOS.
- [ ] **(tú)** En AdMob → **Privacidad y mensajes**: crear el mensaje de **GDPR** y el **mensaje explicativo de IDFA** (iOS),
      en español. Sin ellos la app usa los textos de prueba de Google.
- [x] **(código)** Embudo de activación propio, sin terceros (abre la app → tutorial → código → sesión → perfil → primera tarjeta →
      10 tarjetas el primer día → vuelve al día siguiente → ve Premium → compra), en el panel → Métricas.
- [x] **(código)** Registro de errores con Sentry en la app y en la API, sin datos personales (solo el id interno del usuario).
      Declarado en `/privacidad` y en `docs/fichas-tiendas.md`.
- [ ] **(tú)** Crear la cuenta gratuita en <https://sentry.io> (región EE. UU.) con dos proyectos: `tekluma-app` (React Native)
      y `tekluma-api` (Node.js). En cada proyecto → Settings → Security & Privacy, activar **«Prevent Storing of IP Addresses»**.
      Hecho: proyectos creados, privacidad configurada, `SentryDsn` cargado en producción y el DSN de la app en `eas.json`.
- [ ] **(tú)** Cuando exista la cuenta de Expo: crear en Sentry un token (Settings → Developer Settings → Organization Tokens)
      y cargarlo en EAS como variable secreta `SENTRY_AUTH_TOKEN`, para ver el código original en los errores de la app.
- [ ] **(código)** Una página web por artículo de la norma (`/normas/e060/21.6.4/`) para que Google las indexe: es el canal gratuito de usuarios.
- [x] **(código)** Configuración de compilación con EAS (`apps/mobile/eas.json`: perfiles development, preview y production;
      el número de compilación lo lleva EAS y sube solo). Íconos y splash ya están.
- [ ] **(tú)** Crear una cuenta en <https://expo.dev> (a nombre de la empresa) y, en `apps/mobile`, correr `npx eas-cli@latest login`
      y `npx eas-cli@latest init` para vincular el proyecto. Luego cargar en EAS las variables `EXPO_PUBLIC_ADMOB_*`
      y `EXPO_PUBLIC_REVENUECAT_*` del perfil production, y los ID de app de AdMob en `app.json`.
- [x] **(código)** Textos de las tiendas (nombre, subtítulo, descripción, palabras clave) y capturas desde el simulador
      (`docs/fichas-tiendas.md` y `docs/tiendas/`).

### 8. Producción **(tú da el visto bueno)**
- [x] **Desplegado el 12/11/2026**: `tekluma.app`, `api.tekluma.app`, `admin.tekluma.app`; migraciones aplicadas y SES con `tekluma.app`
  verificado (DKIM correcto). Falta: acceso de producción de SES (sigue en sandbox) e importar y publicar los mazos.
- Desplegar el stage `produccion` (dominio raíz `tekluma.app`, API `api.tekluma.app` y el sitio de la empresa en
  `dccingenieriayconstruccion.com`, que necesita el dominio ya comprado) con sus propios secretos
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
| 1 | Dominio y correo de la empresa, D-U-N-S, cuenta bancaria, contador | Recordatorios, métricas, Sentry |
| 2 | Apple y Google (cuando llegue el D-U-N-S), AdMob | Páginas por artículo, EAS, textos de tienda |
| 3 | Productos Premium, producción, invitar beta | Builds de beta, correcciones |
| 4 | Revisión de tiendas | Correcciones finales, lanzamiento |
