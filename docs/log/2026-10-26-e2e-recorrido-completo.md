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
- (commiteado y pusheado, ver historial de git)

## Segunda tanda: revision contra datos reales (cuenta pro@cannatrack.test)
Con la base real conectada (DATABASE_URL en `.env.local`, ignorado por git) y la sesion Pro abierta en el navegador integrado, la revision pantalla por pantalla encontro:

1. **Las autofloreciente se trataban como vegetativas para siempre.** Las autos no tienen `floraStartDate` (florecen solas al dia 35) y varias pantallas decidian "flora" solo con ese campo: la planta "Ww" (auto, dia 76) aparecia como `V11`, el filtro Flora la excluia y sus 33 tareas de floracion quedaban ocultas. Ahora `getFloraStart` / `getActiveCycle` (flora-cycle.ts) resuelven el ciclo y los usan useTasks, Home, listado, Dashboard e Inventario.
2. **El listado mostraba la semana mal** (`F7` donde Home decia `F6`) y la etapa "Vegetativo" junto a una `F`. Corregido (semana = floor(dias/7)+1).
3. **La fecha de cierre (cosecha/descarte) no se guardaba**: la tabla `plants` no tenia `end_date`. El Inventario mostraba "Ciclo prom. 0d". Migracion `20261026000000_plants_end_date.sql` (APLICADA) + guardado y lectura en `sync.ts`; ahora muestra 82d.
4. Las tarjetas de historial calculaban el fin como floraStart + 56 dias fijos; ahora usan la fecha real o la cosecha estimada.

Observaciones sin corregir:
- Autos con `flora_days` sin definir (plantas anteriores a la migracion de ciclo): el cronograma de floracion sigue 56 dias aunque la cosecha sea al dia 75, asi que quedan tareas de riego posteriores a la cosecha. Las plantas nuevas desde el catalogo ya no tienen este problema.
- La tarea de cosecha de una auto se etiqueta con la ultima semana de la tabla (F8) aunque la planta este en F6.
- "Vegetativa / Pre-Flora" en el encabezado de Home es el nivel de gamificacion, no la fase de la planta (confunde por el nombre).

Infra: `e2e/real/discard-active-plants.spec.ts` descarta desde la UI las plantas activas de la cuenta Pro real (se saltea sin `e2e/.auth/pro.json`). `run-migrations.js` ya no tiene la clave secreta hardcodeada (se roto la clave en Supabase).

## Tercera tanda (2026-10-27): observaciones que quedaban, corregidas
- **Autos con tareas despues de la cosecha:** una auto (cosecha dia 75, floracion por defecto 56 dias desde el dia 35 = hasta el 91) agendaba riegos pasada la cosecha. Ahora `generatePlantSchedule` corta todo lo posterior al dia de cosecha. El test que contaba 61 tareas codificaba ese defecto: ahora 55 y hay un test de "nada despues de la cosecha". Las plantas ya creadas conservan sus tareas guardadas hasta que se regeneren (Ajustes > Regenerar).
- **Etiqueta de la tarea de cosecha de una auto:** decia F8 (ultima semana de la tabla); ahora lleva la semana de floracion real en que cae.
- **/dashboard:** una tarea de hoy se marcaba "Vencida"; ahora dice "Hoy" y solo las de dias anteriores dicen "Vencida".
- Test de solo lectura contra la cuenta Pro real (`e2e/real/pro-account-smoke.spec.ts`, se saltea sin sesion guardada).

Sigue pendiente (decision de producto): el diagnostico por IA esta apagado por flag.
