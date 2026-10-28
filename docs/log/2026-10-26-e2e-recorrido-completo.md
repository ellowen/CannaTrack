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

## Cuarta tanda (2026-10-27): editar una planta borraba las tareas completadas
Hallazgo al revisar si se pueden "ajustar parametros": `usePlants.editPlant` regeneraba el calendario ENTERO ante cualquier edicion (aunque fuera solo el nombre) y lo guardaba con `replaceTasksForPlantInSupabase`, que borra todo. Se perdian las tareas completadas (y su `xp_awarded`), por lo que se podia volver a ganar XP por la misma tarea. Ajustes > Regenerar ya lo hacia bien, y su comentario decia que editPlant tambien, asi que fue una regresion.

Arreglo: `lib/schedule-merge.ts` (`mergeRegeneratedSchedule`, `scheduleAffectingChange`). editPlant solo regenera si cambia algo que afecta el calendario (fechas, ciclo, tipo, tabla, productos), conserva las completadas con su id/xp y reemplaza solo las pendientes. Tambien se corrigio el criterio de Ajustes: antes completar UN riego de una semana descartaba los DOS riegos nuevos de esa semana (la clave era ciclo|semana|tipo); ahora se descarta uno por cada completada.

Otros hallazgos sin corregir (ver respuesta al usuario): no existe cancelar/saltar/reprogramar una tarea (removeTask/updateTask existen en el store pero ninguna pantalla los usa); una planta con fecha de inicio futura se muestra como "V-4 D-28" en Home; el diario/cosecha no registra el peso cosechado.

## Quinta tanda (2026-10-27): cancelar/mover tareas, vegetativo y riegos por semana
Pedido: poder ajustar los parametros de cada semilla y cancelar riegos (p.ej. por lluvia).

**Cancelar / restaurar / mover una tarea.** Antes solo existia "hecha" y "deshacer" (el boton "Saltar" solo cerraba la ventana; `removeTask`/`updateTask` del store no se usaban). Ahora la hoja de la tarea tiene "Cancelar tarea" (con motivo: Llovio / No hacia falta / Ya la hice por fuera / texto libre) y "Mover a otro dia" (Manana / En 2-3 dias / selector). "Saltar" se renombro a "Ahora no".
- Cancelada: sale de Home, Dashboard, Calendario, vencidas y notificaciones; no da XP, no cuenta como incumplida (no baja la salud); queda en "Canceladas" del detalle con su motivo y boton Restaurar.
- Movida: cambia `scheduled_date` y guarda `rescheduled_from` (la fecha ORIGINAL, aunque se mueva varias veces).
- Funciona sin conexion (cola de sync: skipTask/restoreTask/rescheduleTask).
- Regenerar el calendario (editar la planta, Ajustes > Regenerar) conserva canceladas y movidas. Un test lo atajo: `replacePendingTasksForPlantInSupabase` las borraba porque en la base siguen como "no completadas"; ahora excluye `skipped` y `rescheduled_from`.

**Por planta:** `vegeDays` (duracion del vegetativo de fotoperiodicas, por defecto 42) y `irrigationPerWeek` (1-7, por defecto el patron historico de 2 por semana y 3 en limpieza). El vegetativo se escala de forma proporcional como la floracion; el aviso de "registra la floracion", el progreso, la etapa actual y los rangos EC/pH usan la duracion configurada. Las autos no tienen vegetativo configurable (florecen solas al dia `autoFloraStartDay`).

Migracion `20261027000000_task_skip_and_plant_cycle.sql` (APLICADA): scheduled_tasks.skipped/skip_reason/rescheduled_from; plants.vege_days/irrigation_per_week.


