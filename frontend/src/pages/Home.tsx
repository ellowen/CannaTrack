import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useUserStore } from '@/store/userStore'
import { PlantCard } from '@/components/plant'

export default function Home() {
  const { name } = useUserStore()
  const { plants } = usePlants()
  const { todayTasks } = useTasks()

  const today = new Date()
  const pendingToday = todayTasks.filter((t) => !t.completed).length
  const dateLabel = format(today, "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Hola, {name}</h1>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span>
            <span className="font-semibold text-gray-900">{plants.length}</span>{' '}
            planta{plants.length !== 1 ? 's' : ''} activa{plants.length !== 1 ? 's' : ''}
          </span>
          {pendingToday > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-semibold text-brand-600">{pendingToday}</span>{' '}
                tarea{pendingToday !== 1 ? 's' : ''} hoy
              </span>
            </>
          )}
        </div>
      </div>

      {plants.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 select-none">🌱</div>
          <p className="text-gray-500 mb-6">Aún no tenés plantas registradas.</p>
          <Link
            to="/plants/new"
            className="inline-flex items-center gap-2 bg-brand-400 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-600 transition-colors"
          >
            Agregar primera planta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}

      {plants.length > 0 && (
        <Link
          to="/plants/new"
          className="fixed bottom-20 right-4 w-14 h-14 bg-brand-400 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-brand-600 transition-colors z-20"
          aria-label="Agregar planta"
        >
          +
        </Link>
      )}
    </div>
  )
}
