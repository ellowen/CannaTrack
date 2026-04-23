/* Validation script */
import {
  REVEGETAR_TABLE,
  calculateLevel,
  calculateXP,
  shouldResetStreak,
} from "./src/index";

console.log("=== REVEGETAR_TABLE Validation ===");
console.log(
  `vegeWeeks.length: ${REVEGETAR_TABLE.vegeWeeks.length} (should be 6)`
);
console.log(
  `floraWeeks.length: ${REVEGETAR_TABLE.floraWeeks.length} (should be 8)`
);
console.log(
  `Total weeks: ${REVEGETAR_TABLE.vegeWeeks.length + REVEGETAR_TABLE.floraWeeks.length}`
);

console.log("\n=== calculateLevel Validation ===");
console.log(`calculateLevel(0): ${calculateLevel(0)} (should be 1)`);
console.log(`calculateLevel(99): ${calculateLevel(99)} (should be 1)`);
console.log(`calculateLevel(100): ${calculateLevel(100)} (should be 2)`);
console.log(`calculateLevel(200): ${calculateLevel(200)} (should be 3)`);

console.log("\n=== calculateXP Validation ===");
console.log(`calculateXP('nutrition'): ${calculateXP("nutrition")} (should be 10)`);
console.log(`calculateXP('irrigation'): ${calculateXP("irrigation")} (should be 5)`);
console.log(`calculateXP('foliar'): ${calculateXP("foliar")} (should be 8)`);
console.log(
  `calculateXP('observation'): ${calculateXP("observation")} (should be 3)`
);
console.log(`calculateXP('harvest'): ${calculateXP("harvest")} (should be 50)`);

console.log("\n=== shouldResetStreak Validation ===");
console.log(`shouldResetStreak(null): ${shouldResetStreak(null)} (should be false)`);

console.log("\nAll validations complete!");
