# 2026-10-28 — Diario publico de solo lectura

## Que se hizo
- Migracion `20261028000003_plant_shares.sql` (aplicada en la base `wpvvfroutebiwckrenmq`):
  - Tabla `plant_shares` (plant_id PK, user_id, token uuid unico). RLS: solo el dueno la ve y maneja.
  - RPC `get_public_diary(token)` (SECURITY DEFINER, ejecutable por anon): devuelve solo nombre, genetica, fechas/duraciones, estado, peso y las entradas del diario (semana, fecha, notas, ruta de foto). No devuelve user_id, ubicacion, notas privadas de la planta ni productos. `null` si el token no existe.
  - Fotos: politica de lectura en `storage.objects` para plantas compartidas, via `is_shared_plant()` (SECURITY DEFINER) para que anon no lea `plant_shares` (eso expondria los tokens).
  - El CHECK de `analytics_events` suma `diary_shared`, `shared_diary_view`, `shared_diary_cta`.
- Dueno: tarjeta "Compartir diario" en la tab Diario de la planta (`ShareDiaryCard`): crear link, copiar, dejar de compartir (con confirmacion).
- Publico: ruta `/d/:token` (`SharedDiary.tsx`), sin cuenta, solo lectura, noindex y no-referrer, con CTA a `/signup`.
- `lib/shared-diary.ts`; `extractPhotoStoragePath` ahora es exportada; `CycleStrip` acepta lo minimo que necesita.
- Politica de privacidad: seccion "Diario compartido".
- Tests: 7 E2E en `e2e/shared-diary.spec.ts` (se verifico con mutaciones que fallan si se rompe el orden o la revocacion). Fake backend: `plant_shares` y `.insert().select().single()`.

## Verificado en la base (rol anon, transaccion con rollback)
- La RPC devuelve datos con un token valido y `null` con uno invalido.
- anon no puede `select` de `plant_shares` (permission denied).
- anon solo ve las fotos de la planta compartida, no las de otras.

## Limites conocidos
- La ruta de la foto es `<user_id>/<plant_id>/<archivo>`: quien tiene el link ve el id interno (uuid) del dueno en la URL de la foto. No es email ni nombre.
- Las URL de foto ya firmadas valen 1 hora: al dejar de compartir, las fotos que alguien ya abrio pueden seguir visibles hasta que venza.
- El link no tiene vencimiento propio ni contrasena: quien lo tiene, lo ve.
- Las vistas previas al compartir (WhatsApp, etc.) no muestran la planta: es una SPA, el og:image es el de la app.
- Falta: compartir tambien las mediciones (EC/pH).
