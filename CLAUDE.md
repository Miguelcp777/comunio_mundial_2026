# CLAUDE.md — Comunio Mundial 2026

> Porra de predicciones para el FIFA World Cup 2026. Next.js 16 App Router + Supabase + Tailwind v4. Deploy en Netlify.

---

## Stack

| Layer | Tecnología |
|---|---|
| Framework | Next.js **16.2.6** (App Router, React 19) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS **v4** (`@theme` en globals.css) |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Auth | `@supabase/ssr` — sesiones via cookies, renovadas en middleware |
| Deploy | Netlify (`netlify.toml`) |

---

## Estructura de rutas

```
app/
├── page.tsx                  # Landing pública
├── layout.tsx                # Root layout (fuentes: Inter + Outfit)
├── globals.css               # Design system + Tailwind @theme
├── login/
│   ├── page.tsx              # Login/registro con magic link / OTP
│   └── actions.ts            # Server Actions de auth
├── onboarding/
│   └── page.tsx              # Setup inicial del perfil (display_name)
├── auth/confirm/
│   └── route.ts              # Callback de Supabase auth
├── api/admin/
│   ├── save-result/route.ts  # POST — guarda resultado y recalcula puntos
│   ├── force-sync/route.ts   # POST — fuerza sync con TheSportsDB
│   └── sync-status/route.ts  # GET — estado del sync y mapping de equipos
└── (app)/                    # Route group: requiere sesión activa
    ├── layout.tsx            # Incluye <Navbar />
    ├── dashboard/page.tsx    # Lista de partidos + predicciones (Realtime)
    ├── leaderboard/page.tsx  # Tabla de clasificación (Realtime)
    ├── profile/page.tsx      # Perfil + acceso rápido a /torneo
    ├── torneo/page.tsx       # Predicción de torneo (campeón/sub/3º)
    └── admin/page.tsx        # Panel admin: resultados manuales + sync API

components/
├── Navbar.tsx                # Client Component — mobile-only dropdown (lg:hidden)
└── Sidebar.tsx               # Sidebar desktop — título "La penya Penua / Mundial 2026"

netlify/
└── functions/
    └── sync-results.mts      # Scheduled Function — cron */5 * * * *

lib/
├── supabase/
│   ├── client.ts             # createBrowserClient → usar en Client Components
│   ├── server.ts             # createServerClient → usar en RSC / Server Actions
│   └── middleware.ts         # updateSession → refresca cookie de sesión
├── types/database.ts         # Tipos generados de Supabase (NO editar manualmente)
└── utils.ts                  # getFlagEmoji, getFlagUrl, formatStage, formatMatchDate, isPredictionLocked
```

---

## Base de datos — Esquema Supabase

### `teams`
| col | tipo |
|---|---|
| id | int (PK) |
| name | text |
| code | text (FIFA code: `ESP`, `BRA`, etc.) |
| group_letter | text (`A`–`L`) |
| flag_url | text \| null |

### `matches`
| col | tipo | notas |
|---|---|---|
| id | int (PK) | |
| match_number | int | |
| stage | text | `group`, `round_of_32`, `round_of_16`, `quarter_final`, `semi_final`, `third_place`, `final` |
| home_team_id / away_team_id | int FK → teams | |
| home_goals / away_goals | int \| null | null = no jugado |
| match_date | timestamptz \| null | |
| group_letter | text \| null | solo fase grupos |
| venue | text \| null | |
| is_finished | bool | |

### `profiles`
| col | tipo |
|---|---|
| id | uuid (FK → auth.users) |
| display_name | text |
| total_points | int (default 0) |
| is_admin | bool (default false) |
| avatar_url | text \| null |

### `match_predictions`
| col | tipo |
|---|---|
| id | uuid (PK) |
| user_id | uuid FK → profiles |
| match_id | int FK → matches |
| predicted_home_goals | int |
| predicted_away_goals | int |
| points_earned | int \| null (null = partido no finalizado) |

### `tournament_predictions`
| col | tipo | notas |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid FK → profiles (UNIQUE) | 1 por usuario |
| champion_team_id | int FK → teams | |
| runner_up_team_id | int FK → teams | |
| third_place_team_id | int FK → teams | |
| points_earned | int \| null | |
| is_locked | bool | se bloquea antes del torneo |

---

## ⚠️ Triggers de base de datos (NO están en el repo)

Hay lógica en **triggers de PostgreSQL** creados directamente en Supabase. **No están versionados en el código** — solo viven en la base de datos. Antes de depurar un error de escritura, comprobar si hay un trigger implicado:

```sql
-- Listar triggers de una tabla
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid = 'public.match_predictions'::regclass AND NOT tgisinternal;

-- Ver el cuerpo de la función del trigger
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'nombre_funcion';
```

### Triggers conocidos
| Tabla | Trigger | Qué hace |
|---|---|---|
| `match_predictions` | `enforce_match_prediction_deadline` (BEFORE INSERT OR UPDATE) | Bloquea predicciones a <15 min del kickoff. **Salta el bloqueo si `auth.uid() IS NULL`** (contexto backend/service_role), para permitir que el admin guarde resultados y recalcule puntos. |

