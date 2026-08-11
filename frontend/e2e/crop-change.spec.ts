import { test, expect } from '@playwright/test'
import { seedApp, blockSupabase, gotoApp } from './helpers/seed'

/**
 * Cambio de tipo de cultivo (Cannabis <-> Tomate) sobre una planta existente.
 *
 * usePlants.editPlant() solo regenera el cronograma si cambia un campo que
 * realmente lo afecta (geneticType/sex/startDate/nutritionTableId/
 * autoFlowerTotalDays/availableProducts/customProducts) -- cropType por si
 * solo NO esta en esa lista, asi que cambiar SOLO el cultivo no debe tocar
 * ninguna tarea existente (ni completadas ni pendientes): es el
 * comportamiento conservador correcto (nunca borrar historial sin que el
 * usuario lo pida), y es exactamente lo que estas pruebas verifican.
 */

test.beforeEach(async ({ context }) => {
  await blockSupabase(context)
})

test('Cannabis -> Tomate: la tarea completada se conserva, ninguna se duplica ni queda huerfana', async ({ page, context }) => {
  // seedApp() no soporta override de "genetics" -- siempre siembra
  // "Northern Lights" (ver SeedPlantOptions en helpers/seed.ts).
  await seedApp(page, context, { plants: [{ id: 'p1', name: 'Cambio Test' }], tasksToday: true })
  await gotoApp(page, '/plants/p1')

  // Completar una tarea antes de cambiar el cultivo -- es el historial que
  // no debe perderse ni duplicarse.
  await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
  await page.getByRole('button', { name: /Confirmar/i }).click()
  await expect(page.getByText(/\+\d+ XP/)).not.toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('✅ Completada')).toBeVisible({ timeout: 5_000 })

  const pendingCountBefore = await page.getByRole('button', { name: /Marcar como completada/i }).count()

  await page.getByRole('link', { name: 'Editar' }).first().click()
  await page.getByRole('button', { name: /^Tomate$/i }).click()
  // Sin campos cannabis-only (geneticType/sex) en este paso.
  await expect(page.getByRole('button', { name: /Autofloreciente/i })).not.toBeVisible()
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Guardar cambios/i }).click()
  await expect(page).toHaveURL(/\/plants\/p1$/, { timeout: 10_000 })

  // Refresh real: fuerza a recargar plantas/tareas desde el mock REST, igual
  // que pasaria contra Supabase real -- sin esto un bug de persistencia
  // pasaria desapercibido detras del estado local optimista.
  await gotoApp(page, '/plants/p1')

  // La tarea completada sigue completada, exactamente una vez.
  await expect(page.getByText('✅ Completada')).toBeVisible({ timeout: 10_000 })
  expect(await page.getByText('✅ Completada').count()).toBe(1)

  // Las pendientes no se duplicaron ni se regeneraron de mas.
  const pendingCountAfter = await page.getByRole('button', { name: /Marcar como completada/i }).count()
  expect(pendingCountAfter).toBe(pendingCountBefore)

  // La UI ya muestra el cultivo nuevo: la genetica original persiste como
  // "variedad" (el dato no se pierde al cambiar de cultivo).
  await expect(page.getByText('Northern Lights')).toBeVisible()
})

test('Cannabis -> Tomate: fecha de inicio no cambia, Cosechar y Salud quedan visibles (sin ciclo vege/flora)', async ({ page, context }) => {
  await seedApp(page, context, { plants: [{ id: 'p1', name: 'Fecha Cultivo Test', daysAgo: 15 }] })
  await gotoApp(page, '/plants/p1')

  await page.getByRole('link', { name: 'Editar' }).first().click()
  // La fecha vive en el paso 2 (Setup); el selector de cultivo esta en el
  // paso 1 -- se lee la fecha ANTES de tocar el cultivo, se vuelve al paso
  // 1 para cambiar a Tomate, y se confirma que la fecha sigue igual.
  await page.getByRole('button', { name: /Continuar/i }).click()
  const startDateInput = page.locator('input[type="date"]')
  const startDateBefore = await startDateInput.inputValue()
  await page.getByRole('button', { name: /Volver/i }).click()

  await page.getByRole('button', { name: /^Tomate$/i }).click()
  await page.getByRole('button', { name: /Continuar/i }).click()
  // La fecha de inicio no se toca solo por cambiar de cultivo.
  await expect(startDateInput).toHaveValue(startDateBefore)
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Guardar cambios/i }).click()
  await expect(page).toHaveURL(/\/plants\/p1$/, { timeout: 10_000 })

  await gotoApp(page, '/plants/p1')

  // Sin floraStartDate (nunca tuvo fase de flora), un cultivo no-cannabis
  // igual debe poder cosecharse y mostrar su salud -- regresion del bug
  // donde isCannabisPlant() se chequeaba inconsistentemente en PlantDetail.
  await expect(page.getByRole('button', { name: /Cosechar/i })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Salud')).toBeVisible()
  // Sin badge de fotoperiodo (18/6, 12/12): eso es exclusivo de cannabis indoor.
  await expect(page.getByText('18/6')).not.toBeVisible()
  await expect(page.getByText('12/12')).not.toBeVisible()
})

test('Tomate -> Cannabis: no arrastra un genetica cannabis inventada, pide datos cannabis-only de nuevo', async ({ page, context }) => {
  await seedApp(page, context, {
    plants: [{ id: 'p1', name: 'Vuelta Test' }],
  })
  // Sembrado como cannabis por defecto (ver seed.ts) -- primero lo pasamos
  // a Tomate para despues probar el camino de vuelta a Cannabis.
  await gotoApp(page, '/plants/p1')
  await page.getByRole('link', { name: 'Editar' }).first().click()
  await page.getByRole('button', { name: /^Tomate$/i }).click()
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Guardar cambios/i }).click()
  await expect(page).toHaveURL(/\/plants\/p1$/, { timeout: 10_000 })

  // Ahora volver a Cannabis.
  await page.getByRole('link', { name: 'Editar' }).first().click()
  await page.getByRole('button', { name: /^Cannabis$/i }).click()
  // Los campos cannabis-only vuelven a aparecer para que el usuario elija
  // (no se manda un geneticType inventado sin que el usuario lo confirme).
  await expect(page.getByRole('button', { name: /^Regular$/i })).toBeVisible()
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Continuar/i }).click()
  await page.getByRole('button', { name: /Guardar cambios/i }).click()
  await expect(page).toHaveURL(/\/plants\/p1$/, { timeout: 10_000 })

  await gotoApp(page, '/plants/p1')
  // De vuelta a cannabis: el badge de fotoperiodo cannabis-only reaparece
  // (planta indoor por defecto en el seed). Locator especifico al badge
  // (no al texto de ayuda "Cambia a ciclo 12/12..." del CTA de floracion).
  await expect(page.getByText('☀️ 18/6', { exact: true })).toBeVisible({ timeout: 10_000 })
})