## Sexta tanda (2026-10-27): siembras planificadas
Una planta con fecha de inicio futura ("se siembra el 1/12") se veia como `V-4 D-28`, con semana negativa y dias de cosecha como si ya creciera.
- `flora-cycle.ts`: `daysUntilSowing` e `isPlanned` (por dia de calendario; solo plantas activas).
- Home: la tarjeta dice "En Nd" en vez de V/F + dia. Listado: "En Nd" y "Se siembra el d MMM". Detalle: etiqueta PLANIFICADA, cuenta regresiva "N dias para la siembra", "Siembra planificada" en el anillo; el diario no guarda la etiqueta. Inventario: dias de cultivo 0.
- `getCurrentWeek` devuelve null antes de la siembra y `getCycleProgress` marca 0% (antes negativo).
- El calendario ya arrancaba en la fecha de siembra: no hay tareas vencidas ni de hoy. El formulario aclara que se puede poner la fecha prevista.
- Una planta planificada cuenta como activa para el limite del plan Free (1).
- Tests: 4 unit (flora-cycle) y `e2e/planned-sowing.spec.ts` (4).

## Septima tanda (2026-10-27): el catalogo precarga las notas de cuidado
`STRAIN_PRESETS` ahora trae `notes` (las de la ficha en `e2e/fixtures/strains.ts`: humedad, maceta minima, soporte en flora tardia, etc.) y el formulario las carga en "Notas" al elegir la variedad. El breeder va dentro de ese texto ("Auto Strawberry Soda (Dutch Passion)...") porque la planta no tiene columna de breeder; Blue Applez no lo lleva porque la pagina no lo declara. Cambiar de variedad reemplaza las notas del catalogo, pero nunca lo que escribio el usuario. Las notas se guardan en `plants.notes` (ya existia) y se ven en el detalle.
- Tests: el spec de strains exige que preset.notes == ficha; 2 E2E nuevos en `new-plant-form.spec.ts`.

## Octava tanda (2026-10-27): peso cosechado
- Columna `plants.harvest_weight_g numeric(8,1)` (migracion `20261028000000_plants_harvest_weight.sql`, APLICADA a la base de pruebas; check 0 < g <= 10000). Mapeada en `sync.ts` (alta, carga, update) y en `Plant.harvestWeightG`.
- La hoja de cosecha tiene "Peso cosechado (g, opcional)" (acepta coma, valida 1-10000). Tambien se puede cargar o editar despues desde el detalle de la planta cosechada (el peso seco se conoce dias despues). Offline: usa la cola (`updatePlantData`).
- El detalle muestra g, g por dia de cultivo (siembra -> cierre) y g por litro de maceta (suma de macetas).
- Comparacion con la ficha: SOLO Auto Strawberry Soda, la unica cuya pagina da cifra por planta (20-75 g outdoor). Las demas dan g/m2, que no se compara con una planta suelta, asi que muestran el peso sin veredicto. El match es por genetica del catalogo (la planta no guarda el id de la variedad); si la planta se edita a otra genetica, deja de compararse.
- Tests: 5 unit (`harvest-stats`), el spec de strains verifica que `yieldGPerPlant` coincida con la ficha, y `e2e/harvest-weight.spec.ts` (4).

## Novena tanda (2026-10-27): rediseno de la webapp (fase 1)
Pedido: vistas mas user-friendly, rapidas, con menos vueltas, y un estilo propio sin ser agresivo.

**Identidad visual.** Tipografia: titulos (h1-h3) en Fraunces (serif suave, peso fijo 600), cuerpo en Inter; ambas autoalojadas con `@fontsource-variable` (funcionan offline y se sacaron los links a Google Fonts). Paleta oscura mas calida y menos neon (fondo `#0D110C`, tinta crema-verdosa), brillos de fondo reducidos a menos de la mitad (antes 0.40 de verde), un toque dorado en la esquina, y grano de papel sutil sobre todo el fondo.

