# 2026-10-28 — Metricas de uso propias (sin cookies)

## Que se hizo
- Tabla `analytics_events` (migracion `20261028000002_analytics_events.sql`, aplicada en la base `wpvvfroutebiwckrenmq`): solo INSERT para anon/authenticated, lectura solo con service_role o SQL. El nombre del evento es una lista cerrada (CHECK).
- `frontend/src/lib/analytics.ts`: `track(name, props)` fire-and-forget. Id de sesion aleatorio en sessionStorage, sin email ni user_id. No mide con webdriver (E2E), "No rastrear" ni Global Privacy Control.
- Eventos: `landing_view`, `landing_cta` (props.where: nav, menu, hero, pricing_free, pricing_pro, final, sticky, footer), `demo_used`, `signup_completed`, `onboarding_completed`, `plant_created`, `task_completed`. `data_exported` esta en la lista pero se conecta cuando se mergee el PR de exportar datos.
- `public/privacy.html`: nueva linea "Uso" en "Que datos recolectamos".
- Tests: 3 unitarios (`analytics.test.ts`) y 2 E2E en `landing.spec.ts`.

## Por que
No hay forma de saber donde se cae la gente entre la landing, el registro y la primera tarea.

## Como mirar el embudo (SQL, service_role)
```sql
select name, count(distinct session_id) as sesiones
from analytics_events
where host not in ('localhost', '127.0.0.1') and created_at > now() - interval '7 days'
group by name order by sesiones desc;
```

## Pendiente / siguiente paso
- `signup_completed` y `plant_created` ocurren en sesiones distintas si el usuario confirma el mail y vuelve en otra pestana: el embudo es por evento, no por usuario.
- Cualquiera puede insertar filas (no hay rate limit): si se llena de basura, agregar un limite por sesion o por IP.
- `host` permite descartar el trafico de desarrollo (`localhost`).
