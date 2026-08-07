-- Seguridad: profiles.is_pro y profiles.trial_ends_at NO estaban protegidas
-- contra escritura directa del cliente.
--
-- La policy "profiles: system update xp" (20260424_04_rls_policies.sql) es
-- `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` — RLS es a nivel de
-- FILA, no de columna. Cualquier usuario autenticado podia hacer:
--   PATCH /rest/v1/profiles?id=eq.<su-propio-id>  { "is_pro": true }
--   PATCH /rest/v1/profiles?id=eq.<su-propio-id>  { "trial_ends_at": "2099-01-01" }
-- y la escritura se aceptaba sin ninguna verificacion adicional, saltandose
-- el paywall por completo (confirmado por analisis estatico: no existe
-- ningun trigger ni policy que restrinja columnas en profiles).
--
-- Fix: trigger BEFORE UPDATE que revierte columnas "de sistema" a su valor
-- anterior cuando la escritura viene DIRECTO de un cliente autenticado.
--
-- Version anterior de este fix usaba pg_trigger_depth() para distinguir
-- una escritura directa de una legitima -- pero se descubrio en auditoria
-- que la gamificacion real en produccion NO pasa por un trigger anidado:
-- log_xp()/update_streak() son funciones RPC SECURITY DEFINER invocadas
-- DIRECTO por el cliente (sin trigger de por medio), asi que
-- pg_trigger_depth() bloqueaba tambien esas escrituras legitimas.
--
-- Fix correcto: usar current_user. Dentro de una funcion SECURITY DEFINER
-- (log_xp, update_streak, handle_task_completion, todas owned by postgres),
-- current_user pasa a ser el OWNER de la funcion durante su ejecucion —
-- deja de ser 'authenticated' aunque auth.role() (que lee un GUC de sesion,
-- no cambia con SECURITY DEFINER) siga reportando 'authenticated'. Una
-- escritura DIRECTA del cliente via PostgREST si ejecuta con
-- current_user = 'authenticated' (el rol real con el que corre el
-- statement). service_role y el SQL editor tampoco son 'authenticated'.
CREATE OR REPLACE FUNCTION protect_profile_system_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.is_pro        := OLD.is_pro;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.xp            := OLD.xp;
    NEW.streak_days   := OLD.streak_days;
    NEW.created_at    := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_system_columns_trigger ON profiles;
CREATE TRIGGER protect_profile_system_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_system_columns();