**Menos toques.**
- Home agrupa lo pendiente POR PLANTA (`components/tasks/PlantTaskGroup.tsx`): la planta se nombra una vez, cada tarea es una fila con check de un toque (completa sin abrir la hoja), tocar la fila abre el detalle (receta con dosis por litros, EC/pH, notas, cancelar/mover) y "Todo" resuelve la planta entera. Antes eran 2 toques por tarea (Hecho + Confirmar) y la planta se repetia en cada tarjeta: 10 tareas ocupaban ~5 pantallas, ahora ~2.
- Alta de planta: el catalogo va primero, elegir una variedad sugiere tambien el nombre (no pisa uno escrito a mano), la planta nueva arranca con ubicacion/sustrato/cantidad de macetas de la ultima (los litros siguen saliendo de Ajustes), y el paso 2 tiene "Omitir nutricion y crear" (de 3 pantallas a 2).

**Elemento propio:** tira de ciclo (`CycleStrip`, `getCycleStrip`): una marca por semana del ciclo completo, verde en vegetativo y ambar en floracion, la actual resaltada. Esta en las tarjetas del listado.

Tests: 4 unit (`getCycleStrip`), 5 E2E nuevos (home agrupada x2, formulario x3); los tests que buscaban "Hecho" en Home ahora usan "ver detalle". Un test de Ajustes encontro un conflicto real: recordar los litros de la ultima planta pisaba el valor por defecto de Ajustes (ya no se recuerdan).

## Decima tanda (2026-10-27): detalle de planta, colores y confirmacion
- **Confirmacion en acciones masivas:** "Todo" de Home y "Todas" de vencidas ahora piden confirmacion (`ConfirmDialog`: cuantas tareas, que suman XP, y que si alguna no se hizo conviene tocarla para cancelarla o moverla). El "Todo" de cada planta y el check de cada fila no piden (son una planta / una tarea, y se deshacen desde "completadas hoy").
- **Hero del detalle rehecho:** antes era el bloque mas saturado de la app (verde pleno con emoji gigante). Ahora es una tarjeta sobria con el color de la fase como unico acento: nombre grande en serif, cuenta regresiva en numero grande, tira de ciclo con fecha de siembra y de cosecha, y los datos (fecha, ubicacion, macetas) en una linea.
- **Orden del detalle:** lo accionable sube (alerta de floracion, semana y tareas de hoy); luego progreso/salud, mediciones y datos; al final diario y acciones. "Zona de peligro" paso a "Acciones". Antes las tareas de hoy quedaban ~3 pantallas abajo.
- **Colores:** los colores por tipo de tarea eran los saturados de Tailwind y desentonaban con la paleta calida. Ahora son una familia apagada: nutricion salvia `#6BBF78`, riego azul polvo `#6BA3D6`, observacion dorado `#D9A441`, foliar malva `#A98BD0`, cosecha terracota `#D8715C` (Home, Calendario, Dashboard, linea de tiempo, tailwind). La tarjeta de "proxima cosecha" y la flora usan tokens mas apagados; el vidrio oscuro paso de gris claro a casi transparente.

## Onceava tanda (2026-10-27): Fotos, Perfil e Inventario
- **Inventario** (era lo mas atrasado: clases que ni existian en el tema, verdes planos y un bloque verde de 160 px por tarjeta): tarjetas nuevas con miniatura de la ultima foto, tira de ciclo, fechas y ciclo en dos lineas, peso cosechado ("⚖️ 45 g cosechados") y contadores; resumen en serif con colores de la paleta. Bugs que aparecieron: (1) una auto que aun no florece mostraba "35d vege + -22d flora" (dias de flora negativos); (2) en pantallas anchas la grilla de 3 columnas aplastaba las tarjetas dentro de la columna central (ahora siempre una columna).
- **Perfil:** el encabezado era violeta con blancos fijos, lo unico violeta de la app. Ahora usa el hero sobrio (resplandor dorado), el dorado como identidad de nivel/XP (avatar, barra, camino del cultivador, logros) y tokens de tinta en vez de blanco fijo.
- **Fotos:** sin la etiqueta "FOTOS", con una linea de ayuda, botones Camara/Galeria con iconos de linea en vez de emojis, selector sin brillo, y la seccion de IA (apagada por flag) en dorado en vez de violeta.
- Tests: 2 E2E nuevos de inventario (dias de flora nunca negativos; peso en la tarjeta).

