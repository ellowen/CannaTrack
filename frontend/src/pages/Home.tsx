import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useInitSync } from '@/hooks/useInitSync'
import { useUserStore } from '@/store/userStore'
import { ProgressRing } from '@/components/plant'
import { CompleteTaskSheet } from '@/components/tasks'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { getEstimatedHarvestDate, getCycleProgress } from '@/lib/nutrition-utils'
import { useAuth } from '@/contexts/AuthContext'
import { LogoMark } from '@/components/ui'
import { completeTaskInSupabase, uncompleteTaskInSupabase } from '@/lib/sync'
import { showErrorToast } from '@/store/toastStore'
import { enqueueSyncAction } from '@/lib/syncQueue'
import PlantTaskGroup from '@/components/tasks/PlantTaskGroup'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useTranslation } from '@/i18n'
import { isCannabisPlant } from '@/types/plant'
import type { ScheduledTask } from '@/types/plant'
import { daysUntilSowing, getActiveCycle, getFloraStart, isPlanned } from '@/lib/flora-cycle'

const TYPE_LABEL: Record<string, string> = {
  nutrition:   'Nutricion',
  irrigation:  'Riego',
  observation: 'Observacion',
  foliar:      'Foliar',
  harvest:     'Cosecha',
}
const TYPE_COLOR: Record<string, string> = {
  nutrition:   '#6BBF78',
  irrigation:  '#6BA3D6',
  observation: '#D9A441',
  foliar:      '#A98BD0',
  harvest:     '#D8715C',
}
const TYPE_BG: Record<string, string> = {
  nutrition:   'linear-gradient(135deg,#6BBF78,#3F8A4E)',
  irrigation:  'linear-gradient(135deg,#7FB0DC,#3F6FA3)',
  observation: 'linear-gradient(135deg,#E3B65A,#A97A25)',
  foliar:      'linear-gradient(135deg,#B79BDA,#7A5BA6)',
  harvest:     'linear-gradient(135deg,#E08A74,#A84A38)',
}

function TaskIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'
  const ic = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]'
  const bg = TYPE_BG[type] ?? 'linear-gradient(135deg,#52CC64,#1B6D28)'
  return (
    <div className={`${s} flex items-center justify-center shrink-0`} style={{ background: bg }}>
      <TaskIconSVG type={type} className={ic} />
    </div>
  )
}

function TaskIconSVG({ type, className }: { type: string; className: string }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className }
  switch (type) {
    case 'nutrition':
      return <svg {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
    case 'irrigation':
      return <svg {...p}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    case 'observation':
      return <svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
    case 'foliar':
      return <svg {...p}><path d="M12 22V12"/><path d="M12 12c0-5 4-8 8-8 0 4-3 8-8 8z"/><path d="M12 12c0-5-4-8-8-8 0 4 3 8 8 8z"/><path d="M5 20c2-2 4.5-3 7-3"/></svg>
    case 'harvest':
      return <svg {...p}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>
  }
}

