-- CRITICO: auditoria de produccion encontro que las FUNCIONES
-- handle_new_user() y handle_task_completion() existian en la DB real,
-- pero los TRIGGERS que las invocan (on_auth_user_created en auth.users,
-- on_task_completed en scheduled_tasks) nunca se crearon -- most probable
-- causa raiz: una aplicacion parcial historica de migraciones via SQL
-- Editor que corto antes de llegar a las sentencias CREATE TRIGGER
-- (el mismo modo de falla que se repitio en esta sesion al intentar
-- `supabase db push`: un statement no-idempotente mas adelante en el
-- archivo aborta la transaccion y todo lo posterior nunca corre).
--
-- Impacto real confirmado antes de este fix:
-- - Un usuario nuevo que se registra NO obtiene fila en `profiles` (no hay
--   trigger que la cree, y el frontend no tiene fallback de creacion
--   manual) -- username, is_pro, trial_ends_at quedan sin existir para ese
--   usuario.
-- - Completar una tarea no otorga XP ni actualiza racha (gamificacion
--   completamente inerte en produccion pese a estar 100% implementada en
--   la app y en las funciones SQL).

-- Nota: NO se restaura un trigger on_task_completed. La gamificacion de
-- tareas en produccion real usa un mecanismo distinto al de la migracion
-- 20260424_03_gamification.sql (que quedo desactualizada): una funcion RPC
-- handle_task_completion(task_id_param, user_id_param) — ver
-- 20260807000002_wire_task_completion_rpc.sql para el fix de ese flujo.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
