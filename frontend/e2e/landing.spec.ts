import { test, expect } from '@playwright/test'
import { seedAnonymous, blockSupabase } from './helpers/seed'

test.beforeEach(async ({ page, context }) => {
  await blockSupabase(context)
  await seedAnonymous(page)
})

test.describe('Landing publica', () => {
  test('la raiz muestra la landing sin cambiar la URL', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Del brote a la cosecha').first()).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('/landing sigue funcionando como alias', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.getByText('Del brote a la cosecha').first()).toBeVisible()
  })

  test('branding CultiTrack presente, cero CannaTrack', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toContainText('CultiTrack')
    await expect(page.locator('body')).not.toContainText('CannaTrack')
  })

  test('switch de idioma EN cambia el contenido en vivo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^EN$/i }).first().click()
    await expect(page.getByText('From seedling to harvest').first()).toBeVisible()
    // y vuelve a ES
    await page.getByRole('button', { name: /^ES$/i }).first().click()
    await expect(page.getByText('Del brote a la cosecha').first()).toBeVisible()
  })

  test('CTA "Empezar gratis" lleva al signup', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Empezar gratis/i }).first().click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Iniciar sesion" lleva al login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Iniciar sesion/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('secciones principales presentes (features, precios, FAQ)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Funcionalidades/i).first()).toBeVisible()
    await expect(page.getByText(/Precios/i).first()).toBeVisible()
    await expect(page.getByText(/FAQ/i).first()).toBeVisible()
  })

  test('SEO basico: title y meta description', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/CultiTrack/)
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc).toBeTruthy()
    expect(desc!.length).toBeGreaterThan(50)
  })
})

test.describe('Landing: recorrido del ciclo', () => {
  test('el hero muestra la app (mockup) y no un dibujo suelto', async ({ page }) => {
    await page.goto('/')
    const mock = page.getByTestId('app-mockup')
    await expect(mock).toBeVisible()
    await expect(mock).toContainText('Strawberry Soda')
    await expect(mock).toContainText('Riego')
  })

  test('demo: el control recorre el ciclo con la tabla REVEGETAR real', async ({ page }) => {
    await page.goto('/')
    const slider = page.getByRole('slider', { name: 'Dia del cultivo' })
    await slider.scrollIntoViewIfNeeded()

    await slider.fill('0')
    await expect(page.getByTestId('demo-day')).toHaveText('1')
    await expect(page.getByTestId('demo-stage')).toHaveText('Enraizamiento')
    await expect(page.getByText('Rootproof').first()).toBeVisible()

    await slider.fill('49')
    await expect(page.getByTestId('demo-stage')).toHaveText('Estiramiento')
    await expect(page.getByText(/Floracion · F/).first()).toBeVisible()

    await slider.fill('97')
    await expect(page.getByTestId('demo-stage')).toHaveText('Limpieza')
    await expect(page.getByTestId('demo-water')).toBeVisible() // limpieza: solo agua
  })

  test('demo: los atajos de etapa mueven el control y en EN se traduce', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^EN$/i }).first().click()
    await page.getByRole('slider', { name: 'Crop day' }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'Stretch', exact: true }).click()
    await expect(page.getByTestId('demo-stage')).toHaveText('Stretch')
    await expect(page.getByRole('slider', { name: 'Crop day' })).toHaveValue('49')
  })

  test('el hilo del ciclo se dibuja completo al llegar al final de la pagina', async ({ page }) => {
    await page.goto('/')
    const stem = page.getByTestId('lp-stem')
    await expect(stem).toBeAttached()
    const offset = () => page.locator('[data-testid="lp-stem"] path[stroke-dasharray]').evaluate((el) => parseFloat((el as SVGPathElement).style.strokeDashoffset || '1'))
    expect(await offset()).toBeGreaterThan(0.8) // arriba: casi sin dibujar
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(offset).toBeLessThan(0.05)
  })

  test('Pro lleva a crear la cuenta (30 dias de prueba), ya no es un boton muerto', async ({ page }) => {
    await page.goto('/')
    const pro = page.getByRole('link', { name: 'Probar Pro 30 dias gratis' })
    await expect(pro).toHaveAttribute('href', '/signup')
  })

  test('mobile: CTA fijo aparece al scrollear y el header no se amontona', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/')
    const sticky = page.getByTestId('sticky-cta')
    await expect(sticky).not.toHaveClass(/show/)
    await page.evaluate(() => window.scrollTo(0, 1500))
    await expect(sticky).toHaveClass(/show/)
    await sticky.getByRole('link', { name: /Empezar gratis/ }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('mobile: sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})

test.describe('Landing: metricas anonimas', () => {
  type Row = { name: string; session_id: string; props: Record<string, unknown> }

  async function capture(page: import('@playwright/test').Page) {
    const rows: Row[] = []
    await page.route(/\/rest\/v1\/analytics_events/, async (route) => {
      rows.push(JSON.parse(route.request().postData() ?? '{}') as Row)
      await route.fulfill({ status: 201, body: '' })
    })
    return rows
  }

  test('registra la vista y el click en el CTA, con una sola sesion y sin datos personales', async ({ page }) => {
    const rows = await capture(page)
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
    await page.goto('/')
    await expect.poll(() => rows.map((r) => r.name)).toContain('landing_view')
    await page.locator('[data-cta="hero"]').click()
    await expect.poll(() => rows.map((r) => r.name)).toContain('landing_cta')
    const cta = rows.find((r) => r.name === 'landing_cta')!
    expect(cta.props).toEqual({ where: 'hero' })
    expect(new Set(rows.map((r) => r.session_id)).size).toBe(1)
    expect(JSON.stringify(rows)).not.toMatch(/@|email|user_id/)
  })

  test('con automatizacion (webdriver) no se mide nada', async ({ page }) => {
    const rows = await capture(page)
    await page.goto('/')
    await page.locator('[data-cta="hero"]').click()
    await expect(page).toHaveURL(/\/signup/)
    expect(rows).toHaveLength(0)
  })
})