## Doceava tanda (2026-10-27): Ajustes, login y filtro por tipo
- **Login / registro / recuperar contrasena:** usaban una paleta propia (negro puro, verdes de Tailwind, boton verde con texto NEGRO de bajo contraste, y el registro con un emoji en vez del logo). Ahora comparten fondo y tokens del resto de la app, el mismo encabezado (logo + nombre en serif + subtitulo), campos `rounded-2xl` y el boton principal en verde de marca con texto blanco. Funcionan en tema claro y oscuro.
- **Ajustes:** habia DOS campos de nombre (uno con su Guardar propio y otro dentro de "Tu perfil") que escribian lo mismo; ahora es uno solo, con el volumen de maceta y un unico "Guardar cambios". Orden por uso: perfil, plan, apariencia (tema e idioma en una tarjeta), notificaciones, tablas, herramientas, acerca de y zona de peligro. Plan en dorado apagado (el chip PRO era un blanco claro sobre fondo oscuro).
- **Mis plantas: filtro por tipo** (pedido del usuario): segunda fila "Todos los tipos / Autoflorecientes N / Feminizadas N / Regulares N". Se combina con el estado (activas, flora, cosechadas...) y la busqueda; los numeros cuentan dentro del estado elegido; solo se muestra si hay mas de un tipo para separar.
- Tests: 2 E2E del filtro; los de Ajustes se adaptaron al guardado unico.

## Treceava tanda (2026-10-27): onboarding y dashboard
- **Onboarding:** el logo real reemplaza al emoji que rebotaba, los emojis de las tarjetas pasan a iconos de linea en verde, titulos en serif, resplandor de marca de fondo, puntos de progreso (3 pasos) y checks de linea en el ultimo paso. Mismos textos y pasos; los E2E del wizard no cambiaron.
- **Dashboard (`/dashboard`, no esta en la navegacion; duplica a Home):** sin emojis (👋 🔥 🎉 🌱 ✂️ 🗑️), titulos en serif, "Vencida" en terracota de la paleta en vez de rojo, boton "Nueva planta" con borde fino.

## Catorceava tanda (2026-10-27): landing
- La landing tenia su propia identidad (negro verdoso `#050E07`, verde `#3DCC63`, Inter 900, texto en degradado y un boton que pulsaba sin parar). Ahora usa la paleta de la app (`#0D110C`, `#5CC76C`), titulos en serif (Fraunces), segunda linea del hero en verde plano, y los botones con una sombra suave fija (sube un poco al pasar el mouse) en vez de la animacion de pulso. La tipografia del cuerpo no cargaba Inter autoalojada (caia a la del sistema); ahora si. Textos y estructura sin cambios.

## Quinceava tanda (2026-10-27): detalle de planta en tabs
- El detalle tenia ~15 secciones en una sola columna. Ahora el hero queda fijo y debajo hay tres tabs: **Hoy** (alerta de floracion, semana, tareas vencidas y del dia, anillo de progreso/salud, proximas; con el numero de pendientes), **Seguimiento** (mediciones EC/pH, tareas canceladas, diario) y **Ficha** (chips de fotoperiodo/sustrato, notas, iniciar floracion, Descartar/Cosechar/Editar, peso cosechado, reactivar).
- Abre en "Hoy" para plantas activas y en "Ficha" para cosechadas/descartadas. La ultima tab se recuerda por planta (`localStorage`, clave `cultitrack-plant-tab-<id>`; si no hay storage, no se recuerda).
- Perfil ya tenia tabs (Stats, Logros, Cuenta): no se toco.
- Tests: 43 E2E se adaptaron (el contenido paso a otra tab; helper `plantTab` en `e2e/helpers/journey.ts`) y hay un spec nuevo, `plant-tabs.spec.ts`. Un test de peso cosechado leia la base sin esperar la sincronizacion (flake latente): ahora usa `expect.poll`.

