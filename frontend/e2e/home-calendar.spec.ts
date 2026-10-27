import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbTasks, dbPlants } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi } from './helpers/journey'

/**
 * Home y Calendario con plantas reales: Auto Strawberry Soda (hoy) y
 * Blue Applez (hace 3 dias, con tareas atrasadas).
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const BLUE = STRAIN_BY_SLUG['blue-applez']

async function setup(page: Page, context: BrowserContext) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [] })
}

test.describe('Home sin plantas', () => {
  test('estado vacio invita a crear la primera planta', async ({ page, context }) => {
    await setup(page, context)
    await gotoApp(page, '/')
    await expect(page.getByText('Tu grow empieza aca')).toBeVisible()
    await page.getByRole('link', { name: /Agregar primera planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/new$/)
  })
})

test.describe('Home con las plantas reales', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
    await createPlantViaUi(page, BLUE, 3)
    await gotoApp(page, '/')
  })

  test('saludo, racha, plantas, proxima cosecha y atajos', async ({ page }) => {
    await expect(page.getByText(/Buen(os|as) (dias|tardes|noches), Tester/)).toBeVisible()
    await expect(page.getByText('Proxima cosecha')).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(SODA.name) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(BLUE.name) }).first()).toBeVisible()

    await page.getByRole('link', { name: /Ver todas/ }).click()
    await expect(page).toHaveURL(/\/plants$/)
    await gotoApp(page, '/')
    await page.getByRole('link', { name: /Nueva/ }).click()
    await expect(page).toHaveURL(/\/plants\/new$/)
  })

  test('la tarjeta de proxima cosecha lleva a la auto', async ({ page }) => {
    await page.getByRole('link', { name: /Proxima cosecha/ }).click()
    await expect(page.getByRole('heading', { name: SODA.name })).toBeVisible()
  })

  test('tareas atrasadas de Blue Applez: aviso, abrir una y resolver todas', async ({ page, context }) => {
    await expect(page.getByText(/3 tareas vencidas/)).toBeVisible()
    await page.getByRole('button', { name: /Marcar hecho/ }).first().click()
    await expect(page.getByText(/completada ✓/)).toBeVisible()
    await page.getByRole('button', { name: /^Ahora no$/ }).click()

    // "Resolver" abre el sheet de la primera atrasada; "Todas" las resuelve juntas
    await page.getByRole('button', { name: /^Resolver$/ }).click()
    await expect(page.getByText(/completada ✓/)).toBeVisible()
    await page.getByRole('button', { name: /^Ahora no$/ }).click()
    await page.getByRole('button', { name: /^Todas$/ }).click()
    await expect(page.getByText(/3 tareas vencidas/)).not.toBeVisible({ timeout: 8_000 })
    const blueId = dbPlants(context).find((p) => p.name === BLUE.name)!.id
    await expect.poll(() =>
      dbTasks(context).filter((t) => t.plant_id === blueId && new Date(String(t.scheduled_date)) < new Date(new Date().toDateString()) && t.completed !== true).length,
    ).toBe(0)
  })

  test('tareas de hoy: completar una, deshacerla y completar todo ("✓ Todo")', async ({ page, context }) => {
    const sodaId = dbPlants(context).find((p) => p.name === SODA.name)!.id
    const todays = () => dbTasks(context).filter((t) => t.plant_id === sodaId && t.scheduled_date === new Date().toLocaleDateString('sv-SE'))

    await page.getByRole('button', { name: /: ver detalle/ }).first().click()
    await page.getByRole('button', { name: /Confirmar/ }).click()
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
    await expect.poll(() => todays().filter((t) => t.completed === true).length).toBe(1)

    await page.waitForTimeout(1_600)
    // la lista de completadas permite deshacer (y eso se sincroniza con la base)
    await page.getByRole('button', { name: /completadas? hoy/i }).click()
    await page.getByRole('button', { name: /Deshacer/ }).first().click()
    await expect.poll(() => todays().filter((t) => t.completed === true).length).toBe(0)

    await page.getByRole('button', { name: /✓ Todo/ }).click()
    await expect.poll(() => todays().every((t) => t.completed === true)).toBe(true)
    await expect(page.getByText('Todo al dia!')).toBeVisible({ timeout: 8_000 })
  })

  test('historial: una planta cosechada aparece en el archivo de Home', async ({ page, context }) => {
    await page.getByRole('link', { name: new RegExp(SODA.name) }).first().click()
    await page.getByRole('button', { name: /Cosechar/ }).first().click()
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.getByRole('button', { name: /Historial · 1/ }).click()
    await expect(page.getByText('Cosechada').first()).toBeVisible()
    expect(dbPlants(context).find((p) => p.name === SODA.name)!.status).toBe('harvested')
  })
})

test.describe('Calendario', () => {
  test('sin plantas: invita a crear una', async ({ page, context }) => {
    await setup(page, context)
    await gotoApp(page, '/calendar')
    await expect(page.getByText('Sin calendario aún')).toBeVisible()
    await page.getByRole('link', { name: /Agregar planta/ }).click()
    await expect(page).toHaveURL(/\/plants\/new$/)
  })

  test.describe('con plantas reales', () => {
    test.beforeEach(async ({ page, context }) => {
      await setup(page, context)
      await createPlantViaUi(page, SODA, 0)
      await createPlantViaUi(page, BLUE, 3)
      await gotoApp(page, '/calendar')
    })

    test('navegar meses con las flechas y volver a "Hoy"', async ({ page }) => {
      const month = () => page.getByRole('heading', { level: 1 }).innerText()
      const first = await month()
      await page.getByRole('button', { name: 'Mes siguiente' }).click()
      expect(await month()).not.toBe(first)
      await page.getByRole('button', { name: 'Mes siguiente' }).click()
      await page.getByRole('button', { name: 'Mes anterior' }).click()
      await page.getByRole('button', { name: 'Mes anterior' }).click()
      expect(await month()).toBe(first)
      await page.getByRole('button', { name: 'Mes anterior' }).click()
      await page.getByRole('button', { name: /^Hoy$/ }).click()
      expect(await month()).toBe(first)
    })

    test('el dia de hoy lista las tareas de ambas plantas con sus nombres', async ({ page }) => {
      await expect(page.getByText(/pendientes/).first()).toBeVisible()
      await expect(page.getByText(SODA.name).first()).toBeVisible()
    })

    test('completar desde el calendario y deshacer (se sincroniza)', async ({ page, context }) => {
      await page.getByRole('button', { name: /Hecho ✓/ }).first().click()
      await page.getByRole('button', { name: /Confirmar/ }).click()
      await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
      await page.waitForTimeout(1_600)
      await expect.poll(() => dbTasks(context).some((t) => t.completed === true)).toBe(true)
      await page.getByRole('button', { name: /Deshacer/ }).first().click()
      await expect.poll(() => dbTasks(context).some((t) => t.completed === true)).toBe(false)
    })

    test('elegir otro dia del mes muestra sus tareas o "Sin tareas"', async ({ page }) => {
      const today = new Date().getDate()
      const other = today > 10 ? 3 : 25
      await page.getByRole('button', { name: new RegExp(`^${other}\\b`) }).first().click()
      await expect(page.getByText(/Sin tareas|pendientes|Completado/).first()).toBeVisible()
    })
  })
})

test.describe('Dashboard (/dashboard)', () => {
  test('una tarea de hoy dice "Hoy" y solo las de dias anteriores dicen "Vencida"', async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)  // tareas de hoy
    await createPlantViaUi(page, BLUE, 3)  // tareas atrasadas
    await gotoApp(page, '/dashboard')
    const todayCard = page.locator('div', { hasText: SODA.name }).filter({ hasText: 'Hoy' }).first()
    await expect(todayCard).toBeVisible()
    await expect(todayCard).not.toContainText('Vencida')
    const overdue = page.locator('div', { hasText: BLUE.name }).filter({ hasText: 'Vencida' }).first()
    await expect(overdue).toBeVisible()
  })
})

test.describe('Home: tareas agrupadas por planta', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
    await gotoApp(page, '/')
  })

  const todays = (context: BrowserContext) => {
    const id = dbPlants(context).find((p) => p.name === SODA.name)!.id
    return dbTasks(context).filter((t) => t.plant_id === id && t.scheduled_date === new Date().toLocaleDateString('sv-SE'))
  }

  test('la planta se nombra una vez; el check completa sin abrir la hoja; tocar la fila abre el detalle', async ({ page, context }) => {
    expect(todays(context).length).toBe(2) // nutricion + observacion el dia 0

    const group = page.getByTestId('plant-task-group')
    await expect(group).toHaveCount(1)
    await expect(group.getByRole('heading', { name: SODA.name })).toHaveCount(1)

    await group.getByRole('button', { name: /marcar hecha/ }).first().click()
    await expect(page.getByRole('button', { name: /Confirmar/ })).toHaveCount(0)
    await expect.poll(() => todays(context).filter((t) => t.completed === true).length).toBe(1)

    await group.getByRole('button', { name: /ver detalle/ }).click()
    await expect(page.getByRole('button', { name: /Cancelar tarea/ })).toBeVisible()
  })

  test('"Todo" de la planta resuelve todas sus tareas de una vez', async ({ page, context }) => {
    await page.getByRole('button', { name: /Marcar todo hecho en/ }).click()
    await expect.poll(() => todays(context).every((t) => t.completed === true)).toBe(true)
    await expect(page.getByText('Todo al dia!')).toBeVisible({ timeout: 8_000 })
  })
})
