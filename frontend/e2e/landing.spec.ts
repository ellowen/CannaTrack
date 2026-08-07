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
