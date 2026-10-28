-- ============================================================
-- FIX (revision del calendario al editar/iniciar floracion):
-- start_flora_phase hacia `DELETE FROM scheduled_tasks WHERE plant_id = ...`,
-- o sea borraba TODAS las tareas de la planta, incluidas las completadas
-- (historial, completed_at, xp_awarded), las canceladas y las reprogramadas.
-- Al iniciar la floracion se perdia todo lo hecho en vegetativo, y las
-- estadisticas / logros que se calculan sobre tareas completadas bajaban.
--
-- Ahora solo reemplaza las tareas PENDIENTES (las que `editPlant` tambien
-- reemplaza, ver replacePendingTasksForPlantInSupabase en el cliente):
--   completed = false AND skipped = false AND rescheduled_from IS NULL.
-- Misma firma y mismos permisos (CREATE OR REPLACE los conserva).
-- ============================================================

CREATE OR REPLACE FUNCTION start_flora_phase(
  p_plant_id         uuid,
  p_flora_start_date date,
  p_tasks            jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plants WHERE id = p_plant_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Plant not found or access denied';
  END IF;

  -- Historial intacto: completadas, canceladas y reprogramadas no se tocan.
  DELETE FROM scheduled_tasks
  WHERE plant_id = p_plant_id
    AND completed = false
    AND COALESCE(skipped, false) = false
    AND rescheduled_from IS NULL;

  IF jsonb_array_length(p_tasks) > 0 THEN
    INSERT INTO scheduled_tasks (
      id, plant_id, user_id, type, scheduled_date,
      cycle, week, stage, products,
      ec_min, ec_max, ph_min, ph_max, completed
    )
    SELECT
      gen_random_uuid(),
      p_plant_id,
      v_user_id,
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
    FROM jsonb_array_elements(p_tasks) AS t;
  END IF;

  UPDATE plants
  SET flora_start_date = p_flora_start_date,
      updated_at = now()
  WHERE id = p_plant_id;
END;
$$;
