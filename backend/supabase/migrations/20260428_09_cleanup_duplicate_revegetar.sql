-- Limpia la entrada duplicada de REVEGETAR
-- Origen: migration 20260424_02_nutrition_tables.sql insertó id='revegetar' (schema viejo)
--         migration 08_populate_nutrition_tables.sql insertó id='revegetar-v1' (schema canónico)
-- Fix: migrar plantas al id canónico y eliminar el duplicado viejo

-- 1. Reasignar plantas que usen el id viejo
UPDATE plants
SET nutrition_table_id = 'revegetar-v1'
WHERE nutrition_table_id = 'revegetar';

-- 2. Eliminar datos del id viejo (en orden por FK)
DELETE FROM nutrition_products
WHERE week_id IN (
  SELECT id FROM nutrition_weeks WHERE table_id = 'revegetar'
);

DELETE FROM nutrition_weeks WHERE table_id = 'revegetar';

DELETE FROM nutrition_lines WHERE table_id = 'revegetar';

DELETE FROM nutrition_tables WHERE id = 'revegetar';
