# Tekluma

Repaso de normas técnicas (RNE) con tarjetas y repetición espaciada para ingenieros y arquitectos.

## Estructura

```
apps/mobile     App Expo (iOS + Android): Expo Router, SQLite offline, FSRS
apps/api        API Hono → AWS Lambda; Drizzle + Neon Postgres
apps/admin      Panel editorial (Vite + React) → S3 + CloudFront
packages/shared Tipos y esquemas Zod compartidos (tarjetas, paquetes, API)
assets/brand    Logo e íconos en SVG
sst.config.ts   Infraestructura AWS (sa-east-1)
```

## Desarrollo

```bash
pnpm install
pnpm dev:mobile        # Metro; requiere development build (no Expo Go)
pnpm dev:api           # API local en http://localhost:8787 (usa apps/api/.env)
pnpm dev:admin         # Panel editorial
pnpm typecheck
```

Copia `apps/api/.env.example` a `apps/api/.env` y define `BETTER_AUTH_SECRET`. Sin `DATABASE_URL`, la API usa
una base local PGlite en `apps/api/.pglite/` (no requiere instalar Postgres); con ella, usa Neon.

```bash
pnpm db:migrate
pnpm --filter @tekluma/api db:seed   # mazos de prueba: E.030 (gratis) y E.060 (50 monedas)
```

Con PGlite, detén la API antes de migrar o sembrar: solo un proceso puede abrir la base.

Login: Better Auth con código de 6 dígitos por correo. Sin `RESEND_API_KEY` el código se imprime en la
consola de la API. Apple y Google se activan al definir sus credenciales en `.env`.

## Despliegue

```bash
npx sst secret set DatabaseUrl "postgresql://..."
pnpm sst:dev           # stage personal contra AWS real
pnpm deploy            # stage "produccion"
```
