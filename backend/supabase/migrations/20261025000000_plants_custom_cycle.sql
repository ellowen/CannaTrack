-- NO APLICADA. Revisar y aplicar a mano antes de usar la duracion de floracion
-- personalizada desde la app (el sync solo envia estas columnas si la planta
-- las define, asi que la app sigue funcionando sin esta migracion mientras
-- nadie personalice el ciclo).
--
-- Objetivo: ciclo de floracion por planta (variedades reales como Blue Applez
-- ~9 semanas o Citric Lime Pie 65 dias no calzan con las 8 semanas fijas).
--
--  * flora_days: duracion de la floracion en dias. NULL = 56 (8 semanas, la de
--    las tablas nutricionales).
--  * auto_flora_start_day: autofloreciente, dia desde la siembra en que entra
--    en floracion. NULL = 35.
--
-- Aditiva: columnas nullable sin default, ninguna fila existente cambia, no
-- toca RLS, triggers ni funciones. Los CHECK solo acotan valores razonables.

alter table plants
  add column if not exists flora_days integer,
  add column if not exists auto_flora_start_day integer;

alter table plants
  drop constraint if exists plants_flora_days_range,
  add constraint plants_flora_days_range
    check (flora_days is null or flora_days between 28 and 140);

alter table plants
  drop constraint if exists plants_auto_flora_start_day_range,
  add constraint plants_auto_flora_start_day_range
    check (auto_flora_start_day is null or auto_flora_start_day between 14 and 90);
