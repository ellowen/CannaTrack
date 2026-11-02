-- Diario publico de solo lectura: el dueno genera un link (token) por planta y cualquiera con
-- el link ve el nombre, el avance y las entradas del diario (notas y fotos). Dejar de compartir
-- = borrar la fila: el link y el acceso a las fotos dejan de funcionar al instante.

CREATE TABLE IF NOT EXISTS public.plant_shares (
  plant_id   uuid PRIMARY KEY REFERENCES public.plants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_shares ENABLE ROW LEVEL SECURITY;

-- Solo el dueno ve y maneja sus links (el token no se puede listar sin ser el dueno).
DROP POLICY IF EXISTS plant_shares_owner ON public.plant_shares;
CREATE POLICY plant_shares_owner ON public.plant_shares
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );

REVOKE ALL ON public.plant_shares FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.plant_shares TO authenticated;

-- Lectura publica: devuelve solo campos aptos para mostrar. NO incluye user_id, ubicacion,
-- notas privadas de la planta, productos ni nada de la cuenta. null si el token no existe.
CREATE OR REPLACE FUNCTION public.get_public_diary(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'plant', jsonb_build_object(
      'name', p.name,
      'genetics', p.genetics,
      'genetic_type', p.genetic_type,
      'crop_type', p.crop_type,
      'status', p.status,
      'start_date', p.start_date,
      'flora_start_date', p.flora_start_date,
      'flora_days', p.flora_days,
      'vege_days', p.vege_days,
      'auto_flower_total_days', p.auto_flower_total_days,
      'auto_flora_start_day', p.auto_flora_start_day,
      'end_date', p.end_date,
      'harvest_weight_g', p.harvest_weight_g
    ),
    'logs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'week_label', l.week_label,
        'log_date', l.log_date,
        'notes', l.notes,
        'photo_path', l.photo_url
      ) ORDER BY l.log_date ASC, l.created_at ASC)
      FROM public.week_logs l WHERE l.plant_id = s.plant_id
    ), '[]'::jsonb)
  )
  FROM public.plant_shares s
  JOIN public.plants p ON p.id = s.plant_id
  WHERE s.token = p_token
$$;

REVOKE ALL ON FUNCTION public.get_public_diary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_diary(uuid) TO anon, authenticated;

-- Fotos: las politicas "own" siguen igual. Se suma una de lectura para las fotos de plantas
-- compartidas (path = <user_id>/<plant_id>/<archivo>). Va por una funcion SECURITY DEFINER
-- para que anon no necesite leer plant_shares (eso expondria los tokens).
CREATE OR REPLACE FUNCTION public.is_shared_plant(p_plant text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.plant_shares WHERE plant_id::text = p_plant)
$$;

REVOKE ALL ON FUNCTION public.is_shared_plant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_shared_plant(text) TO anon, authenticated;

DROP POLICY IF EXISTS "shared diary photos" ON storage.objects;
CREATE POLICY "shared diary photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'plant-photos' AND public.is_shared_plant((storage.foldername(name))[2]));

-- Eventos de metricas nuevos (la lista es cerrada, ver 20261028000002).
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_name_check;
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_name_check CHECK (name IN (
  'landing_view', 'landing_cta', 'demo_used', 'signup_completed',
  'onboarding_completed', 'plant_created', 'task_completed', 'data_exported',
  'diary_shared', 'shared_diary_view', 'shared_diary_cta'
));
