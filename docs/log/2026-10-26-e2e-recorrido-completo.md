# 2026-10-26 - E2E de punta a punta con las 6 variedades reales (y 7 bugs que aparecieron)

## Que se hizo
Suite E2E que recorre la web completa con las 6 variedades reales (Dutch Passion y Mountain Seeds), todo outdoor/tierra/1 maceta, con los litros del plan de siembra. Suite desktop completa: 199 pasan, 1 skip (flujo real contra Supabase, requiere credenciales).

**Limite importante:** el usuario y el plan Pro son SIMULADOS. No se creo ninguna cuenta real ni se toco produccion. `blockSupabase` + el nuevo `installFakeBackend` responden como Supabase, con estado. Para un E2E contra el backend real hace falta una cuenta de testing creada por el usuario (ver `e2e/README.md`, variables `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`).

### Infraestructura
- `e2e/helpers/fakeBackend.ts`: PostgREST en memoria (eq/neq/in/is, order, limit, count/HEAD, single, upsert, patch, delete), storage de fotos, RPC `start_flora_phase` y `handle_task_completion` (suma XP y racha al perfil), funcion `delete-account`, y `setOffline()` que corta navegador y servidor a la vez.
- `e2e/helpers/journey.ts`: `createPlantViaUi` (formulario real de 3 pasos, eligiendo la variedad del catalogo).
- `seedApp({ keepLocalState: true })`: siembra el almacenamiento local solo una vez, para poder simular "cerrar y reabrir la app".

### Specs nuevos (141 tests)
`journey` (alta de las 6 por la UI + persistencia), `lifecycle` (tareas, EC/pH, diario con foto, floracion, cosecha, descarte, reactivar, editar), `home-calendar`, `plants-inventory-profile` (filtros, busqueda, inventario, perfil, fotos, limites Free), `settings`, `new-plant-form` (todas las opciones y validaciones), `custom-table`, `onboarding-offline`.

## Bugs reales que encontro el recorrido (ya corregidos)
1. **Deshacer una tarea en el detalle de planta y en el calendario no se guardaba en Supabase** (solo Home lo hacia). Tras recargar volvia a aparecer completada.
2. **Offline: al volver la red se subia la planta pero NO su calendario** (la cola guardaba solo `{ plant }`).
3. **La cola de sync perdia las fechas al persistirse** (`Date` -> string): una accion encolada y reintentada tras cerrar la app fallaba para siempre. `reviveDates` en `syncQueue.ts`.
4. **Perfil > Cuenta decia siempre "Free / GRATIS"**, incluso con plan Pro o Trial.
5. Boton "x" de borrar medicion sin nombre accesible (`aria-label` agregado).
6. Botones de busqueda y de "nueva planta" del listado sin nombre accesible.
7. (Ya corregido antes de este recorrido) `autoFlowerTotalDays` no se persistia al editar.

## Observaciones sin corregir
- `/dashboard` (no enlazada en la navegacion) marca como "Vencida" una tarea que vence hoy.
- El diagnostico por IA esta deshabilitado por flag (`AI_DIAGNOSIS_ENABLED = false`), por eso no hay tests de ese flujo.
- Las rutas se cargan con code-splitting: sin conexion, abrir una pantalla nunca visitada falla (en produccion lo cubre el service worker; en dev no).

## Pendiente
- Un E2E contra Supabase real con cuenta de testing propia (el usuario la crea).
- Commitear (nada de esto esta commiteado).
