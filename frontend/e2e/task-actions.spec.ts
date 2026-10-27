import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { addDays } from 'date-fns'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, getFakeBackend, dbTasks, setOffline } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, localISO } from './helpers/journey'

/**
 * Cancelar, restaurar y mover tareas (p.ej. un riego que no hace falta porque llovio).
 * Auto Strawberry Soda sembrada hace 2 dias: hoy toca un riego (dia 2 de la semana 0).
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const TODAY = () => localISO(0)

async function setup(page: Page, context: BrowserContext) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
  return createPlantViaUi(page, SODA, 2)
}

/** Elige un dia del calendario (cambia de mes si hace falta). Los dias del mes vecino son botones deshabilitados repetidos. */
async function clickCalendarDay(page: Page, dia: Date) {
  if (dia.getMonth() !== new Date().getMonth()) await page.getByRole('button', { name: 'Mes siguiente' }).click()
  const botones = page.getByRole('button', { name: new RegExp(`^${dia.getDate()}\\b`) })
  await (dia.getDate() > 15 ? botones.last() : botones.first()).click()
}

const riegoDeHoy = (context: BrowserContext, plantId: string) =>
  dbTasks(context).find((t) => t.plant_id === plantId && t.type === 'irrigation' && t.scheduled_date === TODAY())!

async function openRiegoSheet(page: Page) {
  await page.getByRole('button', { name: /Riego completado/ }).first().click()
  await expect(page.getByText(/completada ✓/)).toBeVisible()
}

test.describe('Cancelar una tarea', () => {
  test('con motivo: sale de Home, Dashboard y Calendario, queda en "Canceladas" y no da XP', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '🌧️ Cancelar tarea' }).click()
    await page.getByRole('button', { name: 'Llovió', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar cancelación' }).click()

    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.skipped).toBe(true)
    const row = dbTasks(context).find((t) => t.id === riego.id)!
    expect(row.skip_reason).toBe('Llovió')
    expect(row.completed).toBe(false)
    expect(getFakeBackend(context).log.filter((l) => l.includes('handle_task_completion'))).toHaveLength(0)

    // detalle: el boton del riego ya no esta y aparece en "Canceladas" con su motivo
    await expect(page.getByRole('button', { name: /Riego completado/ })).toHaveCount(0)
    const canceladas = page.getByTestId('skipped-tasks')
    await expect(canceladas).toContainText('Canceladas · 1')
    await expect(canceladas).toContainText('Llovió')

    // el resto de las pantallas (recarga completa: el dato viene "del servidor")
    await gotoApp(page, '/')
    await expect(page.getByText('Riego', { exact: true })).toHaveCount(0)
    await gotoApp(page, '/dashboard')
    await expect(page.getByText('Riego')).toHaveCount(0)
    await gotoApp(page, '/calendar')
    await expect(page.getByRole('button', { name: /Hecho ✓/ })).toHaveCount(0)
  })

  test('sin motivo tambien se puede, y "Volver" no cancela nada', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '🌧️ Cancelar tarea' }).click()
    await page.getByRole('button', { name: 'Volver', exact: true }).last().click()
    await expect(page.getByRole('button', { name: /Confirmar ✓/ })).toBeVisible()
    expect(dbTasks(context).find((t) => t.id === riego.id)!.skipped).toBe(false)

    await page.getByRole('button', { name: '🌧️ Cancelar tarea' }).click()
    await page.getByPlaceholder('Otro motivo (opcional)').fill('Maceta todavia humeda')
    await page.getByRole('button', { name: 'Confirmar cancelación' }).click()
    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.skip_reason).toBe('Maceta todavia humeda')
  })

  test('restaurar: la tarea vuelve a estar pendiente en todas las pantallas', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '🌧️ Cancelar tarea' }).click()
    await page.getByRole('button', { name: 'Confirmar cancelación' }).click()
    await expect(page.getByTestId('skipped-tasks')).toBeVisible()

    await page.getByRole('button', { name: /Restaurar Riego/ }).click()
    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.skipped).toBe(false)
    expect(dbTasks(context).find((t) => t.id === riego.id)!.skip_reason ?? null).toBeNull()
    await expect(page.getByTestId('skipped-tasks')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Riego completado/ })).toBeVisible()

    await gotoApp(page, '/')
    await expect(page.getByText('Riego', { exact: true }).first()).toBeVisible()
  })
})

