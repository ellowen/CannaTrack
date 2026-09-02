// Etiquetas de etapa para mostrar en UI
export const STAGE_LABELS: Record<string, string> = {
  rooting:   'Enraizamiento',
  growth:    'Crecimiento',
  preflower: 'Prefloración',
  stretch:   'Estiramiento',
  bulking:   'Engorde',
  ripening:  'Maduración',
  flushing:  'Limpieza',
  harvested: 'Cosechada',
}

// Emojis de etapa — identidad visual de cada fase
export const STAGE_EMOJIS: Record<string, string> = {
  rooting:   '🌱',
  growth:    '🌿',
  preflower: '🔆',
  stretch:   '🚀',
  bulking:   '💪',
  ripening:  '🍯',
  flushing:  '💧',
  harvested: '✂️',
}

// Marcas y acceso
export type AccessTier = 'free' | 'pro'
export type BrandPlan = 'listing' | 'whitelabel'

export interface Brand {
  id: string
  name: string
  logoUrl?: string
  website?: string
  plan: BrandPlan
  activeUntil?: Date
}

// Tablas nutricionales
// ProductLine es string libre: cada tabla declara sus propias líneas en NutritionTable.lines
export type ProductLine = string
export type CyclePhase = 'vege' | 'flora'
export type PlantStage =
  | 'rooting' | 'growth' | 'preflower'
  | 'stretch' | 'bulking' | 'ripening' | 'flushing'
  | 'harvested'

export interface NutritionLine {
  id: string          // ej: 'BIO', 'FUEL', 'Profesional'
  name: string        // nombre legible para mostrar
  colorClass: string  // clases Tailwind para el badge (text/bg/border + dark:)
}

export interface ProductDose {
  name: string
  line: ProductLine
  unit: 'ml' | 'gr'
  minDose: number   // por litro — siempre número, nunca string
  maxDose: number
}

export interface NutritionWeek {
  cycle: CyclePhase
  week: number
  dayStart: number
  dayEnd: number
  stage: PlantStage
  products: ProductDose[]
  ecMin: number
  ecMax: number
  phMin: number
  phMax: number
}

export interface NutritionTable {
  id: string
  name: string
  brandId: string | null
  accessTier: AccessTier
  isOfficial: boolean
  geneticTypes: GeneticType[]
  lines: NutritionLine[]   // líneas declaradas por la tabla (BIO/FUEL/... o Profesional/Medio/...)
  vegeWeeks: NutritionWeek[]
  floraWeeks: NutritionWeek[]
  createdAt: Date
  notes?: string
}

// Plantas
export type GeneticType = 'feminized' | 'autoflower' | 'regular'
export type PlantSex = 'unknown' | 'female' | 'male'
export type PlantStatus = 'active' | 'harvested' | 'discarded'
export type TaskType = 'nutrition' | 'irrigation' | 'foliar' | 'observation' | 'harvest'

// Tipo de cultivo. 'cannabis' es el unico valor usado hoy -- el string abierto
// deja lugar a futuros cultivos sin forzar un enum cerrado todavia.
// Ausente = planta existente/actual = tratar como 'cannabis'.
// Corresponde a plants.crop_type (migracion 20260810000000_plants_crop_type.sql,
// aplicada a produccion el 2026-08-10).
export type CropType = 'cannabis' | string

export interface Plant {
  id: string
  name: string
  cropType?: CropType
  genetics: string
  // Opcionales: geneticType/sex son obligatorios SOLO para cannabis. La
  // migracion 20260810000000_plants_crop_type.sql refleja esta misma regla
  // a nivel de base (CHECK plants_cannabis_requires_genetic_type). No
  // confiar solo en el tipo -- usar isValidPlant() antes de persistir.
  geneticType?: GeneticType
  sex?: PlantSex
  startDate: Date
  floraStartDate?: Date
  endDate?: Date
  autoFlowerTotalDays?: number   // default 75
  location: 'indoor' | 'outdoor'
  growMedium?: 'soil' | 'coco' | 'hydro'
  potCount: number
  potVolumeLiters?: number
  nutritionTableId: string
  availableProducts?: string[]   // undefined = usar todos los productos de la tabla
  customProducts?: ProductDose[] // productos del usuario, no ligados a ninguna tabla
  status: PlantStatus
  notes?: string
}

// Regla de negocio: cannabis (cropType ausente o 'cannabis') requiere
// geneticType. Cualquier otro cropType puede omitirlo. Espeja el CHECK
// plants_cannabis_requires_genetic_type de la migracion de Supabase
// (Fase 3, ya aplicada a produccion).
export function isValidPlant(plant: Pick<Plant, 'cropType' | 'geneticType'>): boolean {
  const cropType = plant.cropType ?? 'cannabis'
  if (cropType === 'cannabis') return plant.geneticType !== undefined
  return true
}

// Punto unico de verdad para "esta planta usa la logica/UI de cannabis".
// cropType ausente = planta existente antes de la Fase 4 = cannabis.
// Usado por nutrition-utils.ts (fase/floracion) y por la UI (PlantForm,
// Home, PlantDetail) para no mostrar/calcular nada cannabis-especifico
// cuando corresponde a otro cultivo.
export function isCannabisPlant(plant: Pick<Plant, 'cropType'>): boolean {
  return (plant.cropType ?? 'cannabis') === 'cannabis'
}

export interface ScheduledTask {
  id: string
  plantId: string
  type: TaskType
  scheduledDate: Date
  cycle: CyclePhase
  week: number
  stage: PlantStage
  products: ProductDose[]
  ecMin?: number
  ecMax?: number
  phMin?: number
  phMax?: number
  completed: boolean
  completedAt?: Date
  completionNotes?: string
  xpAwarded?: boolean   // true si esta tarea ya otorgo XP alguna vez (evita re-farmear con deshacer)
}
