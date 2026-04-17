import type { ScheduledTask } from '@/types/plant'

// ── XP por acción ──────────────────────────────────────────
export const XP = {
  COMPLETE_TASK: 15,
  COMPLETE_WITH_MEASUREMENT: 25,
  UPLOAD_PHOTO: 20,
  START_FLORA: 50,
  HARVEST: 100,
  STREAK_7_BONUS: 200,
  STREAK_30_BONUS: 1000,
} as const

// ── Tabla de niveles ───────────────────────────────────────
export const LEVELS = [
  { level: 1,  name: 'Semilla',      emoji: '🌰', xpRequired: 0 },
  { level: 2,  name: 'Brote',        emoji: '🌱', xpRequired: 100 },
  { level: 3,  name: 'Plántula',     emoji: '🌿', xpRequired: 300 },
  { level: 4,  name: 'Vegetativa',   emoji: '🍃', xpRequired: 700 },
  { level: 5,  name: 'Pre-Flora',    emoji: '🌾', xpRequired: 1500 },
  { level: 6,  name: 'Flora',        emoji: '🌸', xpRequired: 3000 },
  { level: 7,  name: 'Maduración',   emoji: '🍯', xpRequired: 6000 },
  { level: 8,  name: 'Cosecha',      emoji: '✂️', xpRequired: 10000 },
  { level: 9,  name: 'Maestro Grow', emoji: '🏆', xpRequired: 20000 },
  { level: 10, name: 'Sensei',       emoji: '⚡', xpRequired: 50000 },
] as const

export type LevelInfo = {
  current: (typeof LEVELS)[number]
  next: (typeof LEVELS)[number] | null
  progressToNext: number // 0–1
}

/** Devuelve el nivel actual, el siguiente y el progreso 0–1 hacia el siguiente */
export function getLevelInfo(totalXP: number): LevelInfo {
  const current = [...LEVELS].reverse().find((l) => totalXP >= l.xpRequired) ?? LEVELS[0]
  const currentIndex = LEVELS.findIndex((l) => l.level === current.level)
  const next = LEVELS[currentIndex + 1] ?? null

  const progressToNext = next
    ? Math.min((totalXP - current.xpRequired) / (next.xpRequired - current.xpRequired), 1)
    : 1

  return { current, next, progressToNext }
}

// ── Salud de planta ────────────────────────────────────────
/**
 * Calcula el porcentaje de salud (0–100) basado en tareas
 * completadas vs vencidas en los últimos 14 días.
 */
export function calculatePlantHealth(tasks: ScheduledTask[]): number {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 14)
  cutoff.setHours(0, 0, 0, 0)

  const recent = tasks.filter((t) => {
    const d = new Date(t.scheduledDate)
    return d >= cutoff && d <= now
  })

  if (recent.length === 0) return 100

  const done = recent.filter((t) => t.completed).length
  return Math.round((done / recent.length) * 100)
}

/** Color de salud según porcentaje */
export function healthColor(pct: number): 'green' | 'yellow' | 'red' {
  if (pct >= 75) return 'green'
  if (pct >= 45) return 'yellow'
  return 'red'
}

// ── Lógica de streak ──────────────────────────────────────
export type StreakResult = 'same_day' | 'extended' | 'reset' | 'started'

/**
 * Calcula el nuevo streak dado el streak anterior y la fecha de
 * la última actividad. Devuelve { newStreak, result }.
 */
export function computeStreak(
  currentStreak: number,
  lastActivityDate: Date | null,
  today: Date = new Date()
): { newStreak: number; result: StreakResult } {
  const todayStr = dateStr(today)

  if (!lastActivityDate) {
    return { newStreak: 1, result: 'started' }
  }

  const lastStr = dateStr(lastActivityDate)

  if (lastStr === todayStr) {
    return { newStreak: currentStreak, result: 'same_day' }
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = dateStr(yesterday)

  if (lastStr === yesterdayStr) {
    return { newStreak: currentStreak + 1, result: 'extended' }
  }

  return { newStreak: 1, result: 'reset' }
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
