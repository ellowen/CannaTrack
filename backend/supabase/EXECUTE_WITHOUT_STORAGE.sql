-- CannaTrack: MIGRACIONES SIN STORAGE (Part 1)
-- Ejecuta esto PRIMERO en el SQL Editor de Supabase
-- (Copy-paste en https://supabase.com/dashboard/project/wpvvfroutebiwckrenmq/sql/new)

create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- PROFILES
-- ════════════════════════════════════════════════════════════════════════════
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

alter table profiles enable row level security;
drop policy if exists "profiles: own" on profiles;
create policy "profiles: own" on profiles
  for all using (auth.uid() = id);

-- ════════════════════════════════════════════════════════════════════════════
-- PLANTS
-- ════════════════════════════════════════════════════════════════════════════
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

alter table plants enable row level security;
drop policy if exists "plants: own" on plants;
create policy "plants: own" on plants
  for all using (auth.uid() = user_id);

create index if not exists idx_plants_user on plants (user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- SCHEDULED_TASKS
-- ════════════════════════════════════════════════════════════════════════════
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

alter table scheduled_tasks enable row level security;
drop policy if exists "tasks: own" on scheduled_tasks;
create policy "tasks: own" on scheduled_tasks
  for all using (auth.uid() = user_id);

create index if not exists idx_tasks_user on scheduled_tasks (user_id);
create index if not exists idx_tasks_plant on scheduled_tasks (plant_id);
create index if not exists idx_tasks_date on scheduled_tasks (scheduled_date);

-- ════════════════════════════════════════════════════════════════════════════
-- MEASUREMENTS
-- ════════════════════════════════════════════════════════════════════════════
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

alter table measurements enable row level security;
drop policy if exists "measurements: own" on measurements;
create policy "measurements: own" on measurements
  for all using (auth.uid() = user_id);

create index if not exists idx_measurements_plant on measurements (plant_id, measured_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- WEEK_LOGS
-- ════════════════════════════════════════════════════════════════════════════
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

alter table week_logs enable row level security;
drop policy if exists "week_logs: own" on week_logs;
create policy "week_logs: own" on week_logs
  for all using (auth.uid() = user_id);

create index if not exists idx_week_logs_plant on week_logs (plant_id, log_date desc);

-- ════════════════════════════════════════════════════════════════════════════
-- NUTRITION TABLES
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists nutrition_tables (
  id          text primary key,
  name        text not null unique,
  brand_id    text,
  is_official boolean default false,
  access_tier text default 'free' check (access_tier in ('free', 'pro')),
  created_at  timestamptz default now()
);

alter table nutrition_tables enable row level security;
create policy "nutrition_tables: public read" on nutrition_tables for select using (true);

create table if not exists nutrition_weeks (
  id        uuid primary key default gen_random_uuid(),
  table_id  text references nutrition_tables on delete cascade not null,
  cycle     text not null check (cycle in ('vege', 'flora')),
  week      int not null,
  stage     text not null,
  day_start int not null,
  day_end   int not null,
  ec_min    numeric default 0,
  ec_max    numeric default 0,
  ph_min    numeric default 6,
  ph_max    numeric default 6,
  created_at timestamptz default now(),
  unique (table_id, cycle, week)
);

alter table nutrition_weeks enable row level security;
create policy "nutrition_weeks: public read" on nutrition_weeks for select using (true);
create index if not exists idx_nutrition_weeks_table on nutrition_weeks (table_id);

create table if not exists nutrition_products (
  id        uuid primary key default gen_random_uuid(),
  week_id   uuid references nutrition_weeks on delete cascade not null,
  line_code text not null,
  product_name text not null,
  unit      text not null check (unit in ('ml', 'gr')),
  min_dose  numeric not null,
  max_dose  numeric not null,
  created_at timestamptz default now()
);

alter table nutrition_products enable row level security;
create policy "nutrition_products: public read" on nutrition_products for select using (true);
create index if not exists idx_nutrition_products_week on nutrition_products (week_id);

-- Seed REVEGETAR
insert into nutrition_tables (id, name, brand_id, is_official, access_tier)
values ('revegetar', 'Revegetar', 'revegetar-brand', true, 'free')
on conflict (id) do nothing;

-- VEGE weeks
do $$
declare
  v_stage text;
  v_day_start int;
  v_day_end int;
  v_ec_min numeric;
  v_ec_max numeric;
  v_ph_min numeric := 5.5;
  v_ph_max numeric := 6.0;
begin
  for i in 0..5 loop
    case i
      when 0 then v_stage := 'rooting'; v_day_start := 0; v_day_end := 7; v_ec_min := 0.4; v_ec_max := 0.6;
      when 1 then v_stage := 'rooting'; v_day_start := 7; v_day_end := 14; v_ec_min := 0.4; v_ec_max := 0.6;
      when 2 then v_stage := 'growth'; v_day_start := 14; v_day_end := 21; v_ec_min := 0.6; v_ec_max := 0.8;
      when 3 then v_stage := 'growth'; v_day_start := 21; v_day_end := 28; v_ec_min := 0.6; v_ec_max := 0.8;
      when 4 then v_stage := 'preflower'; v_day_start := 28; v_day_end := 35; v_ec_min := 0.8; v_ec_max := 1.0;
      when 5 then v_stage := 'preflower'; v_day_start := 35; v_day_end := 42; v_ec_min := 0.8; v_ec_max := 1.0;
    end case;

    insert into nutrition_weeks (table_id, cycle, week, stage, day_start, day_end, ec_min, ec_max, ph_min, ph_max)
    values ('revegetar', 'vege', i, v_stage, v_day_start, v_day_end, v_ec_min, v_ec_max, v_ph_min, v_ph_max)
    on conflict do nothing;
  end loop;
end;
$$;

-- FLORA weeks
do $$
declare
  v_stage text;
  v_day_start int;
  v_day_end int;
  v_ec_min numeric;
  v_ec_max numeric;
  v_ph_min numeric;
  v_ph_max numeric;
  v_week_num int;
begin
  for i in 0..7 loop
    v_week_num := i + 1;
    v_day_start := i * 7;
    v_day_end := (i + 1) * 7;
    v_ph_min := 6.0;
    v_ph_max := 6.5;

    case i
      when 0 then v_stage := 'stretch'; v_ec_min := 1.0; v_ec_max := 1.2;
      when 1 then v_stage := 'stretch'; v_ec_min := 1.0; v_ec_max := 1.2;
      when 2 then v_stage := 'fattening'; v_ec_min := 1.2; v_ec_max := 1.4;
      when 3 then v_stage := 'fattening'; v_ec_min := 1.2; v_ec_max := 1.4;
      when 4 then v_stage := 'maturation'; v_ec_min := 1.4; v_ec_max := 1.6;
      when 5 then v_stage := 'maturation'; v_ec_min := 1.4; v_ec_max := 1.6;
      when 6 then v_stage := 'flushing'; v_ec_min := 0.0; v_ec_max := 0.4;
      when 7 then v_stage := 'flushing'; v_ec_min := 0.0; v_ec_max := 0.4;
    end case;

    insert into nutrition_weeks (table_id, cycle, week, stage, day_start, day_end, ec_min, ec_max, ph_min, ph_max)
    values ('revegetar', 'flora', v_week_num, v_stage, v_day_start, v_day_end, v_ec_min, v_ec_max, v_ph_min, v_ph_max)
    on conflict do nothing;
  end loop;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- GAMIFICATION
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists user_xp_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users on delete cascade not null,
  xp        int not null,
  reason    text not null,
  created_at timestamptz default now()
);

alter table user_xp_log enable row level security;
create policy "xp_log: own" on user_xp_log for select using (auth.uid() = user_id);
create index if not exists idx_user_xp_log_user on user_xp_log (user_id);

create table if not exists user_streaks (
  user_id       uuid primary key references auth.users on delete cascade,
  streak_days   int default 0,
  last_task_date date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table user_streaks enable row level security;
drop policy if exists "streaks: own" on user_streaks;
create policy "streaks: own" on user_streaks for all using (auth.uid() = user_id);

-- Funciones
create or replace function get_level_info(total_xp int)
returns table (
  level int,
  level_name text,
  current_level_xp int,
  next_level_xp int,
  progress_percent numeric
) language plpgsql as $$
declare
  v_level int;
  v_current_xp int;
  v_next_xp int;
begin
  v_level := least(floor(total_xp / 100)::int, 99);
  v_current_xp := v_level * 100;
  v_next_xp := (v_level + 1) * 100;

  return query select
    v_level::int,
    case
      when v_level = 0 then 'Seedling'
      when v_level < 5 then 'Sprout'
      when v_level < 10 then 'Sapling'
      when v_level < 20 then 'Cultivator'
      when v_level < 30 then 'Master Grower'
      else 'Legend'
    end,
    v_current_xp::int,
    v_next_xp::int,
    round(((total_xp - v_current_xp)::numeric / 100) * 100, 1)
  ;
end;
$$;

create or replace function log_xp(user_id_param uuid, xp_param int, reason_param text)
returns void language plpgsql security definer as $$
begin
  insert into user_xp_log (user_id, xp, reason) values (user_id_param, xp_param, reason_param);
  update profiles set xp = xp + xp_param where id = user_id_param;
end;
$$;

create or replace function update_streak(user_id_param uuid)
returns int language plpgsql security definer as $$
declare
  v_streak int;
  v_last_date date;
begin
  select streak_days, last_task_date into v_streak, v_last_date from user_streaks where user_id = user_id_param;

  if v_last_date is null then
    insert into user_streaks (user_id, streak_days, last_task_date) values (user_id_param, 1, current_date)
    on conflict (user_id) do update set streak_days = 1, last_task_date = current_date;
    return 1;
  elsif v_last_date = current_date then
    return v_streak;
  elsif v_last_date = current_date - interval '1 day' then
    update user_streaks set streak_days = streak_days + 1, last_task_date = current_date where user_id = user_id_param;
    return v_streak + 1;
  else
    update user_streaks set streak_days = 1, last_task_date = current_date where user_id = user_id_param;
    return 1;
  end if;
end;
$$;

create or replace function handle_task_completion(task_id_param uuid, user_id_param uuid)
returns json language plpgsql security definer as $$
declare
  v_task record;
  v_xp_gained int;
  v_new_streak int;
begin
  select type, stage into v_task from scheduled_tasks where id = task_id_param;

  v_xp_gained := case v_task.type
    when 'observation' then 10
    when 'irrigation' then 15
    when 'nutrition' then 25
    when 'foliar' then 20
    when 'harvest' then 100
    else 10
  end;

  perform log_xp(user_id_param, v_xp_gained, 'Completed task: ' || v_task.type);
  v_new_streak := update_streak(user_id_param);
  update scheduled_tasks set completed = true, completed_at = now() where id = task_id_param;

  return json_build_object('xp_gained', v_xp_gained, 'new_streak', v_new_streak);
end;
$$;

grant execute on function handle_task_completion to authenticated;

-- RLS adicionales
drop policy if exists "profiles: system update xp" on profiles;
create policy "profiles: system update xp" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id or auth.uid() is null);

drop policy if exists "tasks: complete own" on scheduled_tasks;
create policy "tasks: complete own" on scheduled_tasks
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Funciones de seguridad
create or replace function is_plant_owner(plant_uuid uuid)
returns boolean language plpgsql security definer as $$
begin
  return exists (select 1 from plants where id = plant_uuid and user_id = auth.uid());
end;
$$;

create or replace function is_task_owner(task_uuid uuid)
returns boolean language plpgsql security definer as $$
begin
  return exists (select 1 from scheduled_tasks where id = task_uuid and user_id = auth.uid());
end;
$$;

create or replace function get_user_level()
returns table (level int, level_name text, xp int, current_level_xp int, next_level_xp int, progress_percent numeric)
language plpgsql security definer as $$
declare v_user_xp int;
begin
  select xp into v_user_xp from profiles where id = auth.uid();
  return query select li.level, li.level_name, v_user_xp, li.current_level_xp, li.next_level_xp, li.progress_percent
  from get_level_info(v_user_xp) as li;
end;
$$;

create or replace function get_user_summary()
returns table (username text, xp int, level int, streak_days int, plants_active int, tasks_completed_today int)
language plpgsql security definer as $$
begin
  return query
  select p.username, p.xp, (get_level_info(p.xp)).level, coalesce(ps.streak_days, 0),
    (select count(*) from plants where user_id = auth.uid() and status = 'active')::int,
    (select count(*) from scheduled_tasks where user_id = auth.uid() and scheduled_date = current_date and completed = true)::int
  from profiles p
  left join user_streaks ps on p.id = ps.user_id
  where p.id = auth.uid();
end;
$$;

grant execute on function is_plant_owner to authenticated;
grant execute on function is_task_owner to authenticated;
grant execute on function get_user_level to authenticated;
grant execute on function get_user_summary to authenticated;
grant execute on function get_level_info to authenticated;
grant execute on function handle_new_user to authenticated;
grant execute on function handle_task_completion to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- LISTO!
-- ════════════════════════════════════════════════════════════════════════════
-- Si llegaste aquí sin errores, pasá al Paso 2
