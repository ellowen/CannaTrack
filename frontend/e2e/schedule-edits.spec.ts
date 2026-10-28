import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbTasks, dbPlants } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, localISO } from './helpers/journey'

/**
 * Que pasa con el calendario cuando se cambia algo de la planta: estirar o acortar la floracion,
 * mover la fecha de inicio, cambiar los riegos o iniciar la floracion.
 *
 * Reglas que se verifican:
 *  - lo hecho (completadas), lo cancelado y lo movido es historial: nunca se pierde ni se regenera;
 *  - lo pendiente se regenera con el plan nuevo, sin duplicados;
 *  - una sola tarea de cosecha, en la fecha estimada de la planta, y nada pendiente despues;
 *  - con la floracion iniciada el vegetativo esta cerrado: editar no lo resucita como "vencido";
 *  - en autos, estirar el total estira tambien las tareas (no quedan dias sin calendario).
 */

const BLUE = STRAIN_BY_SLUG['blue-applez'] // feminizada
const SODA = STRAIN_BY_SLUG['auto-strawberry-soda'] // autofloreciente, 75 dias

type Row = Record<string, any>
const mine = (c: BrowserContext, id: string): Row[] => dbTasks(c).filter((t) => t.plant_id === id)
const date = (t: Row) => String(t.scheduled_date)
const isHistory = (t: Row) => t.completed === true || t.skipped === true || !!t.rescheduled_from
const pending = (c: BrowserContext, id: string) => mine(c, id).filter((t) => !isHistory(t))
const harvests = (c: BrowserContext, id: string) => mine(c, id).filter((t) => t.type === 'harvest')
const overdue = (c: BrowserContext, id: string) => pending(c, id).filter((t) => date(t) < localISO(0)).length
const plantRow = (c: BrowserContext, id: string) => dbPlants(c).find((p) => p.id === id)!

function noDuplicates(c: BrowserContext, id: string) {
  const keys = mine(c, id).map((t) => `${t.cycle}|${t.week}|${t.type}|${date(t)}`)
  expect(keys.length - new Set(keys).size, 'tareas duplicadas (mismo ciclo, semana, tipo y dia)').toBe(0)
}

/** Las primeras `n` tareas pendientes de flora (por fecha): lo que ya existe y se puede dar por hecho. */
function firstFlora(c: BrowserContext, id: string, n: number) {
  const ids = new Set(pending(c, id).filter((t) => t.cycle === 'flora' && t.type !== 'harvest').sort((a, b) => date(a).localeCompare(date(b))).slice(0, n).map((t) => t.id))
  return (t: Row) => ids.has(t.id)
}

function markDone(c: BrowserContext, id: string, pred: (t: Row) => boolean) {
  const done: Row[] = []
  for (const t of mine(c, id)) if (pred(t)) { t.completed = true; t.xp_awarded = true; t.completed_at = new Date().toISOString(); done.push(t) }
  return done
}

async function edit(page: Page, id: string, f: { floraDays?: number; irrigation?: number; startDaysAgo?: number; total?: number; floraStartDay?: number }) {
  await gotoApp(page, `/plants/${id}/edit`)
  if (f.floraDays != null) await page.getByLabel('Días de floración').fill(String(f.floraDays))
  if (f.irrigation != null) await page.getByLabel('Riegos por semana').fill(String(f.irrigation))
  if (f.total != null) await page.locator('label:has-text("Días totales del ciclo") + input').fill(String(f.total))
  if (f.floraStartDay != null) await page.getByLabel('Día de inicio de floración').fill(String(f.floraStartDay))
  if (f.startDaysAgo != null) {
    await page.getByRole('button', { name: /Ir al paso 2/ }).click()
    await page.locator('label:has-text("Fecha de inicio") + input[type="date"]').fill(localISO(f.startDaysAgo))
  }
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page).toHaveURL(new RegExp(`/plants/${id}$`), { timeout: 10_000 })
  await page.waitForTimeout(900) // el guardado y el reemplazo de tareas son asincronos
}

