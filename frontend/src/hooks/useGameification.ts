import { useMemo } from 'react'
import { useUserStore } from '@/store/userStore'
import { getLevelInfo } from '@/lib/gamification'
import type { LevelInfo } from '@/lib/gamification'

export interface GameificationData {
  xp: number
  level: LevelInfo
  streak: number
  bestStreak: number
  nextLevelXP: number
}

/**
 * Hook de solo lectura sobre el estado de gamificacion (xp/streak) cacheado
 * en userStore, sincronizado desde profiles.xp/streak_days (fuente de
 * verdad real: Supabase). No expone forma de otorgar XP local — eso solo
 * debe pasar via completeTaskInSupabase() + applyTaskReward() con el
 * premio real que devuelve la RPC de la DB.
 */
export function useGameification(): GameificationData {
  const { totalXP, streak, bestStreak } = useUserStore((state) => ({
    totalXP: state.totalXP,
    streak: state.streak,
    bestStreak: state.bestStreak,
  }))

  const level = useMemo(() => getLevelInfo(totalXP), [totalXP])

  const nextLevelXP = useMemo(() => {
    return level.next ? level.next.xpRequired - totalXP : 0
  }, [level, totalXP])

  return {
    xp: totalXP,
    level,
    streak,
    bestStreak,
    nextLevelXP,
  }
}
