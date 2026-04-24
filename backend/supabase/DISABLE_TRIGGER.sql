-- Deshabilitar temporalmente el trigger que está bloqueando signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cuando el usuario haga login, creamos el perfil manualmente desde el frontend
-- O podemos crear un endpoint que lo haga
