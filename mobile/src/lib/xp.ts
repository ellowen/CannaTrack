import { supabase } from './supabase'

export const XP_VALUES = {
  COMPLETE_TASK:            15,
  COMPLETE_WITH_MEASUREMENT: 25,
  UPLOAD_PHOTO:             20,
  START_FLORA:              50,
  HARVEST:                 100,
  STREAK_7_BONUS:          200,
  STREAK_30_BONUS:        1000,
} as const

export async function awardXP(userId: string, amount: number): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('xp, streak_days')
    .eq('id', userId)
    .single()

  const newXP = (data?.xp ?? 0) + amount
  await supabase
    .from('profiles')
    .update({ xp: newXP })
    .eq('id', userId)
  return newXP
}

export async function updateStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('xp, streak_days')
    .eq('id', userId)
    .single()

  const currentStreak = (data?.streak_days ?? 0) + 1
  const currentXP     = data?.xp ?? 0

  const updates: Record<string, number> = { streak_days: currentStreak }

  // Bonificaciones por racha
  let bonus = 0
  if (currentStreak === 7)  bonus = XP_VALUES.STREAK_7_BONUS
  if (currentStreak === 30) bonus = XP_VALUES.STREAK_30_BONUS
  if (bonus > 0) updates.xp = currentXP + bonus

  await supabase.from('profiles').update(updates).eq('id', userId)
  return currentStreak
}
