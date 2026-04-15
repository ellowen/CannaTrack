import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { PlantCard } from '@/components/plant'
import { differenceInDays } from 'date-fns'

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
  const { name } = useUserStore()
  const { plants, allPlants } = usePlants()
  const { todayTasks } = useTasks()
  const { completeTask } = useTaskStore()

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dateLabel = format(today, "EEEE d 'de' MMMM", { locale: es })

  const pendingTasks = todayTasks.filter((t) => !t.completed)
  const doneTasks = todayTasks.filter((t) => t.completed)
  const allDone = todayTasks.length > 0 && pendingTasks.length === 0

  const harvestedCount = allPlants.filter((p) => p.status === 'harvested').length
  const longestGrowDays = plants.length > 0
    ? Math.max(...plants.map((p) => differenceInDays(today, p.startDate)))
    : 0

  function getPlantName(plantId: string) {
    return plants.find((p) => p.id === plantId)?.name ?? '—'
  }

  return (
    <div className="px-4 pt-8 pb-6">
      {/* Header */}
      <div className="mb-7">
        <p className="text-xs text-ink-3 uppercase tracking-widest mb-1 capitalize">{dateLabel}</p>
        <h1 className="text-3xl font-black text-ink-1 leading-tight">
          {greeting}, {name.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Sección HOY */}
      {plants.length > 0 && todayTasks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">
              Hoy · {pendingTasks.length > 0 ? `${pendingTasks.length} pendiente${pendingTasks.length > 1 ? 's' : ''}` : 'Todo al día ✓'}
            </h2>
          </div>

          <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
            {/* Pending tasks */}
            {pendingTasks.map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < pendingTasks.length - 1 ? 'border-b border-app-border' : ''}`}
              >
                <span className="text-xl shrink-0">{taskTypeIcon[task.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-1">
                    {taskTypeLabel[task.type] ?? task.type}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">{getPlantName(task.plantId)}</p>
                </div>
                <button
                  onClick={() => completeTask(task.id)}
                  className="shrink-0 text-xs font-bold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                >
                  Hecho
                </button>
              </div>
            ))}

            {/* Done tasks summary */}
            {doneTasks.length > 0 && (
              <div className={`px-4 py-3 flex items-center gap-2 bg-app-elevated ${pendingTasks.length > 0 ? 'border-t border-app-border' : ''}`}>
                <span className="text-base">✅</span>
                <span className="text-xs text-ink-3 font-medium">
                  {doneTasks.length} completada{doneTasks.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* All done state */}
            {allDone && (
              <div className="px-4 py-4 text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-sm font-semibold text-brand-500">¡Todo al día!</p>
                <p className="text-xs text-ink-3 mt-0.5">Buen trabajo por hoy</p>
              </div>
            )}
          </div>
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

    </div>
  )
}
