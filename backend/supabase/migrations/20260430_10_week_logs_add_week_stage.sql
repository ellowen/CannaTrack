-- Agrega columnas week y stage a week_logs
-- week: numero de semana (entero, ej: 1, 2, 3...)
-- stage: etapa del ciclo (VEGE o FLORA)

ALTER TABLE week_logs
  ADD COLUMN IF NOT EXISTS week  integer,
  ADD COLUMN IF NOT EXISTS stage text;
