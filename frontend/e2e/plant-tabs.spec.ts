import { test, expect } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, plantTab } from './helpers/journey'

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']

test.describe('Detalle de planta: tabs', () => {
  test.beforeEach(async ({ page, context }) => {
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
  })

  test('abre en "Hoy", separa el contenido por tab y recuerda la ultima tab de la planta', async ({ page }) => {
    const id = await createPlantViaUi(page, SODA, 0)
    await expect(page.getByRole('tab', { name: /^Hoy/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('⚡ Hoy')).toBeVisible()
    await expect(page.getByText('Zona de peligro')).toHaveCount(0)
    await expect(page.getByText('Mediciones')).toHaveCount(0)

    await plantTab(page, 'Seguimiento')
    await expect(page.getByText('Sin mediciones aún')).toBeVisible()
    await expect(page.getByText('⚡ Hoy')).toHaveCount(0)

    await plantTab(page, 'Ficha')
    await expect(page.getByText('Zona de peligro')).toBeVisible()

    await gotoApp(page, `/plants/${id}`)
    await expect(page.getByRole('tab', { name: 'Ficha' })).toHaveAttribute('aria-selected', 'true')
  })

  test('una planta cosechada abre directo en "Ficha" (sin tab guardada)', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 3)
    await plantTab(page, 'Ficha')
    await page.getByRole('button', { name: /Cosechar/ }).first().click()
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect.poll(() => dbPlants(context).find((p) => p.id === id)?.status).toBe('harvested')
    await page.evaluate((key) => localStorage.removeItem(key), `cultitrack-plant-tab-${id}`)
    await gotoApp(page, `/plants/${id}`)
    await expect(page.getByRole('tab', { name: 'Ficha' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('harvest-weight')).toBeVisible()
  })
})
