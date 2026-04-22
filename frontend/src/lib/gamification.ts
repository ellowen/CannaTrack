import type { ScheduledTask } from '../types/plant'

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
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ── Logros (Achievements) ─────────────────────────────────
export type AchievementData = {
  streak: number
  bestStreak: number
  totalXP: number
  totalTasksCompleted: number
  tasksWithMeasurement: number
  harvestedPlants: number
  activePlants: number
  totalPhotos: number
}

export type Achievement = {
  id: string
  name: string
  description: string
  emoji: string
  category: 'consistencia' | 'cultivo' | 'conocimiento'
  check: (d: AchievementData) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  // Consistencia
  { id: 'streak_3',   name: 'Primeros pasos',   description: '3 días seguidos',           emoji: '🔥', category: 'consistencia', check: (d) => d.bestStreak >= 3 },
  { id: 'streak_7',   name: 'Una semana',        description: '7 días consecutivos',       emoji: '⚡', category: 'consistencia', check: (d) => d.bestStreak >= 7 },
  { id: 'streak_30',  name: 'Mes perfecto',       description: '30 días sin perder una tarea', emoji: '🗓️', category: 'consistencia', check: (d) => d.bestStreak >= 30 },
  { id: 'streak_90',  name: 'Maquinaria',         description: '90 días consecutivos',     emoji: '⚙️', category: 'consistencia', check: (d) => d.bestStreak >= 90 },
  // Cultivo
  { id: 'first_task', name: 'Primera tarea',      description: 'Completá tu primera tarea', emoji: '✅', category: 'cultivo', check: (d) => d.totalTasksCompleted >= 1 },
  { id: 'tasks_50',   name: 'En ritmo',            description: '50 tareas completadas',    emoji: '💪', category: 'cultivo', check: (d) => d.totalTasksCompleted >= 50 },
  { id: 'tasks_100',  name: 'Centenario',          description: '100 tareas completadas',   emoji: '💯', category: 'cultivo', check: (d) => d.totalTasksCompleted >= 100 },
  { id: 'harvest_1',  name: 'Primera cosecha',     description: 'Cosechá tu primera planta', emoji: '✂️', category: 'cultivo', check: (d) => d.harvestedPlants >= 1 },
  { id: 'harvest_3',  name: 'Coleccionista',       description: '3 plantas cosechadas',     emoji: '🏆', category: 'cultivo', check: (d) => d.harvestedPlants >= 3 },
  { id: 'multi_plant',name: 'Poligamo',            description: '3 plantas activas al mismo tiempo', emoji: '🌳', category: 'cultivo', check: (d) => d.activePlants >= 3 },
  { id: 'photos_10',  name: 'Fotógrafo',           description: '10 fotos subidas',         emoji: '📸', category: 'cultivo', check: (d) => d.totalPhotos >= 10 },
  { id: 'photos_50',  name: 'Documentalista',      description: '50 fotos en el diario',    emoji: '🎬', category: 'cultivo', check: (d) => d.totalPhotos >= 50 },
  // Conocimiento
  { id: 'measure_1',  name: 'Primera medición',    description: 'Registrá EC y pH',         emoji: '🧪', category: 'conocimiento', check: (d) => d.tasksWithMeasurement >= 1 },
  { id: 'measure_20', name: 'Analítico',            description: '20 tareas con EC/pH',      emoji: '🔬', category: 'conocimiento', check: (d) => d.tasksWithMeasurement >= 20 },
  { id: 'measure_50', name: 'Científico',           description: '50 mediciones registradas', emoji: '⚗️', category: 'conocimiento', check: (d) => d.tasksWithMeasurement >= 50 },
  { id: 'xp_1000',   name: 'Acumulador',           description: 'Llega a 1000 XP',          emoji: '💎', category: 'conocimiento', check: (d) => d.totalXP >= 1000 },
]

/** Devuelve los logros desbloqueados y bloqueados dado el estado actual */
export function getAchievements(data: AchievementData): { unlocked: Achievement[]; locked: Achievement[] } {
  const unlocked: Achievement[] = []
  const locked: Achievement[] = []
  for (const a of ACHIEVEMENTS) {
    if (a.check(data)) unlocked.push(a)
    else locked.push(a)
  }
  return { unlocked, locked }
}
