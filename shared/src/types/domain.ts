/* ============================================================================
 * DOMAIN TYPES — Tipos de negocio compartidos (frontend + mobile + backend)
 * ============================================================================ */

/* --- ENUMERATIONS Y CONSTANTES TIPO --- */

export const CYCLE_PHASES = ["vege", "flora"] as const;
export type CyclePhase = (typeof CYCLE_PHASES)[number];

export const PLANT_STAGES = [
  "rooting",
  "growth",
  "preflower",
  "stretch",
  "bulking",
  "ripening",
  "flushing",
  "harvested",
] as const;
export type PlantStage = (typeof PLANT_STAGES)[number];

export const GENETIC_TYPES = ["feminized", "autoflower", "regular"] as const;
export type GeneticType = (typeof GENETIC_TYPES)[number];

export const PLANT_SEXES = ["unknown", "female", "male"] as const;
export type PlantSex = (typeof PLANT_SEXES)[number];

export const PLANT_STATUSES = ["active", "harvested", "discarded"] as const;
export type PlantStatus = (typeof PLANT_STATUSES)[number];

export const TASK_TYPES = [
  "nutrition",
  "irrigation",
  "foliar",
  "observation",
  "harvest",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const ACCESS_TIERS = ["free", "pro"] as const;
export type AccessTier = (typeof ACCESS_TIERS)[number];

export const BRAND_PLANS = ["listing", "whitelabel"] as const;
export type BrandPlan = (typeof BRAND_PLANS)[number];

/* --- NUTRITION DOMAIN --- */

export type ProductLine = string;

export interface ProductDose {
  name: string;
  line: ProductLine;
  unit: "ml" | "gr";
  minDose: number;
  maxDose: number;
}

export interface NutritionLine {
  id: string;
  name: string;
  colorClass: string;
}

export interface NutritionWeek {
  cycle: CyclePhase;
  week: number;
  dayStart: number;
  dayEnd: number;
  stage: PlantStage;
  products: ProductDose[];
  ecMin: number;
  ecMax: number;
  phMin: number;
  phMax: number;
}

export interface NutritionTable {
  id: string;
  name: string;
  brandId: string | null;
  accessTier: AccessTier;
  isOfficial: boolean;
  geneticTypes: GeneticType[];
  lines: NutritionLine[];
  vegeWeeks: NutritionWeek[];
  floraWeeks: NutritionWeek[];
  createdAt: Date;
  notes?: string;
}

/* --- PLANT DOMAIN --- */

export interface Plant {
  id: string;
  userId: string;
  name: string;
  genetics: string;
  geneticType: GeneticType;
  sex: PlantSex;
  startDate: Date;
  floraStartDate?: Date;
  autoFlowerTotalDays?: number;
  location: "indoor" | "outdoor";
  potCount: number;
  potVolumeLiters?: number;
  nutritionTableId: string;
  availableProducts?: string[];
  customProducts?: ProductDose[];
  status: PlantStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* --- TASK DOMAIN --- */

export interface ScheduledTask {
  id: string;
  plantId: string;
  type: TaskType;
  scheduledDate: Date;
  cycle: CyclePhase;
  week: number;
  stage: PlantStage;
  products: ProductDose[];
  ecMin?: number;
  ecMax?: number;
  phMin?: number;
  phMax?: number;
  completed: boolean;
  completedAt?: Date;
  completionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* --- GAMIFICATION DOMAIN --- */

export interface XPLog {
  id: string;
  userId: string;
  taskType: TaskType;
  xpEarned: number;
  streakBonus: number;
  totalXP: number;
  completedAt: Date;
}

export interface Streak {
  userId: string;
  count: number;
  lastActionDate: Date;
  maxStreak: number;
}

export interface GameState {
  userId: string;
  totalXP: number;
  level: number;
  streak: Streak;
  xpLogs: XPLog[];
  updatedAt: Date;
}

/* --- USER DOMAIN --- */

export type UserState = "onboarding" | "active" | "paused";

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  accessTier: AccessTier;
  state: UserState;
  gameState: GameState;
  createdAt: Date;
  updatedAt: Date;
}

/* --- BRAND DOMAIN --- */

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  plan: BrandPlan;
  activeUntil?: Date;
  createdAt: Date;
}
