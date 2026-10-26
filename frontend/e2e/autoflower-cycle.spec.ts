import { test, expect } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi } from './helpers/journey'

/**
 * Regresion: una autofloreciente no tiene floraStartDate (florece sola al dia
 * 35), y la app la trataba como "vegetativa" para siempre: Home mostraba V11,
 * el filtro Flora la excluia y las tareas de floracion quedaban ocultas.
 * Caso real: planta "Ww" (auto) a los 76 dias.
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']

test.describe('Autofloreciente pasado el dia 35', () => {
  test.beforeEach(async ({ page, context }) => {
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plan: 'pro', plants: [] })
    await createPlantViaUi(page, SODA, 50) // 15 dias en floracion (semana 3)
  })

  test('el detalle la muestra en floracion y con sus tareas de flora', async ({ page, context }) => {
    await expect(page.getByText(/FLORA F\d/).first()).toBeVisible()
    await expect(page.getByText(/VEGE V\d|VEGE S\d/)).not.toBeVisible()
    expect(dbPlants(context)[0].flora_start_date ?? null).toBeNull() // las autos no tienen floraStartDate
    await expect(page.getByText('Vencidas', { exact: false }).first()).toBeVisible()
  })

  test('Home la marca como floracion (F) y no vegetativo (V)', async ({ page }) => {
    await gotoApp(page, '/')
    const card = page.getByRole('link', { name: new RegExp(SODA.genetics) }).first() // tarjeta de "Mis plantas"
    await expect(card).toContainText(/F\d/)
    await expect(card).not.toContainText(/V\d/)
    // y sus tareas atrasadas son del ciclo de floracion: hay mas que las 6 semanas de vege
    await expect(page.getByText(/tareas? vencidas?/).first()).toBeVisible()
  })

  test('el listado filtra bien: aparece en Flora y no en Vege', async ({ page }) => {
    await gotoApp(page, '/plants')
    await page.getByRole('button', { name: /^Flora/ }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /^Vege/ }).click()
    await expect(page.getByText(SODA.name, { exact: true })).not.toBeVisible()
  })

  test('la tarjeta del listado coincide con Home: semana de floracion y etapa', async ({ page }) => {
    await gotoApp(page, '/plants')
    const card = page.getByRole('link', { name: new RegExp(SODA.genetics) }).first()
    // inicio hace 50 dias, flora desde el dia 35 => dia 15 de flora = semana 3
    await expect(card).toContainText('F3')
    await expect(card).toContainText('Flora')
    await expect(card).not.toContainText('Vegetativo')
  })
})