async function setup(page: Page, context: BrowserContext) {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
}

/** Feminizada de 45 dias con la floracion iniciada hace 20 dias (la fecha se elige en el detalle). */
async function startFlora(page: Page, id: string, daysAgo: number) {
  await gotoApp(page, `/plants/${id}`)
  await page.getByRole('button', { name: /Elegir fecha/ }).click()
  await page.locator('input[type="date"]').fill(localISO(daysAgo))
  await page.getByRole('button', { name: /Confirmar floraci/ }).click()
  await page.waitForTimeout(1200)
}

test.describe('Fotoperiodica: iniciar la floracion', () => {
  test('conserva lo hecho, lo cancelado y lo movido de vegetativo, y reemplaza solo lo pendiente', async ({ page, context }) => {
    await setup(page, context)
    const id = await createPlantViaUi(page, BLUE, 45)
    const hechas = markDone(context, id, (t) => date(t) < localISO(32))
    const [cancelada, movida] = mine(context, id).filter((t) => !t.completed && date(t) >= localISO(32))
    cancelada.skipped = true; cancelada.skip_reason = 'Llovió'
    movida.rescheduled_from = date(movida); movida.scheduled_date = localISO(30)
    const historial = [...hechas, cancelada, movida].map((t) => t.id)
    const pendientesVege = pending(context, id).length
    expect(hechas.length).toBeGreaterThan(3)
    expect(pendientesVege).toBeGreaterThan(5)

    await startFlora(page, id, 20)

    const despues = mine(context, id)
    // el historial sigue intacto, con sus banderas
    for (const hid of historial) expect(despues.find((t) => t.id === hid), `historial ${hid}`).toBeDefined()
    expect(despues.filter((t) => t.completed === true && t.xp_awarded === true)).toHaveLength(hechas.length)
    expect(despues.find((t) => t.id === cancelada.id)!.skipped).toBe(true)
    expect(despues.find((t) => t.id === movida.id)!.rescheduled_from).toBeTruthy()
    // lo pendiente de vegetativo desaparece y aparece el calendario de flora
    expect(pending(context, id).filter((t) => t.cycle === 'vege')).toHaveLength(0)
    expect(pending(context, id).filter((t) => t.cycle === 'flora').length).toBeGreaterThan(10)
    // los dias de flora anteriores a hoy cuentan como cubiertos: no queda nada vencido
    expect(overdue(context, id)).toBe(0)
    expect(harvests(context, id)).toHaveLength(1)
    noDuplicates(context, id)
  })
})

