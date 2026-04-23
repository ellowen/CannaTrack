-- Populación inicial de tablas nutricionales
-- Inserta REVEGETAR y TOP CROP con todos sus productos

-- ============================================================================
-- REVEGETAR — Tabla de Cultivo (marca oficial, plan Free)
-- ============================================================================

insert into nutrition_tables (id, brand_id, name, access_tier, is_official, notes)
values ('revegetar-v1', 'revegetar', 'REVEGETAR — Tabla Nutricional Oficial', 'free', true, null)
on conflict (id) do nothing;

-- Líneas REVEGETAR: BIO, FUEL, LIFE, ECO
insert into nutrition_lines (table_id, line_code, line_name, color_class)
values
  ('revegetar-v1', 'BIO',  'BIO',  'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-900/60'),
  ('revegetar-v1', 'FUEL', 'FUEL', 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/60'),
  ('revegetar-v1', 'LIFE', 'LIFE', 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/40 dark:border-violet-900/60'),
  ('revegetar-v1', 'ECO',  'ECO',  'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/60')
on conflict (table_id, line_code) do nothing;

-- ─── Semanas REVEGETAR — VEGE (0-5)
insert into nutrition_weeks (table_id, cycle, week, stage, day_start, day_end, ec_min, ec_max, ph_min, ph_max)
values
  ('revegetar-v1', 'vege', 0, 'rooting',    0,  7, 0.40, 0.60, 5.5, 6.0),
  ('revegetar-v1', 'vege', 1, 'rooting',    7, 14, 0.40, 0.60, 5.5, 6.0),
  ('revegetar-v1', 'vege', 2, 'growth',    14, 21, 0.60, 0.80, 5.5, 6.0),
  ('revegetar-v1', 'vege', 3, 'growth',    21, 28, 0.60, 0.80, 5.5, 6.0),
  ('revegetar-v1', 'vege', 4, 'preflower', 28, 35, 0.80, 1.00, 5.5, 6.0),
  ('revegetar-v1', 'vege', 5, 'preflower', 35, 42, 0.80, 1.00, 5.5, 6.0)
on conflict (table_id, cycle, week) do nothing;

-- ─── Semanas REVEGETAR — FLORA (1-8)
insert into nutrition_weeks (table_id, cycle, week, stage, day_start, day_end, ec_min, ec_max, ph_min, ph_max)
values
  ('revegetar-v1', 'flora', 1, 'stretch',   0,  7, 1.00, 1.20, 6.0, 6.5),
  ('revegetar-v1', 'flora', 2, 'stretch',   7, 14, 1.00, 1.20, 6.0, 6.5),
  ('revegetar-v1', 'flora', 3, 'bulking',  14, 21, 1.20, 1.40, 6.0, 6.5),
  ('revegetar-v1', 'flora', 4, 'bulking',  21, 28, 1.20, 1.40, 6.0, 6.5),
  ('revegetar-v1', 'flora', 5, 'ripening', 28, 35, 1.40, 1.60, 6.0, 6.5),
  ('revegetar-v1', 'flora', 6, 'ripening', 35, 42, 1.40, 1.60, 6.0, 6.5),
  ('revegetar-v1', 'flora', 7, 'flushing', 42, 49, 0.00, 0.40, 6.0, 6.5),
  ('revegetar-v1', 'flora', 8, 'flushing', 49, 56, 0.00, 0.40, 6.0, 6.5)
on conflict (table_id, cycle, week) do nothing;

-- ─── Productos REVEGETAR — VEGE
-- Vege 0 (rooting): Rootproof, Starter, Bacillus Subtilis
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=0), 'Rootproof', 'BIO', 'ml', 1.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=0), 'Starter', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=0), 'Bacillus Subtilis', 'LIFE', 'ml', 10.00, 50.00
on conflict do nothing;

-- Vege 1 (rooting): Rootproof, Bacillus Subtilis
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=1), 'Rootproof', 'BIO', 'ml', 1.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=1), 'Bacillus Subtilis', 'LIFE', 'ml', 10.00, 50.00
on conflict do nothing;

-- Vege 2 (growth): Rootproof, Calcium, Growth, Azospirilum, Humus Líquido
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=2), 'Rootproof', 'BIO', 'ml', 3.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=2), 'Calcium', 'BIO', 'ml', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=2), 'Growth', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=2), 'Azospirilum', 'LIFE', 'ml', 10.00, 50.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=2), 'Humus Líquido', 'ECO', 'ml', 25.00, 25.00
on conflict do nothing;

