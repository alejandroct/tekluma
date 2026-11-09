/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "tekluma",
      home: "aws",
      removal: input?.stage === "produccion" ? "retain" : "remove",
      protect: input?.stage === "produccion",
      // Perfil propio para no mezclar credenciales con otros proyectos de la misma cuenta.
      providers: { aws: { region: "sa-east-1", profile: process.env.CI ? undefined : "tekluma" } },
    };
  },
  async run() {
    const produccion = $app.stage === "produccion";

    // Producción usa el dominio raíz; cada stage, su subdominio (una identidad de SES no se puede repetir).
    const dominio = produccion ? "tekluma.app" : `${$app.stage}.tekluma.app`;
    const dns = sst.aws.dns();

    // Correos transaccionales (códigos de login) con SES; SST crea los registros DKIM en Route 53.
    const correo = new sst.aws.Email("Correo", {
      sender: dominio,
      dns,
      dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;",
    });

    // Secretos: `npx sst secret set <Nombre> "<valor>" --stage <stage>`.
    // Los que tienen placeholder "" son opcionales; vacío equivale a "no configurado".
    const secretos = {
      DATABASE_URL: new sst.Secret("DatabaseUrl"),
      BETTER_AUTH_SECRET: new sst.Secret("BetterAuthSecret"),
      REVENUECAT_SECRET_KEY: new sst.Secret("RevenueCatSecretKey", ""),
      REVENUECAT_WEBHOOK_SECRET: new sst.Secret("RevenueCatWebhookSecret", ""),
    };
    const environment = {
      // Fuera de producción quedan habilitadas las rutas de prueba (p. ej. /cupo/anuncio-prueba).
      NODE_ENV: produccion ? "production" : "development",
      BETTER_AUTH_URL: `https://api.${dominio}`,
      CORREO_PROVEEDOR: "ses",
      ADMIN_URL: `https://admin.${dominio}`,
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
      environment: { ...environment, SEMBRAR: produccion ? "0" : "1" },
      nodejs,
      copyFiles: [{ from: "apps/api/drizzle", to: "drizzle" }],
    });
    new aws.lambda.Invocation("Migrar", {
      functionName: migrador.name,
      input: JSON.stringify({}),
      triggers: { despliegue: Date.now().toString() },
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
      url: true,
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
    });

    return { api: router.url, admin: admin.url, lambda: api.url, remitente: correo.sender };
  },
});
