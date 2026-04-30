-- ============================================================
-- MIGRATION: 20260430_11_production_schema.sql
-- Tablas faltantes + indices de performance para produccion
-- ============================================================

-- 1. DIAGNOSIS LOGS — historial de diagnosticos IA
CREATE TABLE IF NOT EXISTS diagnosis_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  plant_id        uuid REFERENCES plants ON DELETE CASCADE NOT NULL,
  photo_url       text NOT NULL,
  health_score    integer CHECK (health_score BETWEEN 0 AND 100),
  summary         text,
  issues          jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE diagnosis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnosis_logs: own"
  ON diagnosis_logs FOR ALL
  USING (auth.uid() = user_id);

-- 2. AI USAGE — rate limiting de diagnosticos por usuario/mes
CREATE TABLE IF NOT EXISTS ai_usage (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month            char(7) NOT NULL,  -- formato: '2026-04'
  diagnosis_count  integer DEFAULT 0 NOT NULL,
  UNIQUE (user_id, month)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage: own"
  ON ai_usage FOR ALL
  USING (auth.uid() = user_id);

-- 3. SUBSCRIPTION EVENTS — audit trail de cambios de plan
CREATE TABLE IF NOT EXISTS subscription_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  event_type   text NOT NULL
    CHECK (event_type IN ('subscribed', 'cancelled', 'renewed', 'expired', 'trial_started')),
  provider     text DEFAULT 'manual',
  provider_id  text,
  meta         jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Solo lectura para el usuario, solo el backend (service role) inserta
CREATE POLICY "sub_events: read own"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- 4. COLUMNAS FALTANTES en plants
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS notes                  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS auto_flower_total_days integer DEFAULT 77,
  ADD COLUMN IF NOT EXISTS sex                    text DEFAULT 'unknown'
    CHECK (sex IN ('male', 'female', 'unknown')),
  ADD COLUMN IF NOT EXISTS archived_at            timestamptz;

-- 5. COLUMNAS FALTANTES en profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_plants_grown  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at          timestamptz DEFAULT now();

-- 6. INDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_plants_user_status
  ON plants (user_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_user_date
  ON scheduled_tasks (user_id, scheduled_date, completed);

CREATE INDEX IF NOT EXISTS idx_tasks_plant
  ON scheduled_tasks (plant_id);

CREATE INDEX IF NOT EXISTS idx_week_logs_plant
  ON week_logs (plant_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_week_logs_photos
  ON week_logs (plant_id) WHERE photo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diagnosis_plant
  ON diagnosis_logs (plant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnosis_user
  ON diagnosis_logs (user_id, created_at DESC);

-- 7. FUNCION: incrementar contador de plantas cuando se cosecha/descarta
CREATE OR REPLACE FUNCTION increment_plants_grown()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('harvested', 'discarded') AND OLD.status = 'active' THEN
    UPDATE profiles
    SET total_plants_grown = total_plants_grown + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_plants_grown ON plants;
CREATE TRIGGER trg_plants_grown
  AFTER UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION increment_plants_grown();
