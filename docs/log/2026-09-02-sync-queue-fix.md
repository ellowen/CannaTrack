# 2026-09-02 — Cola de sync offline: de decorativa a funcional

## Que se hizo
- Auditoria de los TODOs en `frontend/src/lib/syncQueue.ts` y
  `mobile/src/lib/syncQueue.ts`: en ambas plataformas la cola de sync
  offline no corria nunca en la app real (frontend: nada la alimentaba;
  mobile: dos motores compitiendo, ninguno conectado, el boton "Ahora"
  de OfflineIndicator no hacia nada).
- Decision del usuario: mobile se consolida en `syncService.ts` (ya
  tenia addXP/uploadPhoto), se borra `syncQueue.ts`. Frontend web se
  conecta de verdad en vez de borrarse.
- Frontend: `processSyncQueue()` ahora despacha cada accion a la
  funcion real de `sync.ts`. ~9 catch blocks que solo mostraban un
  toast ahora tambien encolan para reintento automatico al reconectar
  (`usePlants`, `useMeasurements`, `CompleteTaskSheet`, `Home`,
  `Calendar`, `PlantDetail`, `Dashboard`, `Settings`).
- Bug real encontrado de paso: `syncMeasurementToSupabase` y
  `deleteMeasurementFromSupabase` tragaban su propio error (catch
  interno sin re-throw), asi que el `.catch()` de los callers nunca
  disparaba -- ni toast ni encolado. Corregido con `throw error`.
- `syncPlantToSupabase` paso de `insert` a `upsert` -- necesario para
  que un reintento tras fallo parcial (planta ok, tareas no) no rompa
  por PK duplicada.
- `Settings.tsx` (regenerar calendarios): antes una planta que fallaba
  abortaba el resto del lote. Ahora cada planta se intenta indepen-
  diente y solo la que falla se encola.
- Mobile: borrado `syncQueue.ts` + su test. Unico call site real
  (`completeTask` en `app/plants/[id].tsx`) tenia un bug de payload
  (`notes` vs `completionNotes` que esperaba syncService) -- corregido.
  `OfflineIndicator.tsx` (huerfano, nunca montado) reemplaza a
  `OfflineBanner.tsx` en `_layout.tsx`; su boton "Ahora" ahora llama a
  `useSync().sync()` de verdad.
- Verificado: `tsc --noEmit` limpio en ambas plataformas, build de
  frontend ok, tests frontend (71 pass) y mobile (54 pass, 2 fallos
  preexistentes de entorno sin relacion) ok, smoke test en navegador
  sin errores de consola.
- Commits: `320ca17`, pusheado a `origin/main`.

## Por que
Los TODOs parecian cosmeticos pero la investigacion mostro que el
offline-first prometido en CLAUDE.md no funcionaba de verdad en
ninguna plataforma -- los cambios se perdian silenciosamente si el
usuario estaba offline al guardar.

## Pendiente / siguiente paso
- `uploadPhoto` no se conecto al reintento automatico en frontend web
  a proposito: encolar un data URL de foto en localStorage arriesga
  reventar la cuota. Si hace falta persistencia offline de fotos,
  pensar un mecanismo aparte (IndexedDB en vez de localStorage).
- `startFlora` (camino con RPC atomico) tampoco se encola a proposito
  -- es una operacion grande e infrecuente, mejor que el usuario
  reintente a mano que reproducirla ciegamente en background.
- Mobile: `flushQueue()` en `syncService.ts` corta el loop entero en
  la primera accion que falla (no seguia con las demas ni removia las
  que si tuvieron exito). No se toco -- es preexistente y hoy solo
  importa para `completeTask`, que es el unico caso real. Si se agregan
  mas tipos de accion reales a la cola de mobile, revisar esto.
