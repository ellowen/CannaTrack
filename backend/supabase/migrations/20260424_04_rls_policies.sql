-- CannaTrack: Row Level Security (RLS) - Completo
-- Rollback: Políticas individuales se revierten con DROP POLICY

-- ────────────────────────────────────────────────────────────────────────
-- PROFILES — Cada usuario solo accede el suyo
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_01_init_schema.sql
-- create policy "profiles: own" on profiles for all using (auth.uid() = id);

-- Agregar política para que el sistema pueda actualizar XP
create policy "profiles: system update xp" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id or auth.uid() is null);

-- ────────────────────────────────────────────────────────────────────────
-- PLANTS — Cada usuario solo ve/modifica las suyas
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_01_init_schema.sql
-- create policy "plants: own" on plants for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- SCHEDULED_TASKS — Solo el usuario ve sus tareas
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_01_init_schema.sql
-- create policy "tasks: own" on scheduled_tasks for all using (auth.uid() = user_id);

-- Agregar política para marcar como completada
create policy "tasks: complete own" on scheduled_tasks
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- MEASUREMENTS — Solo el usuario ve sus mediciones
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_01_init_schema.sql
-- create policy "measurements: own" on measurements for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- WEEK_LOGS — Solo el usuario ve sus registros
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_01_init_schema.sql
-- create policy "week_logs: own" on week_logs for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- USER_XP_LOG — Solo lectura del usuario
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_03_gamification.sql
-- create policy "xp_log: own" on user_xp_log for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- USER_STREAKS — Solo el usuario ve su racha
-- ────────────────────────────────────────────────────────────────────────
-- Ya creada en 20260424_03_gamification.sql
-- create policy "streaks: own" on user_streaks for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- NUTRITION_TABLES & NUTRITION_WEEKS & NUTRITION_PRODUCTS
-- Lectura pública, sin modificación
-- ────────────────────────────────────────────────────────────────────────
-- Ya creadas en 20260424_02_nutrition_tables.sql
-- create policy "nutrition_tables: public read" on nutrition_tables for select using (true);
-- create policy "nutrition_weeks: public read" on nutrition_weeks for select using (true);
-- create policy "nutrition_products: public read" on nutrition_products for select using (true);

-- ────────────────────────────────────────────────────────────────────────
-- STORAGE OBJECTS — Fotos de plantas
-- ────────────────────────────────────────────────────────────────────────
-- Ya creadas en 20260424_01_init_schema.sql
-- Políticas:
-- - fotos: upload own — usuario sube a su propia carpeta
-- - fotos: read own — usuario lee sus fotos
-- - fotos: delete own — usuario elimina sus fotos

-- ────────────────────────────────────────────────────────────────────────
-- FUNCIONES DE SEGURIDAD
-- ────────────────────────────────────────────────────────────────────────

-- Función para verificar que el usuario es owner de una planta
create or replace function is_plant_owner(plant_uuid uuid)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from plants
    where id = plant_uuid and user_id = auth.uid()
  );
end;
$$;

-- Función para verificar que el usuario es owner de una tarea
create or replace function is_task_owner(task_uuid uuid)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from scheduled_tasks
    where id = task_uuid and user_id = auth.uid()
  );
end;
$$;

-- Función para obtener el nivel actual del usuario
create or replace function get_user_level()
returns table (
  level int,
  level_name text,
  xp int,
  current_level_xp int,
  next_level_xp int,
  progress_percent numeric
) language plpgsql security definer as $$
declare
  v_user_xp int;
begin
  select xp into v_user_xp from profiles where id = auth.uid();

  return query
  select
    li.level,
    li.level_name,
    v_user_xp,
    li.current_level_xp,
    li.next_level_xp,
    li.progress_percent
  from get_level_info(v_user_xp) as li;
end;
$$;

-- Función para obtener resumen del usuario
create or replace function get_user_summary()
returns table (
  username text,
  xp int,
  level int,
  streak_days int,
  plants_active int,
  tasks_completed_today int
) language plpgsql security definer as $$
begin
  return query
  select
    p.username,
    p.xp,
    (get_level_info(p.xp)).level,
    coalesce(ps.streak_days, 0),
    (select count(*) from plants where user_id = auth.uid() and status = 'active')::int,
    (select count(*) from scheduled_tasks
      where user_id = auth.uid()
        and scheduled_date = current_date
        and completed = true)::int
  from profiles p
  left join user_streaks ps on p.id = ps.user_id
  where p.id = auth.uid();
end;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- GRANTS DE FUNCIONES
-- ────────────────────────────────────────────────────────────────────────
grant execute on function is_plant_owner to authenticated;
grant execute on function is_task_owner to authenticated;
grant execute on function get_user_level to authenticated;
grant execute on function get_user_summary to authenticated;
grant execute on function get_level_info to authenticated;
grant execute on function handle_new_user to authenticated;
grant execute on function handle_task_completion to authenticated;
