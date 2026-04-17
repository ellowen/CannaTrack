import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { PlantCard } from '@/components/plant'
import { CompleteTaskSheet } from '@/components/tasks'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { getLevelInfo } from '@/lib/gamification'
import type { ScheduledTask } from '@/types/plant'

const taskTypeIcon: Record<string, string> = {
  nutrition:   '🍃',
  irrigation:  '💧',
  observation: '🔍',
  foliar:      '🌫️',
  harvest:     '✂️',
}
const taskTypeLabel: Record<string, string> = {
  nutrition:   'Nutrición',
  irrigation:  'Riego',
  observation: 'Observación',
  foliar:      'Foliar',
  harvest:     'Cosecha',
}

export default function Home() {
  const navigate = useNavigate()
  const { name, streak, totalXP } = useUserStore()
  const levelInfo = getLevelInfo(totalXP)
  const { plants, allPlants } = usePlants()
  const [historialOpen, setHistorialOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [completingTask, setCompletingTask] = useState<ScheduledTask | null>(null)
  const { todayTasks, overdueTasks } = useTasks()
  const { completeTask } = useTaskStore()

  const handleRefresh = useCallback(() => {
    hapticSuccess()
    setRefreshKey((k) => k + 1)
  }, [])
  const { containerRef, onTouchStart, onTouchMove, onTouchEnd, pullProgress, refreshing } =
    usePullToRefresh({ onRefresh: handleRefresh })

  // refreshKey fuerza re-cálculo de "today"
  const today = new Date() // eslint-disable-line react-hooks/exhaustive-deps
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dateLabel = format(today, "EEEE d 'de' MMMM", { locale: es })

  const pendingTasks = todayTasks.filter((t) => !t.completed)
  const doneTasks = todayTasks.filter((t) => t.completed)
  const allDone = todayTasks.length > 0 && pendingTasks.length === 0

  // Agrupar pendientes por planta (solo cuando hay > 1 planta con tareas)
  const plantIdsWithTasks = [...new Set(pendingTasks.map((t) => t.plantId))]
  const multiPlant = plantIdsWithTasks.length > 1
  const taskGroups = plantIdsWithTasks.map((plantId) => ({
    plant: plants.find((p) => p.id === plantId),
    tasks: pendingTasks.filter((t) => t.plantId === plantId),
  }))

  const archivedPlants = allPlants.filter((p) => p.status === 'harvested' || p.status === 'discarded')
  const harvestedCount = allPlants.filter((p) => p.status === 'harvested').length
  const longestGrowDays = plants.length > 0
    ? Math.max(...plants.map((p) => differenceInDays(today, p.startDate)))
    : 0

  function getPlantName(plantId: string) {
    return plants.find((p) => p.id === plantId)?.name ?? '—'
  }

  void refreshKey // consumed by today recalc

  return (
    <>
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="px-4 pt-8 pb-6"
    >
      {/* Pull-to-refresh indicator */}
      {(pullProgress > 0 || refreshing) && (
        <div
          className="flex justify-center transition-all duration-200"
          style={{ marginBottom: refreshing ? 12 : `${(pullProgress * 12)}px`, marginTop: -28 }}
        >
          <div className={`w-8 h-8 rounded-full border-2 border-brand-400 flex items-center justify-center transition-all ${
            refreshing ? 'animate-spin border-t-transparent' : ''
          }`}
            style={{ opacity: pullProgress, transform: `rotate(${pullProgress * 180}deg)` }}
          >
            {!refreshing && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-brand-400">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-7">
        <p className="text-xs text-ink-3 uppercase tracking-widest mb-1 capitalize">{dateLabel}</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black text-ink-1 leading-tight">
            {greeting}{name ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          {/* Streak badge */}
          <div className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 shrink-0 ${
            streak >= 7
              ? 'bg-amber-500/15 border border-amber-500/30'
              : streak > 0
              ? 'bg-app-card border border-app-border'
              : 'bg-app-card border border-app-border'
          }`}>
            <span className={`text-xl ${streak >= 7 ? 'streak-fire' : ''}`}>🔥</span>
            <div className="text-right">
              <p className={`text-lg font-black tabular leading-none ${streak >= 7 ? 'text-amber-500' : 'text-ink-1'}`}>
                {streak}
              </p>
              <p className="text-[9px] font-bold text-ink-4 leading-none mt-0.5">
                {streak === 1 ? 'DIA' : 'DIAS'}
              </p>
            </div>
          </div>
        </div>
        {/* Nivel del cultivador */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm">{levelInfo.current.emoji}</span>
          <span className="text-xs font-semibold text-ink-3">{levelInfo.current.name}</span>
          {levelInfo.next && (
            <>
              <div className="flex-1 h-1 rounded-full bg-app-border overflow-hidden max-w-[80px]">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-700"
                  style={{ width: `${levelInfo.progressToNext * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-ink-4">{levelInfo.next.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Sección VENCIDAS */}
      {plants.length > 0 && overdueTasks.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">
            ⚠️ Vencidas · {overdueTasks.length}
          </h2>
          <div className="bg-app-card rounded-2xl border border-red-200 dark:border-red-900/50 shadow-card overflow-hidden">
            {overdueTasks.map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < overdueTasks.length - 1 ? 'border-b border-app-border' : ''}`}
              >
                <button
                  onClick={() => { hapticLight(); navigate(`/plants/${task.plantId}`) }}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left tap-highlight-none"
                >
                  <span className="text-xl shrink-0">{taskTypeIcon[task.type] ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-1">{taskTypeLabel[task.type] ?? task.type}</p>
                    <p className="text-xs text-red-400 mt-0.5 font-medium">
                      {format(task.scheduledDate, "d MMM", { locale: es })} · {getPlantName(task.plantId)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => { hapticLight(); setCompletingTask(task) }}
                  className="shrink-0 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                >
                  Hecho
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sección HOY */}
      {plants.length > 0 && todayTasks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">
              ⚡ Hoy · {pendingTasks.length > 0
                ? `${pendingTasks.length} pendiente${pendingTasks.length > 1 ? 's' : ''}`
                : 'Todo al día ✓'}
            </h2>
            {doneTasks.length > 0 && pendingTasks.length > 0 && (
              <span className="text-[11px] font-semibold text-brand-400">
                {doneTasks.length} ✓
              </span>
            )}
          </div>

          {/* All done */}
          {allDone ? (
            <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-5 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm font-bold text-brand-400">¡Todo al día!</p>
              <p className="text-xs text-ink-3 mt-0.5">Buen trabajo por hoy</p>
            </div>
          ) : multiPlant ? (
            /* Vista agrupada por planta */
            <div className="space-y-3">
              {taskGroups.map(({ plant: p, tasks: pts }) => (
                <div key={p?.id ?? 'unknown'} className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
                  {/* Cabecera de planta — tappable */}
                  <Link
                    to={p ? `/plants/${p.id}` : '#'}
                    className="flex items-center gap-2 px-4 py-2.5 bg-app-elevated border-b border-app-border tap-highlight-none active:bg-app-card transition-colors"
                  >
                    <span className="text-sm">🌿</span>
                    <span className="text-xs font-bold text-ink-2 truncate">{p?.name ?? '—'}</span>
                    <span className="ml-auto text-[10px] font-semibold text-ink-4">
                      {pts.length} tarea{pts.length > 1 ? 's' : ''}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-ink-4 shrink-0">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  {pts.map((task, i) => (
                    <div key={task.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < pts.length - 1 ? 'border-b border-app-border' : ''}`}>
                      <button
                        onClick={() => { hapticLight(); navigate(`/plants/${task.plantId}`) }}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left tap-highlight-none"
                      >
                        <span className="text-xl shrink-0">{taskTypeIcon[task.type] ?? '📌'}</span>
                        <p className="text-sm font-semibold text-ink-1 truncate">
                          {taskTypeLabel[task.type] ?? task.type}
                        </p>
                      </button>
                      <button
                        onClick={() => { hapticLight(); setCompletingTask(task) }}
                        className="shrink-0 text-xs font-bold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                      >
                        Hecho
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* Vista plana — 1 sola planta */
            <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
              {pendingTasks.map((task, i) => (
                <div key={task.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < pendingTasks.length - 1 ? 'border-b border-app-border' : ''}`}>
                  <button
                    onClick={() => { hapticLight(); navigate(`/plants/${task.plantId}`) }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left tap-highlight-none"
                  >
                    <span className="text-xl shrink-0">{taskTypeIcon[task.type] ?? '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-1">{taskTypeLabel[task.type] ?? task.type}</p>
                      <p className="text-xs text-ink-3 mt-0.5 truncate">{getPlantName(task.plantId)}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { hapticLight(); setCompletingTask(task) }}
                    className="shrink-0 text-xs font-bold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                  >
                    Hecho
                  </button>
                </div>
              ))}
              {doneTasks.length > 0 && (
                <div className="px-4 py-3 flex items-center gap-2 bg-app-elevated border-t border-app-border">
                  <span className="text-base">✅</span>
                  <span className="text-xs text-ink-3 font-medium">
                    {doneTasks.length} completada{doneTasks.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Stats row — solo cuando hay plantas */}
      {plants.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: plants.length, label: plants.length === 1 ? 'Planta activa' : 'Plantas activas', icon: '🌱' },
            { value: pendingTasks.length, label: pendingTasks.length === 1 ? 'Tarea hoy' : 'Tareas hoy', icon: '⚡' },
            { value: longestGrowDays > 0 ? longestGrowDays : harvestedCount,
              label: longestGrowDays > 0 ? 'Días de grow' : harvestedCount === 1 ? 'Cosecha' : 'Cosechas',
              icon: longestGrowDays > 0 ? '📅' : '🏆' },
          ].map(({ value, label, icon }) => (
            <div key={label} className="bg-app-card rounded-2xl border border-app-border shadow-card p-3 text-center">
              <p className="text-xl mb-0.5">{icon}</p>
              <p className="text-2xl font-black text-ink-1 tabular leading-none">{value}</p>
              <p className="text-[10px] text-ink-3 font-semibold mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Plantas */}
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-7xl mb-4 select-none">🌱</div>
          <h2 className="text-xl font-black text-ink-1 mb-2">Tu grow empieza acá</h2>
          <p className="text-sm text-ink-3 mb-8 max-w-[240px] leading-relaxed">
            Registrá tu primera planta en 30 segundos y generamos el calendario automáticamente
          </p>
          <Link
            to="/plants/new"
            className="inline-flex items-center gap-2 bg-brand-400 text-white font-bold px-7 py-4 rounded-2xl shadow-glow-brand transition-all active:scale-[0.97] tap-highlight-none text-base"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Agregar primera planta
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">
              Plantas · {plants.length}
            </h2>
          </div>
          <div className="space-y-4">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        </>
      )}

      {/* Historial — cosechadas y descartadas */}
      {archivedPlants.length > 0 && (
        <section className="mt-6">
          <button
            onClick={() => setHistorialOpen((v) => !v)}
            className="w-full flex items-center justify-between mb-3 tap-highlight-none"
          >
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">
              Historial · {archivedPlants.length}
            </h2>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className={`w-4 h-4 text-ink-4 transition-transform duration-200 ${historialOpen ? 'rotate-180' : ''}`}
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {historialOpen && (
            <div className="space-y-2 task-in">
              {archivedPlants.map((plant) => {
                const isHarvested = plant.status === 'harvested'
                const growDays = differenceInDays(new Date(), plant.startDate)
                return (
                  <Link
                    key={plant.id}
                    to={`/plants/${plant.id}`}
                    className="flex items-center gap-3 bg-app-card rounded-2xl border border-app-border shadow-card px-4 py-3 tap-highlight-none active:scale-[0.987] transition-all"
                  >
                    <span className="text-2xl shrink-0">{isHarvested ? '✂️' : '🗑️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink-2 truncate">{plant.name}</p>
                      <p className="text-xs text-ink-4 truncate">{plant.genetics}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isHarvested
                          ? 'bg-vege-bg text-vege-text border-vege-border'
                          : 'bg-app-elevated text-ink-4 border-app-border'
                      }`}>
                        {isHarvested ? 'Cosechada' : 'Descartada'}
                      </span>
                      <p className="text-[11px] text-ink-4 mt-1">
                        {growDays}d · {format(plant.startDate, "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      )}

    </div>

    {/* Sheet de completado — accesible desde Home también */}
    <CompleteTaskSheet
      task={completingTask}
      onConfirm={(taskId, notes) => completeTask(taskId, notes)}
      onClose={() => setCompletingTask(null)}
    />
    </>
  )
}
