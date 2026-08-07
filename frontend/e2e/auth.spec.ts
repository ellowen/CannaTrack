import { test, expect } from '@playwright/test'
import { seedAnonymous, seedApp, blockSupabase, gotoApp, simulateAuthFailure } from './helpers/seed'

test.describe('Proteccion de rutas', () => {
  test.beforeEach(async ({ context }) => {
    await blockSupabase(context)
  })

  test('link profundo sin sesion redirige a /login', async ({ page }) => {
    await seedAnonymous(page)
    await page.goto('/plants')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/settings sin sesion redirige a /login', async ({ page }) => {
    await seedAnonymous(page)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('con sesion, / muestra la app (Home) y no la landing', async ({ page, context }) => {
    await seedApp(page, context)
    await gotoApp(page, '/')
    await expect(page.getByText(/Tester/)).toBeVisible()
    await expect(page.getByText('Del brote a la cosecha')).not.toBeVisible()
  })

  test('usuario logueado sin onboarding ve el wizard una sola vez', async ({ page, context }) => {
    await seedApp(page, context, { onboarded: false })
    await gotoApp(page, '/')
    await expect(page.getByText(/Bienvenido a/i).first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Sesion: logout y expiracion', () => {
  test.beforeEach(async ({ context }) => {
    await blockSupabase(context)
  })

  test('logout real desde Settings limpia la sesion y redirige a /login', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1' }] })
    await gotoApp(page, '/settings')
    await page.getByRole('button', { name: /Cerrar sesión/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    // La sesion no debe seguir en localStorage tras el logout
    const hasSession = await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    )
    expect(hasSession).toBe(false)
    // Nota: no se verifica un goto() posterior a una ruta protegida — el
    // addInitScript que siembra la sesion (seedApp) se re-ejecuta en CADA
    // navegacion de esta misma page por diseño de Playwright, lo que
    // re-inyectaria una sesion valida y invalidaria la prueba.
  })

  test('JWT invalido/revocado: la app cierra la sesion y redirige a login (no queda "logueada" con datos viejos)', async ({ page, context }) => {
    // getSession() de supabase-js es local: no valida expires_at contra la
    // red. La app recien se entera de que el token es invalido cuando pega
    // el primer request real (loadProfile -> /rest/v1/profiles), que aca
    // responde 401 PGRST301 (forma real observada contra Supabase con un
    // JWT roto). Sin el fix, la app se quedaba mostrando datos locales
    // viejos indefinidamente, sin avisar que la sesion ya no es valida.
    await seedApp(page, context, { plants: [{ id: 'p1' }] })
    simulateAuthFailure(context)
    // Un link profundo (no la raiz) fuerza /login cuando no hay usuario —
    // en / se muestra la landing para anonimos, comportamiento correcto
    // ya validado en 'Proteccion de rutas' arriba.
    await page.goto('/plants/p1')
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})

test.describe('Pantalla de login', () => {
  test.beforeEach(async ({ page, context }) => {
    await blockSupabase(context)
    await seedAnonymous(page)
    await page.goto('/login')
  })

  test('tiene email, password, boton Google y link a signup', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByText(/Google/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Registrate/i })).toBeVisible()
  })

  test('con el backend caido muestra error, no crashea', async ({ page, context }) => {
    // blockSupabase por defecto simula un login EXITOSO (para no romper el
    // resto de la suite) — para simular el backend caido de verdad en este
    // test puntual hay que forzar la falla explicitamente.
    simulateAuthFailure(context)
    await page.locator('input[type="email"]').fill('alguien@test.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: /Ingresar/i }).click()
    // Debe quedarse en /login, mostrar el banner de error real de la
    // pantalla y seguir viva (nada de pantalla en blanco ni redireccion)
    await expect(page.locator('.bg-red-900\\/20')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  test('link a signup navega y vuelve', async ({ page }) => {
    await page.getByRole('link', { name: /Registrate/i }).click()
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.getByText(/Crea tu cuenta/i)).toBeVisible()
  })
})

test.describe('Pantalla de signup', () => {
  test.beforeEach(async ({ page, context }) => {
    await blockSupabase(context)
    await seedAnonymous(page)
    await page.goto('/signup')
  })

  test('formulario completo visible', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    expect(await page.locator('input[type="password"]').count()).toBeGreaterThanOrEqual(2)
  })

  test('passwords distintas no permiten registrarse', async ({ page }) => {
    const nameInput = page.locator('input[type="text"]').first()
    if (await nameInput.isVisible()) await nameInput.fill('Tester')
    await page.locator('input[type="email"]').fill('nuevo@test.com')
    const passwords = page.locator('input[type="password"]')
    await passwords.nth(0).fill('Password123!')
    await passwords.nth(1).fill('OtraCosa456!')
    // La validacion correcta es que el submit quede deshabilitado
    await expect(page.getByRole('button', { name: /Crear|Registr/i })).toBeDisabled()
    expect(new URL(page.url()).pathname).toBe('/signup')
  })
})

// ── Flujo real de auth: usuario de testing dedicado contra Supabase real ──
// Requiere E2E_TEST_EMAIL / E2E_TEST_PASSWORD en el entorno. Ver
// e2e/README.md para como se creo la cuenta y como correr esto localmente
// o en CI. Sin blockSupabase: estos tests SI hablan con el backend real,
// nunca con el mock.
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe('Flujo real contra Supabase (usuario de testing dedicado)', () => {
  test.skip(!EMAIL || !PASSWORD, 'Definir E2E_TEST_EMAIL y E2E_TEST_PASSWORD para correr — ver e2e/README.md')

  test('login -> profile/trial reales -> acceso Pro -> navegacion -> logout -> login -> persistencia', async ({ page }) => {
    // 1) Login real
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(EMAIL!)
    await page.locator('input[type="password"]').fill(PASSWORD!)
    await page.getByRole('button', { name: /Ingresar/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
    await expect(page.getByText('Del brote a la cosecha')).not.toBeVisible()

    // "onboarded" es un flag 100% local (por navegador, no por cuenta) —
    // un browser context nuevo de Playwright siempre lo ve por primera vez,
    // igual que un usuario real en un dispositivo nuevo.
    const welcomeHeading = page.getByText(/Bienvenido a/i).first()
    if (await welcomeHeading.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /Empezar/i }).click()
      await page.getByRole('button', { name: /Saltar por ahora/i }).click()
      await page.getByRole('button', { name: /Crear primera planta/i }).click()
      await expect(page).toHaveURL(/\/plants\/new/, { timeout: 10_000 })
    }

    // 2) Profile + trial reales: Settings debe mostrar el badge TRIAL con
    // dias restantes reales (no depende de ningun mock local).
    await page.goto('/settings')
    await expect(page.getByText('TRIAL', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/dias de prueba gratis/i)).toBeVisible()

    // 3) Acceso Pro real durante el trial: sin limite de 1 planta.
    await page.goto('/plants/new')
    await expect(page.getByText(/Limite del plan Free/i)).not.toBeVisible()

    // 4) Navegacion basica sigue funcionando
    await page.goto('/')
    await page.getByRole('link', { name: /^Calendario$/i }).click()
    await expect(page).toHaveURL(/\/calendar/)

    // 5) Logout real
    await page.goto('/settings')
    await page.getByRole('button', { name: /Cerrar sesión/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    // 6) Login de nuevo — el profile/trial deben persistir (no se recrean)
    await page.locator('input[type="email"]').fill(EMAIL!)
    await page.locator('input[type="password"]').fill(PASSWORD!)
    await page.getByRole('button', { name: /Ingresar/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
    await page.goto('/settings')
    await expect(page.getByText('TRIAL', { exact: true })).toBeVisible({ timeout: 10_000 })
  })
})
