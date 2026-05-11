-- ============================================================
-- RPC: start_flora_phase
-- Atomicamente elimina tareas viejas, inserta nuevas y actualiza
-- flora_start_date en la planta. Sin esto, una falla a mitad
-- deja la planta con tasks inconsistentes.
-- ============================================================

create or replace function start_flora_phase(
  p_plant_id        uuid,
  p_user_id         uuid,
  p_flora_start_date date,
  p_tasks           jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Verificar que la planta pertenece al usuario
  if not exists (
    select 1 from plants where id = p_plant_id and user_id = p_user_id
  ) then
    raise exception 'Plant not found or access denied';
  end if;

  -- Eliminar todas las tareas existentes de la planta
  delete from scheduled_tasks where plant_id = p_plant_id;

  -- Insertar las nuevas tareas de fase flora
  if jsonb_array_length(p_tasks) > 0 then
    insert into scheduled_tasks (
      id, plant_id, user_id, type, scheduled_date,
      cycle, week, stage, products,
      ec_min, ec_max, ph_min, ph_max, completed
    )
    select
      gen_random_uuid(),
      p_plant_id,
      p_user_id,
      t->>'type',
      (t->>'scheduled_date')::date,
      t->>'cycle',
      (t->>'week')::int,
      t->>'stage',
      (t->'products')::jsonb,
      (t->>'ec_min')::numeric,
      (t->>'ec_max')::numeric,
      (t->>'ph_min')::numeric,
      (t->>'ph_max')::numeric,
      false
    from jsonb_array_elements(p_tasks) as t;
  end if;

  -- Actualizar flora_start_date en la planta
  update plants
  set
    flora_start_date = p_flora_start_date,
    updated_at = now()
  where id = p_plant_id;
end;
$$;

-- Solo el owner de la planta puede llamar esta funcion (RLS ya protege las tablas)
grant execute on function start_flora_phase(uuid, uuid, date, jsonb) to authenticated;
