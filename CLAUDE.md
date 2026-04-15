# CLAUDE.md — CannaTrack

Este archivo define el contexto, arquitectura, roles y reglas de trabajo
para todas las sesiones de Claude Code y Claude.ai en este proyecto.
Siempre leé este archivo antes de hacer cualquier cambio al código.

---

## QUÉ ES ESTE PROYECTO

**CannaTrack** es una web app (y futura app mobile) para el seguimiento
completo de cultivos de cannabis. Permite gestionar el ciclo de vida de
una o varias plantas con calendario nutricional automático, recordatorios,
historial fotográfico y diagnóstico por IA.

**Repositorio:** https://github.com/ellowen/CannaTrack.git
**Stack:** Monorepo — `/frontend` (Vite + React 18 + TypeScript) + `/backend` (Supabase)

---

## ESTADO ACTUAL DEL PROYECTO

- [x] Etapa 0 — Estructura monorepo + motor nutricional
- [x] Etapa 1 — UI React iniciada (en progreso)
- [ ] Etapa 1 — UI React completa con localStorage
- [ ] Etapa 2 — Backend Supabase conectado
- [ ] Etapa 3 — App mobile React Native / Expo
- [ ] Etapa 4 — Marketplace de tablas nutricionales (B2B)

---

## ARQUITECTURA

### Monorepo

```
CannaTrack/
├── frontend/          ← Vite + React 18 + TypeScript
│   └── src/
│       ├── types/     ← tipos TypeScript del dominio
│       ├── data/      ← tablas nutricionales como datos (REVEGETAR, etc.)
│       ├── lib/       ← motor nutricional (lógica pura, sin UI)
│       ├── components/← componentes React reutilizables
│       ├── pages/     ← páginas principales
│       ├── hooks/     ← custom hooks
│       ├── store/     ← estado global con Zustand
│       └── router/    ← React Router
└── backend/           ← Supabase
    └── supabase/
        └── migrations/← schema SQL
```

### Principios irrompibles

1. **Motor agnóstico a la marca** — `generatePlantSchedule` recibe
   cualquier `NutritionTable`. Nunca importar ni hardcodear "REVEGETAR"
   en la lógica del motor.

2. **Datos vs código** — Las tablas nutricionales son datos en `src/data/`.
   Agregar una marca nueva = agregar un archivo, no tocar el motor.

3. **Offline-first** — El calendario y las tareas del día funcionan
   sin conexión. Sync con Supabase cuando hay internet.

4. **Motor portátil** — `src/lib/` y `src/data/` sin dependencias de
   React ni del browser. Deben funcionar en Vite, Next.js y Expo sin cambios.

5. **TypeScript estricto** — `strict: true` siempre. Sin `any`. Sin
   fechas como strings. Sin dosis como strings.

---

## MODELO DE NEGOCIO

### Usuarios finales (B2C)
- **Free**: 1 planta activa, tabla REVEGETAR, notificaciones básicas
- **Pro (~USD 5/mes)**: plantas ilimitadas, todas las tablas,
  diagnóstico IA por foto, estadísticas, exportar historial

### Marcas de fertilizantes (B2B)
- **Listing (~USD 100/mes)**: la marca paga para que su tabla
  nutricional esté disponible en el marketplace de la app
- **White label**: la marca tiene su propia versión de la app
  con su branding y sus productos como tabla nativa

### Estrategia de lanzamiento
1. MVP gratuito → primeros 100 usuarios → feedback real
2. 500+ usuarios activos → activar plan Pro
3. Contactar REVEGETAR y 2–3 marcas → vender listing con métricas reales
4. White label cuando el producto esté pulido

---

## TIPOS DE GENÉTICA SOPORTADAS

| Tipo | Ciclo VEGE | Ciclo FLORA | Especial |
|------|-----------|-------------|---------|
| Feminizada | Variable (usuario decide) | 8 semanas desde `floraStartDate` | `floraStartDate` manual |
| Autofloreciente | 5 semanas fijas | Auto desde día 35 | `autoFlowerTotalDays` configurable |
| Regular | Variable (igual que feminizada) | 8 semanas desde `floraStartDate` | Campo `sex` — si macho → descartada |

---

## TABLA NUTRICIONAL REVEGETAR

Tabla base incluida en plan Free. Fuente: revegetar.com.ar

### Líneas de productos
- **BIO** — Nutrientes y bioestimulantes ecológicos
- **ECO** — Abonos y enmiendas orgánicas
- **LIFE** — Fertilizantes y controladores biológicos
- **FUEL** — Bases nutritivas minerales

### Referencias de EC y PH por etapa

| Etapa | EC | PH |
|-------|----|----|
| Enraizado (VEGE S0–S1) | 0,4–0,6 | 5,5–6,0 |
| Crecimiento (VEGE S2–S3) | 0,6–0,8 | 5,5–6,0 |
| Prefloración (VEGE S4–S5) | 0,8–1,0 | 5,5–6,0 |
| Estiramiento (FLORA F1–F2) | 1,0–1,2 | 6,0–6,5 |
| Engorde (FLORA F3–F4) | 1,2–1,4 | 6,0–6,5 |
| Maduración (FLORA F5–F6) | 1,4–1,6 | 6,0–6,5 |
| Limpieza (FLORA F7–F8) | 0,0–0,4 | 6,0–6,5 |

---

## CONVENCIONES DE CÓDIGO

### TypeScript
- `strict: true` en tsconfig — sin excepciones
- Sin `any` — usar `unknown` si es necesario
- Fechas siempre como `Date`, nunca como `string`
- Dosis siempre como `{ minDose: number, maxDose: number }`, nunca strings
- Imports con alias `@/` para rutas absolutas dentro de `src/`

