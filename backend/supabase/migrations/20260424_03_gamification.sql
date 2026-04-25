-- CannaTrack: Gamificación (XP logs, streaks, triggers)
-- Rollback: DROP TRIGGER IF EXISTS on_task_completed ON scheduled_tasks CASCADE; DROP FUNCTION IF EXISTS handle_task_completion CASCADE; DROP TABLE IF EXISTS user_xp_log CASCADE; DROP TABLE IF EXISTS user_streaks CASCADE;

-- ────────────────────────────────────────────────────────────────────────
-- USER_XP_LOG — Registro de XP ganado por acciones
-- ────────────────────────────────────────────────────────────────────────
create table if not exists user_xp_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade not null,
  plant_id      uuid references plants on delete cascade,
  task_id       uuid references scheduled_tasks on delete set null,
  action        text not null check (action in (
    'task_completed',
    'photo_uploaded',
    'measurement_recorded',
    'plant_harvested',
    'level_reached'
  )),
  xp_amount     int not null check (xp_amount > 0),
  description   text,
  created_at    timestamptz default now()
);

comment on table user_xp_log is 'Historial de XP ganado por acciones del usuario';

-- RLS
alter table user_xp_log enable row level security;

create policy "xp_log: own" on user_xp_log
  for select using (auth.uid() = user_id);

create index if not exists idx_xp_log_user on user_xp_log (user_id, created_at desc);
create index if not exists idx_xp_log_plant on user_xp_log (plant_id);

-- ────────────────────────────────────────────────────────────────────────
-- USER_STREAKS — Racha de días completados
-- ────────────────────────────────────────────────────────────────────────
create table if not exists user_streaks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade not null unique,
  streak_days     int default 0,
  last_completed  date,
  max_streak      int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

comment on table user_streaks is 'Racha de días con tareas completadas';

-- RLS
alter table user_streaks enable row level security;

create policy "streaks: own" on user_streaks
  for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- HELPER: getLevelInfo (Niveles por XP)
-- ────────────────────────────────────────────────────────────────────────
create or replace function get_level_info(total_xp int)
returns table (
  level int,
  level_name text,
  current_level_xp int,
  next_level_xp int,
  progress_percent numeric
) language plpgsql immutable as $$
declare
  v_level int;
  v_current_xp int;
  v_next_xp int;
begin
  -- Niveles: L0=0, L1=100, L2=300, L3=600, L4=1000, L5=1500, L6=2100...
  -- Increments: 100, 200, 300, 400, 500, 600...

  if total_xp < 100 then
    v_level := 1;
    v_current_xp := 0;
    v_next_xp := 100;
  elsif total_xp < 300 then
    v_level := 2;
    v_current_xp := 100;
    v_next_xp := 300;
  elsif total_xp < 600 then
    v_level := 3;
    v_current_xp := 300;
    v_next_xp := 600;
  elsif total_xp < 1000 then
    v_level := 4;
    v_current_xp := 600;
    v_next_xp := 1000;
  elsif total_xp < 1500 then
    v_level := 5;
    v_current_xp := 1000;
    v_next_xp := 1500;
  elsif total_xp < 2100 then
    v_level := 6;
    v_current_xp := 1500;
    v_next_xp := 2100;
  elsif total_xp < 2800 then
    v_level := 7;
    v_current_xp := 2100;
    v_next_xp := 2800;
  elsif total_xp < 3600 then
    v_level := 8;
    v_current_xp := 2800;
    v_next_xp := 3600;
  elsif total_xp < 4500 then
    v_level := 9;
    v_current_xp := 3600;
    v_next_xp := 4500;
  else
    v_level := 10;
    v_current_xp := 4500;
    v_next_xp := 5500;
  end if;

  return query select
    v_level as level,
    'Nivel ' || v_level as level_name,
    v_current_xp as current_level_xp,
    v_next_xp as next_level_xp,
    round(100.0 * (total_xp - v_current_xp) / (v_next_xp - v_current_xp), 2) as progress_percent;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- TRIGGER: on_task_completed → award XP and update streak
-- ────────────────────────────────────────────────────────────────────────
create or replace function handle_task_completion()
returns trigger language plpgsql security definer as $$
declare
  v_xp_award int;
  v_today date;
  v_last_completed date;
  v_new_streak int;
begin
  if new.completed and not old.completed then
    -- Award XP based on task type
    case new.type
      when 'nutrition' then v_xp_award := 10;
      when 'irrigation' then v_xp_award := 5;
      when 'foliar' then v_xp_award := 8;
      when 'observation' then v_xp_award := 3;
      when 'harvest' then v_xp_award := 50;
      else v_xp_award := 5;
    end case;

    -- Insert XP log
    insert into user_xp_log (user_id, plant_id, task_id, action, xp_amount, description)
    values (
      new.user_id,
      new.plant_id,
      new.id,
      'task_completed',
      v_xp_award,
      new.type || ' completada en ' || new.stage
    );

    -- Update user XP
    update profiles
    set xp = xp + v_xp_award
    where id = new.user_id;

    -- Update streak
    v_today := current_date;
    select last_completed into v_last_completed
    from user_streaks
    where user_id = new.user_id;

    if v_last_completed is null then
      -- First completion
      insert into user_streaks (user_id, streak_days, last_completed, max_streak)
      values (new.user_id, 1, v_today, 1)
      on conflict (user_id) do update
      set streak_days = 1, last_completed = v_today, max_streak = 1, updated_at = now();
    elsif v_last_completed = v_today then
      -- Ya completó algo hoy, no actualizar
      null;
    elsif v_last_completed = v_today - interval '1 day' then
      -- Streaking continue
      select streak_days + 1 into v_new_streak
      from user_streaks
      where user_id = new.user_id;

      update user_streaks
      set
        streak_days = v_new_streak,
        last_completed = v_today,
        max_streak = greatest(max_streak, v_new_streak),
        updated_at = now()
      where user_id = new.user_id;

      -- Award bonus XP por racha
      if v_new_streak % 5 = 0 then
        insert into user_xp_log (user_id, action, xp_amount, description)
        values (new.user_id, 'level_reached', 25, 'Bonus: racha de ' || v_new_streak || ' días');

        update profiles set xp = xp + 25 where id = new.user_id;
      end if;
    else
      -- Racha rota
      update user_streaks
      set streak_days = 1, last_completed = v_today, updated_at = now()
      where user_id = new.user_id;
    end if;

    -- Update streak_days en profiles
    update profiles
    set streak_days = (
      select coalesce(streak_days, 0) from user_streaks where user_id = new.user_id
    )
    where id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger on_task_completed
  after update on scheduled_tasks
  for each row
  execute procedure handle_task_completion();

-- ────────────────────────────────────────────────────────────────────────
-- TRIGGER: on_photo_uploaded → award XP
-- ────────────────────────────────────────────────────────────────────────
create or replace function handle_photo_upload()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_plant_id uuid;
begin
  -- Extract user_id and plant_id from storage path (format: user_id/plant_id/filename)
  v_user_id := (string_to_array(new.name, '/'))[1]::uuid;
  v_plant_id := (string_to_array(new.name, '/'))[2]::uuid;

  if v_plant_id is not null then
    insert into user_xp_log (user_id, plant_id, action, xp_amount, description)
    values (
      v_user_id,
      v_plant_id,
      'photo_uploaded',
      15,
      'Foto subida: ' || new.name
    );

    update profiles set xp = xp + 15 where id = v_user_id;
  end if;

  return new;
end;
$$;

-- Nota: Este trigger se activa cuando se suba a storage.objects
-- Requerir implementación manual en cliente o Edge Function
