# Pizarra Virtual

Pizarra colaborativa mobile-first con auto-limpieza cada 5 minutos.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Realtime + Postgres) para sync entre clientes
- HTML5 Canvas + Pointer Events (mouse/touch/pen unificados)

## Estructura
```
app/                  # Next.js App Router
  layout.tsx          # Viewport mobile + safe areas
  page.tsx            # Página principal (estado + wiring)
  globals.css         # Tailwind + resets
components/
  Canvas.tsx          # <canvas> con Pointer Events
  Toolbar.tsx         # Pincel/borrador/grosor/colores/undo
  Timer.tsx           # Countdown 5min sincronizado
  ClearOverlay.tsx    # Flash al limpiar
  SetupBanner.tsx     # Banner si faltan env vars
lib/
  supabase.ts         # Cliente Realtime + nombres de eventos
  types.ts            # Stroke / mensajes / colores
  draw.ts             # Helpers canvas (segment, redraw, norm/denorm)
  throttle.ts         # Batch 30ms de stroke-extend
  useWhiteboard.ts    # Hook: canal + métodos broadcast
  useUserId.ts        # UUID anónimo en localStorage
  config.ts           # CLEAR_INTERVAL_MS desde env
supabase/
  schema.sql          # Tablas + RLS para correr en SQL Editor
```

## Setup local

1. **Supabase**
   - Crear proyecto en https://supabase.com
   - SQL Editor → correr `supabase/schema.sql`
   - Project Settings → API: copiar URL y `anon` key

2. **Env vars**
   ```bash
   cp .env.local.example .env.local
   # editar con URL + anon key
   ```

3. **Dev**
   ```bash
   npm install
   npm run dev
   ```
   Abrir `http://localhost:3000`

## Deploy Vercel

1. Push a GitHub.
2. Vercel → New Project → importar repo.
3. Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_CLEAR_INTERVAL_MINUTES` (opcional, default 5)
4. Deploy.

Vercel hobby tier alcanza. Supabase free tier alcanza hasta ~30 concurrent.

## Cómo funciona

- Cada cliente se suscribe al canal `whiteboard:global` (Supabase Realtime broadcast).
- Al entrar pide sync (`SYNC_REQUEST`) y recibe `SYNC_RESPONSE` con strokes + timer.
- Dibujo: `STROKE_START` → N × `STROKE_EXTEND` (throttled 30ms) → `STROKE_END`.
- Timer global: cualquier cliente puede iniciar; todos adoptan el `endsAt` recibido.
- Auto-clear: cuando el countdown llega a 0 el cliente dispara `CLEAR` + nuevo `endsAt`.
- Persistencia: al `STROKE_END` se inserta en `whiteboard_strokes`. Cap 1500 strokes en memoria.

## Mobile UX

- `touch-action: none` + `viewport-fit=cover` + safe areas iOS.
- Toolbar fija abajo en mobile, arriba en desktop.
- Tap targets ≥44px.
- Pointer Events API: mouse / touch / stylus unificados.
- PWA-ready (manifest + service worker) — se puede agregar a home en iOS/Android.

## Comandos

```bash
npm run dev        # dev server
npm run build      # build producción
npm run start      # servir build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Costos

| Servicio | Tier | Límite | Suficiente |
|---|---|---|---|
| Vercel | Hobby | 100GB bandwidth/mes | sí |
| Supabase | Free | 500MB DB + 2GB realtime/mes + 200 concurrent realtime | sí (~30 usuarios) |