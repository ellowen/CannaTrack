import { test, expect } from '@playwright/test'
import { plantTab } from './helpers/journey'
import { seedApp, blockSupabase, gotoApp, getXpAwardedCalls } from './helpers/seed'
import { installFakeBackend } from './helpers/fakeBackend'

test.beforeEach(async ({ context }) => {
  await blockSupabase(context)
  // sin el backend simulado, las tablas no mockeadas (mediciones, diario) responden 503 y la app
  // reintenta ~8 s en cada navegacion: el archivo entero se volvia lento y propenso a timeouts
  await installFakeBackend(context)
})

test.describe('Home', () => {
  test('estado vacio invita a crear la primera planta', async ({ page, context }) => {
    await seedApp(page, context, { plants: [] })
    await gotoApp(page, '/')
    await expect(page.getByText(/primera planta/i).first()).toBeVisible()
  })

  test('con plantas muestra saludo, racha y tareas del dia', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ name: 'Gelato' }], tasksToday: true })
    await gotoApp(page, '/')
    await expect(page.getByText(/Tester/)).toBeVisible()
    await expect(page.getByText('Gelato').first()).toBeVisible()
  })

  test('navegacion inferior: 5 tabs y navegan', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ name: 'Gelato' }] })
    await gotoApp(page, '/')
    for (const tab of ['Calendario', 'Plantas', 'Perfil', 'Inicio']) {
      await page.getByRole('link', { name: new RegExp(`^${tab}$`, 'i') }).click()
      await expect(page.getByRole('link', { name: new RegExp(`^${tab}$`, 'i') })).toBeVisible()
    }
  })
})

test.describe('Detalle de planta: badges y features', () => {
  test('indoor + hidro en vege: 18/6, Hidro y callout de reservorio', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1', location: 'indoor', growMedium: 'hydro' }] })
    await gotoApp(page, '/plants/p1')
    await plantTab(page, 'Datos')
    await expect(page.getByText('18/6')).toBeVisible()
    await expect(page.getByText('Hidro')).toBeVisible()
    await expect(page.getByText(/reservorio/i)).toBeVisible()
  })

  test('indoor en flora: badge 12/12', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p2', location: 'indoor', growMedium: 'coco', daysAgo: 70, floraDaysAgo: 10 }] })
    await gotoApp(page, '/plants/p2')
    await plantTab(page, 'Datos')
    await expect(page.getByText('12/12')).toBeVisible()
    await expect(page.getByText('Coco')).toBeVisible()
  })

  test('outdoor + tierra: sin badges de fotoperiodo ni sustrato', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p3', location: 'outdoor', growMedium: 'soil' }] })
    await gotoApp(page, '/plants/p3')
    await expect(page.getByText('Outdoor')).toBeVisible()
    await expect(page.getByText('18/6')).not.toBeVisible()
    await expect(page.getByText('Hidro')).not.toBeVisible()
  })
})

test.describe('Tareas: completar, XP y deshacer', () => {
  test('completar tarea muestra overlay de XP y no duplica al rehacer', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')

    // Completar la tarea de nutricion de hoy
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).toBeVisible()

    // La RPC que otorga XP real en la DB (handle_task_completion) debe
    // haberse llamado exactamente una vez -- no alcanza con el overlay
    // visual, que es un sistema de XP client-only separado (ver auditoria).
    await expect.poll(() => getXpAwardedCalls(context).length).toBe(1)

    // Esperar que cierre el overlay y deshacer
    await expect(page.getByText(/\+\d+ XP/)).not.toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /Deshacer/i }).first().click()

    // Re-completar: NO debe volver a mostrar XP ni volver a llamar la RPC
    // (exploit de farmear XP completando/deshaciendo cerrado)
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.getByText(/\+\d+ XP/)).not.toBeVisible()
    await page.waitForTimeout(300)
    expect(getXpAwardedCalls(context).length).toBe(1)
  })

  test('Ahora no cierra el sheet sin completar la tarea', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    await page.getByRole('button', { name: /Marcar como completada/i }).first().click()
    await page.getByRole('button', { name: /^Ahora no$/i }).click()
    // El boton de completar sigue ahi: la tarea NO se completo
    await expect(page.getByRole('button', { name: /Marcar como completada/i }).first()).toBeVisible()
  })
})

