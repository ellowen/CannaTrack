-- Columnas adicionales para onboarding, streak completo y gamificacion

alter table profiles
  add column if not exists onboarding_completed boolean default false,
  add column if not exists best_streak          int     default 0,
  add column if not exists last_activity_date   date    default null;

-- Marcar usuarios existentes como onboarding completado
-- (ya tienen plantas, no queremos mandarlos al onboarding)
update profiles
set onboarding_completed = true
where id in (select distinct user_id from plants);