### 🔑 REGLA DE ORO: el service_role bypasea RLS pero **NO bypasea triggers**

Este fue el bug que costó horas: el admin no podía guardar resultados ("Predictions are locked...") aunque usábamos `SUPABASE_SERVICE_ROLE_KEY`.

- **RLS policies** → el service_role las **ignora** por completo.
- **Triggers (`BEFORE INSERT/UPDATE`)** → se ejecutan **SIEMPRE**, también para el service_role.

Por eso, si una escritura del backend falla con un mensaje de negocio (deadline, validación, "locked", etc.) y ya estás usando el service_role:
1. **NO** es RLS. No pierdas tiempo cambiando policies, `upsert`→`update`, ni comprobando env vars.
2. Busca un **trigger** en la tabla (consulta de arriba).
3. La solución estándar: que la función del trigger **salte la comprobación cuando `auth.uid() IS NULL`** (el backend no tiene usuario autenticado), manteniendo la regla para usuarios normales.

> Diferencia clave entre `upsert` y `update`: `upsert` ejecuta un INSERT primero (dispara políticas/triggers de INSERT), `update` solo dispara los de UPDATE. Pero si el trigger es `INSERT OR UPDATE`, cambiar uno por otro **no** resuelve nada — hay que tocar el trigger.

---

## Reglas de negocio críticas

### Sistema de puntos (partido)
- **+3** — acertar el signo (1/X/2)
- **+1** — acertar goles equipo local
- **+1** — acertar goles equipo visitante
- **Máximo 5 pts por partido**

### Sistema de puntos (torneo)
- **+30** campeón correcto
- **+20** subcampeón correcto
- **+15** tercer clasificado correcto

### Cierre de predicciones
- Se bloquean **15 minutos antes** del kickoff (`isPredictionLocked` en `lib/utils.ts`)
- `tournament_predictions.is_locked = true` → no editable

### Orden de la clasificación (desempates)
La tabla de clasificación ordena por **4 criterios en cascada**, todos derivados de `match_predictions.points_earned` (no hay columnas extra en la BD):

| Nivel | Criterio | Cómo se calcula |
|---|---|---|
| 1º | Puntos totales | `profiles.total_points` (desc) |
| 2º | **Plenos** (resultado exacto) | `count(points_earned = 5)` (desc) |
| 3º | **Aciertos 1-X-2** (signo) | `count(points_earned >= 3)` (desc) |
| 4º | **Goles individuales acertados** | `5→2, 4→1, 1→1, resto→0` sumado (desc) |
| — | Empate final | alfabético por `display_name` (orden estable) |

> Propiedad clave: los valores posibles de `points_earned` por partido son **`0, 1, 3, 4, 5`** (el `2` es imposible: acertar ambos goles implica acertar el signo → pleno = 5). Por eso `pleno ⟺ 5`, `signo ⟺ >= 3`, y los goles acertados se derivan sin recalcular nada.

Implementado en `leaderboard/page.tsx` (`computeRankStats`, `sortByRanking`). **NO** delegar el orden a `.order("total_points")` de Supabase: solo cubre el 1er criterio. Hay que traer las predicciones y ordenar en cliente.

---

## Supabase — Cuándo usar cada cliente

```ts
// ✅ RSC, Server Actions, Route Handlers
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// ✅ Client Components ("use client")
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // no await
```

**Nunca** importar el cliente de server en un Client Component ni viceversa.

---

## Design System (globals.css)

Tailwind v4 usa `@theme` — las variables CSS se definen ahí, no en `tailwind.config.js`.

### Paleta principal
- **Gold**: `--color-gold-{50–900}` / `--color-gold-400: #D4AF37`
- **Midnight**: `--color-midnight-{50–950}` (fondo oscuro azul-marino)
- **Purple**: `--color-purple-deep`, `--color-purple-glow`, `--color-purple-soft`
- **Semánticos**: `--color-success` `--color-warning` `--color-danger`

### Fuentes
- `--font-heading: var(--font-outfit)` — titulares, stats, CTAs
- `--font-body: var(--font-inter)` — texto corriente
- Usar `font-[var(--font-heading)]` en Tailwind (no `font-outfit`)

### Clases utilitarias globales (NO replicar con Tailwind puro)
```
.glass              → tarjeta translúcida sutil
.glass-strong       → tarjeta translúcida más opaca
.text-gold-gradient → texto con gradiente dorado
.glow-gold          → box-shadow gold
.glow-purple        → box-shadow purple
.btn-primary        → botón dorado principal
.btn-secondary      → botón outline
.points-badge       → badge de puntos
.skeleton           → loading placeholder
```

---

## Convenciones de código

