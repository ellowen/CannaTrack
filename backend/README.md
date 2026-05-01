# CannaTrack — Backend

Basado en Supabase (PostgreSQL + Auth + Storage + Edge Functions).

## Stack
- Supabase (BaaS)
- PostgreSQL para datos
- Supabase Auth para usuarios
- Supabase Storage para fotos de plantas
- Edge Functions para logica server-side (IA, webhooks)

## Migraciones

| Archivo | Contenido |
|---|---|
| `00_initial_schema.sql` | Schema base |
| `01_full_schema.sql` | Tablas completas + RLS + Storage |
| `02_profiles_additions.sql` | onboarding_completed, streak, last_activity_date |
| `03_ai_usage_and_diagnosis.sql` | ai_usage, diagnosis_logs, is_pro en profiles |

Correr en orden en el SQL Editor de Supabase dashboard.

## Edge Functions

### `diagnose-plant`
Recibe una foto en base64, llama a Claude API y devuelve diagnostico.
Variables requeridas: `ANTHROPIC_API_KEY`

### `revenuecat-webhook`
Recibe eventos de RevenueCat y actualiza `profiles.is_pro`.

**Configuracion en RevenueCat:**
1. Dashboard > Project > Integrations > Webhooks
2. URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
3. Authorization: cualquier string secreto (ej. uuid aleatorio)

**Variable de entorno en Supabase:**
```
REVENUECAT_WEBHOOK_SECRET=<el mismo string del paso 3>
```
Configurar en: Supabase Dashboard > Edge Functions > Secrets

## Deploy de functions
```bash
supabase functions deploy diagnose-plant
supabase functions deploy revenuecat-webhook
```

## Variables de entorno (Supabase Secrets)
```
ANTHROPIC_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
```
