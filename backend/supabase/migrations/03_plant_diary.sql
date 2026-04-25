-- Historial/diario de cada planta (fotos, notas, diagnosticos IA)
CREATE TABLE IF NOT EXISTS plant_diary (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id    UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  photo_url   TEXT,
  type        TEXT NOT NULL DEFAULT 'observation'
                CHECK (type IN ('observation', 'photo', 'diagnosis', 'harvest', 'event')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plant_diary_plant_id_idx ON plant_diary(plant_id);
CREATE INDEX IF NOT EXISTS plant_diary_user_id_idx  ON plant_diary(user_id);
CREATE INDEX IF NOT EXISTS plant_diary_date_idx     ON plant_diary(date DESC);

ALTER TABLE plant_diary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage their own diary entries"
  ON plant_diary FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
