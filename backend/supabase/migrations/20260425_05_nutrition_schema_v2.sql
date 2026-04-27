-- CannaTrack: Nutrition v2 — seed REVEGETAR + write policies for custom tables
-- Compatible with 07_nutrition_tables.sql schema (brand_id, creator_id, notes)

-- ────────────────────────────────────────────────────────────────────────
-- REVEGETAR table entry
-- ────────────────────────────────────────────────────────────────────────
insert into nutrition_tables (id, name, brand_id, access_tier, is_official, notes)
values (
  'revegetar-v1',
  'REVEGETAR — Tabla Nutricional Oficial',
  'revegetar',
  'free',
  true,
  'Tabla nutricional oficial REVEGETAR con líneas BIO, FUEL, LIFE y ECO'
)
on conflict (id) do update set
  brand_id    = excluded.brand_id,
  is_official = excluded.is_official,
  access_tier = excluded.access_tier,
  name        = excluded.name;

-- ────────────────────────────────────────────────────────────────────────
-- Lines
-- ────────────────────────────────────────────────────────────────────────
insert into nutrition_lines (table_id, line_code, line_name, color_class) values
  ('revegetar-v1','BIO',  'BIO',  'text-green-700'),
  ('revegetar-v1','FUEL', 'FUEL', 'text-blue-700'),
  ('revegetar-v1','LIFE', 'LIFE', 'text-violet-700'),
  ('revegetar-v1','ECO',  'ECO',  'text-amber-700')
on conflict (table_id, line_code) do nothing;

-- ────────────────────────────────────────────────────────────────────────
-- Weeks (delete + re-insert for idempotency)
-- ────────────────────────────────────────────────────────────────────────
delete from nutrition_weeks where table_id = 'revegetar-v1';

insert into nutrition_weeks (table_id, cycle, week, stage, ec_min, ec_max, ph_min, ph_max, day_start, day_end)
values
  ('revegetar-v1','vege',0,'rooting',   0.4,0.6, 5.5,6.0,  0,  7),
  ('revegetar-v1','vege',1,'rooting',   0.4,0.6, 5.5,6.0,  7, 14),
  ('revegetar-v1','vege',2,'growth',    0.6,0.8, 5.5,6.0, 14, 21),
  ('revegetar-v1','vege',3,'growth',    0.6,0.8, 5.5,6.0, 21, 28),
  ('revegetar-v1','vege',4,'preflower', 0.8,1.0, 5.5,6.0, 28, 35),
  ('revegetar-v1','vege',5,'preflower', 0.8,1.0, 5.5,6.0, 35, 42),
  ('revegetar-v1','flora',1,'stretch',  1.0,1.2, 6.0,6.5,  0,  7),
  ('revegetar-v1','flora',2,'stretch',  1.0,1.2, 6.0,6.5,  7, 14),
  ('revegetar-v1','flora',3,'bulking',  1.2,1.4, 6.0,6.5, 14, 21),
  ('revegetar-v1','flora',4,'bulking',  1.2,1.4, 6.0,6.5, 21, 28),
  ('revegetar-v1','flora',5,'ripening', 1.4,1.6, 6.0,6.5, 28, 35),
  ('revegetar-v1','flora',6,'ripening', 1.4,1.6, 6.0,6.5, 35, 42),
  ('revegetar-v1','flora',7,'flushing', 0.0,0.4, 6.0,6.5, 42, 49),
  ('revegetar-v1','flora',8,'flushing', 0.0,0.4, 6.0,6.5, 49, 56);

