import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import { getCurrentWeek, getEstimatedHarvestDate, awaitingFloraStart, getCycleProgress } from '@/lib/nutrition-utils'
import { useTasks } from '@/hooks/useTasks'
import { useWeekLogStore } from '@/store/weekLogStore'
import type { Plant } from '@/types/plant'
import { STAGE_LABELS, STAGE_EMOJIS } from '@/types/plant'


interface PlantCardProps {
  plant: Plant
}

export default function PlantCard({ plant }: PlantCardProps) {
  const navigate = useNavigate()
  const { todayTasks } = useTasks(plant.id)
  const latestPhoto = useWeekLogStore((s) =>
    s.logs
      .filter((l) => l.plantId === plant.id && l.photoDataUrl)
      .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())[0]
      ?.photoDataUrl
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentWeek = getCurrentWeek(plant, today)
  const harvestDate = getEstimatedHarvestDate(plant)
  const daysToHarvest = harvestDate ? differenceInDays(harvestDate, today) : null
  const needsFlora = awaitingFloraStart(plant)
  const cycleProgress = getCycleProgress(plant, today)
  const pendingToday = todayTasks.filter((t) => !t.completed).length
  const isFlora = currentWeek?.cycle === 'flora'

  const stageEmoji = currentWeek ? (STAGE_EMOJIS[currentWeek.stage] ?? '🌱') : '✂️'
  const stageLabel = currentWeek ? (STAGE_LABELS[currentWeek.stage] ?? currentWeek.stage) : 'Completada'

  const cycleTag = currentWeek
    ? currentWeek.cycle === 'vege' ? `VEGE S${currentWeek.week}` : `FLORA F${currentWeek.week}`
    : '—'

  return (
    <div
      onClick={() => navigate(`/plants/${plant.id}`)}
      className="bg-app-card rounded-3xl border border-app-border shadow-card-md overflow-hidden cursor-pointer active:scale-[0.987] transition-all duration-150 tap-highlight-none hover:shadow-card-lg"
    >
      {/* Header — foto real si existe, si no gradient temático */}
      <div
        className="px-5 pt-4 pb-5 relative overflow-hidden"
        style={latestPhoto
          ? { backgroundImage: `url(${latestPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)' }
        }
      >
        {/* Overlay: scrim para legibilidad sobre foto, o noise sobre gradient */}
        <div
          className="absolute inset-0"
          style={latestPhoto
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
      <div className="px-5 py-4">
        {/* Stage + harvest row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{stageEmoji}</span>
            <span className="text-sm font-semibold text-ink-2">{stageLabel}</span>
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

        {/* Progress bar del ciclo */}
        {cycleProgress && (
          <div className="mb-3">
            <div className="h-2 rounded-full bg-app-elevated overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${cycleProgress.progress * 100}%`,
                  background: isFlora ? 'var(--gradient-flora-bar)' : 'var(--gradient-vege-bar)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-ink-4">
                {isFlora ? 'Floración' : 'Vegetativo'}
              </span>
              <span className="text-[11px] text-ink-3 font-semibold tabular">
                {Math.round(cycleProgress.progress * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {pendingToday > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-subtle text-brand-500 border border-brand-border px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              {pendingToday} tarea{pendingToday > 1 ? 's' : ''} hoy
            </span>
          )}
          {needsFlora && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-flora-bg text-flora-text border border-flora-border px-2.5 py-1 rounded-full">
              🌸 Iniciar floración
            </span>
          )}
          {pendingToday === 0 && !needsFlora && (
            <span className="text-xs text-ink-4 font-medium">✓ Al día</span>
          )}
        </div>
      </div>
    </div>
  )
}
