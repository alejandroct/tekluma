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
pnpm --filter @tekluma/api db:seed   # mazos de prueba: E.030 y E.060
```

Con PGlite, detén la API antes de migrar o sembrar: solo un proceso puede abrir la base.

Login: Better Auth con código de 6 dígitos por correo. Sin `RESEND_API_KEY` el código se imprime en la
consola de la API. Apple y Google se activan al definir sus credenciales en `.env`.

## Monetización: cupo diario

- Gratis: 15 tarjetas distintas al día (30 los primeros 3 días). Repetir una tarjeta el mismo día no consume cupo.
- Anuncio con recompensa: +5 tarjetas, hasta 8 al día. En producción lo acredita AdMob llamando a
  `GET /webhooks/admob` (verificación SSV firmada); en desarrollo, la app usa `POST /cupo/anuncio-prueba`.
- Monedas: 5 monedas = 5 tarjetas extra. Intersticial al terminar sesión, máximo 2 al día.
- Premium: sin límite ni anuncios, vía RevenueCat (`POST /webhooks/revenuecat` y sincronización tras comprar).
  Pasos de configuración de App Store, RevenueCat y AdMob en [docs/configurar-pagos.md](docs/configurar-pagos.md).
- Todas las reglas se ajustan con variables `CUPO_*` (ver `apps/api/.env.example`).

## Despliegue

```bash
npx sst secret set DatabaseUrl "postgresql://..."
pnpm sst:dev           # stage personal contra AWS real
pnpm deploy            # stage "produccion"
```
