import { test, expect } from '@playwright/test'
import { plantTab } from './helpers/journey'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { seedApp, blockSupabase, gotoApp } from './helpers/seed'
import { STRAINS, STRAIN_BY_SLUG, type StrainFixture } from './fixtures/strains'
import { generatePlantSchedule } from '../src/lib/nutrition-engine'
import { getCurrentWeek, getEstimatedHarvestDate } from '../src/lib/nutrition-utils'
import { REVEGETAR_TABLE } from '../src/data/revegetar-table'
import { STRAIN_PRESETS } from '../src/data/strain-presets'
import type { Plant } from '../src/types/plant'

/**
 * Variedades reales (ver fixtures/strains.ts) contra el motor y la UI.
 *
 * - Bloque "Motor": logica pura, sin browser. Usa las fechas/ciclos reales
 *   de cada ficha para verificar cronograma, etapa y cosecha estimada.
 * - Bloque "UI": siembra las 6 plantas (plan Pro, el Free solo permite 1) y
 *   verifica que la app muestre genetica, notas y cosecha estimada.
 */

const AUTOS = STRAINS.filter((s) => s.plant.geneticType === 'autoflower')
const PHOTOS = STRAINS.filter((s) => s.plant.geneticType === 'feminized')

/** Fecha local a medianoche, N dias atras (igual criterio que parseDateOnly de la app). */
function localDaysAgo(n: number): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n)
}

/** Dias de floracion de la planta: ficha (fotoperiodicas) o total - dia 35 (autos). */
function cycleFloraDays(s: StrainFixture): number {
  return s.plant.geneticType === 'autoflower'
    ? (s.plant.autoFlowerTotalDays as number) - 35
    : (s.plant.floweringDays as number)
}

function toPlant(s: StrainFixture, daysAgo: number, floraDaysAgo?: number): Plant {
  return {
    id: `e2e-${s.slug}`,
    name: s.name,
    genetics: s.genetics,
    geneticType: s.plant.geneticType,
    sex: 'unknown',
    startDate: localDaysAgo(daysAgo),
    ...(floraDaysAgo != null ? { floraStartDate: localDaysAgo(floraDaysAgo) } : {}),
    ...(s.plant.autoFlowerTotalDays != null ? { autoFlowerTotalDays: s.plant.autoFlowerTotalDays } : {}),
    floraDays: cycleFloraDays(s),
    location: s.plant.location,
    growMedium: s.plant.growMedium,
    potCount: s.plant.potCount,
    potVolumeLiters: s.plant.potVolumeLiters,
    nutritionTableId: REVEGETAR_TABLE.id,
    status: 'active',
    notes: s.plant.notes,
  }
}

test.describe('Fixtures: integridad de datos', () => {
  test('6 variedades, slugs unicos, 4 autos + 2 fotoperiodicas', () => {
    expect(STRAINS).toHaveLength(6)
    expect(new Set(STRAINS.map((s) => s.slug)).size).toBe(6)
    expect(AUTOS).toHaveLength(4)
    expect(PHOTOS).toHaveLength(2)
  })

  for (const s of STRAINS) {
    test(`${s.name}: campos coherentes con su tipo`, () => {
      expect(s.parents.join(' x ')).toBe(s.genetics.replace(/\s+x\s+/g, ' x '))
      expect(s.facts.pack.units).toBe(3)
      expect(s.facts.pack.priceArsPack).toBeGreaterThan(0)
      if (s.plant.geneticType === 'autoflower') {
        expect(s.plant.autoFlowerTotalDays).toBeGreaterThanOrEqual(63)
        expect(s.plant.floweringDays).toBeNull()
      } else {
        expect(s.plant.autoFlowerTotalDays).toBeNull()
        expect(s.plant.floweringDays).toBeGreaterThanOrEqual(60)
      }
    })
  }
})

test.describe('Motor: autoflorecientes reales', () => {
  for (const s of AUTOS) {
    const total = s.plant.autoFlowerTotalDays as number

    test(`${s.name}: cosecha estimada = inicio + ${total} dias`, () => {
      const plant = toPlant(s, 10)
      expect(getEstimatedHarvestDate(plant)?.getTime()).toBe(addDays(plant.startDate, total).getTime())
    })

    test(`${s.name}: tarea de cosecha en el dia ${total} y floracion automatica el dia 35`, () => {
      const plant = toPlant(s, 0)
      const tasks = generatePlantSchedule(plant, REVEGETAR_TABLE)
      const harvest = tasks.filter((t) => t.type === 'harvest')
      expect(harvest).toHaveLength(1)
      expect(harvest[0].scheduledDate.getTime()).toBe(addDays(plant.startDate, total).getTime())
      expect(tasks.some((t) => t.cycle === 'flora')).toBe(true)

      expect(getCurrentWeek(plant, addDays(plant.startDate, 34))?.cycle).toBe('vege')
      expect(getCurrentWeek(plant, addDays(plant.startDate, 35))).toMatchObject({ cycle: 'flora', week: 1, stage: 'stretch' })
    })

    test(`${s.name}: el cronograma de floracion cierra el dia de cosecha (ninguna tarea despues)`, () => {
      const plant = toPlant(s, 0)
      const tareas = generatePlantSchedule(plant, REVEGETAR_TABLE)
      const cosecha = tareas.find((t) => t.type === 'harvest')!.scheduledDate.getTime()
      for (const t of tareas) expect(t.scheduledDate.getTime()).toBeLessThanOrEqual(cosecha)
      expect(Math.max(...tareas.filter((t) => t.cycle === 'flora' && t.type !== 'harvest').map((t) => t.week))).toBe(Math.ceil(cycleFloraDays(s) / 7))
    })

    test(`${s.name}: sigue en floracion el dia anterior a la cosecha (${total - 1})`, () => {
      const plant = toPlant(s, 0)
      expect(getCurrentWeek(plant, addDays(plant.startDate, total - 1))?.cycle).toBe('flora')
    })
  }
})

