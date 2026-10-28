-- Metricas de uso propias, anonimas y sin cookies: un id de sesion aleatorio (sessionStorage),
-- sin email ni user_id. Solo se puede INSERTAR (anon y authenticated); leer es solo con
-- service_role / SQL. Los nombres de evento son una lista cerrada (CHECK) para que nadie
-- pueda usar la tabla como basurero.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL,
  name       text NOT NULL CHECK (name IN (
    'landing_view', 'landing_cta', 'demo_used', 'signup_completed',
    'onboarding_completed', 'plant_created', 'task_completed', 'data_exported'
  )),
  path       text CHECK (char_length(path) <= 200),
  host       text CHECK (char_length(host) <= 100),
  lang       text CHECK (lang IN ('es', 'en')),
  props      jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 1024)
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_insert ON public.analytics_events;
CREATE POLICY analytics_events_insert ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

REVOKE ALL ON public.analytics_events FROM anon, authenticated;
GRANT INSERT ON public.analytics_events TO anon, authenticated;

CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx
  ON public.analytics_events (name, created_at DESC);
