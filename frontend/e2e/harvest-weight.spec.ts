import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, plantTab } from './helpers/journey'

/** Peso cosechado: se carga al cosechar o despues y se compara con la ficha (solo Soda da cifra por planta). */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const FLAT_WHITE = STRAIN_BY_SLUG['flat-white-auto']

async function harvest(page: Page, context: BrowserContext, strain: typeof SODA, weight?: string) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
  const id = await createPlantViaUi(page, strain, 80)
  await plantTab(page, 'Datos')
  await page.getByRole('button', { name: /Cosechar/ }).first().click()
  if (weight) await page.getByLabel(/Peso cosechado/).fill(weight)
  await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
  await expect(page).toHaveURL(/\/$/)
  // esperar a que el servidor tenga el cierre (y el peso) antes de recargar: si no, la recarga trae la planta aun activa
  await expect.poll(() => dbPlants(context).find((p) => p.id === id)?.status).toBe('harvested')
  if (weight) await expect.poll(() => dbPlants(context).find((p) => p.id === id)?.harvest_weight_g).not.toBeUndefined()
  await gotoApp(page, `/plants/${id}`)
  return id
}

test.describe('Peso cosechado', () => {
  test('al cosechar con peso: se guarda, muestra g/dia y g/litro y cae dentro de la ficha', async ({ page, context }) => {
    const id = await harvest(page, context, SODA, '45')
    const card = page.getByTestId('harvest-weight')
    await expect(card).toContainText('45 g')
    await expect(card).toContainText('por día de cultivo')
    await expect(card).toContainText('2.3 g por litro de maceta')
    await expect(card).toContainText('Dentro del rango de la ficha (20-75 g por planta)')
    expect(dbPlants(context).find((p) => p.id === id)!.harvest_weight_g).toBe(45)
  })

  test('cosechar sin peso y cargarlo despues; editarlo por encima de la ficha', async ({ page, context }) => {
    const id = await harvest(page, context, SODA)
    const card = page.getByTestId('harvest-weight')
    await expect(card).toContainText('Todavía no cargaste el peso')
    await card.getByRole('button', { name: 'Registrar peso' }).click()
    await page.getByLabel('Peso cosechado (g)').fill('12,5')
    await page.getByRole('button', { name: 'Guardar peso' }).click()
    await expect(card).toContainText('12.5 g')
    await expect(card).toContainText('Por debajo de la ficha')
    await card.getByRole('button', { name: 'Editar peso' }).click()
    await page.getByLabel('Peso cosechado (g)').fill('90')
    await page.getByRole('button', { name: 'Guardar peso' }).click()
    await expect(card).toContainText('Por encima de la ficha')
    await expect.poll(() => dbPlants(context).find((p) => p.id === id)!.harvest_weight_g).toBe(90)
  })

  test('peso invalido: no deja confirmar ni guardar', async ({ page, context }) => {
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
    await createPlantViaUi(page, SODA, 80)
    await plantTab(page, 'Datos')
    await page.getByRole('button', { name: /Cosechar/ }).first().click()
    await page.getByLabel(/Peso cosechado/).fill('-3')
    await expect(page.getByText('Ingresá un peso entre 1 y 10000 g')).toBeVisible()
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect(page.getByRole('button', { name: /Confirmar cosecha/ })).toBeVisible() // la hoja sigue abierta
  })

  test('una variedad sin cifra por planta muestra el peso pero no compara', async ({ page, context }) => {
    await harvest(page, context, FLAT_WHITE, '80')
    const card = page.getByTestId('harvest-weight')
    await expect(card).toContainText('80 g')
    await expect(card).not.toContainText('ficha')
  })
})