test.describe('Motor: fotoperiodicas reales', () => {
  for (const s of PHOTOS) {
    test(`${s.name}: sin floraStartDate no hay cosecha estimada ni etapa flora`, () => {
      const plant = toPlant(s, 30)
      expect(getEstimatedHarvestDate(plant)).toBeNull()
      expect(getCurrentWeek(plant, new Date())?.cycle).toBe('vege')
    })

    test(`${s.name}: sin floraDays propio, la cosecha sigue siendo +56 dias (default de la app)`, () => {
      const plant = { ...toPlant(s, 40, 0), floraDays: undefined }
      expect(getEstimatedHarvestDate(plant)?.getTime()).toBe(addDays(plant.floraStartDate as Date, 56).getTime())
    })

    test(`${s.name}: cosecha estimada respeta los ${s.plant.floweringDays} dias de la ficha`, () => {
      const plant = toPlant(s, 40, 0)
      expect(getEstimatedHarvestDate(plant)?.getTime()).toBe(
        addDays(plant.floraStartDate as Date, s.plant.floweringDays as number).getTime(),
      )
    })

    test(`${s.name}: el cronograma termina el dia de cosecha de la ficha, sin tareas de mas`, () => {
      const plant = toPlant(s, 40, 0)
      const tareas = generatePlantSchedule(plant, REVEGETAR_TABLE)
      const cosecha = tareas.find((t) => t.type === 'harvest')!
      expect(cosecha.scheduledDate.getTime()).toBe(
        addDays(plant.floraStartDate as Date, s.plant.floweringDays as number).getTime(),
      )
      const flora = tareas.filter((t) => t.cycle === 'flora' && t.type !== 'harvest')
      for (const t of flora) expect(t.scheduledDate.getTime()).toBeLessThan(cosecha.scheduledDate.getTime())
      expect(Math.max(...flora.map((t) => t.week))).toBe(Math.ceil((s.plant.floweringDays as number) / 7))
    })
  }
})

test.describe('Catalogo de variedades de la app', () => {
  test('hay una variedad del catalogo por cada variedad real', () => {
    expect(STRAIN_PRESETS.map((p) => p.id).sort()).toEqual(STRAINS.map((s) => s.slug).sort())
  })

  for (const s of STRAINS) {
    test(`${s.name}: el catalogo coincide con la ficha`, () => {
      const preset = STRAIN_PRESETS.find((p) => p.id === s.slug)!
      expect(preset.name).toBe(s.name)
      expect(preset.genetics).toBe(s.genetics)
      expect(preset.breeder).toBe(s.breeder)
      expect(preset.geneticType).toBe(s.plant.geneticType)
      expect(preset.notes).toBe(s.plant.notes)
      // solo se compara contra la ficha si esta da cifra por planta (el resto da g/m2)
      expect(preset.yieldGPerPlant !== undefined).toBe(s.facts.yield.outdoorGPerPlant !== null)
      expect(preset.floraDays).toBe(cycleFloraDays(s))
      if (s.plant.geneticType === 'autoflower') {
        expect(preset.autoFlowerTotalDays).toBe(s.plant.autoFlowerTotalDays)
        expect(preset.autoFloraStartDay).toBe(35)
        expect((preset.autoFloraStartDay as number) + preset.floraDays).toBe(preset.autoFlowerTotalDays)
      }
    })
  }
})

