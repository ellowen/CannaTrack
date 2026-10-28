import { LogoMark } from '@/components/ui'
import TaskTypeIcon from '@/components/ui/TaskTypeIcon'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import { usePlants } from '@/hooks/usePlants'
import { useTaskStore } from '@/store/taskStore'
import { useWeekLogStore } from '@/store/weekLogStore'
import { hasProAccess } from '@/lib/plan'
import { useSubscription } from '@/hooks/useSubscription'
import Button from '@/components/ui/Button'
import type { Plant, PlantStatus, ScheduledTask } from '@/types/plant'
import type { WeekLog } from '@/types/weekLog'
import { useTranslation } from '@/i18n'
import { getFloraStart } from '@/lib/flora-cycle'
import { CycleStrip } from '@/components/plant'

type TabType = 'active' | 'harvested' | 'discarded' | 'all'

export default function Inventory() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const TAB_LABELS: Record<TabType, string> = {
    active: t('inventory.tab_active'),
    harvested: t('inventory.tab_harvested'),
    discarded: t('inventory.tab_discarded'),
    all: t('inventory.tab_all'),
  }

  const { allPlants } = usePlants()
  const { tasks: allTasks } = useTaskStore()
  const logs = useWeekLogStore((s) => s.logs)
  const { plan } = useSubscription()

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
        (p.geneticType ?? '').toLowerCase().includes(query)
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
      {!hasProAccess(plan) && (
        <div className="mx-4 mt-4 bg-flora-bg border border-flora-border rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="shrink-0 text-flora-text"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg></span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-flora-text">Plan Pro</p>
            <p className="text-xs text-ink-3 mt-0.5">Accede a estadisticas avanzadas, exportacion y historial completo con el plan Pro.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-app-bg border-b border-app-border">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl text-ink-1 mb-4">{t('inventory.title')}</h1>

          <div className="relative">
            <input
              type="text"
              placeholder={t('inventory.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-app-card border border-app-border text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand-400"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true"><path d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3" /></svg></span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 w-6 h-6"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {Object.entries(TAB_LABELS).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all tap-highlight-none ${
                activeTab === tab
                  ? 'bg-brand-400 text-brand-on'
                  : 'bg-app-card border border-app-border text-ink-3'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4 border-b border-app-border">
        {[
          { value: String(stats.total), label: t('inventory.stat_total'), color: 'var(--ink-1)' },
          { value: `${stats.avgCycleDays}d`, label: t('inventory.stat_avg_cycle'), color: 'var(--vege-text)' },
          { value: `${stats.successRate}%`, label: t('inventory.stat_success'), color: 'var(--flora-text)' },
        ].map(({ value, label, color }) => (
          <div key={label} className="text-center">
            <div className="font-display text-2xl leading-none tabular" style={{ color, fontWeight: 600 }}>{value}</div>
            <div className="text-[11px] text-ink-3 mt-1.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Plants List */}
      <div className="px-4 py-4">
        {filteredPlants.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-3 flex justify-center"><LogoMark size={56} /></div>
            <p className="text-ink-3 mb-4">{t('inventory.empty')}</p>
            {searchQuery && (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                {t('inventory.clear_search')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredPlants.map((plant) => (
              <PlantInventoryCard
                key={plant.id}
                plant={plant}
                tasks={allTasks.filter((t) => t.plantId === plant.id)}
                photos={logs.filter((l) => l.plantId === plant.id && (l.photoDataUrl || l.photoUrl))}
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
  tasks: ScheduledTask[]
  photos: WeekLog[]
  onNavigate: () => void
}

function PlantInventoryCard({ plant, tasks, photos, onNavigate }: PlantInventoryCardProps) {
  const { t } = useTranslation()
  const completedTasks = tasks.filter((task) => task.completed).length
  const latestPhotoEntry = [...photos].sort((a, b) => b.logDate.getTime() - a.logDate.getTime())[0]
  const latestPhoto = latestPhotoEntry?.photoDataUrl ?? latestPhotoEntry?.photoUrl

  const startDate = plant.startDate instanceof Date ? plant.startDate : new Date(plant.startDate)
  const endDate = plant.endDate ? (plant.endDate instanceof Date ? plant.endDate : new Date(plant.endDate)) : null
  const floraStartDate = getFloraStart(plant)
  const today = new Date()

  // Dias de vegetativo y floracion transcurridos (una auto que aun no florece no tiene flora: nunca negativos)
  let vegeDays = 0
  let floraDays = 0
  let totalDays = 0
  if (endDate) {
    totalDays = Math.max(0, differenceInDays(endDate, startDate))
    if (floraStartDate) {
      vegeDays = Math.max(0, Math.min(differenceInDays(floraStartDate, startDate), totalDays))
      floraDays = Math.max(0, differenceInDays(endDate, floraStartDate))
    } else {
      vegeDays = totalDays
    }
  } else if (plant.status === 'active') {
    totalDays = Math.max(0, differenceInDays(today, startDate))
    if (floraStartDate && today >= floraStartDate) {
      vegeDays = Math.max(0, differenceInDays(floraStartDate, startDate))
      floraDays = differenceInDays(today, floraStartDate)
    } else {
      vegeDays = totalDays
    }
  }

  const STATUS_BADGES: Record<PlantStatus, { label: string; color: string }> = {
    active: { label: t('plants.status_active'), color: 'bg-brand-subtle text-brand-text border-brand-border' },
    harvested: { label: t('plants.status_harvested'), color: 'bg-flora-bg text-flora-text border-flora-border' },
    discarded: { label: t('plants.status_discarded'), color: 'bg-app-elevated text-ink-3 border-app-border' },
  }
  const statusBadge = STATUS_BADGES[plant.status]
  const cycleText = endDate || plant.status !== 'active'
    ? `${vegeDays}d vege + ${floraDays}d flora = ${totalDays}d total`
    : `${vegeDays}d vege${floraDays > 0 ? ` + ${floraDays}d flora` : ''}`

  return (
    <div
      onClick={onNavigate}
      className="bg-app-card rounded-3xl border border-app-border overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
    >
      <div className="p-4">
        <div className="flex gap-3">
          <div
            className="w-16 h-16 rounded-2xl shrink-0 bg-app-elevated border border-app-border bg-cover bg-center flex items-center justify-center text-2xl"
            style={latestPhoto ? { backgroundImage: `url(${latestPhoto})` } : undefined}
          >
            {!latestPhoto && <span className="text-ink-4"><TaskTypeIcon type="nutrition" className="w-7 h-7" /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base text-ink-1 leading-tight truncate">{plant.name}</h3>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-ink-3 truncate mt-0.5">{plant.genetics}</p>
            <p className="text-[11px] text-ink-4 mt-1">
              {plant.geneticType === 'autoflower' ? 'Autofloreciente' : plant.geneticType === 'feminized' ? 'Feminizada' : plant.geneticType === 'regular' ? 'Regular' : ''}
            </p>
          </div>
        </div>

        {plant.status === 'active' && <CycleStrip plant={plant} className="mt-3" />}

        <div className="mt-3 text-xs text-ink-3 space-y-0.5">
          <div>{t('inventory.start_label')} {startDate.toLocaleDateString('es-AR')}{endDate ? ` · ${t('inventory.end_label')} ${endDate.toLocaleDateString('es-AR')}` : ''}</div>
          <div><span className="font-semibold text-ink-2">{t('inventory.cycle_label')}</span> {cycleText}</div>
          {plant.status === 'harvested' && plant.harvestWeightG != null && (
            <div className="font-semibold text-flora-text">{plant.harvestWeightG} g cosechados</div>
          )}
        </div>

        <div className="flex gap-4 text-xs text-ink-3 mt-3">
          <span><b className="text-ink-1 tabular">{completedTasks}</b> {t('inventory.tasks_label')}</span>
          <span><b className="text-ink-1 tabular">{photos.length}</b> {t('inventory.photos_label')}</span>
          <span><b className="text-ink-1 tabular">{tasks.length}</b> {t('inventory.stat_total')}</span>
        </div>

        <button className="w-full mt-3 py-2 rounded-xl bg-app-elevated border border-app-border text-ink-2 font-semibold text-sm tap-highlight-none">
          {t('inventory.view_button')} →
        </button>
      </div>
    </div>
  )
}
