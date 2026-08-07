-- CRITICO: handle_new_user() (SECURITY DEFINER) no fijaba su propio
-- search_path. Una funcion SECURITY DEFINER cambia el rol de EJECUCION
-- pero NO el search_path -- eso lo hereda de la sesion que la invoca.
-- supabase_auth_admin (el rol real con el que GoTrue corre) tiene
-- search_path='auth' (sin 'public'), asi que `insert into profiles (...)`
-- (sin calificar el schema) fallaba con "relation profiles does not exist"
-- dentro del trigger on_auth_user_created -- GoTrue lo reporta como
-- "Database error creating new user" (500) al hacer signup real.
--
-- Esto explica por que restaurar el trigger (migracion anterior) sin este
-- fix habria roto el signup real en vez de arreglarlo: antes, sin trigger,
-- el signup "funcionaba" pero dejaba al usuario sin profile (silencioso);
-- con el trigger sin este fix, el signup fallaba de forma ruidosa (500).
-- Confirmado reproduciendo el fallo real corriendo el INSERT en una
-- transaccion con SET LOCAL role = 'supabase_auth_admin'.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;
