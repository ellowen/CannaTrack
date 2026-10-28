import { test, expect } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend } from './helpers/fakeBackend'

test.describe('Editar planta', () => {
  test.beforeEach(async ({ page, context }) => {
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plants: [{ id: 'p1', name: 'Nombre Original', growMedium: 'soil' }] })
    await gotoApp(page, '/plants/p1/edit')
  })

  test('guardar directo desde el paso 1, sin pasar por los demas', async ({ page }) => {
    await page.getByPlaceholder(/White Widow #1/).fill('Solo Cambio El Nombre')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(/\/plants\/p1$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Solo Cambio El Nombre' })).toBeVisible()
  })

  test('los pasos del indicador llevan directo al paso elegido', async ({ page }) => {
    await page.getByRole('button', { name: /Ir al paso 3/ }).click()
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
    await page.getByRole('button', { name: /Ir al paso 2/ }).click()
    await expect(page.locator('label:has-text("Macetas") + input')).toBeVisible()
    await page.getByRole('button', { name: /Ir al paso 1/ }).click()
    await expect(page.getByPlaceholder(/White Widow #1/)).toHaveValue('Nombre Original')
  })

  test('con el nombre vacio no deja guardar ni avanzar', async ({ page }) => {
    await page.getByPlaceholder(/White Widow #1/).fill('')
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })
})
