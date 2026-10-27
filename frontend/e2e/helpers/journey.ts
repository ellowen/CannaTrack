import { expect, type Page } from '@playwright/test'
import { gotoApp } from './seed'
import type { StrainFixture } from '../fixtures/strains'

/**
 * Litros por maceta del plan de siembra outdoor: Critical Orange Punch 40 (la
 * ficha pide 30-50 L); el resto es estimacion (autos chicas 20-25 L,
 * fotoperiodicas 80 L).
 */
export const POT_LITERS: Record<string, number> = {
  'auto-strawberry-soda': 20,
  'auto-critical-orange-punch': 40,
  'blue-applez': 80,
  'flat-white-auto': 20,
  'citric-lime-pie': 80,
  'therian-auto': 25,
}

export function presetLabel(s: StrainFixture): string {
  return s.breeder ? `${s.name} (${s.breeder})` : s.name
}

export function localISO(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function localDaysAgo(n: number): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n)
}

/** Crea una planta por el formulario real (3 pasos), eligiendo la variedad del catalogo. */
export async function createPlantViaUi(page: Page, s: StrainFixture, daysAgo: number): Promise<string> {
  await gotoApp(page, '/plants/new')

  // Paso 1: planta
  await page.getByLabel('Variedad del catálogo (opcional)').selectOption({ label: presetLabel(s) })
  await expect(page.getByPlaceholder('Ej: White Widow', { exact: true })).toHaveValue(s.genetics)
  await page.getByPlaceholder('Ej: White Widow #1').fill(s.name)
  await page.getByRole('button', { name: /Continuar/i }).click()

  // Paso 2: setup (outdoor, tierra, 1 maceta)
  await page.locator('label:has-text("Fecha de inicio") + input[type="date"]').fill(localISO(daysAgo))
  await page.getByRole('button', { name: /Outdoor/ }).click()
  await page.getByRole('button', { name: /Tierra/ }).click()
  await page.locator('label:has-text("Macetas") + input').fill('1')
  await page.locator('label:has-text("Litros c/u") + input').fill(String(POT_LITERS[s.slug]))
  await expect(page.getByText(s.plant.geneticType === 'autoflower' ? /Auto \(/ : 'Feminizada')).toBeVisible()
  await page.getByRole('button', { name: /Continuar/i }).click()

  // Paso 3: nutricion y alta
  await page.getByRole('button', { name: /Crear planta/i }).click()
  await expect(page).toHaveURL(/\/plants\/(?!new)[^/]+$/, { timeout: 10_000 })
  return new URL(page.url()).pathname.split('/').pop() as string
}


/** El detalle de planta organiza su contenido en tres tabs (Hoy, Seguimiento, Ficha). */
export async function plantTab(page: Page, name: 'Hoy' | 'Seguimiento' | 'Ficha') {
  await page.getByRole('tab', { name }).click()
}