test.describe('Gates del plan Free vs Pro', () => {
  test('free: NutritionCard muestra 1 producto + lock Pro', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'free', plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    await expect(page.getByText(/\+\d+ producto.*Plan Pro/)).toBeVisible()
  })

  test('pro: NutritionCard muestra todos los productos sin lock', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'pro', plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    await expect(page.getByText(/\+\d+ producto.*Plan Pro/)).not.toBeVisible()
    await expect(page.getByText('Rootproof')).toBeVisible()
    await expect(page.getByText('Growth')).toBeVisible()
  })

  test('free: subir fotos bloqueado en el diario', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'free', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/plants/p1')
    await plantTab(page, 'Diario')
    await page.getByRole('button', { name: /Nueva entrada/ }).click()
    await expect(page.getByText(/Fotos — Plan Pro/).first()).toBeVisible()
    expect(await page.locator('input[type="file"]').count()).toBe(0)
  })

  test('pro: subir fotos disponible', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'pro', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/plants/p1')
    await plantTab(page, 'Diario')
    await page.getByRole('button', { name: /Nueva entrada/ }).click()
    await expect(page.getByRole('button', { name: 'Agregar foto' })).toBeVisible()
    await expect(page.getByText(/Fotos — Plan Pro/)).toHaveCount(0)
  })

  test('free con 1 planta activa: crear otra muestra el limite', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'free', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/plants/new')
    await expect(page.getByText(/Limite del plan Free/i)).toBeVisible()
  })
})

test.describe('Settings', () => {
  test('cambiar idioma ES→EN traduce en vivo', async ({ page, context }) => {
    await seedApp(page, context, { language: 'es' })
    await gotoApp(page, '/settings')
    await expect(page.getByText('Idioma')).toBeVisible()
    await page.getByRole('button', { name: /English/i }).click()
    await expect(page.getByText('Language')).toBeVisible()
    await page.getByRole('button', { name: /Espanol/i }).click()
    await expect(page.getByText('Idioma')).toBeVisible()
  })

  test('cambiar tema Claro aplica la clase al documento', async ({ page, context }) => {
    await seedApp(page, context, { theme: 'dark' })
    await gotoApp(page, '/settings')
    await page.getByRole('button', { name: /Claro/i }).click()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(false)
    await page.getByRole('button', { name: /Oscuro/i }).click()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(true)
  })

  test('free: crear tabla custom bloqueado con lock Pro', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'free' })
    await gotoApp(page, '/settings')
    await expect(page.getByText(/🔒 Pro/)).toBeVisible()
  })
})

