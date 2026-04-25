/* ============================================================================
 * SHARED — Punto de entrada único para tipos, datos y lógica compartida
 * ============================================================================ */

/* --- DOMAIN TYPES --- */
export type {
  CyclePhase,
  PlantStage,
  GeneticType,
  PlantSex,
  PlantStatus,
  TaskType,
  AccessTier,
  BrandPlan,
  ProductLine,
  ProductDose,
  NutritionLine,
  NutritionWeek,
  NutritionTable,
  Plant,
  ScheduledTask,
  XPLog,
  Streak,
  GameState,
  User,
  UserState,
  Brand,
} from "./types/domain";

export {
  CYCLE_PHASES,
  PLANT_STAGES,
  GENETIC_TYPES,
  PLANT_SEXES,
  PLANT_STATUSES,
  TASK_TYPES,
  ACCESS_TIERS,
  BRAND_PLANS,
} from "./types/domain";

/* --- STATE TYPES --- */
export type {
  UserSlice,
  PlantSlice,
  TaskSlice,
  NutritionSlice,
  SyncSlice,
  RootState,
} from "./types/state";

/* --- NUTRITION DATA --- */
export { REVEGETAR_TABLE } from "./data/REVEGETAR";

/* --- GAMIFICATION LOGIC --- */
export {
  calculateXP,
  calculateLevel,
  shouldResetStreak,
  calculateStreakBonus,
  getXPWithStreakBonus,
} from "./lib/gameification";

/* --- NUTRITION LOOKUP LOGIC --- */
export type { NutritionIndex } from "./lib/nutrition-lookup";
export {
  createNutritionIndex,
  getNutritionWeek,
  isValidEC,
  isValidPH,
  validateWeekMetrics,
  getDoseRange,
} from "./lib/nutrition-lookup";