- **Server Components por defecto** — añadir `"use client"` solo cuando se necesita interactividad o hooks.
- Path alias `@/` → raíz del proyecto (configurado en `tsconfig.json`).
- Tipos de DB en `lib/types/database.ts` — **generados desde Supabase**, no editar a mano. Usar los convenience aliases: `Team`, `Match`, `Profile`, `MatchPrediction`, `TournamentPrediction`, `MatchWithTeams`, `MatchWithPrediction`.
- FIFA country codes → ISO: usar `getFlagEmoji(code)` / `getFlagUrl(code, size)` de `lib/utils.ts`.
- Fechas: siempre mostrar en timezone `Europe/Madrid` con `formatMatchDate()`.
- `formatStage(stage)` para traducir stage keys a español.

---

## Comandos

```bash
npm run dev      # Turbopack dev server
npm run build    # Build de producción
npm run lint     # ESLint (config en eslint.config.mjs)
```

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo server-side, nunca al cliente
```

En producción (Netlify) estas vars deben estar configuradas en el dashboard. El `service_role_key` **nunca** va al cliente — se usa solo en Route Handlers y Netlify Functions para operaciones admin que bypasean RLS.

> ⚠️ El service_role **bypasea RLS pero NO triggers** (ver sección «Triggers de base de datos»). Si una escritura admin falla con un mensaje de negocio aún teniendo el service_role bien configurado, sospecha de un trigger, no de RLS ni de la env var.

---

## Flujo de autenticación

1. Usuario introduce email → `actions.ts` llama `supabase.auth.signInWithOtp`
2. Supabase envía magic link → redirect a `/auth/confirm`
3. `route.ts` intercambia code por sesión (`exchangeCodeForSession`)
4. Middleware (`updateSession`) refresca la cookie en cada request
5. Si no hay sesión en rutas `/(app)/*` → middleware redirige a `/login`
6. Si el perfil no tiene `display_name` → redirect a `/onboarding`

---

## TheSportsDB — Integración de resultados

- **API**: `https://www.thesportsdb.com/api/v1/json/123` (key `123` = free tier)
- **Liga**: World Cup 2026 → league ID `4429`
- **Endpoint**: `eventsday.php?d=YYYY-MM-DD&l=4429`
- **Límite free**: 3 eventos/día por petición — el cron agrupa fechas y usa cache de peticiones por fecha
- **Mapeo**: `NAME_TO_FIFA` en `sync-results.mts`, `force-sync/route.ts` y `sync-status/route.ts` — traducción de nombre TheSportsDB → código FIFA (p.ej. `"Ivory Coast"→"CIV"`, `"USA"→"USA"`)
- **Detección de partido finalizado**: `strStatus` in `["Match Finished", "FT", "AET", "PEN"]`
- El cron consulta partidos de los **últimos 3 días** sin resultado para recuperar syncs perdidos

### Netlify Scheduled Function
- Archivo: `netlify/functions/sync-results.mts`
- Schedule: `*/5 * * * *` (cada 5 minutos)
- Requiere `@netlify/functions` (devDependency)
- `netlify.toml` debe tener `[functions] directory = "netlify/functions"` y `node_bundler = "esbuild"`

---

## Supabase Realtime

- Tablas con Realtime habilitado: **`matches`** y **`profiles`** (activar en Supabase → Replication)
- `dashboard/page.tsx`: suscripción `UPDATE` en `matches` → actualiza resultados en vivo
- `leaderboard/page.tsx`: suscripción `UPDATE` en `profiles` → **refetcha perfiles + predicciones y re-ordena con los 4 criterios de desempate** (con debounce de 400 ms para coalescer la ráfaga de updates de un sync). No basta con re-ordenar por `total_points` en el payload: se perderían los desempates.
- Usar `createClient()` del cliente de browser para suscripciones Realtime

---

## Panel Admin — funcionalidades

- **Tabs por stage**: Grupos / 32avos / Octavos / Cuartos / Semis / 3er Puesto / Final
- **Filtro por grupo** (A–L) dentro de la fase de grupos
- **Introducir resultado manual**: llama `/api/admin/save-result` (recalcula puntos automáticamente)
- **Tab Sincronización API**: muestra estado del sync, equipos sin mapeo, fuerza sync manual

### `/api/admin/save-result` (POST)
Body: `{ matchId: number, homeGoals: number, awayGoals: number }`
- Actualiza `matches.is_finished = true` + goles
- Recalcula `match_predictions.points_earned` para todas las predicciones del partido
- Recalcula `profiles.total_points` para todos los usuarios afectados (match pts + torneo pts)
- Usa `SUPABASE_SERVICE_ROLE_KEY` (bypasea RLS)
- Usa `UPDATE` individual (no `upsert`) en `match_predictions` para no disparar el trigger de INSERT del deadline. El trigger `enforce_match_prediction_deadline` además ya salta el bloqueo cuando `auth.uid() IS NULL` (ver «Triggers de base de datos»)

---

## ⚠️ Notas críticas (AGENTS.md)

Esta versión de Next.js (**16.x**) tiene breaking changes respecto a versiones anteriores. Antes de tocar routing, caching o Server Actions, leer la doc en `node_modules/next/dist/docs/` o consultar el changelog oficial. No asumir comportamiento de Next.js 14/15.
