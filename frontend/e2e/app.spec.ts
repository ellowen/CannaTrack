import { test, expect } from '@playwright/test'
import { seedApp, blockSupabase, gotoApp } from './helpers/seed'

test.beforeEach(async ({ context }) => {
  await blockSupabase(context)
})

test.describe('Home', () => {
  test('estado vacio invita a crear la primera planta', async ({ page }) => {
    await seedApp(page, { plants: [] })
    await page.goto('/')
    await expect(page.getByText(/primera planta/i).first()).toBeVisible()
  })

  test('con plantas muestra saludo, racha y tareas del dia', async ({ page }) => {
    await seedApp(page, { plants: [{ name: 'Gelato' }], tasksToday: true })
    await page.goto('/')
    await expect(page.getByText(/Tester/)).toBeVisible()
    await expect(page.getByText('Gelato').first()).toBeVisible()
  })

  test('navegacion inferior: 5 tabs y navegan', async ({ page }) => {
    await seedApp(page, { plants: [{ name: 'Gelato' }] })
    await page.goto('/')
    for (const tab of ['Calendario', 'Plantas', 'Fotos', 'Perfil', 'Inicio']) {
      await page.getByRole('link', { name: new RegExp(`^${tab}$`, 'i') }).click()
      await expect(page.getByRole('link', { name: new RegExp(`^${tab}$`, 'i') })).toBeVisible()
    }
  })
})

test.describe('Detalle de planta: badges y features', () => {
  test('indoor + hidro en vege: 18/6, Hidro y callout de reservorio', async ({ page }) => {
    await seedApp(page, { plants: [{ id: 'p1', location: 'indoor', growMedium: 'hydro' }] })
    await gotoApp(page, '/plants/p1')
    await expect(page.getByText('18/6')).toBeVisible()
    await expect(page.getByText('Hidro')).toBeVisible()
    await expect(page.getByText(/reservorio/i)).toBeVisible()
  })

  test('indoor en flora: badge 12/12', async ({ page }) => {
    await seedApp(page, { plants: [{ id: 'p2', location: 'indoor', growMedium: 'coco', daysAgo: 70, floraDaysAgo: 10 }] })
    await gotoApp(page, '/plants/p2')
    await expect(page.getByText('12/12')).toBeVisible()
    await expect(page.getByText('Coco')).toBeVisible()
  })

  test('outdoor + tierra: sin badges de fotoperiodo ni sustrato', async ({ page }) => {
    await seedApp(page, { plants: [{ id: 'p3', location: 'outdoor', growMedium: 'soil' }] })
    await gotoApp(page, '/plants/p3')
    await expect(page.getByText('Outdoor')).toBeVisible()
    await expect(page.getByText('18/6')).not.toBeVisible()
    await expect(page.getByText('Hidro')).not.toBeVisible()
  })
})

test.describe('Tareas: completar, XP y deshacer', () => {
  test('completar tarea muestra overlay de XP y no duplica al rehacer', async ({ page }) => {
    await seedApp(page, { plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')

    // Completar la tarea de nutricion de hoy
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()

    // Esperar que cierre el overlay y deshacer
    await expect(page.getByText(/\+\d+ XP/)).not.toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /Deshacer/i }).first().click()

    // Re-completar: NO debe volver a mostrar XP (exploit cerrado)
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).not.toBeVisible()
  })

  test('Saltar cierra el sheet sin completar la tarea', async ({ page }) => {
    await seedApp(page, { plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /^Saltar$/i }).click()
    // El boton de completar sigue ahi: la tarea NO se completo
    await expect(page.getByRole('button', { name: /Marcar como completada/i }).first()).toBeVisible()
  })
})

