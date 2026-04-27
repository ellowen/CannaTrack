-- Agregar columna custom_products a plants
-- Permite a los usuarios guardar sus propios productos con dosis personalizadas

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS custom_products jsonb DEFAULT '[]';
