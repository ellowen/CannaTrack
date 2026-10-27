import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants, dbTasks } from './helpers/fakeBackend'

/**
 * Formulario de nueva planta: todas las opciones y validaciones.
 * Usuario Pro simulado (el Free solo permite 1 planta activa).
 */

async function setup(page: Page, context: BrowserContext) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [] })
  await gotoApp(page, '/plants/new')
}

const next = (page: Page) => page.getByRole('button', { name: /Continuar/ })
const nameInput = (page: Page) => page.getByPlaceholder('Ej: White Widow #1')
const geneticsInput = (page: Page) => page.getByPlaceholder('Ej: White Widow', { exact: true })

test.describe('Formulario: pasos y validaciones', () => {
  test.beforeEach(async ({ page, context }) => setup(page, context))

  test('no avanza sin nombre ni genetica; valida largo minimo', async ({ page }) => {
    await expect(next(page)).toBeDisabled()
    await nameInput(page).fill('A')
    await nameInput(page).blur()
    await expect(page.getByText('El nombre debe tener al menos 2 caracteres')).toBeVisible()
    await geneticsInput(page).fill('B')
    await geneticsInput(page).blur()
    await expect(page.getByText('La genética debe tener al menos 2 caracteres')).toBeVisible()
    await nameInput(page).fill('Planta uno')
    await geneticsInput(page).fill('Genetica uno')
    await expect(next(page)).toBeEnabled()
  })

  test('autofloreciente: dias totales y dia/duracion de floracion con rangos validos', async ({ page }) => {
    await page.getByRole('button', { name: 'Auto', exact: true }).click()
    const total = page.locator('label:has-text("Días totales del ciclo") + input')
    await total.fill('50')
    await total.blur()
    await expect(page.getByText('Los días deben estar entre 60 y 120')).toBeVisible()
    await total.fill('80')
    await expect(page.getByText('Los días deben estar entre 60 y 120')).not.toBeVisible()

    await page.getByLabel('Días de floración').fill('20')
    await expect(page.getByText('La floración debe durar entre 28 y 140 días')).toBeVisible()
    await page.getByLabel('Días de floración').fill('45')
    await expect(page.getByText(/≈ 7 semanas/)).toBeVisible()

    await page.getByLabel('Día de inicio de floración').fill('5')
    await expect(page.getByText('El día de floración debe estar entre 14 y 90')).toBeVisible()
    await page.getByLabel('Día de inicio de floración').fill('30')
    await expect(page.getByText('El día de floración debe estar entre 14 y 90')).not.toBeVisible()
  })

  test('feminizada no muestra campos de auto; regular pide sexo', async ({ page }) => {
    await expect(page.getByLabel('Día de inicio de floración')).not.toBeVisible()
    await expect(page.getByText('Días totales del ciclo')).not.toBeVisible()
    await page.getByRole('button', { name: 'Regular', exact: true }).click()
    await expect(page.getByText('Sexo')).toBeVisible()
    for (const s of ['Desconocido', 'Hembra', 'Macho']) {
      await expect(page.getByRole('button', { name: s })).toBeVisible()
    }
  })

  test('paso 2: macetas, litros y fecha con sus limites', async ({ page }) => {
    await nameInput(page).fill('Validaciones')
    await geneticsInput(page).fill('Test')
    await next(page).click()
    const pots = page.locator('label:has-text("Macetas") + input')
    const liters = page.locator('label:has-text("Litros c/u") + input')
    await pots.fill('0'); await pots.blur()
    await expect(page.getByText('Debe tener entre 1 y 100 macetas')).toBeVisible()
    await pots.fill('3')
    await liters.fill('500'); await liters.blur()
    await expect(page.getByText('El volumen debe estar entre 1 y 200 litros')).toBeVisible()
    await liters.fill('12')
    await expect(next(page)).toBeEnabled()

    const date = page.locator('label:has-text("Fecha de inicio") + input[type="date"]')
    const far = new Date(); far.setFullYear(far.getFullYear() + 2)
    await date.fill(far.toISOString().slice(0, 10)); await date.blur()
    await expect(page.getByText('La fecha no puede ser más de 1 año en el futuro')).toBeVisible()
  })

  test('Volver conserva lo cargado y la barra de pasos refleja el avance', async ({ page }) => {
    await nameInput(page).fill('Ida y vuelta')
    await geneticsInput(page).fill('Retorno')
    await next(page).click()
    await expect(page.getByText('SETUP', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: /Volver/ }).click()
    await expect(nameInput(page)).toHaveValue('Ida y vuelta')
    await expect(geneticsInput(page)).toHaveValue('Retorno')
  })
})

