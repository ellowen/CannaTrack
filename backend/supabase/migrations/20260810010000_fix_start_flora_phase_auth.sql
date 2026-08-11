-- ============================================================
-- FIX P0 (auditoria pre-launch Fase 5/6): start_flora_phase confiaba
-- en p_user_id provisto por el CLIENTE para autorizar, no en auth.uid().
-- Al ser SECURITY DEFINER (bypassa RLS) y tener EXECUTE otorgado a
-- authenticated (heredado de PUBLIC via el grant original), cualquier
-- llamante que conociera un plant_id + user_id reales de otro usuario
-- (por ejemplo via el bug de listado publico del bucket plant-photos,
-- corregido en la migracion siguiente) podia borrar/reescribir las
-- tareas de esa planta ajena sin haber iniciado sesion como su dueno.
--
-- Fix: eliminar el parametro p_user_id por completo. La identidad
-- efectiva es siempre auth.uid() -- exactamente el mismo patron que
-- ya usa correctamente handle_task_completion.
-- ============================================================

-- La funcion vieja (uuid, uuid, date, jsonb) queda inservible/insegura
-- por definicion -- eliminarla, no dejarla coexistir como overload.
DROP FUNCTION IF EXISTS start_flora_phase(uuid, uuid, date, jsonb);

CREATE FUNCTION start_flora_phase(
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

  -- Verificar que la planta pertenece al usuario autenticado real.
  IF NOT EXISTS (
    SELECT 1 FROM plants WHERE id = p_plant_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Plant not found or access denied';
  END IF;

  DELETE FROM scheduled_tasks WHERE plant_id = p_plant_id;

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

-- Solo authenticated puede ejecutarla (nunca anon/PUBLIC).
REVOKE ALL ON FUNCTION start_flora_phase(uuid, date, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_flora_phase(uuid, date, jsonb) TO authenticated;
