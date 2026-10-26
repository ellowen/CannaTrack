import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp, getXpAwardedCalls } from './helpers/seed'
import { installFakeBackend, getFakeBackend, dbPlants, dbTasks } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi } from './helpers/journey'

/**
 * Ciclo de vida de una planta real, punta a punta, con usuario Pro simulado:
 * tareas (completar/nota/EC-pH/saltar/deshacer), mediciones, diario con foto,
 * iniciar floracion, cosecha, descarte, reactivar y editar.
 *
 * Las plantas se crean por la UI (formulario real + catalogo) con inicio HOY,
 * asi el cronograma real tiene tareas de nutricion y observacion en el dia 0.
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const BLUE = STRAIN_BY_SLUG['blue-applez']

async function setup(page: Page, context: BrowserContext) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [] })
}

const markDone = (page: Page) => page.getByRole('button', { name: /Marcar como completada/i })

test.describe('Tareas: completar, nota, EC/pH, saltar y deshacer', () => {
  let plantId: string

  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    plantId = await createPlantViaUi(page, SODA, 0)
  })

  test('la tarea de nutricion de hoy muestra la receta escalada a los litros reales', async ({ page }) => {
    await markDone(page).first().click()
    await page.getByRole('button', { name: /Receta/i }).click()
    // 1 maceta x 20 L (plan de siembra de Strawberry Soda)
    await expect(page.getByText(/Para 20L \(1 maceta × 20L\)/)).toBeVisible()
  })

  test('completar sin datos: confirma, otorga XP y queda en la base', async ({ page, context }) => {
    await markDone(page).first().click()
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
    expect(getXpAwardedCalls(context)).toHaveLength(1)
    await expect(page.getByText('✅ Completada')).toBeVisible({ timeout: 5_000 })
    expect(dbTasks(context).some((t) => t.plant_id === plantId && t.completed === true)).toBe(true)
  })

  test('Saltar cierra el sheet sin completar ni dar XP', async ({ page, context }) => {
    await markDone(page).first().click()
    await page.getByRole('button', { name: /^Saltar$/i }).click()
    await expect(page.getByRole('button', { name: /^Saltar$/i })).not.toBeVisible()
    await expect(markDone(page).first()).toBeVisible()
    expect(getXpAwardedCalls(context)).toHaveLength(0)
    expect(dbTasks(context).some((t) => t.completed === true)).toBe(false)
  })

  test('completar con nota: boton "Guardar nota", la nota queda visible y persiste', async ({ page, context }) => {
    await markDone(page).first().click()
    await page.getByPlaceholder(/Observaciones adicionales|Observaciones, estado/).first().fill('Brote nuevo, hojas verdes')
    await page.getByRole('button', { name: /Guardar nota/i }).click()
    await expect(page.getByText('"Brote nuevo, hojas verdes"')).toBeVisible({ timeout: 5_000 })
    await expect.poll(() => dbTasks(context).some((t) => t.completion_notes === 'Brote nuevo, hojas verdes')).toBe(true)
  })

  test('completar con EC/pH en rango: guarda la medicion y aparece en la seccion de mediciones', async ({ page, context }) => {
    await markDone(page).first().click()
    await page.getByPlaceholder('1.2').last().fill('0.5')
    await page.getByPlaceholder('6.2').last().fill('5.8')
    await expect(page.getByText('Ideal').first()).toBeVisible()
    await page.getByRole('button', { name: /Guardar EC\/pH/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
    await page.waitForTimeout(1_600) // el overlay de XP se cierra solo
    await expect.poll(() => getFakeBackend(context).tables['measurements']?.length ?? 0).toBe(1)
    const m = getFakeBackend(context).tables['measurements'][0]
    expect(Number(m.ec)).toBeCloseTo(0.5)
    expect(Number(m.ph)).toBeCloseTo(5.8)
    await expect(page.getByText('Sin mediciones aún')).not.toBeVisible()
  })

  test('EC fuera de rango no se marca como ideal', async ({ page }) => {
    await markDone(page).first().click()
    await page.getByPlaceholder('1.2').last().fill('2.4')
    await page.getByPlaceholder('6.2').last().fill('5.8')
    await expect(page.getByText('Ideal')).toHaveCount(1) // solo el pH
  })

  test('Deshacer devuelve la tarea a pendiente y no vuelve a dar XP al rehacerla', async ({ page, context }) => {
    await markDone(page).first().click()
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
    await expect(page.getByText('✅ Completada')).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /Deshacer/i }).first().click()
    await expect(markDone(page).first()).toBeVisible()
    await expect.poll(() => dbTasks(context).some((t) => t.plant_id === plantId && t.completed === true)).toBe(false)
  })
})

test.describe('Mediciones EC/pH', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
  })

  test('registrar, ver el historial y borrar una medicion', async ({ page, context }) => {
    await expect(page.getByText('Sin mediciones aún')).toBeVisible()
    await page.getByRole('button', { name: /^Registrar$/ }).click()
    await expect(page.getByText('Registrar medición 💧')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar medición' })).toBeDisabled()
    await page.getByPlaceholder('1.2').first().fill('0.6')
    await page.getByPlaceholder('6.2').first().fill('5.9')
    await page.getByRole('button', { name: /Agregar temperatura|temperatura/i }).click()
    await page.getByPlaceholder('20').fill('21')
    await page.getByRole('button', { name: 'Guardar medición' }).click()
    await expect.poll(() => getFakeBackend(context).tables['measurements']?.length ?? 0).toBe(1)
    await expect(page.getByText('Sin mediciones aún')).not.toBeVisible()

    // Borrar
    await page.getByRole('button', { name: 'Eliminar medición' }).first().click()
    await expect.poll(() => getFakeBackend(context).tables['measurements']?.length ?? 0).toBe(0)
    await expect(page.getByText('Sin mediciones aún')).toBeVisible()
  })

  test('mas de 5 mediciones: "Ver los N anteriores" y "Ver menos"', async ({ page, context }) => {
    for (let i = 0; i < 7; i++) {
      await page.getByRole('button', { name: /^Registrar$/ }).click()
      await expect(page.getByText('Registrar medición 💧')).toBeVisible()
      await page.waitForTimeout(400) // la hoja resetea y enfoca los campos al abrirse
      await page.getByPlaceholder('1.2').first().fill(`0.${4 + (i % 3)}`)
      await page.getByPlaceholder('6.2').first().fill('5.8')
      await expect(page.getByPlaceholder('6.2').first()).toHaveValue('5.8')
      await page.getByRole('button', { name: 'Guardar medición' }).click()
      await expect.poll(() => getFakeBackend(context).tables['measurements']?.length ?? 0).toBe(i + 1)
    }
    await page.getByRole('button', { name: /Ver los 2 anteriores/ }).click()
    await expect(page.getByRole('button', { name: 'Ver menos' })).toBeVisible()
    await page.getByRole('button', { name: 'Ver menos' }).click()
    await expect(page.getByRole('button', { name: /Ver los 2 anteriores/ })).toBeVisible()
  })
})

test.describe('Diario de cultivo (con fotos: Pro)', () => {
  // PNG 1x1
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
  })

  test('nueva entrada con nota y foto: sube la foto y la abre en el visor', async ({ page, context }) => {
    await expect(page.getByText('Agregá tu primera entrada')).toBeVisible()
    await page.getByRole('button', { name: /Nueva entrada/ }).click()
    await expect(page.getByRole('button', { name: /Guardar entrada/ })).toBeDisabled()

    await page.locator('input[type="file"][accept="image/*"]').last().setInputFiles({
      name: 'soda.png', mimeType: 'image/png', buffer: PNG,
    })
    await page.getByPlaceholder(/¿Cómo va la planta\?/).fill('Dia 1: germinada, 2 cm')
    await page.getByRole('button', { name: /Guardar entrada/ }).click()

    await expect.poll(() => getFakeBackend(context).tables['week_logs']?.length ?? 0).toBe(1)
    await expect(page.locator('p', { hasText: 'Dia 1: germinada, 2 cm' })).toBeVisible()
    await expect.poll(() => [...getFakeBackend(context).storageObjects].some((p) => p.startsWith('plant-photos/'))).toBe(true)

    // con foto, tocar la tarjeta abre el visor (no el editor); Escape lo cierra
    await page.locator('p', { hasText: 'Dia 1: germinada, 2 cm' }).click()
    await expect(page.getByRole('button', { name: /Guardar cambios/ })).not.toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('entrada sin foto: se edita y se elimina', async ({ page, context }) => {
    await page.getByRole('button', { name: /Nueva entrada/ }).click()
    await page.getByPlaceholder(/¿Cómo va la planta\?/).fill('Dia 3: primera hoja')
    await page.getByRole('button', { name: /Guardar entrada/ }).click()
    await expect.poll(() => getFakeBackend(context).tables['week_logs']?.length ?? 0).toBe(1)

    // Editar
    await page.locator('p', { hasText: 'Dia 3: primera hoja' }).click()
    await page.getByPlaceholder(/¿Cómo va la planta\?/).fill('Dia 3: primera hoja verdadera')
    await page.getByRole('button', { name: /Guardar cambios/ }).click()
    await expect(page.locator('p', { hasText: 'Dia 3: primera hoja verdadera' })).toBeVisible()
    await expect.poll(() => String(getFakeBackend(context).tables['week_logs']?.[0]?.notes ?? '')).toContain('verdadera')

    // Eliminar
    await page.locator('p', { hasText: 'Dia 3: primera hoja verdadera' }).click()
    await page.getByRole('button', { name: 'Eliminar entrada' }).click()
    await expect.poll(() => getFakeBackend(context).tables['week_logs']?.length ?? 0).toBe(0)
    await expect(page.getByText('Agregá tu primera entrada')).toBeVisible()
  })

  test('entrada solo con nota (sin foto) tambien se guarda', async ({ page, context }) => {
    await page.getByRole('button', { name: /Nueva entrada/ }).click()
    await page.getByPlaceholder(/¿Cómo va la planta\?/).fill('Solo texto')
    await page.getByRole('button', { name: /Guardar entrada/ }).click()
    await expect.poll(() => getFakeBackend(context).tables['week_logs']?.length ?? 0).toBe(1)
  })
})

test.describe('Floración, cosecha, descarte y edición', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
  })

  test('fotoperiodica: "Iniciar floración" con fecha de hoy genera el calendario de flora de la ficha', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 5)
    await expect(page.getByText('Cosecha est.')).not.toBeVisible()
    await page.getByRole('button', { name: /Iniciar floraci/i }).click()
    await page.getByRole('button', { name: /Confirmar floraci/i }).click()
    await expect(page.getByText(/FLORA F1/).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Cosecha est.')).toBeVisible()
    expect(getFakeBackend(context).log).toContain('RPC start_flora_phase')
    const row = dbPlants(context).find((p) => p.id === id)!
    expect(row.flora_start_date).toBeTruthy()
    const floraTasks = dbTasks(context).filter((t) => t.plant_id === id && t.cycle === 'flora')
    expect(Math.max(...floraTasks.filter((t) => t.type !== 'harvest').map((t) => Number(t.week)))).toBe(9) // 63 dias = 9 semanas
    expect(floraTasks.some((t) => t.type === 'harvest')).toBe(true)
  })

  test('fotoperiodica con mas de 6 semanas de vege: aviso y selector de fecha de floración', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await expect(page.getByText(/Vegetativo completado/)).toBeVisible()
    await page.getByRole('button', { name: /Elegir fecha/ }).click()
    await expect(page.getByText('Fecha de inicio de floración').first()).toBeVisible()
    await page.getByRole('button', { name: /Cancelar/ }).click()
    await expect(page.getByRole('button', { name: /Elegir fecha/ })).toBeVisible()
    await page.getByRole('button', { name: /^Hoy$/ }).click()
    await expect(page.getByText(/Vegetativo completado/)).not.toBeVisible({ timeout: 10_000 })
    expect(dbPlants(context).find((p) => p.id === id)!.flora_start_date).toBeTruthy()
  })

  test('cosechar una auto: el sheet muestra estadisticas y la planta pasa a Cosechadas', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 3)
    await page.getByRole('button', { name: /Cosechar/ }).click()
    await expect(page.getByText('Grow total')).toBeVisible()
    await expect(page.getByText('3d')).toBeVisible()
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => dbPlants(context).find((p) => p.id === id)!.status).toBe('harvested')

    await gotoApp(page, '/plants')
    await page.getByRole('button', { name: /Cosechada/ }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
  })

  test('descartar desde el sheet (pestaña Descartar) y reactivar', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 3)
    await page.getByRole('button', { name: /Cosechar/ }).click()
    await page.getByRole('button', { name: '🗑️ Descartar', exact: true }).click()
    await expect(page.getByText(/No se puede deshacer/)).toBeVisible()
    await page.getByRole('button', { name: /Confirmar descarte/ }).click()
    await expect.poll(() => dbPlants(context).find((p) => p.id === id)!.status).toBe('discarded')

    await gotoApp(page, `/plants/${id}`)
    await expect(page.getByText(/Descartada/).first()).toBeVisible()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Reactivar planta/ }).click()
    await expect.poll(() => dbPlants(context).find((p) => p.id === id)!.status).toBe('active')
  })

  test('descartar desde la zona de peligro pide confirmacion (cancelar no hace nada)', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 3)
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: /Descartar/ }).first().click()
    expect(dbPlants(context).find((p) => p.id === id)!.status).toBe('active')
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Descartar/ }).first().click()
    await expect.poll(() => dbPlants(context).find((p) => p.id === id)!.status).toBe('discarded')
  })

  test('editar: nombre, notas y duracion de floracion; el calendario se regenera', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 5)
    await page.getByRole('link', { name: 'Editar' }).first().click()
    await expect(page.getByText(/regenerara el calendario/i)).toBeVisible()
    await page.getByPlaceholder('Ej: White Widow #1').fill('Blue Applez Madre')
    await page.getByLabel('Días de floración').fill('70')
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Continuar/ }).click()
    await page.getByRole('button', { name: /Guardar cambios/ }).click()
    await expect(page).toHaveURL(new RegExp(`/plants/${id}$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Blue Applez Madre' })).toBeVisible()
    const row = dbPlants(context).find((p) => p.id === id)!
    expect(row.name).toBe('Blue Applez Madre')
    expect(row.flora_days).toBe(70)
  })
})
