import { describe, it, expect } from 'vitest'
import { getCurrentWeek, getCycleProgress, awaitingFloraStart } from '../nutrition-utils'
import type { Plant } from '../../types/plant'

// Fase 4 -- confirma que las plantas genericas (cropType != cannabis) no
// heredan fase/alerta de floracion de cannabis solo por el paso de los
// dias, y que cannabis sigue comportandose exactamente igual que antes.

const hoy = new Date('2024-03-01')

const plantaCannabisBase: Plant = {
  id: 'cannabis-1',
  name: 'White Widow #1',
  cropType: 'cannabis',
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

const plantaGenericaBase: Plant = {
  id: 'tomato-1',
  name: 'Tomates cherry',
  cropType: 'tomato',
  genetics: 'Cherry',
  startDate: hoy,
  location: 'outdoor',
  potCount: 1,
  nutritionTableId: '',
  status: 'active',
}

describe('nutrition-utils -- cannabis sin cambios', () => {
  it('getCurrentWeek: cannabis en semana 0 devuelve vege/rooting', () => {
    const week = getCurrentWeek(plantaCannabisBase, hoy)
    expect(week).toEqual({ cycle: 'vege', week: 0, stage: 'rooting' })
  })

  // awaitingFloraStart() no recibe fecha de referencia -- siempre compara
  // startDate contra "ahora" real (Date.now()), no contra `hoy` (fixture
  // fija de 2024). Por eso estos dos casos usan fechas relativas al
  // momento en que corre el test, no la constante `hoy`.
  it('awaitingFloraStart: false recien plantada (startDate = ahora)', () => {
    expect(awaitingFloraStart({ ...plantaCannabisBase, startDate: new Date() })).toBe(false)
  })

  it('awaitingFloraStart: true una vez pasadas las 6 semanas, igual que antes de esta fase', () => {
    const hace43dias = new Date()
    hace43dias.setDate(hace43dias.getDate() - 43)
    expect(awaitingFloraStart({ ...plantaCannabisBase, startDate: hace43dias })).toBe(true)
  })

  it('getCycleProgress: cannabis activa devuelve progreso no nulo', () => {
    const progress = getCycleProgress(plantaCannabisBase, hoy)
    expect(progress).not.toBeNull()
    expect(progress?.phase).toBe('vege')
  })

  it('cropType ausente (planta pre-Fase 4) se sigue tratando como cannabis', () => {
    const plantaSinCropType: Plant = { ...plantaCannabisBase, cropType: undefined }
    const week = getCurrentWeek(plantaSinCropType, hoy)
    expect(week).toEqual({ cycle: 'vege', week: 0, stage: 'rooting' })
  })
})

describe('nutrition-utils -- planta generica (no cannabis)', () => {
  it('getCurrentWeek: siempre null, sin importar los dias transcurridos', () => {
    expect(getCurrentWeek(plantaGenericaBase, hoy)).toBeNull()
    const en100dias = new Date(hoy)
    en100dias.setDate(en100dias.getDate() + 100)
    expect(getCurrentWeek(plantaGenericaBase, en100dias)).toBeNull()
  })

  it('awaitingFloraStart: siempre false, incluso con una fecha de inicio muy vieja', () => {
    const haceMuchoTiempo = new Date('2020-01-01')
    expect(awaitingFloraStart({ ...plantaGenericaBase, startDate: haceMuchoTiempo })).toBe(false)
  })

  it('getCycleProgress: null aunque la planta este activa', () => {
    expect(getCycleProgress(plantaGenericaBase, hoy)).toBeNull()
  })
})