-- Vege 3 (growth): Rootproof, Aminoblaster, Factor H, Calcium, Growth, Trichoderma, Humus Líquido, Melaza+Miel
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Rootproof', 'BIO', 'ml', 3.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Aminoblaster', 'BIO', 'gr', 0.50, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Calcium', 'BIO', 'ml', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Growth', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Trichoderma', 'LIFE', 'gr', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Humus Líquido', 'ECO', 'ml', 25.00, 25.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=3), 'Melaza+Miel', 'ECO', 'gr', 2.50, 5.00
on conflict do nothing;

-- Vege 4 (preflower): Factor H, PH-10, Balance, Calcium, Trichoderma, Melaza+Miel
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=4), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=4), 'PH-10', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=4), 'Balance', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=4), 'Calcium', 'BIO', 'ml', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=4), 'Trichoderma', 'LIFE', 'gr', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=4), 'Melaza+Miel', 'ECO', 'gr', 2.50, 5.00
on conflict do nothing;

-- Vege 5 (preflower): Factor H, PH-10, Balance, Vital Juice
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=5), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=5), 'PH-10', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=5), 'Balance', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='vege' and week=5), 'Vital Juice', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;

-- ─── Productos REVEGETAR — FLORA
-- Flora 1 (stretch): Early Blossom, Vital Juice, Humus Líquido, Bacillus Subtilis, Factor H, PH-10, Aminoblaster
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'Early Blossom', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'Vital Juice', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'Humus Líquido', 'ECO', 'ml', 50.00, 50.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'Bacillus Subtilis', 'LIFE', 'ml', 10.00, 50.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'PH-10', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=1), 'Aminoblaster', 'BIO', 'gr', 0.50, 2.00
on conflict do nothing;

-- Flora 2 (stretch): Early Blossom, Vital Juice, Factor H, PH-10
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=2), 'Early Blossom', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=2), 'Vital Juice', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=2), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=2), 'PH-10', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;

-- Flora 3 (bulking): Middle Blossom, N-Bloom, Aminoblaster, Factor H, Calcium, Bacillus Subtilis
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=3), 'Middle Blossom', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=3), 'N-Bloom', 'BIO', 'ml', 0.50, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=3), 'Aminoblaster', 'BIO', 'gr', 0.50, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=3), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=3), 'Calcium', 'BIO', 'ml', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=3), 'Bacillus Subtilis', 'LIFE', 'ml', 10.00, 50.00
on conflict do nothing;

-- Flora 4 (bulking): Middle Blossom, N-Bloom, Factor H, Calcium
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=4), 'Middle Blossom', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=4), 'N-Bloom', 'BIO', 'ml', 0.50, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=4), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=4), 'Calcium', 'BIO', 'ml', 0.25, 1.00
on conflict do nothing;

-- Flora 5 (ripening): Late Blossom, N-Bloom, Factor H
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=5), 'Late Blossom', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=5), 'N-Bloom', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=5), 'Factor H', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;

-- Flora 6 (ripening): Late Blossom, N-Bloom
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=6), 'Late Blossom', 'FUEL', 'gr', 0.25, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='revegetar-v1' and cycle='flora' and week=6), 'N-Bloom', 'BIO', 'ml', 1.00, 5.00
on conflict do nothing;

-- Flora 7 (flushing): sin productos
-- Flora 8 (flushing): sin productos

-- ============================================================================
-- TOP CROP — Tabla de Cultivo (marca oficial, plan Free)
-- ============================================================================

insert into nutrition_tables (id, brand_id, name, access_tier, is_official, notes)
values ('topcrop-v1', 'topcrop', 'Top Crop — Tabla de Cultivo', 'free', true, 'Dosis orientativas — consultá con tu proveedor. Las semanas de crecimiento son repetibles: si alargás vege, mantené la dosis de la última semana.')
on conflict (id) do nothing;

