import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import { generatePlantSchedule, startFloraPhase } from '../nutrition-engine'
import {
  getTasksForDate,
  getUpcomingTasks,
  awaitingFloraStart,
  scaleDose,
  canAccessTable,
} from '../nutrition-utils'
import { REVEGETAR_TABLE } from '../../data/revegetar-table'
import type { Plant, NutritionTable } from '../../types/plant'

// ─── Plantas de prueba ────────────────────────────────────────────────────────

const hoy = new Date('2024-03-01')

const plantaFemBase: Plant = {
  id: 'fem-1',
  name: 'White Widow #1',
  genetics: 'White Widow',
  geneticType: 'feminized',
  sex: 'unknown',
  startDate: hoy,
  location: 'indoor',
  potCount: 1,
  potVolumeLiters: 5,
  nutritionTableId: 'revegetar-v1',
  status: 'active',
}

const plantaAutoBase: Plant = {
  id: 'auto-1',
  name: 'Critical Auto',
  genetics: 'Critical Auto',
  geneticType: 'autoflower',
  sex: 'unknown',
  startDate: hoy,
  autoFlowerTotalDays: 75,
  location: 'indoor',
  potCount: 1,
  potVolumeLiters: 5,
  nutritionTableId: 'revegetar-v1',
  status: 'active',
}

const plantaRegularMacho: Plant = {
  id: 'reg-1',
  name: 'Macho Regular',
  genetics: 'OG Kush Regular',
  geneticType: 'regular',
  sex: 'male',
  startDate: hoy,
  location: 'indoor',
  potCount: 1,
  nutritionTableId: 'revegetar-v1',
  status: 'discarded',
}

// ─── Tabla pro de prueba ─────────────────────────────────────────────────────

const tablaProMock: NutritionTable = {
  ...REVEGETAR_TABLE,
  id: 'pro-table',
  accessTier: 'pro',
}

// ─── Tests: Feminizada sin floraStartDate ─────────────────────────────────────

describe('Feminizada sin floraStartDate', () => {
  const tareas = generatePlantSchedule(plantaFemBase, REVEGETAR_TABLE)

  it('genera solo tareas VEGE', () => {
    expect(tareas.length).toBeGreaterThan(0)
    const hayFlora = tareas.some(t => t.cycle === 'flora')
    expect(hayFlora).toBe(false)
    const todoVege = tareas.every(t => t.cycle === 'vege')
    expect(todoVege).toBe(true)
  })

  it('semana 0 incluye Rootproof, Starter y Bacillus Subtilis', () => {
    const nutricionS0 = tareas.find(
      t => t.type === 'nutrition' && t.cycle === 'vege' && t.week === 0,
    )
    expect(nutricionS0).toBeDefined()
    const nombres = nutricionS0!.products.map(p => p.name)
    expect(nombres).toContain('Rootproof')
    expect(nombres).toContain('Starter')
    expect(nombres).toContain('Bacillus Subtilis')
  })

  it('awaitingFloraStart() = true si pasaron las semanas VEGE', () => {
    // Planta con startDate muy antiguo (más de 42 días atrás)
    const plantaAntigua: Plant = {
      ...plantaFemBase,
      startDate: new Date('2020-01-01'),
    }
    expect(awaitingFloraStart(plantaAntigua)).toBe(true)
  })

  it('awaitingFloraStart() = false si aún está en VEGE', () => {
    // Planta recién iniciada — usa la fecha real de hoy para estar dentro del VEGE
    const plantaReciente: Plant = {
      ...plantaFemBase,
      startDate: new Date(), // iniciada hoy → 0 días de VEGE, no supera los 42
    }
    expect(awaitingFloraStart(plantaReciente)).toBe(false)
  })
})

// ─── Tests: Feminizada con floraStartDate ─────────────────────────────────────

describe('Feminizada con floraStartDate', () => {
  const floraStart = addDays(hoy, 35)
  const planta: Plant = { ...plantaFemBase, floraStartDate: floraStart }
  const tareas = generatePlantSchedule(planta, REVEGETAR_TABLE)

  it('genera VEGE + FLORA', () => {
    const hayVege = tareas.some(t => t.cycle === 'vege')
    const hayFlora = tareas.some(t => t.cycle === 'flora')
    expect(hayVege).toBe(true)
    expect(hayFlora).toBe(true)
  })

  it('semana F1 incluye Early Blossom y Vital Juice', () => {
    const nutricionF1 = tareas.find(
      t => t.type === 'nutrition' && t.cycle === 'flora' && t.week === 1,
    )
    expect(nutricionF1).toBeDefined()
    const nombres = nutricionF1!.products.map(p => p.name)
    expect(nombres).toContain('Early Blossom')
    expect(nombres).toContain('Vital Juice')
  })

  it('semanas F7/F8 no tienen productos (solo agua)', () => {
    const nutricionesLimpieza = tareas.filter(
      t => t.type === 'nutrition' && t.cycle === 'flora' && t.week >= 7,
    )
    // No debe haber tareas de tipo nutrición en las semanas F7/F8
    expect(nutricionesLimpieza.length).toBe(0)

    // Sí debe haber riegos en F7 y F8
    const riegosLimpieza = tareas.filter(
      t => t.type === 'irrigation' && t.cycle === 'flora' && t.week >= 7,
    )
    expect(riegosLimpieza.length).toBeGreaterThan(0)

    // Ningún riego de limpieza tiene productos
    riegosLimpieza.forEach(t => {
      expect(t.products.length).toBe(0)
    })
  })

  it('última tarea es tipo harvest', () => {
    const ultima = tareas[tareas.length - 1]
    expect(ultima.type).toBe('harvest')
  })

  it('awaitingFloraStart() = false porque ya tiene floraStartDate', () => {
    expect(awaitingFloraStart(planta)).toBe(false)
  })
})