test.describe('Fotoperiodica ya en floracion: editar el plan', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
  })

  test('estirar y acortar la floracion: una sola cosecha en la fecha estimada, sin vencidas nuevas', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    markDone(context, id, (t) => date(t) < localISO(32))
    await startFlora(page, id, 20)
    // en la flora ya hay lo hecho en los primeros dias
    const floraHechas = markDone(context, id, firstFlora(context, id, 4))
    await gotoApp(page, `/plants/${id}`)
    const vencidasAntes = overdue(context, id)
    const historial = mine(context, id).filter((t) => t.completed).map((t) => t.id)
    expect(floraHechas.length).toBeGreaterThan(0)

    for (const dias of [70, 35, 63]) {
      await edit(page, id, { floraDays: dias })
      const floraStart = String(plantRow(context, id).flora_start_date).slice(0, 10)
      const esperada = new Date(`${floraStart}T12:00:00`)
      esperada.setDate(esperada.getDate() + dias)
      const hs = harvests(context, id)
      expect(hs, `cosecha con ${dias} dias de flora`).toHaveLength(1)
      expect(date(hs[0])).toBe(localISO(Math.round((Date.now() - esperada.getTime()) / 86_400_000)))
      // nada pendiente despues de la cosecha
      expect(pending(context, id).filter((t) => date(t) > date(hs[0]))).toHaveLength(0)
      // lo hecho sigue, con su XP
      for (const hid of historial) expect(mine(context, id).find((t) => t.id === hid)?.completed, 'historial conservado').toBe(true)
      // el vegetativo cerrado no reaparece como vencido
      expect(pending(context, id).filter((t) => t.cycle === 'vege'), 'vegetativo resucitado').toHaveLength(0)
      expect(overdue(context, id)).toBeLessThanOrEqual(vencidasAntes)
      noDuplicates(context, id)
    }
  })

  test('mover la fecha de inicio o cambiar los riegos no resucita el vegetativo', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await startFlora(page, id, 20)
    const floraAntes = pending(context, id).filter((t) => t.cycle === 'flora' && t.type === 'irrigation').length
    const vencidasAntes = overdue(context, id) // las de flora desde hace 20 dias

    await edit(page, id, { startDaysAgo: 55 })
    expect(pending(context, id).filter((t) => t.cycle === 'vege')).toHaveLength(0)
    expect(overdue(context, id)).toBe(vencidasAntes)

    await edit(page, id, { irrigation: 4 })
    expect(pending(context, id).filter((t) => t.cycle === 'vege')).toHaveLength(0)
    expect(pending(context, id).filter((t) => t.cycle === 'flora' && t.type === 'irrigation').length).toBeGreaterThan(floraAntes)
    expect(harvests(context, id)).toHaveLength(1)
    noDuplicates(context, id)
  })
})

/** Corrige la fecha de inicio de floracion desde la tab Datos. */
async function changeFloraStart(page: Page, id: string, daysAgo: number) {
  await gotoApp(page, `/plants/${id}`)
  await page.getByRole('tab', { name: 'Datos' }).click()
  await page.getByRole('button', { name: 'Cambiar fecha' }).click()
  await page.getByLabel('Nueva fecha de inicio de floración').fill(localISO(daysAgo))
  await page.getByRole('button', { name: 'Guardar fecha' }).click()
  await expect(page.getByRole('button', { name: 'Cambiar fecha' })).toBeVisible()
  await page.waitForTimeout(900)
}

test.describe('Fotoperiodica: la floracion arranco antes o despues de lo marcado', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
  })

  test('hacia atras: lo hecho se conserva, los dias nuevos del pasado quedan cubiertos y la cosecha se corre', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await startFlora(page, id, 20)
    const hechas = markDone(context, id, firstFlora(context, id, 3))
    const vencidasAntes = overdue(context, id)
    const pendientesAntes = pending(context, id).length

    await changeFloraStart(page, id, 30) // floracion 10 dias antes

    const p = plantRow(context, id)
    expect(String(p.flora_start_date).slice(0, 10)).toBe(localISO(30))
    // cosecha = inicio + dias de floracion
    const hs = harvests(context, id)
    expect(hs).toHaveLength(1)
    const floraDays = Number(p.flora_days ?? 56)
    expect(date(hs[0])).toBe(localISO(30 - floraDays))
    // lo hecho sigue; los 10 dias nuevos (de hace 30 a hace 20) NO aparecen como pendientes vencidos
    for (const h of hechas) expect(mine(context, id).find((t) => t.id === h.id)?.completed).toBe(true)
    expect(overdue(context, id)).toBeLessThanOrEqual(vencidasAntes)
    expect(pending(context, id).filter((t) => date(t) >= localISO(30) && date(t) < localISO(20))).toHaveLength(0)
    expect(pending(context, id).filter((t) => t.cycle === 'vege')).toHaveLength(0)
    // adelantar la floracion acorta lo que queda por delante: no se suman pendientes
    expect(pending(context, id).length).toBeLessThanOrEqual(pendientesAntes)
    noDuplicates(context, id)
  })

  test('hacia adelante: desaparecen las pendientes de los dias que todavia eran vegetativo y la cosecha se corre', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await startFlora(page, id, 20)
    const hechas = markDone(context, id, firstFlora(context, id, 3))
    const antes = date(harvests(context, id)[0])

    await changeFloraStart(page, id, 10) // floracion 10 dias despues

    expect(String(plantRow(context, id).flora_start_date).slice(0, 10)).toBe(localISO(10))
    expect(date(harvests(context, id)[0]) > antes, 'la cosecha se corre hacia adelante').toBe(true)
    // nada pendiente antes del nuevo inicio de floracion
    expect(pending(context, id).filter((t) => date(t) < localISO(10))).toHaveLength(0)
    for (const h of hechas) expect(mine(context, id).find((t) => t.id === h.id)?.completed).toBe(true)
    noDuplicates(context, id)
  })

  test('no deja elegir una fecha futura ni anterior a la siembra', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await startFlora(page, id, 20)
    await gotoApp(page, `/plants/${id}`)
    await page.getByRole('tab', { name: 'Datos' }).click()
    await page.getByRole('button', { name: 'Cambiar fecha' }).click()
    const campo = page.getByLabel('Nueva fecha de inicio de floración')
    await expect(campo).toHaveAttribute('max', localISO(0))
    await expect(campo).toHaveAttribute('min', localISO(45))
  })
})

