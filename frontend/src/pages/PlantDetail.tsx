import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useNutritionTable } from '@/hooks/useNutritionTable'
import { useUserStore } from '@/store/userStore'
import { Button } from '@/components/ui'
import { NutritionCard } from '@/components/nutrition'
import { TaskItem } from '@/components/calendar'
import { DiarySection } from '@/components/diary'
import { MeasurementSection } from '@/components/measurements'
import { getCurrentWeek, getEstimatedHarvestDate, awaitingFloraStart, getCycleProgress } from '@/lib/nutrition-utils'
import { STAGE_LABELS, STAGE_EMOJIS } from '@/types/plant'

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPlantById, startFlora, harvestPlant, discardPlant } = usePlants()
  const { todayTasks, upcomingTasks, completeTask } = useTasks(id)
  const { getTableById } = useNutritionTable()
  const { potVolumeLiters } = useUserStore()

  if (!id) return null
  const plant = getPlantById(id)

  if (!plant) {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-ink-3 mb-6">Planta no encontrada.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentWeek = getCurrentWeek(plant, today)
  const harvestDate = getEstimatedHarvestDate(plant)
  const daysToHarvest = harvestDate ? differenceInDays(harvestDate, today) : null
  const needsFlora = awaitingFloraStart(plant)
  const table = getTableById(plant.nutritionTableId)
  const potLiters = plant.potVolumeLiters ?? potVolumeLiters
  const cycleProgress = getCycleProgress(plant, today)
  const isFlora = currentWeek?.cycle === 'flora'

  const stageEmoji = currentWeek ? (STAGE_EMOJIS[currentWeek.stage] ?? '🌱') : '✂️'
  const stageLabel = currentWeek ? (STAGE_LABELS[currentWeek.stage] ?? '') : 'Completada'
  const cycleTag = currentWeek
    ? currentWeek.cycle === 'vege' ? `VEGE S${currentWeek.week}` : `FLORA F${currentWeek.week}`
    : 'Completada'

  const todayNutrition = todayTasks.filter((t) => t.type === 'nutrition')
  // EC/pH ranges: from today's nutrition task if available, else upcoming nutrition
  const refTask = todayNutrition[0] ?? upcomingTasks.find((t) => t.type === 'nutrition')
  const todayOther = todayTasks.filter((t) => t.type !== 'nutrition')
  const upcoming = upcomingTasks.filter((t) => !todayTasks.some((d) => d.id === t.id))

  return (
    <div className="pb-8">
      {/* Hero header con gradient */}
      <div
        className="px-4 pt-8 pb-6 relative overflow-hidden"
        style={{
          background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)',
        }}
      >
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }}
        />

        {/* Big emoji background */}
        <div className="absolute right-4 top-6 text-8xl opacity-20 select-none pointer-events-none">
          {stageEmoji}
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="relative w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-5 tap-highlight-none active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="relative">
          <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white mb-2 tracking-wide">
            {cycleTag}
          </span>
          <h1 className="text-2xl font-black text-white leading-tight">{plant.name}</h1>
          <p className="text-sm text-white/70 mt-0.5">{plant.genetics}</p>

          {/* Harvest countdown */}
          {daysToHarvest !== null && daysToHarvest > 0 && (
            <div className="mt-4 inline-flex items-baseline gap-1 bg-white/15 rounded-2xl px-4 py-2">
              <span className="text-3xl font-black text-white">{daysToHarvest}</span>
              <span className="text-sm text-white/80">días para cosecha 🌸</span>
            </div>
          )}
          {daysToHarvest !== null && daysToHarvest <= 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-2xl px-4 py-2">
              <span className="text-xl">✂️</span>
              <span className="text-sm font-bold text-white">Lista para cosechar</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* Info chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: '📅', label: format(plant.startDate, "d MMM yyyy", { locale: es }) },
            { icon: plant.location === 'indoor' ? '🏠' : '☀️', label: plant.location === 'indoor' ? 'Indoor' : 'Outdoor' },
            { icon: '🪴', label: `${plant.potCount} maceta${plant.potCount > 1 ? 's' : ''} · ${potLiters}L` },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-ink-2 bg-app-card border border-app-border px-3 py-1.5 rounded-xl font-medium shadow-card">
              <span>{icon}</span>
              {label}
            </span>
          ))}
        </div>

        {/* Progreso del ciclo */}
        {cycleProgress && (
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{stageEmoji}</span>
                <div>
                  <p className="text-sm font-bold text-ink-1">{stageLabel}</p>
                  <p className="text-xs text-ink-3">{isFlora ? 'Floración' : 'Vegetativo'}</p>
                </div>
              </div>
              <span className="text-2xl font-black text-ink-1 tabular">
                {Math.round(cycleProgress.progress * 100)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-app-elevated overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${cycleProgress.progress * 100}%`,
                  background: isFlora ? 'var(--gradient-flora-bar)' : 'var(--gradient-vege-bar)',
                }}
              />
            </div>
            {harvestDate && (
              <p className="text-xs text-ink-3 mt-2">
                📅 Cosecha est.: {format(harvestDate, "d 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        )}

        {/* Mediciones EC / pH */}
        <MeasurementSection
          plantId={plant.id}
          ecMin={refTask?.ecMin}
          ecMax={refTask?.ecMax}
          phMin={refTask?.phMin}
          phMax={refTask?.phMax}
        />

        {/* Alerta floración */}
        {needsFlora && (
          <div className="bg-flora-bg rounded-2xl border border-flora-border p-4">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">🌸</span>
              <div>
                <p className="text-sm font-bold text-flora-text mb-0.5">¡Vegetativo completado!</p>
                <p className="text-sm text-ink-3">Ya pasaron las 6 semanas. ¿Iniciás floración hoy?</p>
              </div>
            </div>
            <button
              onClick={() => startFlora(plant.id, new Date())}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
            >
              🌸 Iniciar floración hoy
            </button>
          </div>
        )}

        {/* Nutrición de hoy */}
        {todayNutrition.length > 0 && (
          <section>
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">🍃 Nutrición de hoy</p>
            <div className="space-y-3">
              {todayNutrition.map((task) => (
                <div key={task.id}>
                  <NutritionCard task={task} potVolumeLiters={potLiters} />
                  {!task.completed && (
                    <button
                      onClick={() => completeTask(task.id)}
                      className="mt-2 w-full py-3 rounded-xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand"
                    >
                      ✓ Marcar como completada
                    </button>
                  )}
                  {task.completed && (
                    <div className="mt-2 w-full py-2.5 rounded-xl bg-brand-subtle border border-brand-border text-brand-500 font-semibold text-sm text-center">
                      ✅ Completada
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Otras tareas de hoy */}
        {todayOther.length > 0 && (
          <section>
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Otras tareas hoy</p>
            <div className="bg-app-card rounded-2xl border border-app-border shadow-card divide-y divide-app-border px-2">
              {todayOther.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={completeTask} />
              ))}
            </div>
          </section>
        )}

        {/* Sin tareas */}
        {todayTasks.length === 0 && (
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-5 text-center">
            <p className="text-2xl mb-2">🌤️</p>
            <p className="text-sm text-ink-3">Sin tareas para hoy</p>
          </div>
        )}

        {/* Próximas */}
        {upcoming.length > 0 && (
          <section>
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">📅 Próximas tareas</p>
            <div className="bg-app-card rounded-2xl border border-app-border shadow-card divide-y divide-app-border px-2">
              {upcoming.map((task) => (
                <TaskItem key={task.id} task={task} showDate />
              ))}
            </div>
          </section>
        )}

        {/* Diario de cultivo */}
        <DiarySection plantId={plant.id} currentWeekLabel={cycleTag} />

        {/* Acciones */}
        <div className="pt-2 space-y-2 border-t border-app-border">
          <Button variant="secondary" className="w-full" onClick={() => {
            if (confirm(`¿Confirmar cosecha de "${plant.name}"?`)) {
              harvestPlant(plant.id)
              navigate('/')
            }
          }}>
            ✂️ Cosechar planta
          </Button>
          <Button variant="danger" className="w-full" onClick={() => {
            if (confirm(`¿Descartar "${plant.name}"?`)) {
              discardPlant(plant.id)
              navigate('/')
            }
          }}>
            Descartar
          </Button>
        </div>

        {table && (
          <p className="text-[11px] text-center text-ink-4 pb-2">
            📊 {table.name.split('—')[0].trim()} · {potLiters}L por maceta
          </p>
        )}
      </div>
    </div>
  )
}
