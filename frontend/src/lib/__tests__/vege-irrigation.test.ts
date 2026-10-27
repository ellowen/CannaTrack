import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import { generatePlantSchedule } from '../nutrition-engine'
import { awaitingFloraStart, getCurrentWeek, getCycleProgress, getRangesForDate } from '../nutrition-utils'
import { irrigationOffsets, scaleVegeWeeks, stageForVegeWeek, vegeWeekCount } from '../flora-cycle'
import { calculatePlantHealth } from '../gamification'
import { mergeRegeneratedSchedule } from '../schedule-merge'
import { REVEGETAR_TABLE } from '../../data/revegetar-table'
import type { Plant, ScheduledTask } from '../../types/plant'

const inicio = new Date(2026, 0, 1)
const planta = (o: Partial<Plant> = {}): Plant => ({
  id: 'p', name: 'x', genetics: 'g', geneticType: 'feminized', sex: 'unknown', startDate: inicio,
  location: 'outdoor', potCount: 1, potVolumeLiters: 20, nutritionTableId: REVEGETAR_TABLE.id, status: 'active', ...o,
})
const riegos = (t: ScheduledTask[], ciclo: string, semana: number) =>
  t.filter((x) => x.type === 'irrigation' && x.cycle === ciclo && x.week === semana)

describe('riegos por semana', () => {
  it('por defecto: 2 por semana (dias 2 y 4) y 3 en limpieza (0, 2 y 4)', () => {
    expect(irrigationOffsets(undefined, false)).toEqual([2, 4])
    expect(irrigationOffsets(undefined, true)).toEqual([0, 2, 4])
  })

  it('con irrigationPerWeek = N cada semana tiene exactamente N riegos, en dias distintos', () => {
    for (let n = 1; n <= 7; n++) {
      const tareas = generatePlantSchedule(planta({ irrigationPerWeek: n, floraStartDate: addDays(inicio, 42) }), REVEGETAR_TABLE)
      for (const [ciclo, semana] of [['vege', 1], ['vege', 4], ['flora', 2], ['flora', 8]] as const) {
        const r = riegos(tareas, ciclo, semana)
        expect(r, `${n}/sem ${ciclo} ${semana}`).toHaveLength(n)
        expect(new Set(r.map((x) => x.scheduledDate.getTime())).size).toBe(n)
      }
    }
  })

  it('el valor se acota a 1-7 y los riegos siempre caen dentro de la semana', () => {
    expect(irrigationOffsets(0, false)).toEqual(irrigationOffsets(1, false))
    expect(irrigationOffsets(99, false)).toEqual(irrigationOffsets(7, false))
    for (let n = 1; n <= 7; n++) for (const d of irrigationOffsets(n, false)) { expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThanOrEqual(6) }
  })

  it('sin configurar el calendario es identico al historico', () => {
    const base = generatePlantSchedule(planta({ floraStartDate: addDays(inicio, 42) }), REVEGETAR_TABLE)
    expect(riegos(base, 'vege', 1)).toHaveLength(2)
    expect(riegos(base, 'flora', 8)).toHaveLength(3)
  })
})