// ─── Tests: Autofloreciente ───────────────────────────────────────────────────

describe('Autofloreciente', () => {
  const tareas = generatePlantSchedule(plantaAutoBase, REVEGETAR_TABLE)

  it('genera cronograma completo sin floraStartDate manual', () => {
    expect(tareas.length).toBeGreaterThan(0)
    const hayVege = tareas.some(t => t.cycle === 'vege')
    const hayFlora = tareas.some(t => t.cycle === 'flora')
    expect(hayVege).toBe(true)
    expect(hayFlora).toBe(true)
  })

  it('floraStartDate calculada = startDate + 35 días', () => {
    const primeraFlora = tareas.find(t => t.cycle === 'flora')
    expect(primeraFlora).toBeDefined()
    const floraEsperada = addDays(hoy, 35)
    // La primera tarea de flora debe estar en startDate + 35 días (o después)
    expect(primeraFlora!.scheduledDate.getTime()).toBeGreaterThanOrEqual(
      floraEsperada.getTime(),
    )
  })

  it('cantidad de tareas correcta para 75 días', () => {
    // VEGE rooting x2: 4 tareas c/u = 8
    // VEGE growth x2 + preflower x2 (con foliar): 5 tareas c/u = 20
    // FLORA stretch x2 (con foliar): 5 tareas c/u = 10
    // FLORA bulking x2 + ripening x2: 4 tareas c/u = 16
    // FLORA flushing x2: 3 tareas c/u = 6
    // Harvest: 1
    // Total: 61
    expect(tareas.length).toBe(61)
  })

  it('fecha de cosecha = startDate + 75 días', () => {
    const cosecha = tareas.find(t => t.type === 'harvest')
    expect(cosecha).toBeDefined()
    const fechaEsperada = addDays(hoy, 75)
    expect(cosecha!.scheduledDate.getTime()).toBe(fechaEsperada.getTime())
  })
})

// ─── Tests: Regular macho ─────────────────────────────────────────────────────

describe('Regular macho', () => {
  it('sex === male → devuelve []', () => {
    const tareas = generatePlantSchedule(plantaRegularMacho, REVEGETAR_TABLE)
    expect(tareas).toEqual([])
  })
})

// ─── Tests: Acceso a tablas ───────────────────────────────────────────────────

describe('Acceso a tablas', () => {
  it('canAccessTable(tabla free, free) = true', () => {
    expect(canAccessTable(REVEGETAR_TABLE, 'free')).toBe(true)
  })

  it('canAccessTable(tabla pro, free) = false', () => {
    expect(canAccessTable(tablaProMock, 'free')).toBe(false)
  })

  it('canAccessTable(tabla pro, pro) = true', () => {
    expect(canAccessTable(tablaProMock, 'pro')).toBe(true)
  })
})

// ─── Tests: Utilidades ────────────────────────────────────────────────────────

describe('Utilidades', () => {
  const floraStart = addDays(hoy, 35)
  const planta: Plant = { ...plantaFemBase, floraStartDate: floraStart }
  const tareas = generatePlantSchedule(planta, REVEGETAR_TABLE)

  it('getTasksForDate devuelve solo las del día exacto', () => {
    const tareasHoy = getTasksForDate(tareas, hoy)
    expect(tareasHoy.length).toBeGreaterThan(0)
    tareasHoy.forEach(t => {
      expect(t.scheduledDate.getDate()).toBe(hoy.getDate())
      expect(t.scheduledDate.getMonth()).toBe(hoy.getMonth())
      expect(t.scheduledDate.getFullYear()).toBe(hoy.getFullYear())
    })

    // Una fecha sin tareas debería devolver array vacío
    const fechaSinTareas = new Date('2099-01-01')
    expect(getTasksForDate(tareas, fechaSinTareas)).toEqual([])
  })

  it('getUpcomingTasks devuelve las próximas N tareas ordenadas', () => {
    const proximas = getUpcomingTasks(tareas, hoy, 5)
    expect(proximas.length).toBe(5)
    for (let i = 1; i < proximas.length; i++) {
      expect(proximas[i].scheduledDate.getTime()).toBeGreaterThanOrEqual(
        proximas[i - 1].scheduledDate.getTime(),
      )
    }
  })

  it('scaleDose(rootproof 1-2ml, 5L) → totalAmount entre 5 y 10', () => {
    const rootproof = REVEGETAR_TABLE.vegeWeeks[0].products.find(
      p => p.name === 'Rootproof',
    )
    expect(rootproof).toBeDefined()
    const resultado = scaleDose(rootproof!, 5)
    expect(resultado.name).toBe('Rootproof')
    expect(resultado.totalAmount).toBeGreaterThanOrEqual(5)
    expect(resultado.totalAmount).toBeLessThanOrEqual(10)
    expect(resultado.unit).toBe('ml')
  })
})

// ─── Tests: startFloraPhase ───────────────────────────────────────────────────

describe('startFloraPhase', () => {
  it('regenera el cronograma con VEGE + FLORA desde la fecha dada', () => {
    const floraDate = addDays(hoy, 40)
    const tareas = startFloraPhase(plantaFemBase, floraDate, REVEGETAR_TABLE)
    const hayVege = tareas.some(t => t.cycle === 'vege')
    const hayFlora = tareas.some(t => t.cycle === 'flora')
    expect(hayVege).toBe(true)
    expect(hayFlora).toBe(true)
  })
})
