# 2026-10-26 - Ciclo de floracion por planta (web) y mobile en SDK 57

## Que se hizo

### Web: floracion configurable por planta
- Nuevos campos opcionales en `Plant`: `floraDays` (default 56) y `autoFloraStartDay` (default 35). Sin valor, todo se comporta igual que antes (los 42 tests previos de `src/lib` pasan sin cambios).
- `src/lib/flora-cycle.ts`: `scaleFloraWeeks` adapta las semanas de la tabla a N dias repartiendo proporcionalmente (stretch al principio, flushing siempre al final). Motor (`nutrition-engine.ts`) y utilidades (`nutrition-utils.ts`) leen estos campos en vez de 56/35 fijos.
- Semana final parcial (p.ej. 65 dias = 9 semanas + 2 dias): no se agendan tareas en o despues de la cosecha. Bug real encontrado por los tests.
- Formulario (NuevaPlanta/EditarPlanta): selector "Variedad del catalogo" (`src/data/strain-presets.ts`) + campos "Dias de floracion" y "Dia de inicio de floracion".
- `sync.ts`: los campos nuevos solo viajan si la planta los define. Tambien se agrego `autoFlowerTotalDays` al PATCH de `updatePlantInSupabase`, que faltaba (editarlo en el form no se persistia en la base).
- Migracion `20261025000000_plants_custom_cycle.sql`: **escrita, NO aplicada**. Hasta aplicarla, personalizar el ciclo en la app falla al sincronizar con Supabase (el resto sigue andando).

### E2E con variedades reales
- `e2e/fixtures/strains.ts`: 6 variedades (Dutch Passion y Mountain Seeds) con datos de ficha verificados contra el HTML de cada pagina (2026-10-25). `null` = la pagina no lo dice.
- `e2e/strains.spec.ts` (54 tests) y `seedApp` ampliado (genetica, tipo, dias, macetas, notas, floraDays).
- Suite desktop completa: 120 pasan, 1 skip (flujo real contra Supabase).

### Mobile
- Proyecto subido a Expo SDK 57 (Expo Go en iPhone solo corre la ultima version). Fixes: tabs de `expo-router` (`expo-router/js-tabs`), ruta del plugin de babel, `NODE_PATH` en scripts, plugins en `app.config.ts`, `ignoreDeprecations` en tsconfig.
- Flag `CULTITRACK_NO_EAS=1` (solo testing local): omite `projectId`/`updates`/`runtimeVersion` para que Expo Go no pida login de cuenta.
- Expo Go en Android no sirve para esta app (`expo-notifications` tira error desde SDK 53): hace falta build nativo. Se instalo Android SDK + emulador en `~/Android/Sdk` y JDK 17 en `~/jdk`; build con `expo run:android` OK. `mobile/android/` fue regenerado con `prebuild --clean` (estaba desfasado).
- La app corre en el emulador y muestra el login. **Pendiente: probar que la sesion persista al reabrir la app** (encriptacion del token, commit `1f3177d`, ya en `main`).

## Pendiente
- Revisar y aplicar la migracion de ciclo personalizado.
- Verificar persistencia de sesion en el emulador (login con cuenta propia).
- Decidir: nada de esto esta commiteado.
- Mobile: portar el ciclo personalizado (se dejo para despues a pedido del usuario).
- `vegeDays` (duracion del vegetativo) no se parametrizo: la tabla tiene 6 semanas vege fijas.