test.describe('Formulario: opciones que quedan guardadas', () => {
  test.beforeEach(async ({ page, context }) => setup(page, context))

  test('indoor + coco + 4 macetas de 7 L, regular hembra', async ({ page, context }) => {
    await nameInput(page).fill('Opciones')
    await geneticsInput(page).fill('Mix')
    await page.getByRole('button', { name: 'Regular', exact: true }).click()
    await page.getByRole('button', { name: 'Hembra' }).click()
    await next(page).click()
    await page.getByRole('button', { name: /Indoor/ }).click()
    await page.getByRole('button', { name: /Coco/ }).click()
    await page.locator('label:has-text("Macetas") + input').fill('4')
    await page.locator('label:has-text("Litros c/u") + input').fill('7')
    await next(page).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    const row = dbPlants(context)[0]
    expect(row).toMatchObject({
      name: 'Opciones', genetic_type: 'regular', sex: 'female', location: 'indoor',
      grow_medium: 'coco', pot_count: 4, pot_volume_liters: 7,
    })
    await expect(page.getByText('4 macetas · 7L')).toBeVisible()
    await expect(page.getByText('🥥 Coco')).toBeVisible()
  })

  test('regular macho: la planta se crea pero sin cronograma de tareas', async ({ page, context }) => {
    await nameInput(page).fill('Macho')
    await geneticsInput(page).fill('Regular')
    await page.getByRole('button', { name: 'Regular', exact: true }).click()
    await page.getByRole('button', { name: 'Macho' }).click()
    await next(page).click()
    await next(page).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    expect(dbPlants(context)[0].sex).toBe('male')
    expect(dbTasks(context)).toHaveLength(0)
  })

  test('otro cultivo (tomate): sin campos de cannabis ni tabla nutricional', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Tomate' }).click()
    await expect(page.getByText('Tipo de genética')).not.toBeVisible()
    await expect(page.getByText(/todavía no tenemos calendario nutricional/i)).toBeVisible()
    await nameInput(page).fill('Tomate cherry')
    await page.getByPlaceholder(/Cherry/).fill('Cherry')
    await next(page).click()
    await next(page).click()
    await expect(page.getByText('Tabla nutricional', { exact: true })).not.toBeVisible()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    const row = dbPlants(context)[0]
    expect(row.crop_type).toBe('tomato')
    expect(row.genetic_type ?? null).toBeNull()
    // sin etapas vege/flora, ni badge de fotoperiodo
    await expect(page.getByText('VEGE', { exact: false })).not.toBeVisible()
  })

  test('tabla nutricional (Pro: elegir entre las oficiales) y vista previa del cronograma', async ({ page, context }) => {
    await nameInput(page).fill('Con tabla')
    await geneticsInput(page).fill('Top')
    await next(page).click()
    await next(page).click()
    const select = page.locator('select').first()
    const options = await select.locator('option').allTextContents()
    expect(options.length).toBeGreaterThan(1)
    const topCrop = options.find((o) => /Top Crop/i.test(o))!
    await select.selectOption({ label: topCrop })

    await page.getByRole('button', { name: /Vista previa del cronograma/ }).click()
    await expect(page.getByText(/V0|Semana|S0/).first()).toBeVisible()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    expect(String(dbPlants(context)[0].nutrition_table_id)).toMatch(/top/i)
  })

  test('productos: elegir solo algunos y agregar uno propio que aparece en las tareas', async ({ page, context }) => {
    await nameInput(page).fill('Productos')
    await geneticsInput(page).fill('Mix')
    await next(page).click()
    await next(page).click()

    await page.getByRole('button', { name: /Mis productos disponibles/ }).click()
    await page.getByLabel('Todos los productos').uncheck()
    await page.getByRole('checkbox').nth(1).check()
    await expect(page.getByText(/^1\/\d+$/)).toBeVisible()

    await page.getByRole('button', { name: /Agregar producto propio/ }).click()
    await expect(page.getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled()
    await page.getByPlaceholder('Nombre del producto *').fill('Mi Fertil Casero')
    await page.getByPlaceholder('Dosis (por litro)').fill('2.5')
    await page.getByRole('button', { name: 'gr', exact: true }).click()
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await expect(page.getByText('Mi Fertil Casero')).toBeVisible()
    await expect(page.getByText('1 agregado')).toBeVisible()

    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    const row = dbPlants(context)[0]
    expect((row.available_products as string[]).length).toBe(1)
    const withCustom = dbTasks(context).filter((t) => t.type === 'nutrition' && JSON.stringify(t.products).includes('Mi Fertil Casero'))
    expect(withCustom.length).toBeGreaterThan(0)
  })

  test('producto propio: se puede quitar antes de crear', async ({ page }) => {
    await nameInput(page).fill('Quitar')
    await geneticsInput(page).fill('Mix')
    await next(page).click()
    await next(page).click()
    await page.getByRole('button', { name: /Agregar producto propio/ }).click()
    await page.getByPlaceholder('Nombre del producto *').fill('Temporal')
    await page.getByPlaceholder('Dosis (por litro)').fill('1')
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await page.getByRole('button', { name: 'Quitar producto Temporal' }).click()
    await expect(page.getByText('Temporal')).not.toBeVisible()
  })
})