-- Líneas TOP CROP: PRO, MID, BASIC
insert into nutrition_lines (table_id, line_code, line_name, color_class)
values
  ('topcrop-v1', 'PRO',   'Pro',    'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-900/60'),
  ('topcrop-v1', 'MID',   'Medio',  'text-pink-700 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-950/40 dark:border-pink-900/60'),
  ('topcrop-v1', 'BASIC', 'Básica', 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900/60')
on conflict (table_id, line_code) do nothing;

-- ─── Semanas TOP CROP — VEGE (0-5)
insert into nutrition_weeks (table_id, cycle, week, stage, day_start, day_end, ec_min, ec_max, ph_min, ph_max)
values
  ('topcrop-v1', 'vege', 0, 'rooting',    0,  7, 0.40, 0.60, 5.5, 6.0),
  ('topcrop-v1', 'vege', 1, 'rooting',    7, 14, 0.40, 0.60, 5.5, 6.0),
  ('topcrop-v1', 'vege', 2, 'growth',    14, 21, 0.60, 0.80, 5.5, 6.0),
  ('topcrop-v1', 'vege', 3, 'growth',    21, 28, 0.60, 0.80, 5.5, 6.0),
  ('topcrop-v1', 'vege', 4, 'preflower', 28, 35, 0.80, 1.00, 5.5, 6.0),
  ('topcrop-v1', 'vege', 5, 'preflower', 35, 42, 0.80, 1.00, 5.5, 6.0)
on conflict (table_id, cycle, week) do nothing;

-- ─── Semanas TOP CROP — FLORA (1-8)
insert into nutrition_weeks (table_id, cycle, week, stage, day_start, day_end, ec_min, ec_max, ph_min, ph_max)
values
  ('topcrop-v1', 'flora', 1, 'stretch',   0,  7, 1.00, 1.20, 6.0, 6.5),
  ('topcrop-v1', 'flora', 2, 'stretch',   7, 14, 1.00, 1.20, 6.0, 6.5),
  ('topcrop-v1', 'flora', 3, 'bulking',  14, 21, 1.20, 1.40, 6.0, 6.5),
  ('topcrop-v1', 'flora', 4, 'bulking',  21, 28, 1.20, 1.40, 6.0, 6.5),
  ('topcrop-v1', 'flora', 5, 'ripening', 28, 35, 1.40, 1.60, 6.0, 6.5),
  ('topcrop-v1', 'flora', 6, 'ripening', 35, 42, 1.40, 1.60, 6.0, 6.5),
  ('topcrop-v1', 'flora', 7, 'flushing', 42, 49, 0.00, 0.40, 6.0, 6.5),
  ('topcrop-v1', 'flora', 8, 'flushing', 49, 56, 0.00, 0.40, 6.0, 6.5)
on conflict (table_id, cycle, week) do nothing;

-- ─── Productos TOP CROP — VEGE
-- Vege 0 (rooting): Deeper Underground
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=0), 'Deeper Underground', 'BASIC', 'ml', 0.67, 1.33
on conflict do nothing;

-- Vege 1 (rooting): Deeper Underground
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=1), 'Deeper Underground', 'BASIC', 'ml', 0.67, 1.33
on conflict do nothing;

-- Vege 2 (growth): TopVeg
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=2), 'TopVeg', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;

-- Vege 3 (growth): TopVeg, Big One, Maprics
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=3), 'TopVeg', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=3), 'Big One', 'MID', 'ml', 2.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=3), 'Maprics', 'MID', 'ml', 0.50, 0.50
on conflict do nothing;

-- Vege 4 (preflower): TopVeg, Maprics
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=4), 'TopVeg', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=4), 'Maprics', 'MID', 'ml', 0.50, 0.50
on conflict do nothing;

-- Vege 5 (preflower): TopVeg, Big One
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=5), 'TopVeg', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='vege' and week=5), 'Big One', 'MID', 'ml', 2.00, 2.00
on conflict do nothing;

-- ─── Productos TOP CROP — FLORA
-- Flora 1 (stretch): Top Bloom, Big One
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=1), 'Top Bloom', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=1), 'Big One', 'MID', 'ml', 2.00, 2.00
on conflict do nothing;

-- Flora 2 (stretch): Top Bloom, Top Candy
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=2), 'Top Bloom', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=2), 'Top Candy', 'MID', 'ml', 1.00, 2.00
on conflict do nothing;

-- Flora 3 (bulking): Top Bloom, Big One, Top Candy
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=3), 'Top Bloom', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=3), 'Big One', 'MID', 'ml', 2.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=3), 'Top Candy', 'MID', 'ml', 1.00, 2.00
on conflict do nothing;

-- Flora 4 (bulking): Top Bloom, Top Candy, Maprics, Top Bud
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=4), 'Top Bloom', 'PRO', 'ml', 2.00, 4.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=4), 'Top Candy', 'MID', 'ml', 1.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=4), 'Maprics', 'MID', 'ml', 0.50, 0.50
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=4), 'Top Bud', 'MID', 'ml', 0.50, 1.00
on conflict do nothing;

-- Flora 5 (ripening): Big One, Top Candy, Top Bud
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=5), 'Big One', 'MID', 'ml', 2.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=5), 'Top Candy', 'MID', 'ml', 1.00, 2.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=5), 'Top Bud', 'MID', 'ml', 0.50, 1.00
on conflict do nothing;

-- Flora 6 (ripening): Top Bud, Big One
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=6), 'Top Bud', 'MID', 'ml', 0.50, 1.00
on conflict do nothing;
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=6), 'Big One', 'MID', 'ml', 2.00, 2.00
on conflict do nothing;

-- Flora 7 (flushing): Top Mega
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select (select id from nutrition_weeks where table_id='topcrop-v1' and cycle='flora' and week=7), 'Top Mega', 'PRO', 'ml', 2.00, 2.00
on conflict do nothing;

-- Flora 8 (flushing): sin productos
