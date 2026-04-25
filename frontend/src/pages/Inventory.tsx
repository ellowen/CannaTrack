import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import { usePlants } from '@/hooks/usePlants'
import { useTaskStore } from '@/store/taskStore'
import { useWeekLogStore } from '@/store/weekLogStore'
import Button from '@/components/ui/Button'
import type { Plant, PlantStatus } from '@/types/plant'

type TabType = 'active' | 'harvested' | 'discarded' | 'all'

const TAB_LABELS: Record<TabType, string> = {
  active: 'Activas',
  harvested: 'Cosechadas',
  discarded: 'Descartadas',
  all: 'Todas',
}

const STATUS_BADGES: Record<PlantStatus, { label: string; emoji: string; color: string }> = {
  active: { label: 'Activa', emoji: '🌱', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100' },
  harvested: { label: 'Cosechada', emoji: '✂️', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100' },
  discarded: { label: 'Descartada', emoji: '❌', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100' },
}

export default function Inventory() {
  const navigate = useNavigate()
  const { allPlants } = usePlants()
  const { tasks: allTasks } = useTaskStore()
  const logs = useWeekLogStore((s) => s.logs)

  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter plants by tab
  const plantsByTab = useMemo(() => {
    const filterMap: Record<TabType, (p: Plant) => boolean> = {
      active: (p) => p.status === 'active',
      harvested: (p) => p.status === 'harvested',
      discarded: (p) => p.status === 'discarded',
      all: () => true,
    }
    return allPlants.filter(filterMap[activeTab])
  }, [allPlants, activeTab])

  // Filter by search + sort
  const filteredPlants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return plantsByTab

    return plantsByTab.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.genetics.toLowerCase().includes(query) ||
        p.geneticType.toLowerCase().includes(query)
    )
  }, [plantsByTab, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const total = allPlants.length
    const harvested = allPlants.filter((p) => p.status === 'harvested').length
    const harvestedWithEndDate = allPlants.filter(
      (p) => p.status === 'harvested' && p.endDate
    )

    const avgCycleDays =
      harvestedWithEndDate.length > 0
        ? Math.round(
            harvestedWithEndDate.reduce((sum, p) => {
              const days = differenceInDays(p.endDate!, p.startDate)
              return sum + days
            }, 0) / harvestedWithEndDate.length
          )
        : 0

    const successRate = total > 0 ? Math.round((harvested / total) * 100) : 0

    return { total, avgCycleDays, successRate }
  }, [allPlants])

  return (
    <div className="min-h-screen bg-app-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-bg border-b border-app-border">
        <div className="px-5 pt-5 pb-4">
          <h1 className="text-2xl font-bold text-app-text mb-4">Historial de cultivos</h1>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar planta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-lg bg-app-card border border-app-border text-app-text placeholder-app-text-muted focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
          {Object.entries(TAB_LABELS).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-green-500 text-white'
                  : 'bg-app-card border border-app-border text-app-text hover:bg-app-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-app-border">
        <div className="text-center">
          <div className="text-xl font-bold text-green-500">{stats.total}</div>
          <div className="text-xs text-app-text-muted">Total</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-500">{stats.avgCycleDays}d</div>
          <div className="text-xs text-app-text-muted">Ciclo prom.</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-amber-500">{stats.successRate}%</div>
          <div className="text-xs text-app-text-muted">Éxito</div>
        </div>
      </div>

      {/* Plants List */}
      <div className="px-5 py-4">
        {filteredPlants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-app-text-muted mb-4">Sin plantas en esta categoría</p>
            {searchQuery && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlants.map((plant) => (
              <PlantInventoryCard
                key={plant.id}
                plant={plant}
                tasks={allTasks.filter((t) => t.plantId === plant.id)}
                photos={logs.filter((l) => l.plantId === plant.id && l.photoDataUrl)}
                onNavigate={() => navigate(`/plants/${plant.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface PlantInventoryCardProps {
  plant: Plant
  tasks: any[]
  photos: any[]
  onNavigate: () => void
}

function PlantInventoryCard({ plant, tasks, photos, onNavigate }: PlantInventoryCardProps) {
  const completedTasks = tasks.filter((t) => t.completed).length
  const latestPhoto = photos
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())[0]
    ?.photoDataUrl

  // Calculate cycle info
  const startDate = plant.startDate instanceof Date ? plant.startDate : new Date(plant.startDate)
  const endDate = plant.endDate
    ? plant.endDate instanceof Date
      ? plant.endDate
      : new Date(plant.endDate)
    : null

  let vegeDays = 0
  let floraDays = 0
  let totalDays = 0

  if (endDate) {
    totalDays = differenceInDays(endDate, startDate)
    if (plant.floraStartDate) {
      const floraStart = plant.floraStartDate instanceof Date
        ? plant.floraStartDate
        : new Date(plant.floraStartDate)
      vegeDays = differenceInDays(floraStart, startDate)
      floraDays = differenceInDays(endDate, floraStart)
    } else {
      vegeDays = totalDays
    }
  } else if (plant.floraStartDate && plant.status === 'active') {
    const floraStart = plant.floraStartDate instanceof Date
      ? plant.floraStartDate
      : new Date(plant.floraStartDate)
    vegeDays = differenceInDays(floraStart, startDate)
    const today = new Date()
    floraDays = differenceInDays(today, floraStart)
    totalDays = vegeDays + floraDays
  } else if (plant.status === 'active') {
    const today = new Date()
    totalDays = differenceInDays(today, startDate)
    vegeDays = totalDays
  }

  const statusBadge = STATUS_BADGES[plant.status]
  const cycleText = endDate || plant.status !== 'active'
    ? `${vegeDays}d vege + ${floraDays}d flora = ${totalDays}d total`
    : `${vegeDays}d vege${plant.floraStartDate ? ` + ${floraDays}d flora` : ''}`

  return (
    <div
      onClick={onNavigate}
      className="bg-app-card rounded-2xl border border-app-border shadow-card-md overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-card-lg"
    >
      {/* Photo or gradient header */}
      <div
        className="h-40 relative overflow-hidden bg-cover bg-center"
        style={
          latestPhoto
            ? { backgroundImage: `url(${latestPhoto})` }
            : { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }
        }
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
            {statusBadge.emoji} {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title & Genetics */}
        <div className="mb-3">
          <h3 className="font-bold text-app-text">{plant.name}</h3>
          <p className="text-sm text-app-text-muted">{plant.genetics}</p>
          <p className="text-xs text-app-text-muted mt-1">
            {plant.geneticType === 'autoflower' ? '🤖 Autofloreciente' : ''}
            {plant.geneticType === 'feminized' ? '♀️ Feminizada' : ''}
            {plant.geneticType === 'regular' ? '⚧️ Regular' : ''}
          </p>
        </div>

        {/* Dates */}
        <div className="text-xs text-app-text-muted mb-3">
          <div>Inicio: {startDate.toLocaleDateString('es-AR')}</div>
          {endDate && <div>Fin: {endDate.toLocaleDateString('es-AR')}</div>}
        </div>

        {/* Cycle info */}
        <div className="bg-app-bg rounded-lg p-2.5 mb-3 text-xs text-app-text">
          <div className="font-medium">Ciclo:</div>
          <div className="text-app-text-muted">{cycleText}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center mb-3 text-xs">
          <div>
            <div className="font-bold text-green-500">{completedTasks}</div>
            <div className="text-app-text-muted">📊 Tareas</div>
          </div>
          <div>
            <div className="font-bold text-blue-500">{photos.length}</div>
            <div className="text-app-text-muted">📸 Fotos</div>
          </div>
          <div>
            <div className="font-bold text-purple-500">{tasks.length}</div>
            <div className="text-app-text-muted">📝 Total</div>
          </div>
        </div>

        {/* View button */}
        <button className="w-full py-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 font-medium text-sm hover:bg-green-500/20 transition-colors">
          Ver detalles →
        </button>
      </div>
    </div>
  )
}