-- ────────────────────────────────────────────────────────────────────────
-- Products (via CTE to resolve week IDs)
-- ────────────────────────────────────────────────────────────────────────
with w as (select id, cycle, week from nutrition_weeks where table_id = 'revegetar-v1')
insert into nutrition_products (week_id, product_name, line_code, unit, min_dose, max_dose)
select w.id, p.product_name, p.line_code, p.unit, p.min_dose, p.max_dose
from w
join (values
  ('vege',0,'Rootproof',        'BIO', 'ml',1,    2   ),
  ('vege',0,'Starter',          'FUEL','gr',0.25,  1   ),
  ('vege',0,'Bacillus Subtilis','LIFE','ml',10,    50  ),
  ('vege',1,'Rootproof',        'BIO', 'ml',1,    2   ),
  ('vege',1,'Bacillus Subtilis','LIFE','ml',10,    50  ),
  ('vege',2,'Rootproof',        'BIO', 'ml',3,    5   ),
  ('vege',2,'Calcium',          'BIO', 'ml',0.25,  1  ),
  ('vege',2,'Growth',           'FUEL','gr',0.25,  1  ),
  ('vege',2,'Azospirilum',      'LIFE','ml',10,    50 ),
  ('vege',2,'Humus Liquido',    'ECO', 'ml',25,    25 ),
  ('vege',3,'Rootproof',        'BIO', 'ml',3,    5   ),
  ('vege',3,'Aminoblaster',     'BIO', 'gr',0.5,   2  ),
  ('vege',3,'Factor H',         'BIO', 'ml',1,    5   ),
  ('vege',3,'Calcium',          'BIO', 'ml',0.25,  1  ),
  ('vege',3,'Growth',           'FUEL','gr',0.25,  1  ),
  ('vege',3,'Trichoderma',      'LIFE','gr',1,    5   ),
  ('vege',3,'Humus Liquido',    'ECO', 'ml',25,    25 ),
  ('vege',3,'Melaza+Miel',      'ECO', 'gr',2.5,   5  ),
  ('vege',4,'Factor H',         'BIO', 'ml',1,    5   ),
  ('vege',4,'PH-10',            'BIO', 'ml',1,    5   ),
  ('vege',4,'Balance',          'FUEL','gr',0.25,  1  ),
  ('vege',4,'Calcium',          'BIO', 'ml',0.25,  1  ),
  ('vege',4,'Trichoderma',      'LIFE','gr',1,    5   ),
  ('vege',4,'Melaza+Miel',      'ECO', 'gr',2.5,   5  ),
  ('vege',5,'Factor H',         'BIO', 'ml',1,    5   ),
  ('vege',5,'PH-10',            'BIO', 'ml',1,    5   ),
  ('vege',5,'Balance',          'FUEL','gr',0.25,  1  ),
  ('vege',5,'Vital Juice',      'BIO', 'ml',1,    5   ),
  ('flora',1,'Early Blossom',   'FUEL','gr',0.25,  1  ),
  ('flora',1,'Vital Juice',     'BIO', 'ml',1,    5   ),
  ('flora',1,'Humus Liquido',   'ECO', 'ml',50,    50 ),
  ('flora',1,'Bacillus Subtilis','LIFE','ml',10,   50 ),
  ('flora',1,'Factor H',        'BIO', 'ml',1,    5   ),
  ('flora',1,'PH-10',           'BIO', 'ml',1,    5   ),
  ('flora',1,'Aminoblaster',    'BIO', 'gr',0.5,   2  ),
  ('flora',2,'Early Blossom',   'FUEL','gr',0.25,  1  ),
  ('flora',2,'Vital Juice',     'BIO', 'ml',1,    5   ),
  ('flora',2,'Factor H',        'BIO', 'ml',1,    5   ),
  ('flora',2,'PH-10',           'BIO', 'ml',1,    5   ),
  ('flora',3,'Middle Blossom',  'FUEL','gr',0.25,  1  ),
  ('flora',3,'N-Bloom',         'BIO', 'ml',0.5,   2  ),
  ('flora',3,'Aminoblaster',    'BIO', 'gr',0.5,   2  ),
  ('flora',3,'Factor H',        'BIO', 'ml',1,    5   ),
  ('flora',3,'Calcium',         'BIO', 'ml',0.25,  1  ),
  ('flora',3,'Bacillus Subtilis','LIFE','ml',10,   50 ),
  ('flora',4,'Middle Blossom',  'FUEL','gr',0.25,  1  ),
  ('flora',4,'N-Bloom',         'BIO', 'ml',0.5,   2  ),
  ('flora',4,'Factor H',        'BIO', 'ml',1,    5   ),
  ('flora',4,'Calcium',         'BIO', 'ml',0.25,  1  ),
  ('flora',5,'Late Blossom',    'FUEL','gr',0.25,  1  ),
  ('flora',5,'N-Bloom',         'BIO', 'ml',1,    5   ),
  ('flora',5,'Factor H',        'BIO', 'ml',1,    5   ),
  ('flora',6,'Late Blossom',    'FUEL','gr',0.25,  1  ),
  ('flora',6,'N-Bloom',         'BIO', 'ml',1,    5   )
) as p(cycle, week, product_name, line_code, unit, min_dose, max_dose)
  on w.cycle = p.cycle and w.week = p.week;

-- ────────────────────────────────────────────────────────────────────────
-- Write policies for custom tables (any authenticated user can create)
-- ────────────────────────────────────────────────────────────────────────
drop policy if exists "nutrition_tables: insert own" on nutrition_tables;
create policy "nutrition_tables: insert own" on nutrition_tables
  for insert with check (auth.uid() = creator_id);

drop policy if exists "nutrition_lines: insert own" on nutrition_lines;
create policy "nutrition_lines: insert own" on nutrition_lines
  for insert with check (
    exists (select 1 from nutrition_tables nt where nt.id = table_id and nt.creator_id = auth.uid())
  );

drop policy if exists "nutrition_weeks: insert own" on nutrition_weeks;
create policy "nutrition_weeks: insert own" on nutrition_weeks
  for insert with check (
    exists (select 1 from nutrition_tables nt where nt.id = table_id and nt.creator_id = auth.uid())
  );

drop policy if exists "nutrition_products: insert own" on nutrition_products;
create policy "nutrition_products: insert own" on nutrition_products
  for insert with check (
    exists (
      select 1 from nutrition_weeks nw
      join nutrition_tables nt on nt.id = nw.table_id
      where nw.id = week_id and nt.creator_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- ROLLBACK:
-- delete from nutrition_products where week_id in (select id from nutrition_weeks where table_id = 'revegetar-v1');
-- delete from nutrition_weeks where table_id = 'revegetar-v1';
-- delete from nutrition_lines where table_id = 'revegetar-v1';
-- delete from nutrition_tables where id = 'revegetar-v1';
-- ────────────────────────────────────────────────────────────────────────
