-- ============================================================
-- FIX (auditoria pre-launch, segunda pasada): handle_task_completion
-- comparaba v_task.user_id/user_id_param contra auth.uid() con <>, que
-- en SQL devuelve NULL (ni true ni false) cuando cualquiera de los dos
-- lados es NULL -- exactamente el caso de un caller anonimo real
-- (auth.uid() IS NULL). `FALSE OR NULL OR NULL` evalua a NULL, y un
-- `IF NULL THEN` en plpgsql NO entra al bloque -- el chequeo de
-- autorizacion se saltea silenciosamente para un caller sin sesion.
--
-- Impacto real verificado: hoy queda neutralizado de casualidad porque
-- user_xp_log.user_id es NOT NULL (aborta la transaccion antes de
-- llegar al UPDATE final si la tarea no estaba completada), y el otro
-- camino (tarea ya completada) es idempotente/inofensivo. Pero es una
-- proteccion accidental, no intencional -- se corrige la comparacion
-- para que rechace explicitamente a auth.uid() IS NULL sin depender de
-- una constraint de otra tabla.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_task_completion(task_id_param uuid, user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_task record;
  v_xp_gained int;
  v_new_streak int;
begin
  if auth.uid() is null then
    raise exception 'not_authorized';
  end if;

  select type, stage, user_id, xp_awarded into v_task
  from scheduled_tasks where id = task_id_param;

  -- Un solo mensaje generico para las 3 formas de rechazo (tarea
  -- inexistente, tarea ajena, user_id_param falsificado) -- no le damos al
  -- caller ninguna pista de CUAL de las tres fallo. IS DISTINCT FROM en
  -- vez de <> para que la comparacion sea correcta incluso si algun lado
  -- fuera NULL (defensa en profundidad -- auth.uid() ya se valido arriba).
  if v_task.user_id is null
     or v_task.user_id is distinct from auth.uid()
     or user_id_param is distinct from auth.uid() then
    raise exception 'not_authorized';
  end if;

  -- Idempotencia: si esta tarea ya otorgo XP antes, no otorgar de nuevo
  -- (cubre deshacer/rehacer Y llamadas repetidas directas a la RPC).
  if v_task.xp_awarded then
    update scheduled_tasks set completed = true, completed_at = coalesce(completed_at, now())
    where id = task_id_param;
    return json_build_object('xp_gained', null, 'new_streak', null);
  end if;

  v_xp_gained := case v_task.type
    when 'observation' then 10
    when 'irrigation' then 15
    when 'nutrition' then 25
    when 'foliar' then 20
    when 'harvest' then 100
    else 10
  end;

  perform log_xp(auth.uid(), v_xp_gained, 'Completed task: ' || v_task.type);
  v_new_streak := update_streak(auth.uid());
  update scheduled_tasks set completed = true, completed_at = now(), xp_awarded = true
  where id = task_id_param;

  return json_build_object('xp_gained', v_xp_gained, 'new_streak', v_new_streak);
end;
$$;
