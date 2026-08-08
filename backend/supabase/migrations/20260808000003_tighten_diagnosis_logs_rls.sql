-- Seguridad: diagnosis_logs tenia policy "FOR ALL USING (auth.uid() = user_id)",
-- permitiendo que un usuario autenticado escriba/edite/borre directo su
-- propio historial de diagnosticos (ej. POST /rest/v1/diagnosis_logs
-- {user_id: self, health_score: 100, summary: "..."} sin haber corrido
-- jamas un diagnostico real). El frontend nunca escribe esta tabla directo:
-- el unico insert real lo hace la Edge Function diagnose-plant con el
-- cliente admin (service_role, bypasea RLS). Mismo patron ya aplicado a
-- user_xp_log y user_streaks (20260807000002_tighten_user_streaks_rls.sql):
-- datos calculados por el sistema, sin caso de uso legitimo de escritura
-- directa del cliente -> se restringe a solo lectura.

DROP POLICY IF EXISTS "diagnosis_logs: own" ON diagnosis_logs;
CREATE POLICY "diagnosis_logs: read own" ON diagnosis_logs
  FOR SELECT USING (auth.uid() = user_id);
