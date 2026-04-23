import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInHours, addDays } from 'date-fns'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useUserStore } from '@/store/userStore'
import { useTaskStore } from '@/store/taskStore'
import { PlantCard } from '@/components/plant'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { CompleteTaskSheet } from '@/components/tasks'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { getLevelInfo } from '@/lib/gamification'
import type { ScheduledTask } from '@/types/plant'

// Task type utilities
const taskTypeIcon: Record<string, string> = {
  nutrition: '🍃',
  irrigation: '💧',
  observation: '🔍',
  foliar: '🌫️',
  harvest: '✂️',
}

const taskTypeLabel: Record<string, string> = {
  nutrition: 'Nutrición',
  irrigation: 'Riego',
  observation: 'Observación',
  foliar: 'Foliar',
  harvest: 'Cosecha',
}

// interface TaskAction {
//   icon: string
//   label: string
//   action: string
// }

// const taskActions: Record<string, TaskAction> = {
//   undo: { icon: '↶', label: 'UNDO', action: 'undo' },
//   changeTime: { icon: '🕐', label: 'Cambiar hora', action: 'changeTime' },
//   remind: { icon: '🔔', label: 'Recordatorio', action: 'remind' },
// }

/**
 * Dashboard — Página principal con greeting, streak, level, todayTasks y plants grid.
 *
 * Mock data integrada:
 * - 2 plantas (Auto Blueberry en VEGE S3, Crítica AF en FLORA F4)
 * - 3 tareas hoy (riego completed, nutrientes pending, foto pending)
 * - XP: 150, Level: 2, Streak: 5 días
 */
