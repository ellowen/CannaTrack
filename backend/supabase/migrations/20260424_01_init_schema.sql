-- CannaTrack: Schema base (profiles, plants, tasks, measurements, photos)
-- Rollback: DROP TABLE IF EXISTS week_logs CASCADE; DROP TABLE IF EXISTS measurements CASCADE; DROP TABLE IF EXISTS scheduled_tasks CASCADE; DROP TABLE IF EXISTS plants CASCADE; DROP TABLE IF EXISTS profiles CASCADE;

-- Extensiones
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────
-- PROFILES — Extiende auth.users
-- ────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                      uuid primary key references auth.users on delete cascade,
  username                text,
  push_token              text,
  notification_time       time default '09:00:00',
  is_pro                  boolean default false,
  streak_days             int default 0,
  xp                      int default 0,
  theme                   text default 'system' check (theme in ('system', 'light', 'dark')),
  notifications_enabled   boolean default true,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

comment on table profiles is 'Perfil del usuario con gamificación y preferencias';

-- Auto-crear profile cuando se registra un usuario
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;

drop policy if exists "profiles: own" on profiles;
create policy "profiles: own" on profiles
  for all using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────────────
-- PLANTS — Plantas del usuario
-- ────────────────────────────────────────────────────────────────────────
create table if not exists plants (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users on delete cascade not null,
  name                  text not null,
  genetics              text not null,
  genetic_type          text not null check (genetic_type in ('feminized', 'autoflower', 'regular')),
  sex                   text check (sex in ('unknown', 'female', 'male')) default 'unknown',
  start_date            date not null,
  flora_start_date      date,
  auto_flower_total_days int default 75,
  location              text check (location in ('indoor', 'outdoor')) default 'indoor',
  pot_count             int default 1,
  pot_volume_liters     numeric default 11,
  nutrition_table_id    text not null default 'revegetar',
  available_products    text[] default '{}',
  status                text check (status in ('active', 'harvested', 'discarded')) default 'active',
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

comment on table plants is 'Plantas del usuario con ciclo de vida (vege/flora)';

-- RLS
alter table plants enable row level security;

drop policy if exists "plants: own" on plants;
create policy "plants: own" on plants
  for all using (auth.uid() = user_id);

create index if not exists idx_plants_user on plants (user_id);

-- ────────────────────────────────────────────────────────────────────────
-- SCHEDULED_TASKS — Calendario generado desde motor nutricional
-- ────────────────────────────────────────────────────────────────────────
create table if not exists scheduled_tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade not null,
  plant_id        uuid references plants on delete cascade not null,
  type            text not null check (type in ('nutrition', 'irrigation', 'foliar', 'observation', 'harvest')),
  scheduled_date  date not null,
  cycle           text not null check (cycle in ('vege', 'flora')),
  week            int not null,
  stage           text,
  products        jsonb default '[]',
  ec_min          numeric,
  ec_max          numeric,
  ph_min          numeric,
  ph_max          numeric,
  completed       boolean default false,
  completed_at    timestamptz,
  completion_notes text,
  created_at      timestamptz default now()
);

comment on table scheduled_tasks is 'Tareas programadas por el motor nutricional';

-- RLS
alter table scheduled_tasks enable row level security;

drop policy if exists "tasks: own" on scheduled_tasks;
create policy "tasks: own" on scheduled_tasks
  for all using (auth.uid() = user_id);

create index if not exists idx_tasks_user on scheduled_tasks (user_id);
create index if not exists idx_tasks_plant on scheduled_tasks (plant_id);
create index if not exists idx_tasks_date on scheduled_tasks (scheduled_date);

-- ────────────────────────────────────────────────────────────────────────
-- MEASUREMENTS — Historial EC/pH medidos
-- ────────────────────────────────────────────────────────────────────────
create table if not exists measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  plant_id     uuid references plants on delete cascade not null,
  task_id      uuid references scheduled_tasks on delete set null,
  ec           numeric,
  ph           numeric,
  water_temp   numeric,
  measured_at  timestamptz default now(),
  notes        text,
  created_at   timestamptz default now()
);

comment on table measurements is 'Mediciones reales (EC/pH) del cultivo';

-- RLS
alter table measurements enable row level security;

drop policy if exists "measurements: own" on measurements;
create policy "measurements: own" on measurements
  for all using (auth.uid() = user_id);

create index if not exists idx_measurements_plant on measurements (plant_id, measured_at desc);

-- ────────────────────────────────────────────────────────────────────────
-- WEEK_LOGS — Diario de cultivo por semana
-- ────────────────────────────────────────────────────────────────────────
create table if not exists week_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  plant_id    uuid references plants on delete cascade not null,
  week_label  text not null,
  log_date    date not null,
  notes       text default '',
  photo_url   text,
  created_at  timestamptz default now()
);

comment on table week_logs is 'Registro semanal con foto y notas del cultivo';

-- RLS
alter table week_logs enable row level security;

drop policy if exists "week_logs: own" on week_logs;
create policy "week_logs: own" on week_logs
  for all using (auth.uid() = user_id);

create index if not exists idx_week_logs_plant on week_logs (plant_id, log_date desc);

-- ────────────────────────────────────────────────────────────────────────
-- STORAGE — Bucket para fotos de plantas
-- ────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists "fotos: upload own" on storage.objects;
create policy "fotos: upload own" on storage.objects
  for insert with check (
    bucket_id = 'plant-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "fotos: read own" on storage.objects;
create policy "fotos: read own" on storage.objects
  for select using (
    bucket_id = 'plant-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "fotos: delete own" on storage.objects;
create policy "fotos: delete own" on storage.objects
  for delete using (
    bucket_id = 'plant-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
