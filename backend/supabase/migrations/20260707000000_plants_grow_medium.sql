-- Agrega columna grow_medium a plants (sustrato: tierra, coco o hidroponia)
-- Feature "grow medium" del frontend: sin esta columna el dato solo vive en
-- localStorage y se pierde al recargar desde Supabase.

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS grow_medium text NOT NULL DEFAULT 'soil'
    CHECK (grow_medium IN ('soil', 'coco', 'hydro'));
