# CannaTrack — CTO Roadmap (Pre-Launch)

> Estado: pre-seed, MVP validado tecnicamente. Objetivo: produccion en 4 semanas.
> Ultima actualizacion: 2026-04-30

---

## Indice

1. [Arquitectura del sistema](#1-arquitectura)
2. [Agents, Skills y Memory](#2-agents)
3. [Analisis del producto y roadmap](#3-producto)
4. [Limites del sistema](#4-limites)
5. [Base de datos](#5-base-de-datos)
6. [Datos de prueba](#6-datos-de-prueba)
7. [Documentacion tecnica](#7-documentacion)
8. [Go-To-Market tecnico](#8-go-to-market)
9. [Bonus: decisiones a escala](#9-bonus)

---

## 1. Arquitectura

### Estado actual

```
Expo Go / Dev Build (iOS + Android)
React Native 0.81.5 + Expo SDK 54
Expo Router v5 + Zustand + date-fns
        |
        | HTTPS
        v
Supabase (Auth + PostgreSQL 15 + Storage + Edge Functions)
        |
        v
Anthropic API (Claude vision — diagnose-plant Edge Function)
```

### Problemas actuales

| Problema | Impacto | Urgencia |
|---|---|---|
| Sin entornos separados dev/prod | Bug en dev rompe prod | CRITICA |
| Edge Functions sin rate limiting | Costo Anthropic descontrolado | CRITICA |
| Sin CDN para fotos | Latencia alta | MEDIA |
| Sin crash reporting | Volamos a ciegas en prod | ALTA |
| is_pro como boolean manual | No soporta trials ni planes anuales | ALTA |
| Modal duplicado en plants.tsx | Codigo muerto, confuso | BAJA |

### Arquitectura propuesta (6 meses)

```
Clients: iOS + Android (Expo EAS Build)
        |
Cloudflare (CDN + Rate Limiting por IP)
        |
Supabase Pro
  |- Auth (JWT 1h + refresh)
  |- PostgreSQL (pgBouncer connection pooling)
  |- Storage (plant-photos, CDN Transformations)
  |- Edge Functions (versionadas por rama)
  |- Realtime (sync multi-device)
        |
Servicios externos:
  |- Anthropic API (Claude 3.5 Sonnet vision)
  |- RevenueCat (suscripciones iOS + Android)
  |- Expo Push Notifications
  |- Sentry (crash + error reporting)
```

### Entornos

```
dev     -> Supabase project: cannatrack-dev
staging -> Supabase project: cannatrack-staging
prod    -> Supabase project: cannatrack-prod
```

Variables via `app.config.ts` + EAS Secrets. Nunca `.env` commiteado.

---

## 2. Agents

### PlantAgent — Core

```
Skills:
  - generateSchedule(plant, nutritionTable) -> ScheduledTask[]
  - advanceToFlora(plantId, date)
  - calculateHarvestDate(plant) -> Date
  - getHealthScore(plantId) -> number

Memory:
  - Corto plazo:  estado en Zustand (RAM)
  - Largo plazo:  tabla plants en Supabase
  - Persistente:  scheduled_tasks, week_logs, measurements
```

### DiagnosisAgent — IA visual

```
Skills:
  - analyzePhoto(base64) -> DiagnosisResult
  - getHistory(plantId) -> DiagnosisResult[]
  - suggestAction(issue) -> string

Memory:
  - Corto plazo:  resultado en useState (descartado al cerrar)
  - Largo plazo:  tabla diagnosis_logs (pendiente de implementar)
  - Contexto:     ultimas 3 fotos de la planta como contexto para Claude

Rate limiting:
  - Free: 5 diagnosticos/mes
  - Pro:  30 diagnosticos/mes
```

### NutritionAgent — Motor nutricional

```
Skills:
  - getTasksForToday(userId) -> ScheduledTask[]
  - completeTask(taskId, measurements)
  - getNutritionTable(tableId) -> NutritionTable
  - adjustDoseForPotSize(dose, potVolume) -> dose

Principio: motor puro en shared/lib/nutrition-engine.ts
Sin dependencias React/browser. Portable a web y Expo sin cambios.
```

### GamificationAgent

```
Skills:
  - awardXP(userId, action) -> newTotal
  - checkLevelUp(userId) -> Level | null
  - getStreak(userId) -> number
```

### NotificationAgent

```
Skills:
  - scheduleDailyReminder(hour, minute)
  - sendTaskReminder(userId, pendingCount)
  - sendHarvestAlert(userId, plantName, daysLeft)

Memory persistente: profiles.push_token, profiles.notifications_enabled
```

### Flujo entre agentes

```
App abierta:
  NutritionAgent.getTasksForToday() + GamificationAgent.getStreak()

Tarea completada:
  NutritionAgent.completeTask() -> GamificationAgent.awardXP() -> NotificationAgent.update()

Foto subida al diario:
  PlantAgent.getCurrentWeek() -> Storage upload -> GamificationAgent.awardXP()

Diagnostico IA:
  DiagnosisAgent.analyzePhoto() -> Claude Vision -> DiagnosisAgent.saveResult()
  -> PlantAgent.updateHealthScore()
```

---

## 3. Producto

### Evaluacion de features actuales

| Feature | Valor | Decision |
|---|---|---|
| Seguimiento plantas VEGE/FLORA | ALTO | Core — mantener y pulir |
| Calendario nutricional automatico | MUY ALTO | Core — diferenciador clave |
| Diario fotografico | ALTO | Mantener |
| Diagnostico IA | MUY ALTO | Pro feature — pulir |
| Gamificacion XP/streak | MEDIO | Mantener simple |
| Push notifications | ALTO | Critico para retencion |
| Multi-planta Free=1 Pro=unlimited | ALTO | Paywall correcto |
| Modal nueva planta en plants.tsx | NINGUNO | ELIMINAR — duplica /plants/new |

### Roadmap

#### FASE 0 — Pre-launch (0-4 semanas) — CRITICO

- [x] GestureHandlerRootView en root layout
- [x] Filtros en pantalla de plantas
- [x] Swipe to delete en plant cards
- [x] Tab bar fix (label overlap)
- [x] Upload de fotos via base64 (confiable en RN)
- [ ] EAS Build + TestFlight / Play Beta
- [ ] Entornos dev/prod separados en Supabase
- [ ] Rate limiting en diagnose-plant Edge Function
- [ ] Sentry integrado (crash reporting)
- [ ] RevenueCat reemplaza is_pro manual
- [ ] Eliminar modal duplicado en plants.tsx
- [ ] diagnosis_logs table (historial de diagnosticos)
- [ ] Indices de performance en DB
- [ ] Politica de privacidad + ToS (requerido por stores)
- [ ] Validacion de tamano/tipo en uploads de fotos

#### FASE 1 — Post-launch (mes 1-2)

- [ ] Realtime sync multi-device (Supabase Realtime)
- [ ] Exportar historial en PDF/CSV (Pro)
- [ ] Onboarding guiado con primera planta
- [ ] Analytics (PostHog self-hosted)
- [ ] Tests unitarios del motor nutricional

#### FASE 2 — Crecimiento (mes 3-6)

- [ ] Marketplace de tablas nutricionales
- [ ] Comparativa entre plantas
- [ ] White label SDK para marcas
- [ ] Modo comunidad (compartir grows)

---

## 4. Limites del sistema

### Que NO hace (y no debe hacer)

- No es red social (sin feeds, likes, follows)
- No vende fertilizantes (software puro)
- No da asesoramiento legal sobre cultivo
- El diagnostico IA es orientativo, no reemplaza experto
- No almacena datos biometricos

### Limites tecnicos

| Limite | Actual | Recomendado |
|---|---|---|
| Fotos por planta | Ilimitadas | Max 50 Free / ilimitado Pro |
| Tamano de foto | Sin validacion | Max 5MB input |
| Diagnosticos IA/mes | Sin limite | 5 Free / 30 Pro |
| Plantas activas Free | 1 | Mantener |
| Llamadas Anthropic | Sin rate limit propio | 10 req/min por usuario |

### Riesgos criticos

```
[CRITICO] Costo Anthropic descontrolado
  1000 usuarios diagnosticando = ~$3/dia sin control
  Fix: rate limiting por user_id en Edge Function

[CRITICO] RLS mal configurada
  User A podria ver datos de user B
  Fix: tests de RLS con usuarios distintos antes del launch

[ALTO] Bucket de fotos sin control de tamano
  Usuario sube video de 500MB
  Fix: validar contentType + size antes de upload

[ALTO] App Store rejection por tema cannabis
  Fix: descripcion del store enfocada en "seguimiento de cultivos / jardin"
       sin mencionar cannabis explicitamente
```

---

## 5. Base de datos

### Schema actual

```
profiles          user_id, username, is_pro, xp, level, streak_days,
                  push_token, notifications_enabled, onboarding_completed,
                  notification_hour

plants            id, user_id, name, genetics, genetic_type, sex,
                  start_date, flora_start_date, auto_flower_total_days,
                  status, location, pot_count, pot_volume_liters,
                  nutrition_table_id, available_products, notes

scheduled_tasks   id, user_id, plant_id, type, scheduled_date, completed,
                  cycle, week, stage, products, ec_min/max, ph_min/max

measurements      id, user_id, plant_id, measured_at, ec, ph, temp,
                  humidity, notes

week_logs         id, user_id, plant_id, week_label, week, stage,
                  log_date, notes, photo_url

nutrition_tables  id, name, brand, description, weeks (jsonb), is_public
```

### Tablas faltantes

Ver: `backend/supabase/migrations/20260430_11_production_schema.sql`

```
diagnosis_logs    historial de diagnosticos IA por planta
ai_usage          cuota mensual de diagnosticos por usuario (rate limiting)
subscription_events  audit trail de cambios de plan Pro
```

### Indices recomendados

```sql
CREATE INDEX idx_plants_user_status      ON plants (user_id, status);
CREATE INDEX idx_tasks_user_date         ON scheduled_tasks (user_id, scheduled_date, completed);
CREATE INDEX idx_tasks_plant             ON scheduled_tasks (plant_id);
CREATE INDEX idx_week_logs_plant         ON week_logs (plant_id, log_date DESC);
CREATE INDEX idx_diagnosis_plant         ON diagnosis_logs (plant_id, created_at DESC);
```

---

## 6. Datos de prueba

Ver: `backend/supabase/seeds/test_users.sql`

10 usuarios de prueba con `is_pro = true` (full access).

```
emails:   test1@cannatrack.dev ... test10@cannatrack.dev
password: Test1234!
roles:    todos Pro
```

Crear los usuarios en Supabase Auth via Admin API (ver script en seeds/).
El SQL seed inserta los profiles y plantas de prueba asociadas.

---

## 7. Documentacion tecnica

### Estructura del repo

```
CannaTrack/
  mobile/
    app/
      (tabs)/          Tab bar screens (index, plants, tasks, diagnose, profile)
      plants/          Plant detail + diary + diagnosis + timeline
      _layout.tsx      Root layout (GestureHandlerRootView + ThemeProvider)
    src/
      components/      UI components reutilizables
      hooks/           usePlants, usePlan, useAuth, useNutritionTables...
      lib/             supabase.ts, notifications, xp, biometric
      store/           Zustand stores
    shared/            Motor nutricional PURO (sin deps React/browser)
      lib/nutrition-engine.ts
      types/
      data/            Tablas nutricionales como datos
  backend/
    supabase/
      migrations/      SQL numerados cronologicamente (YYYYMMDD_NN_descripcion)
      functions/       Edge Functions (Deno)
      seeds/           Datos de prueba (NUNCA en prod)
```

### Decisiones tecnicas

| Decision | Descartada | Razon |
|---|---|---|
| Expo SDK 54 + EAS | Bare RN | OTA updates sin Xcode/Android Studio en CI |
| Supabase | Firebase | PostgreSQL real, open source, RLS nativa |
| Motor nutricional puro | Logica en componentes | Portable, testeable, sin side effects |
| base64 -> Uint8Array para uploads | fetch().blob() | Confiable en todas las versiones de RN |
| Expo Router v5 | React Navigation | File-based routing, escala mejor |
| RevenueCat (propuesto) | is_pro manual | Maneja App Store + Play Store, webhooks, trials |

### Setup del proyecto

```bash
# Clonar
git clone https://github.com/ellowen/CannaTrack.git
cd CannaTrack

# Mobile
cd mobile
npm install
npx expo start

# Variables de entorno (copiar y completar)
cp .env.example .env.local
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Migraciones (requiere supabase CLI)
cd ../backend
supabase db push
```

---

## 8. Go-To-Market tecnico

### Infraestructura y costos

| Servicio | Plan | Costo/mes |
|---|---|---|
| Supabase | Pro | $25 |
| EAS (Expo) | Production | $99 |
| Cloudflare | Free | $0 |
| Sentry | Free tier | $0 |
| RevenueCat | Free (<$2.5k MRR) | $0 |
| **Total mes 0** | | **~$124** |

### CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  eas-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd mobile && npm ci
      - run: cd mobile && eas update --branch production --message "${{ github.event.head_commit.message }}"

  supabase-migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --db-url ${{ secrets.SUPABASE_DB_URL }}
```

### Seguridad

```
Auth:
  - JWT tokens (expiracion 1h + refresh token)
  - RLS en TODAS las tablas
  - Service role key NUNCA en el cliente

Storage:
  - Bucket plant-photos: upload autenticado, lectura publica
  - Path: {user_id}/{plant_id}/{timestamp}.jpg
  - Validar contentType en server antes de aceptar

Rate Limiting (Edge Function):
  - Free: 5 diagnosticos/mes
  - Pro: 30 diagnosticos/mes
  - Tabla ai_usage para tracking
```

### Monitoreo

```
Sentry: JS errors, network failures, upload failures
Supabase Dashboard: slow queries, storage usage, auth metrics
Alertas: Anthropic spend > $10/dia, DB > 80% capacity
```

### Backups

```
Supabase Pro: daily automated (7 dias retencion)
Adicional: pg_dump semanal a S3 via GitHub Action
```

---

## 9. Bonus — A escala de 100k usuarios

### Que cambiaria

1. **Motor nutricional como microservicio** — hoy corre en el cliente. A escala, pre-calcular schedules server-side para todos los usuarios nuevos de madrugada.

2. **Realtime con WebSockets** — Supabase Realtime ya disponible. Sync multi-device instantaneo sin polling.

3. **CDN de fotos con transformaciones** — Cloudflare Images o Supabase Storage Transformations para thumbnails sin descargar original.

4. **Queue para diagnosticos IA** — el request no espera la respuesta de Claude. El usuario recibe push notification cuando termina.

5. **Edge Functions separadas por dominio** — `nutrition-engine`, `task-scheduler`, `analytics-ingestion`, `diagnose-plant` separados y con cold starts optimizados.

### Decisiones que evitaria

- **is_pro como boolean** — no soporta trials, planes anuales, plan familiar. Migrar a RevenueCat antes de lanzar cuesta menos que migrar con 10k usuarios.
- **Mezcla de convenciones en migraciones** — consolidar en schema limpio antes del launch.
- **Sin seed data automatizado** — cada developer configura manualmente. 2h de inversion ahorran dias.

### Deuda tecnica: acepto vs no acepto

| Deuda | Acepto | Razon |
|---|---|---|
| Modal duplicado en plants.tsx | NO | Eliminar ahora, es rapido |
| Sin tests en motor nutricional | Corto plazo SI | Launch primero, tests en mes 1 |
| Gamificacion simple | SI | No es diferenciador en pre-seed |
| is_pro en DB sin RevenueCat | Solo hasta launch | Max 30 dias |
| Sin staging environment | NO | Un bug con usuarios reales es inaceptable |
| Fotos sin validacion de tamano | NO | Un usuario puede colapsar el bucket |
| Edge Function sin rate limiting | NO | El costo Anthropic puede explotarte dia 1 |

---

*CannaTrack — CTO Roadmap v1.0 — Abril 2026*