### Naming
- Componentes React: PascalCase (`PlantCard.tsx`)
- Hooks: camelCase con prefijo `use` (`usePlants.ts`)
- Stores: camelCase con sufijo `Store` (`plantStore.ts`)
- Tipos: PascalCase (`Plant`, `ScheduledTask`)
- Constantes de datos: SNAKE_UPPER_CASE (`REVEGETAR_TABLE`)
- Funciones utilitarias: camelCase (`getTasksForDate`)

### Estructura de commits
```
feat: descripción corta en español
fix: descripción corta en español
refactor: descripción corta en español
docs: descripción corta en español
test: descripción corta en español
```

### Comentarios
- En español para lógica de negocio
- JSDoc en todas las funciones exportadas de `src/lib/`
- Sin comentarios obvios — solo donde agrega valor real

---

## ROLES DEL EQUIPO VIRTUAL (para sesiones de Claude)

Cuando trabajés en una sesión de Claude, podés pedirle que adopte
uno de estos roles según lo que necesités:

### ROL: CTO
Usar cuando necesitás decisiones de arquitectura, stack, escalabilidad.
```
Actuá como CTO de CannaTrack. Tenés experiencia en productos SaaS móviles,
arquitectura React Native + Supabase, y modelos de negocio freemium B2C + B2B.
El proyecto está en: [describir estado actual].
Necesito tu opinión sobre: [pregunta].
```

### ROL: CEO / Product Manager
Usar cuando necesitás decisiones de producto, priorización, go-to-market.
```
Actuá como CEO/PM de CannaTrack. El producto es una app de seguimiento
de cultivos de cannabis con modelo freemium y marketplace de tablas
nutricionales para marcas. Tenemos [N] usuarios y el MVP está en [estado].
Necesito decidir: [pregunta de producto/negocio].
```

### ROL: Senior Frontend Developer
Usar cuando necesitás implementar features de UI.
```
Actuá como Senior Frontend Developer en CannaTrack.
Stack: Vite + React 18 + TypeScript + Tailwind + Zustand + React Router.
Repo: https://github.com/ellowen/CannaTrack.git — estructura monorepo en /frontend.
Adjunto los archivos relevantes del contexto.
Necesito implementar: [feature].
Seguí las convenciones del CLAUDE.md.
```

### ROL: Senior Backend Developer
Usar cuando necesitás trabajar en Supabase, migraciones, Edge Functions.
```
Actuá como Senior Backend Developer en CannaTrack.
Stack: Supabase (PostgreSQL + Auth + Storage + Edge Functions).
El schema está en /backend/supabase/migrations/.
Necesito implementar: [feature de backend].
```

### ROL: QA / Code Reviewer
Usar cuando necesitás revisar código o agregar tests.
```
Actuá como QA Senior en CannaTrack. Revisá este código y:
1. Identificá bugs o edge cases no cubiertos
2. Verificá que siga las convenciones del CLAUDE.md
3. Sugerí tests adicionales para Vitest
Código a revisar: [pegar código]
```

---

## CÓMO ARRANCAR CADA SESIÓN

### Con Claude Code (VS Code)
```bash
cd CannaTrack
claude
```
Empezá la sesión con:
> "Leé el CLAUDE.md y el estado actual del repo. Luego vamos a trabajar en: [tarea]"

### Con Claude.ai
Adjuntá siempre:
1. Este archivo `CLAUDE.md`
2. Los archivos relevantes para la tarea
3. Describí el estado actual brevemente

---

## PRÓXIMOS PASOS POR PRIORIDAD

### URGENTE — Terminar Etapa 1
- [ ] Stores con Zustand + localStorage (plantStore, taskStore, nutritionStore, userStore)
- [ ] Componentes UI base (Button, Card, Badge)
- [ ] Página NewPlant con formulario completo
- [ ] Página Home con PlantCard y tareas del día
- [ ] Página PlantDetail con NutritionCard, TaskItem, botón "Iniciar floración"
- [ ] React Router conectando todas las páginas

### IMPORTANTE — Etapa 2
- [ ] Setup Supabase: auth, tablas, storage de fotos
- [ ] Migrar stores de localStorage a Supabase
- [ ] Plan Free vs Pro (feature flags)
- [ ] Upload y galería de fotos por semana

### FUTURO — Etapa 3+
- [ ] React Native + Expo (reutilizando el motor)
- [ ] Notificaciones push nativas
- [ ] Diagnóstico IA por foto (Claude API vision)
- [ ] Marketplace de tablas B2B
- [ ] White label para marcas

---

## DECISIONES TÉCNICAS TOMADAS (no revertir sin justificación)

| Decisión | Razón |
|----------|-------|
| Monorepo (no dos repos) | Tipos compartidos, un solo clone, más fácil para trabajar solo |
| Vite + React (no Next.js) | Más simple para MVP, sin SSR que no necesitamos aún |
| Zustand (no Redux/Context) | Mínima boilerplate, persistencia fácil con middleware |
| Supabase (no Firebase) | Open source, PostgreSQL real, más barato a escala |
| date-fns (no dayjs/moment) | Tree-shakeable, TypeScript nativo, sin side effects |
| Tailwind (no CSS Modules) | Velocidad de desarrollo, consistencia, fácil de mantener solo |
| Motor como lógica pura | Portátil a Expo sin cambios, testeable sin browser |

---

*CannaTrack — App de seguimiento de cultivos de cannabis*
*Repo: https://github.com/ellowen/CannaTrack.git*
*Última actualización: Abril 2026*
