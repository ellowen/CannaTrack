import { test, expect, type Page } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, getFakeBackend } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi, localISO, plantTab } from './helpers/journey'

/**
 * Demo visual del seguimiento: una auto de 40 dias con seis entradas de
 * diario (foto + nota) y mediciones EC/pH, para ver como queda la pestana
 * "Diario" y "Mediciones" con contenido real.
 *
 *   DEMO=1 npx playwright test e2e/demo-seguimiento.spec.ts --project=desktop --headed
 *
 * Con DEMO=1 el navegador queda abierto (page.pause) para recorrerlo a mano.
 * Sin DEMO corre como un test normal y deja capturas en test-results.
 * Las "fotos" son ilustraciones dibujadas en un canvas, no fotos reales.
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']
const USER_ID = 'e2e-user-0001'
const DEMO_TIMEOUT = process.env.DEMO ? 0 : 60_000

const ENTRIES = [
  { daysAgo: 38, label: 'VEGE S1', week: 1, flora: false, notes: 'Brotó a los 3 días. Cotiledones bien abiertos, sustrato húmedo pero sin encharcar.' },
  { daysAgo: 31, label: 'VEGE S2', week: 2, flora: false, notes: 'Primeras hojas verdaderas. Riego liviano, EC 0.5. Sin plagas a la vista.' },
  { daysAgo: 24, label: 'VEGE S3', week: 3, flora: false, notes: 'Crece pareja. Hice un poco de LST para abrir el centro y que entre luz.' },
  { daysAgo: 17, label: 'VEGE S4', week: 4, flora: false, notes: 'Muy buen ritmo, hojas anchas y verde parejo. Subí la dosis de crecimiento.' },
  { daysAgo: 10, label: 'VEGE S5', week: 5, flora: false, notes: 'Se vienen los primeros pistilos. Reviso hojas cada dos días por las dudas.' },
  { daysAgo: 3,  label: 'FLORA F1', week: 6, flora: true,  notes: 'Arrancó la floración y está estirando fuerte. Subí el EC a 1.1.' },
]

const MEASUREMENTS = [
  { daysAgo: 30, ec: 0.5, ph: 5.9, temp: 21 },
  { daysAgo: 22, ec: 0.7, ph: 6.0, temp: 22 },
  { daysAgo: 14, ec: 0.8, ph: 5.8, temp: 23 },
  { daysAgo: 7,  ec: 0.9, ph: 6.1, temp: 22 },
  { daysAgo: 2,  ec: 1.1, ph: 6.2, temp: 24 },
]

/** Dibuja una planta que crece con la semana (en floracion suma cogollos). Devuelve un JPEG en base64. */
async function drawPlantPhoto(page: Page, week: number, flora: boolean): Promise<string> {
  return page.evaluate(({ week, flora }) => {
    const c = document.createElement('canvas')
    c.width = 800; c.height = 1000
    const g = c.getContext('2d')!
    const sky = g.createLinearGradient(0, 0, 0, 1000)
    sky.addColorStop(0, flora ? '#f2d9a6' : '#cfe8d2')
    sky.addColorStop(1, flora ? '#e5b985' : '#9fcb9d')
    g.fillStyle = sky; g.fillRect(0, 0, 800, 1000)
    // suelo y maceta
    g.fillStyle = '#6b4a2f'; g.fillRect(0, 880, 800, 120)
    g.fillStyle = '#8a5a3a'
    g.beginPath(); g.moveTo(270, 800); g.lineTo(530, 800); g.lineTo(500, 930); g.lineTo(300, 930); g.closePath(); g.fill()
    g.fillStyle = '#4a3220'; g.fillRect(262, 790, 276, 22)
    // tallo
    const h = Math.min(120 + week * 85, 640)
    g.strokeStyle = '#3f7a3a'; g.lineWidth = 10 + week; g.lineCap = 'round'
    g.beginPath(); g.moveTo(400, 800); g.lineTo(400, 800 - h); g.stroke()
    // hoja de cannabis: abanico de folíolos
    const leaf = (x: number, y: number, size: number, rot: number) => {
      g.save(); g.translate(x, y); g.rotate(rot)
      for (const a of [-1.15, -0.6, 0, 0.6, 1.15]) {
        g.save(); g.rotate(a)
        const len = size * (a === 0 ? 1 : Math.abs(a) < 1 ? 0.82 : 0.55)
        g.fillStyle = '#3f9a4a'
        g.beginPath(); g.moveTo(0, 0)
        g.quadraticCurveTo(len * 0.12, -len * 0.5, 0, -len)
        g.quadraticCurveTo(-len * 0.12, -len * 0.5, 0, 0); g.fill()
        g.strokeStyle = '#2d7a38'; g.lineWidth = 2
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * 0.95); g.stroke()
        g.restore()
      }
      g.restore()
    }
    const nodes = Math.min(2 + week, 7)
    for (let i = 0; i < nodes; i++) {
      const y = 800 - (h / (nodes + 1)) * (i + 1)
      const size = (50 + week * 22) * (1 - i * 0.07)
      leaf(400, y, size, -1.2); leaf(400, y, size, 1.2)
    }
    leaf(400, 800 - h, 60 + week * 14, 0)
    if (flora) {
      for (let i = 0; i < 4; i++) {
        const y = 800 - h + 40 + i * 70, x = i % 2 ? 372 : 428
        g.fillStyle = '#b9d56b'; g.beginPath(); g.ellipse(x, y, 20, 32, 0, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#e08a3a'
        for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (k - 3) * 4, y - 10 + (k % 3) * 8, 3, 0, Math.PI * 2); g.fill() }
      }
    }
    // marca de agua con la fecha, como una foto del celular
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 940, 800, 60)
    g.fillStyle = '#fff'; g.font = '28px sans-serif'; g.fillText(`Semana ${week}`, 24, 980)
    return c.toDataURL('image/jpeg', 0.82).split(',')[1]
  }, { week, flora })
}

