import { test, expect, type Page } from '@playwright/test'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { blockSupabase, seedApp, gotoApp } from './helpers/seed'
import { installFakeBackend, dbPlants, dbTasks } from './helpers/fakeBackend'
import { STRAINS } from './fixtures/strains'
import { POT_LITERS, createPlantViaUi, localDaysAgo, presetLabel } from './helpers/journey'

/**
 * Recorrido de punta a punta con las 6 variedades reales, como las va a
 * plantar el usuario: todo outdoor, en tierra, una maceta por planta.
 *
 * Usuario simulado Pro (sin tocar Supabase real): blockSupabase +
 * installFakeBackend responden con estado, asi que un reload "lee" lo que la
 * app escribio. La cuenta real/Pro de produccion NO se crea desde aca.
 *
 * Litros por maceta: Critical Orange Punch 40 (la ficha pide 30-50 L); el
 * resto es la estimacion del plan de siembra (autos chicas 20-25 L,
 * fotoperiodicas 80 L).
 */

async function reload(page: Page, path: string) {
  await gotoApp(page, path)
}

test.describe('Recorrido completo: las 6 variedades reales (usuario Pro simulado)', () => {
  test('alta por la UI, persistencia y listado', async ({ page, context }) => {
    test.setTimeout(240_000)
    await blockSupabase(context)
    await installFakeBackend(context)
    await seedApp(page, context, { plan: 'pro', plants: [] })

    const ids: Record<string, string> = {}

    await test.step('crear las 6 variedades desde el catalogo', async () => {
      for (const s of STRAINS) {
        ids[s.slug] = await createPlantViaUi(page, s, s.plant.geneticType === 'autoflower' ? 10 : 20)
      }
      expect(new Set(Object.values(ids)).size).toBe(6)
    })

    await test.step('la base simulada recibio las 6 plantas con el ciclo de la ficha', async () => {
      const rows = dbPlants(context)
      expect(rows).toHaveLength(6)
      for (const s of STRAINS) {
        const row = rows.find((r) => r.id === ids[s.slug])!
        expect(row.name).toBe(s.name)
        expect(row.genetics).toBe(s.genetics)
        expect(row.genetic_type).toBe(s.plant.geneticType)
        expect(row.location).toBe('outdoor')
        expect(row.grow_medium).toBe('soil')
        expect(row.pot_count).toBe(1)
        expect(row.pot_volume_liters).toBe(POT_LITERS[s.slug])
        const presetDays = s.plant.geneticType === 'autoflower'
          ? (s.plant.autoFlowerTotalDays as number) - 35
          : (s.plant.floweringDays as number)
        expect(row.flora_days).toBe(presetDays)
        if (s.plant.geneticType === 'autoflower') {
          expect(row.auto_flower_total_days).toBe(s.plant.autoFlowerTotalDays)
        }
      }
    })

    await test.step('cada planta genero su cronograma (y las autos terminan el dia de cosecha)', async () => {
      const tasks = dbTasks(context)
      for (const s of STRAINS) {
        const mine = tasks.filter((t) => t.plant_id === ids[s.slug])
        expect(mine.length, s.name).toBeGreaterThan(10)
        if (s.plant.geneticType === 'autoflower') {
          const harvest = mine.find((t) => t.type === 'harvest')!
          const expected = format(addDays(localDaysAgo(10), s.plant.autoFlowerTotalDays as number), 'yyyy-MM-dd')
          expect(harvest.scheduled_date, s.name).toBe(expected)
        } else {
          // fotoperiodica sin floracion iniciada: solo vegetativo, sin cosecha agendada
          expect(mine.some((t) => t.type === 'harvest'), s.name).toBe(false)
        }
      }
    })

    await test.step('recargar: las 6 plantas siguen en el listado', async () => {
      await reload(page, '/plants')
      for (const s of STRAINS) {
        await expect(page.getByText(s.name, { exact: true }).first()).toBeVisible()
      }
    })

    await test.step('detalle de cada una: genetica, outdoor, maceta y litros', async () => {
      for (const s of STRAINS) {
        await reload(page, `/plants/${ids[s.slug]}`)
        await expect(page.getByRole('heading', { name: s.name })).toBeVisible()
        await expect(page.getByText(s.genetics).first()).toBeVisible()
        await expect(page.getByText('Outdoor').first()).toBeVisible()
        await expect(page.getByText(new RegExp(`1 maceta · ${POT_LITERS[s.slug]}L`))).toBeVisible()
        // outdoor: sin badge de fotoperiodo indoor
        await expect(page.getByText('☀️ 18/6', { exact: true })).not.toBeVisible()
        await expect(page.getByText('🌙 12/12', { exact: true })).not.toBeVisible()
      }
    })

    await test.step('autos: cosecha estimada de la ficha; fotoperiodicas: sin fecha hasta iniciar flora', async () => {
      for (const s of STRAINS) {
        await reload(page, `/plants/${ids[s.slug]}`)
        if (s.plant.geneticType === 'autoflower') {
          const expected = format(addDays(localDaysAgo(10), s.plant.autoFlowerTotalDays as number), "d 'de' MMMM", { locale: es })
          await expect(page.getByText('Cosecha est.')).toBeVisible()
          await expect(page.getByText(expected).first()).toBeVisible()
        } else {
          await expect(page.getByText('Cosecha est.')).not.toBeVisible()
          await expect(page.getByRole('button', { name: /Iniciar floraci/i })).toBeVisible()
        }
      }
    })

    await test.step('el selector del catalogo tiene las 6 variedades', async () => {
      await gotoApp(page, '/plants/new')
      const options = await page.getByLabel('Variedad del catálogo (opcional)').locator('option').allTextContents()
      for (const s of STRAINS) expect(options).toContain(presetLabel(s))
    })
  })
})

