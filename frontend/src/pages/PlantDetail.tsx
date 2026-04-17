import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, differenceInDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useNutritionTable } from '@/hooks/useNutritionTable'
import { useUserStore } from '@/store/userStore'
import { useTaskStore } from '@/store/taskStore'
import { Button } from '@/components/ui'
import { NutritionCard } from '@/components/nutrition'
import { TaskItem, WeekView } from '@/components/calendar'
import { CompleteTaskSheet, IrrigationCard, FoliarCard } from '@/components/tasks'
import { DiarySection } from '@/components/diary'
import { MeasurementSection } from '@/components/measurements'
import { HarvestSheet, ProgressRing } from '@/components/plant'
import { calculatePlantHealth, healthColor } from '@/lib/gamification'
import { getCurrentWeek, getEstimatedHarvestDate, awaitingFloraStart, getCycleProgress, getTasksForDate } from '@/lib/nutrition-utils'
import { STAGE_LABELS, STAGE_EMOJIS } from '@/types/plant'
import type { ScheduledTask } from '@/types/plant'

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPlantById, startFlora, harvestPlant, discardPlant } = usePlants()
  const { completeTask: storeCompleteTask } = useTaskStore()
  const [floraPickerOpen, setFloraPickerOpen] = useState(false)
  const [floraDateInput, setFloraDateInput] = useState(() => new Date().toISOString().slice(0, 10))
  const [completingTask, setCompletingTask] = useState<ScheduledTask | null>(null)
  const [harvestSheetOpen, setHarvestSheetOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const { tasks, todayTasks, upcomingTasks, overdueTasks } = useTasks(id)
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

  const health = calculatePlantHealth(tasks)
  const hColor = healthColor(health)
  const healthGradient = hColor === 'green'
    ? 'linear-gradient(90deg, #4ADE80, #22C55E)'
    : hColor === 'yellow'
    ? 'linear-gradient(90deg, #FCD34D, #F59E0B)'
    : 'linear-gradient(90deg, #F87171, #EF4444)'

  // EC/pH ranges: from today's nutrition task if available, else upcoming nutrition
  const refTask = todayTasks.find((t) => t.type === 'nutrition') ?? upcomingTasks.find((t) => t.type === 'nutrition')
  const upcoming = upcomingTasks.filter((t) => !todayTasks.some((d) => d.id === t.id))

  // Semana actual para WeekView
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // lunes

  // Día seleccionado en el WeekView (distinto de today)
  const isSelectedToday = selectedDay.toDateString() === today.toDateString()
  const selectedDayTasks = isSelectedToday ? todayTasks : getTasksForDate(tasks, selectedDay)
  const selectedDayLabel = isSelectedToday
    ? '⚡ Hoy'
    : format(selectedDay, "EEE d 'de' MMM", { locale: es })

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

        {/* Barra de navegación: volver + editar */}
        <div className="relative flex items-center justify-between mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <Link
            to={`/plants/${plant.id}/edit`}
            className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-white/20 backdrop-blur-sm border border-white/20 px-3.5 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Editar
          </Link>
        </div>

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

        {/* Progress Ring + salud */}
        {cycleProgress && (
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-5">
            <div className="flex items-center gap-5">
              {/* Ring */}
              <ProgressRing
                progress={cycleProgress.progress}
                size={120}
                strokeWidth={9}
                color={isFlora ? '#FF9500' : '#4ADE80'}
                bgColor="var(--app-elevated)"
                centerEmoji={stageEmoji}
                label={`${Math.round(cycleProgress.progress * 100)}%`}
              />

              {/* Info lateral */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-ink-1">{stageLabel}</p>
                <p className="text-xs text-ink-3 mb-3">{isFlora ? 'Floración' : 'Vegetativo'}</p>

                {/* Salud */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-ink-3">Salud</span>
                    <span className={`text-[11px] font-black tabular ${
                      hColor === 'green' ? 'text-green-500' : hColor === 'yellow' ? 'text-amber-500' : 'text-red-500'
                    }`}>{health}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-app-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${health}%`, background: healthGradient }}
                    />
                  </div>
                </div>

                {harvestDate && (
                  <div className="text-xs text-ink-3">
                    <span className="text-ink-4">Cosecha est.</span>
                    <br />
                    <span className="font-semibold text-ink-2">
                      {format(harvestDate, "d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                )}
              </div>
            </div>
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
                <p className="text-sm text-ink-3">
                  {floraPickerOpen
                    ? 'Elegí la fecha en que cambiaste el fotoperiodo.'
                    : 'Ya pasaron las 6 semanas. ¿Cuándo iniciaste la floración?'}
                </p>
              </div>
            </div>

            {floraPickerOpen ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wide mb-2">
                    Fecha de inicio de floración
                  </label>
                  <input
                    type="date"
                    value={floraDateInput}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFloraDateInput(e.target.value)}
                    className="w-full rounded-xl border border-flora-border bg-app-card text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-flora-border transition-colors shadow-card"
                  />
                  <p className="text-xs text-ink-4 mt-1.5">
                    Podés backdatear si ya cambiaste el fotoperiodo.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFloraPickerOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-app-border text-sm font-semibold text-ink-3 bg-app-card tap-highlight-none active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const [y, m, d] = floraDateInput.split('-').map(Number)
                      startFlora(plant.id, new Date(y, m - 1, d))
                      setFloraPickerOpen(false)
                    }}
                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
                  >
                    🌸 Confirmar floración
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    startFlora(plant.id, new Date())
                  }}
                  className="flex-1 py-3 rounded-xl border border-flora-border text-flora-text font-bold text-sm tap-highlight-none active:scale-95 transition-all bg-app-card"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setFloraPickerOpen(true)}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
                >
                  🌸 Elegir fecha
                </button>
              </div>
            )}
          </div>
        )}

        {/* Vista semanal */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">📅 Esta semana</p>
          </div>
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card px-2 py-2">
            <WeekView
              tasks={tasks}
              weekStart={weekStart}
              today={today}
              selectedDate={selectedDay}
              onDayClick={(d) => setSelectedDay(d)}
            />
          </div>
        </section>

        {/* Tareas vencidas */}
        {overdueTasks.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">⚠️ Vencidas · {overdueTasks.length}</p>
            <div className="bg-app-card rounded-2xl border border-red-200 dark:border-red-900/50 shadow-card divide-y divide-app-border px-2">
              {overdueTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={() => setCompletingTask(task)}
                  showDate
                />
              ))}
            </div>
          </section>
        )}

        {/* Tareas del día seleccionado */}
        {selectedDayTasks.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">{selectedDayLabel}</p>

            {/* Nutrición */}
            {selectedDayTasks.filter((t) => t.type === 'nutrition').map((task) => (
              <div key={task.id}>
                <NutritionCard task={task} potVolumeLiters={potLiters} potCount={plant.potCount} />
                {!task.completed ? (
                  <button
                    onClick={() => setCompletingTask(task)}
                    className="mt-2 w-full py-3 rounded-xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand"
                  >
                    ✓ Marcar como completada
                  </button>
                ) : (
                  <div className="mt-2 px-4 py-2.5 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-400">✅ Completada</span>
                    {task.completionNotes && (
                      <span className="text-xs text-ink-3 italic truncate max-w-[180px]">"{task.completionNotes}"</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Riegos puros */}
            {selectedDayTasks.filter((t) => t.type === 'irrigation').map((task) => (
              <div key={task.id}>
                <IrrigationCard task={task} potVolumeLiters={potLiters} potCount={plant.potCount} />
                {!task.completed ? (
                  <button
                    onClick={() => setCompletingTask(task)}
                    className="mt-2 w-full py-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all"
                  >
                    💧 Riego completado
                  </button>
                ) : (
                  <div className="mt-2 px-4 py-2.5 rounded-xl bg-app-elevated border border-app-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-3">✅ Completado</span>
                    {task.completionNotes && (
                      <span className="text-xs text-ink-4 italic truncate max-w-[180px]">"{task.completionNotes}"</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Foliar */}
            {selectedDayTasks.filter((t) => t.type === 'foliar').map((task) => (
              <div key={task.id}>
                <FoliarCard task={task} potVolumeLiters={potLiters} potCount={plant.potCount} />
                {!task.completed ? (
                  <button
                    onClick={() => setCompletingTask(task)}
                    className="mt-2 w-full py-3 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all"
                  >
                    🌫️ Foliar completado
                  </button>
                ) : (
                  <div className="mt-2 px-4 py-2.5 rounded-xl bg-app-elevated border border-app-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-3">✅ Completado</span>
                    {task.completionNotes && (
                      <span className="text-xs text-ink-4 italic truncate max-w-[180px]">"{task.completionNotes}"</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Observaciones y otras */}
            {selectedDayTasks.filter((t) => t.type !== 'nutrition' && t.type !== 'foliar' && t.type !== 'irrigation').length > 0 && (
              <div className="bg-app-card rounded-2xl border border-app-border shadow-card divide-y divide-app-border px-2">
                {selectedDayTasks.filter((t) => t.type !== 'nutrition' && t.type !== 'foliar' && t.type !== 'irrigation').map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={() => setCompletingTask(task)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sin tareas */}
        {selectedDayTasks.length === 0 && (
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-5 text-center">
            <p className="text-2xl mb-2">🌤️</p>
            <p className="text-sm text-ink-3">
              {isSelectedToday ? 'Sin tareas para hoy' : 'Sin tareas este día'}
            </p>
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
        <div className="pt-2 border-t border-app-border">
          <Button variant="secondary" className="w-full" onClick={() => setHarvestSheetOpen(true)}>
            ✂️ Finalizar cultivo
          </Button>
        </div>

        {table && (
          <p className="text-[11px] text-center text-ink-4 pb-2">
            📊 {table.name.split('—')[0].trim()} · {potLiters}L por maceta
          </p>
        )}
      </div>

      {/* Sheet de completado con nota */}
      <CompleteTaskSheet
        task={completingTask}
        onConfirm={(taskId, notes) => storeCompleteTask(taskId, notes)}
        onClose={() => setCompletingTask(null)}
      />

      {/* Sheet de cosecha / descarte */}
      {harvestSheetOpen && (
        <HarvestSheet
          plant={plant}
          onConfirmHarvest={() => { harvestPlant(plant.id); navigate('/') }}
          onConfirmDiscard={() => { discardPlant(plant.id); navigate('/') }}
          onClose={() => setHarvestSheetOpen(false)}
        />
      )}
    </div>
  )
}
