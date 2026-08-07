-- Decision de producto: el trial de 30 dias es un TRIAL PRO COMPLETO, no
-- solo una cuenta regresiva antes del muro con limites Free. Mientras
-- trial_ends_at > now(), el usuario tiene acceso equivalente a Pro.
--
-- Esta es la MISMA regla que frontend/src/lib/plan.ts (resolvePlanTier) —
-- ambos lados deben coincidir siempre. El enforcement en DB existe
-- especificamente para que esto no dependa solo del frontend: un usuario
-- no puede obtener acceso Pro modificando Zustand/localStorage/React state,
-- porque el limite real se aplica aca, en el INSERT.

CREATE OR REPLACE FUNCTION enforce_free_plant_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_is_pro boolean;
  v_trial_ends_at timestamptz;
  v_active_count int;
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  SELECT is_pro, trial_ends_at INTO v_is_pro, v_trial_ends_at
  FROM profiles WHERE id = NEW.user_id;

  -- Pro real, o trial vigente (equivalente a Pro): sin limite.
  IF v_is_pro OR (v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now()) THEN
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