test.describe('Formulario: vegetativo y riegos por semana', () => {
  test.beforeEach(async ({ page, context }) => setup(page, context))

  test('el vegetativo solo se puede configurar en fotoperiodicas; los riegos en todas', async ({ page }) => {
    await expect(page.getByLabel('Días de vegetativo')).toBeVisible()
    await expect(page.getByLabel('Riegos por semana')).toBeVisible()
    await page.getByRole('button', { name: 'Auto', exact: true }).click()
    await expect(page.getByLabel('Días de vegetativo')).not.toBeVisible() // las autos florecen solas
    await expect(page.getByLabel('Riegos por semana')).toBeVisible()
    await page.getByRole('button', { name: 'Tomate' }).click()
    await expect(page.getByLabel('Riegos por semana')).not.toBeVisible() // sin calendario cannabis
  })

  test('rangos validos: vegetativo 14-180 y riegos 1-7', async ({ page }) => {
    await page.getByLabel('Días de vegetativo').fill('5')
    await expect(page.getByText('El vegetativo debe durar entre 14 y 180 días')).toBeVisible()
    await page.getByLabel('Días de vegetativo').fill('90')
    await expect(page.getByText('El vegetativo debe durar entre 14 y 180 días')).not.toBeVisible()
    await expect(page.getByText(/≈ 13 semanas de vegetativo/)).toBeVisible()

    await page.getByLabel('Riegos por semana').fill('9')
    await expect(page.getByText('Los riegos por semana deben estar entre 1 y 7')).toBeVisible()
    await page.getByLabel('Riegos por semana').fill('3')
    await expect(page.getByText('Los riegos por semana deben estar entre 1 y 7')).not.toBeVisible()
  })

  test('Blue Applez con 12 semanas de vegetativo y 3 riegos por semana: el calendario lo refleja', async ({ page, context }) => {
    await page.getByLabel('Variedad del catálogo (opcional)').selectOption({ label: 'Blue Applez' })
    await page.getByPlaceholder('Ej: White Widow #1').fill('Blue Applez larga')
    await page.getByLabel('Días de vegetativo').fill('84')
    await page.getByLabel('Riegos por semana').fill('3')
    await next(page).click()
    await expect(page.getByText(/84 días · 3\/sem/)).toBeVisible() // resumen del paso 2
    await next(page).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })

    const row = dbPlants(context)[0]
    expect(row.vege_days).toBe(84)
    expect(row.irrigation_per_week).toBe(3)
    const vege = dbTasks(context).filter((t) => t.cycle === 'vege')
    expect(Math.max(...vege.map((t) => Number(t.week)))).toBe(11) // 12 semanas: V0..V11
    for (const semana of [0, 5, 11]) {
      expect(vege.filter((t) => t.type === 'irrigation' && Number(t.week) === semana)).toHaveLength(3)
    }
  })

  test('por defecto (sin tocar los campos) el calendario es el de siempre', async ({ page, context }) => {
    await nameInput(page).fill('Defecto')
    await geneticsInput(page).fill('Mix')
    await next(page).click()
    await next(page).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    expect(dbPlants(context)[0].vege_days ?? null).toBeNull()
    expect(dbPlants(context)[0].irrigation_per_week ?? null).toBeNull()
    const vege = dbTasks(context).filter((t) => t.cycle === 'vege')
    expect(Math.max(...vege.map((t) => Number(t.week)))).toBe(5)
    expect(vege.filter((t) => t.type === 'irrigation' && Number(t.week) === 1)).toHaveLength(2)
  })

  test('editar los riegos por semana regenera lo pendiente', async ({ page, context }) => {
    await nameInput(page).fill('Editar riegos')
    await geneticsInput(page).fill('Mix')
    await next(page).click()
    await next(page).click()
    await page.getByRole('button', { name: /Crear planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
    const id = String(dbPlants(context)[0].id)

    await gotoApp(page, `/plants/${id}/edit`)
    await page.getByLabel('Riegos por semana').fill('4')
    await next(page).click()
    await next(page).click()
    await page.getByRole('button', { name: /Guardar cambios/ }).click()
    await expect(page).toHaveURL(new RegExp(`/plants/${id}$`), { timeout: 10_000 })

    expect(dbPlants(context)[0].irrigation_per_week).toBe(4)
    await expect.poll(
      () => dbTasks(context).filter((t) => t.plant_id === id && t.cycle === 'vege' && t.type === 'irrigation' && Number(t.week) === 3).length,
    ).toBe(4)
  })
})
