-- ============================================================
-- SEED: usuarios de prueba para CannaTrack
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================
-- Usuarios creados:
--   PRO:  pro@cannatrack.test  / Test1234!  (is_pro = true,  2 plantas)
--   FREE: free@cannatrack.test / Test1234!  (is_pro = false, 1 planta)
-- ============================================================

BEGIN;

-- ─── 1. LIMPIAR DATOS EXISTENTES ────────────────────────────────────────────
-- Borra en orden para respetar FK constraints

DELETE FROM diagnosis_logs;
DELETE FROM ai_usage;
DELETE FROM subscription_events;
DELETE FROM user_xp_log;
DELETE FROM user_streaks;
DELETE FROM week_logs;
DELETE FROM measurements;
DELETE FROM scheduled_tasks;
DELETE FROM plants;
DELETE FROM profiles;

-- Borrar usuarios de prueba previos (si existen)
DELETE FROM auth.users WHERE email IN ('pro@cannatrack.test', 'free@cannatrack.test');

-- ─── 2. CREAR USUARIOS EN AUTH ──────────────────────────────────────────────

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES
-- Usuario PRO
(
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pro@cannatrack.test',
  crypt('Test1234!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Usuario Pro"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
),
-- Usuario FREE
(
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'free@cannatrack.test',
  crypt('Test1234!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Usuario Free"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
);

-- ─── 3. CREAR IDENTITIES (necesario para login con email/password) ──────────

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"pro@cannatrack.test"}'::jsonb,
  'email',
  'pro@cannatrack.test',
  now(),
  now(),
  now()
),
(
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","email":"free@cannatrack.test"}'::jsonb,
  'email',
  'free@cannatrack.test',
  now(),
  now(),
  now()
);

-- ─── 4. CREAR PROFILES ──────────────────────────────────────────────────────

INSERT INTO profiles (
  id,
  username,
  is_pro,
  onboarding_completed,
  notifications_enabled,
  notification_time,
  streak_days,
  xp,
  theme,
  created_at,
  updated_at
) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'usuario_pro',
  true,   -- PRO: acceso completo
  true,   -- skip onboarding
  true,
  '09:00:00',
  7,
  450,
  'system',
  now(),
  now()
),
(
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  'usuario_free',
  false,  -- FREE: acceso limitado
  true,   -- skip onboarding
  true,
  '09:00:00',
  0,
  0,
  'system',
  now(),
  now()
);

-- ─── 5. PLANTAS — Usuario PRO (2 plantas) ───────────────────────────────────

INSERT INTO plants (
  id, user_id, name, genetics, genetic_type, sex,
  start_date, flora_start_date,
  location, pot_count, pot_volume_liters,
  nutrition_table_id, available_products,
  status, notes,
  created_at, updated_at
) VALUES
-- Planta 1: Feminizada en floración
(
  'aa000001-0000-0000-0000-000000000001'::uuid,
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'White Widow #1',
  'White Widow',
  'feminized',
  'female',
  (current_date - interval '70 days'),
  (current_date - interval '28 days'),  -- Flora semana 4
  'indoor',
  1,
  11,
  'revegetar',
  '{}',
  'active',
  'Planta de prueba — usuario PRO',
  now(), now()
),
-- Planta 2: Autofloreciente en crecimiento
(
  'aa000002-0000-0000-0000-000000000002'::uuid,
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'Northern Lights Auto',
  'Northern Lights Auto',
  'autoflower',
  'female',
  (current_date - interval '20 days'),
  null,
  'indoor',
  2,
  11,
  'revegetar',
  '{}',
  'active',
  'Auto de prueba — usuario PRO',
  now(), now()
);

-- ─── 6. PLANTA — Usuario FREE (1 planta) ────────────────────────────────────

INSERT INTO plants (
  id, user_id, name, genetics, genetic_type, sex,
  start_date, flora_start_date,
  location, pot_count, pot_volume_liters,
  nutrition_table_id, available_products,
  status, notes,
  created_at, updated_at
) VALUES
(
  'bb000001-0000-0000-0000-000000000003'::uuid,
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  'Critical Auto',
  'Critical Auto',
  'autoflower',
  'female',
  (current_date - interval '10 days'),
  null,
  'indoor',
  1,
  11,
  'revegetar',
  '{}',
  'active',
  'Planta de prueba — usuario FREE',
  now(), now()
);

-- ─── 7. TAREAS DE HOY (para ver algo en home) ───────────────────────────────

INSERT INTO scheduled_tasks (
  id, user_id, plant_id,
  type, scheduled_date, cycle, week, stage,
  products, ec_min, ec_max, ph_min, ph_max,
  completed
) VALUES
-- Tarea hoy: nutricion para White Widow (flora semana 4)
(
  gen_random_uuid(),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'aa000001-0000-0000-0000-000000000001'::uuid,
  'nutrition', current_date, 'flora', 4, 'F4 - Engorde',
  '[{"name":"BIO-BLOOM","line":"BIO","minDose":2,"maxDose":3}]'::jsonb,
  1.2, 1.4, 6.0, 6.5, false
),
-- Tarea hoy: riego para White Widow
(
  gen_random_uuid(),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'aa000001-0000-0000-0000-000000000001'::uuid,
  'irrigation', current_date, 'flora', 4, 'F4 - Engorde',
  '[]'::jsonb,
  1.2, 1.4, 6.0, 6.5, false
),
-- Tarea hoy: nutricion para Northern Lights Auto (vege semana 3)
(
  gen_random_uuid(),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'aa000002-0000-0000-0000-000000000002'::uuid,
  'nutrition', current_date, 'vege', 3, 'S3 - Crecimiento',
  '[{"name":"BIO-GROW","line":"BIO","minDose":1,"maxDose":2}]'::jsonb,
  0.6, 0.8, 5.5, 6.0, false
),
-- Tarea hoy: nutricion para Critical Auto (vege semana 1)
(
  gen_random_uuid(),
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  'bb000001-0000-0000-0000-000000000003'::uuid,
  'nutrition', current_date, 'vege', 1, 'S1 - Enraizado',
  '[{"name":"BIO-ROOT","line":"BIO","minDose":1,"maxDose":1}]'::jsonb,
  0.4, 0.6, 5.5, 6.0, false
);

COMMIT;

-- ─── VERIFICACION ────────────────────────────────────────────────────────────

SELECT 'auth.users' AS tabla, count(*) FROM auth.users WHERE email LIKE '%cannatrack.test%'
UNION ALL
SELECT 'profiles', count(*) FROM profiles
UNION ALL
SELECT 'plants', count(*) FROM plants
UNION ALL
SELECT 'scheduled_tasks (hoy)', count(*) FROM scheduled_tasks WHERE scheduled_date = current_date;