test.describe('Mover una tarea a otro dia', () => {
  test('a mañana: deja de estar en hoy, aparece mañana y guarda la fecha original', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '📅 Mover a otro día' }).click()
    await expect(page.getByLabel('Nueva fecha')).toHaveValue(localISO(-1)) // mañana por defecto
    await page.getByRole('button', { name: 'Mover tarea' }).click()

    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.scheduled_date).toBe(localISO(-1))
    expect(dbTasks(context).find((t) => t.id === riego.id)!.rescheduled_from).toBe(TODAY())
    await expect(page.getByRole('button', { name: /Riego completado/ })).toHaveCount(0)

    // Home: hoy no hay riego; calendario: mañana si
    await gotoApp(page, '/')
    await expect(page.getByText('Para hacer hoy')).toHaveCount(0)
    await gotoApp(page, '/calendar')
    await clickCalendarDay(page, addDays(new Date(), 1))
    await expect(page.getByText('Riego').first()).toBeVisible()
  })

  test('a una fecha elegida con el selector, y volver a moverla conserva la fecha ORIGINAL', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '📅 Mover a otro día' }).click()
    await page.getByLabel('Nueva fecha').fill(localISO(-5))
    await page.getByRole('button', { name: 'Mover tarea' }).click()
    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.scheduled_date).toBe(localISO(-5))

    // mover otra vez desde el calendario del dia 5
    await gotoApp(page, '/calendar')
    await clickCalendarDay(page, addDays(new Date(), 5))
    await page.getByRole('button', { name: /Hecho ✓/ }).first().click()
    await page.getByRole('button', { name: '📅 Mover a otro día' }).click()
    await page.getByRole('button', { name: 'En 3 días' }).click()
    await page.getByRole('button', { name: 'Mover tarea' }).click()
    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.scheduled_date).toBe(localISO(-3))
    expect(dbTasks(context).find((t) => t.id === riego.id)!.rescheduled_from).toBe(TODAY()) // la original, no la intermedia
  })

  test('editar la planta no deshace lo cancelado ni lo movido', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '🌧️ Cancelar tarea' }).click()
    await page.getByRole('button', { name: 'Confirmar cancelación' }).click()
    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.skipped).toBe(true)

    await page.getByRole('link', { name: 'Editar' }).first().click()
    await page.getByLabel('Días de floración').fill('30') // cambia el ciclo: regenera lo pendiente
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Guardar cambios/ }).click()
    await expect(page).toHaveURL(new RegExp(`/plants/${id}$`), { timeout: 10_000 })

    const sigue = dbTasks(context).find((t) => t.id === riego.id)!
    expect(sigue.skipped).toBe(true)
    // y no reaparecio un riego "nuevo" ese mismo dia
    const hoy = dbTasks(context).filter((t) => t.plant_id === id && t.type === 'irrigation' && t.scheduled_date === TODAY() && !t.skipped)
    expect(hoy).toHaveLength(0)
  })
})

test.describe('Sin conexion', () => {
  test('cancelar sin conexion queda local y se sincroniza al volver', async ({ page, context }) => {
    const id = await setup(page, context)
    const riego = riegoDeHoy(context, id)
    await expect(page.getByRole('heading', { name: SODA.name })).toBeVisible() // chunk de la pagina ya cargado
    await setOffline(context, true)
    await openRiegoSheet(page)
    await page.getByRole('button', { name: '🌧️ Cancelar tarea' }).click()
    await page.getByRole('button', { name: 'Llovió', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar cancelación' }).click()
    await expect(page.getByTestId('skipped-tasks')).toContainText('Llovió')
    expect(dbTasks(context).find((t) => t.id === riego.id)!.skipped).toBe(false)

    await setOffline(context, false)
    await expect.poll(() => dbTasks(context).find((t) => t.id === riego.id)!.skipped, { timeout: 20_000 }).toBe(true)
    expect(dbTasks(context).find((t) => t.id === riego.id)!.skip_reason).toBe('Llovió')
  })
})
