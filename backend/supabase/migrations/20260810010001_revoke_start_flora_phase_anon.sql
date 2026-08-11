-- Complemento de 20260810010000: REVOKE ALL FROM PUBLIC no alcanza a
-- anon/authenticated cuando el proyecto tiene ALTER DEFAULT PRIVILEGES
-- otorgando EXECUTE a esos roles para funciones nuevas del schema public
-- (confirmado en vivo: tras crear la funcion nueva, anon aparecia con
-- EXECUTE pese al REVOKE FROM PUBLIC). La funcion ya rechaza llamadas
-- anonimas internamente (auth.uid() IS NULL -> raise exception), pero
-- el grant explicito debe reflejar tambien "anon -> NO" en superficie.
REVOKE EXECUTE ON FUNCTION start_flora_phase(uuid, date, jsonb) FROM anon;
