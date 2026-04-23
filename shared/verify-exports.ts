/* Verify all exports are available */
import type {
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
} from "./src/index";

import type {
  UserSlice,
  PlantSlice,
  TaskSlice,
  NutritionSlice,
  SyncSlice,
  RootState,
} from "./src/index";

import {
  CYCLE_PHASES,
  PLANT_STAGES,
  GENETIC_TYPES,
  PLANT_SEXES,
  PLANT_STATUSES,
  TASK_TYPES,
  ACCESS_TIERS,
  BRAND_PLANS,
  REVEGETAR_TABLE,
  calculateXP,
  calculateLevel,
  shouldResetStreak,
  calculateStreakBonus,
  getXPWithStreakBonus,
  createNutritionIndex,
  getNutritionWeek,
  isValidEC,
  isValidPH,
  validateWeekMetrics,
  getDoseRange,
} from "./src/index";

console.log("✓ All type imports successful");
console.log("✓ All constant imports successful");
console.log("✓ All function imports successful");

// Quick verification
console.log(`\nRevegetal table has ${REVEGETAR_TABLE.lines.length} lines`);
console.log(`Cycle phases: ${CYCLE_PHASES.join(", ")}`);
console.log(`Plant stages: ${PLANT_STAGES.slice(0, 3).join(", ")}...`);
console.log(`Task types: ${TASK_TYPES.join(", ")}`);

console.log("\n✓ Export verification complete!");
