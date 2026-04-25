import { useMemo, useCallback } from 'react'
import { useUserStore } from '@/store/userStore'
import { getLevelInfo, XP } from '@/lib/gamification'
import type { LevelInfo } from '@/lib/gamification'

export interface GameificationData {
  xp: number
  level: LevelInfo
  streak: number
  bestStreak: number
  nextLevelXP: number
  streakBonus: number
  celebrateXP: (amount: number) => void
}

/**
 * Hook que expone el estado de gamificación desde userStore.
 * Calcula nivel actual, progreso hacia el siguiente, y proporciona
 * función celebrateXP() para disparar animaciones/toast.
 * Memoizado para evitar recálculos de nivel.
 */
export function useGameification(): GameificationData {
  const { totalXP, streak, bestStreak, addXP } = useUserStore((state) => ({
    totalXP: state.totalXP,
    streak: state.streak,
    bestStreak: state.bestStreak,
    addXP: state.addXP,
  }))

  // Calcular nivel actual y progreso
  const level = useMemo(() => getLevelInfo(totalXP), [totalXP])

  // XP necesario para el siguiente nivel
  const nextLevelXP = useMemo(() => {
    return level.next
      ? level.next.xpRequired - totalXP
      : 0
  }, [level, totalXP])

  // Streak bonus si está activo
  const streakBonus = useMemo(() => {
    if (streak === 7) return XP.STREAK_7_BONUS
    if (streak === 30) return XP.STREAK_30_BONUS
    return 0
  }, [streak])

  // Agregar XP y disparar celebración
  const celebrateXP = useCallback((amount: number) => {
    const result = addXP(amount)

    // Disparar evento para toast/animación si existe
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('xp-earned', {
        detail: {
          amount: result.xpGained,
          streakBonus: result.streakBonus,
          newStreak: result.newStreak,
          newLevel: getLevelInfo(totalXP + result.xpGained).current.level,
        },
      })
      window.dispatchEvent(event)
    }
  }, [addXP, totalXP])

  return {
    xp: totalXP,
    level,
    streak,
    bestStreak,
    nextLevelXP,
    streakBonus,
    celebrateXP,
  }
}
