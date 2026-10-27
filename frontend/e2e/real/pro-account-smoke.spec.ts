import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { gotoApp } from '../helpers/seed'
import { STRAINS } from '../fixtures/strains'

/**
 * Contra el Supabase REAL, cuenta Pro ya logueada (ver discard-active-plants.spec.ts
 * para guardar la sesion). Solo LEE: verifica que las variedades reales cargadas
 * en la cuenta se vean bien en las pantallas, con los ciclos de la ficha.
 * No modifica nada; se saltea si faltan la sesion o las plantas.
 */

const AUTH = path.resolve('e2e/.auth/pro.json')

test.describe('Backend real: las variedades reales en la cuenta Pro (solo lectura)', () => {
  test.skip(!fs.existsSync(AUTH), 'falta e2e/.auth/pro.json')
  test.use({ storageState: AUTH })

  test('el listado muestra las plantas activas con su genetica', async ({ page }) => {
    await gotoApp(page, '/plants')
    const present = []
    for (const s of STRAINS) {
      if ((await page.getByText(s.name, { exact: true }).count()) > 0) present.push(s)
    }
    test.skip(present.length === 0, 'la cuenta no tiene las variedades cargadas')
    for (const s of present) await expect(page.getByText(s.genetics).first()).toBeVisible()
  })

  test('las autos muestran su cosecha estimada y las fotoperiodicas esperan la floracion', async ({ page }) => {
    await gotoApp(page, '/plants')
    for (const s of STRAINS) {
      const link = page.getByRole('link', { name: new RegExp(s.genetics.replace(/[()]/g, '')) }).first()
      if ((await link.count()) === 0) continue
      await link.click()
      await expect(page.getByRole('heading', { name: s.name })).toBeVisible()
      if (s.plant.geneticType === 'autoflower') {
        await expect(page.getByText('Cosecha est.')).toBeVisible()
        await expect(page.getByText('☀️ 18/6', { exact: true })).not.toBeVisible() // outdoor
      } else {
        await expect(page.getByRole('button', { name: /Iniciar floraci/i }).first()).toBeVisible()
      }
      await gotoApp(page, '/plants')
    }
  })
})
