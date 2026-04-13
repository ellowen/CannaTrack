# CannaTrack — Arquitectura

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Estado | Zustand + localStorage (→ Supabase Etapa 2) |
| Routing | React Router v6 |
| Estilos | Tailwind CSS |
| Tests | Vitest |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Mobile | Expo (Etapa 3) |

## Principios de diseño

- **Motor agnóstico a la marca:** `generatePlantSchedule` recibe `NutritionTable` como parámetro — nunca importa una tabla específica.
- **Portabilidad:** `src/lib/` y `src/data/` funcionan en Vite, Next.js y Expo sin cambios.
- **Freemium:** El acceso a tablas nutricionales se controla por `accessTier` ('free' | 'pro').
- **B2B:** Las marcas pagan un listing para que su tabla esté en el marketplace.

## Flujo de datos

```
NutritionTable (data/)
        ↓
generatePlantSchedule (lib/nutrition-engine.ts)
        ↓
ScheduledTask[] → Store (Zustand) → Componentes React
```

## Estructura de módulos

- `types/` — interfaces TypeScript compartidas
- `data/` — tablas nutricionales como datos puros
- `lib/` — motor lógico sin dependencias de UI ni browser
- `components/` — componentes React reutilizables
- `pages/` — páginas (una por ruta)
- `hooks/` — custom hooks (acceso a stores + lógica UI)
- `store/` — estado global con Zustand
- `router/` — configuración de rutas