describe('vegetativo configurable', () => {
  it('vegeWeekCount y etapas: empieza en rooting y termina en preflower', () => {
    expect([42, 56, 84, 90].map(vegeWeekCount)).toEqual([6, 8, 12, 13])
    for (const total of [4, 6, 8, 12, 13]) {
      const etapas = Array.from({ length: total }, (_, i) => stageForVegeWeek(i, total))
      expect(etapas[0]).toBe('rooting')
      expect(etapas[total - 1]).toBe('preflower')
    }
  })

  it('con la duracion de la tabla devuelve las semanas intactas', () => {
    expect(scaleVegeWeeks(REVEGETAR_TABLE.vegeWeeks, 42)).toBe(REVEGETAR_TABLE.vegeWeeks)
  })

  it('84 dias: 12 semanas numeradas desde 0 y contiguas, la ultima termina el dia 84', () => {
    const w = scaleVegeWeeks(REVEGETAR_TABLE.vegeWeeks, 84)
    expect(w.map((x) => x.week)).toEqual(Array.from({ length: 12 }, (_, i) => i))
    for (let i = 1; i < w.length; i++) expect(w[i].dayStart).toBe(w[i - 1].dayEnd)
    expect(w[11].dayEnd).toBe(84)
  })

  it('el cronograma cubre todo el vegetativo configurado', () => {
    const tareas = generatePlantSchedule(planta({ vegeDays: 84, floraStartDate: addDays(inicio, 84) }), REVEGETAR_TABLE)
    expect(Math.max(...tareas.filter((t) => t.cycle === 'vege').map((t) => t.week))).toBe(11)
    const defecto = generatePlantSchedule(planta({ floraStartDate: addDays(inicio, 42) }), REVEGETAR_TABLE)
    expect(Math.max(...defecto.filter((t) => t.cycle === 'vege').map((t) => t.week))).toBe(5)
  })

  it('semana/etapa actual: con vegeDays 84 el dia 70 sigue en vegetativo; por defecto ya no hay semana', () => {
    expect(getCurrentWeek(planta({ vegeDays: 84 }), addDays(inicio, 70))).toMatchObject({ cycle: 'vege', week: 10 })
    expect(getCurrentWeek(planta(), addDays(inicio, 70))).toBeNull()
    expect(getCurrentWeek(planta({ vegeDays: 84 }), addDays(inicio, 83))?.stage).toBe('preflower')
  })

  it('el aviso de "registra la floracion" espera a que termine el vegetativo configurado', () => {
    const hace60 = addDays(new Date(), -60)
    expect(awaitingFloraStart(planta({ startDate: hace60 }))).toBe(true)
    expect(awaitingFloraStart(planta({ startDate: hace60, vegeDays: 84 }))).toBe(false)
  })

  it('progreso del vegetativo y rangos EC/pH se miden contra el vegetativo configurado', () => {
    expect(getCycleProgress(planta({ vegeDays: 84 }), addDays(inicio, 42))?.progress).toBeCloseTo(0.5)
    expect(getRangesForDate(planta({ vegeDays: 84 }), REVEGETAR_TABLE, addDays(inicio, 80))).not.toBeNull()
  })

  it('las autos no cambian: su vegetativo es autoFloraStartDay', () => {
    const auto = planta({ geneticType: 'autoflower', autoFlowerTotalDays: 75 })
    expect(getCurrentWeek(auto, addDays(inicio, 34))?.cycle).toBe('vege')
    expect(getCurrentWeek(auto, addDays(inicio, 35))?.cycle).toBe('flora')
  })
})

describe('tareas canceladas', () => {
  const t = (over: Partial<ScheduledTask>): ScheduledTask => ({
    id: Math.random().toString(), plantId: 'p', type: 'irrigation', scheduledDate: addDays(new Date(), -3),
    cycle: 'vege', week: 0, stage: 'rooting', products: [], completed: false, ...over,
  })

  it('no penalizan la salud: una cancelada no cuenta como incumplida', () => {
    const hechas = [t({ completed: true }), t({ completed: true })]
    expect(calculatePlantHealth([...hechas, t({})])).toBe(67)
    expect(calculatePlantHealth([...hechas, t({ skipped: true })])).toBe(100)
  })

  it('al regenerar, las canceladas y las movidas se conservan y no reaparecen', () => {
    const generado = generatePlantSchedule(planta(), REVEGETAR_TABLE)
    const riego = generado.find((x) => x.type === 'irrigation')!
    const cancelada = { ...riego, skipped: true, skipReason: 'Llovió' }
    const movida = { ...generado.find((x) => x.type === 'nutrition')!, rescheduledFrom: inicio, scheduledDate: addDays(inicio, 1) }
    const { all, completed } = mergeRegeneratedSchedule([cancelada, movida], generatePlantSchedule(planta(), REVEGETAR_TABLE))
    expect(completed.map((x) => x.id).sort()).toEqual([cancelada.id, movida.id].sort())
    expect(all.length).toBe(generado.length)
    expect(all.find((x) => x.id === cancelada.id)?.skipped).toBe(true)
  })
})
