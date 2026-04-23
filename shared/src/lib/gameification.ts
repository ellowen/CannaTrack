/* ============================================================================
 * GAMIFICATION — Lógica pura de XP, levels y streaks
 * ============================================================================ */

import type { TaskType } from "../types/domain";
import { differenceInDays } from "date-fns";

/**
 * Calcula XP ganado por tipo de tarea
 *
 * @param taskType Tipo de tarea completada
 * @returns XP ganado
 *
 * @example
 * calculateXP('nutrition') // => 10
 * calculateXP('harvest') // => 50
 */
export function calculateXP(taskType: TaskType): number {
  const xpMap: Record<TaskType, number> = {
    nutrition: 10,
    irrigation: 5,
    foliar: 8,
    observation: 3,
    harvest: 50,
  };
  return xpMap[taskType];
}

/**
 * Calcula level basado en XP total
 *
 * Formula: level = floor(xp / 100) + 1
 *
 * @param xp XP total acumulado
 * @returns Nivel (mínimo 1)
 *
 * @example
 * calculateLevel(0) // => 1
 * calculateLevel(99) // => 1
 * calculateLevel(100) // => 2
 * calculateLevel(200) // => 3
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/**
 * Determina si el streak se debe resetear
 *
 * El streak se resetea si la última acción fue más de 1 día atrás
 *
 * @param lastActionDate Fecha de última acción (null si es primera)
 * @returns true si el streak debe resetearse
 *
 * @example
 * shouldResetStreak(null) // => false (primera acción)
 * shouldResetStreak(today) // => false
 * shouldResetStreak(yesterday) // => false
 * shouldResetStreak(2 days ago) // => true
 */
export function shouldResetStreak(lastActionDate: Date | null): boolean {
  if (lastActionDate === null) return false;
  const daysSinceLastAction = differenceInDays(new Date(), lastActionDate);
  return daysSinceLastAction > 1;
}

/**
 * Calcula bonus de XP por streak
 *
 * Cada 5 días consecutivos suma +5 XP extra
 * Ejemplo: 5 días = +5, 10 días = +10, 15 días = +15
 *
 * @param streak Número de días en streak
 * @returns XP bonus adicional
 *
 * @example
 * calculateStreakBonus(0) // => 0
 * calculateStreakBonus(4) // => 0
 * calculateStreakBonus(5) // => 5
 * calculateStreakBonus(10) // => 10
 * calculateStreakBonus(14) // => 10
 * calculateStreakBonus(15) // => 15
 */
export function calculateStreakBonus(streak: number): number {
  if (streak < 5) return 0;
  return Math.floor(streak / 5) * 5;
}

/**
 * Calcula XP total incluyendo bonus de streak
 *
 * @param taskType Tipo de tarea
 * @param streakBonus Bonus acumulado por streak
 * @returns XP total a otorgar
 *
 * @example
 * getXPWithStreakBonus('nutrition', 0) // => 10
 * getXPWithStreakBonus('nutrition', 5) // => 15
 * getXPWithStreakBonus('harvest', 10) // => 60
 */
export function getXPWithStreakBonus(
  taskType: TaskType,
  streakBonus: number
): number {
  return calculateXP(taskType) + streakBonus;
}
