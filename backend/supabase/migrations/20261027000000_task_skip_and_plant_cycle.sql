-- APLICADA A PRODUCCION el 2026-10-27 (via conexion directa a la base de pruebas del proyecto).
--
-- 1) Cancelar / reprogramar tareas (antes solo se podia marcar hecha y deshacer):
--    * skipped          : la tarea se cancelo (p.ej. llovio); no cuenta como pendiente ni como hecha
--    * skip_reason      : motivo libre/corto
--    * rescheduled_from : fecha original si la tarea se movio (scheduled_date pasa a la nueva)
--
-- 2) Ciclo por planta, ademas de flora_days / auto_flora_start_day:
--    * vege_days            : duracion del vegetativo (fotoperiodicas). NULL = 42 (6 semanas)
--    * irrigation_per_week  : riegos por semana. NULL = patron actual (2)
--
-- Aditiva: columnas con default o nullable, no toca RLS ni triggers (las politicas
-- "tasks: own" / "tasks: complete own" ya cubren estas columnas).

alter table scheduled_tasks
  add column if not exists skipped boolean not null default false,
  add column if not exists skip_reason text,
  add column if not exists rescheduled_from date;

alter table plants
  add column if not exists vege_days integer,
  add column if not exists irrigation_per_week smallint;

alter table plants
  drop constraint if exists plants_vege_days_range,
  add constraint plants_vege_days_range check (vege_days is null or vege_days between 14 and 180);

alter table plants
  drop constraint if exists plants_irrigation_per_week_range,
  add constraint plants_irrigation_per_week_range check (irrigation_per_week is null or irrigation_per_week between 1 and 7);
