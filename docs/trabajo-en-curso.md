# Trabajo en curso

Lista viva de lo pendiente, para retomar en otra sesión sin depender de la conversación.
Al terminar un punto, márcalo con [x], haz commit y push a `main`.

## Pulido visual de la app (estilo «plano técnico», igual que la web)

Reglas ya aplicadas en Hoy, Mazos, Monedas, Liga, Perfil, Premium y Repaso:
- Datos (códigos de norma, cifras, precios, rótulos en mayúsculas) con `MONO` / `MONO_FUERTE` de `src/lib/tema.ts` (IBM Plex Mono).
- Botón principal: `t.primario` con texto `t.sobrePrimario`. Sobre bloques navy: borde `rgba(246,245,242,0.35)` y texto `#F6F5F2`. El ámbar solo como acento (Premium, progreso, selección).
- Radios 4–10, pesos 700 como máximo, bordes finos, sin emojis en la interfaz (íconos en `src/components/Iconos.tsx`). Los textos para WhatsApp sí llevan emojis.

Pendiente:
- [x] Repaso y tarjetas (`app/repaso/[mazoId].tsx`, `components/Tarjeta.tsx`)
- [ ] Cupo agotado (`components/CupoAgotado.tsx`)
- [ ] Duelo: `app/duelo/nuevo.tsx`, `app/duelo/[codigo].tsx` (chips de norma, cabecera del marcador, partida)
- [ ] Pregunta del día (`app/diaria.tsx`): cabecera como rótulo, opciones, bloque de resultado
- [ ] Login (`app/login.tsx`) y bienvenida (`app/bienvenida.tsx`)
- [ ] Verificar: `cd apps/mobile && npx tsc --noEmit && npx expo lint`, revisar en el simulador y commit

## Notas
- La app apunta a la API de `apps/mobile/.env` (`EXPO_PUBLIC_API_URL`); dev es `https://api.dev.tekluma.app`.
- Despliegue de dev: `npx sst deploy --stage dev` desde la raíz.
