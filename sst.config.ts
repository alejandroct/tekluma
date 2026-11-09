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

    // Secretos: `npx sst secret set <Nombre> "<valor>" --stage <stage>`.
    // Los que tienen placeholder "" son opcionales; vacío equivale a "no configurado".
    const secretos = {
      DATABASE_URL: new sst.Secret("DatabaseUrl"),
      BETTER_AUTH_SECRET: new sst.Secret("BetterAuthSecret"),
      RESEND_API_KEY: new sst.Secret("ResendApiKey", ""),
      CORREO_REMITENTE: new sst.Secret("CorreoRemitente", "Tekluma <hola@tekluma.app>"),
      REVENUECAT_SECRET_KEY: new sst.Secret("RevenueCatSecretKey", ""),
      REVENUECAT_WEBHOOK_SECRET: new sst.Secret("RevenueCatWebhookSecret", ""),
    };
    const environment = {
      // Fuera de producción quedan habilitadas las rutas de prueba (p. ej. /cupo/anuncio-prueba).
      NODE_ENV: produccion ? "production" : "development",
      ...Object.fromEntries(Object.entries(secretos).map(([clave, secreto]) => [clave, secreto.value])),
    };

    const nodejs = {
      // PGlite es solo para desarrollo local; en Lambda siempre hay DATABASE_URL.
      esbuild: { external: ["@electric-sql/pglite", "drizzle-orm/pglite"] },
    };

    // Paquetes de mazos e imágenes (se servirán vía CloudFront con URL firmada).
    const mazos = new sst.aws.Bucket("Mazos");

    // Al publicar un mazo: empaquetar, subir a S3 y avisar por push.
    const publicaciones = new sst.aws.Queue("Publicaciones");
    publicaciones.subscribe({
      handler: "apps/api/src/workers/publicar.handler",
      link: [mazos],
      architecture: "arm64",
      timeout: "2 minutes",
      environment,
      nodejs,
    });

    const api = new sst.aws.Function("Api", {
      handler: "apps/api/src/index.handler",
      architecture: "arm64",
      memory: "1024 MB",
      timeout: "20 seconds",
      url: true,
      link: [mazos, publicaciones],
      environment,
      nodejs,
    });

    const admin = new sst.aws.StaticSite("Admin", {
      path: "apps/admin",
      build: { command: "pnpm build", output: "dist" },
      environment: { VITE_API_URL: api.url },
    });

    return { api: api.url, admin: admin.url };
  },
});
