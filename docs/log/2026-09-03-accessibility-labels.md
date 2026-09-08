# 2026-09-03 — Accessibility labels en botones icon-only de mobile

## Que se hizo
De la lista de la auditoria de stores: ~77 botones tocables sin
`accessibilityLabel` en mobile. Se prioricen los que son PURO icono
(sin texto visible como hijo) -- son los que realmente quedan mudos o
sin nombre para VoiceOver/TalkBack. Los que ya tienen texto visible
se anuncian razonablemente bien por default en React Native, asi que
no se tocaron (no vale la pena el volumen de cambio para un beneficio
marginal).

- Boton de "atras" (`BackIcon`): 14 pantallas, cero label en ninguna
  -- el patron mas repetido de toda la app. `accessibilityLabel`
  usando la clave ya existente `common.back`.
- Iconos de configuracion (⚙️) en home y profile.
- Boton de borrar busqueda (✕) en plants.tsx.
- Flechas de mes anterior/siguiente en el calendario de tasks.tsx.
- Celdas del calendario y pills de "proximos 7 dias" en home: antes
  solo un numero suelto sin contexto: ahora anuncian fecha completa +
  cantidad de tareas.
- `FloatingTabBar` (los 5 tabs principales): `accessibilityRole="tab"`
  + `accessibilityState={{selected}}` ademas del label -- antes
  dependia de que el texto visible (que se desvanece a opacity 0 en
  tabs inactivos) siguiera en el arbol de accesibilidad.

Commit: `aedd3d6`, pusheado.

## Por que
Apple y Google auditan accesibilidad basica en review; ademas es
simplemente correcto para cualquier usuario real de lector de
pantalla.

## Pendiente / siguiente paso
Con esto se cierran los 6 items P1/P2 identificados en la auditoria
de stores original de esta sesion, salvo:
- Assets de Play Store (feature graphic 1024x500 + capturas) -- es
  trabajo de diseño, no de codigo.
- 2 tests rotos por un problema de Vitest/Rollup parseando sintaxis
  Flow de React Native (`biometric.test.ts`, `stores.test.ts`) -- no
  es bug de la app, bloquea confianza de CI en esos dos archivos
  especificos.
- Recordatorio siempre vigente: la encriptacion del token de auth
  (sesion 2026-09-03, commit `1f3177d`) sigue sin probarse en un
  dispositivo real.