export default function Home() {
  useInitSync()
  const { t } = useTranslation()

  const navigate  = useNavigate()
  const { name, streak, applyTaskReward } = useUserStore()
  const { isLoading, dataLoadError } = useAuth()
  const { plants } = usePlants()
  const [overdueExpanded, setOverdueExpanded] = useState(false)
  const [doneExpanded, setDoneExpanded]       = useState(false)
  // plantas con las tareas plegadas en "Para hacer hoy" (se recuerda entre visitas)
  const [collapsedPlants, setCollapsedPlants] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cultitrack-home-collapsed') ?? '[]') as string[]) } catch { return new Set() }
  })
  function saveCollapsed(next: Set<string>) {
    setCollapsedPlants(next)
    try { localStorage.setItem('cultitrack-home-collapsed', JSON.stringify([...next])) } catch { /* sin storage: no se recuerda */ }
  }
  const [refreshKey, setRefreshKey]           = useState(0)
  const [completingTask, setCompletingTask]   = useState<ScheduledTask | null>(null)
  const [resolvedAll, setResolvedAll]         = useState(false)
  // las acciones masivas piden confirmacion (un toque de mas evita marcar como hecho lo que no se hizo)
  const [bulkConfirm, setBulkConfirm]         = useState<'today' | 'overdue' | null>(null)
  const [completingIds, setCompletingIds]     = useState<Set<string>>(new Set())

  const { todayTasks, overdueTasks, completeTask, uncompleteTask } = useTasks()

  function handleComplete(task: ScheduledTask) {
    hapticLight()
    setCompletingIds(prev => new Set(prev).add(task.id))
    setTimeout(() => {
      setCompletingTask(task)
      setCompletingIds(prev => { const s = new Set(prev); s.delete(task.id); return s })
    }, 240)
  }

  async function handleResolveAll() {
    hapticSuccess()
    const ids = overdueTasks.map((t) => t.id)
    ids.forEach((id) => completeTask(id))
    setResolvedAll(true)
    setTimeout(() => setResolvedAll(false), 2500)
    // Una sola llamada de sync por tarea (antes se llamaba dos veces en
    // paralelo — via este handler y via completeTask — pudiendo otorgar
    // XP duplicado por la misma tarea). El premio que se aplica al cache
    // local es el que devuelve Supabase, no un calculo propio.
    let hadError = false
    const rewards = await Promise.all(ids.map((id) => completeTaskInSupabase(id).catch(() => { hadError = true; return null })))
    const xpGained = rewards.reduce((sum, r) => sum + (r?.xpGained ?? 0), 0)
    const newStreak = rewards.reduce<number | null>((max, r) => (r?.newStreak != null ? Math.max(max ?? 0, r.newStreak) : max), null)
    if (xpGained > 0) applyTaskReward(xpGained, newStreak)
    if (hadError) showErrorToast('Algunas tareas no se pudieron sincronizar. Revisá tu conexión.')
  }

  const handleRefresh = useCallback(() => { hapticSuccess(); setRefreshKey((k) => k + 1) }, [])
  const { containerRef, onTouchStart, onTouchMove, onTouchEnd, pullProgress, refreshing } =
    usePullToRefresh({ onRefresh: handleRefresh })

  void refreshKey
  const today   = new Date()
  const hour    = today.getHours()
  const greeting  = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const dateLabel = format(today, "EEEE d 'de' MMMM", { locale: es })

  const pending = todayTasks.filter((t) => !t.completed)
  const done    = todayTasks.filter((t) => t.completed)
  const allDone = todayTasks.length > 0 && pending.length === 0

  const nearestHarvest = useMemo(() => {
    return plants
      .map((p) => {
        const harvestDate = getEstimatedHarvestDate(p)
        const days = harvestDate ? differenceInDays(harvestDate, today) : null
        const progress = getCycleProgress(p, today)
        return { plant: p, days, progress }
      })
      .filter((x) => x.days !== null && x.days > 0)
      .sort((a, b) => a.days! - b.days!)[0] ?? null
  }, [plants]) // eslint-disable-line react-hooks/exhaustive-deps

  function getPlant(plantId: string) {
    return plants.find((p) => p.id === plantId)
  }

  /** Agrupa lo pendiente por planta (orden de primera aparicion). */
  const pendingByPlant = useMemo(() => {
    const groups = new Map<string, ScheduledTask[]>()
    for (const t of pending) groups.set(t.plantId, [...(groups.get(t.plantId) ?? []), t])
    return [...groups].map(([plantId, tasks]) => ({ plantId, tasks }))
  }, [pending])

  /** Completa sin abrir la hoja (check de la fila o "Todo" de la planta). */
  function handleQuickComplete(tasks: ScheduledTask[]) {
    hapticSuccess()
    const ids = tasks.map((t) => t.id)
    setCompletingIds((prev) => new Set([...prev, ...ids]))
    setTimeout(() => {
      void completeMany(ids)
      setCompletingIds((prev) => { const s = new Set(prev); ids.forEach((id) => s.delete(id)); return s })
    }, 240)
  }

  async function handleCompleteAll() {
    hapticSuccess()
    await completeMany(pending.map((t) => t.id))
  }

  async function completeMany(ids: string[]) {
    ids.forEach((id) => completeTask(id))
    let hadError = false
    const rewards = await Promise.all(ids.map((id) => completeTaskInSupabase(id).catch(() => { hadError = true; return null })))
    const xpGained = rewards.reduce((sum, r) => sum + (r?.xpGained ?? 0), 0)
    const newStreak = rewards.reduce<number | null>((max, r) => (r?.newStreak != null ? Math.max(max ?? 0, r.newStreak) : max), null)
    if (xpGained > 0) applyTaskReward(xpGained, newStreak)
    if (hadError) showErrorToast('Algunas tareas no se pudieron sincronizar. Revisá tu conexión.')
  }

  return (
    <>
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="px-4 pt-6 pb-6"
    >
      {/* Pull-to-refresh indicator */}
      {(pullProgress > 0 || refreshing) && (
        <div
          className="flex justify-center transition-all duration-200"
          style={{ marginBottom: refreshing ? 12 : `${pullProgress * 12}px`, marginTop: -28 }}
        >
          <div className={`w-8 h-8 rounded-full border-2 border-brand-400 flex items-center justify-center transition-all ${refreshing ? 'animate-spin border-t-transparent' : ''}`}
            style={{ opacity: pullProgress, transform: `rotate(${pullProgress * 180}deg)` }}
          >
            {!refreshing && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-brand-text">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        {/* Brand bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="font-display text-lg font-semibold text-ink-1 tracking-tight">
              Culti<span className="text-brand-text">Track</span>
            </span>
          </div>
        </div>
        <p className="text-[10px] text-ink-4 uppercase tracking-widest mb-1 first-letter:capitalize">{dateLabel}</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink-1 leading-tight">
            {greeting}{name ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          <div className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 shrink-0 ${
            streak >= 7 ? 'bg-flora-bg border border-flora-border'
                        : 'bg-app-card border border-app-border'
          }`}>
            <span className={`${streak >= 7 ? 'streak-fire text-flora-text' : 'text-flora-text'}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 1.8 1.8 2C10.5 8 11 5.5 12 3z" /></svg></span>
            <div className="text-right">
              <p className={`text-sm font-bold tabular leading-none ${streak >= 7 ? 'text-flora-text' : 'text-ink-1'}`}>{streak}</p>
              <p className="text-[8px] font-bold text-ink-4 leading-none mt-0.5">{streak === 1 ? t('home.streak_day') : t('home.streak_days')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* VENCIDAS */}
      {plants.length > 0 && overdueTasks.length > 0 && (
        <section className="mb-5">
          <div className="glass-card glass-red rounded-2xl overflow-hidden">
            {/* Primera tarea — CTA principal */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-task-harvest/15 text-task-harvest flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-task-harvest">
                  {overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''} vencida{overdueTasks.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-ink-3 mt-0.5 truncate">
                  {overdueTasks.map((t) => getPlant(t.plantId)?.name).filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {overdueTasks.length > 1 && (
                  <button
                    onClick={() => setBulkConfirm('overdue')}
                    className="text-xs font-bold text-task-harvest border border-task-harvest/40 px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
                  >
                    {resolvedAll ? '✓ Listo' : 'Todas'}
                  </button>
                )}
                <button
                  onClick={() => { hapticLight(); setCompletingTask(overdueTasks[0]) }}
                  className="text-xs font-bold text-white bg-task-harvest px-4 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
                >
                  Resolver
                </button>
              </div>
            </div>
            {(overdueExpanded ? overdueTasks.slice(1) : overdueTasks.slice(1, 4)).map((task) => {
              const p = getPlant(task.plantId)
              return (
                <button
                  key={task.id}
                  onClick={() => { hapticLight(); setCompletingTask(task) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-task-harvest/20 bg-task-harvest/5 tap-highlight-none"
                >
                  <TaskIcon type={task.type} size="sm" />
                  <span className="text-sm text-ink-2 flex-1 text-left font-medium truncate">
                    {TYPE_LABEL[task.type]} — {p?.name ?? '—'}
                  </span>
                  <span className="text-xs text-ink-4 shrink-0">{t('home.mark_done')}</span>
                </button>
              )
            })}
            {overdueTasks.length > 4 && (
              <button
                onClick={() => setOverdueExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-task-harvest/20 tap-highlight-none"
              >
                <span className="text-xs font-bold text-task-harvest">
                  {overdueExpanded ? t('home.view_less') : `Ver ${overdueTasks.length - 4} mas`}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  className={`w-3 h-3 text-task-harvest transition-transform ${overdueExpanded ? 'rotate-180' : ''}`}>
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </section>
      )}

      {/* BLOQUE PRINCIPAL — HOY */}
      {isLoading && plants.length === 0 ? (
        /* Skeleton mientras carga */
        <div className="space-y-4 mb-6">
          <div className="skeleton h-32 w-full" />
          <div className="flex gap-3 overflow-hidden">
            {[0,1,2].map(i => <div key={i} className="skeleton h-28 w-32 shrink-0" />)}
          </div>
          <div className="skeleton h-16 w-full" />
        </div>
      ) : plants.length === 0 && dataLoadError ? (
        /* No se pudo cargar -- distinto de "no tenes plantas todavia":
           sin esto, una falla de red al abrir la app se veia identica al
           estado de usuario nuevo. */
        <div className="flex flex-col items-center justify-center py-16 text-center mb-6">
          <div className="mb-4 text-task-harvest opacity-80"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-14 h-14" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg></div>
          <h2 className="text-xl font-bold text-ink-1 mb-2">No pudimos cargar tus datos</h2>
          <p className="text-sm text-ink-3 mb-8 max-w-[240px] leading-relaxed">
            Revisá tu conexión e intentá de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-brand-400 text-brand-on font-bold px-7 py-4 rounded-2xl shadow-glow-brand transition-all active:scale-[0.97] tap-highlight-none text-base"
          >
            Reintentar
          </button>
        </div>
      ) : plants.length === 0 ? (
        /* Sin plantas */
        <div className="flex flex-col items-center justify-center py-16 text-center mb-6">
          <div className="mb-5 float"><LogoMark size={72} /></div>
          <h2 className="text-xl font-bold text-ink-1 mb-2">{t('home.empty_title')}</h2>
          <p className="text-sm text-ink-3 mb-8 max-w-[240px] leading-relaxed">
            {t('home.empty_desc')}
          </p>
          <Link
            to="/plants/new"
            className="inline-flex items-center gap-2 bg-brand-400 text-brand-on font-bold px-7 py-4 rounded-2xl shadow-glow-brand transition-all active:scale-[0.97] tap-highlight-none text-base"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            {t('home.add_first_plant')}
          </Link>
        </div>
      ) : todayTasks.length === 0 && overdueTasks.length > 0 ? (
        /* Solo vencidas, la seccion de arriba ya las muestra — no duplicar */
        null
      ) : todayTasks.length === 0 ? (
        /* Dia libre */
        <div className="bg-app-card rounded-3xl border border-app-border p-6 flex flex-col items-center mb-5">
          <div className="mb-3">
            <ProgressRing progress={1} size={64} strokeWidth={5} color="var(--brand-400)" centerEmoji="✓" />
          </div>
          <p className="text-base font-bold text-brand-text">{t('home.free_day_title')}</p>
          <p className="text-xs text-ink-3 mt-1">{t('home.free_day_subtitle')}</p>
        </div>
      ) : allDone ? (
        /* Todo al dia */
        <div className="bg-app-card rounded-3xl border border-brand-border p-6 flex flex-col items-center mb-5">
          <div className="mb-3">
            <ProgressRing
              progress={1}
              size={72}
              strokeWidth={6}
              color="var(--brand-400)"
              label={String(done.length)}
              sublabel="listas"
            />
          </div>
          <p className="text-base font-bold text-brand-text">{t('home.all_done_title')}</p>
          <p className="text-sm text-ink-3 mt-1">
            {done.length} tarea{done.length > 1 ? 's' : ''} completada{done.length > 1 ? 's' : ''} hoy
          </p>
        </div>
      ) : (
        /* Tareas pendientes */
        <div className="mb-6">
          {/* Header con ProgressRing */}
          <div className="bg-app-card rounded-3xl border border-app-border overflow-hidden mb-2">
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Ring */}
              <div className="shrink-0">
                <ProgressRing
                  progress={todayTasks.length > 0 ? done.length / todayTasks.length : 0}
                  size={64}
                  strokeWidth={5}
                  color="var(--brand-400)"
                  label={String(pending.length)}
                  sublabel={pending.length === 1 ? 'pendiente' : 'pendientes'}
                />
              </div>
              {/* Texto + boton */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-base font-bold text-ink-1 leading-tight">{t('home.pending_title')}</p>
                  {pending.length > 1 && (
                    <button
                      onClick={() => setBulkConfirm('today')}
                      className="shrink-0 text-xs font-bold text-brand-text bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                    >
                      ✓ {t('home.complete_all')}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-ink-3">
                    {done.length > 0
                      ? `${done.length} de ${todayTasks.length} completada${done.length > 1 ? 's' : ''}`
                      : `${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''} programada${todayTasks.length > 1 ? 's' : ''}`
                    }
                  </p>
                  {pendingByPlant.length > 1 && (() => {
                    const allCollapsed = pendingByPlant.every((g) => collapsedPlants.has(g.plantId))
                    return (
                      <button
                        onClick={() => saveCollapsed(allCollapsed ? new Set() : new Set(pendingByPlant.map((g) => g.plantId)))}
                        className="shrink-0 text-[11px] font-semibold text-ink-3 hover:text-ink-1 tap-highlight-none min-h-[44px] px-1 -my-2.5 inline-flex items-center"
                      >
                        {allCollapsed ? 'Expandir todo' : 'Plegar todo'}
                      </button>
                    )
                  })()}
                </div>
                {/* Mini progress bar */}
                <div className="mt-2.5 h-1 rounded-full bg-app-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-all duration-700"
                    style={{ width: `${todayTasks.length > 0 ? (done.length / todayTasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lista de tareas */}
          <div className="bg-app-card rounded-3xl border border-app-border overflow-hidden">
            {pendingByPlant.map(({ plantId, tasks }, i) => {
              const plant = getPlant(plantId)
              const plantIsCannabis = plant ? isCannabisPlant(plant) : true
              const floraStart = plant ? getFloraStart(plant) : undefined
              const isFlora = plant ? getActiveCycle(plant, today) === 'flora' : false
              const phaseDay = plant
                ? (isFlora && floraStart
                    ? differenceInDays(today, floraStart) + 1
                    : differenceInDays(today, plant.startDate) + 1)
                : 0
              const phaseLabel = plant
                ? `${plantIsCannabis ? `${isFlora ? 'Flora' : 'Vege'} S${Math.ceil(phaseDay / 7)} · ` : ''}D${phaseDay}`
                : ''
              return (
                <div key={plantId} className={i > 0 ? 'border-t border-app-border' : ''}>
                  <PlantTaskGroup
                    plant={plant}
                    tasks={tasks}
                    phaseLabel={phaseLabel}
                    isFlora={isFlora}
                    completingIds={completingIds}
                    collapsed={collapsedPlants.has(plantId)}
                    onToggleCollapsed={() => {
                      const next = new Set(collapsedPlants)
                      if (!next.delete(plantId)) next.add(plantId)
                      saveCollapsed(next)
                    }}
                    onOpen={handleComplete}
                    onQuickComplete={(task) => handleQuickComplete([task])}
                    onCompleteAll={handleQuickComplete}
                    onOpenPlant={() => { hapticLight(); navigate(`/plants/${plantId}`) }}
                    renderIcon={(type) => <TaskIcon type={type} size="sm" />}
                    typeLabel={TYPE_LABEL}
                    typeColor={TYPE_COLOR}
                  />
                </div>
              )
            })}

            {/* Completadas del dia — expandible con undo */}
            {done.length > 0 && (
              <div className="border-t border-app-border">
                <button
                  onClick={() => setDoneExpanded(v => !v)}
                  className="w-full flex items-center gap-2.5 px-5 py-3 bg-app-elevated/50 tap-highlight-none"
                >
                  <div className="w-5 h-5 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-brand-text">✓</span>
                  </div>
                  <span className="text-xs font-semibold text-ink-3 flex-1 text-left">
                    {done.length} completada{done.length > 1 ? 's' : ''} hoy
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`w-3.5 h-3.5 text-ink-4 transition-transform ${doneExpanded ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {doneExpanded && done.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-app-border/50 bg-app-elevated/30">
                    <span className="text-sm line-through text-ink-4 flex-1 truncate capitalize">
                      {TYPE_LABEL[task.type] ?? task.type} · {getPlant(task.plantId)?.name ?? '—'}
                    </span>
                    <button
                      onClick={() => { hapticLight(); uncompleteTask(task.id); void uncompleteTaskInSupabase(task.id) }}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-ink-3 bg-app-elevated border border-app-border px-2.5 py-1 rounded-lg tap-highlight-none active:scale-90 transition-all"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3">
                        <path d="M3 10h10a5 5 0 010 10H9m-6-10l4-4-4 4 4 4"/>
                      </svg>
                      {t('tasks.undo')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROXIMA COSECHA */}
      {nearestHarvest && (
        <section className="mb-6">
          <Link
            to={`/plants/${nearestHarvest.plant.id}`}
            className="flex items-center gap-4 bg-flora-bg rounded-3xl border border-flora-border px-5 py-4 tap-highlight-none active:scale-[0.98] transition-all"
          >
            <ProgressRing
              progress={nearestHarvest.progress?.progress ?? 0}
              size={64}
              strokeWidth={5}
              color="#D9A441"
              label={String(nearestHarvest.days)}
              sublabel={nearestHarvest.days === 1 ? t('common.day_one') : t('common.day_other')}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-flora-text opacity-70 uppercase tracking-widest mb-0.5">{t('home.next_harvest')}</p>
              <p className="text-xl font-bold text-flora-text leading-tight">
                {nearestHarvest.days} {nearestHarvest.days === 1 ? t('common.day_one') : t('common.day_other')}
              </p>
              <p className="text-sm text-flora-text opacity-70 truncate mt-0.5">{nearestHarvest.plant.name}</p>
              {nearestHarvest.progress && (
                <div className="mt-2 h-1 rounded-full bg-flora-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-flora-text transition-all duration-700"
                    style={{ width: `${nearestHarvest.progress.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-flora-text opacity-60 shrink-0">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        </section>
      )}

      {/* MIS PLANTAS — strip horizontal */}
      {plants.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">{t('home.my_plants')}</h2>
            <Link to="/plants" className="text-xs font-bold text-ink-3 tap-highlight-none py-2.5 -my-2.5 px-1 -mx-1 inline-flex items-center min-h-[40px]">
              {t('home.view_all')} →
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {plants.map((plant) => {
              const plantIsCannabis = isCannabisPlant(plant)
              const floraStart = getFloraStart(plant)
              const isFlora  = getActiveCycle(plant, today) === 'flora'
              const phaseDay = isFlora && floraStart
                ? differenceInDays(today, floraStart) + 1
                : differenceInDays(today, plant.startDate) + 1
              const weekNum  = Math.ceil(phaseDay / 7)
              const planned  = isPlanned(plant, today)
              const plantPending = pending.filter((t) => t.plantId === plant.id).length
              const accent = isFlora ? 'text-flora-text' : 'text-brand-text'
              const borderColor = isFlora && plantIsCannabis ? 'border-flora-border' : 'border-app-border'
              const bgColor = isFlora && plantIsCannabis ? 'bg-flora-bg' : 'bg-app-card'

              return (
                <Link
                  key={plant.id}
                  to={`/plants/${plant.id}`}
                  className={`shrink-0 rounded-2xl border ${borderColor} ${bgColor} p-3.5 min-w-[130px] tap-highlight-none active:scale-[0.97] transition-all`}
                >
                  {/* Fase badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg mb-2.5 ${
                    isFlora && plantIsCannabis ? 'bg-flora-bg border border-flora-border' : 'bg-brand-subtle border border-brand-border'
                  }`}>
                    {planned ? (
                      <span className={`text-[10px] font-bold tracking-wider ${accent}`}>En {daysUntilSowing(plant, today)}d</span>
                    ) : (
                      <>
                        {plantIsCannabis && (
                          <span className={`text-[10px] font-bold tracking-wider ${accent}`}>{isFlora ? 'F' : 'V'}{weekNum}</span>
                        )}
                        <span className="text-[10px] text-ink-4">D{phaseDay}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-bold text-ink-1 truncate">{plant.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">{plant.genetics}</p>
                  {plantPending > 0 && (
                    <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      isFlora ? 'bg-flora-bg border-flora-border text-flora-text' : 'bg-brand-subtle border-brand-border text-brand-text'
                    }`}>
                      {plantPending} hoy
                    </div>
                  )}
                </Link>
              )
            })}

            {/* Nueva planta */}
            <Link
              to="/plants/new"
              className="shrink-0 rounded-2xl border border-dashed border-app-border p-3.5 min-w-[100px] min-h-[110px] flex flex-col items-center justify-center tap-highlight-none active:scale-[0.97] transition-all"
            >
              <span className="text-3xl font-thin text-ink-4">+</span>
              <span className="text-xs font-bold text-ink-4 mt-1">{t('home.new_plant')}</span>
            </Link>
          </div>
        </section>
      )}

    </div>

    {bulkConfirm && (
      <ConfirmDialog
        title={bulkConfirm === 'today' ? `¿Marcar las ${pending.length} tareas como hechas?` : `¿Resolver las ${overdueTasks.length} tareas vencidas?`}
        message={bulkConfirm === 'today'
          ? 'Se completan todas las pendientes de hoy, de todas tus plantas, y suman XP. Si alguna no la hiciste, tocala para cancelarla o moverla.'
          : 'Se marcan como hechas todas las vencidas. Si no las hiciste (por ejemplo, llovió), mejor tocalas de a una para cancelarlas o moverlas de día.'}
        confirmLabel="Sí, marcar todas"
        onCancel={() => setBulkConfirm(null)}
        onConfirm={() => {
          const kind = bulkConfirm
          setBulkConfirm(null)
          if (kind === 'today') { hapticSuccess(); void handleCompleteAll() } else void handleResolveAll()
        }}
      />
    )}
    <CompleteTaskSheet
      task={completingTask}
      onConfirm={async (taskId, notes) => {
        completeTask(taskId, notes)
        try {
          return await completeTaskInSupabase(taskId, notes)
        } catch (err) {
          console.error('Error sincronizando tarea completada:', err)
          showErrorToast('No se pudo sincronizar la tarea completada. Revisá tu conexión.')
          enqueueSyncAction('completeTask', { taskId, notes })
          return null
        }
      }}
      onClose={() => setCompletingTask(null)}
    />
    </>
  )
}
