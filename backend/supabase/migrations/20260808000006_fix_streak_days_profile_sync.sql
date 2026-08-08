-- PROPUESTA -- NO APLICADA A PRODUCCION TODAVIA.
-- Requiere autorizacion explicita antes de correr.
--
-- Hallazgo real de la fase de smoke test de produccion (no relacionado con
-- el hardening de seguridad de esta sesion): AuthContext.tsx sincroniza el
-- streak local del usuario leyendo profiles.streak_days en cada login/carga
-- ("XP/racha: Supabase (profiles.xp / profiles.streak_days) es la fuente de
-- verdad"), exactamente el mismo patron que ya usa para xp (que SI funciona,
-- porque log_xp() escribe en profiles.xp). Pero update_streak() -- la unica
-- funcion real que actualiza la racha al completar una tarea -- solo escribe
-- en user_streaks, nunca en profiles.streak_days. Resultado confirmado en
-- produccion real: el usuario ve su racha resetear a 0 en cada login fresco
-- o recarga de pagina, aunque el dato correcto sigue intacto en user_streaks.
--
-- Fix minimo: espejar en update_streak() exactamente lo que log_xp() ya
-- hace para profiles.xp -- escribir tambien profiles.streak_days con el
-- streak recien calculado. Sin cambios de firma, sin cambios de contrato de
-- retorno, sin tocar user_streaks, log_xp, RLS, ni ninguna otra funcion.
--
-- Backfill: no hace falta. Verificado contra los 4 usuarios reales actuales
-- -- los que tienen actividad ya coinciden (profiles.streak_days =
-- user_streaks.streak_days), la divergencia solo aparece hacia adelante en
-- la SEGUNDA racha de un usuario (la primera coincide por construccion, ya
-- que ambas tablas parten de 0/1 al mismo tiempo).
--
-- ROLLBACK si causa una regresion inesperada:
--   restaurar update_streak() al cuerpo anterior (sin el UPDATE profiles al final).

CREATE OR REPLACE FUNCTION public.update_streak(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_streak int;
  v_last_date date;
  v_new_streak int;
begin
  select streak_days, last_task_date into v_streak, v_last_date from user_streaks where user_id = user_id_param;

  if v_last_date is null then
    insert into user_streaks (user_id, streak_days, last_task_date) values (user_id_param, 1, current_date)
    on conflict (user_id) do update set streak_days = 1, last_task_date = current_date;
    v_new_streak := 1;
  elsif v_last_date = current_date then
    v_new_streak := v_streak;
  elsif v_last_date = current_date - interval '1 day' then
    update user_streaks set streak_days = streak_days + 1, last_task_date = current_date where user_id = user_id_param;
    v_new_streak := v_streak + 1;
  else
    update user_streaks set streak_days = 1, last_task_date = current_date where user_id = user_id_param;
    v_new_streak := 1;
  end if;

  update profiles set streak_days = v_new_streak where id = user_id_param;

  return v_new_streak;
end;
$function$;