test('demo: diario con fotos, notas y mediciones', async ({ page, context }, testInfo) => {
  test.setTimeout(DEMO_TIMEOUT)
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan: 'pro', plants: [], keepLocalState: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const plantId = await createPlantViaUi(page, SODA, 40)

  // las fotos se sirven por el endpoint de URLs firmadas del backend simulado
  const bodies = new Map<string, Buffer>()
  await context.route(/\/storage\/v1\/object\/sign\//, async (route) => {
    const m = new URL(route.request().url()).pathname.match(/\/storage\/v1\/object\/sign\/(.+)$/)
    const body = m && route.request().method() === 'GET' ? bodies.get(decodeURIComponent(m[1])) : undefined
    if (body) return route.fulfill({ status: 200, contentType: 'image/jpeg', body })
    return route.fallback()
  })

  const fake = getFakeBackend(context)
  fake.tables['week_logs'] = []
  for (const [i, e] of ENTRIES.entries()) {
    const path = `${USER_ID}/${plantId}/demo-${i}.jpg`
    bodies.set(`plant-photos/${path}`, Buffer.from(await drawPlantPhoto(page, e.week, e.flora), 'base64'))
    fake.tables['week_logs'].push({
      id: `demo-log-${i}`, user_id: USER_ID, plant_id: plantId, week_label: e.label,
      log_date: localISO(e.daysAgo), notes: e.notes, photo_url: path,
    })
  }
  fake.tables['measurements'] = MEASUREMENTS.map((m, i) => ({
    id: `demo-meas-${i}`, user_id: USER_ID, plant_id: plantId,
    measured_at: new Date(Date.now() - m.daysAgo * 86_400_000).toISOString(),
    ec: m.ec, ph: m.ph, water_temp: m.temp,
  }))

  await gotoApp(page, `/plants/${plantId}`)
  await plantTab(page, 'Diario')

  for (const e of ENTRIES) await expect(page.getByText(e.notes)).toBeVisible()
  await expect(page.locator('img').first()).toBeVisible()

  // el visor abre la foto y se cierra con Escape
  await page.getByText(ENTRIES[0].notes).click()
  await page.waitForTimeout(500)
  // el visor tiene que quedar por encima de la barra de navegacion (antes la barra tapaba la nota)
  const navOverVisor = await page.evaluate(() => {
    const nav = document.querySelector('nav')!.getBoundingClientRect()
    const top = document.elementFromPoint(nav.x + nav.width / 2, nav.y + nav.height / 2)
    return !top?.closest('.lightbox-in')
  })
  expect(navOverVisor).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('visor.png') })
  await page.keyboard.press('Escape')

  await page.waitForTimeout(500)
  await page.screenshot({ path: testInfo.outputPath('seguimiento.png'), fullPage: true })
  await plantTab(page, 'Mediciones')
  await expect(page.getByText('Sin mediciones aún')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('mediciones.png') })
  await plantTab(page, 'Hoy')
  await page.screenshot({ path: testInfo.outputPath('hoy.png') })
  await plantTab(page, 'Diario')

  if (process.env.DEMO) await page.pause()
})
