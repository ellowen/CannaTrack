-- PROPUESTA -- NO APLICADA A PRODUCCION TODAVIA.
-- Requiere autorizacion explicita antes de correr.
--
-- Cierra por completo la cadena de escritura de XP/racha, no solo un
-- sintoma. Dos vulnerabilidades reales confirmadas en produccion (ambas
-- extraidas con `supabase db query --linked`, ninguna inventada):
--
-- 1) handle_task_completion(task_id_param uuid, user_id_param uuid) es
--    SECURITY DEFINER (bypasea RLS internamente) pero no valida:
--      - que la tarea pertenezca a quien llama;
--      - que user_id_param coincida con el caller real (auth.uid());
--      - xp_awarded, para evitar otorgar XP mas de una vez.
--
-- 2) log_xp(uuid,integer,text) y update_streak(uuid) -- las funciones que
--    handle_task_completion invoca internamente para escribir XP y racha
--    -- tienen EXECUTE otorgado directo a PUBLIC, anon Y authenticated
--    (ACL real verificada: "{=X/postgres,postgres=X/postgres,
--    anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}").
--    Cualquier visitante, ESTE O NO LOGUEADO, puede llamarlas directo:
--      supabase.rpc('log_xp', {user_id_param: '<cualquiera>', xp_param: 999999, ...})
--      supabase.rpc('update_streak', {user_id_param: '<cualquiera>'})
--    y otorgarse (o corromperle a otro) XP/racha sin limite, sin pasar
--    jamas por handle_task_completion. Arreglar SOLO handle_task_completion
--    deja esta ruta completamente abierta.
--
-- Busqueda exhaustiva en el repo (frontend/ + backend/supabase/functions/)
-- confirma que NINGUN codigo legitimo llama log_xp/update_streak directo
-- -- el unico llamador real en todo el sistema es sync.ts, que invoca
-- exclusivamente handle_task_completion. Revocar el acceso directo a las
-- dos funciones internas no rompe nada existente.
--
-- Arquitectura resultante:
--   cliente --RPC--> handle_task_completion (identidad + ownership +
--                     idempotencia) --> log_xp / update_streak (ya no
--                     alcanzables directo desde el cliente, solo desde
--                     dentro de una funcion SECURITY DEFINER propiedad de
--                     "postgres", que conserva EXECUTE implicito sobre sus
--                     propias funciones sin necesitar un grant explicito).
--
-- Una sola migracion atomica (no dos) a proposito: aplicar el fix de
-- ownership sin revocar los permisos directos, o revocar los permisos sin
-- el fix de ownership, deja una ventana donde el sistema sigue explotable
-- de una forma u otra. Todo o nada.
--
-- ROLLBACK si causa una regresion inesperada:
--   GRANT EXECUTE ON FUNCTION public.log_xp(uuid,integer,text) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.log_xp(uuid,integer,text) TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.update_streak(uuid) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.update_streak(uuid) TO PUBLIC;
--   -- y restaurar el CREATE OR REPLACE de handle_task_completion con el
--   -- cuerpo original documentado en el informe de esta auditoria.

-- ────────────────────────────────────────────────────────────────────────
-- 1. handle_task_completion: identidad real (auth.uid()) + ownership +
--    idempotencia server-side via xp_awarded. Firma sin cambios.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_task_completion(task_id_param uuid, user_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_task record;
  v_xp_gained int;
  v_new_streak int;
begin
  select type, stage, user_id, xp_awarded into v_task
  from scheduled_tasks where id = task_id_param;

  -- Un solo mensaje generico para las 3 formas de rechazo (tarea
  -- inexistente, tarea ajena, user_id_param falsificado) -- no le damos al
  -- caller ninguna pista de CUAL de las tres fallo.
  if v_task.user_id is null
     or v_task.user_id <> auth.uid()
     or user_id_param <> auth.uid() then
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
$function$;

-- ────────────────────────────────────────────────────────────────────────
-- 2. log_xp / update_streak: dejan de ser API publica. Solo alcanzables
--    desde dentro de handle_task_completion (mismo owner, "postgres" ->
--    EXECUTE implicito sobre sus propias funciones, no necesita grant).
--    No se toca su definicion, su SECURITY DEFINER, ni su search_path --
--    el fix es exclusivamente de superficie de acceso (REVOKE), no de
--    logica interna, per "minima superficie de ataque + minima
--    complejidad".
-- ────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.log_xp(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_xp(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_xp(uuid, integer, text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_streak(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_streak(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_streak(uuid) FROM authenticated;

-- service_role NO se toca: es la clave privada de backend (Edge Functions),
-- nunca expuesta al cliente -- no es un vector de ataque de usuario final,
-- y revocarla sin necesidad podria romper un uso legitimo de backend que
-- esta auditoria no tiene forma de descartar con certeza total.