test.describe('Productos al estirar o acortar', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
  })

  const nutriciones = (c: BrowserContext, id: string, cycle: string) =>
    pending(c, id).filter((t) => t.cycle === cycle && t.type === 'nutrition')
  const conProductos = (rows: Row[]) => rows.filter((t) => (t.products ?? []).length > 0)

  test('estirar la floracion suma semanas con sus productos y la limpieza sigue al final; acortar las quita', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await startFlora(page, id, 5)
    const base = conProductos(nutriciones(context, id, 'flora')).length

    await edit(page, id, { floraDays: 84 })
    const larga = conProductos(nutriciones(context, id, 'flora')).length
    expect(larga, 'mas semanas con productos al estirar').toBeGreaterThan(base)
    const ultimaSemana = Math.max(...pending(context, id).filter((t) => t.cycle === 'flora' && t.type !== 'harvest').map((t) => Number(t.week)))
    expect(pending(context, id).filter((t) => t.cycle === 'flora' && Number(t.week) === ultimaSemana).every((t) => t.stage === 'flushing' || t.type === 'harvest')).toBe(true)

    await edit(page, id, { floraDays: 42 })
    const corta = conProductos(nutriciones(context, id, 'flora')).length
    expect(corta, 'menos semanas con productos al acortar').toBeLessThan(base)
    expect(pending(context, id).some((t) => t.cycle === 'flora' && t.stage === 'flushing')).toBe(true)
  })

  test('vegetativo: estirarlo agrega semanas, acortarlo quita las que sobran, y lo que cae en el pasado queda cubierto', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45) // sin floracion iniciada
    const vencidasAntes = overdue(context, id)
    const semanasAntes = Math.max(...pending(context, id).filter((t) => t.cycle === 'vege').map((t) => Number(t.week)))

    await gotoApp(page, `/plants/${id}/edit`)
    await page.getByLabel('Días de vegetativo').fill('70')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(new RegExp(`/plants/${id}$`), { timeout: 10_000 })
    await page.waitForTimeout(900)

    const semanasLarga = Math.max(...pending(context, id).filter((t) => t.cycle === 'vege').map((t) => Number(t.week)))
    expect(semanasLarga, 'mas semanas de vegetativo').toBeGreaterThan(semanasAntes)
    expect(conProductos(nutriciones(context, id, 'vege')).length).toBeGreaterThan(0)
    expect(overdue(context, id), 'estirar no agrega vencidas').toBeLessThanOrEqual(vencidasAntes)
    noDuplicates(context, id)

    await gotoApp(page, `/plants/${id}/edit`)
    await page.getByLabel('Días de vegetativo').fill('28')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(new RegExp(`/plants/${id}$`), { timeout: 10_000 })
    await page.waitForTimeout(900)

    const semanasCorta = Math.max(...pending(context, id).filter((t) => t.cycle === 'vege').map((t) => Number(t.week)))
    expect(semanasCorta, 'menos semanas de vegetativo').toBeLessThan(semanasLarga)
    expect(pending(context, id).filter((t) => t.cycle === 'vege' && date(t) > localISO(45 - 28))).toHaveLength(0)
    noDuplicates(context, id)
  })
})

