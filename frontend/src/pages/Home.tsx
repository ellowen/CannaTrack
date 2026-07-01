import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useInitSync } from '@/hooks/useInitSync'
import { useUserStore } from '@/store/userStore'
import { ProgressRing } from '@/components/plant'
import { CompleteTaskSheet } from '@/components/tasks'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { getLevelInfo } from '@/lib/gamification'
import { getEstimatedHarvestDate, getCycleProgress } from '@/lib/nutrition-utils'
import { useAuth } from '@/contexts/AuthContext'
import { completeTaskInSupabase } from '@/lib/sync'
import type { ScheduledTask } from '@/types/plant'

const TYPE_LABEL: Record<string, string> = {
  nutrition:   'Nutricion',
  irrigation:  'Riego',
  observation: 'Observacion',
  foliar:      'Foliar',
  harvest:     'Cosecha',
}
const TYPE_COLOR: Record<string, string> = {
  nutrition:   '#22C55E',
  irrigation:  '#3B82F6',
  observation: '#F59E0B',
  foliar:      '#A855F7',
  harvest:     '#EF4444',
}
const TYPE_BG: Record<string, string> = {
  nutrition:   'linear-gradient(135deg,#22C55E,#15803D)',
  irrigation:  'linear-gradient(135deg,#60A5FA,#1D4ED8)',
  observation: 'linear-gradient(135deg,#FCD34D,#B45309)',
  foliar:      'linear-gradient(135deg,#C084FC,#7E22CE)',
  harvest:     'linear-gradient(135deg,#F87171,#B91C1C)',
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

  const navigate  = useNavigate()
  const { name, streak, totalXP, addXP } = useUserStore()
  const levelInfo = getLevelInfo(totalXP)
  const { isLoading } = useAuth()
  const { plants, allPlants } = usePlants()
  const [historialOpen, setHistorialOpen]     = useState(false)
  const [overdueExpanded, setOverdueExpanded] = useState(false)
  const [doneExpanded, setDoneExpanded]       = useState(false)
  const [refreshKey, setRefreshKey]           = useState(0)
  const [completingTask, setCompletingTask]   = useState<ScheduledTask | null>(null)
  const [resolvedAll, setResolvedAll]         = useState(false)
  const [completingIds, setCompletingIds]     = useState<Set<string>>(new Set())

  const { tasks: allActiveTasks, todayTasks, overdueTasks, completeTask, uncompleteTask } = useTasks()

  function handleComplete(task: ScheduledTask) {
    hapticLight()
    setCompletingIds(prev => new Set(prev).add(task.id))
    setTimeout(() => {
      setCompletingTask(task)
      setCompletingIds(prev => { const s = new Set(prev); s.delete(task.id); return s })
    }, 240)
  }

  function handleResolveAll() {
    hapticSuccess()
    overdueTasks.forEach((t) => {
      completeTask(t.id)
      void completeTaskInSupabase(t.id)
    })
    addXP(15 * overdueTasks.length)
    setResolvedAll(true)
    setTimeout(() => setResolvedAll(false), 2500)
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

  // Proxima semana — contar tareas por dia
  const upcomingDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i + 1)
      d.setHours(0, 0, 0, 0)
      const count = allActiveTasks.filter((t) => {
        if (t.completed) return false
        const td = new Date(t.scheduledDate)
        td.setHours(0, 0, 0, 0)
        return td.getTime() === d.getTime()
      }).length
      return { date: d, count }
    })
  }, [allActiveTasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const archivedPlants  = allPlants.filter((p) => p.status === 'harvested' || p.status === 'discarded')

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

  function handleCompleteAll() {
    hapticSuccess()
    pending.forEach((t) => {
      completeTask(t.id)
      void completeTaskInSupabase(t.id)
    })
    addXP(10 * pending.length)
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-brand-400">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] text-ink-4 uppercase tracking-widest mb-1 first-letter:capitalize">{dateLabel}</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-ink-1 leading-tight">
            {greeting}{name ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          <div className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 shrink-0 ${
            streak >= 7 ? 'bg-amber-500/15 border border-amber-500/30'
                        : 'bg-app-card border border-app-border'
          }`}>
            <span className={`text-base ${streak >= 7 ? 'streak-fire' : ''}`}>🔥</span>
            <div className="text-right">
              <p className={`text-sm font-black tabular leading-none ${streak >= 7 ? 'text-amber-500' : 'text-ink-1'}`}>{streak}</p>
              <p className="text-[8px] font-bold text-ink-4 leading-none mt-0.5">{streak === 1 ? 'DIA' : 'DIAS'}</p>
            </div>
          </div>
        </div>
        {/* Nivel */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm">{levelInfo.current.emoji}</span>
          <span className="text-xs font-semibold text-ink-3">{levelInfo.current.name}</span>
          {levelInfo.next && (
            <>
              <div className="flex-1 h-1.5 rounded-full bg-app-border overflow-hidden max-w-[120px]">
                <div className="h-full rounded-full bg-brand-400 transition-all duration-700" style={{ width: `${levelInfo.progressToNext * 100}%` }} />
              </div>
              <span className="text-[10px] text-ink-4">{levelInfo.next.name}</span>
            </>
          )}
        </div>
      </div>

      {/* VENCIDAS */}
      {plants.length > 0 && overdueTasks.length > 0 && (
        <section className="mb-5">
          <div className="glass-card glass-red rounded-2xl overflow-hidden">
            {/* Primera tarea — CTA principal */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-red-400">
                  {overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''} vencida{overdueTasks.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-900 mt-0.5 truncate">
                  {overdueTasks.map((t) => getPlant(t.plantId)?.name).filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {overdueTasks.length > 1 && (
                  <button
                    onClick={handleResolveAll}
                    className="text-xs font-black text-red-300 border border-red-700/60 px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
                  >
                    {resolvedAll ? '✓ Listo' : 'Todas'}
                  </button>
                )}
                <button
                  onClick={() => { hapticLight(); setCompletingTask(overdueTasks[0]) }}
                  className="text-xs font-black text-white bg-red-600 px-4 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-red-900/30 bg-black/20 tap-highlight-none"
                >
                  <TaskIcon type={task.type} size="sm" />
                  <span className="text-sm text-red-300/80 flex-1 text-left font-medium truncate">
                    {TYPE_LABEL[task.type]} — {p?.name ?? '—'}
                  </span>
                  <span className="text-xs text-red-500/60 shrink-0">Marcar hecho</span>
                </button>
              )
            })}
            {overdueTasks.length > 4 && (
              <button
                onClick={() => setOverdueExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-red-900/30 bg-black/10 tap-highlight-none"
              >
                <span className="text-xs font-bold text-red-500/70">
                  {overdueExpanded ? 'Ver menos' : `Ver ${overdueTasks.length - 4} mas`}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  className={`w-3 h-3 text-red-500/70 transition-transform ${overdueExpanded ? 'rotate-180' : ''}`}>
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
      ) : plants.length === 0 ? (
        /* Sin plantas */
        <div className="flex flex-col items-center justify-center py-16 text-center mb-6">
          <div className="text-7xl mb-4 select-none float">🌱</div>
          <h2 className="text-xl font-black text-ink-1 mb-2">Tu grow empieza aca</h2>
          <p className="text-sm text-ink-3 mb-8 max-w-[240px] leading-relaxed">
            Registra tu primera planta en 30 segundos y generamos el calendario automaticamente
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
      ) : todayTasks.length === 0 && overdueTasks.length > 0 ? (
        /* Solo vencidas, la seccion de arriba ya las muestra — no duplicar */
        null
      ) : todayTasks.length === 0 ? (
        /* Dia libre */
        <div className="bg-app-card rounded-3xl border border-app-border p-6 flex flex-col items-center mb-5">
          <div className="mb-3">
            <ProgressRing progress={1} size={64} strokeWidth={5} color="var(--brand-400)" centerEmoji="🌿" />
          </div>
          <p className="text-base font-black text-brand-400">Dia libre!</p>
          <p className="text-xs text-ink-3 mt-1">Sin tareas programadas hoy</p>
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
          <p className="text-base font-black text-brand-400">Todo al dia!</p>
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
                  <p className="text-base font-black text-ink-1 leading-tight">Para hacer hoy</p>
                  {pending.length > 1 && (
                    <button
                      onClick={() => { hapticSuccess(); void handleCompleteAll() }}
                      className="shrink-0 text-xs font-black text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                    >
                      ✓ Todo
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-3">
                  {done.length > 0
                    ? `${done.length} de ${todayTasks.length} completada${done.length > 1 ? 's' : ''}`
                    : `${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''} programada${todayTasks.length > 1 ? 's' : ''}`
                  }
                </p>
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
            {pending.map((task, i) => {
              const plant     = getPlant(task.plantId)
              const isFlora   = !!plant?.floraStartDate
              const phaseDay  = plant
                ? (isFlora && plant.floraStartDate
                    ? differenceInDays(today, plant.floraStartDate) + 1
                    : differenceInDays(today, plant.startDate) + 1)
                : 0
              const weekNum   = Math.ceil(phaseDay / 7)
              const typeColor = TYPE_COLOR[task.type] ?? '#52CC64'
              const phaseColor = isFlora ? '#F59E0B' : '#52CC64'

              return (
                <div key={task.id} className={`${i > 0 ? 'border-t border-app-border' : ''}${completingIds.has(task.id) ? ' task-completing' : ''}`}>
                  <div className="flex">
                    {/* Left accent — fase */}
                    <div className="w-1 shrink-0 rounded-l-none" style={{ backgroundColor: phaseColor, opacity: 0.8 }} />

                    <div className="flex-1 px-4 py-3 min-w-0">
                      {/* Planta — prominente */}
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <button
                          onClick={() => { hapticLight(); navigate(`/plants/${task.plantId}`) }}
                          className="flex-1 text-left tap-highlight-none min-w-0"
                        >
                          <p className="text-base font-black text-ink-1 leading-tight truncate">
                            {plant?.name ?? '—'}
                          </p>
                        </button>
                        <button
                          onClick={() => handleComplete(task)}
                          className="shrink-0 text-sm font-black text-brand-400 bg-brand-subtle border border-brand-border px-4 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
                        >
                          ✓ Hecho
                        </button>
                      </div>

                      {/* Tipo + fase */}
                      <div className="flex items-center gap-2 mb-2">
                        <TaskIcon type={task.type} size="sm" />
                        <span className="text-sm font-bold" style={{ color: typeColor }}>{TYPE_LABEL[task.type]}</span>
                        <span className="w-1 h-1 rounded-full bg-ink-4 shrink-0" />
                        <span className="text-xs text-ink-3">
                          {isFlora ? 'Flora' : 'Vege'} S{weekNum} · D{phaseDay}
                        </span>
                      </div>

                      {/* EC / pH chips */}
                      {(task.ecMin != null || task.phMin != null) && (
                        <div className="flex gap-2 mb-2">
                          {task.ecMin != null && (
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-brand-subtle border border-brand-border text-brand-400">
                              EC {task.ecMin}{task.ecMax && task.ecMax !== task.ecMin ? `-${task.ecMax}` : ''}
                            </span>
                          )}
                          {task.phMin != null && (
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              pH {task.phMin}{task.phMax && task.phMax !== task.phMin ? `-${task.phMax}` : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Productos */}
                      {task.products && task.products.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {task.products.slice(0, 3).map((prod, pi) => (
                            <span key={pi} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-app-elevated border border-app-border text-ink-3">
                              {prod.name}{prod.minDose != null ? ` ${prod.minDose}${prod.maxDose && prod.maxDose !== prod.minDose ? `-${prod.maxDose}` : ''}${prod.unit ?? 'ml'}/L` : ''}
                            </span>
                          ))}
                          {task.products.length > 3 && (
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-app-elevated border border-app-border text-ink-4">
                              +{task.products.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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
                    <span className="text-[10px] font-black text-brand-400">✓</span>
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
                      onClick={() => { hapticLight(); uncompleteTask(task.id) }}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-ink-3 bg-app-elevated border border-app-border px-2.5 py-1 rounded-lg tap-highlight-none active:scale-90 transition-all"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3">
                        <path d="M3 10h10a5 5 0 010 10H9m-6-10l4-4-4 4 4 4"/>
                      </svg>
                      Deshacer
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
            className="flex items-center gap-4 bg-gradient-to-r from-amber-950/50 to-orange-950/30 rounded-3xl border border-amber-700/30 px-5 py-4 tap-highlight-none active:scale-[0.98] transition-all"
          >
            <ProgressRing
              progress={nearestHarvest.progress?.progress ?? 0}
              size={64}
              strokeWidth={5}
              color="#F59E0B"
              label={String(nearestHarvest.days)}
              sublabel={nearestHarvest.days === 1 ? 'dia' : 'dias'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Proxima cosecha</p>
              <p className="text-xl font-black text-amber-300 leading-tight">
                {nearestHarvest.days} {nearestHarvest.days === 1 ? 'dia' : 'dias'}
              </p>
              <p className="text-sm text-amber-500/70 truncate mt-0.5">{nearestHarvest.plant.name}</p>
              {nearestHarvest.progress && (
                <div className="mt-2 h-1 rounded-full bg-amber-900/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700"
                    style={{ width: `${nearestHarvest.progress.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-700 shrink-0">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        </section>
      )}

      {/* MIS PLANTAS — strip horizontal */}
      {plants.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest">Mis plantas</h2>
            <Link to="/plants" className="text-xs font-bold text-ink-3 tap-highlight-none">
              Ver todas →
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {plants.map((plant) => {
              const isFlora  = !!plant.floraStartDate
              const phaseDay = isFlora && plant.floraStartDate
                ? differenceInDays(today, plant.floraStartDate) + 1
                : differenceInDays(today, plant.startDate) + 1
              const weekNum  = Math.ceil(phaseDay / 7)
              const plantPending = pending.filter((t) => t.plantId === plant.id).length
              const accent = isFlora ? 'text-amber-500' : 'text-brand-400'
              const borderColor = isFlora ? 'border-amber-500/20' : 'border-app-border'
              const bgColor = isFlora ? 'bg-amber-500/5' : 'bg-app-card'

              return (
                <Link
                  key={plant.id}
                  to={`/plants/${plant.id}`}
                  className={`shrink-0 rounded-2xl border ${borderColor} ${bgColor} p-3.5 min-w-[130px] tap-highlight-none active:scale-[0.97] transition-all`}
                >
                  {/* Fase badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg mb-2.5 ${
                    isFlora ? 'bg-amber-500/15 border border-amber-500/25' : 'bg-brand-subtle border border-brand-border'
                  }`}>
                    <span className={`text-[10px] font-black tracking-wider ${accent}`}>{isFlora ? 'F' : 'V'}{weekNum}</span>
                    <span className="text-[10px] text-ink-4">D{phaseDay}</span>
                  </div>
                  <p className="text-sm font-black text-ink-1 truncate">{plant.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">{plant.genetics}</p>
                  {plantPending > 0 && (
                    <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${
                      isFlora ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-brand-subtle border-brand-border text-brand-400'
                    }`}>
                      ⚡ {plantPending} hoy
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
              <span className="text-xs font-bold text-ink-4 mt-1">Nueva</span>
            </Link>
          </div>
        </section>
      )}

      {/* PROXIMA SEMANA */}
      {plants.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Proxima semana</h2>
          <div className="flex gap-1.5">
            {upcomingDays.map((day, i) => {
              const hasTask   = day.count > 0
              const dayAbbr   = format(day.date, 'EEE', { locale: es }).slice(0, 2)
              const dayNum    = format(day.date, 'd')

              return (
                <Link
                  key={i}
                  to="/calendar"
                  className="flex-1 tap-highlight-none active:scale-[0.97] transition-all"
                >
                  <div className={`rounded-2xl py-2.5 flex flex-col items-center ${
                    hasTask
                      ? 'bg-app-card border border-app-border'
                      : 'bg-app-elevated border border-app-border/50'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase ${hasTask ? 'text-ink-3' : 'text-ink-4'}`}>
                      {dayAbbr}
                    </span>
                    <span className={`text-base font-black mt-0.5 ${hasTask ? 'text-ink-1' : 'text-ink-4'}`}>
                      {dayNum}
                    </span>
                    {hasTask ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1" />
                        <span className="text-[10px] font-black text-brand-400 mt-0.5">{day.count}</span>
                      </>
                    ) : (
                      <div className="h-6 mt-1" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* HISTORIAL */}
      {archivedPlants.length > 0 && (
        <section className="mt-2">
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
                const growDays    = differenceInDays(new Date(), plant.startDate)
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

    <CompleteTaskSheet
      task={completingTask}
      onConfirm={(taskId, notes) => {
        completeTask(taskId, notes)
        void completeTaskInSupabase(taskId, notes)
      }}
      onClose={() => setCompletingTask(null)}
    />
    </>
  )
}
