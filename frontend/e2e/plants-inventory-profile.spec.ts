import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants } from './helpers/fakeBackend'
import { STRAINS, STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi } from './helpers/journey'

/**
 * Listado de plantas (filtros y busqueda), Inventario (historial), Perfil
 * (estadisticas, logros, cuenta), Fotos (galeria por planta) y limites del
 * plan Free, con las 6 variedades reales.
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const BLUE = STRAIN_BY_SLUG['blue-applez']

async function setup(page: Page, context: BrowserContext, plan: 'pro' | 'free' = 'pro') {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan, plants: [] })
}

async function createAll(page: Page) {
  for (const s of STRAINS) await createPlantViaUi(page, s, s.plant.geneticType === 'autoflower' ? 10 : 20)
}

test.describe('Listado de plantas: filtros y busqueda', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createAll(page)
    await gotoApp(page, '/plants')
  })

  test('las 6 plantas y los contadores de cada filtro', async ({ page }) => {
    for (const s of STRAINS) await expect(page.getByText(s.name, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Todas\s*6$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Vege\s*6$/ })).toBeVisible()
  })

  test('filtro Flora: vacio hasta iniciar floracion; despues muestra solo esa planta', async ({ page, context }) => {
    await page.getByRole('button', { name: /^Flora/ }).click()
    await expect(page.getByText(/No hay plantas en flora todavia/)).toBeVisible()

    const blue = dbPlants(context).find((p) => p.name === BLUE.name)!
    await gotoApp(page, `/plants/${blue.id}`)
    await page.getByRole('button', { name: /Iniciar floraci/i }).click()
    await page.getByRole('button', { name: /Confirmar floraci/i }).click()
    await expect(page.getByText(/FLORA F1/).first()).toBeVisible({ timeout: 10_000 })

    await gotoApp(page, '/plants')
    await page.getByRole('button', { name: /^Flora/ }).click()
    await expect(page.getByText(BLUE.name, { exact: true })).toBeVisible()
    await expect(page.getByText(SODA.name, { exact: true })).not.toBeVisible()
    await page.getByRole('button', { name: /^Vege/ }).click()
    await expect(page.getByText(BLUE.name, { exact: true })).not.toBeVisible()
  })

  test('busqueda por nombre, por genetica, sin resultados y limpiar', async ({ page }) => {
    const box = page.getByPlaceholder('Buscar por nombre o genetica...')
    await box.fill('Therian')
    await expect(page.getByText('Therian Auto', { exact: true })).toBeVisible()
    await expect(page.getByText(SODA.name, { exact: true })).not.toBeVisible()

    await box.fill('Citric Latte') // genetica de Citric Lime Pie
    await expect(page.getByText('Citric Lime Pie', { exact: true })).toBeVisible()
    await expect(page.getByText('Therian Auto', { exact: true })).not.toBeVisible()

    await box.fill('zzz-no-existe')
    await expect(page.getByText('Sin resultados')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
  })

  test('dias para cosecha del listado coinciden con el detalle', async ({ page }) => {
    // las 6 plantas de este bloque: autos con inicio hace 10 dias
    const soda = STRAINS.find((s) => s.slug === 'auto-strawberry-soda')!
    const left = (soda.plant.autoFlowerTotalDays as number) - 10
    await expect(page.getByRole('link', { name: new RegExp(soda.genetics) }).first()).toContainText(`${left} dias para cosecha`)
  })

  test('abrir una planta desde el listado y el boton "+" crea una nueva', async ({ page }) => {
    await page.getByRole('link', { name: new RegExp(BLUE.name) }).first().click()
    await expect(page.getByRole('heading', { name: BLUE.name })).toBeVisible()
    await gotoApp(page, '/plants')
    await page.getByRole('link', { name: 'Nueva planta' }).click()
    await expect(page).toHaveURL(/\/plants\/new$/)
  })
})


test.describe('Inventario (historial)', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 3)
    await createPlantViaUi(page, BLUE, 3)
    await gotoApp(page, '/inventory')
  })

  test('pestañas, estadisticas y busqueda', async ({ page }) => {
    await expect(page.getByText('Historial de cultivos')).toBeVisible()
    await expect(page.getByText('Total', { exact: true })).toBeVisible()
    await expect(page.getByText('Ciclo prom.')).toBeVisible()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
    await expect(page.getByText(BLUE.name, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Cosechadas' }).click()
    await expect(page.getByText(SODA.name, { exact: true })).not.toBeVisible()
    await page.getByRole('button', { name: 'Todas' }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()

    const box = page.getByPlaceholder('Buscar planta...')
    await box.fill('Applez')
    await expect(page.getByText(SODA.name, { exact: true })).not.toBeVisible()
    await page.getByRole('button', { name: '×' }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
  })

  test('una planta cosechada pasa a la pestaña Cosechadas y "Ver detalles" abre su ficha', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Ver detalles →' }).first().click()
    await page.getByRole('button', { name: /Cosechar/ }).first().click()
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect.poll(() => dbPlants(context).filter((p) => p.status === 'harvested').length).toBe(1)

    await gotoApp(page, '/inventory')
    await page.getByRole('button', { name: 'Cosechadas' }).click()
    await expect(page.getByText(/Cosechada/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Ver detalles →' }).first().click()
    await expect(page).toHaveURL(/\/plants\/[^/]+$/)
  })
})

test.describe('Inventario: ciclo y peso', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 3)
    await gotoApp(page, '/inventory')
  })

  test('una auto que todavia no florece no muestra dias de flora negativos', async ({ page }) => {
    await expect(page.getByText(/Ciclo:\s*3d vege$/)).toBeVisible()
    await expect(page.getByText(/-\d+d flora/)).toHaveCount(0)
  })

  test('una planta cosechada con peso lo muestra en su tarjeta', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Ver detalles →' }).first().click()
    await page.getByRole('button', { name: /Cosechar/ }).first().click()
    await page.getByLabel(/Peso cosechado/).fill('45')
    await page.getByRole('button', { name: /Confirmar cosecha/ }).click()
    await expect.poll(() => dbPlants(context).find((p) => p.status === 'harvested')?.harvest_weight_g).toBe(45)
    await gotoApp(page, '/inventory')
    await page.getByRole('button', { name: 'Cosechadas' }).click()
    await expect(page.getByText('45 g cosechados')).toBeVisible()
  })
})

test.describe('Perfil', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
    await gotoApp(page, '/profile')
  })

  test('cabecera: nivel, XP y racha en cero al empezar', async ({ page }) => {
    await expect(page.getByText('Tester').first()).toBeVisible()
    await expect(page.getByText(/Nivel 1/)).toBeVisible()
    await expect(page.getByText('Dias racha')).toBeVisible()
    await expect(page.getByText('Mejor racha')).toBeVisible()
  })

  test('pestañas Estadisticas, Logros y Cuenta', async ({ page }) => {
    await page.getByRole('button', { name: 'Estadisticas' }).click()
    await expect(page.getByText('CAMINO DEL CULTIVADOR', { exact: false })).toBeVisible()

    await page.getByRole('button', { name: 'Logros' }).click()
    await expect(page.getByText(/Completa tu primera tarea|Por desbloquear/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Cuenta' }).click()
    await expect(page.getByText('e2e@cultitrack.test')).toBeVisible()
    await expect(page.getByText('PRO', { exact: true })).toBeVisible() // usuario Pro simulado
    await page.getByRole('link', { name: /Ajustes y configuracion|Ajustes/ }).first().click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('completar una tarea suma XP y desbloquea logros', async ({ page }) => {
    await gotoApp(page, '/')
    await page.getByRole('button', { name: /: ver detalle/ }).first().click()
    await page.getByRole('button', { name: /Confirmar/ }).click()
    await expect(page.getByText(/\+15 XP/)).toBeVisible()
    await page.waitForTimeout(1_600)
    await gotoApp(page, '/profile')
    await expect(page.getByText('15 XP').first()).toBeVisible()
    await page.getByRole('button', { name: 'Estadisticas' }).click()
    await expect(page.locator('div', { hasText: /^1Tareas completadas$/ }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Logros' }).click()
    await expect(page.getByText('Primera tarea').first()).toBeVisible()
    await expect(page.getByText('Completa tu primera tarea para desbloquear logros')).not.toBeVisible()
  })
})

test.describe('Fotos por planta', () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  test('selector de planta, galeria y subida de una foto (Pro)', async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 2)
    await createPlantViaUi(page, BLUE, 2)
    await gotoApp(page, '/diagnose')
    await expect(page.getByText('Diario visual')).toBeVisible()
    await expect(page.getByText('Sin fotos todavia')).toBeVisible()
    await page.getByRole('button', { name: BLUE.name }).click()
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Sin fotos todavia')).not.toBeVisible({ timeout: 10_000 })
    // la planta Soda sigue sin fotos
    await page.getByRole('button', { name: SODA.name }).click()
    await expect(page.getByText('Sin fotos todavia')).toBeVisible()
    // diagnostico por IA deshabilitado en esta version
    await expect(page.getByText('Diagnostico por IA')).not.toBeVisible()
  })
})

test.describe('Plan Free: limites', () => {
  test('con 1 planta activa no se puede crear otra y se ofrece Pro', async ({ page, context }) => {
    await setup(page, context, 'free')
    await createPlantViaUi(page, SODA, 0)
    await gotoApp(page, '/plants/new')
    await expect(page.getByText(/Limite del plan Free/i)).toBeVisible()
    await expect(page.getByText(/Actualizar a Pro|Plan Pro/i).first()).toBeVisible()
    await gotoApp(page, '/plants')
    await expect(page.getByRole('button', { name: 'Nueva planta' })).toBeVisible() // boton con candado
  })
})

test.describe('Listado: filtro por tipo de genetica', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 3) // autofloreciente
    await createPlantViaUi(page, BLUE, 3) // feminizada
    await gotoApp(page, '/plants')
  })

  test('separar autoflorecientes de feminizadas y volver a ver todas', async ({ page }) => {
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
    await expect(page.getByText(BLUE.name, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^Autoflorecientes 1$/ }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
    await expect(page.getByText(BLUE.name, { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: /^Feminizadas 1$/ }).click()
    await expect(page.getByText(BLUE.name, { exact: true })).toBeVisible()
    await expect(page.getByText(SODA.name, { exact: true })).toHaveCount(0)

    // no hay regulares: el chip no se ofrece
    await expect(page.getByRole('button', { name: /Regulares/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Todos los tipos' }).click()
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
    await expect(page.getByText(BLUE.name, { exact: true })).toBeVisible()
  })

  test('el filtro de tipo solo aparece si hay mas de un tipo para separar en el estado elegido', async ({ page }) => {
    await expect(page.getByRole('group', { name: 'Filtrar por tipo' })).toBeVisible()
    await page.getByRole('button', { name: /^Cosechada/ }).click() // ninguna cosechada: nada que separar
    await expect(page.getByRole('group', { name: 'Filtrar por tipo' })).toHaveCount(0)
  })
})
