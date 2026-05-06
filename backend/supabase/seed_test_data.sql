-- ============================================================
-- SEED: datos de prueba con UUIDs reales de Supabase Auth
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

BEGIN;

-- ─── LIMPIAR datos previos (sin tocar auth.users) ────────────────────────────

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

-- ─── PROFILES ────────────────────────────────────────────────────────────────

INSERT INTO profiles (
  id, username, is_pro, onboarding_completed,
  notifications_enabled, notification_time,
  streak_days, xp, theme, created_at, updated_at
) VALUES
(
  '33bec4dd-e2b0-407c-b9a5-79fb4df5a213',
  'usuario_pro', true, true, true,
  '09:00:00', 7, 450, 'system', now(), now()
),
(
  '0a54733d-fd04-4b93-bd2b-a996e7cded82',
  'usuario_free', false, true, true,
  '09:00:00', 0, 0, 'system', now(), now()
);

-- ─── PLANTAS — PRO (2 plantas) ────────────────────────────────────────────────

INSERT INTO plants (
  id, user_id, name, genetics, genetic_type, sex,
  start_date, flora_start_date,
  location, pot_count, pot_volume_liters,
  nutrition_table_id, available_products,
  status, notes, created_at, updated_at
) VALUES
(
  'aa000001-0000-0000-0000-000000000001',
  '33bec4dd-e2b0-407c-b9a5-79fb4df5a213',
  'White Widow #1', 'White Widow', 'feminized', 'female',
  (current_date - interval '70 days'),
  (current_date - interval '28 days'),
  'indoor', 1, 11, 'revegetar', '{}',
  'active', 'Planta PRO — flora semana 4', now(), now()
),
(
  'aa000002-0000-0000-0000-000000000002',
  '33bec4dd-e2b0-407c-b9a5-79fb4df5a213',
  'Northern Lights Auto', 'Northern Lights Auto', 'autoflower', 'female',
  (current_date - interval '20 days'),
  null,
  'indoor', 2, 11, 'revegetar', '{}',
  'active', 'Planta PRO — vege semana 3', now(), now()
);

-- ─── PLANTA — FREE (1 planta) ─────────────────────────────────────────────────

INSERT INTO plants (
  id, user_id, name, genetics, genetic_type, sex,
  start_date, flora_start_date,
  location, pot_count, pot_volume_liters,
  nutrition_table_id, available_products,
  status, notes, created_at, updated_at
) VALUES
(
  'bb000001-0000-0000-0000-000000000003',
  '0a54733d-fd04-4b93-bd2b-a996e7cded82',
  'Critical Auto', 'Critical Auto', 'autoflower', 'female',
  (current_date - interval '10 days'),
  null,
  'indoor', 1, 11, 'revegetar', '{}',
  'active', 'Planta FREE — vege semana 1', now(), now()
);

-- ─── TAREAS DE HOY ────────────────────────────────────────────────────────────

INSERT INTO scheduled_tasks (
  id, user_id, plant_id,
  type, scheduled_date, cycle, week, stage,
  products, ec_min, ec_max, ph_min, ph_max, completed
) VALUES
(
  gen_random_uuid(),
  '33bec4dd-e2b0-407c-b9a5-79fb4df5a213',
  'aa000001-0000-0000-0000-000000000001',
  'nutrition', current_date, 'flora', 4, 'F4 - Engorde',
  '[{"name":"BIO-BLOOM","line":"BIO","minDose":2,"maxDose":3}]',
  1.2, 1.4, 6.0, 6.5, false
),
(
  gen_random_uuid(),
  '33bec4dd-e2b0-407c-b9a5-79fb4df5a213',
  'aa000001-0000-0000-0000-000000000001',
  'irrigation', current_date, 'flora', 4, 'F4 - Engorde',
  '[]', 1.2, 1.4, 6.0, 6.5, false
),
(
  gen_random_uuid(),
  '33bec4dd-e2b0-407c-b9a5-79fb4df5a213',
  'aa000002-0000-0000-0000-000000000002',
  'nutrition', current_date, 'vege', 3, 'S3 - Crecimiento',
  '[{"name":"BIO-GROW","line":"BIO","minDose":1,"maxDose":2}]',
  0.6, 0.8, 5.5, 6.0, false
),
(
  gen_random_uuid(),
  '0a54733d-fd04-4b93-bd2b-a996e7cded82',
  'bb000001-0000-0000-0000-000000000003',
  'nutrition', current_date, 'vege', 1, 'S1 - Enraizado',
  '[{"name":"BIO-ROOT","line":"BIO","minDose":1,"maxDose":1}]',
  0.4, 0.6, 5.5, 6.0, false
);

COMMIT;

-- ─── VERIFICACION ─────────────────────────────────────────────────────────────

SELECT 'profiles' AS tabla, count(*) FROM profiles
UNION ALL
SELECT 'plants', count(*) FROM plants
UNION ALL
SELECT 'tasks hoy', count(*) FROM scheduled_tasks WHERE scheduled_date = current_date;