test.describe('Autofloreciente: estirar o acortar el ciclo', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
  })

  test('subir el total mueve la cosecha y extiende las tareas hasta ahi (sin dias vacios)', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 40)
    const hechas = markDone(context, id, (t) => date(t) < localISO(25))
    await gotoApp(page, `/plants/${id}`)

    await edit(page, id, { total: 90 })

    const inicio = String(plantRow(context, id).start_date).slice(0, 10)
    const cosecha = new Date(`${inicio}T12:00:00`); cosecha.setDate(cosecha.getDate() + 90)
    const hs = harvests(context, id)
    expect(hs).toHaveLength(1)
    expect(date(hs[0])).toBe(localISO(Math.round((Date.now() - cosecha.getTime()) / 86_400_000)))
    // la floracion de una auto es total - dia de inicio: se guarda y las tareas llegan hasta la ultima semana
    expect(plantRow(context, id).flora_days).toBe(55)
    const ultima = pending(context, id).filter((t) => t.type !== 'harvest').map(date).sort().pop()!
    const dias = (a: string, b: string) => Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / 86_400_000)
    expect(dias(date(hs[0]), ultima), 'dias sin tareas antes de la cosecha').toBeLessThanOrEqual(7)
    for (const h of hechas) expect(mine(context, id).find((t) => t.id === h.id)?.xp_awarded).toBe(true)
    noDuplicates(context, id)
  })

  test('bajar el total acorta todo: la cosecha se adelanta y no queda nada pendiente despues', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 40)
    markDone(context, id, (t) => date(t) < localISO(25))
    await gotoApp(page, `/plants/${id}`)

    await edit(page, id, { total: 63 })

    const hs = harvests(context, id)
    expect(hs).toHaveLength(1)
    expect(pending(context, id).filter((t) => date(t) > date(hs[0]))).toHaveLength(0)
    expect(plantRow(context, id).flora_days).toBe(28)
    noDuplicates(context, id)
  })

  test('mover el dia de inicio de floracion con el total fijo recalcula la floracion', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 10)
    await edit(page, id, { floraStartDay: 42 })
    expect(plantRow(context, id).flora_days).toBe(33) // 75 - 42
    expect(harvests(context, id)).toHaveLength(1)
    noDuplicates(context, id)
  })

  test('no deja un total que no alcance para florecer (menos de 28 dias de floracion)', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 10)
    await gotoApp(page, `/plants/${id}/edit`)
    await page.locator('label:has-text("Días totales del ciclo") + input').fill('60')
    await page.getByLabel('Día de inicio de floración').fill('50')
    await expect(page.getByText(/al menos 28 días de floración/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })
})

test.describe('Cualquier plan', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
  })

  test('guardar sin cambios no toca ninguna tarea', async ({ page, context }) => {
    const id = await createPlantViaUi(page, BLUE, 45)
    await startFlora(page, id, 20)
    const antes = mine(context, id).map((t) => t.id).sort().join(',')
    await edit(page, id, {})
    expect(mine(context, id).map((t) => t.id).sort().join(',')).toBe(antes)
  })

  test('editar dos veces seguidas y volver al valor original deja el mismo calendario', async ({ page, context }) => {
    const id = await createPlantViaUi(page, SODA, 20)
    const inicial = mine(context, id).map((t) => `${t.cycle}|${t.week}|${t.type}|${date(t)}`).sort()
    await edit(page, id, { total: 90 })
    await edit(page, id, { total: 75 })
    expect(mine(context, id).map((t) => `${t.cycle}|${t.week}|${t.type}|${date(t)}`).sort()).toEqual(inicial)
  })
})
