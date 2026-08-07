-- Defensa en profundidad: ninguna funcion SECURITY DEFINER en produccion
-- fijaba su propio search_path (mismo patron de riesgo que causo el bug
-- critico de handle_new_user en la migracion anterior). Sin un search_path
-- explicito, una funcion SECURITY DEFINER resuelve nombres de tabla sin
-- calificar segun el search_path de QUIEN LA LLAMA, no el del dueño --
-- ademas de causar fallas como la de handle_new_user, es tambien el vector
-- clasico de "search_path hijacking" en Postgres.

ALTER FUNCTION is_plant_owner(uuid) SET search_path = public;
ALTER FUNCTION is_task_owner(uuid) SET search_path = public;
ALTER FUNCTION get_user_level() SET search_path = public;
ALTER FUNCTION get_user_summary() SET search_path = public;
ALTER FUNCTION handle_task_completion(uuid, uuid) SET search_path = public;
ALTER FUNCTION ensure_profile_exists(uuid, text) SET search_path = public;
ALTER FUNCTION log_xp(uuid, integer, text) SET search_path = public;
ALTER FUNCTION update_streak(uuid) SET search_path = public;
ALTER FUNCTION increment_plants_grown() SET search_path = public;
ALTER FUNCTION start_flora_phase(uuid, uuid, date, jsonb) SET search_path = public;
