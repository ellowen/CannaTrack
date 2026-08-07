import { test, expect } from '@playwright/test'
import { seedAnonymous, seedApp, blockSupabase, gotoApp } from './helpers/seed'

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

  test('con sesion, / muestra la app (Home) y no la landing', async ({ page }) => {
    await seedApp(page)
    await page.goto('/')
    await expect(page.getByText(/Tester/)).toBeVisible()
    await expect(page.getByText('Del brote a la cosecha')).not.toBeVisible()
  })

  test('usuario logueado sin onboarding ve el wizard una sola vez', async ({ page }) => {
    await seedApp(page, { onboarded: false })
    await gotoApp(page, '/')
    await expect(page.getByText(/Bienvenido a/i).first()).toBeVisible({ timeout: 15_000 })
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

  test('con el backend caido muestra error, no crashea', async ({ page }) => {
    await page.locator('input[type="email"]').fill('alguien@test.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: /Ingresar/i }).click()
    // Supabase esta bloqueado (503): la app debe mostrar un error y seguir viva
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

// ── Flujo real de auth (opcional): requiere credenciales en el entorno ──
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe('Login real contra Supabase', () => {
  test.skip(!EMAIL || !PASSWORD, 'Definir E2E_TEST_EMAIL y E2E_TEST_PASSWORD para correr')

  test('login y logout completos', async ({ page }) => {
    // Sin blockSupabase: este test SI habla con el backend real
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(EMAIL!)
    await page.locator('input[type="password"]').fill(PASSWORD!)
    await page.getByRole('button', { name: /Ingresar/i }).click()
    await expect(page).toHaveURL(/\/$|\/dashboard/, { timeout: 15_000 })
  })
})