export default function Dashboard() {
  const navigate = useNavigate()
  const { name, streak, totalXP, addXP } = useUserStore()
  const { plants, allPlants } = usePlants()
  const { todayTasks } = useTasks()
  const { completeTask } = useTaskStore()

  const [historialOpen, setHistorialOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [completingTask, setCompletingTask] = useState<ScheduledTask | null>(null)

  const levelInfo = getLevelInfo(totalXP)
  const displayName = name || 'Usuario'

  const handleRefresh = useCallback(() => {
    hapticSuccess()
    setRefreshKey((k) => k + 1)
  }, [])

  const { containerRef, onTouchStart, onTouchMove, onTouchEnd, pullProgress, refreshing } =
    usePullToRefresh({ onRefresh: handleRefresh })

  // Refetch today each refresh
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  void refreshKey

  // Separate pending and completed tasks
  const pendingTasks = todayTasks.filter((t) => !t.completed)
  const doneTasks = todayTasks.filter((t) => t.completed)
  const allDone = todayTasks.length > 0 && pendingTasks.length === 0

  // Plant stats
  const vegePlants = plants.filter((p) => {
    // Simple heuristic: check if floraStartDate is set and in past
    return !p.floraStartDate || new Date(p.floraStartDate) > today
  })
  const floraPlants = plants.filter((p) => p.floraStartDate && new Date(p.floraStartDate) <= today)
  const readyToHarvest = plants.filter((p) => {
    // Plants with estimated harvest in past
    if (!p.floraStartDate) return false
    const estimatedHarvest = addDays(new Date(p.floraStartDate), 56) // ~8 weeks
    return estimatedHarvest <= today
  })

  // Archived plants
  const archivedPlants = allPlants.filter((p) => p.status === 'harvested' || p.status === 'discarded')

  // Handle task completion
  const handleCompleteTask = (task: ScheduledTask) => {
    hapticLight()
    setCompletingTask(task)
  }

  const handleTaskConfirm = (notes?: string) => {
    if (completingTask) {
      completeTask(completingTask.id, notes)
      // Award XP
      addXP(15) // COMPLETE_TASK base
      setCompletingTask(null)
    }
  }

  // const handleTaskAction = (task: ScheduledTask, action: string) => {
  //   switch (action) {
  //     case 'undo':
  //       if (task.completedAt) {
  //         hapticLight()
  //         updateTask(task.id, { completed: false, completedAt: undefined, completionNotes: undefined })
  //       }
  //       break
  //     case 'changeTime':
  //       // TODO: open time picker sheet
  //       hapticLight()
  //       break
  //     case 'remind':
  //       // TODO: open reminder sheet
  //       hapticLight()
  //       break
  //   }
  // }

  const handleNewPlant = () => {
    hapticLight()
    navigate('/plants/new')
  }

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
            <div
              className={`w-8 h-8 rounded-full border-2 border-brand-400 flex items-center justify-center transition-all ${
                refreshing ? 'animate-spin border-t-transparent' : ''
              }`}
              style={{ opacity: pullProgress, transform: `rotate(${pullProgress * 180}deg)` }}
            >
              {!refreshing && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-4 h-4 text-brand-400"
                >
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2-8.83"></path>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* ═══ HEADER ═══ */}
        <section className="mb-8">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-ink-1">
              Hola, {displayName} 👋
            </h1>
          </div>

          {/* Streak + Level Row */}
          <div className="flex gap-3">
            {/* Streak Card */}
            <Card variant="outlined" padding="md" className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-xs text-ink-3 font-semibold uppercase tracking-wide">Racha</p>
                  <p className="text-xl font-black text-ink-1">{streak} días</p>
                </div>
              </div>
            </Card>

            {/* Level + XP Card */}
            <Card variant="outlined" padding="md" className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{levelInfo.current.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs text-ink-3 font-semibold uppercase tracking-wide">
                    {levelInfo.current.name}
                  </p>
                  <p className="text-sm font-bold text-ink-1">
                    {levelInfo.current.level} • {totalXP % 100}/100 XP
                  </p>
                  {/* Progress bar to next level */}
                  {levelInfo.next && (
                    <div className="w-full h-1 rounded-full bg-app-elevated mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full"
                        style={{ width: `${levelInfo.progressToNext * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ═══ TODAY TASKS ═══ */}
        {todayTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-ink-1 mb-4">Tareas de hoy</h2>

            {allDone ? (
              <Card padding="lg" className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm font-semibold text-ink-2">¡Todas las tareas completadas!</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => {
                  const plant = plants.find((p) => p.id === task.plantId)
                  const timeRemaining = differenceInHours(new Date(task.scheduledDate), today)

                  return (
                    <Card
                      key={task.id}
                      padding="md"
                      onClick={() => handleCompleteTask(task)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xl">{taskTypeIcon[task.type]}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-ink-1">
                            {taskTypeLabel[task.type]}
                          </p>
                          {plant && (
                            <p className="text-xs text-ink-3">{plant.name}</p>
                          )}
                        </div>
                      </div>
                      {timeRemaining > 0 && (
                        <span className="text-xs text-ink-4 font-medium tabular">
                          en {timeRemaining}h
                        </span>
                      )}
                      {timeRemaining <= 0 && (
                        <span className="text-xs text-red-500 font-bold">Vencida</span>
                      )}
                    </Card>
                  )
                })}

                {doneTasks.length > 0 && (
                  <div className="pt-2 border-t border-app-border">
                    <p className="text-xs text-ink-4 font-semibold mb-2">
                      {doneTasks.length} completada{doneTasks.length > 1 ? 's' : ''}
                    </p>
                    {doneTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 py-2 text-ink-4"
                      >
                        <span className="text-lg">✓</span>
                        <span className="text-xs line-through">
                          {taskTypeLabel[task.type]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ═══ STATS ROW ═══ */}
        {plants.length > 0 && (
          <section className="mb-8">
            <div className="grid grid-cols-3 gap-2">
              <Card padding="md" className="text-center">
                <p className="text-2xl font-black text-brand-500">{vegePlants.length}</p>
                <p className="text-[10px] text-ink-3 font-semibold mt-1">
                  planta{vegePlants.length !== 1 ? 's' : ''} en vege
                </p>
              </Card>
              <Card padding="md" className="text-center">
                <p className="text-2xl font-black text-flora-text">{floraPlants.length}</p>
                <p className="text-[10px] text-ink-3 font-semibold mt-1">
                  en floración
                </p>
              </Card>
              <Card padding="md" className="text-center">
                <p className="text-2xl font-black text-task-harvest">{readyToHarvest.length}</p>
                <p className="text-[10px] text-ink-3 font-semibold mt-1">
                  lista{readyToHarvest.length !== 1 ? 's' : ''} cosechar
                </p>
              </Card>
            </div>
          </section>
        )}

        {/* ═══ PLANTS GRID ═══ */}
        {plants.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-ink-1 mb-4">Mis plantas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
              {/* New Plant Button */}
              <button
                onClick={handleNewPlant}
                className="rounded-3xl border-2 border-dashed border-app-border hover:border-brand-400 hover:bg-brand-subtle/20 transition-all flex items-center justify-center h-full min-h-[200px] tap-highlight-none active:scale-[0.987]"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">+</div>
                  <p className="text-sm font-semibold text-ink-2">Nueva planta</p>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* Empty State */}
        {plants.length === 0 && (
          <section className="mb-8 text-center py-12">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-ink-1 mb-2">Aún no tienes plantas</h2>
            <p className="text-sm text-ink-3 mb-6">
              Comienza agregando tu primera planta para
              <br />
              recibir un plan nutricional automático.
            </p>
            <Button variant="primary" onClick={handleNewPlant}>
              + Nueva planta
            </Button>
          </section>
        )}

        {/* ═══ HISTORIAL (COLLAPSIBLE) ═══ */}
        {archivedPlants.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setHistorialOpen(!historialOpen)}
              className="w-full flex items-center justify-between py-3 px-4 bg-app-elevated rounded-xl hover:bg-app-elevated/80 transition-colors"
            >
              <span className="font-semibold text-ink-2">
                Historial ({archivedPlants.length})
              </span>
              <span className={`transition-transform ${historialOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {historialOpen && (
              <div className="mt-3 space-y-2">
                {archivedPlants
                  .filter((p) => p.status === 'harvested')
                  .map((p) => (
                    <Card key={p.id} padding="md" className="flex items-center gap-3">
                      <span className="text-xl">✂️</span>
                      <div>
                        <p className="text-sm font-semibold text-ink-1">{p.name}</p>
                        <p className="text-xs text-ink-3">Cosechada</p>
                      </div>
                    </Card>
                  ))}
                {archivedPlants
                  .filter((p) => p.status === 'discarded')
                  .map((p) => (
                    <Card key={p.id} padding="md" className="flex items-center gap-3">
                      <span className="text-xl">🗑️</span>
                      <div>
                        <p className="text-sm font-semibold text-ink-1">{p.name}</p>
                        <p className="text-xs text-ink-3">Descartada</p>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Complete Task Sheet Modal */}
      {completingTask && (
        <CompleteTaskSheet
          task={completingTask}
          onConfirm={(_, notes) => {
            handleTaskConfirm(notes)
          }}
          onClose={() => setCompletingTask(null)}
        />
      )}
    </>
  )
}
