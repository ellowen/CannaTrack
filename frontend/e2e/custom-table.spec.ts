import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants } from './helpers/fakeBackend'

/**
 * Tablas nutricionales propias: validaciones, clonar una oficial, crear,
 * usarla en una planta, editar y eliminar (con la regla de plantas activas).
 */

const REV = /REVEGETAR — Tabla Nutricional Oficial/

async function setup(page: Page, context: BrowserContext, plan: 'pro' | 'free' = 'pro') {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan, plants: [] })
}

const createBtn = (page: Page) => page.getByRole('button', { name: 'Crear tabla' })

test.describe('Nueva tabla: validaciones', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await gotoApp(page, '/nutrition/new')
  })

  test('sin nombre', async ({ page }) => {
    await createBtn(page).click()
    await expect(page.getByText('Ponele un nombre a la tabla')).toBeVisible()
  })

  test('sin geneticas soportadas', async ({ page }) => {
    await page.getByPlaceholder('Ej: Mi tabla casera').fill('Sin geneticas')
    for (const g of ['Feminizada', 'Autofloreciente', 'Regular']) {
      await page.getByRole('button', { name: g, exact: true }).click()
    }
    await createBtn(page).click()
    await expect(page.getByText('Elegi al menos una genetica soportada')).toBeVisible()
  })

  test('linea incompleta e IDs de linea repetidos', async ({ page }) => {
    await page.getByPlaceholder('Ej: Mi tabla casera').fill('Lineas')
    await page.getByPlaceholder('ID').first().fill('')
    await createBtn(page).click()
    await expect(page.getByText('Todas las lineas necesitan id y nombre')).toBeVisible()

    await page.getByPlaceholder('ID').first().fill('A')
    await page.getByRole('button', { name: '+ Agregar', exact: true }).first().click()
    await page.getByPlaceholder('ID').nth(1).fill('A')
    await createBtn(page).click()
    await expect(page.getByText('Los IDs de linea deben ser unicos')).toBeVisible()
  })

  test('con una sola linea no hay boton para quitarla; con dos si', async ({ page }) => {
    const del = page.getByRole('button', { name: 'Eliminar linea' })
    await expect(del).toHaveCount(0)
    await page.getByRole('button', { name: '+ Agregar', exact: true }).first().click()
    await expect(del).toHaveCount(2)
    await del.first().click()
    await expect(del).toHaveCount(0)
  })
})

test.describe('Tabla propia: ciclo completo', () => {
  test.beforeEach(async ({ page, context }) => setup(page, context))

  test('clonar REVEGETAR, guardar, usarla en una planta y no poder borrarla mientras esta en uso', async ({ page, context }) => {
    await gotoApp(page, '/settings')
    await page.getByRole('link', { name: '+ Nueva' }).click()
    await expect(page.getByText('Nueva tabla nutricional')).toBeVisible()
    await page.getByRole('button', { name: new RegExp(`↻ ${REV.source}`) }).click()
    const nameField = page.getByPlaceholder('Ej: Mi tabla casera')
    await expect(nameField).toHaveValue(/\(copia\)$/)
    await nameField.fill('Mi tabla casera')
    await page.getByPlaceholder('Descripcion, fuente, ajustes propios...').fill('Copia de REVEGETAR para testear')
    await createBtn(page).click()

    // vuelve a Ajustes y la lista de tablas propias la muestra con las semanas clonadas
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByText('Mi tabla casera')).toBeVisible()
    await expect(page.getByText(/Custom · \d+ sem vege · 8 sem flora/)).toBeVisible()

    // se puede elegir en el alta de una planta
    await page.getByRole('link', { name: 'Plantas', exact: true }).click()
    await page.getByRole('link', { name: 'Nueva planta' }).click()
    await page.getByPlaceholder('Ej: White Widow #1').fill('Planta con tabla propia')
    await page.getByPlaceholder('Ej: White Widow', { exact: true }).fill('Test')
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.locator('select').first().selectOption({ label: 'Mi tabla casera (custom)' })
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    const tableId = String(dbPlants(context)[0].nutrition_table_id)
    expect(tableId).not.toBe('revegetar-v1')

    // con una planta activa usandola, eliminar la tabla se bloquea con un aviso
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await page.getByRole('link', { name: /Ajustes/ }).first().click()
    const dialogs: string[] = []
    page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept() })
    await page.getByRole('button', { name: 'Eliminar tabla Mi tabla casera' }).click()
    await expect.poll(() => dialogs.length).toBe(1)
    expect(dialogs[0]).toMatch(/No se puede eliminar: 1 planta activa la usa/)
    await expect(page.getByText('Mi tabla casera')).toBeVisible()
  })

  test('editar el nombre y las semanas, y eliminar la tabla (sin plantas que la usen)', async ({ page }) => {
    await gotoApp(page, '/nutrition/new?returnTo=/settings')
    await page.getByRole('button', { name: new RegExp(`↻ ${REV.source}`) }).click()
    await page.getByPlaceholder('Ej: Mi tabla casera').fill('Tabla editable')
    await createBtn(page).click()
    await expect(page).toHaveURL(/\/settings/)

    await page.getByRole('link', { name: 'Editar', exact: true }).click()
    await expect(page.getByText('Editar tabla')).toBeVisible()
    await page.getByPlaceholder('Ej: Mi tabla casera').fill('Tabla editada')
    await page.getByRole('button', { name: '+ Agregar semana' }).last().click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByText('Tabla editada')).toBeVisible()
    await expect(page.getByText(/Custom · \d+ sem vege · 9 sem flora/)).toBeVisible()

    // eliminar desde la lista (confirmacion: cancelar y luego aceptar)
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: 'Eliminar tabla Tabla editada' }).click()
    await expect(page.getByText('Tabla editada')).toBeVisible()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Eliminar tabla Tabla editada' }).click()
    await expect(page.getByText('Tabla editada')).not.toBeVisible()
    await expect(page.getByText(/Sin tablas personalizadas/)).toBeVisible()
  })

  test('eliminar desde la pantalla de edicion', async ({ page }) => {
    await gotoApp(page, '/nutrition/new?returnTo=/settings')
    await page.getByRole('button', { name: new RegExp(`↻ ${REV.source}`) }).click()
    await page.getByPlaceholder('Ej: Mi tabla casera').fill('Para borrar')
    await createBtn(page).click()
    await page.getByRole('link', { name: 'Editar', exact: true }).click()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByText('Para borrar')).not.toBeVisible()
  })

  test('semana con EC minimo mayor al maximo se rechaza', async ({ page }) => {
    await gotoApp(page, '/nutrition/new')
    await page.getByPlaceholder('Ej: Mi tabla casera').fill('EC invalido')
    await page.getByRole('button', { name: /^F1\s*Estiramiento/ }).click()
    const ecMin = page.locator('p:text-is("EC min") + input')
    const ecMax = page.locator('p:text-is("EC max") + input')
    await ecMin.fill('3')
    await ecMax.fill('1')
    await createBtn(page).click()
    await expect(page.getByText(/EC mínimo > máximo en F1/)).toBeVisible()
  })
})

test.describe('Tablas propias: plan Free', () => {
  test('Ajustes muestra el candado Pro en lugar del acceso a crear tablas', async ({ page, context }) => {
    await setup(page, context, 'free')
    await gotoApp(page, '/settings')
    await expect(page.getByText('🔒 Pro')).toBeVisible()
    await expect(page.getByRole('link', { name: '+ Nueva' })).not.toBeVisible()
  })
})
