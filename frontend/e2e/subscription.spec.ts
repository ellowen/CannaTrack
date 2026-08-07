import { test, expect } from '@playwright/test'
import { seedApp, blockSupabase, setMockProfile, gotoApp } from './helpers/seed'

test.describe('Modelo de trial y suscripcion', () => {
  test('trial recien empezado: sin banner, app usable', async ({ page, context }) => {
    await blockSupabase(context)
    setMockProfile(context, { is_pro: false, trial_ends_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString() })
    await seedApp(page, context, { plants: [{ id: 'p1' }] })
    await gotoApp(page, '/')
    await expect(page.getByText(/Tester/)).toBeVisible()
    await expect(page.getByText(/dias de prueba/i)).not.toBeVisible()
  })

  test('trial por vencer (<=7 dias): muestra banner de aviso', async ({ page, context }) => {
    await blockSupabase(context)
    setMockProfile(context, { is_pro: false, trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() })
    await seedApp(page, context, { plants: [{ id: 'p1' }] })
    await gotoApp(page, '/')
    await expect(page.getByText(/dias de prueba/i)).toBeVisible()
  })

  test('trial vencido: la app se bloquea con pantalla de suscripcion', async ({ page, context }) => {
    await blockSupabase(context)
    setMockProfile(context, { is_pro: false, trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
    await seedApp(page, context, { plants: [{ id: 'p1' }] })
    await gotoApp(page, '/')
    await expect(page.getByText(/prueba gratuita termino/i)).toBeVisible()
    await expect(page.getByText(/Suscribirme/i)).toBeVisible()
    // El contenido normal de la app no se ve
    await expect(page.getByText('Gelato')).not.toBeVisible()
  })

  test('trial vencido: se puede cerrar sesion desde la pantalla de bloqueo', async ({ page, context }) => {
    await blockSupabase(context)
    setMockProfile(context, { is_pro: false, trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
    await seedApp(page, context, { plants: [{ id: 'p1' }] })
    await gotoApp(page, '/')
    await expect(page.getByText(/prueba gratuita termino/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Cerrar sesion/i })).toBeVisible()
  })

  test('usuario pro: sin banner ni bloqueo aunque el trial este vencido', async ({ page, context }) => {
    await blockSupabase(context)
    setMockProfile(context, { is_pro: true, trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
    await seedApp(page, context, { plan: 'pro', plants: [{ id: 'p1' }] })
    await gotoApp(page, '/')
    await expect(page.getByText(/Tester/)).toBeVisible()
    await expect(page.getByText(/prueba gratuita termino/i)).not.toBeVisible()
  })

  test('Settings muestra los dias de trial restantes', async ({ page, context }) => {
    await blockSupabase(context)
    setMockProfile(context, { is_pro: false, trial_ends_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString() })
    await seedApp(page, context)
    await gotoApp(page, '/settings')
    await expect(page.getByText(/12 dias de prueba/i)).toBeVisible()
  })
})
