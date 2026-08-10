-- PROPUESTA -- NO APLICADA A PRODUCCION TODAVIA.
-- Requiere autorizacion explicita antes de correr (Fase 3 de
-- generalizacion multi-cultivo -- ver GLOBAL GENERALIZATION reports).
--
-- Objetivo: permitir que el modelo de datos represente una planta que NO
-- sea cannabis, sin romper ni una sola planta de cannabis existente.
--
-- Auditoria previa (verificada en vivo contra produccion, no asumida a
-- partir de los archivos de este repo -- ver MIGRATIONS.md: el historial
-- de archivos aqui NO siempre coincide con lo que corre en produccion):
--
--  * plants.genetic_type: text NOT NULL, CHECK IN ('feminized','autoflower','regular').
--    Este es el UNICO campo que hoy impide crear una planta sin metadata
--    de cannabis. 9 filas reales en produccion, las 9 con genetic_type
--    no nulo (0 nulls).
--  * plants.sex: YA es nullable hoy (default 'unknown', sin NOT NULL) y su
--    CHECK (sex = ANY(['unknown','female','male'])) ya es NULL-permisivo
--    por semantica estandar de SQL (un CHECK nunca se evalua contra NULL
--    como violacion). No requiere ningun cambio de schema.
--  * plants.location / plants.grow_medium / plants.status: fuera de
--    alcance de esta fase, sus CHECK no mencionan genetic_type/sex.
--  * Ningun trigger (enforce_free_plant_limit_trigger, trg_plants_grown)
--    ni funcion (enforce_free_plant_limit, increment_plants_grown,
--    handle_task_completion, start_flora_phase) lee genetic_type ni sex.
--  * La unica policy RLS de plants ("plants: own", FOR ALL,
--    auth.uid() = user_id) no depende de estas columnas.
--  * Ningun Edge Function del repo (diagnose-plant, revenuecat-webhook,
--    send-daily-push) referencia genetic_type/sex.
--  * plants.nutrition_table_id no tiene FK a nutrition_tables -- es texto
--    libre con default 'revegetar'. No se toca en esta migracion.
--
-- Conclusion de la auditoria: el cambio de schema necesario es minimo --
-- una columna nueva + relajar una sola restriccion NOT NULL. Nada mas en
-- el schema depende de que genetic_type sea obligatorio.
--
-- ROLLBACK si causa una regresion inesperada:
--   ALTER TABLE public.plants DROP CONSTRAINT IF EXISTS plants_cannabis_requires_genetic_type;
--   ALTER TABLE public.plants ALTER COLUMN genetic_type SET NOT NULL;
--   ALTER TABLE public.plants DROP COLUMN IF EXISTS crop_type;
--   (Seguro solo si, al momento del rollback, ninguna fila real quedo con
--    crop_type <> 'cannabis' y genetic_type NULL -- verificar antes con
--    SELECT count(*) FROM plants WHERE genetic_type IS NULL; debe dar 0.)

-- ────────────────────────────────────────────────────────────────────────
-- 1. crop_type: nueva columna, aditiva, con default que backfillea las
--    filas existentes automaticamente (Postgres aplica el DEFAULT a las
--    filas ya existentes al agregar una columna NOT NULL DEFAULT constante,
--    sin necesidad de un UPDATE separado).
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plants
  ADD COLUMN crop_type text NOT NULL DEFAULT 'cannabis';

COMMENT ON COLUMN public.plants.crop_type IS
  'Tipo de cultivo. ''cannabis'' es el unico valor usado hoy por la app; '
  'texto libre (no enum) para no cerrar la puerta a futuros cultivos antes '
  'de tener uno real. Ver frontend/src/types/plant.ts CropType.';

-- ────────────────────────────────────────────────────────────────────────
-- 2. genetic_type deja de ser obligatorio a nivel de columna -- pero solo
--    para plantas que NO son cannabis (ver constraint #3). El CHECK
--    existente (plants_genetic_type_check) no se toca: ya es
--    NULL-permisivo por default, sigue restringiendo los 3 valores de
--    cannabis cuando el campo SI esta seteado.
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plants
  ALTER COLUMN genetic_type DROP NOT NULL;

-- ────────────────────────────────────────────────────────────────────────
-- 3. Regla de negocio enforced en el propio schema, no solo en TypeScript:
--    si crop_type = 'cannabis', genetic_type sigue siendo obligatorio.
--    Para cualquier otro crop_type, NULL es valido.
--    Seguro de agregar validado (no NOT VALID): las 9 filas existentes
--    tienen crop_type='cannabis' (recien seteado por el DEFAULT del paso 1)
--    Y genetic_type NOT NULL (invariante desde antes de esta migracion),
--    asi que las 9 satisfacen la condicion trivialmente.
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plants
  ADD CONSTRAINT plants_cannabis_requires_genetic_type
  CHECK (crop_type <> 'cannabis' OR genetic_type IS NOT NULL);

-- Sin cambios en: sex, location, grow_medium, status, nutrition_table_id,
-- ninguna policy RLS, ningun trigger, ninguna funcion, ninguna otra tabla.