test.describe('Crear planta (formulario completo)', () => {
  test('flujo entero: identidad → setup hidro → nutricion → detalle', async ({ page, context }) => {
    await seedApp(page, context, { plan: 'pro', plants: [] })
    await gotoApp(page, '/plants/new')

    // Paso 1: identidad (nombre + genetica son requeridos)
    await page.getByPlaceholder(/White Widow #1/).fill('Mi Planta E2E')
    await page.getByPlaceholder(/^Ej: White Widow$/).fill('Northern Lights')
    await page.getByRole('button', { name: /Continuar/i }).click()

    // Paso 2: setup — indoor + hidro
    await page.getByRole('button', { name: /Indoor/i }).first().click()
    await page.getByRole('button', { name: /Hidro/i }).first().click()
    await page.getByRole('button', { name: /Continuar/i }).click()

    // Paso 3: nutricion (defaults) → crear
    await page.getByRole('button', { name: /Crear planta/i }).click()

    // Detalle: nombre + badges de la config elegida
    await expect(page.getByText('Mi Planta E2E')).toBeVisible({ timeout: 10_000 })
    await plantTab(page, 'Datos')
    await expect(page.getByText('Hidro')).toBeVisible()
    await expect(page.getByText('18/6')).toBeVisible()
  })
})

test.describe('CRUD completo de plantas (update / lifecycle)', () => {
  test('editar planta: cambiar nombre y sustrato persiste en el detalle', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1', name: 'Nombre Original', growMedium: 'soil' }] })
    await gotoApp(page, '/plants/p1')
    await page.getByRole('link', { name: 'Editar' }).first().click()
    await expect(page).toHaveURL(/\/plants\/p1\/edit/)

    // Paso 1: cambiar el nombre (el campo viene pre-cargado)
    await page.getByPlaceholder(/White Widow #1/).fill('Nombre Editado E2E')
    await page.getByRole('button', { name: /Continuar/i }).click()

    // Paso 2: cambiar sustrato a hidro
    await page.getByRole('button', { name: /Hidro/i }).first().click()
    await page.getByRole('button', { name: /Continuar/i }).click()

    // Paso 3: guardar
    await page.getByRole('button', { name: /Guardar cambios/i }).click()

    // Verificar que persistio en el detalle
    await expect(page.getByText('Nombre Editado E2E')).toBeVisible({ timeout: 10_000 })
    await plantTab(page, 'Datos')
    await expect(page.getByText('Hidro')).toBeVisible()
    await expect(page.getByText('Nombre Original')).not.toBeVisible()
  })

  test('cosechar planta: confirma y la saca de la lista de plantas activas', async ({ page, context }) => {
    // floraStartDate seteado para que el boton "Cosechar" (no "Finalizar cultivo") este disponible
    await seedApp(page, context, { plants: [{ id: 'p1', name: 'Para Cosechar', daysAgo: 70, floraDaysAgo: 20 }] })
    await gotoApp(page, '/plants/p1')
    // Boton "Zona de peligro": icono + label + hint son 3 spans dentro del
    // mismo <button>, el nombre accesible concatena los 3 (no es "Cosechar"
    // exacto) — por eso el match es sin anclar, igual que el de Descartar.
    await plantTab(page, 'Datos')
    await page.getByRole('button', { name: /Cosechar/i }).click()
    await page.getByRole('button', { name: /Confirmar cosecha/i }).click()
    // El flujo navega a Home
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    // La planta ya no aparece en la lista de activas de Home
    await expect(page.getByText('Para Cosechar')).not.toBeVisible()
  })

  test('descartar planta: confirma el dialogo nativo y la saca de la lista', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1', name: 'Para Descartar' }] })
    await gotoApp(page, '/plants/p1')
    await plantTab(page, 'Datos')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Descartar/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    await expect(page.getByText('Para Descartar')).not.toBeVisible()
  })
})

test.describe('Perfil local (sin backend)', () => {
  test('guardar nombre y volumen de maceta en Settings persiste tras recargar', async ({ page, context }) => {
    await seedApp(page, context)
    await gotoApp(page, '/settings')

    const nameField = page.locator('input[type="text"]').last()
    await nameField.fill('Cultivador E2E')
    const volumeField = page.locator('input[type="number"]').first()
    await volumeField.fill('19')
    await page.getByRole('button', { name: /Guardar cambios/i }).last().click()

    // La escritura debe quedar en el store persistido (localStorage) de
    // inmediato. Nota: no se navega de nuevo con gotoApp() aca a proposito
    // — el addInitScript de seedApp() se re-ejecuta en CADA navegacion de
    // esta misma page (comportamiento de Playwright, no del browser real) y
    // volveria a sembrar el volumen de maceta original, dando un falso
    // negativo para un dato que es local-only (no sincroniza con el backend).
    // el guardado es asincrono (actualiza el perfil en el servidor): se espera la confirmacion antes de leer el storage
    await expect(page.getByText('✓ Guardado')).toBeVisible()
    await expect(page.locator('input[type="number"]').first()).toHaveValue('19')
    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('cultitrack-user')
      return raw ? JSON.parse(raw).state : null
    })
    expect(persisted?.name).toBe('Cultivador E2E')
    expect(persisted?.potVolumeLiters).toBe(19)

    // El nombre si sincroniza con el backend (profiles.username) — confirmar
    // que sobrevive a una navegacion real, no solo que quedo en localStorage.
    await gotoApp(page, '/settings')
    await expect(page.locator('input[type="text"]').last()).toHaveValue('Cultivador E2E')
  })
})
