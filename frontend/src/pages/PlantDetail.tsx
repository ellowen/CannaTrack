import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, differenceInDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useNutritionTable } from '@/hooks/useNutritionTable'
import { useUserStore } from '@/store/userStore'
import { useTaskStore } from '@/store/taskStore'
import { completeTaskInSupabase, updatePlantStatusInSupabase } from '@/lib/sync'
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
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPlantById, startFlora, harvestPlant, discardPlant, reactivatePlant } = usePlants()
  const { completeTask: storeCompleteTask } = useTaskStore()
  const [floraPickerOpen, setFloraPickerOpen] = useState(false)
  const [floraDateInput, setFloraDateInput] = useState(() => new Date().toISOString().slice(0, 10))
  const [completingTask, setCompletingTask] = useState<ScheduledTask | null>(null)
  const [harvestSheetOpen, setHarvestSheetOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const { tasks, todayTasks, upcomingTasks, overdueTasks, uncompleteTask } = useTasks(id)
  const { getTableById } = useNutritionTable()
  const { potVolumeLiters } = useUserStore()

  if (!id) return null
  const plant = getPlantById(id)

  if (!plant) {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-ink-3 mb-6">Planta no encontrada.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>{t('plantDetail.back_home')}</Button>
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
            {t('common.edit')}
          </Link>
        </div>

        <div className="relative">
          <span className={`inline-flex items-center text-[11px] font-black px-3 py-1 rounded-full mb-2 tracking-widest uppercase border ${
            isFlora
              ? 'bg-amber-500/30 text-amber-200 border-amber-400/40'
              : 'bg-brand-400/30 text-green-200 border-green-400/40'
          }`}>
            {cycleTag}
          </span>
          <h1 className="text-2xl font-black text-white leading-tight">{plant.name}</h1>
          <p className="text-sm text-white/70 mt-0.5">{plant.genetics}</p>

          {/* Harvest countdown */}
          {daysToHarvest !== null && daysToHarvest > 0 && (
            <div className="mt-4 inline-flex items-baseline gap-1 bg-white/15 rounded-2xl px-4 py-2">
              <span className="text-3xl font-black text-white">{daysToHarvest}</span>
              <span className="text-sm text-white/80">{t('plantDetail.days_to_harvest')} 🌸</span>
            </div>
          )}
          {daysToHarvest !== null && daysToHarvest <= 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-2xl px-4 py-2">
              <span className="text-xl">✂️</span>
              <span className="text-sm font-bold text-white">{t('plantDetail.ready_harvest')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* Info chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: '📅', label: format(plant.startDate, "d MMM yyyy", { locale: es }) },
            { icon: plant.location === 'indoor' ? '🏠' : '☀️', label: plant.location === 'indoor' ? t('plantDetail.location_indoor') : t('plantDetail.location_outdoor') },
            { icon: '🪴', label: `${plant.potCount} ${plant.potCount > 1 ? t('plantDetail.pots_plural') : t('plantDetail.pots')} · ${potLiters}L` },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-ink-2 glass px-3 py-1.5 rounded-xl font-medium">
              <span>{icon}</span>
              {label}
            </span>
          ))}
        </div>

        {/* Badges: fotoperiodo (indoor) + sustrato */}
        {(plant.location === 'indoor' || (plant.growMedium && plant.growMedium !== 'soil')) && (
          <div className="flex flex-wrap gap-2">
            {plant.location === 'indoor' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 glass px-3 py-1.5 rounded-xl">
                {isFlora ? '🌙 12/12' : '☀️ 18/6'}
              </span>
            )}
            {plant.growMedium === 'coco' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 glass px-3 py-1.5 rounded-xl">
                🥥 Coco
              </span>
            )}
            {plant.growMedium === 'hydro' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 glass px-3 py-1.5 rounded-xl">
                💧 Hidro
              </span>
            )}
          </div>
        )}

        {/* Callout hidroponia */}
        {plant.growMedium === 'hydro' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3 flex gap-3 items-start">
            <span className="text-base shrink-0">💧</span>
            <p className="text-xs text-blue-300 leading-relaxed">
              Monitoreá EC y pH diariamente. Cambiá el reservorio cada 7-10 dias.
            </p>
          </div>
        )}

        {/* Notas de la planta */}
        {plant.notes && (
          <div className="glass-card rounded-2xl px-4 py-3 flex gap-3">
            <span className="text-base shrink-0">📝</span>
            <p className="text-sm text-ink-3 leading-relaxed">{plant.notes}</p>
          </div>
        )}

        {/* Progress Ring + salud */}
        {cycleProgress && (
          <div className="glass-card rounded-2xl p-5">
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
                <p className="text-sm font-bold text-flora-text mb-0.5">{t('plantDetail.vege_complete')}</p>
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
                    {t('plantDetail.flora_backdate_hint')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFloraPickerOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-app-border text-sm font-semibold text-ink-3 bg-app-card tap-highlight-none active:scale-95 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      const [y, m, d] = floraDateInput.split('-').map(Number)
                      const floraDate = new Date(y, m - 1, d)
                      startFlora(plant.id, floraDate)
                      // Sincronizar estado de planta (sin bloquear)
                      updatePlantStatusInSupabase(plant.id, 'active').catch((err) =>
                        console.error('Error sincronizando flora:', err)
                      )
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
                    // Sincronizar estado de planta (sin bloquear)
                    updatePlantStatusInSupabase(plant.id, 'active').catch((err) =>
                      console.error('Error sincronizando flora:', err)
                    )
                  }}
                  className="flex-1 py-3 rounded-xl border border-flora-border text-flora-text font-bold text-sm tap-highlight-none active:scale-95 transition-all bg-app-card"
                >
                  {t('plantDetail.today_button')}
                </button>
                <button
                  onClick={() => setFloraPickerOpen(true)}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
                >
                  🌸 {t('plantDetail.choose_date')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Vista semanal */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">{t('plantDetail.this_week')}</p>
            {currentWeek && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${
                isFlora
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-brand-subtle text-brand-400 border border-brand-border'
              }`}>
                {stageEmoji} {cycleTag}
              </span>
            )}
          </div>
          <div className="glass-card rounded-2xl px-2 py-2">
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
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">{selectedDayLabel}</p>
              <span className="text-[11px] text-ink-4 font-medium">
                {selectedDayTasks.length} {selectedDayTasks.length > 1 ? t('plantDetail.task_count_plural') : t('plantDetail.task_count')}
              </span>
            </div>

            {/* Nutrición */}
            {selectedDayTasks.filter((t) => t.type === 'nutrition').map((task) => (
              <div key={task.id}>
                <NutritionCard task={task} potVolumeLiters={potLiters} potCount={plant.potCount} table={table} />
                {!task.completed ? (
                  <button
                    onClick={() => setCompletingTask(task)}
                    className="mt-2 w-full py-3 rounded-xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand"
                  >
                    ✓ {t('plantDetail.mark_complete')}
                  </button>
                ) : (
                  <div className="mt-2 px-4 py-2.5 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-400">✅ {t('plantDetail.task_completed')}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.completionNotes && (
                        <span className="text-xs text-ink-3 italic truncate max-w-[120px]">"{task.completionNotes}"</span>
                      )}
                      <button
                        onClick={() => uncompleteTask(task.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-ink-3 bg-app-elevated border border-app-border px-2.5 py-1 rounded-lg tap-highlight-none active:scale-90 transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3">
                          <path d="M3 10h10a5 5 0 010 10H9m-6-10l4-4-4 4 4 4"/>
                        </svg>
                        Deshacer
                      </button>
                    </div>
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
                    💧 {t('plantDetail.irrigation_done')}
                  </button>
                ) : (
                  <div className="mt-2 px-4 py-2.5 rounded-xl bg-app-elevated border border-app-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-3">✅ Completado</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.completionNotes && (
                        <span className="text-xs text-ink-4 italic truncate max-w-[120px]">"{task.completionNotes}"</span>
                      )}
                      <button
                        onClick={() => uncompleteTask(task.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-ink-3 bg-app-card border border-app-border px-2.5 py-1 rounded-lg tap-highlight-none active:scale-90 transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3">
                          <path d="M3 10h10a5 5 0 010 10H9m-6-10l4-4-4 4 4 4"/>
                        </svg>
                        Deshacer
                      </button>
                    </div>
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
                    🌫️ {t('plantDetail.foliar_done')}
                  </button>
                ) : (
                  <div className="mt-2 px-4 py-2.5 rounded-xl bg-app-elevated border border-app-border flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-3">✅ Completado</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.completionNotes && (
                        <span className="text-xs text-ink-4 italic truncate max-w-[120px]">"{task.completionNotes}"</span>
                      )}
                      <button
                        onClick={() => uncompleteTask(task.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-ink-3 bg-app-card border border-app-border px-2.5 py-1 rounded-lg tap-highlight-none active:scale-90 transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3">
                          <path d="M3 10h10a5 5 0 010 10H9m-6-10l4-4-4 4 4 4"/>
                        </svg>
                        Deshacer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Observaciones y otras */}
            {selectedDayTasks.filter((t) => t.type !== 'nutrition' && t.type !== 'foliar' && t.type !== 'irrigation').length > 0 && (
              <div className="glass-card rounded-2xl divide-y divide-app-border px-2">
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
          <div className="glass-card rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">🌤️</p>
            <p className="text-sm text-ink-3">
              {isSelectedToday ? t('plantDetail.no_tasks_today') : t('plantDetail.no_tasks_day')}
            </p>
          </div>
        )}

        {/* Próximas */}
        {upcoming.length > 0 && (
          <section>
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">📅 Próximas tareas</p>
            <div className="glass-card rounded-2xl divide-y divide-app-border px-2">
              {upcoming.map((task) => (
                <TaskItem key={task.id} task={task} showDate />
              ))}
            </div>
          </section>
        )}

        {/* Diario de cultivo */}
        <DiarySection plantId={plant.id} currentWeekLabel={cycleTag} />

        {/* Iniciar floracion — visible desde el primer dia de vege */}
        {!plant.floraStartDate && plant.geneticType !== 'autoflower' && plant.status === 'active' && !needsFlora && !floraPickerOpen && (
          <button
            onClick={() => setFloraPickerOpen(true)}
            className="w-full py-4 rounded-2xl font-black text-base text-white tap-highlight-none active:scale-[0.98] transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: '1px solid rgba(245,158,11,0.5)' }}
          >
            <span className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-2 text-[15px]">🌸 {t('plantDetail.start_flora_btn')}</span>
              <span className="text-xs font-normal text-white/70">{t('plantDetail.start_flora_hint')}</span>
            </span>
          </button>
        )}

        {/* Flora date picker — cuando se abre desde el boton standalone (antes de las 6 semanas) */}
        {floraPickerOpen && !needsFlora && (
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3 mb-1">
              <span className="text-2xl">🌸</span>
              <div>
                <p className="text-sm font-bold text-ink-1 mb-0.5">Iniciar floración</p>
                <p className="text-sm text-ink-3">Elegí la fecha en que cambiaste el fotoperiodo.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wide mb-2">
                Fecha de inicio de floración
              </label>
              <input
                type="date"
                value={floraDateInput}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFloraDateInput(e.target.value)}
                className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 transition-colors shadow-card"
              />
              <p className="text-xs text-ink-4 mt-1.5">
                {t('plantDetail.flora_backdate_hint')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFloraPickerOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-app-border text-sm font-semibold text-ink-3 bg-app-elevated tap-highlight-none active:scale-95 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  const [y, m, d] = floraDateInput.split('-').map(Number)
                  const floraDate = new Date(y, m - 1, d)
                  startFlora(plant.id, floraDate)
                  updatePlantStatusInSupabase(plant.id, 'active').catch((err) =>
                    console.error('Error sincronizando flora:', err)
                  )
                  setFloraPickerOpen(false)
                }}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
              >
                🌸 Confirmar floración
              </button>
            </div>
          </div>
        )}

        {/* Zona de peligro */}
        {plant.status === 'active' && (
          <section className="pt-2 border-t border-app-border">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-widest mb-3">Zona de peligro</p>
            <div className="flex gap-3">
              {/* Descartar */}
              <button
                onClick={() => {
                  if (!window.confirm(`¿Descartar "${plant.name}"? ${t('plantDetail.discard_confirm')}`)) return
                  discardPlant(plant.id)
                  updatePlantStatusInSupabase(plant.id, 'discarded').catch(console.error)
                  navigate('/')
                }}
                className="flex-1 py-3 rounded-2xl border border-red-900/40 bg-red-950/30 flex flex-col items-center gap-1 tap-highlight-none active:scale-95 transition-all"
              >
                <span className="text-xl">🗑️</span>
                <span className="text-xs font-bold text-red-400">{t('plants.discard')}</span>
                <span className="text-[10px] text-red-900">{t('plantDetail.discard_hint')}</span>
              </button>

              {/* Cosechar */}
              {(plant.floraStartDate || plant.geneticType === 'autoflower') && (
                <button
                  onClick={() => setHarvestSheetOpen(true)}
                  className="flex-1 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col items-center gap-1 tap-highlight-none active:scale-95 transition-all"
                >
                  <span className="text-xl">🌾</span>
                  <span className="text-xs font-bold text-amber-400">{t('plants.harvest')}</span>
                  <span className="text-[10px] text-amber-700">{t('plantDetail.harvest_hint')}</span>
                </button>
              )}

              {/* Editar */}
              <Link
                to={`/plants/${plant.id}/edit`}
                className="flex-1 py-3 rounded-2xl border border-app-border bg-app-card flex flex-col items-center gap-1 tap-highlight-none active:scale-95 transition-all"
              >
                <span className="text-xl">⚙️</span>
                <span className="text-xs font-bold text-ink-3">{t('common.edit')}</span>
                <span className="text-[10px] text-ink-4">{t('plantDetail.edit_hint')}</span>
              </Link>
            </div>

            {/* Finalizar cultivo sin haber iniciado flora */}
            {!plant.floraStartDate && plant.geneticType !== 'autoflower' && (
              <button
                onClick={() => setHarvestSheetOpen(true)}
                className="mt-3 w-full py-3 rounded-2xl border border-amber-500/20 text-sm font-bold text-amber-400 bg-amber-500/5 tap-highlight-none active:scale-95 transition-all"
              >
                ✂️ Finalizar cultivo
              </button>
            )}
          </section>
        )}

        {/* Reactivar planta cosechada o descartada */}
        {(plant.status === 'harvested' || plant.status === 'discarded') && (
          <section className="pt-2 border-t border-app-border">
            <p className="text-[11px] font-bold text-ink-4 uppercase tracking-widest mb-3">
              {plant.status === 'harvested' ? `🌾 ${t('plantDetail.harvested_status')}` : `🗑️ ${t('plantDetail.discarded_status')}`}
            </p>
            <button
              onClick={() => {
                if (!window.confirm(`¿Reactivar "${plant.name}"? ${t('plantDetail.reactivate_confirm')}`)) return
                reactivatePlant(plant.id)
              }}
              className="w-full py-3 rounded-2xl border border-brand-border bg-brand-subtle text-brand-400 font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all"
            >
              ↩ {t('plants.reactivate')}
            </button>
          </section>
        )}

        {table && (
          <p className="text-[11px] text-center text-ink-4 pb-2">
            📊 {table.name.split('—')[0].trim()} · {potLiters}L por maceta
          </p>
        )}
      </div>

      {/* Sheet de completado con nota */}
      <CompleteTaskSheet
        task={completingTask}
        onConfirm={(taskId, notes) => {
          storeCompleteTask(taskId, notes)
          // Sincronizar con Supabase (sin bloquear)
          completeTaskInSupabase(taskId, notes).catch((err) =>
            console.error('Error sincronizando tarea completada:', err)
          )
        }}
        onClose={() => setCompletingTask(null)}
      />

      {/* Sheet de cosecha / descarte */}
      {harvestSheetOpen && (
        <HarvestSheet
          plant={plant}
          onConfirmHarvest={() => {
            harvestPlant(plant.id)
            // Sincronizar cosecha (sin bloquear)
            updatePlantStatusInSupabase(plant.id, 'harvested').catch((err) =>
              console.error('Error sincronizando cosecha:', err)
            )
            navigate('/')
          }}
          onConfirmDiscard={() => {
            discardPlant(plant.id)
            // Sincronizar descarte (sin bloquear)
            updatePlantStatusInSupabase(plant.id, 'discarded').catch((err) =>
              console.error('Error sincronizando descarte:', err)
            )
            navigate('/')
          }}
          onClose={() => setHarvestSheetOpen(false)}
        />
      )}
    </div>
  )
}
