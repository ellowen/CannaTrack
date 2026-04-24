-- FIX: RLS policy en profiles para permitir trigger del sistema

drop policy if exists "profiles: own" on profiles;

create policy "profiles: own" on profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: delete own" on profiles
  for delete using (auth.uid() = id);

-- Permitir que el trigger del sistema cree perfiles
create policy "profiles: system insert" on profiles
  for insert with check (true);
