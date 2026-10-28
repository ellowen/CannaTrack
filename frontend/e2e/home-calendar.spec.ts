import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbTasks, dbPlants } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, plantTab } from './helpers/journey'

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

  test('Inicio queda enfocado en hoy: tira de plantas y sin proxima semana, nivel ni historial', async ({ page }) => {
    await expect(page.getByText('Mis plantas')).toBeVisible()
    await expect(page.getByText('Proxima semana')).toHaveCount(0)
    await expect(page.getByText(/Historial/)).toHaveCount(0)
    await expect(page.getByText('Semilla')).toHaveCount(0)
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
    await page.getByRole('button', { name: 'Sí, marcar todas' }).click()
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

    // la accion masiva pide confirmacion: cancelar no completa nada
    await page.getByRole('button', { name: /✓ Todo/ }).click()
    await expect(page.getByRole('alertdialog')).toContainText('¿Marcar las')
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect.poll(() => todays().every((t) => t.completed === true)).toBe(false)

    await page.getByRole('button', { name: /✓ Todo/ }).click()
    await page.getByRole('button', { name: 'Sí, marcar todas' }).click()
    await expect.poll(() => todays().every((t) => t.completed === true)).toBe(true)
    await expect(page.getByText('Todo al dia!')).toBeVisible({ timeout: 8_000 })
  })

  test('una planta cosechada sale de Inicio y aparece en Plantas > Cosechadas', async ({ page, context }) => {
    await page.getByRole('link', { name: new RegExp(SODA.name) }).first().click()
    await plantTab(page, 'Datos')
    await page.getByRole('button', { name: /Cosechar/ }).first().click()
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => dbPlants(context).find((p) => p.name === SODA.name)!.status).toBe('harvested')
    await expect(page.getByRole('link', { name: new RegExp(SODA.name) })).toHaveCount(0)
    await gotoApp(page, '/plants')
    await page.getByRole('button', { name: /Cosechada/ }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
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

test.describe('Home: plegar tareas por planta', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
    await createPlantViaUi(page, BLUE, 0)
    await gotoApp(page, '/')
  })

  test('plegar una planta oculta sus filas, "Plegar todo" las oculta todas y se recuerda al recargar', async ({ page }) => {
    const rows = page.getByRole('button', { name: /: marcar hecha/ })
    const total = await rows.count()
    expect(total).toBeGreaterThanOrEqual(3)

    await page.getByRole('button', { name: `Plegar las tareas de ${SODA.name}` }).click()
    await expect(page.getByText(/\d+ pendientes?/).first()).toBeVisible()
    expect(await rows.count()).toBeLessThan(total)
    await expect(page.getByRole('button', { name: `Expandir las tareas de ${SODA.name}` })).toHaveAttribute('aria-expanded', 'false')

    await page.getByRole('button', { name: 'Plegar todo' }).click()
    await expect(rows).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Expandir todo' })).toBeVisible()
    // "Todo" de la planta sigue disponible con el grupo plegado
    await expect(page.getByRole('button', { name: new RegExp(`Marcar todo hecho en ${BLUE.name}`) })).toBeVisible()

    await gotoApp(page, '/')
    await expect(rows).toHaveCount(0)
    await page.getByRole('button', { name: 'Expandir todo' }).click()
    await expect(rows).toHaveCount(total)
  })
})

