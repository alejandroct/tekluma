/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "tekluma",
      home: "aws",
      removal: input?.stage === "produccion" ? "retain" : "remove",
      protect: input?.stage === "produccion",
      providers: { aws: { region: "sa-east-1" } },
    };
  },
  async run() {
    // Cadena de conexión de Neon: `npx sst secret set DatabaseUrl "postgresql://..."`
    const databaseUrl = new sst.Secret("DatabaseUrl");

    // Paquetes de mazos e imágenes; solo se sirven vía CloudFront con URL firmada.
    const mazos = new sst.aws.Bucket("Mazos");

    // Al publicar un mazo: empaquetar, subir a S3 y avisar por push.
    const publicaciones = new sst.aws.Queue("Publicaciones");
    publicaciones.subscribe({
      handler: "apps/api/src/workers/publicar.handler",
      link: [mazos, databaseUrl],
      architecture: "arm64",
      timeout: "2 minutes",
    });

    const api = new sst.aws.Function("Api", {
      handler: "apps/api/src/index.handler",
      architecture: "arm64",
      url: true,
      link: [mazos, publicaciones, databaseUrl],
      environment: { NODE_ENV: $app.stage === "produccion" ? "production" : "development" },
    });

    const admin = new sst.aws.StaticSite("Admin", {
      path: "apps/admin",
      build: { command: "pnpm build", output: "dist" },
      environment: { VITE_API_URL: api.url },
    });

    return { api: api.url, admin: admin.url };
  },
});
