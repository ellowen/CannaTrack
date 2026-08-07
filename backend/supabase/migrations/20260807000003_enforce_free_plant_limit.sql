-- Seguridad/negocio: el limite de "1 planta activa" para el plan Free
-- solo estaba en la UI (Gates del plan Free vs Pro). Un usuario Free podia
-- saltarselo llamando directo a supabase.from('plants').insert(...) desde
-- la consola del navegador (mismo tipo de bypass que is_pro/trial_ends_at).
-- RLS es por fila (auth.uid() = user_id), no puede expresar "no mas de N
-- filas" -- se resuelve con un trigger BEFORE INSERT.
--
-- Nota: el trial actual NO desbloquea el limite de plantas (profile.is_pro
-- es la unica fuente del plan, ver useSubscription()/AuthContext.loadUserData
-- -- setPlan(profile.is_pro ? 'pro' : 'free') no mira trial_ends_at). Este
-- trigger refleja ese mismo comportamiento ya implementado en el frontend,
-- no lo cambia.

CREATE OR REPLACE FUNCTION enforce_free_plant_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_is_pro boolean;
  v_active_count int;
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  SELECT is_pro INTO v_is_pro FROM profiles WHERE id = NEW.user_id;
  IF v_is_pro THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_active_count
  FROM plants
  WHERE user_id = NEW.user_id AND status = 'active';

  IF v_active_count >= 1 THEN
    RAISE EXCEPTION 'free_plant_limit_reached'
      USING HINT = 'El plan Free permite 1 planta activa. Actualiza a Pro para agregar mas.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_plant_limit_trigger ON plants;
CREATE TRIGGER enforce_free_plant_limit_trigger
  BEFORE INSERT ON plants
  FOR EACH ROW EXECUTE FUNCTION enforce_free_plant_limit();
