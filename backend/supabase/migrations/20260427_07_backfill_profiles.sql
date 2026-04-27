-- Backfill: crear profiles para usuarios que no tienen uno todavia
-- Necesario cuando el trigger on_auth_user_created no fireo para usuarios existentes

insert into profiles (id, username, created_at, updated_at)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1),
    'user_' || substring(u.id::text, 1, 8)
  ),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from profiles p where p.id = u.id
);

-- Marcar como onboarding completado a quienes ya tienen plantas
update profiles
set onboarding_completed = true
where onboarding_completed = false
  and id in (select distinct user_id from plants);
