# E2E — Playwright

## Estructura de la suite

| Archivo | Que cubre | Contra que backend |
|---|---|---|
| `app.spec.ts` | Home, detalle de planta, tareas, gates Free/Trial/Pro, Settings, CRUD de plantas, perfil local | Mock (`blockSupabase`) |
| `auth.spec.ts` | Rutas protegidas, logout, sesion invalida, login/signup, **flujo real de usuario dedicado** | Mock + 1 describe contra Supabase real |
| `subscription.spec.ts` | Modelo de trial (vigente/por vencer/vencido), Free vs Trial vs Pro | Mock |
| `responsive.spec.ts` | Mobile-first: scroll horizontal, touch targets, safe areas — corre en los 6 proyectos (desktop + iPhone SE/15/15 Pro Max + Pixel 7 + Galaxy S9+) | Mock |
| `landing.spec.ts` | Landing publica, SEO basico | Mock |
| `a11y.spec.ts` | Accesibilidad basica (teclado, roles, alt) | Mock |

`helpers/seed.ts` centraliza el mock: `blockSupabase(context)` intercepta toda la red de Supabase (nunca toca produccion salvo el describe de "Flujo real" abajo), `seedApp(page, context, opts)` siembra sesion + plants/tasks en localStorage y en el mock REST en simultaneo.

Unit/integration tests (logica pura, sin browser) viven aparte, en `src/**/__tests__/*.test.ts`, corridos con Vitest (`npm test`), no con Playwright.

## Correr todo desde cero

```bash
npm test              # unit + integration (Vitest)
npx playwright test   # E2E, todos los proyectos
```

Determinístico: cada test parte de un `browser context` fresco (Playwright), sin estado compartido entre tests, y el mock de red nunca toca produccion salvo el describe explicado abajo.

## Flujo real contra Supabase (usuario de testing dedicado)

`auth.spec.ts` tiene un describe (`'Flujo real contra Supabase (usuario de testing dedicado)'`) que **no usa el mock** — habla con el Supabase de produccion de verdad. Cubre: login real -> profile/trial creados por el trigger real de la DB -> acceso Pro durante el trial -> navegacion -> logout -> login de nuevo -> persistencia.

Se salta automaticamente (`test.skip`) si no estan definidas las env vars `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` — no hace falta nada especial para correr el resto de la suite sin ellas.

### Por que un usuario dedicado y no signup real en cada corrida

Supabase tiene rate-limiting de emails de confirmacion. Un signup real en cada corrida de CI (o cada vez que un dev corre la suite local) agota ese limite rapido y further signups empiezan a fallar con 429 — nos paso durante esta auditoria. La alternativa segura: **una cuenta de testing creada una sola vez, con el email ya confirmado**, reusada para login en cada corrida (login no tiene ese rate-limit).

### Como se creo la cuenta (una sola vez, ya hecho)

Con la Service Role Key del proyecto (nunca en el repo, nunca en CI — solo se uso una vez, localmente, para crear la cuenta):

```bash
curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-dedicated-test@cultitrack.app","password":"<ver 1Password/secrets del equipo>","email_confirm":true,"user_metadata":{"name":"E2E Test User"}}'
```

`email_confirm: true` marca el email como confirmado en el momento de creacion — se salta por completo el flujo de confirmacion por link (que necesitaria acceso a una inbox real). El trigger `on_auth_user_created` de la DB crea el profile automaticamente (username, `trial_ends_at` a 30 dias) al insertarse en `auth.users`, exactamente igual que un signup real por la app.

Esta cuenta NO se recrea en cada corrida — es una cuenta persistente de testing. Si el trial vence (30 dias desde su creacion), hay que extenderlo manualmente con SQL (`update profiles set trial_ends_at = now() + interval '30 days' where id = '<user_id>'`) o marcarla `is_pro = true` si se prefiere una cuenta de testing sin vencimiento.

### Como correr el flujo real localmente

```bash
E2E_TEST_EMAIL="e2e-dedicated-test@cultitrack.app" \
E2E_TEST_PASSWORD="<pedir la password al equipo>" \
npx playwright test e2e/auth.spec.ts -g "Flujo real contra Supabase" --project=desktop
```

### En CI

Los secrets `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` estan configurados en GitHub Actions (Settings → Secrets → Actions). El workflow (`.github/workflows/ci.yml`) los pasa como env vars a todos los jobs — el test se ejecuta automaticamente en cada corrida de CI, sin pasos adicionales.
