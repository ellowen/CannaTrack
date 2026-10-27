import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import {
  DEFAULT_FLORA_DAYS,
  floraWeekCount,
  daysUntilSowing,
  getActiveCycle,
  getAutoFloraStartDay,
  getFloraStart,
  getFloraDays,
  isPlanned,
  scaleFloraWeeks,
  stageForFloraWeek,
} from '../flora-cycle'
import { generatePlantSchedule } from '../nutrition-engine'
import {
  getCurrentWeek,
  getCycleProgress,
  getEstimatedHarvestDate,
  getRangesForDate,
} from '../nutrition-utils'
import { REVEGETAR_TABLE } from '../../data/revegetar-table'
import type { Plant } from '../../types/plant'

const inicio = new Date(2026, 0, 1)

function planta(overrides: Partial<Plant>): Plant {
  return {
    id: 'p',
    name: 'Test',
    genetics: 'Test',
    geneticType: 'feminized',
    sex: 'unknown',
    startDate: inicio,
    location: 'indoor',
    potCount: 1,
    potVolumeLiters: 11,
    nutritionTableId: REVEGETAR_TABLE.id,
    status: 'active',
    ...overrides,
  }
}

describe('defaults', () => {
  it('sin campos propios: 56 dias de flora y auto en el dia 35', () => {
    expect(getFloraDays({})).toBe(DEFAULT_FLORA_DAYS)
    expect(getFloraDays({})).toBe(56)
    expect(getAutoFloraStartDay({})).toBe(35)
  })

  it('floraWeekCount redondea hacia arriba (la ultima semana puede ser parcial)', () => {
    expect([49, 56, 63, 65, 70].map(floraWeekCount)).toEqual([7, 8, 9, 10, 10])
  })
})

describe('stageForFloraWeek', () => {
  it('con 8 semanas reproduce las etapas historicas', () => {
    const etapas = [1, 2, 3, 4, 5, 6, 7, 8].map((w) => stageForFloraWeek(w, 8))
    expect(etapas).toEqual([
      'stretch', 'stretch', 'bulking', 'bulking', 'ripening', 'ripening', 'flushing', 'flushing',
    ])
  })

  for (const total of [5, 6, 7, 9, 10, 12, 14]) {
    it(`con ${total} semanas: empieza en stretch, termina en flushing y las etapas nunca retroceden`, () => {
      const orden = ['stretch', 'bulking', 'ripening', 'flushing']
      const etapas = Array.from({ length: total }, (_, i) => stageForFloraWeek(i + 1, total))
      expect(etapas[0]).toBe('stretch')
      expect(etapas[total - 1]).toBe('flushing')
      const idx = etapas.map((e) => orden.indexOf(e))
      expect(idx).toEqual([...idx].sort((a, b) => a - b))
      // Las 4 etapas aparecen siempre que haya al menos 4 semanas
      expect(new Set(etapas).size).toBe(4)
    })
  }
})

