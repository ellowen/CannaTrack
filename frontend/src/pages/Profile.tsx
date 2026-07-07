import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUserStore, type ThemePreference } from '@/store/userStore'
import { useTaskStore } from '@/store/taskStore'
import { usePlantStore } from '@/store/plantStore'
import { useWeekLogStore } from '@/store/weekLogStore'
import { getLevelInfo, getAchievements, LEVELS, type AchievementData } from '@/lib/gamification'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush, updateReminderHour } from '@/lib/notifications'
import { Toggle } from '@/components/ui'
import { supabase } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { clsx } from 'clsx'

const REMINDER_HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]
function fmtHour(h: number) {
  const suffix = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${suffix}`
}

type Tab = 'stats' | 'logros' | 'cuenta'

export default function Profile() {
  const { name, streak, bestStreak, totalXP, theme, setTheme, notificationsEnabled, reminderHour, setNotificationsEnabled, setReminderHour } = useUserStore()
  const { tasks } = useTaskStore()
  const { plants } = usePlantStore()
  const logs = useWeekLogStore((s) => s.logs)

  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('stats')
  const [dbProfile, setDbProfile] = useState<{
    xp: number
    streak: number
    bestStreak: number
    username: string
  } | null>(null)
  const [dbStats, setDbStats] = useState<{
    totalTasksCompleted: number
    measurements: number
    photos: number
    activePlants: number
    harvestedPlants: number
    completedToday: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const notifBlocked = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied'

  async function handleNotifToggle() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      if (user) void unsubscribeFromPush(user.id)
      return
    }
    const perm = await requestNotificationPermission()
    if (perm === 'granted') {
      setNotificationsEnabled(true)
      if (user) void subscribeToPush(user.id, reminderHour)
    }
  }

  function handleReminderHourChange(h: number) {
    setReminderHour(h)
    if (user) void updateReminderHour(user.id, h)
  }

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const today0 = new Date()
      today0.setHours(0, 0, 0, 0)
      const [
        { data: p },
        { data: activePlantRows },
        { data: harvestedPlantRows },
        { data: tasksToday },
        { count: totalTasks },
        { count: measurementsCount },
        { count: photosCount },
      ] = await Promise.all([
        supabase.from('profiles').select('xp, streak_days, username').eq('id', user!.id).maybeSingle(),
        supabase.from('plants').select('id').eq('user_id', user!.id).eq('status', 'active'),
        supabase.from('plants').select('id').eq('user_id', user!.id).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('id').eq('user_id', user!.id).eq('completed', true)
          .gte('completed_at', today0.toISOString()),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).not('photo_url', 'is', null),
      ])
      if (p) {
        setDbProfile({
          xp: p.xp ?? 0,
          streak: p.streak_days ?? 0,
          bestStreak: 0,
          username: p.username ?? user!.email?.split('@')[0] ?? 'Cultivador',
        })
      }
      setDbStats({
        totalTasksCompleted: totalTasks ?? 0,
        measurements: measurementsCount ?? 0,
        photos: photosCount ?? 0,
        activePlants: activePlantRows?.length ?? 0,
        harvestedPlants: harvestedPlantRows?.length ?? 0,
        completedToday: tasksToday?.length ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [user?.id])

  const displayXP          = dbProfile?.xp ?? totalXP
  const displayStreak      = dbProfile?.streak ?? streak
  const displayBestStreak  = dbProfile?.bestStreak ?? bestStreak
  const displayName        = dbProfile?.username ?? name ?? 'Cultivador'
  const levelInfo          = getLevelInfo(displayXP)

  const totalTasksCompleted  = dbStats?.totalTasksCompleted ?? tasks.filter((t) => t.completed).length
  const measurementsCount    = dbStats?.measurements ?? 0
  const totalPhotos          = dbStats?.photos ?? logs.filter((l) => l.photoDataUrl || l.photoUrl).length
  const activePlantsCount    = dbStats?.activePlants ?? plants.filter((p) => p.status === 'active').length
  const harvestedPlantsCount = dbStats?.harvestedPlants ?? plants.filter((p) => p.status === 'harvested').length
  const completedToday       = dbStats?.completedToday ?? 0

  const harvestedPlants = plants.filter((p) => p.status === 'harvested')

  const achievementData: AchievementData = {
    streak: displayStreak,
    bestStreak: displayBestStreak,
    totalXP: displayXP,
    totalTasksCompleted,
    tasksWithMeasurement: measurementsCount,
    harvestedPlants: harvestedPlantsCount,
    activePlants: activePlantsCount,
    totalPhotos,
  }
  const { unlocked, locked } = getAchievements(achievementData)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats',  label: 'Estadisticas' },
    { id: 'logros', label: 'Logros' },
    { id: 'cuenta', label: 'Cuenta' },
  ]

  return (
    <div className="pb-8">

      {/* ─── HEADER ─── */}
      <div
        className="px-4 pt-10 pb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A0A2E 0%, #0A1A0A 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, #8B5CF6 0%, transparent 70%)' }}
        />

        {/* Avatar + nombre + settings */}
        <div className="relative flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
          >
            {levelInfo.current.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight truncate">{displayName}</h1>
            <p className="text-xs font-semibold text-violet-300 mt-0.5">
              Nivel {levelInfo.current.level} — {levelInfo.current.name}
            </p>
          </div>
          <Link
            to="/settings"
            className="shrink-0 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-white/60">
              <circle cx={12} cy={12} r={3} />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {/* Barra XP */}
        <div className="relative mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] font-bold text-white/60">{displayXP} XP</span>
            {levelInfo.next && (
              <span className="text-[11px] text-white/40">{levelInfo.next.xpRequired} XP</span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${levelInfo.progressToNext * 100}%`, background: 'linear-gradient(90deg,#8B5CF6,#A78BFA)' }}
            />
          </div>
          {levelInfo.next && (
            <p className="text-[10px] text-white/35 mt-1">
              {levelInfo.next.xpRequired - displayXP} XP para {levelInfo.next.name}
            </p>
          )}
        </div>

        {/* Quick stats */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { value: displayStreak,     label: displayStreak === 1 ? 'Dia racha' : 'Dias racha', icon: '🔥', hi: displayStreak >= 7 },
            { value: displayBestStreak, label: 'Mejor racha',                                    icon: '⚡', hi: false },
            { value: completedToday,    label: 'Hoy',                                             icon: '✅', hi: false },
          ].map(({ value, label, icon, hi }) => (
            <div
              key={label}
              className={clsx(
                'rounded-xl p-2.5 text-center border',
                hi ? 'bg-amber-500/20 border-amber-500/30' : 'bg-white/8 border-white/10'
              )}
            >
              <p className="text-sm mb-0.5">{icon}</p>
              <p className={clsx('text-lg font-black tabular leading-none', hi ? 'text-amber-400' : 'text-white')}>{value}</p>
              <p className="text-[9px] text-white/40 font-semibold mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="relative flex border-b border-app-border bg-app-bg">
        <div
          className="absolute bottom-0 h-0.5 bg-brand-400 transition-transform duration-200 ease-out"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)`,
          }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 py-3 text-xs font-bold tracking-wide transition-colors tap-highlight-none',
              activeTab === tab.id ? 'text-brand-400' : 'text-ink-4'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: STATS ─── */}
      {activeTab === 'stats' && (
        <div className="px-4 space-y-4 mt-4 pb-4">

          {/* Camino del cultivador */}
          <section>
            <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Camino del cultivador</h2>
            <div className="bg-app-card rounded-2xl border border-app-border p-3.5">
              <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
                {LEVELS.map((lvl, i) => {
                  const isCurrentLevel = lvl.level === levelInfo.current.level
                  const isPassed       = displayXP >= lvl.xpRequired
                  const isNext         = levelInfo.next?.level === lvl.level
                  return (
                    <div key={lvl.level} className="flex items-center shrink-0">
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-xl flex items-center justify-center text-base relative',
                          isCurrentLevel ? 'bg-violet-500/20 ring-2 ring-violet-500'
                            : isPassed    ? 'bg-app-elevated'
                            : 'bg-app-elevated opacity-35'
                        )}
                        title={lvl.name}
                      >
                        {lvl.emoji}
                        {isCurrentLevel && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-500 border-2 border-app-card" />
                        )}
                      </div>
                      {i < LEVELS.length - 1 && (
                        <div className={clsx('w-2.5 h-0.5 mx-0.5', isPassed && !isNext ? 'bg-violet-500' : 'bg-app-border')} />
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-ink-4 mt-2.5">
                {levelInfo.next
                  ? `${levelInfo.next.xpRequired - displayXP} XP para ${levelInfo.next.name} ${levelInfo.next.emoji}`
                  : 'Nivel maximo alcanzado ⚡'}
              </p>
            </div>
          </section>

          {/* Estadisticas */}
          <section>
            <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Estadisticas</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-app-card rounded-2xl border border-app-border h-16 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: '✅', value: totalTasksCompleted,  label: 'Tareas completadas' },
                  { icon: '🧪', value: measurementsCount,    label: 'Mediciones EC/pH' },
                  { icon: '📸', value: totalPhotos,          label: 'Fotos en el diario' },
                  { icon: '🌿', value: activePlantsCount,    label: 'Plantas activas' },
                  { icon: '✂️', value: harvestedPlantsCount, label: 'Cosechas' },
                  { icon: '💎', value: displayXP,            label: 'XP total' },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="bg-app-card rounded-2xl border border-app-border p-3.5 flex items-center gap-3">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-ink-1 tabular leading-none">{value}</p>
                      <p className="text-[10px] text-ink-3 font-medium mt-0.5 leading-tight">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Wall of fame */}
          {harvestedPlants.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Wall of fame</h2>
              <div className="space-y-2.5">
                {harvestedPlants.map((plant) => {
                  const photoLog = logs
                    .filter((l) => l.plantId === plant.id && (l.photoDataUrl || l.photoUrl))
                    .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())[0]
                  const photo = photoLog?.photoDataUrl ?? photoLog?.photoUrl
                  const plantTasks = tasks.filter((t) => t.plantId === plant.id)
                  const done = plantTasks.filter((t) => t.completed).length
                  const rate = plantTasks.length > 0 ? Math.round((done / plantTasks.length) * 100) : 0
                  return (
                    <Link
                      key={plant.id}
                      to={`/plants/${plant.id}`}
                      className="flex items-center gap-3 bg-app-card rounded-2xl border border-app-border p-3.5 tap-highlight-none active:scale-[0.987] transition-all overflow-hidden relative"
                    >
                      {photo && (
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{ backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                      )}
                      <div className="relative shrink-0 w-10 h-10 rounded-xl bg-app-elevated flex items-center justify-center text-xl">✂️</div>
                      <div className="relative flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink-1 truncate">{plant.name}</p>
                        <p className="text-xs text-ink-3 truncate">{plant.genetics}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-green-500">{rate}% cumplimiento</span>
                          <span className="text-[10px] text-ink-4">· {format(new Date(plant.startDate), "d MMM yyyy", { locale: es })}</span>
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="relative w-4 h-4 text-ink-4 shrink-0">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

        </div>
      )}

      {/* ─── TAB: LOGROS ─── */}
      {activeTab === 'logros' && (
        <div className="px-4 space-y-4 mt-4 pb-4">

          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest">Desbloqueados</h2>
              <span className="text-xs font-bold text-violet-500">{unlocked.length}/{unlocked.length + locked.length}</span>
            </div>
            {unlocked.length === 0 ? (
              <div className="bg-app-card rounded-2xl border border-app-border p-6 text-center">
                <p className="text-3xl mb-2">🔒</p>
                <p className="text-sm text-ink-3">Completa tu primera tarea para desbloquear logros</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {unlocked.map((a) => (
                  <div
                    key={a.id}
                    className="bg-app-card rounded-2xl border border-violet-500/20 p-3 flex items-center gap-3"
                    style={{ boxShadow: '0 0 12px rgba(139,92,246,0.08)' }}
                  >
                    <span className="text-2xl shrink-0">{a.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink-1 leading-tight">{a.name}</p>
                      <p className="text-[10px] text-ink-4 mt-0.5 leading-tight">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {locked.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Por desbloquear</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {locked.map((a) => (
                  <div
                    key={a.id}
                    className="bg-app-card rounded-2xl border border-app-border p-3 flex items-center gap-3 opacity-40"
                  >
                    <span className="text-2xl shrink-0 grayscale">{a.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink-1 leading-tight">{a.name}</p>
                      <p className="text-[10px] text-ink-4 mt-0.5 leading-tight">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* ─── TAB: CUENTA ─── */}
      {activeTab === 'cuenta' && (
        <div className="px-4 space-y-4 mt-4 pb-4">

          {/* Recordatorio */}
          <section>
            <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Recordatorio</h2>
            <div className="glass-card rounded-2xl p-4 space-y-4">
              {/* Toggle */}
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors',
                  notificationsEnabled ? 'bg-brand-subtle' : 'bg-app-elevated'
                )}>
                  🔔
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-1">Recordatorio diario</p>
                  <p className="text-xs text-ink-3 mt-0.5 leading-snug">
                    {notifBlocked
                      ? 'Bloqueado — habilitalo en Ajustes del sistema'
                      : notificationsEnabled
                      ? `Aviso a las ${fmtHour(reminderHour)} cuando abris la app`
                      : 'Recibis un aviso si tenes tareas pendientes'}
                  </p>
                </div>
                <Toggle
                  enabled={notificationsEnabled}
                  onChange={handleNotifToggle}
                  disabled={notifBlocked}
                />
              </div>

              {/* Selector de hora — visible solo cuando esta activado */}
              {notificationsEnabled && !notifBlocked && (
                <div className="border-t border-app-border pt-4">
                  <p className="text-xs font-bold text-ink-3 mb-3">Hora del aviso</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                    {REMINDER_HOURS.map((h) => (
                      <button
                        key={h}
                        onClick={() => handleReminderHourChange(h)}
                        className={clsx(
                          'shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all tap-highlight-none active:scale-90',
                          reminderHour === h
                            ? 'bg-brand-400 text-white shadow-glow-brand'
                            : 'bg-app-elevated border border-app-border text-ink-3'
                        )}
                      >
                        {fmtHour(h)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-ink-4 mt-2.5 leading-relaxed">
                    El aviso se muestra cuando abris la app cerca de esa hora y tenes tareas pendientes.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Apariencia</h2>
            <div className="bg-app-card rounded-2xl border border-app-border p-1 flex gap-1">
              {([
                { value: 'light',  label: 'Claro',   icon: '☀️' },
                { value: 'system', label: 'Sistema',  icon: '⚙️' },
                { value: 'dark',   label: 'Oscuro',   icon: '🌙' },
              ] as { value: ThemePreference; label: string; icon: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all tap-highlight-none',
                    theme === opt.value
                      ? 'bg-brand-400/15 text-brand-400 border border-brand-400/30'
                      : 'text-ink-3 hover:text-ink-1'
                  )}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-2.5">Mi cuenta</h2>
            <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden divide-y divide-app-border">
              <div className="px-4 py-3.5">
                <p className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-1">Correo</p>
                <p className="text-sm text-ink-2 font-medium">{user?.email ?? '—'}</p>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-ink-4 uppercase tracking-widest mb-1">Plan</p>
                  <p className="text-sm font-bold text-ink-1">Free</p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-brand-subtle border border-brand-border text-brand-400">
                  GRATIS
                </span>
              </div>
              <Link
                to="/settings"
                className="flex items-center justify-between px-4 py-3.5 tap-highlight-none active:bg-app-elevated transition-colors"
              >
                <p className="text-sm font-semibold text-ink-2">Ajustes y configuracion</p>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ink-4">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </section>

        </div>
      )}

    </div>
  )
}
