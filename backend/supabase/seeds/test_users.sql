-- ============================================================
-- SEED: test_users.sql
-- SOLO para entornos dev y staging. NUNCA ejecutar en prod.
--
-- Password de todos los usuarios: Test1234!
-- Emails: test1@cannatrack.dev ... test10@cannatrack.dev
--
-- PASO 1: crear los usuarios en Supabase Auth via Admin API:
--   Ver script: seeds/create_auth_users.sh
--
-- PASO 2: obtener los UUIDs generados y reemplazar abajo,
--   o usar la funcion helper si los UUIDs son predecibles.
-- ============================================================

DO $$
DECLARE
  -- Reemplazar estos UUIDs con los generados por Supabase Auth
  u1  uuid := '00000001-0000-0000-0000-000000000001';
  u2  uuid := '00000002-0000-0000-0000-000000000002';
  u3  uuid := '00000003-0000-0000-0000-000000000003';
  u4  uuid := '00000004-0000-0000-0000-000000000004';
  u5  uuid := '00000005-0000-0000-0000-000000000005';
  u6  uuid := '00000006-0000-0000-0000-000000000006';
  u7  uuid := '00000007-0000-0000-0000-000000000007';
  u8  uuid := '00000008-0000-0000-0000-000000000008';
  u9  uuid := '00000009-0000-0000-0000-000000000009';
  u10 uuid := '00000010-0000-0000-0000-000000000010';
  rev_id text := 'revegetar-v1';
BEGIN

-- Perfiles con is_pro = true (full access para testing)
INSERT INTO profiles (id, username, is_pro, xp, level, streak_days, onboarding_completed, total_plants_grown)
VALUES
  (u1,  'grower_alpha',   true, 2400, 5,  14, true,  3),
  (u2,  'indoor_queen',   true, 1800, 4,  7,  true,  1),
  (u3,  'auto_master',    true, 3200, 6,  30, true,  5),
  (u4,  'tester_flora',   true, 500,  2,  3,  true,  0),
  (u5,  'cannabis_dev',   true, 0,    1,  0,  false, 0),
  (u6,  'hydro_wizard',   true, 4500, 8,  60, true,  8),
  (u7,  'seed_starter',   true, 100,  1,  1,  true,  0),
  (u8,  'harvest_pro',    true, 6000, 10, 90, true,  12),
  (u9,  'multi_grow',     true, 900,  3,  5,  true,  2),
  (u10, 'qa_tester',      true, 0,    1,  0,  true,  0)
ON CONFLICT (id) DO UPDATE SET
  is_pro = EXCLUDED.is_pro,
  username = EXCLUDED.username;

-- Plantas de prueba variadas
INSERT INTO plants (
  user_id, name, genetics, genetic_type, sex,
  start_date, status, location,
  pot_count, pot_volume_liters, nutrition_table_id, notes
)
VALUES
  -- u1: planta en flora semana 3
  (u1, 'White Widow #1', 'White Widow',   'feminized',  'female',
   NOW() - INTERVAL '52 days', 'active', 'indoor', 2, 11, rev_id,
   'Planta de prueba en flora'),

  -- u2: planta en vege semana 3
  (u2, 'Blue Dream',     'Blue Dream',    'feminized',  'female',
   NOW() - INTERVAL '20 days', 'active', 'indoor', 1, 20, rev_id, ''),

  -- u3: autoflower semana 5
  (u3, 'Gorilla Auto',   'Gorilla Glue',  'autoflower', 'female',
   NOW() - INTERVAL '35 days', 'active', 'indoor', 4, 7,  rev_id, ''),

  -- u4: planta recien iniciada
  (u4, 'OG Kush Test',   'OG Kush',       'feminized',  'unknown',
   NOW() - INTERVAL '5 days',  'active', 'outdoor', 1, 15, rev_id, ''),

  -- u6: dos plantas simultaneas
  (u6, 'Purple Haze',    'Purple Haze',   'feminized',  'female',
   NOW() - INTERVAL '60 days', 'active', 'indoor', 3, 11, rev_id, ''),
  (u6, 'Gelato #33',     'Gelato',        'feminized',  'female',
   NOW() - INTERVAL '30 days', 'active', 'indoor', 2, 20, rev_id, ''),

  -- u8: planta cosechada (historial)
  (u8, 'AK-47 (old)',    'AK-47',         'feminized',  'female',
   NOW() - INTERVAL '120 days', 'harvested', 'indoor', 1, 11, rev_id, ''),

  -- u9: multi-planta (test del limite Free)
  (u9, 'Amnesia Auto',   'Amnesia Haze',  'autoflower', 'female',
   NOW() - INTERVAL '28 days', 'active', 'indoor', 2, 11, rev_id, ''),
  (u9, 'Critical+',      'Critical Mass', 'feminized',  'female',
   NOW() - INTERVAL '15 days', 'active', 'indoor', 1, 20, rev_id, '')

ON CONFLICT DO NOTHING;

-- Actualizar flora_start_date para la planta de u1 (lleva 3 semanas en flora)
UPDATE plants
SET flora_start_date = NOW() - INTERVAL '21 days'
WHERE user_id = u1 AND name = 'White Widow #1';

RAISE NOTICE 'Seed completado: 10 usuarios Pro + plantas de prueba insertados';
END $$;
