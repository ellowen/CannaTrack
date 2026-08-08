-- PROPUESTA -- NO APLICADA A PRODUCCION TODAVIA.
-- Requiere autorizacion explicita antes de correr.
--
-- Dos vulnerabilidades CRITICAS confirmadas en la auditoria final de
-- seguridad (ambas verificadas en vivo dentro de BEGIN/ROLLBACK antes de
-- escribir este archivo, ninguna asumida):
--
-- 1) ai_usage: la policy "ai_usage: own" es FOR ALL USING(auth.uid()=user_id)
--    sin WITH CHECK -- el cliente puede escribir su propia fila directo.
--    Confirmado explotable: UPDATE ai_usage SET diagnosis_count = 0 WHERE
--    user_id = auth.uid() -- resetea el limite mensual que
--    20260808000006 (fix del reset-en-cada-llamada) recien arreglo del lado
--    del servidor. Unico escritor legitimo: diagnose-plant via adminClient
--    (service_role, bypasea RLS). Cero referencias de escritura en
--    frontend/ ni mobile/ (confirmado, solo leen diagnosis_count).
--    Mismo patron ya aplicado a diagnosis_logs (20260808000003) y
--    user_streaks/user_xp_log (fases anteriores): dato calculado por el
--    sistema, sin caso de uso legitimo de escritura directa del cliente.
--
-- 2) scheduled_tasks.xp_awarded: el cliente puede escribir esta columna
--    directo (parte de la policy "tasks: own"/"tasks: complete own",
--    ambas sin restriccion de columnas). Confirmado explotable: resetear
--    xp_awarded=false en una tarea ya completada, y volver a llamar
--    handle_task_completion() -- la RPC otorga XP de nuevo (100 -> 200 XP
--    verificado en la prueba). frontend/src/lib/sync.ts SI necesita poder
--    escribir esta columna directo (linea 290, xp_awarded:true, junto con
--    completion_notes que la RPC no acepta) -- por eso el fix NO puede ser
--    quitar el acceso de escritura completo a scheduled_tasks, solo proteger
--    esta columna especifica. completed/completed_at/completion_notes
--    quedan sin cambios (deshacer y notas siguen funcionando igual).
--
-- Mecanismo identico al ya usado en profiles: trigger BEFORE UPDATE que
-- revierte xp_awarded a OLD.xp_awarded cuando current_user='authenticated'.
-- handle_task_completion() es SECURITY DEFINER (owner postgres) -- su
-- propio UPDATE interno de xp_awarded=true corre con current_user=postgres,
-- no se ve afectado por el guard, exactamente el mismo mecanismo ya
-- probado con protect_profile_system_columns.
--
-- ROLLBACK si causa una regresion inesperada:
--   CREATE POLICY "ai_usage: own" ON public.ai_usage FOR ALL
--     USING (auth.uid() = user_id);
--   DROP TRIGGER IF EXISTS protect_task_xp_awarded_trigger ON scheduled_tasks;
--   DROP FUNCTION IF EXISTS public.protect_task_xp_awarded();

-- ────────────────────────────────────────────────────────────────────────
-- 1. ai_usage: solo lectura para el cliente.
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_usage: own" ON public.ai_usage;
CREATE POLICY "ai_usage: read own" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- 2. scheduled_tasks.xp_awarded: protegida contra escritura directa del
--    cliente, sin tocar el resto de las columnas.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_task_xp_awarded()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.xp_awarded := OLD.xp_awarded;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_task_xp_awarded_trigger ON public.scheduled_tasks;
CREATE TRIGGER protect_task_xp_awarded_trigger
  BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.protect_task_xp_awarded();

-- Sin cambios en: "tasks: own", "tasks: complete own", ninguna otra policy
-- ni columna de scheduled_tasks o ai_usage.
