-- Seguridad: user_streaks tenia policy "FOR ALL USING (auth.uid() = user_id)",
-- permitiendo que un usuario autenticado escriba directo su propia fila
-- (ej. PATCH /rest/v1/user_streaks?user_id=eq.<self> {"streak_days": 999}).
-- El frontend NUNCA escribe esta tabla directo -- streak_days/max_streak
-- son 100% manejados por la funcion SECURITY DEFINER update_streak(),
-- igual que user_xp_log (que ya era read-only). Sin ningun caso de uso
-- legitimo para escritura directa del cliente, se restringe a solo lectura.

DROP POLICY IF EXISTS "streaks: own" ON user_streaks;
CREATE POLICY "streaks: read own" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);