## Dieciseisava tanda (2026-10-27): editar planta
- Editar compartia el asistente de 3 pasos del alta: cambiar solo el nombre exigia tres "Continuar". Ahora, en edicion, **"Guardar cambios" esta disponible en cualquier paso** (es el boton principal; "Continuar" queda como accion secundaria) y los **pasos del indicador son clickeables** para ir directo al que se quiere. El alta no cambia.
- El aviso de "regenera el calendario" pasa de amarillo con emoji a los tokens de flora, con icono de linea; titulo en serif.
- "Omitir nutricion y crear" solo se muestra en el alta (en edicion ya hay guardado directo).
- Tests: `edit-plant.spec.ts` (guardar desde el paso 1, saltar entre pasos, nombre vacio); los E2E de edicion existentes siguen igual.

## Diecisieteava tanda (2026-10-27): nueva tabla nutricional y boton primario
- **Bug de fondo:** el boton primario compartido (`Button`) usaba `bg-brand-400/90`, pero `brand-400` es un `var(--brand-400)` y con un var() pelado Tailwind no genera ninguna variante con opacidad. Resultado: **todos los botones primarios tenian fondo transparente** (texto blanco sobre el fondo de la pagina; en tema claro, ilegible). Arreglo en `tailwind.config.js` (`brand.400` ahora usa `color-mix` con `<alpha-value>`, asi tambien funcionan `bg-brand-400/50`, `/15`, etc.) y el boton primario pasa a verde solido, sin brillo ni borde de vidrio.
- Al tener fondo, el paso 2 del alta se desbordaba en 390 px (Volver + "Omitir nutricion y crear" + Continuar en una fila). "Omitir nutricion y crear" pasa a una linea propia debajo de la botonera.
- **Nueva tabla nutricional (`/nutrition/new`):** "Partir de una tabla existente" sube arriba del nombre (antes quedaba debajo de las notas), titulo en serif, error y "Eliminar semana" en terracota de la paleta, boton de genetica activo sin brillo. Las 10 opciones de color de linea (verde, azul, violeta...) se mantienen: son datos guardados en las tablas existentes.

## Dieciochoava tanda (2026-10-28): suscripcion y calendario
- **Prueba vencida / aviso de prueba:** la pantalla de bloqueo usa el logo en vez del emoji, titulo en serif, checks de linea, boton sin brillo; el aviso de "dias de prueba" usa los tokens de flora con un reloj de linea en vez de ⏳. Mismos textos.
- **Calendario:** los dias pasados con tareas pendientes se pintaban en rojo saturado (en un mes con atrasos quedaba una columna roja que gritaba mas que el resto de la app). Ahora usan el terracota de la paleta; numeros en negrita normal y el dia elegido sin brillo.
- Con esto quedan restyleadas todas las pantallas de la app salvo detalles menores (emojis en algunos chips).

## Diecinueveava tanda (2026-10-28): emojis -> iconos de linea
- Nuevo `TaskTypeIcon` (nutricion, riego, observacion, foliar, cosecha) en `components/ui`, con el color de la paleta por tipo. Reemplaza los emojis 🍃💧🔍🌫️✂️ en Calendario (tarjeta, linea de tiempo, item), la hoja de completar tarea y las tarjetas de riego/foliar (que ademas pasan de azul/violeta de Tailwind a los tokens de tarea).
- Hoja de tarea completada: el ✅ gigante pasa a un circulo verde con check y la racha usa una llama de linea.
- Home, Mis plantas e Inventario: estados vacios y de error con el logo o un triangulo de aviso de linea en vez de 🌱/⚠️; aviso de vencidas en terracota; racha con llama; sin emoji en "En Nd", "N hoy", estado del inventario, peso cosechado y tarjetas del historial.
- No se tocaron los emojis que los E2E usan como parte de un texto de boton o chip ("🌧️ Cancelar tarea", "📅 Mover a otro dia", "✅ Completada", "☀️ 18/6", "🥥 Coco", "🔒 Pro", "⭐ Plan Pro"): cambiarlos implica reescribir esos tests y se hace aparte si se quiere.

