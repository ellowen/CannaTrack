-- APLICADA A PRODUCCION el 2026-10-26 (via conexion directa a la base de pruebas del proyecto).
-- Fecha de cierre de la planta (cosecha o descarte).
--
-- Hasta ahora la app calculaba endDate solo en el cliente (usePlants.harvestPlant /
-- discardPlant) y nunca la guardaba: al recargar desde Supabase se perdia y el
-- Inventario mostraba "Ciclo prom. 0d" y tarjetas de historial sin fecha de fin.
--
-- Aditiva: columna nullable, no toca RLS, triggers ni funciones. El backfill usa
-- updated_at (momento del ultimo cambio de estado) como mejor estimacion para las
-- plantas ya cosechadas/descartadas.

alter table plants add column if not exists end_date date;

update plants
set end_date = updated_at::date
where end_date is null
  and status in ('harvested', 'discarded');
