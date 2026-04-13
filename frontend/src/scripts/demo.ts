import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { generatePlantSchedule } from '../lib/nutrition-engine'
import { getUpcomingTasks, getEstimatedHarvestDate } from '../lib/nutrition-utils'
import { REVEGETAR_TABLE } from '../data/revegetar-table'
import type { Plant, ScheduledTask } from '../types/plant'

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmtFecha(d: Date): string {
  return format(d, "d 'de' MMMM yyyy", { locale: es })
}

function fmtLabel(t: ScheduledTask): string {
  const ciclo = t.cycle === 'vege' ? 'VEGE' : 'FLORA'
  const semana = t.cycle === 'vege' ? `S${t.week}` : `F${t.week}`
  const tipo =
    t.type === 'nutrition'   ? 'NUTRICIÓN' :
    t.type === 'irrigation'  ? 'RIEGO SIMPLE' :
    t.type === 'observation' ? 'OBSERVACIÓN' :
    t.type === 'harvest'     ? '🌿 COSECHA' :
    t.type.toUpperCase()
  return `[${ciclo} ${semana}] ${tipo}`
}

function imprimirTarea(t: ScheduledTask, potVolLitros: number): void {
  console.log(`\n📅 ${fmtFecha(t.scheduledDate)}  ${fmtLabel(t)}`)

  if (t.type === 'nutrition' && t.products.length > 0) {
    t.products.forEach(p => {
      const minTotal = (p.minDose * potVolLitros).toFixed(2).replace(/\.?0+$/, '')
      const maxTotal = (p.maxDose * potVolLitros).toFixed(2).replace(/\.?0+$/, '')
      const rango = p.minDose === p.maxDose
        ? `${p.minDose} ${p.unit}/L  →  ${maxTotal} ${p.unit} total`
        : `${p.minDose}–${p.maxDose} ${p.unit}/L  →  ${minTotal}–${maxTotal} ${p.unit} total`
      console.log(`   • ${p.name}: ${rango}`)
    })
    if (t.ecMin !== undefined) {
      console.log(`   EC: ${t.ecMin}–${t.ecMax} | PH: ${t.phMin}–${t.phMax}`)
    }
  }

  if (t.type === 'irrigation') {
    const ph = t.phMin !== undefined ? ` | PH: ${t.phMin}–${t.phMax}` : ''
    console.log(`   Solo agua${ph}`)
  }

  if (t.type === 'observation') {
    console.log('   Medir altura y registrar estado general')
  }
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

const hoy = new Date()

console.log('\n🌿 CannaTrack — Demo del motor nutricional')
console.log('==========================================')

// ── Planta 1: Feminizada con floración programada ─────────────────────────────

const floraWhiteWidow = addDays(hoy, 35)

const whiteWidow: Plant = {
  id: 'ww-1',
  name: 'White Widow #1',
  genetics: 'White Widow',
  geneticType: 'feminized',
  sex: 'unknown',
  startDate: hoy,
  floraStartDate: floraWhiteWidow,
  location: 'indoor',
  potCount: 1,
  potVolumeLiters: 5,
  nutritionTableId: 'revegetar-v1',
  status: 'active',
}

const tareasWW = generatePlantSchedule(whiteWidow, REVEGETAR_TABLE)
const cosechaWW = getEstimatedHarvestDate(whiteWidow)
const proximasWW = getUpcomingTasks(tareasWW, hoy, 10)

console.log(`\nPlanta: ${whiteWidow.name} (Feminizada)`)
console.log(`Inicio VEGE:   ${fmtFecha(hoy)}`)
console.log(`Inicio FLORA:  ${fmtFecha(floraWhiteWidow)}`)
console.log(`Cosecha est.:  ${cosechaWW ? fmtFecha(cosechaWW) : 'N/A'}`)
console.log(`Total tareas:  ${tareasWW.length}`)
console.log('\nPróximas 10 tareas:')
console.log('──────────────────────────────────────────')

proximasWW.forEach(t => imprimirTarea(t, whiteWidow.potVolumeLiters ?? 5))

// ── Planta 2: Autofloreciente ─────────────────────────────────────────────────

const criticalAuto: Plant = {
  id: 'ca-1',
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

const tareasAuto = generatePlantSchedule(criticalAuto, REVEGETAR_TABLE)
const cosechaAuto = getEstimatedHarvestDate(criticalAuto)
const floraAutoDate = addDays(hoy, 35)

console.log('\n\n==========================================')
console.log(`Planta: ${criticalAuto.name} (Autofloreciente, ${criticalAuto.autoFlowerTotalDays} días)`)
console.log(`Inicio:                ${fmtFecha(hoy)}`)
console.log(`Flora automática desde: ${fmtFecha(floraAutoDate)}`)
console.log(`Cosecha estimada:       ${cosechaAuto ? fmtFecha(cosechaAuto) : 'N/A'}`)
console.log(`Total tareas generadas: ${tareasAuto.length}`)
console.log('==========================================\n')
