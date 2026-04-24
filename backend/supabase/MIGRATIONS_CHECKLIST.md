# Migrations Checklist — CannaTrack Semana 5

## Orden de Ejecución

```
20260424_01_init_schema.sql
20260424_02_nutrition_tables.sql
20260424_03_gamification.sql
20260424_04_rls_policies.sql
```

---

## 20260424_01_init_schema.sql (190 líneas)

### Tablas creadas
- ✓ profiles (con handle_new_user trigger)
- ✓ plants
- ✓ scheduled_tasks
- ✓ measurements
- ✓ week_logs
- ✓ storage.buckets (plant-photos)

### Funciones
- ✓ handle_new_user() — Auto-crea profile cuando se registra usuario

### RLS Activado
- ✓ profiles: own
- ✓ plants: own
- ✓ scheduled_tasks: own
- ✓ measurements: own
- ✓ week_logs: own
- ✓ storage.objects: fotos (upload/read/delete own)

### Índices creados
- ✓ idx_plants_user
- ✓ idx_tasks_user
- ✓ idx_tasks_plant
- ✓ idx_tasks_date
- ✓ idx_measurements_plant
- ✓ idx_week_logs_plant

---

## 20260424_02_nutrition_tables.sql (150 líneas)

### Tablas creadas
- ✓ nutrition_tables
- ✓ nutrition_weeks
- ✓ nutrition_products

### Seed Data
- ✓ REVEGETAR tabla principal
- ✓ 6 semanas VEGE (S1-S6) con EC/pH ranges
- ✓ 8 semanas FLORA (F1-F8) con EC/pH ranges
- ✓ 20 productos distribuidos en 4 líneas:
  - BIO (5 productos)
  - ECO (4 productos)
  - LIFE (4 productos)
  - FUEL (4 productos)

### RLS Activado
- ✓ nutrition_tables: public read
- ✓ nutrition_weeks: public read
- ✓ nutrition_products: public read

### Índices creados
- ✓ idx_nutrition_weeks_table
- ✓ idx_nutrition_products_table

---

## 20260424_03_gamification.sql (255 líneas)

### Tablas creadas
- ✓ user_xp_log
- ✓ user_streaks

### Funciones
- ✓ get_level_info(total_xp) — 10 niveles con progreso
- ✓ handle_task_completion() — Trigger que:
  - Asigna XP según tipo de tarea
  - Inserta log en user_xp_log
  - Actualiza profiles.xp
  - Actualiza racha de días
  - Otorga bonus XP cada 5 días de racha
- ✓ handle_photo_upload() — (preparada, requiere Edge Function)

### Triggers
- ✓ on_task_completed — Se activa cuando completed = true

### RLS Activado
- ✓ user_xp_log: own (lectura)
- ✓ user_streaks: own (todos)

### Índices creados
- ✓ idx_xp_log_user
- ✓ idx_xp_log_plant

---

## 20260424_04_rls_policies.sql (164 líneas)

### RLS Consolidado
- ✓ profiles: own + system update xp
- ✓ plants: own
- ✓ scheduled_tasks: own + complete own
- ✓ measurements: own
- ✓ week_logs: own
- ✓ user_xp_log: own
- ✓ user_streaks: own
- ✓ nutrition_* : public read

### Funciones de Utilidad (Security Definer)
- ✓ is_plant_owner(uuid) — Verifica ownership
- ✓ is_task_owner(uuid) — Verifica ownership
- ✓ get_user_level() — Retorna nivel + progreso actual
- ✓ get_user_summary() — Resumen del usuario

### Grants
- ✓ Todos los granted a authenticated

---

## Verificación Post-Push

### En Supabase Dashboard → SQL Editor

```sql
-- Verificar tablas
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
```

Resultado esperado (10 tablas):
- measurements
- nutrition_products
- nutrition_tables
- nutrition_weeks
- plants
- profiles
- scheduled_tasks
- user_streaks
- user_xp_log
- week_logs

```sql
-- Verificar RLS habilitado
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Resultado esperado: Todos `rowsecurity = true`

```sql
-- Verificar data REVEGETAR
select count(*) as week_count from nutrition_weeks
where table_id = 'revegetar';
-- Esperado: 14 (6 vege + 8 flora)

