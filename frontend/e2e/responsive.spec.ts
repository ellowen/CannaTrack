import { test, expect } from '@playwright/test'
import { plantTab } from './helpers/journey'
import { seedApp, seedAnonymous, blockSupabase, hasHorizontalScroll, gotoApp, getSmallTouchTargets } from './helpers/seed'
import { installFakeBackend } from './helpers/fakeBackend'

/**
 * Corre en TODOS los proyectos (desktop + iPhone SE/15/Pro Max, Pixel, Galaxy).
 * Regla de oro mobile: nunca scroll horizontal, nav inferior siempre visible,
 * y las acciones criticas dentro del viewport.
 */

// Diagnostico: en WebKit (CI) estos tests fallaban sin dar pistas. Si un test falla, se imprimen
// los errores de pagina y de consola para saber que rompe la app en ese navegador.
const pageProblems = new WeakMap<object, string[]>()

test.beforeEach(async ({ page, context }) => {
  const problems: string[] = []
  pageProblems.set(page, problems)
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 300)}`))
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console.error: ${m.text().slice(0, 300)}`) })
  await blockSupabase(context)
  await installFakeBackend(context)
})

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const body = await page.locator('body').innerText().catch(() => '(sin body)')
    console.log(`[diagnostico] ${testInfo.project.name} › ${testInfo.title}\n  errores: ${JSON.stringify(pageProblems.get(page) ?? [])}\n  texto visible: ${body.replace(/\s+/g, ' ').slice(0, 300)}`)
  }
})

test('landing: sin scroll horizontal y CTA visible', async ({ page }) => {
  await seedAnonymous(page)
  await page.goto('/')
  await expect(page.getByText('Del brote a la cosecha').first()).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
})

test('login: sin scroll horizontal, inputs y boton al alcance', async ({ page }) => {
  await seedAnonymous(page)
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /Ingresar/i })).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
})

test('home: sin scroll horizontal y nav inferior visible', async ({ page, context }) => {
  await seedApp(page, context, { plants: [{ name: 'Gelato' }], tasksToday: true })
  await gotoApp(page, '/')
  await expect(page.getByText(/Tester/)).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
  await expect(page.getByRole('link', { name: /Inicio/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Perfil/i })).toBeVisible()
})

test('detalle de planta: sin scroll horizontal', async ({ page, context }) => {
  await seedApp(page, context, { plants: [{ id: 'p1', growMedium: 'hydro' }], tasksToday: true })
  await gotoApp(page, '/plants/p1')
  await plantTab(page, 'Datos')
  await expect(page.getByText('Hidro')).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
})

test('harvest sheet: el boton confirmar queda dentro del viewport', async ({ page, context }) => {
  await seedApp(page, context, { plants: [{ id: 'p1' }] })
  await gotoApp(page, '/plants/p1')
  await plantTab(page, 'Datos')
  await page.getByRole('button', { name: /Finalizar cultivo/i }).click()
  const confirm = page.getByRole('button', { name: /Confirmar cosecha/i })
  // El sheet tiene scroll interno: el boton debe ser alcanzable y quedar
  // dentro del viewport una vez scrolleado (regresion del bug original).
  await confirm.scrollIntoViewIfNeeded()
  await expect(confirm).toBeVisible()
  const box = await confirm.boundingBox()
  const viewport = page.viewportSize()!
  expect(box).not.toBeNull()
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
})

test('settings: sin scroll horizontal, controles usables', async ({ page, context }) => {
  await seedApp(page, context)
  await gotoApp(page, '/settings')
  await expect(page.getByText('Idioma')).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
})

/**
 * Regresion: touch targets que estaban por debajo de 38px y se agrandaron
 * durante el QA mobile (nombre de planta en tarjeta de tarea del dia,
 * "Ver todas", flechas de mes en Calendario, icono de Ajustes en Perfil).
 */
test('home: touch targets criticos con tamaño usable', async ({ page, context }) => {
  await seedApp(page, context, { plants: [{ id: 'p1', name: 'Gelato' }], tasksToday: true })
  await gotoApp(page, '/')
  const small = await getSmallTouchTargets(page)
  const offenders = small.filter((t) => /Gelato|Ver todas/.test(t.text))
  expect(offenders, JSON.stringify(offenders)).toEqual([])
})

test('calendario: flechas de mes con tamaño usable y nombre accesible', async ({ page, context }) => {
  await seedApp(page, context, { plants: [{ id: 'p1' }], tasksToday: true })
  await gotoApp(page, '/calendar')
  await expect(page.getByRole('button', { name: 'Mes anterior' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeVisible()
  const small = await getSmallTouchTargets(page)
  const offenders = small.filter((t) => /Mes anterior|Mes siguiente/.test(t.text))
  expect(offenders, JSON.stringify(offenders)).toEqual([])
})

test('perfil: icono de ajustes con tamaño usable y nombre accesible', async ({ page, context }) => {
  await seedApp(page, context)
  await gotoApp(page, '/profile')
  const settingsIcon = page.getByRole('link', { name: 'Ajustes', exact: true })
  await expect(settingsIcon).toBeVisible()
  const box = await settingsIcon.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(38)
  expect(box!.height).toBeGreaterThanOrEqual(38)
})