test.describe('UI: las 6 variedades reales', () => {
  test.beforeEach(async ({ context }) => {
    await blockSupabase(context)
  })

  const seedAll = (page: Parameters<typeof seedApp>[0], context: Parameters<typeof seedApp>[1]) =>
    seedApp(page, context, {
      plan: 'pro',
      plants: STRAINS.map((s) => ({
        id: `e2e-${s.slug}`,
        name: s.name,
        genetics: s.genetics,
        geneticType: s.plant.geneticType,
        autoFlowerTotalDays: s.plant.autoFlowerTotalDays ?? undefined,
        floraDays: cycleFloraDays(s),
        location: s.plant.location,
        growMedium: s.plant.growMedium,
        potCount: s.plant.potCount,
        potVolumeLiters: s.plant.potVolumeLiters,
        notes: s.plant.notes,
        daysAgo: s.plant.geneticType === 'autoflower' ? s.checkpoints.daysAgo[1] : s.checkpoints.daysAgo[0],
        floraDaysAgo: s.plant.geneticType === 'feminized' ? s.checkpoints.floraDaysAgo[1] : undefined,
      })),
    })

  test('listado de plantas muestra nombre y genetica de las 6', async ({ page, context }) => {
    await seedAll(page, context)
    await gotoApp(page, '/plants')
    for (const s of STRAINS) {
      await expect(page.getByText(s.name, { exact: true }).first()).toBeVisible()
      await expect(page.getByText(s.genetics).first()).toBeVisible()
    }
  })

  for (const s of STRAINS) {
    test(`detalle ${s.name}: genetica y notas reales`, async ({ page, context }) => {
      await seedAll(page, context)
      await gotoApp(page, `/plants/e2e-${s.slug}`)
      await expect(page.getByText(s.genetics).first()).toBeVisible()
      await plantTab(page, 'Ficha')
      await expect(page.getByText(s.plant.notes)).toBeVisible()
    })
  }

  for (const s of AUTOS) {
    test(`detalle ${s.name}: cosecha estimada en la fecha de la ficha`, async ({ page, context }) => {
      await seedAll(page, context)
      await gotoApp(page, `/plants/e2e-${s.slug}`)
      const start = localDaysAgo(s.checkpoints.daysAgo[1])
      const expected = format(addDays(start, s.plant.autoFlowerTotalDays as number), "d 'de' MMMM", { locale: es })
      await expect(page.getByText('Cosecha est.')).toBeVisible()
      await expect(page.getByText(expected).first()).toBeVisible()
    })
  }

  for (const s of PHOTOS) {
    test(`detalle ${s.name}: cosecha estimada = inicio de flora + ${s.plant.floweringDays} dias de la ficha`, async ({ page, context }) => {
      await seedAll(page, context)
      await gotoApp(page, `/plants/e2e-${s.slug}`)
      const floraStart = localDaysAgo(s.checkpoints.floraDaysAgo[1])
      const expected = format(addDays(floraStart, s.plant.floweringDays as number), "d 'de' MMMM", { locale: es })
      await expect(page.getByText('Cosecha est.')).toBeVisible()
      await expect(page.getByText(expected).first()).toBeVisible()
    })
  }

  test('nueva planta desde el catalogo: precarga datos y la cosecha sale de la ficha', async ({ page, context }) => {
    const s = STRAIN_BY_SLUG['therian-auto']
    await seedApp(page, context, { plan: 'pro', plants: [] })
    await gotoApp(page, '/plants/new')

    await page.getByLabel('Variedad del catálogo (opcional)').selectOption({ label: 'Therian Auto (Mountain Seeds)' })
    await expect(page.getByPlaceholder('Ej: White Widow', { exact: true })).toHaveValue(s.genetics)
    await expect(page.getByLabel('Días de floración')).toHaveValue('49')
    await expect(page.getByLabel('Día de inicio de floración')).toHaveValue('35')

    await page.getByPlaceholder('Ej: White Widow #1').fill('Therian Test')
    await page.getByRole('button', { name: /Continuar/i }).click()
    // Paso 2: el resumen muestra la floracion que se va a usar
    await expect(page.getByText('49 días')).toBeVisible()
    await page.getByRole('button', { name: /Continuar/i }).click()
    await page.getByRole('button', { name: /Crear planta/i }).click()

    await expect(page).toHaveURL(/\/plants\/[^/]+$/, { timeout: 10_000 })
    await expect(page.getByText(s.genetics).first()).toBeVisible()
    const expected = format(addDays(localDaysAgo(0), s.plant.autoFlowerTotalDays as number), "d 'de' MMMM", { locale: es })
    await expect(page.getByText(expected).first()).toBeVisible()
  })

  test('editar la duracion de floracion mueve la cosecha estimada', async ({ page, context }) => {
    const s = STRAIN_BY_SLUG['blue-applez']
    await seedAll(page, context)
    await gotoApp(page, `/plants/e2e-${s.slug}/edit`)

    await page.getByLabel('Días de floración').fill('70')
    await page.getByRole('button', { name: /Continuar/i }).click()
    await page.getByRole('button', { name: /Continuar/i }).click()
    await page.getByRole('button', { name: /Guardar cambios/i }).click()
    await expect(page).toHaveURL(new RegExp(`/plants/e2e-${s.slug}$`), { timeout: 10_000 })

    const floraStart = localDaysAgo(s.checkpoints.floraDaysAgo[1])
    const expected = format(addDays(floraStart, 70), "d 'de' MMMM", { locale: es })
    await expect(page.getByText(expected).first()).toBeVisible()
  })

  test('Blue Applez en semana 4 de floracion: badge 12/12', async ({ page, context }) => {
    await seedAll(page, context)
    await gotoApp(page, `/plants/e2e-${STRAIN_BY_SLUG['blue-applez'].slug}`)
    await plantTab(page, 'Ficha')
    await expect(page.getByText('12/12')).toBeVisible()
  })
})
