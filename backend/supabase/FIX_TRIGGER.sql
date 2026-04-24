-- FIX: Mejorar trigger handle_new_user

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_username text;
begin
  -- Extraer username del email de forma más robusta
  v_username := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(new.email, '@', 1),
    'user_' || substring(new.id::text, 1, 8)
  );

  -- Insertar en profiles
  insert into profiles (id, username, created_at, updated_at)
  values (new.id, v_username, now(), now())
  on conflict (id) do nothing;

  return new;
exception when others then
  -- Log del error pero no detener el signup
  raise warning 'Error creando profile para user %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
