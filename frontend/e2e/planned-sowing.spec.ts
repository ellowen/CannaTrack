import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbTasks } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, localISO } from './helpers/journey'

/**
 * Siembra planificada: una planta cuya fecha de inicio todavia no llego
 * ("se siembra el 1/12"). Antes se veia como "V-4 D-28" y con dias de cosecha
 * contados como si ya estuviera creciendo.
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const EN_10_DIAS = 10

async function setup(page: Page, context: BrowserContext) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
  return createPlantViaUi(page, SODA, -EN_10_DIAS)
}

test.describe('Siembra planificada', () => {
  test('detalle: etiqueta PLANIFICADA y cuenta regresiva, sin semana ni V/F', async ({ page, context }) => {
    await setup(page, context)
    await expect(page.getByText('PLANIFICADA').first()).toBeVisible()
    await expect(page.getByText(/dias para la siembra/)).toBeVisible()
    await expect(page.getByText('Siembra planificada')).toBeVisible()
    await expect(page.getByText(/VEGE S-?\d|FLORA F\d/)).toHaveCount(0)
  })

  test('el calendario arranca el dia de siembra y no hay tareas vencidas ni de hoy', async ({ page, context }) => {
    const id = await setup(page, context)
    const fechas = dbTasks(context).filter((t) => t.plant_id === id).map((t) => t.scheduled_date as string).sort()
    expect(fechas[0]).toBe(localISO(-EN_10_DIAS))

    await gotoApp(page, '/')
    await expect(page.getByText(/tareas? vencidas?/i)).toHaveCount(0)
    await expect(page.getByText(/V-\d|D-\d/)).toHaveCount(0)
  })

  test('Home y listado muestran "En 10d" y la fecha de siembra', async ({ page, context }) => {
    await setup(page, context)
    await gotoApp(page, '/')
    await expect(page.getByText('En 10d').first()).toBeVisible()

    await gotoApp(page, '/plants')
    await expect(page.getByText('En 10d').first()).toBeVisible()
    await expect(page.getByText(/Se siembra el/)).toBeVisible()
    await expect(page.getByText(/V-?\d+$/)).toHaveCount(0)
  })

  test('una planta ya sembrada no se marca como planificada', async ({ page, context }) => {
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
    await createPlantViaUi(page, SODA, 3)
    await expect(page.getByText('PLANIFICADA')).toHaveCount(0)
    await expect(page.getByText('VEGE S0', { exact: true }).first()).toBeVisible()
  })
})
