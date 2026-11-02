import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, seedAnonymous } from './helpers/seed'
import { installFakeBackend, getFakeBackend } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, plantTab } from './helpers/journey'

/**
 * Diario publico de solo lectura: el dueno crea y revoca el link desde la planta
 * (backend simulado) y quien recibe el link lo ve sin cuenta (RPC simulada).
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const TOKEN = '3f1c2b7e-5a64-4d0e-9d8a-0c1b2a3d4e5f'
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

const shares = (context: BrowserContext) => getFakeBackend(context).tables['plant_shares'] ?? []

test.describe('Compartir el diario (dueno)', () => {
  async function setup(page: Page, context: BrowserContext) {
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
    const id = await createPlantViaUi(page, SODA, 10)
    await plantTab(page, 'Diario')
    return id
  }

  test('crear el link muestra la URL publica y lo guarda para esa planta', async ({ page, context }) => {
    const id = await setup(page, context)
    const card = page.getByTestId('share-diary')
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Crear link' }).click()

    const input = card.getByRole('textbox')
    await expect(input).toHaveValue(/\/d\/[0-9a-f-]{36}$/)
    expect(shares(context)).toHaveLength(1)
    expect(shares(context)[0].plant_id).toBe(id)
    expect(await input.inputValue()).toContain(String(shares(context)[0].token))
  })

  test('dejar de compartir pide confirmacion, borra el link y vuelve a ofrecer crearlo', async ({ page, context }) => {
    await setup(page, context)
    const card = page.getByTestId('share-diary')
    await card.getByRole('button', { name: 'Crear link' }).click()
    await expect(card.getByRole('textbox')).toBeVisible()

    await card.getByRole('button', { name: 'Dejar de compartir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click()
    expect(shares(context)).toHaveLength(1) // cancelar no revoca

    await card.getByRole('button', { name: 'Dejar de compartir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Dejar de compartir' }).click()
    await expect.poll(() => shares(context).length).toBe(0)
    await expect(card.getByRole('button', { name: 'Crear link' })).toBeVisible()
  })

  test('al recargar, el link activo sigue ahi', async ({ page, context }) => {
    await setup(page, context)
    const card = page.getByTestId('share-diary')
    await card.getByRole('button', { name: 'Crear link' }).click()
    await expect(card.getByRole('textbox')).toBeVisible()
    await page.reload()
    await plantTab(page, 'Diario')
    await expect(page.getByTestId('share-diary').getByRole('textbox')).toHaveValue(/\/d\//)
  })
})

test.describe('Diario publico (quien recibe el link)', () => {
  const ROW = {
    plant: {
      name: 'Gelato de la terraza', genetics: 'Gelato 33', genetic_type: 'feminized', crop_type: 'cannabis', status: 'active',
      start_date: '2026-09-01', flora_start_date: '2026-10-01', flora_days: 56, vege_days: 30, auto_flower_total_days: null,
      auto_flora_start_day: null, end_date: null, harvest_weight_g: null,
    },
    logs: [
      { id: 'l1', week_label: 'VEGE S2', log_date: '2026-09-15', notes: 'Primeras hojas grandes', photo_path: null },
      { id: 'l2', week_label: 'FLORA S2', log_date: '2026-10-15', notes: 'Empezaron los pistilos', photo_path: 'u1/p1/l2.jpg' },
    ],
  }

  test.beforeEach(async ({ page, context }) => {
    await blockSupabase(context)
    await seedAnonymous(page)
    await context.route(/\/storage\/v1\/object\/sign\/plant-photos\//, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ json: { signedURL: '/object/sign/plant-photos/u1/p1/l2.jpg?token=t' } })
        : route.fulfill({ body: PNG_1PX, contentType: 'image/png' }))
    await context.route(/\/rest\/v1\/rpc\/get_public_diary/, async (route) => {
      const { p_token } = JSON.parse(route.request().postData() ?? '{}') as { p_token: string }
      await route.fulfill({ json: p_token === TOKEN ? ROW : null })
    })
  })

  test('se ve sin cuenta: nombre, entradas (la mas nueva primero) y la foto cargada', async ({ page }) => {
    await page.goto(`/d/${TOKEN}`)
    await expect(page.getByTestId('shared-name')).toHaveText('Gelato de la terraza')
    expect(new URL(page.url()).pathname).toBe(`/d/${TOKEN}`) // no lo manda a /login

    const entries = page.getByTestId('shared-entries').getByRole('listitem')
    await expect(entries).toHaveCount(2)
    await expect(entries.first()).toContainText('Empezaron los pistilos')
    await expect(entries.nth(1)).toContainText('Primeras hojas grandes')

    const img = entries.first().getByRole('img', { name: /Foto de FLORA S2/ })
    await expect(img).toBeVisible()
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  })

  test('no muestra nada privado (ni cuenta, ni ubicacion) y no se indexa', async ({ page }) => {
    await page.goto(`/d/${TOKEN}`)
    await expect(page.getByTestId('shared-name')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer')
    await expect(page.getByRole('button', { name: /Nueva entrada|Editar|Eliminar/ })).toHaveCount(0)
  })

  test('un link inexistente o revocado dice que no esta disponible', async ({ page }) => {
    await page.goto('/d/00000000-0000-0000-0000-000000000000')
    await expect(page.getByTestId('shared-missing')).toContainText('no esta disponible')
  })

  test('el CTA lleva a crear la cuenta', async ({ page }) => {
    await page.goto(`/d/${TOKEN}`)
    await page.getByRole('link', { name: 'Probar CultiTrack' }).click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