## Veinteava tanda (2026-10-28): emojis del detalle de planta
- Detalle de planta sin emojis decorativos: datos del hero (fecha, ubicacion, maceta) con iconos de linea; alerta de floracion con flor de linea (los botones pierden el 🌸 del texto); "Vencidas" en terracota; Descartar/Cosechar/Editar de "Zona de peligro" con iconos de linea y los colores de la paleta (antes rojo y ambar oscuros); callout de hidroponia con el color de riego; notas, proximas, canceladas, peso y estado sin emoji.
- Tests: `✅ Completada` pasa a `Completada` (match exacto) en 3 specs. Siguen con emoji, a proposito, los chips que los E2E leen tal cual: `☀️ 18/6`, `🌙 12/12`, `🥥 Coco`, `⚡ Hoy`.
- Quedan emojis en Perfil (iconos de estadisticas y logros), Ajustes (tema, plan), hojas de cosecha y diario, y en la hoja de tarea los botones "🌧️ Cancelar tarea" / "📅 Mover a otro dia" / "💧 Medicion".

## Veintiunaava tanda (2026-10-28): Inicio enfocado en "que hago hoy"
- Inicio repetia cosas que ya tienen su pestana. Se sacaron **Proxima semana** (esta el Calendario), **Historial** (esta Plantas > Cosechadas / Inventario) y la **barra de nivel** (esta en Perfil). Queda: saludo con racha, vencidas, tareas de hoy por planta con "Todo", proxima cosecha y la **tira de plantas** (una tarjeta por planta con fase, dia y tareas de hoy).
- El aviso de vencidas pierde los rojos saturados (botones y filas) y usa el terracota; proxima cosecha, racha y tira usan los tokens de flora en vez del ambar de Tailwind; `font-black` pasa a `font-bold`.
- Se elimino la ruta `/dashboard` y `Dashboard.tsx` (no estaba en el menu y repetia a Inicio). Sus tests se movieron: el de cancelar ya no revisa `/dashboard`; el de historial ahora verifica que la planta cosechada sale de Inicio y aparece en Plantas > Cosechadas; hay un test nuevo de que Inicio no muestra proxima semana, historial ni nivel.

## Veintidosava tanda (2026-10-28): contraste, diario como protagonista y barra sin Fotos
- **Contraste:** el texto sobre fondo verde (botones primarios, chips activos, confirmaciones) pasa de blanco a un tono oscuro (`--on-brand`, clase `text-brand-on`): blanco sobre el verde daba ~2:1. En tema claro, `ink-3` y `ink-4` se oscurecen (de 3.4:1 y 1.8:1 a 4.7:1 y 3.4:1 sobre el fondo).
- **Detalle de planta, 4 tabs:** Hoy, Mediciones, Diario y Datos. "Ficha" se renombra "Datos" y "Zona de peligro" pasa a "Acciones". Las tareas canceladas pasan al final de "Hoy". Las tabs guardadas con los valores viejos se ignoran y abre la tab por defecto.
- **Diario:** sin galeria aparte. Cada entrada es una fila compacta con la nota como protagonista y una miniatura de 56 px si hay foto (antes: tarjetas de foto grandes mas una galeria con las mismas fotos). La foto es opcional: en la hoja de nueva entrada pasa debajo de las notas, como "Agregar foto"; en Free se avisa que se puede guardar solo con notas.
- **Visor de fotos:** la barra de navegacion tapaba la nota; ahora el visor va en un portal al body y queda por encima.
- **Barra de navegacion:** se saca "Fotos" (quedan Inicio, Calendario, Plantas y Perfil). La ruta `/diagnose` sigue existiendo pero no esta enlazada; el diagnostico por IA se descarta.
- **Demo de datos:** `e2e/demo-seguimiento.spec.ts` arma una planta con 6 entradas de diario con fotos dibujadas en un canvas y 5 mediciones, sobre el backend simulado; con `DEMO=1 ... --headed` queda abierto para recorrerlo. Ademas se cargo en la base de test una planta "Demo seguimiento (borrar)" con los mismos datos para verla en la app real.