test.describe('Gates del plan Free vs Pro', () => {
  test('free: NutritionCard muestra 1 producto + lock Pro', async ({ page }) => {
    await seedApp(page, { plan: 'free', plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    await expect(page.getByText(/\+\d+ producto.*Plan Pro/)).toBeVisible()
  })

  test('pro: NutritionCard muestra todos los productos sin lock', async ({ page }) => {
    await seedApp(page, { plan: 'pro', plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    await expect(page.getByText(/\+\d+ producto.*Plan Pro/)).not.toBeVisible()
    await expect(page.getByText('Rootproof')).toBeVisible()
    await expect(page.getByText('Growth')).toBeVisible()
  })

  test('free: subir fotos bloqueado en galeria y Fotos', async ({ page }) => {
    await seedApp(page, { plan: 'free', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/plants/p1')
    await expect(page.getByText(/Fotos del cultivo — Plan Pro/).first()).toBeVisible()
    await gotoApp(page, '/diagnose')
    await expect(page.getByText(/Plan Pro/).first()).toBeVisible()
    expect(await page.locator('input[type="file"]').count()).toBe(0)
  })

  test('pro: subir fotos disponible', async ({ page }) => {
    await seedApp(page, { plan: 'pro', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/diagnose')
    await expect(page.getByRole('button', { name: /Camara/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Galeria/i })).toBeVisible()
  })

  test('free con 1 planta activa: crear otra muestra el limite', async ({ page }) => {
    await seedApp(page, { plan: 'free', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/plants/new')
    await expect(page.getByText(/Limite del plan Free/i)).toBeVisible()
  })

  test('la seccion de diagnostico IA esta oculta (flag apagado)', async ({ page }) => {
    await seedApp(page, { plan: 'pro', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/diagnose')
    await expect(page.getByText(/Diagnostico por IA/i)).not.toBeVisible()
  })
})

test.describe('Settings', () => {
  test('cambiar idioma ES→EN traduce en vivo', async ({ page }) => {
    await seedApp(page, { language: 'es' })
    await gotoApp(page, '/settings')
    await expect(page.getByText('Idioma')).toBeVisible()
    await page.getByRole('button', { name: /English/i }).click()
    await expect(page.getByText('Language')).toBeVisible()
    await page.getByRole('button', { name: /Espanol/i }).click()
    await expect(page.getByText('Idioma')).toBeVisible()
  })

  test('cambiar tema Claro aplica la clase al documento', async ({ page }) => {
    await seedApp(page, { theme: 'dark' })
    await gotoApp(page, '/settings')
    await page.getByRole('button', { name: /Claro/i }).click()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(false)
    await page.getByRole('button', { name: /Oscuro/i }).click()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(true)
  })

  test('free: crear tabla custom bloqueado con lock Pro', async ({ page }) => {
    await seedApp(page, { plan: 'free' })
    await gotoApp(page, '/settings')
    await expect(page.getByText(/🔒 Pro/)).toBeVisible()
  })
})

test.describe('Crear planta (formulario completo)', () => {
  test('flujo entero: identidad → setup hidro → nutricion → detalle', async ({ page }) => {
    await seedApp(page, { plan: 'pro', plants: [] })
    await gotoApp(page, '/plants/new')

    // Paso 1: identidad (nombre + genetica son requeridos)
    await page.getByPlaceholder(/White Widow #1/).fill('Mi Planta E2E')
    await page.getByPlaceholder(/^Ej: White Widow$/).fill('Northern Lights')
    await page.getByRole('button', { name: /Continuar/i }).click()

    // Paso 2: setup — indoor + hidro
    await page.getByRole('button', { name: /Indoor/i }).first().click()
    await page.getByRole('button', { name: /Hidro/i }).first().click()
    await page.getByRole('button', { name: /Continuar/i }).click()

    // Paso 3: nutricion (defaults) → crear
    await page.getByRole('button', { name: /Crear planta/i }).click()

    // Detalle: nombre + badges de la config elegida
    await expect(page.getByText('Mi Planta E2E')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Hidro')).toBeVisible()
    await expect(page.getByText('18/6')).toBeVisible()
  })
})
