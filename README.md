# La penya Penua — Porra Mundial 2026

Aplicación de predicciones para el FIFA World Cup 2026, hecha para un grupo privado de amigos. Permite predecir resultados de cada partido y el podio final del torneo, con clasificación en tiempo real.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS v4 |
| Base de datos / Auth | Supabase (PostgreSQL + RLS + Realtime) |
| Deploy | Netlify (con Scheduled Functions) |

## Funcionalidades

- **Predicciones de partido** — marca el resultado antes del cierre (15 min antes del pitido)
- **Predicción del torneo** — elige campeón, subcampeón y tercer clasificado
- **Clasificación en tiempo real** — se actualiza vía Supabase Realtime cuando llegan resultados
- **Noticias por selección** — al clicar cualquier equipo en el dashboard se abren las últimas noticias en español (Google News RSS)
- **Sync automático de resultados** — Netlify Scheduled Function cada 5 minutos consulta TheSportsDB
- **Panel admin** — introducción manual de resultados y sync forzado con la API
- **Página de información** — explicación de la mecánica, puntuaciones y fechas límite

## Sistema de puntos

**Por partido** (máx. 5 pts):
- +3 — acertar el signo (1/X/2)
- +1 — acertar goles del equipo local
- +1 — acertar goles del equipo visitante

**Por torneo**:
- +30 — campeón correcto
- +20 — subcampeón correcto
- +15 — tercer clasificado correcto

## Desarrollo local

```bash
npm install
npm run dev      # Turbopack dev server en http://localhost:3000
npm run build    # Build de producción
npm run lint     # ESLint
```

### Variables de entorno

Crea un `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Estructura de rutas

```
app/
├── (app)/
│   ├── dashboard/      # Lista de partidos y predicciones
│   ├── torneo/         # Predicción campeón/sub/3º
│   ├── leaderboard/    # Clasificación general
│   ├── info/           # Cómo funciona la porra
│   ├── profile/        # Perfil del usuario
│   └── admin/          # Panel de administración
├── api/
│   ├── admin/
│   │   ├── save-result/   # Guardar resultado manual
│   │   ├── force-sync/    # Forzar sync con TheSportsDB
│   │   └── sync-status/   # Estado del sync
│   └── news/              # Noticias RSS por selección (Google News)
├── login/              # Autenticación magic link
└── onboarding/         # Setup inicial de perfil
```

## Deploy

El proyecto se despliega automáticamente en Netlify al hacer push a `main`. La Scheduled Function `netlify/functions/sync-results.mts` sincroniza resultados cada 5 minutos.