## Veintitresava tanda (2026-10-28): se descarta el diagnostico por IA
- Decision de producto: el diagnostico por IA no se va a hacer. Se saco del front todo lo que lo prometia: "Diagnostico IA por foto (proximamente)" y la pregunta de FAQ "Cuando sale el diagnostico por IA?" de la landing, la linea del plan Pro en Nueva planta y las claves de i18n.
- Codigo muerto eliminado: la pagina Fotos/Diagnose (`/diagnose`, sin enlace desde que salio de la barra), `PhotoGallery` (reemplazada por el diario compacto) y sus ejemplos/docs. Tests: se quitaron los de la pagina Fotos y el de "seccion de IA oculta"; el de Free/Pro de fotos ahora se hace en la hoja de nueva entrada del diario.
- **Backend sin tocar a proposito**: `diagnose-plant`, `diagnosis_logs` y sus limites siguen en Supabase, sin usar.
- **Pendiente (no se toco):** `public/terms.html` y `public/privacy.html` siguen hablando del diagnostico IA (limites de 5/30 por mes, fotos enviadas a Anthropic). Son textos legales: hay que revisarlos y sacarlos con quien corresponda.
- En Free la hoja del diario ya no renderiza el campo de archivo oculto (antes quedaba aunque no hubiera acceso a fotos).
- Tema claro: el verde de marca usado como texto (`text-brand-400`) pasa a un token `brand-text` (`#2B7D38` en claro, 4.8:1 sobre el fondo; en oscuro no cambia). 71 usos.
- `CLAUDE.md`: se marca la IA como descartada y se anota el rediseno.

## Veinticuatroava tanda (2026-10-28): logo nuevo (variante A, "Ciclo")
- Nuevo logo: hoja de cannabis mas grande y de folíolos largos y finos, dentro de un cuadrado con borde (se ve sobre fondo oscuro) y un arco grueso que pasa de verde (vegetativo) a dorado (floracion). Se eligio sobre la variante B (marcas por semana, como la tira del ciclo) porque a 32 y 20 px la B se vuelve ruido. Ambas quedan en `docs/logo-variantes/` con una comparacion.
- Un solo componente: `LogoMark` en `components/ui/Logo.tsx`; la landing ya no tiene su propia copia. El nombre va en Fraunces (como los titulos) con "Track" en el verde de marca.
- Assets regenerados desde el mismo SVG: `icon.svg` (favicon), `icon-180/192/512.png`, un `icon-maskable-512.png` nuevo (a sangre, marca dentro de la zona segura) separado del icono "any", y la imagen para compartir `og-cultitrack.png` (1200x630, con fuentes embebidas). Las redes no leen SVG, asi que las metas `og:image` y `twitter:image` apuntan al PNG y se borra `og-cultitrack.svg`.
- `theme-color` y `manifest`: se reemplaza el verde viejo `#2A8E39` por el fondo de la app (`#0D110C` en oscuro, `#F3F8EF` en claro, segun el tema del sistema) para que la barra de estado no desentone.
- La app movil (`mobile/assets`) no se toco: esta pausada.
- Aprendizaje: un `vite` viejo (de hace horas) atendia el puerto 5173 y Playwright lo reutilizaba (`reuseExistingServer`): no recargaba `tailwind.config.js`, asi que los colores nuevos (`brand-on`, `brand-text`) no existian para los tests ni las capturas. Si se toca la config de Tailwind, hay que reiniciar el servidor de desarrollo.

