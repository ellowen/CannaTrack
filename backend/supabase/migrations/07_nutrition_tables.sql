-- Schema para tablas nutricionales
-- Permite agregar nuevas marcas/tablas sin cambiar código

-- Tabla principal de tablas nutricionales
create table if not exists nutrition_tables (
  id text primary key,                -- ej: 'revegetar-v1', 'topcrop-v1'
  brand_id text,                      -- ej: 'revegetar', 'topcrop', null para custom
  name text not null,                 -- ej: 'REVEGETAR — Tabla Nutricional'
  access_tier text not null default 'free',  -- 'free' o 'pro'
  is_official boolean not null default false,
  creator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  notes text,
  unique(id),
  check (access_tier in ('free', 'pro'))
);

-- Líneas de productos (BIO, FUEL, etc.) dentro de cada tabla
create table if not exists nutrition_lines (
  id serial primary key,
  table_id text not null references nutrition_tables(id) on delete cascade,
  line_code text not null,            -- ej: 'BIO', 'FUEL', 'PRO', 'MID', 'BASIC'
  line_name text not null,            -- ej: 'BIO', 'Pro', 'Medio', 'Básica'
  color_class text,                   -- clases Tailwind para UI
  unique(table_id, line_code)
);

-- Semanas del ciclo (vegetativo o floral)
create table if not exists nutrition_weeks (
  id serial primary key,
  table_id text not null references nutrition_tables(id) on delete cascade,
  cycle text not null,                -- 'vege' o 'flora'
  week integer not null,              -- 0-5 para vege, 1-8 para flora
  stage text not null,                -- 'rooting', 'growth', 'preflower', 'stretch', etc.
  day_start integer not null,         -- día del ciclo inicio
  day_end integer not null,           -- día del ciclo fin
  ec_min numeric(4,2),                -- conductividad eléctrica mín
  ec_max numeric(4,2),                -- conductividad eléctrica máx
  ph_min numeric(3,1),
  ph_max numeric(3,1),
  unique(table_id, cycle, week)
);

-- Productos/dosis por semana
create table if not exists nutrition_products (
  id serial primary key,
  week_id integer not null references nutrition_weeks(id) on delete cascade,
  product_name text not null,         -- ej: 'Rootproof', 'TopVeg', 'Big One'
  line_code text not null,            -- referencia a line_code de nutrition_lines
  unit text not null default 'ml',    -- 'ml', 'gr'
  min_dose numeric(4,2) not null,     -- dosis mín por litro
  max_dose numeric(4,2) not null      -- dosis máx por litro
);

-- RLS policies
alter table nutrition_tables enable row level security;
alter table nutrition_lines enable row level security;
alter table nutrition_weeks enable row level security;
alter table nutrition_products enable row level security;

-- Todos pueden leer tablas públicas (is_official o creator_id mismo)
create policy "nutrition_tables: read own or official"
  on nutrition_tables for select
  using (is_official = true or auth.uid() = creator_id);

-- Solo creador puede actualizar/eliminar
create policy "nutrition_tables: update own"
  on nutrition_tables for update
  using (auth.uid() = creator_id and is_official = false);

create policy "nutrition_tables: delete own"
  on nutrition_tables for delete
  using (auth.uid() = creator_id and is_official = false);

-- Tablas relacionadas: heredan permisos de nutrition_tables
create policy "nutrition_lines: read"
  on nutrition_lines for select
  using (table_id in (
    select id from nutrition_tables
    where is_official or auth.uid() = creator_id
  ));

create policy "nutrition_weeks: read"
  on nutrition_weeks for select
  using (table_id in (
    select id from nutrition_tables
    where is_official or auth.uid() = creator_id
  ));

create policy "nutrition_products: read"
  on nutrition_products for select
  using (week_id in (
    select w.id from nutrition_weeks w
    join nutrition_tables t on w.table_id = t.id
    where t.is_official or auth.uid() = t.creator_id
  ));

-- Índices
create index if not exists idx_nutrition_tables_brand on nutrition_tables(brand_id);
create index if not exists idx_nutrition_tables_creator on nutrition_tables(creator_id);
create index if not exists idx_nutrition_lines_table on nutrition_lines(table_id);
create index if not exists idx_nutrition_weeks_table on nutrition_weeks(table_id);
create index if not exists idx_nutrition_products_week on nutrition_products(week_id);
