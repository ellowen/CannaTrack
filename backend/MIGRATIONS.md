# Estado real de las migraciones — auditoria 2026-08-08

`supabase migration list` no reconoce NINGUNA de las 27 migraciones locales
como aplicada en remoto (columna `remote` vacia para todas salvo un
placeholder inicial). Esto **no** significa que el schema real este vacio
— significa que la tabla de bookkeeping del CLI (`supabase_migrations.schema_migrations`)
nunca se uso: el historial real del proyecto se construyo pegando SQL a
mano en el SQL Editor del dashboard de Supabase, migracion por migracion,
sin pasar nunca por `supabase db push`. El schema real esta, en su mayoria,
al dia — pero el REGISTRO de que esta al dia no existe.

Confirmado intentando `supabase db push` en esta auditoria: se corto en la
primera migracion (`01_full_schema.sql`) porque un `create policy` sin
`drop policy if exists` antes choco con una policy que ya existia en
produccion — la migracion NO es re-aplicable de forma idempotente tal
como esta escrita.

## Que existe REALMENTE en produccion (verificado con SQL directo, no asumido)

**16 tablas**: `ai_usage`, `diagnosis_logs`, `measurements`, `nutrition_lines`,
`nutrition_products`, `nutrition_tables`, `nutrition_weeks`, `plants`,
`profiles`, `push_subscriptions`, `scheduled_tasks`, `subscription_events`,
`subscriptions`, `user_streaks`, `user_xp_log`, `week_logs`. RLS habilitado
en las 16, sin excepciones.

**14 funciones**: `enforce_free_plant_limit`, `ensure_profile_exists`,
`get_level_info`, `get_user_level`, `get_user_summary`, `handle_new_user`,
`handle_task_completion`, `increment_plants_grown`, `is_plant_owner`,
`is_task_owner`, `log_xp`, `protect_profile_system_columns`,
`start_flora_phase`, `update_streak`.

**Triggers reales** (antes de esta auditoria, `on_auth_user_created` NO
existia — ver hallazgos abajo): `on_auth_user_created` (auth.users),
`enforce_free_plant_limit_trigger` (plants), `protect_profile_system_columns_trigger`
(profiles), `trg_plants_grown` (plants), mas los internos de Storage.

## Migraciones locales SIN rastro en produccion

Estas funciones/tablas existen en produccion pero **ningun archivo en
`supabase/migrations/` las crea** — se agregaron 100% a mano, en algun
momento, sin dejar registro en el repo:

- `subscription_events` (tabla completa — proposito exacto sin documentar,
  probablemente logging de eventos de un futuro webhook de pago)
- `log_xp(user_id, xp, reason)`, `update_streak(user_id)`,
  `ensure_profile_exists(user_id, email)`, `increment_plants_grown()`
- `handle_task_completion(task_id_param, user_id_param)` — el archivo
  `20260424_03_gamification.sql` define una funcion CON EL MISMO NOMBRE
  pero firma y logica totalmente distintas (trigger de 0 argumentos vs
  RPC de 2 argumentos que devuelve json). El archivo del repo esta
  **desactualizado**, no derivado de lo que corre en produccion.

## Que se corrigio en esta auditoria (SI con migracion en el repo)

`20260807000000` a `20260808000002` — aplicadas a produccion vía
`supabase db query -f <archivo>` (no via `db push`, para evitar repetir el
error de idempotencia de arriba). Cada una se verifico contra la DB real
en una transaccion con `ROLLBACK` antes de aplicarse en serio. Detalle de
cada hallazgo en el informe de release gate.

## Plan seguro para recuperar una historia de migraciones consistente

**No se ejecuto en esta auditoria** — alto riesgo de romper produccion sin
un beneficio inmediato para el release. Queda documentado como tarea
separada:

1. `supabase db dump --schema public` contra produccion → nuevo archivo
   unico `00000000000000_baseline.sql` que representa el schema REAL tal
   cual esta hoy (no lo que los archivos viejos dicen que deberia ser).
2. Archivar (no borrar) los 27 archivos viejos en `supabase/migrations/_archive/`
   — quedan como historial legible, pero dejan de ser parte del set que
   `supabase db push` intenta aplicar.
3. `supabase migration repair --status applied <version>` para el baseline
   nuevo, marcandolo como ya aplicado (evita que push intente recrear
   tablas que ya existen).
4. A partir de ahi, TODA escritura de schema pasa por un archivo de
   migracion nuevo + `supabase db push` real — nunca mas SQL Editor a
   mano sin commitear el archivo correspondiente el mismo dia.

Hacer esto durante el release actual es innecesariamente arriesgado
(requiere tocar la tabla de bookkeeping de produccion sin un beneficio de
negocio inmediato). Recomendado como primera tarea del proximo ciclo, no
como bloqueante de este release.
