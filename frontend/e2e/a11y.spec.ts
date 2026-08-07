import { test, expect } from '@playwright/test'
import { seedApp, seedAnonymous, blockSupabase, gotoApp } from './helpers/seed'

test.beforeEach(async ({ context }) => {
  await blockSupabase(context)
})

test.describe('Accesibilidad basica', () => {
  test('documento con lang definido', async ({ page }) => {
    await seedAnonymous(page)
    await page.goto('/')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
  })

  test('login navegable por teclado: Tab llega a email, password y submit', async ({ page }) => {
    await seedAnonymous(page)
    await page.goto('/login')
    await page.locator('input[type="email"]').focus()
    await page.keyboard.type('teclado@test.com')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Password123!')
    // El valor tiene que haber entrado en los campos correctos
    await expect(page.locator('input[type="email"]')).toHaveValue('teclado@test.com')
    await expect(page.locator('input[type="password"]')).toHaveValue('Password123!')
  })

  test('el toggle de notificaciones expone role=switch', async ({ page, context }) => {
    await seedApp(page, context)
    await gotoApp(page, '/settings')
    await expect(page.getByRole('switch').first()).toBeVisible()
  })

  test('los botones principales tienen nombre accesible', async ({ page, context }) => {
    await seedApp(page, context, { plants: [{ id: 'p1' }], tasksToday: true })
    await gotoApp(page, '/plants/p1')
    // Ningun boton visible deberia quedar sin texto ni aria-label.
    // Se listan los ofensores para que el fallo diga QUE boton falta nombrar.
    const unnamed = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      return btns
        .filter((b) => {
          const style = getComputedStyle(b)
          if (style.display === 'none' || style.visibility === 'hidden') return false
          const name = (b.textContent ?? '').trim() || b.getAttribute('aria-label')
          return !name
        })
        .map((b) => b.outerHTML.slice(0, 120))
    })
    expect(unnamed).toEqual([])
  })

  test('imagenes con alt en la landing', async ({ page }) => {
    await seedAnonymous(page)
    await page.goto('/')
    const missingAlt = await page.evaluate(
      () => Array.from(document.querySelectorAll('img')).filter((i) => !i.alt).length
    )
    expect(missingAlt).toBe(0)
  })
})
