-- APLICADA a la base de pruebas el 2026-10-27.
-- Peso cosechado (gramos) de la planta. Aditiva: columna nullable, no toca RLS,
-- triggers ni funciones. Se carga al cosechar o despues (el peso seco se conoce
-- dias despues), y se compara con el rendimiento de la ficha de la variedad.
alter table plants add column if not exists harvest_weight_g numeric(8,1)
  check (harvest_weight_g is null or (harvest_weight_g > 0 and harvest_weight_g <= 10000));
