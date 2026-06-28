import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUserStore, type ThemePreference } from '@/store/userStore'
import { useTaskStore } from '@/store/taskStore'
import { usePlantStore } from '@/store/plantStore'
import { useWeekLogStore } from '@/store/weekLogStore'
import { useMeasurementStore } from '@/store/measurementStore'
import { getLevelInfo, getAchievements, LEVELS, type AchievementData } from '@/lib/gamification'
import { clsx } from 'clsx'

export default function Profile() {
  const { name, streak, bestStreak, totalXP, theme, setTheme } = useUserStore()
  const { tasks } = useTaskStore()
  const { plants } = usePlantStore()
  const logs = useWeekLogStore((s) => s.logs)
  const measurements = useMeasurementStore((s) => s.logs)

  const levelInfo = getLevelInfo(totalXP)

  const totalTasksCompleted = tasks.filter((t) => t.completed).length
  const tasksWithMeasurement = measurements.length
  const harvestedPlants = plants.filter((p) => p.status === 'harvested')
  const activePlants = plants.filter((p) => p.status === 'active')
  const totalPhotos = logs.filter((l) => l.photoDataUrl).length

  const achievementData: AchievementData = {
    streak,
    bestStreak,
    totalXP,
    totalTasksCompleted,
    tasksWithMeasurement,
    harvestedPlants: harvestedPlants.length,
    activePlants: activePlants.length,
    totalPhotos,
  }

  const { unlocked, locked } = getAchievements(achievementData)

  const totalTasks = tasks.filter((t) => {
    const d = new Date(t.scheduledDate)
    return d <= new Date()
  }).length
  const completionRate = totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0

  return (
    <div className="pb-8">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A0A2E 0%, #0A1A0A 100%)' }}
      >
        {/* Glow violeta de fondo */}
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, #8B5CF6 0%, transparent 70%)' }}
        />

        <div className="relative flex items-start gap-4">
          {/* Avatar de nivel */}
          <div className="shrink-0">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
            >
              {levelInfo.current.emoji}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white leading-tight truncate">
              {name || 'Cultivador'}
            </h1>
            <p className="text-sm font-semibold text-violet-300 mt-0.5">
              Nivel {levelInfo.current.level} — {levelInfo.current.name}
            </p>

            {/* Barra de XP */}
            <div className="mt-3">
              <div className="flex justify-between mb-1">
                <span className="text-[11px] font-bold text-white/60">{totalXP} XP</span>
                {levelInfo.next && (
                  <span className="text-[11px] text-white/40">{levelInfo.next.xpRequired} XP</span>
                )}
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${levelInfo.progressToNext * 100}%`,
                    background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                  }}
                />
              </div>
              {levelInfo.next && (
                <p className="text-[10px] text-white/40 mt-1">
                  {levelInfo.next.xpRequired - totalXP} XP para {levelInfo.next.name}
                </p>
              )}
            </div>
          </div>

          {/* Settings link */}
          <Link
            to="/settings"
            className="shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 text-white/60">
              <circle cx={12} cy={12} r={3} />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {/* Stats rapidos */}
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { value: streak, label: streak === 1 ? 'Dia racha' : 'Dias racha', icon: '🔥', highlight: streak >= 7 },
            { value: bestStreak, label: 'Mejor racha', icon: '⚡', highlight: false },
            { value: `${completionRate}%`, label: 'Cumplimiento', icon: '✅', highlight: false },
          ].map(({ value, label, icon, highlight }) => (
            <div
              key={label}
              className={clsx(
                'rounded-2xl p-3 text-center border',
                highlight
                  ? 'bg-amber-500/20 border-amber-500/30'
                  : 'bg-white/8 border-white/10'
              )}
            >
              <p className="text-base mb-0.5">{icon}</p>
              <p className={clsx(
                'text-xl font-black tabular leading-none',
                highlight ? 'text-amber-400' : 'text-white'
              )}>{value}</p>
              <p className="text-[10px] text-white/40 font-semibold mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-5 mt-5">

        {/* Mapa de niveles */}
        <section>
          <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Camino del cultivador</h2>
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
            <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
              {LEVELS.map((lvl, i) => {
                const isCurrentLevel = lvl.level === levelInfo.current.level
                const isPassed = totalXP >= lvl.xpRequired
                const isNext = levelInfo.next?.level === lvl.level
                return (
                  <div key={lvl.level} className="flex items-center shrink-0">
                    <div
                      className={clsx(
                        'w-9 h-9 rounded-xl flex items-center justify-center text-lg relative',
                        isCurrentLevel
                          ? 'bg-violet-500/20 ring-2 ring-violet-500'
                          : isPassed
                          ? 'bg-app-elevated'
                          : 'bg-app-elevated opacity-40'
                      )}
                      title={lvl.name}
                    >
                      {lvl.emoji}
                      {isCurrentLevel && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-app-card" />
                      )}
                    </div>
                    {i < LEVELS.length - 1 && (
                      <div className={clsx(
                        'w-3 h-0.5 mx-0.5',
                        isPassed && !isNext ? 'bg-violet-500' : 'bg-app-border'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-ink-3 mt-3">
              {levelInfo.next
                ? `${levelInfo.next.xpRequired - totalXP} XP para llegar a ${levelInfo.next.name} ${levelInfo.next.emoji}`
                : 'Nivel maximo alcanzado ⚡'}
            </p>
          </div>
        </section>

        {/* Stats detalladas */}
        <section>
          <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Estadisticas</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '✅', value: totalTasksCompleted, label: 'Tareas completadas' },
              { icon: '🧪', value: tasksWithMeasurement, label: 'Mediciones EC/pH' },
              { icon: '📸', value: totalPhotos, label: 'Fotos en el diario' },
              { icon: '🌿', value: activePlants.length, label: 'Plantas activas' },
              { icon: '✂️', value: harvestedPlants.length, label: 'Cosechas' },
              { icon: '💎', value: totalXP, label: 'XP total' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 flex items-center gap-3">
                <span className="text-2xl shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-xl font-black text-ink-1 tabular leading-none">{value}</p>
                  <p className="text-[11px] text-ink-3 font-medium mt-0.5 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tema */}
        <section>
          <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Apariencia</h2>
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-1 flex gap-1">
            {([
              { value: 'light', label: 'Claro', icon: '☀️' },
              { value: 'system', label: 'Sistema', icon: '⚙️' },
              { value: 'dark',  label: 'Oscuro',  icon: '🌙' },
            ] as { value: ThemePreference; label: string; icon: string }[]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all',
                  theme === opt.value
                    ? 'bg-brand-400/15 text-brand-400 border border-brand-400/30'
                    : 'text-ink-3 hover:text-ink-1'
                )}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Logros desbloqueados */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">
              Logros desbloqueados
            </h2>
            <span className="text-xs font-bold text-violet-500">
              {unlocked.length}/{unlocked.length + locked.length}
            </span>
          </div>

          {unlocked.length === 0 ? (
            <div className="bg-app-card rounded-2xl border border-app-border p-5 text-center">
              <p className="text-3xl mb-2">🔒</p>
              <p className="text-sm text-ink-3">Completa tu primera tarea para desbloquear logros</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {unlocked.map((a) => (
                <div
                  key={a.id}
                  className="bg-app-card rounded-2xl border border-violet-500/20 shadow-card p-3 flex items-center gap-3"
                  style={{ boxShadow: '0 0 12px rgba(139,92,246,0.08)' }}
                >
                  <span className="text-2xl shrink-0">{a.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-1 leading-tight">{a.name}</p>
                    <p className="text-[10px] text-ink-4 mt-0.5 leading-tight">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Logros bloqueados */}
        {locked.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Por desbloquear</h2>
            <div className="grid grid-cols-2 gap-3">
              {locked.map((a) => (
                <div
                  key={a.id}
                  className="bg-app-card rounded-2xl border border-app-border shadow-card p-3 flex items-center gap-3 opacity-40"
                >
                  <span className="text-2xl shrink-0 grayscale">{a.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-1 leading-tight">{a.name}</p>
                    <p className="text-[10px] text-ink-4 mt-0.5 leading-tight">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Wall of cosechas */}
        {harvestedPlants.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Wall of fame</h2>
            <div className="space-y-3">
              {harvestedPlants.map((plant) => {
                const photo = logs
                  .filter((l) => l.plantId === plant.id && l.photoDataUrl)
                  .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())[0]
                  ?.photoDataUrl

                const plantTasks = tasks.filter((t) => t.plantId === plant.id)
                const done = plantTasks.filter((t) => t.completed).length
                const rate = plantTasks.length > 0 ? Math.round((done / plantTasks.length) * 100) : 0

                return (
                  <Link
                    key={plant.id}
                    to={`/plants/${plant.id}`}
                    className="flex items-center gap-4 bg-app-card rounded-2xl border border-app-border shadow-card p-4 tap-highlight-none active:scale-[0.987] transition-all overflow-hidden relative"
                  >
                    {/* Foto de fondo si existe */}
                    {photo && (
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    )}
                    <div className="relative shrink-0 w-12 h-12 rounded-xl bg-app-elevated flex items-center justify-center text-2xl">
                      ✂️
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink-1 truncate">{plant.name}</p>
                      <p className="text-xs text-ink-3 truncate">{plant.genetics}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-green-500">
                          {rate}% cumplimiento
                        </span>
                        <span className="text-[10px] text-ink-4">
                          · {format(new Date(plant.startDate), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="relative w-4 h-4 text-ink-4 shrink-0">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
