# Como ejecutar las migrations en Supabase

## OPCIÓN A: Supabase CLI (Recomendado)

### Prerrequisitos
1. Tener Supabase CLI instalado: https://supabase.com/docs/guides/cli/getting-started
2. Estar autenticado: `supabase login`
3. Linked al proyecto: `supabase link --project-ref [PROJECT_REF]`

### Ejecución

```bash
cd /c/Dev/CannaTrack/backend/supabase

# Ver estado actual
supabase db pull

# Ejecutar todas las migrations pendientes
supabase db push

# Esperado:
# ✓ 20260424_01_init_schema.sql
# ✓ 20260424_02_nutrition_tables.sql
# ✓ 20260424_03_gamification.sql
# ✓ 20260424_04_rls_policies.sql
# All migrations complete
```

---

## OPCIÓN B: Manualmente en Dashboard (si CLI falla)

1. Ir a: https://app.supabase.com/project/[PROJECT_ID]/sql/new
2. Copiar contenido de cada archivo EN ORDEN:
   - 20260424_01_init_schema.sql
   - 20260424_02_nutrition_tables.sql
   - 20260424_03_gamification.sql
   - 20260424_04_rls_policies.sql
3. Click "RUN" (▶) para cada uno
4. Aguardar a que complete sin errores

---

## Validación Post-Push (SQL Editor)

### 1. Verificar tablas creadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Esperado (10 tablas):**
```
measurements
nutrition_products
nutrition_tables
nutrition_weeks
plants
profiles
scheduled_tasks
user_streaks
user_xp_log
week_logs
```

---

### 2. Verificar RLS habilitado

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Esperado:** Todos `rowsecurity = t` (true)

---

### 3. Verificar funciones creadas

```sql
SELECT proname
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;
```

**Esperado (mínimo):**
```
get_level_info
get_user_level
get_user_summary
handle_new_user
handle_task_completion
is_plant_owner
is_task_owner
```

---

### 4. Verificar data REVEGETAR

```sql
-- Semanas nutricionales
SELECT COUNT(*) as week_count FROM nutrition_weeks
WHERE table_id = 'revegetar';
-- Esperado: 14 (6 vege + 8 flora)

-- Productos por línea
SELECT line, COUNT(*) as product_count
FROM nutrition_products
WHERE table_id = 'revegetar'
GROUP BY line
ORDER BY line;
-- Esperado: BIO=5, ECO=4, LIFE=4, FUEL=4

-- Verificar stages
SELECT cycle, week, stage, ec_min, ec_max, ph_min, ph_max
FROM nutrition_weeks
WHERE table_id = 'revegetar'
ORDER BY cycle DESC, week;
```

---

### 5. Verificar RLS policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Esperado (mínimo 20+ policies)**

---

### 6. Verificar índices

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Esperado:**
```
idx_measurements_plant
idx_nutrition_products_table
idx_nutrition_weeks_table
idx_plants_user
idx_tasks_date
idx_tasks_plant
idx_tasks_user
idx_week_logs_plant
idx_xp_log_plant
idx_xp_log_user
```

---

### 7. Test: Auto-crear profile

```sql
-- Simular inserción en auth.users
-- (En producción: supabase auth sign-up)

-- Para test, ejecutar directamente:
INSERT INTO auth.users (id, email, email_confirmed_at, encrypted_password)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  NOW(),
  crypt('password123', gen_salt('bf'))
);

-- Verificar que se creó el profile automáticamente
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
-- Esperado: username = 'test' (del email)
```

---

### 8. Test: Task completion XP

```sql
-- Obtener IDs de test
SELECT id as user_id FROM profiles LIMIT 1; -- u1
SELECT id as plant_id FROM plants LIMIT 1;  -- p1

-- Crear tarea de test
INSERT INTO scheduled_tasks (
  user_id, plant_id, type, scheduled_date, cycle, week,
  stage, ec_min, ec_max, ph_min, ph_max
) VALUES (
  'u1'::uuid,
  'p1'::uuid,
  'nutrition',
  current_date,
  'vege',
  1,
  'S1',
  0.4,
  0.6,
  5.5,
  6.0
) RETURNING id as task_id;

-- Marcar como completada (trigger se activa)
UPDATE scheduled_tasks
SET completed = true, completed_at = NOW()
WHERE id = 'task_id'::uuid;

-- Verificar XP awarded
SELECT * FROM user_xp_log
WHERE user_id = 'u1'::uuid
ORDER BY created_at DESC LIMIT 1;
-- Esperado: xp_amount = 10, action = 'task_completed'

-- Verificar profiles.xp actualizado
SELECT xp FROM profiles WHERE id = 'u1'::uuid;
-- Esperado: xp >= 10
```

---

## Troubleshooting

### Error: "Extension uuid-ossp not found"
```sql
-- Ejecutar manualmente en SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "Function handle_new_user already exists"
- Las migrations son idempotentes (`create or replace`)
- Ejecutar nuevamente es seguro

### Error: "Policy already exists"
- Supabase mantiene historia de policies
- Manualmente: `DROP POLICY IF EXISTS "nombre"` antes de recrear

### Error: "Table already exists"
- Las creaciones usan `IF NOT EXISTS`
- Seguro ejecutar nuevamente

---

## Rollback Parcial (si algo falla)

En SQL Editor, ejecutar en orden inverso:

```sql
-- Revertir gamification
DROP TRIGGER IF EXISTS on_task_completed ON scheduled_tasks;
DROP FUNCTION IF EXISTS handle_task_completion CASCADE;
DROP FUNCTION IF EXISTS handle_photo_upload CASCADE;
DROP TABLE IF EXISTS user_xp_log CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;

-- Revertir nutrition
DELETE FROM nutrition_products WHERE table_id = 'revegetar';
DELETE FROM nutrition_weeks WHERE table_id = 'revegetar';
DELETE FROM nutrition_tables WHERE id = 'revegetar';
DROP TABLE IF EXISTS nutrition_products CASCADE;
DROP TABLE IF EXISTS nutrition_weeks CASCADE;
DROP TABLE IF EXISTS nutrition_tables CASCADE;

-- Revertir schema base
ALTER TABLE week_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE measurements DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE plants DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS week_logs CASCADE;
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS scheduled_tasks CASCADE;
DROP TABLE IF EXISTS plants CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Revertir storage
DELETE FROM storage.buckets WHERE id = 'plant-photos';
```

---

## Comandos útiles

```bash
# Ver estado de migrations
supabase db status

# Ver cambios pendientes
supabase db diff

# Ver último changelog
supabase migration list

# Crear nueva migration (para cambios futuros)
supabase migration new add_new_table

# Revertir última migration en local
supabase db reset

# Backup antes de hacer cambios
pg_dump postgresql://... > backup.sql
```

---

## Checklist Final

- [ ] Migrations copiadas a `/backend/supabase/migrations/`
- [ ] Nombres en orden: 20260424_01, _02, _03, _04
- [ ] Ejecutadas: `supabase db push`
- [ ] Tablas verificadas (10 tablas creadas)
- [ ] RLS enabled en todas
- [ ] Seed REVEGETAR completo (14 semanas, 20 productos)
- [ ] Funciones y triggers activas
- [ ] Test: Auto-profile al registrarse
- [ ] Test: XP awarded al completar tarea
- [ ] Storage bucket "plant-photos" creado

---

## Próximo paso

Después de validación exitosa:
1. Conectar API frontend a Supabase
2. Crear Edge Functions para photo uploads
3. Implementar Realtime subscriptions
