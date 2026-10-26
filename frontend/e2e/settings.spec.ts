import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, getFakeBackend, dbPlants, dbProfile } from './helpers/fakeBackend'
import { STRAIN_BY_SLUG } from './fixtures/strains'
import { createPlantViaUi } from './helpers/journey'

/**
 * Ajustes: apariencia, idioma, plan, nombre de usuario, perfil, tablas
 * nutricionales, regenerar calendarios, cerrar sesion, limpiar datos locales
 * y eliminar cuenta (funcion edge simulada, nunca la real).
 */

const SODA = STRAIN_BY_SLUG['auto-strawberry-soda']

async function setup(page: Page, context: BrowserContext, plan: 'pro' | 'free' = 'pro') {
  await blockSupabase(context)
  await installFakeBackend(context)
  await seedApp(page, context, { plan, plants: [] })
}

test.describe('Ajustes', () => {
  test.beforeEach(async ({ page, context }) => {
    await setup(page, context)
    await createPlantViaUi(page, SODA, 0)
    await gotoApp(page, '/settings')
  })

  test('tema: Claro, Oscuro y Sistema cambian la clase del documento', async ({ page }) => {
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'))
    await page.getByRole('button', { name: /Claro/ }).click()
    await expect.poll(isDark).toBe(false)
    await page.getByRole('button', { name: /Oscuro/ }).click()
    await expect.poll(isDark).toBe(true)
    await page.getByRole('button', { name: /Sistema/ }).click()
    await expect(page.getByRole('button', { name: /Sistema/ })).toBeVisible()
  })

  test('idioma: English y Espanol', async ({ page }) => {
    await page.getByRole('button', { name: /English/ }).click()
    await expect(page.getByText('Language')).toBeVisible()
    await page.getByRole('button', { name: /Espanol/ }).click()
    await expect(page.getByText('Idioma')).toBeVisible()
  })

  test('plan Pro: muestra el plan y no ofrece actualizar', async ({ page }) => {
    await expect(page.getByText('⭐ Plan Pro')).toBeVisible()
    await expect(page.getByText('Plantas ilimitadas · Todas las tablas')).toBeVisible()
    await expect(page.getByRole('link', { name: /Actualizar a Pro/ })).not.toBeVisible()
  })

  test('nombre de usuario: no se puede guardar vacio ni pasar de 30 caracteres; se guarda en el servidor', async ({ page, context }) => {
    const input = page.getByPlaceholder('Tu nombre...')
    const save = page.getByRole('button', { name: 'Guardar', exact: true })

    await input.fill('')
    await expect(save).toBeDisabled()

    await input.fill('x'.repeat(40))
    await expect(input).toHaveValue('x'.repeat(30))

    await input.fill('Luca Grower')
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.getByRole('button', { name: '✓', exact: true })).toBeVisible()
    await expect.poll(() => dbProfile(context).username).toBe('Luca Grower')

    // navegacion interna (sin recargar): el perfil ya muestra el nombre nuevo
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await expect(page.getByText('Luca Grower').first()).toBeVisible()
  })

  test('perfil: nombre y volumen por defecto se guardan y se usan al crear una planta', async ({ page, context }) => {
    const nameField = page.locator('label:has-text("Nombre") + input').last()
    await nameField.fill('Cultivador Pro')
    await page.locator('input[type="number"]').first().fill('15')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('✓ Guardado')).toBeVisible()
    await expect.poll(() => dbProfile(context).username).toBe('Cultivador Pro')

    // sin recargar la pagina: el estado local ya tiene el volumen nuevo
    await page.getByRole('link', { name: 'Plantas', exact: true }).click()
    await page.getByRole('link', { name: 'Nueva planta' }).click()
    await page.getByPlaceholder('Ej: White Widow #1').fill('Prueba volumen')
    await page.getByPlaceholder('Ej: White Widow', { exact: true }).fill('Prueba')
    await page.getByRole('button', { name: /Continuar/ }).click()
    await expect(page.locator('label:has-text("Litros c/u") + input')).toHaveValue('15')
  })

  test('tablas nutricionales: oficiales listadas y atajo para crear una propia', async ({ page }) => {
    await expect(page.getByText(/REVEGETAR/).first()).toBeVisible()
    await expect(page.getByText('OFICIAL').first()).toBeVisible()
    await page.getByRole('link', { name: '+ Nueva' }).click()
    await expect(page).toHaveURL(/\/nutrition\/new/)
  })

  test('regenerar calendarios: pide confirmacion; cancelar no hace nada, aceptar muestra Listo', async ({ page, context }) => {
    const before = getFakeBackend(context).log.length
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: /Regenerar/ }).click()
    expect(getFakeBackend(context).log.slice(before).filter((l) => l.includes('scheduled_tasks') && /DELETE|POST/.test(l))).toHaveLength(0)

    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Regenerar/ }).click()
    await expect(page.getByText('✓ Listo')).toBeVisible({ timeout: 8_000 })
  })

  test('cerrar sesion lleva al login', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('limpiar datos locales: borra la copia local pero las plantas vuelven del servidor', async ({ page, context }) => {
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
    await expect(page).toHaveURL(/\/settings/)

    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
    await page.waitForLoadState('load')
    await gotoApp(page, '/plants')
    await expect(page.getByText(SODA.name, { exact: true })).toBeVisible()
    expect(dbPlants(context)).toHaveLength(1)
  })

  test('eliminar cuenta: cancelar no llama a la funcion; aceptar la llama y cierra sesion', async ({ page, context }) => {
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click()
    expect(getFakeBackend(context).functionCalls).toHaveLength(0)

    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    expect(getFakeBackend(context).functionCalls.map((c) => c.name)).toEqual(['delete-account'])
  })

  test('eliminar cuenta con error del servidor: avisa y no cierra sesion', async ({ page, context }) => {
    getFakeBackend(context).failDeleteAccount = true
    const dialogs: string[] = []
    page.on('dialog', async (d) => {
      dialogs.push(d.message())
      await d.accept()
    })
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click()
    await expect.poll(() => dialogs.length).toBe(2) // confirmacion + aviso de error
    expect(dialogs[1]).toMatch(/No se pudo eliminar la cuenta/)
    await expect(page).toHaveURL(/\/settings/)
  })
})

test.describe('Ajustes: plan Free', () => {
  test('muestra el plan Free y el boton para actualizar a Pro', async ({ page, context }) => {
    await setup(page, context, 'free')
    await gotoApp(page, '/settings')
    await expect(page.getByText('🌱 Plan Free')).toBeVisible()
    await expect(page.getByText('1 planta activa · Tabla REVEGETAR')).toBeVisible()
    await expect(page.getByRole('link', { name: /Actualizar a Pro/ })).toHaveAttribute('href', /^mailto:/)
  })
})
