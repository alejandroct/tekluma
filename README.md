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

Base de datos (Neon): copia `apps/api/.env.example` a `apps/api/.env`, y luego:

```bash
pnpm db:migrate
```

## Despliegue

```bash
npx sst secret set DatabaseUrl "postgresql://..."
pnpm sst:dev           # stage personal contra AWS real
pnpm deploy            # stage "produccion"
```