## Veinticincoava tanda (2026-10-28): pagina en blanco en desarrollo y tests lentos
- **Pagina en blanco en desarrollo:** `main.tsx` registraba el service worker tambien con `vite` corriendo. Si el servidor se caia o reiniciaba, el SW (ya instalado) rechazaba todos los pedidos de Vite y la pagina quedaba en blanco con errores `Failed to fetch`. Ahora el SW se registra solo en produccion y en desarrollo se des-registra el que haya quedado (y se vacian las caches).
- **Test lento de Ajustes (17 s) y suite de 8.8 min:** los archivos que usaban `blockSupabase` sin `installFakeBackend` tenian un backend donde las tablas no mockeadas (mediciones, diario) responden 503, y la app reintenta ~8 s en CADA navegacion (`gotoApp`: 7.9 s contra 0.66 s con el backend simulado). Se agrega `installFakeBackend` a `app`, `crop-change`, `a11y`, `edit-plant`, `responsive` y `strains`. Suite completa: de 8.8 a 5.0 min; `app.spec` de minutos a ~14 s.
- El test de Ajustes tenia ademas una carrera que la lentitud tapaba: leia `localStorage` justo despues del clic, sin esperar a que terminara el guardado asincrono. Ahora espera "✓ Guardado" antes de leer.
- Pendiente (no tocado): `auth`, `subscription` y `landing` siguen sin el backend simulado; `auth` y `subscription` usan perfiles mockeados a medida y habria que revisarlos uno por uno.

## Veintiseisava tanda (2026-10-28): plegar tareas en Inicio y tests de auth/suscripcion
- **Inicio, "Para hacer hoy":** cada planta tiene un chevron para plegar sus tareas (queda el encabezado con "N pendientes" y el "✓ Todo" sigue disponible), y la tarjeta de resumen tiene "Plegar todo / Expandir todo". Lo plegado se recuerda (`localStorage`, `cultitrack-home-collapsed`); por defecto todo expandido. Test nuevo en `home-calendar.spec.ts`.
- **`auth` y `subscription`** con el backend simulado (`installFakeBackend`): `auth` y `subscription` pasan de ~100 s a ~15 s. Quedan sin el backend simulado solo `landing` (anonimo, no lo necesita) y los tests de `auth` de login/registro (anonimos).

## Veintisieteava tanda (2026-10-28): se elimina la app mobile y arreglos de CI
- **Se elimina `mobile/`** (app Expo/React Native) y sus workflows `eas-update.yml` / `eas-build.yml`; el workspace `mobile` sale del `package.json` raiz y el `package-lock.json` se regenero (`npm ci` verifica consistente). El repo queda solo con la webapp (`frontend/` + `backend/` + `shared/`). La parte mobile se retoma mas adelante con otro enfoque y otras herramientas. El codigo anterior esta en el historial: ultimo commit con `mobile/` = `e7056ce`. En el CI y en `playwright.config.ts`, "mobile" sigue siendo el viewport de celular de la webapp (iPhone/Pixel), que se mantiene. `shared/` (tipos compartidos web+mobile) queda en el repo sin que nadie lo importe; no se borro.
- **CI en rojo desde septiembre** (no por estos cambios): el flujo real contra Supabase fallaba porque el trial de la cuenta de pruebas (`e2e-dedicated-test@cultitrack.app`) vencio el 2026-09-06; se extendio a 5 anios en la base de test (solo esa fila). Quedan por resolver: los tests responsive en WebKit (iPhone) y 2 de `new-plant-form` que en CI fallan con "browser has been closed". Para WebKit se agrego diagnostico permanente en `responsive.spec.ts` (si un test falla, imprime errores de consola y texto visible) y asi leer la causa en el siguiente CI.
- El boton de plegar tareas de Inicio medía 36 px y el test de touch targets lo marco: ahora 44 px, igual que "Plegar todo".
