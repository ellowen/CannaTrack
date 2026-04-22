import { supabase } from './supabase'

export const XP_VALUES = {
  COMPLETE_TASK:             15,
  COMPLETE_WITH_MEASUREMENT: 25,
  UPLOAD_PHOTO:              20,
  START_FLORA:               50,
  HARVEST:                  100,
  STREAK_7_BONUS:           200,
  STREAK_30_BONUS:         1000,
} as const

export async function awardXP(userId: string, amount: number): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single()
  await supabase
    .from('profiles')
    .update({ xp: (data?.xp ?? 0) + amount })
    .eq('id', userId)
}

/**
 * Llama una vez por dia cuando el usuario completa cualquier tarea.
 * Extiende o resetea el streak segun la ultima actividad.
 * Otorga XP bonus en hitos de 7 y 30 dias.
 */
export async function recordDailyActivity(userId: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('xp, streak_days, best_streak, last_activity_date')
    .eq('id', userId)
    .single()

  if (!data) return

  const todayStr  = new Date().toISOString().split('T')[0]
  const lastStr   = data.last_activity_date as string | null

  // Ya registramos actividad hoy — nada que hacer
  if (lastStr === todayStr) return

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const prevStreak = data.streak_days ?? 0
  const newStreak  = lastStr === yesterdayStr ? prevStreak + 1 : 1
  const bestStreak = Math.max(data.best_streak ?? 0, newStreak)

  const updates: Record<string, unknown> = {
    streak_days:        newStreak,
    best_streak:        bestStreak,
    last_activity_date: todayStr,
  }

  // Bonificaciones por hito
  let bonus = 0
  if (newStreak === 7)  bonus = XP_VALUES.STREAK_7_BONUS
  if (newStreak === 30) bonus = XP_VALUES.STREAK_30_BONUS
  if (bonus > 0) updates.xp = (data.xp ?? 0) + bonus

  await supabase.from('profiles').update(updates).eq('id', userId)
}
