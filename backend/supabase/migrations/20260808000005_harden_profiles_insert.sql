-- PROPUESTA -- NO APLICADA A PRODUCCION TODAVIA.
-- Requiere autorizacion explicita antes de correr.
--
-- Continuacion de la auditoria read-only de `profiles`. Cierra la unica
-- via de ataque real encontrada: la policy "system insert" (WITH CHECK
-- true) permite crear una fila de profiles para CUALQUIER id sin fila
-- existente, y el trigger de proteccion (protect_profile_system_columns)
-- solo cubria BEFORE UPDATE -- nunca BEFORE INSERT. Combinadas, un cliente
-- podia insertar un profile fraudulento (is_pro=true, xp=999999,
-- trial_ends_at=fecha futura) para cualquier auth.users sin profile
-- todavia -- el caso concreto de hoy es el usuario huerfano ya
-- documentado (no se toca en esta migracion, sigue como tarea aparte).
--
-- Auditoria de dependencias (verificada contra produccion real, no
-- asumida) antes de decidir la implementacion:
--
--   handle_new_user(): SECURITY DEFINER, propietario "postgres".
--   Unico INSERT real: `insert into profiles (id, username) values (...)`
--   -- SOLO fija id y username explicitamente. Todas las demas columnas
--   (is_pro, trial_ends_at, xp, streak_days, best_streak,
--   total_plants_grown, created_at, etc.) quedan en sus defaults de
--   columna. Como corre como "postgres" (SECURITY DEFINER), el nuevo
--   trigger BEFORE INSERT (gateado por current_user='authenticated') NO
--   la afecta -- current_user es 'postgres' durante su ejecucion, no
--   'authenticated'.
--
--   revenuecat-webhook: usa service_role (bypasea RLS y el trigger, que
--   solo actua si current_user='authenticated'). Solo hace UPDATE, nunca
--   INSERT -- sin cambios de comportamiento para este flujo.
--
--   best_streak: busqueda exhaustiva en frontend/, backend/supabase/
--   functions/ y backend/supabase/migrations/ -- CERO escritores reales.
--   Existe una version LOCAL (Zustand, frontend/src/store/userStore.ts)
--   que nunca se sincroniza a profiles.best_streak. Protegerla en el
--   trigger no rompe nada porque nada la escribe hoy.
--
--   total_plants_grown: SI tiene un escritor real -- el trigger
--   increment_plants_grown() (AFTER UPDATE ON plants), que TAMBIEN es
--   SECURITY DEFINER propiedad de "postgres". Su UPDATE interno sobre
--   profiles corre como current_user='postgres', no 'authenticated' --
--   el nuevo trigger no lo afecta, por el mismo mecanismo que protege a
--   handle_new_user().
--
-- Conclusion: el mecanismo ya usado (gatear por current_user='authenticated')
-- es correcto y suficiente para diferenciar "cliente autenticado normal"
-- de "funcion de confianza SECURITY DEFINER" -- se extiende sin modificar
-- su logica central, solo su alcance (INSERT ademas de UPDATE) y su lista
-- de columnas (+ best_streak, + total_plants_grown).
--
-- ROLLBACK si causa una regresion inesperada:
--   CREATE POLICY "profiles: system insert" ON public.profiles
--     FOR INSERT WITH CHECK (true);
--   -- y restaurar protect_profile_system_columns()/su trigger con el
--   -- cuerpo documentado en la auditoria previa (solo BEFORE UPDATE,
--   -- sin best_streak/total_plants_grown).

-- ────────────────────────────────────────────────────────────────────────
-- 1. Eliminar la policy sin ningun flujo legitimo detras.
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: system insert" ON public.profiles;

-- ────────────────────────────────────────────────────────────────────────
-- 2. Extender la proteccion a INSERT + agregar best_streak y
--    total_plants_grown a la lista de columnas protegidas. Mismo cuerpo
--    de funcion (una sola fuente de verdad para INSERT y UPDATE via
--    TG_OP), sin SECURITY DEFINER ni search_path -- igual que el
--    original, no se le agrega nada que no tenia.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      -- El cliente puede insertar su propia fila (policy "insert own"),
      -- pero las columnas calculadas/del sistema siempre arrancan en su
      -- valor seguro, ignorando lo que el cliente haya mandado.
      NEW.is_pro             := false;
      NEW.trial_ends_at      := now() + interval '30 days';
      NEW.xp                 := 0;
      NEW.streak_days        := 0;
      NEW.best_streak        := 0;
      NEW.total_plants_grown := 0;
      NEW.created_at         := now();
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.is_pro             := OLD.is_pro;
      NEW.trial_ends_at      := OLD.trial_ends_at;
      NEW.xp                 := OLD.xp;
      NEW.streak_days        := OLD.streak_days;
      NEW.best_streak        := OLD.best_streak;
      NEW.total_plants_grown := OLD.total_plants_grown;
      NEW.created_at         := OLD.created_at;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_system_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_system_columns_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_system_columns();

-- Sin cambios en: profiles: own (SELECT), profiles: insert own (INSERT),
-- profiles: update own (UPDATE), profiles: system update xp (UPDATE),
-- profiles: delete own (DELETE). Ninguna se toca en esta migracion.
