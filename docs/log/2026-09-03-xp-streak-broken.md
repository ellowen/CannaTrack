# 2026-09-03 — La gamificacion de mobile no otorgaba XP/racha (no era una carrera)

## Que se hizo
Se pidio arreglar "la condicion de carrera de racha" en
`mobile/src/lib/xp.ts` (item de la auditoria de stores). Investigando
aparecio algo mas grave: no era una carrera, era que **mobile nunca
otorgaba XP ni racha en produccion, en silencio**.

- `profiles` tiene un trigger (`protect_profile_system_columns`,
  agosto 2026) que revierte cualquier escritura DIRECTA del cliente a
  `xp`/`streak_days` -- cierra el exploit de "otorgate XP infinito"
  que ya se arreglo para la web.
- `xp.ts` (`awardXP`, `recordDailyActivity`) escribia DIRECTO a esas
  columnas -- exactamente lo que el trigger revierte. Sin excepcion,
  sin log: la escritura se descartaba y listo.
- La web ya tiene el camino correcto (`handle_task_completion`, RPC
  SECURITY DEFINER ya auditada) -- mobile nunca la llamaba, cero
  referencias en todo el codigo.
- Los bonus de XP por cosechar/iniciar floracion/subir foto tampoco
  tienen RPC real ni en mobile ni en la web -- constantes muertas en
  `gamification.ts` de ambas plataformas.

Se le pregunto al usuario como encarar el alcance real (mas grande
que "arreglar una carrera"). Eligio: conectar task completion a
`handle_task_completion` (arregla XP+racha de verdad) y sacar los
bonus fantasma para que mobile tenga el mismo comportamiento real
que ya tiene la web hoy.

Fix: `mobile/src/lib/sync.ts#completeTaskInSupabase` ahora es un
mirror exacto de `frontend/src/lib/sync.ts`. Los 3 call sites de
mobile ((tabs)/index.tsx, (tabs)/tasks.tsx, plants/[id].tsx) y el
reintento offline (`lib/sync/syncService.ts`) usan esta misma
funcion. `xp.ts` se borro -- sin ningun caller real.

Commits: `2271e93` + `071eec4` (el primero quedo incompleto por un
`git add` con paths entre parentesis que no matcheo nada en
silencio -- dejo el remoto roto por unos minutos hasta el segundo
commit).

## Por que
El trigger de seguridad de agosto se probo y aplico correctamente
para la web, pero nadie actualizo el codigo de mobile para pasar por
el mismo camino seguro -- quedo silenciosamente roto desde entonces,
sin que ningun test ni error visible lo señalara.

## Pendiente / siguiente paso
- Nada tecnico pendiente de este fix especifico.
- Si en algun momento se quiere un bonus real por cosechar/iniciar
  floracion/subir foto, hace falta disenar RPCs nuevas para eso (no
  existen ni en mobile ni en la web hoy) -- es una feature de
  producto nueva, no parte de este fix.
- Al commitear con `git add` usando rutas con parentesis en el
  nombre (carpetas de expo-router como `(tabs)`), verificar con
  `git status` despues del add -- el shell puede tragarse el
  pathspec sin error visible.
