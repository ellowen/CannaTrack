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
export type ProductLine = 'BIO' | 'ECO' | 'LIFE' | 'FUEL'
export type CyclePhase = 'vege' | 'flora'
export type PlantStage =
  | 'rooting' | 'growth' | 'preflower'
  | 'stretch' | 'bulking' | 'ripening' | 'flushing'
  | 'harvested'

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

export interface Plant {
  id: string
  name: string
  genetics: string
  geneticType: GeneticType
  sex: PlantSex
  startDate: Date
  floraStartDate?: Date
  autoFlowerTotalDays?: number   // default 75
  location: 'indoor' | 'outdoor'
  potCount: number
  potVolumeLiters?: number
  nutritionTableId: string
  availableProducts?: string[]   // undefined = usar todos los productos de la tabla
  customProducts?: ProductDose[] // productos del usuario, no ligados a ninguna tabla
  status: PlantStatus
  notes?: string
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
}
