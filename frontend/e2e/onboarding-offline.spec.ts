import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, getFakeBackend, dbPlants, dbTasks, dbProfile, setOffline } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, presetLabel } from './helpers/journey'

/**
 * Onboarding de un usuario nuevo y comportamiento offline-first: crear
 * sin conexion y sincronizar al volver.
 */

const THERIAN = STRAIN_BY_SLUG['therian-auto']

async function setup(page: Page, context: BrowserContext, onboarded: boolean) {
  await blockSupabase(context)
  await installFakeBackend(context)
  // keepLocalState: un reload conserva plantas y cola de sync, como un usuario real
  await seedApp(page, context, { plan: 'pro', plants: [], onboarded, keepLocalState: true })
}

test.describe('Onboarding de usuario nuevo', () => {
  test('wizard completo: bienvenida, nombre, listo y primera planta', async ({ page, context }) => {
    await setup(page, context, false)
    await gotoApp(page, '/')
    await expect(page.getByText(/Bienvenido a/)).toBeVisible()
    await page.getByRole('button', { name: /Empezar/ }).click()

    // paso nombre: no se avanza sin nombre; Atras vuelve; Saltar usa "Cultivador"
    await expect(page.getByText('¿Cómo te llamás?')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Continuar/ })).toBeDisabled()
    await page.getByRole('button', { name: /Atrás/ }).click()
    await expect(page.getByText(/Bienvenido a/)).toBeVisible()
    await page.getByRole('button', { name: /Empezar/ }).click()

    await page.getByPlaceholder(/Lucas, El Profe/).fill('Luca')
    await page.getByRole('button', { name: /^Continuar/ }).click()
    await expect(page.getByText('¡Listo, Luca!')).toBeVisible()
    await page.getByRole('button', { name: /Crear primera planta/ }).click()

    // te lleva directo al alta de la primera planta
    await expect(page).toHaveURL(/\/plants\/new$/, { timeout: 10_000 })
    await expect.poll(() => dbProfile(context).username).toBe('Luca')

    await page.getByLabel('Variedad del catálogo (opcional)').selectOption({ label: presetLabel(THERIAN) })
    await page.getByPlaceholder('Ej: White Widow #1').fill('Therian #1')
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    expect(dbPlants(context)).toHaveLength(1)
  })

  test('"Saltar por ahora" deja el nombre Cultivador', async ({ page, context }) => {
    await setup(page, context, false)
    await gotoApp(page, '/')
    await page.getByRole('button', { name: /Empezar/ }).click()
    await page.getByRole('button', { name: /Saltar por ahora/ }).click()
    await expect(page.getByText('¡Listo, Cultivador!')).toBeVisible()
  })

  test('el wizard no vuelve a aparecer despues de terminarlo', async ({ page, context }) => {
    await setup(page, context, false)
    await gotoApp(page, '/')
    await page.getByRole('button', { name: /Empezar/ }).click()
    await page.getByRole('button', { name: /Saltar por ahora/ }).click()
    await page.getByRole('button', { name: /Crear primera planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/new$/, { timeout: 10_000 })
    await page.getByRole('link', { name: 'Inicio', exact: true }).click()
    await expect(page.getByText(/Bienvenido a/)).not.toBeVisible()
  })
})

test.describe('Offline-first', () => {
  // Las rutas se cargan por code-splitting: se precargan las que se van a usar
  // creando una planta con conexion (asi el test mide la logica offline de la
  // app y no la falta de red del servidor de desarrollo).
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context, true)
    await createPlantViaUi(page, STRAIN_BY_SLUG['auto-strawberry-soda'], 0)
    await expect(page.getByRole('heading', { name: 'Auto Strawberry Soda' })).toBeVisible()
    await page.getByRole('link', { name: 'Plantas', exact: true }).click()
    await expect(page.getByText('Auto Strawberry Soda', { exact: true })).toBeVisible()
    expect(dbPlants(context)).toHaveLength(1)
  })

  test('crear una planta sin conexion: queda local y se sube al volver la red', async ({ page, context }) => {
    await setOffline(context, true)
    await page.getByRole('link', { name: 'Nueva planta' }).click()
    await page.getByLabel('Variedad del catálogo (opcional)').selectOption({ label: presetLabel(THERIAN) })
    await page.getByPlaceholder('Ej: White Widow #1').fill('Therian offline')
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page.getByRole('heading', { name: 'Therian offline' })).toBeVisible({ timeout: 15_000 })

    // la planta y su calendario existen en el dispositivo; el servidor todavia no sabe nada
    await expect(page.getByText('Cosecha est.')).toBeVisible()
    expect(dbPlants(context)).toHaveLength(1)

    // vuelve la conexion: la cola se procesa sola
    await setOffline(context, false)
    await expect.poll(() => dbPlants(context).length, { timeout: 20_000 }).toBe(2)
    expect(dbPlants(context).map((p) => p.name)).toContain('Therian offline')
    await expect.poll(
      () => dbTasks(context).filter((t) => t.plant_id === dbPlants(context).find((p) => p.name === 'Therian offline')!.id).length,
      { timeout: 20_000 },
    ).toBeGreaterThan(10)
  })

  test('completar una tarea sin conexion: queda local y se sincroniza al volver', async ({ page, context }) => {
    await setOffline(context, true)
    await page.getByRole('link', { name: /Auto Strawberry Soda/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Auto Strawberry Soda' })).toBeVisible()
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /Confirmar/ }).click()
    await expect(page.getByText('Completada', { exact: true })).toBeVisible({ timeout: 8_000 })
    expect(dbTasks(context).some((t) => t.completed === true)).toBe(false)

    await setOffline(context, false)
    await expect.poll(() => dbTasks(context).some((t) => t.completed === true), { timeout: 20_000 }).toBe(true)
  })

  test('crear sin servidor, cerrar y reabrir la app, y sincronizar despues (la cola sobrevive al reload)', async ({ page, context }) => {
    // servidor inalcanzable pero el navegador "online": asi la app se puede recargar
    getFakeBackend(context).offline = true
    await page.getByRole('link', { name: 'Nueva planta' }).click()
    await page.getByLabel('Variedad del catálogo (opcional)').selectOption({ label: presetLabel(THERIAN) })
    await page.getByPlaceholder('Ej: White Widow #1').fill('Therian reabierta')
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page.getByRole('heading', { name: 'Therian reabierta' })).toBeVisible({ timeout: 15_000 })
    expect(dbPlants(context)).toHaveLength(1)

    // la cola quedo en el almacenamiento local
    const queued = await page.evaluate(() => localStorage.getItem('cultitrack-sync') ?? localStorage.getItem('sync-storage') ?? '')
    expect(queued).toContain('Therian reabierta')

    await gotoApp(page, '/plants') // "cerrar y reabrir"
    await expect(page.getByText('Therian reabierta', { exact: true })).toBeVisible()
    expect(dbPlants(context)).toHaveLength(1)

    getFakeBackend(context).offline = false
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect.poll(() => dbPlants(context).length, { timeout: 20_000 }).toBe(2)
    const id = dbPlants(context).find((p) => p.name === 'Therian reabierta')!.id
    await expect.poll(() => dbTasks(context).filter((t) => t.plant_id === id).length, { timeout: 20_000 }).toBeGreaterThan(10)
  })
})
