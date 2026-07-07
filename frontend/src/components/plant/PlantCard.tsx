import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import { getCurrentWeek, getEstimatedHarvestDate, awaitingFloraStart, getCycleProgress } from '@/lib/nutrition-utils'
import { useTasks } from '@/hooks/useTasks'
import { useTaskStore } from '@/store/taskStore'
import { useWeekLogStore } from '@/store/weekLogStore'
import type { Plant } from '@/types/plant'
import { STAGE_LABELS, STAGE_EMOJIS } from '@/types/plant'
import { calculatePlantHealth, healthColor } from '@/lib/gamification'


interface PlantCardProps {
  plant: Plant
}

export default function PlantCard({ plant }: PlantCardProps) {
  const navigate = useNavigate()
  const { todayTasks, overdueTasks } = useTasks(plant.id)
  const latestPhoto = useWeekLogStore((s) =>
    s.logs
      .filter((l) => l.plantId === plant.id && (l.photoDataUrl || l.photoUrl))
      .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())[0]
  )
  const latestPhotoSrc = latestPhoto?.photoDataUrl ?? latestPhoto?.photoUrl

  const allTasks = useTaskStore((s) => s.tasks.filter((t) => t.plantId === plant.id))
  const health = calculatePlantHealth(allTasks)
  const hColor = healthColor(health)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentWeek = getCurrentWeek(plant, today)
  const harvestDate = getEstimatedHarvestDate(plant)
  const daysToHarvest = harvestDate ? differenceInDays(harvestDate, today) : null
  const needsFlora = awaitingFloraStart(plant)
  const cycleProgress = getCycleProgress(plant, today)
  const pendingToday = todayTasks.filter((t) => !t.completed).length
  const overdueCount = overdueTasks.length
  const isFlora = currentWeek?.cycle === 'flora'

  const stageEmoji = currentWeek ? (STAGE_EMOJIS[currentWeek.stage] ?? '🌱') : '✂️'
  const stageLabel = currentWeek ? (STAGE_LABELS[currentWeek.stage] ?? currentWeek.stage) : 'Completada'

  const cycleTag = currentWeek
    ? currentWeek.cycle === 'vege' ? `VEGE S${currentWeek.week}` : `FLORA F${currentWeek.week}`
    : '—'

  return (
    <div
      onClick={() => navigate(`/plants/${plant.id}`)}
      className="glass-card rounded-3xl overflow-hidden cursor-pointer active:scale-[0.985] transition-all duration-150 tap-highlight-none"
    >
      {/* Header — foto real si existe, si no gradient temático */}
      <div
        className="px-4 pt-3.5 pb-4 relative overflow-hidden"
        style={latestPhotoSrc
          ? { backgroundImage: `url(${latestPhotoSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)' }
        }
      >
        {/* Overlay: scrim para legibilidad sobre foto, o noise sobre gradient */}
        <div
          className="absolute inset-0"
          style={latestPhotoSrc
            ? { background: 'linear-gradient(160deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)' }
            : { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", opacity: 0.08 }
          }
        />

        {/* Big emoji */}
        <div className="absolute right-5 top-3 text-5xl opacity-30 select-none">
          {stageEmoji}
        </div>

        <div className="relative">
          {/* Cycle tag */}
          <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white mb-2.5 tracking-wide">
            {cycleTag}
          </span>

          {/* Plant name */}
          <h3 className="text-xl font-bold text-white leading-tight truncate pr-12">
            {plant.name}
          </h3>
          <p className="text-sm text-white/70 mt-0.5 truncate">{plant.genetics}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Stage + harvest row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
              isFlora
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'bg-brand-subtle text-brand-400 border border-brand-border'
            }`}>
              {cycleTag}
            </span>
            <span className="text-xs font-medium text-ink-3">{stageLabel}</span>
          </div>
          {daysToHarvest !== null && daysToHarvest > 0 && (
            <div className="text-right">
              <span className="text-2xl font-black text-ink-1 tabular">{daysToHarvest}</span>
              <span className="text-xs text-ink-3 ml-1">días 🌸</span>
            </div>
          )}
          {daysToHarvest !== null && daysToHarvest <= 0 && (
            <span className="text-sm font-bold text-task-harvest">Lista ✂️</span>
          )}
        </div>

        {/* Barras: ciclo + salud */}
        <div className="mb-3 space-y-2">
          {cycleProgress && (
            <div>
              <div className="h-1.5 rounded-full bg-app-elevated overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${cycleProgress.progress * 100}%`,
                    background: isFlora ? 'var(--gradient-flora-bar)' : 'var(--gradient-vege-bar)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-ink-4">
                  {isFlora ? 'Floración' : 'Vegetativo'}
                </span>
                <span className="text-[10px] text-ink-4 tabular">
                  {Math.round(cycleProgress.progress * 100)}%
                </span>
              </div>
            </div>
          )}
          {/* Barra de salud */}
          <div>
            <div className="h-1.5 rounded-full bg-app-elevated overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${health}%`,
                  background: hColor === 'green'
                    ? 'linear-gradient(90deg, #4ADE80, #22C55E)'
                    : hColor === 'yellow'
                    ? 'linear-gradient(90deg, #FCD34D, #F59E0B)'
                    : 'linear-gradient(90deg, #F87171, #EF4444)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-ink-4">Salud</span>
              <span className={`text-[10px] font-bold tabular ${
                hColor === 'green' ? 'text-green-500'
                : hColor === 'yellow' ? 'text-amber-500'
                : 'text-red-500'
              }`}>
                {health}%
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold glass-pill glass-red text-red-500 px-2.5 py-1 rounded-full">
              ⚠️ {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          {pendingToday > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold glass-pill glass-brand text-brand-400 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              {pendingToday} tarea{pendingToday > 1 ? 's' : ''} hoy
            </span>
          )}
          {needsFlora && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold glass-pill glass-amber text-flora-text px-2.5 py-1 rounded-full">
              🌸 Iniciar floración
            </span>
          )}
          {overdueCount === 0 && pendingToday === 0 && !needsFlora && (
            <span className="text-xs text-ink-4 font-medium">✓ Al día</span>
          )}
        </div>
      </div>
    </div>
  )
}
