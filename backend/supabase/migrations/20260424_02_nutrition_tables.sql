-- CannaTrack: Tablas nutricionales con seed REVEGETAR
-- Rollback: DELETE FROM nutrition_products WHERE table_id = 'revegetar'; DELETE FROM nutrition_weeks WHERE table_id = 'revegetar'; DROP TABLE IF EXISTS nutrition_products CASCADE; DROP TABLE IF EXISTS nutrition_weeks CASCADE; DROP TABLE IF EXISTS nutrition_tables CASCADE;

-- ────────────────────────────────────────────────────────────────────────
-- NUTRITION_TABLES — Catálogo de marcas/tablas
-- ────────────────────────────────────────────────────────────────────────
create table if not exists nutrition_tables (
  id           text primary key,
  name         text not null,
  brand        text not null,
  description  text,
  free_plan    boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table nutrition_tables is 'Tablas nutricionales por marca (REVEGETAR, etc)';

insert into nutrition_tables (id, name, brand, description, free_plan)
values (
  'revegetar',
  'Tabla REVEGETAR',
  'REVEGETAR',
  'Tabla nutricional oficial REVEGETAR con 4 líneas de productos',
  true
)
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────────────────
-- NUTRITION_WEEKS — Semanas del ciclo nutricional
-- ────────────────────────────────────────────────────────────────────────
create table if not exists nutrition_weeks (
  id            uuid primary key default gen_random_uuid(),
  table_id      text references nutrition_tables (id) on delete cascade not null,
  cycle         text not null check (cycle in ('vege', 'flora')),
  week          int not null,
  stage         text not null,
  ec_min        numeric not null,
  ec_max        numeric not null,
  ph_min        numeric not null,
  ph_max        numeric not null,
  duration_days int not null,
  created_at    timestamptz default now(),
  unique (table_id, cycle, week)
);

comment on table nutrition_weeks is 'Semanas del ciclo nutricional (vege/flora)';

-- RLS
alter table nutrition_tables enable row level security;
alter table nutrition_weeks enable row level security;

create policy "nutrition_tables: public read" on nutrition_tables
  for select using (true);

create policy "nutrition_weeks: public read" on nutrition_weeks
  for select using (true);

create index if not exists idx_nutrition_weeks_table on nutrition_weeks (table_id);

-- ────────────────────────────────────────────────────────────────────────
-- NUTRITION_PRODUCTS — Productos de cada tabla
-- ────────────────────────────────────────────────────────────────────────
create table if not exists nutrition_products (
  id              uuid primary key default gen_random_uuid(),
  table_id        text references nutrition_tables (id) on delete cascade not null,
  line            text not null,
  product_name    text not null,
  doses_per_week  int not null,
  min_dose_ml     numeric,
  max_dose_ml     numeric,
  description     text,
  created_at      timestamptz default now(),
  unique (table_id, line, product_name)
);

comment on table nutrition_products is 'Productos de cada tabla nutricional por línea (BIO, ECO, LIFE, FUEL)';

-- RLS
alter table nutrition_products enable row level security;

create policy "nutrition_products: public read" on nutrition_products
  for select using (true);

create index if not exists idx_nutrition_products_table on nutrition_products (table_id, line);

-- ────────────────────────────────────────────────────────────────────────
-- SEED: REVEGETAR TABLA NUTRICIONAL
-- ────────────────────────────────────────────────────────────────────────

-- Ciclo VEGETATIVO (6 semanas)
insert into nutrition_weeks (table_id, cycle, week, stage, ec_min, ec_max, ph_min, ph_max, duration_days)
values
  ('revegetar', 'vege', 1, 'S1 - Enraizado',        0.4, 0.6, 5.5, 6.0, 7),
  ('revegetar', 'vege', 2, 'S2 - Enraizado',        0.5, 0.7, 5.5, 6.0, 7),
  ('revegetar', 'vege', 3, 'S3 - Crecimiento',      0.6, 0.8, 5.5, 6.0, 7),
  ('revegetar', 'vege', 4, 'S4 - Crecimiento',      0.7, 0.9, 5.5, 6.0, 7),
  ('revegetar', 'vege', 5, 'S5 - Prefloración',     0.8, 1.0, 5.5, 6.0, 7),
  ('revegetar', 'vege', 6, 'S6 - Prefloración',     0.9, 1.1, 5.5, 6.0, 7)
on conflict (table_id, cycle, week) do nothing;

-- Ciclo FLORACIÓN (8 semanas)
insert into nutrition_weeks (table_id, cycle, week, stage, ec_min, ec_max, ph_min, ph_max, duration_days)
values
  ('revegetar', 'flora', 1, 'F1 - Estiramiento',    1.0, 1.2, 6.0, 6.5, 7),
  ('revegetar', 'flora', 2, 'F2 - Estiramiento',    1.0, 1.2, 6.0, 6.5, 7),
  ('revegetar', 'flora', 3, 'F3 - Engorde',         1.1, 1.3, 6.0, 6.5, 7),
  ('revegetar', 'flora', 4, 'F4 - Engorde',         1.2, 1.4, 6.0, 6.5, 7),
  ('revegetar', 'flora', 5, 'F5 - Maduración',      1.3, 1.5, 6.0, 6.5, 7),
  ('revegetar', 'flora', 6, 'F6 - Maduración',      1.4, 1.6, 6.0, 6.5, 7),
  ('revegetar', 'flora', 7, 'F7 - Limpieza',        0.2, 0.4, 6.0, 6.5, 7),
  ('revegetar', 'flora', 8, 'F8 - Limpieza',        0.0, 0.2, 6.0, 6.5, 7)
on conflict (table_id, cycle, week) do nothing;

-- REVEGETAR BIO — Línea ecológica
insert into nutrition_products (table_id, line, product_name, doses_per_week, min_dose_ml, max_dose_ml, description)
values
  ('revegetar', 'BIO', 'BIO Raíces', 1, 5, 10, 'Bioestimulante radical'),
  ('revegetar', 'BIO', 'BIO Vege', 2, 10, 15, 'Nutrientes vegetativos'),
  ('revegetar', 'BIO', 'BIO Flores', 2, 12, 18, 'Nutrientes florales'),
  ('revegetar', 'BIO', 'BIO Calcium', 1, 5, 8, 'Fuente de calcio'),
  ('revegetar', 'BIO', 'BIO Enzimas', 1, 3, 5, 'Enzimas benéficas')
on conflict (table_id, line, product_name) do nothing;

-- REVEGETAR ECO — Abonos orgánicos
insert into nutrition_products (table_id, line, product_name, doses_per_week, min_dose_ml, max_dose_ml, description)
values
  ('revegetar', 'ECO', 'ECO Compost', 1, 20, 30, 'Materia orgánica enriquecida'),
  ('revegetar', 'ECO', 'ECO Guano', 1, 10, 15, 'Guano de aves'),
  ('revegetar', 'ECO', 'ECO Humus', 2, 15, 20, 'Humus de lombriz'),
  ('revegetar', 'ECO', 'ECO Kelp', 1, 5, 8, 'Extracto de algas')
on conflict (table_id, line, product_name) do nothing;

-- REVEGETAR LIFE — Controladores biológicos
insert into nutrition_products (table_id, line, product_name, doses_per_week, min_dose_ml, max_dose_ml, description)
values
  ('revegetar', 'LIFE', 'LIFE Hongos', 1, 5, 10, 'Micorrizas beneficiosas'),
  ('revegetar', 'LIFE', 'LIFE Bacterias', 1, 5, 10, 'Bacterias promotoras'),
  ('revegetar', 'LIFE', 'LIFE Praying Mantis', 1, 0, 5, 'Insectos depredadores'),
  ('revegetar', 'LIFE', 'LIFE Neem', 1, 5, 10, 'Aceite de neem orgánico')
on conflict (table_id, line, product_name) do nothing;

-- REVEGETAR FUEL — Bases nutritivas minerales
insert into nutrition_products (table_id, line, product_name, doses_per_week, min_dose_ml, max_dose_ml, description)
values
  ('revegetar', 'FUEL', 'FUEL Base A', 2, 8, 12, 'Base mineral parte A'),
  ('revegetar', 'FUEL', 'FUEL Base B', 2, 8, 12, 'Base mineral parte B'),
  ('revegetar', 'FUEL', 'FUEL PK', 2, 5, 8, 'Potasio y fósforo'),
  ('revegetar', 'FUEL', 'FUEL Boost', 1, 3, 5, 'Estimulador de floración')
on conflict (table_id, line, product_name) do nothing;
