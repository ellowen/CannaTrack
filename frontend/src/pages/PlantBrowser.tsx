import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import type { Plant } from '@/types/plant'

const FREE_PLANT_LIMIT = 1

type Filter = 'todas' | 'activas' | 'vege' | 'flora' | 'cosechadas' | 'descartadas'

function currentWeek(plant: Plant): { label: string; num: number } {
  const today = new Date()
  if (plant.floraStartDate) {
    const num = Math.max(1, Math.ceil(differenceInDays(today, plant.floraStartDate) / 7) + 1)
    return { label: `F${num}`, num }
  }
  const num = Math.max(1, Math.ceil(differenceInDays(today, plant.startDate) / 7) + 1)
  return { label: `V${num}`, num }
}

function harvestEstimate(plant: Plant): string | null {
  if (!plant.floraStartDate) return null
  const endDate = new Date(plant.floraStartDate)
  endDate.setDate(endDate.getDate() + 56) // 8 semanas flora
  const daysLeft = differenceInDays(endDate, new Date())
  if (daysLeft <= 0) return 'Lista para cosechar'
  if (daysLeft === 1) return '1 dia para cosecha'
  return `${daysLeft} dias para cosecha`
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function ActivePlantCard({ plant, pendingCount }: { plant: Plant; pendingCount: number }) {
  const isFlora  = !!plant.floraStartDate
  const { label } = currentWeek(plant)
  const harvest  = harvestEstimate(plant)

  const gradient = isFlora
    ? 'var(--gradient-flora-card)'
    : 'var(--gradient-vege-card)'
  const accentBar = isFlora
    ? 'var(--gradient-flora-bar)'
    : 'var(--gradient-vege-bar)'
  const accentText = isFlora ? 'text-[var(--flora-text)]' : 'text-[var(--vege-text)]'
  const accentBg   = isFlora ? 'bg-[var(--flora-bg)]' : 'bg-[var(--vege-bg)]'
  const accentBorder = isFlora ? 'border-[var(--flora-border)]' : 'border-[var(--vege-border)]'

  return (
    <Link
      to={`/plants/${plant.id}`}
      className="block glass-card rounded-2xl overflow-hidden active:scale-[0.97] transition-all tap-highlight-none"
      style={{ background: gradient }}
    >
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ background: accentBar }} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-base text-ink-1 truncate">{plant.name}</h3>
            <p className="text-xs text-ink-3 truncate mt-0.5">{plant.genetics}</p>
          </div>
          <span className={clsx(
            'shrink-0 text-[10px] font-black px-2 py-1 rounded-full border',
            accentBg, accentText, accentBorder
          )}>
            {label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className={clsx('text-xs font-bold', accentText)}>
              {isFlora ? 'Flora' : 'Vegetativo'}
            </p>
            {harvest && (
              <p className="text-[11px] text-ink-3 mt-0.5 leading-tight">{harvest}</p>
            )}
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[11px] font-black text-red-400">
                {pendingCount} tarea{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function HistoryPlantCard({ plant }: { plant: Plant }) {
  const isHarvested = plant.status === 'harvested'
  const endDate = plant.floraStartDate
    ? format(new Date(plant.floraStartDate.getTime() + 56 * 24 * 60 * 60 * 1000), 'd MMM yyyy', { locale: es })
    : null
  const startStr = format(plant.startDate, 'd MMM yyyy', { locale: es })

  return (
    <Link
      to={`/plants/${plant.id}`}
      className="flex items-center gap-3 glass-card rounded-2xl p-4 active:scale-[0.97] transition-all tap-highlight-none"
    >
      <div className="w-10 h-10 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-xl shrink-0">
        {isHarvested ? '✂️' : '🗑️'}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-sm text-ink-1 truncate">{plant.name}</h3>
        <p className="text-xs text-ink-3 truncate">{plant.genetics}</p>
        <p className="text-[11px] text-ink-4 mt-0.5">Inicio: {startStr}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className={clsx(
          'text-[10px] font-black px-2 py-1 rounded-full border',
          isHarvested
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        )}>
          {isHarvested ? 'Cosechada' : 'Descartada'}
        </span>
        {endDate && (
          <p className="text-[10px] text-ink-4 mt-1">{endDate}</p>
        )}
      </div>
    </Link>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function PlantBrowser() {
  const plants      = usePlantStore((s) => s.plants)
  const tasks       = useTaskStore((s) => s.tasks)
  const plan        = useUserStore((s) => s.plan)
  const navigate    = useNavigate()

  const activePlants   = plants.filter((p) => p.status === 'active')
  const atFreeLimit    = plan === 'free' && activePlants.length >= FREE_PLANT_LIMIT

  const [filter, setFilter]   = useState<Filter>('activas')
  const [search, setSearch]   = useState('')

  // Pending tasks per plant (today, not completed)
  const pendingByPlant = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const map: Record<string, number> = {}
    for (const t of tasks) {
      if (!t.completed && t.scheduledDate >= today && t.scheduledDate < tomorrow) {
        map[t.plantId] = (map[t.plantId] ?? 0) + 1
      }
    }
    return map
  }, [tasks])

  // Counts for pill badges
  const counts = useMemo(() => ({
    todas:       plants.length,
    activas:     plants.filter(p => p.status === 'active').length,
    vege:        plants.filter(p => p.status === 'active' && !p.floraStartDate).length,
    flora:       plants.filter(p => p.status === 'active' && !!p.floraStartDate).length,
    cosechadas:  plants.filter(p => p.status === 'harvested').length,
    descartadas: plants.filter(p => p.status === 'discarded').length,
  }), [plants])

  const filtered = useMemo(() => {
    let result = plants
    if (filter === 'activas')     result = plants.filter(p => p.status === 'active')
    if (filter === 'vege')        result = plants.filter(p => p.status === 'active' && !p.floraStartDate)
    if (filter === 'flora')       result = plants.filter(p => p.status === 'active' && !!p.floraStartDate)
    if (filter === 'cosechadas')  result = plants.filter(p => p.status === 'harvested')
    if (filter === 'descartadas') result = plants.filter(p => p.status === 'discarded')

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.genetics.toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  }, [plants, filter, search])

  const PILLS: { key: Filter; label: string }[] = [
    { key: 'todas',       label: 'Todas' },
    { key: 'activas',     label: 'Activas' },
    { key: 'vege',        label: 'Vege' },
    { key: 'flora',       label: 'Flora' },
    { key: 'cosechadas',  label: 'Cosechadas' },
    { key: 'descartadas', label: 'Descartadas' },
  ]

  const activeFilter = ['activas', 'vege', 'flora'].includes(filter)

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-heavy border-b border-app-border">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-ink-1">Mis plantas</h1>
          {atFreeLimit ? (
            <button
              onClick={() => navigate('/plants/new')}
              className="w-9 h-9 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-ink-3 active:scale-90 transition-all tap-highlight-none relative"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute -top-1 -right-1 text-[10px] leading-none">🔒</span>
            </button>
          ) : (
            <Link
              to="/plants/new"
              className="w-9 h-9 rounded-xl bg-brand-400 flex items-center justify-center text-white shadow-glow-brand active:scale-90 transition-all tap-highlight-none"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-app-elevated border border-app-border rounded-xl px-3 py-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ink-4 shrink-0">
              <circle cx={11} cy={11} r={8} />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o genetica..."
              className="flex-1 bg-transparent text-sm text-ink-1 placeholder-ink-4 outline-none min-w-0"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="w-5 h-5 rounded-full bg-ink-4/20 flex items-center justify-center shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-ink-3">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {PILLS.map(({ key, label }) => {
            const count = counts[key]
            const active = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={clsx(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all tap-highlight-none active:scale-95',
                  active
                    ? 'bg-brand-400 border-brand-400 text-white shadow-glow-brand'
                    : 'bg-app-elevated border-app-border text-ink-3 hover:border-app-border-strong'
                )}
              >
                {label}
                {count > 0 && (
                  <span className={clsx(
                    'text-[10px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center px-1',
                    active ? 'bg-white/25 text-white' : 'bg-app-border text-ink-3'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-24 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
            <div className="text-5xl mb-4 opacity-60 float">🌱</div>
            <h2 className="text-lg font-black text-ink-1 mb-2">
              {search ? 'Sin resultados' : 'Sin plantas'}
            </h2>
            <p className="text-sm text-ink-3 mb-6 max-w-xs leading-relaxed">
              {search
                ? `No se encontraron plantas para "${search}"`
                : filter === 'activas' || filter === 'todas'
                  ? 'Crea tu primera planta para empezar el seguimiento'
                  : `No hay plantas ${filter === 'cosechadas' ? 'cosechadas' : filter === 'descartadas' ? 'descartadas' : `en ${filter}`} todavia`
              }
            </p>
            {(filter === 'activas' || filter === 'todas') && !search && (
              <Link
                to="/plants/new"
                className="px-6 py-3 rounded-2xl bg-brand-400 text-white font-black text-sm shadow-glow-brand active:scale-95 transition-all tap-highlight-none"
              >
                Agregar primera planta
              </Link>
            )}
          </div>
        ) : activeFilter ? (
          <div className="space-y-3">
            {filtered.map(plant => (
              <ActivePlantCard
                key={plant.id}
                plant={plant}
                pendingCount={pendingByPlant[plant.id] ?? 0}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(plant => (
              <HistoryPlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
