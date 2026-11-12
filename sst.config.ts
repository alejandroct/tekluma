/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "tekluma",
      home: "aws",
      removal: input?.stage === "produccion" ? "retain" : "remove",
      protect: input?.stage === "produccion",
      // Perfil propio para no mezclar credenciales con otros proyectos de la misma cuenta.
      // Cloudflare: solo para el DNS de dccingenieriayconstruccion.com (registrado allí; el sitio sigue en AWS).
      // Necesita CLOUDFLARE_API_TOKEN y CLOUDFLARE_DEFAULT_ACCOUNT_ID en el entorno (.env, no versionado).
      providers: {
        aws: { region: "sa-east-1", profile: process.env.CI ? undefined : "tekluma" },
        cloudflare: "6.24.0",
      },
    };
  },
  async run() {
    const produccion = $app.stage === "produccion";

    // Producción usa el dominio raíz; cada stage, su subdominio (una identidad de SES no se puede repetir).
    const dominio = produccion ? "tekluma.app" : `${$app.stage}.tekluma.app`;
    const dns = sst.aws.dns();

    // Rebotes y quejas de SES: AWS suspende cuentas con tasas altas, así que cada uno llega como aviso
    // legible a hola@ (ver workers/avisos-correo.ts). El suscriptor se agrega más abajo, con el entorno.
    const avisosCorreo = new sst.aws.SnsTopic("AvisosCorreo");

    // Correos transaccionales (códigos de login) con SES; SST crea los registros DKIM en Route 53.
    const correo = new sst.aws.Email("Correo", {
      sender: dominio,
      dns,
      dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;",
      events: [{ name: "RebotesYQuejas", types: ["bounce", "complaint"], topic: avisosCorreo.arn }],
    });

    // Secretos: `npx sst secret set <Nombre> "<valor>" --stage <stage>`.
    // Los que tienen placeholder "" son opcionales; vacío equivale a "no configurado".
    const secretos = {
      DATABASE_URL: new sst.Secret("DatabaseUrl"),
      BETTER_AUTH_SECRET: new sst.Secret("BetterAuthSecret"),
      REVENUECAT_SECRET_KEY: new sst.Secret("RevenueCatSecretKey", ""),
      REVENUECAT_WEBHOOK_SECRET: new sst.Secret("RevenueCatWebhookSecret", ""),
      // Emails (comma-separated) promoted to admin of the editorial panel on first access.
      ADMIN_EMAILS: new sst.Secret("AdminEmails", ""),
    };
    const environment = {
      // Fuera de producción quedan habilitadas las rutas de prueba (p. ej. /cupo/anuncio-prueba).
      NODE_ENV: produccion ? "production" : "development",
      BETTER_AUTH_URL: `https://api.${dominio}`,
      CORREO_PROVEEDOR: "ses",
      ADMIN_URL: `https://admin.${dominio}`,
      WEB_URL: `https://${dominio}`,
      COOKIE_DOMAIN: dominio,
      CORREO_REMITENTE: `Tekluma <hola@${dominio}>`,
      ...Object.fromEntries(Object.entries(secretos).map(([clave, secreto]) => [clave, secreto.value])),
    };

    // Node 22 trae WebSocket global, que necesita el driver de Neon (en Node 20 la conexión falla).
    const runtime = "nodejs22.x" as const;
    const nodejs = {
      // PGlite es solo para desarrollo local; en Lambda siempre hay DATABASE_URL.
      esbuild: { external: ["@electric-sql/pglite", "drizzle-orm/pglite"] },
    };

    // Applies migrations on every deploy (and the demo content outside production).
    const migrador = new sst.aws.Function("Migrador", {
      handler: "apps/api/src/workers/migrar.handler",
      architecture: "arm64",
      runtime,
      timeout: "5 minutes",
      environment,
      nodejs,
      copyFiles: [{ from: "apps/api/drizzle", to: "drizzle" }],
    });
    new aws.lambda.Invocation("Migrar", {
      functionName: migrador.name,
      input: JSON.stringify({}),
      triggers: { despliegue: Date.now().toString() },
    });

    avisosCorreo.subscribe("AvisoCorreo", {
      handler: "apps/api/src/workers/avisos-correo.handler",
      link: [correo],
      architecture: "arm64",
      runtime,
      environment,
      nodejs,
    });

    // Paquetes de mazos e imágenes (se servirán vía CloudFront con URL firmada).
    const mazos = new sst.aws.Bucket("Mazos");

    // Al publicar un mazo: empaquetar, subir a S3 y avisar por push.
    // AWS exige que la visibilidad del mensaje sea mayor que el timeout del consumidor (2 min).
    const publicaciones = new sst.aws.Queue("Publicaciones", { visibilityTimeout: "3 minutes" });
    publicaciones.subscribe({
      handler: "apps/api/src/workers/publicar.handler",
      link: [mazos],
      architecture: "arm64",
      runtime,
      timeout: "2 minutes",
      environment,
      nodejs,
    });

    const api = new sst.aws.Function("Api", {
      handler: "apps/api/src/index.handler",
      architecture: "arm64",
      runtime,
      memory: "1024 MB",
      timeout: "20 seconds",
      // CORS lo maneja Hono (orígenes del panel con cookies); el de la Lambda URL pondría "*".
      url: { cors: false },
      link: [mazos, publicaciones, correo],
      environment,
      nodejs,
    });

    // Dominio propio para la API (CloudFront delante de la URL de la Lambda).
    const router = new sst.aws.Router("ApiRouter", { domain: { name: `api.${dominio}`, dns } });
    router.route("/", api.url);

    const admin = new sst.aws.StaticSite("Admin", {
      path: "apps/admin",
      domain: { name: `admin.${dominio}`, dns },
      build: { command: "pnpm build", output: "dist" },
      environment: { VITE_API_URL: router.url },
      assets: {
        fileOptions: [
          // Vite pone hash en el nombre de lo que está en assets/: se puede guardar para siempre.
          { files: "**", cacheControl: "public,max-age=0,must-revalidate" },
          { files: "assets/**", cacheControl: "max-age=31536000,public,immutable" },
          { files: "**/*.html", cacheControl: "max-age=0,no-cache,no-store,must-revalidate" },
        ],
      },
    });

    // Landing y páginas legales (/terminos, /privacidad), enlazadas desde la app y las tiendas.
    // Sin build ni hashes en los nombres: el navegador revalida en cada visita (304 si no cambió),
    // para que un rediseño nunca quede con estilos viejos en caché.
    const web = new sst.aws.StaticSite("Web", {
      path: "apps/web",
      domain: { name: dominio, dns },
      assets: {
        fileOptions: [
          { files: "**", cacheControl: "public,max-age=0,must-revalidate" },
          { files: "**/*.html", cacheControl: "max-age=0,no-cache,no-store,must-revalidate" },
        ],
      },
    });

    // Sitio institucional de la empresa titular (DCC). Su dominio está registrado en Cloudflare, que obliga
    // a usar su DNS: SST crea allí la validación del certificado y el registro hacia CloudFront.
    // Un dominio solo puede estar en una distribución de CloudFront, así que lo sirve un único stage.
    // Mientras producción no exista lo sirve dev; para pasarlo, cambiar a "produccion", desplegar dev
    // (libera el dominio) y luego producción.
    const STAGE_DOMINIO_EMPRESA = "dev";
    const sitioEmpresa = new sst.aws.StaticSite("SitioEmpresa", {
      path: "apps/dcc",
      domain:
        $app.stage === STAGE_DOMINIO_EMPRESA
          ? {
              name: "dccingenieriayconstruccion.com",
              redirects: ["www.dccingenieriayconstruccion.com"],
              dns: sst.cloudflare.dns(),
            }
          : { name: `dcc.${dominio}`, dns },
      errorPage: "404.html",
      assets: {
        fileOptions: [
          { files: "**", cacheControl: "public,max-age=0,must-revalidate" },
          { files: "**/*.html", cacheControl: "max-age=0,no-cache,no-store,must-revalidate" },
        ],
      },
    });

    return {
      web: web.url,
      api: router.url,
      admin: admin.url,
      empresa: sitioEmpresa.url,
      lambda: api.url,
      remitente: correo.sender,
    };
  },
});