select line, count(*) as product_count from nutrition_products
where table_id = 'revegetar'
group by line;
-- Esperado: BIO=5, ECO=4, LIFE=4, FUEL=4
```

---

## Ejecución con Supabase CLI

```bash
cd /c/Dev/CannaTrack/backend/supabase
supabase db push
```

Esperado: `✓ All migrations complete` sin errores

---

## Rollback (si fuera necesario)

Si una migración falla, Supabase NO rollbackea automáticamente. Ejecutar manualmente en SQL Editor:

### Rollback completo (en orden inverso):

```sql
-- 20260424_04_rls_policies
DROP POLICY IF EXISTS "profiles: system update xp" ON profiles;
DROP POLICY IF EXISTS "tasks: complete own" ON scheduled_tasks;
DROP FUNCTION IF EXISTS is_plant_owner(uuid);
DROP FUNCTION IF EXISTS is_task_owner(uuid);
DROP FUNCTION IF EXISTS get_user_level();
DROP FUNCTION IF EXISTS get_user_summary();
-- ... etc (ver comments en cada archivo)
```

---

## Campos por Tabla

### profiles
- id (uuid, PK)
- username (text)
- push_token (text)
- notification_time (time)
- is_pro (boolean)
- streak_days (int)
- xp (int)
- theme (text)
- notifications_enabled (boolean)
- created_at, updated_at (timestamptz)

### plants
- id (uuid, PK)
- user_id (uuid, FK)
- name, genetics, genetic_type, sex (text)
- start_date, flora_start_date (date)
- auto_flower_total_days (int)
- location, pot_count, pot_volume_liters (text/int/numeric)
- nutrition_table_id (text, default: 'revegetar')
- available_products (text[])
- status (text: active/harvested/discarded)
- notes (text)
- created_at, updated_at (timestamptz)

### scheduled_tasks
- id (uuid, PK)
- user_id, plant_id (uuid, FK)
- type (text: nutrition/irrigation/foliar/observation/harvest)
- scheduled_date (date)
- cycle (text: vege/flora)
- week, stage (int/text)
- products (jsonb)
- ec_min, ec_max, ph_min, ph_max (numeric)
- completed, completed_at, completion_notes
- created_at (timestamptz)

### measurements
- id (uuid, PK)
- user_id, plant_id, task_id (uuid, FK)
- ec, ph, water_temp (numeric)
- measured_at (timestamptz)
- notes (text)
- created_at (timestamptz)

### week_logs
- id (uuid, PK)
- user_id, plant_id (uuid, FK)
- week_label, log_date (text/date)
- notes (text)
- photo_url (text)
- created_at (timestamptz)

### nutrition_tables
- id (text, PK)
- name, brand, description (text)
- free_plan (boolean)
- created_at, updated_at (timestamptz)

### nutrition_weeks
- id (uuid, PK)
- table_id (text, FK)
- cycle (text: vege/flora)
- week (int)
- stage (text)
- ec_min, ec_max, ph_min, ph_max (numeric)
- duration_days (int)
- created_at (timestamptz)

### nutrition_products
- id (uuid, PK)
- table_id (text, FK)
- line (text: BIO/ECO/LIFE/FUEL)
- product_name (text)
- doses_per_week (int)
- min_dose_ml, max_dose_ml (numeric)
- description (text)
- created_at (timestamptz)

### user_xp_log
- id (uuid, PK)
- user_id, plant_id, task_id (uuid, FK)
- action (text: task_completed/photo_uploaded/measurement_recorded/plant_harvested/level_reached)
- xp_amount (int)
- description (text)
- created_at (timestamptz)

### user_streaks
- id (uuid, PK)
- user_id (uuid, FK, UNIQUE)
- streak_days (int)
- last_completed (date)
- max_streak (int)
- created_at, updated_at (timestamptz)

---

## Próximos pasos

1. ✓ Crear 4 migrations
2. ✓ Validar sintaxis SQL
3. [ ] Ejecutar `supabase db push`
4. [ ] Verificar en dashboard
5. [ ] Crear Edge Functions para photo upload XP
6. [ ] Conectar API con frontend