describe('scaleFloraWeeks', () => {
  const base = REVEGETAR_TABLE.floraWeeks

  it('con la duracion de la tabla devuelve las mismas semanas', () => {
    expect(scaleFloraWeeks(base, 56)).toBe(base)
  })

  it('63 dias: 9 semanas contiguas, la ultima termina en el dia 63', () => {
    const w = scaleFloraWeeks(base, 63)
    expect(w).toHaveLength(9)
    expect(w.map((x) => x.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(w[0].dayStart).toBe(0)
    for (let i = 1; i < w.length; i++) expect(w[i].dayStart).toBe(w[i - 1].dayEnd)
    expect(w[8].dayEnd).toBe(63)
  })

  it('65 dias: 10 semanas, la ultima parcial (dias 63-65)', () => {
    const w = scaleFloraWeeks(base, 65)
    expect(w).toHaveLength(10)
    expect(w[9]).toMatchObject({ dayStart: 63, dayEnd: 65 })
  })

  it('las dosis, EC y pH de cada semana salen de una semana real de la tabla', () => {
    for (const nueva of scaleFloraWeeks(base, 70)) {
      const origen = base.some(
        (b) =>
          b.stage === nueva.stage &&
          b.ecMax === nueva.ecMax &&
          b.phMax === nueva.phMax &&
          JSON.stringify(b.products) === JSON.stringify(nueva.products),
      )
      expect(origen).toBe(true)
    }
  })

  it('mas corta que la tabla (42 dias): 6 semanas que igual terminan en limpieza', () => {
    const w = scaleFloraWeeks(base, 42)
    expect(w).toHaveLength(6)
    expect(w[5].stage).toBe('flushing')
  })
})

describe('cronograma con floracion personalizada', () => {
  it('fotoperiodica con 65 dias: cosecha en floraStart+65 y ninguna tarea de flora despues', () => {
    const p = planta({ floraStartDate: addDays(inicio, 40), floraDays: 65 })
    const tareas = generatePlantSchedule(p, REVEGETAR_TABLE)
    const cosecha = tareas.find((t) => t.type === 'harvest')!
    expect(cosecha.scheduledDate.getTime()).toBe(addDays(p.floraStartDate!, 65).getTime())
    const flora = tareas.filter((t) => t.cycle === 'flora' && t.type !== 'harvest')
    expect(Math.max(...flora.map((t) => t.week))).toBe(10)
    for (const t of flora) expect(t.scheduledDate.getTime()).toBeLessThan(cosecha.scheduledDate.getTime())
  })

  it('sin floraDays el cronograma es el de siempre (8 semanas, cosecha +56)', () => {
    const p = planta({ floraStartDate: addDays(inicio, 40) })
    const tareas = generatePlantSchedule(p, REVEGETAR_TABLE)
    expect(Math.max(...tareas.filter((t) => t.cycle === 'flora').map((t) => t.week))).toBe(8)
    expect(tareas.find((t) => t.type === 'harvest')!.scheduledDate.getTime()).toBe(addDays(p.floraStartDate!, 56).getTime())
  })

  it('auto con floracion desde el dia 28: la primera tarea de flora cae ese dia', () => {
    const p = planta({ geneticType: 'autoflower', autoFlowerTotalDays: 70, autoFloraStartDay: 28, floraDays: 42 })
    const tareas = generatePlantSchedule(p, REVEGETAR_TABLE)
    const flora = tareas.filter((t) => t.cycle === 'flora' && t.type !== 'harvest')
    expect(Math.min(...flora.map((t) => t.scheduledDate.getTime()))).toBe(addDays(inicio, 28).getTime())
    expect(tareas.find((t) => t.type === 'harvest')!.scheduledDate.getTime()).toBe(addDays(inicio, 70).getTime())
  })
})

describe('utilidades con floracion personalizada', () => {
  const p = planta({ floraStartDate: inicio, floraDays: 63 })

  it('cosecha estimada = floraStart + floraDays', () => {
    expect(getEstimatedHarvestDate(p)?.getTime()).toBe(addDays(inicio, 63).getTime())
  })

  it('semana actual: ultima semana es limpieza y despues del ciclo no hay semana', () => {
    expect(getCurrentWeek(p, addDays(inicio, 0))).toMatchObject({ week: 1, stage: 'stretch' })
    expect(getCurrentWeek(p, addDays(inicio, 62))).toMatchObject({ cycle: 'flora', week: 9, stage: 'flushing' })
    expect(getCurrentWeek(p, addDays(inicio, 63))).toBeNull()
  })

  it('progreso de flora se mide contra floraDays', () => {
    expect(getCycleProgress(p, addDays(inicio, 63))).toEqual({ progress: 1, phase: 'flora' })
    expect(getCycleProgress(p, addDays(inicio, 21))?.progress).toBeCloseTo(21 / 63)
  })

  it('auto: el dia de floracion configurable mueve la etapa y el progreso vegetativo', () => {
    const a = planta({ geneticType: 'autoflower', autoFloraStartDay: 28 })
    expect(getCurrentWeek(a, addDays(inicio, 27))?.cycle).toBe('vege')
    expect(getCurrentWeek(a, addDays(inicio, 28))).toMatchObject({ cycle: 'flora', week: 1 })
    expect(getCycleProgress(a, addDays(inicio, 14))?.progress).toBeCloseTo(14 / 28)
  })

  it('rangos EC/pH para una semana intermedia de una flora larga existen y vienen de la tabla', () => {
    const r = getRangesForDate(p, REVEGETAR_TABLE, addDays(inicio, 30))
    expect(r).not.toBeNull()
    expect(REVEGETAR_TABLE.floraWeeks.some((w) => w.ecMax === r!.ecMax)).toBe(true)
  })
})

describe('autofloreciente: ciclo activo sin floraStartDate', () => {
  const auto = (diasDesdeSiembra: number) => {
    const hoy = addDays(inicio, diasDesdeSiembra)
    return { p: planta({ geneticType: 'autoflower', autoFlowerTotalDays: 75 }), hoy }
  }

  it('antes del dia 35 esta en vegetativo; desde el dia 35, en floracion', () => {
    expect(getActiveCycle(auto(34).p, auto(34).hoy)).toBe('vege')
    expect(getActiveCycle(auto(35).p, auto(35).hoy)).toBe('flora')
    expect(getActiveCycle(auto(76).p, auto(76).hoy)).toBe('flora') // caso real: planta "Ww" a los 76 dias
  })

  it('getFloraStart: autos = siembra + autoFloraStartDay; fotoperiodica sin fecha = undefined', () => {
    expect(getFloraStart(planta({ geneticType: 'autoflower' }))?.getTime()).toBe(addDays(inicio, 35).getTime())
    expect(getFloraStart(planta({ geneticType: 'autoflower', autoFloraStartDay: 28 }))?.getTime()).toBe(addDays(inicio, 28).getTime())
    expect(getFloraStart(planta({ geneticType: 'feminized' }))).toBeUndefined()
  })

  it('fotoperiodica: flora solo cuando se registro floraStartDate', () => {
    const hoy = addDays(inicio, 80)
    expect(getActiveCycle(planta({ geneticType: 'feminized' }), hoy)).toBe('vege')
    expect(getActiveCycle(planta({ geneticType: 'feminized', floraStartDate: addDays(inicio, 50) }), hoy)).toBe('flora')
  })
})

describe('autofloreciente: el cronograma termina el dia de cosecha', () => {
  it('con la floracion por defecto (56 dias) y cosecha al dia 75: nada despues de la cosecha', () => {
    const p = planta({ geneticType: 'autoflower', autoFlowerTotalDays: 75 })
    const tareas = generatePlantSchedule(p, REVEGETAR_TABLE)
    const cosecha = tareas.find((t) => t.type === 'harvest')!
    expect(cosecha.scheduledDate.getTime()).toBe(addDays(inicio, 75).getTime())
    for (const t of tareas) expect(t.scheduledDate.getTime()).toBeLessThanOrEqual(cosecha.scheduledDate.getTime())
  })

  it('la tarea de cosecha lleva la semana de floracion real (dia 75 = semana 6 de flora), no la ultima de la tabla', () => {
    const p = planta({ geneticType: 'autoflower', autoFlowerTotalDays: 75 })
    const cosecha = generatePlantSchedule(p, REVEGETAR_TABLE).find((t) => t.type === 'harvest')!
    expect(cosecha.week).toBe(6)
  })
})

describe('siembra planificada', () => {
  const hoy = new Date(2026, 0, 1, 15, 30) // a media tarde: la comparacion es por dia, no por hora

  it('daysUntilSowing cuenta dias de calendario y nunca es negativo', () => {
    expect(daysUntilSowing(planta({ startDate: new Date(2026, 0, 1) }), hoy)).toBe(0)
    expect(daysUntilSowing(planta({ startDate: new Date(2026, 0, 2) }), hoy)).toBe(1)
    expect(daysUntilSowing(planta({ startDate: new Date(2026, 0, 31) }), hoy)).toBe(30)
    expect(daysUntilSowing(planta({ startDate: new Date(2025, 11, 1) }), hoy)).toBe(0)
  })

  it('isPlanned: solo plantas activas con inicio futuro', () => {
    expect(isPlanned(planta({ startDate: new Date(2026, 0, 2) }), hoy)).toBe(true)
    expect(isPlanned(planta({ startDate: new Date(2026, 0, 1) }), hoy)).toBe(false)
    expect(isPlanned(planta({ startDate: new Date(2026, 0, 2), status: 'discarded' }), hoy)).toBe(false)
  })

  it('antes de sembrar no hay semana ni etapa, y el progreso es 0', () => {
    const p = planta({ startDate: addDays(hoy, 10) })
    expect(getCurrentWeek(p, hoy)).toBeNull()
    expect(getCycleProgress(p, hoy)).toEqual({ progress: 0, phase: 'vege' })
  })

  it('el cronograma arranca el dia de la siembra y la cosecha cuenta desde esa fecha', () => {
    const siembra = addDays(hoy, 30)
    const p = planta({ geneticType: 'autoflower', autoFlowerTotalDays: 75, startDate: siembra })
    const tareas = generatePlantSchedule(p, REVEGETAR_TABLE)
    expect(Math.min(...tareas.map((t) => t.scheduledDate.getTime()))).toBe(siembra.getTime())
    expect(getEstimatedHarvestDate(p)?.getTime()).toBe(addDays(siembra, 75).getTime())
  })
})
