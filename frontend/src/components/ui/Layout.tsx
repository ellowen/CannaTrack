import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { usePageTransition } from '@/hooks/usePageTransition'
import InstallBanner from './InstallBanner'
import { useTasks } from '@/hooks/useTasks'
import { usePlantStore } from '@/store/plantStore'
import { notifyPendingTasks } from '@/lib/notifications'
import { useUserStore } from '@/store/userStore'

export default function Layout() {
  const { animClass, locationKey } = usePageTransition()
  const navigate = useNavigate()
  const { todayTasks, overdueTasks } = useTasks()
  const pendingCount = todayTasks.filter((t) => !t.completed).length + overdueTasks.length
  const { plants } = usePlantStore()
  const { notificationsEnabled } = useUserStore()

  // Redirigir despues del onboarding (flag puesto por Onboarding.tsx)
  useEffect(() => {
    const target = localStorage.getItem('ct-redirect')
    if (target) {
      localStorage.removeItem('ct-redirect')
      navigate(target, { replace: true })
    }
  }, [])

  // Notificacion diaria al abrir la app
  useEffect(() => {
    if (!notificationsEnabled) return
    const pending = [...todayTasks.filter((t) => !t.completed), ...overdueTasks]
    if (pending.length === 0) return
    const plantNames = pending.map((t) => plants.find((p) => p.id === t.plantId)?.name ?? '-')
    notifyPendingTasks(pending.length, plantNames)
  }, [notificationsEnabled])

  return (
    <div className="min-h-screen min-h-dvh bg-app-bg flex flex-col">
      <main key={locationKey} className={clsx('flex-1 pb-24 max-w-lg mx-auto w-full', animClass)}>
        <Outlet />
      </main>

      <InstallBanner />

      <nav className="fixed bottom-0 left-0 right-0 z-20" style={{ transform: 'translateZ(0)' }}>
        <div className="max-w-lg mx-auto">
          <div className="glass-heavy">
            {/* 5 tabs: Inicio | Calendario | Plantas | Diagnose | Perfil */}
            <div className="grid grid-cols-5 safe-bottom">

              <NavLink to="/" end className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Inicio" badge={pendingCount}>
                    <svg viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={1.75} className="w-6 h-6">
                      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/calendar" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Calendario">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.75} className="w-6 h-6">
                      <rect x={3} y={4} width={18} height={18} rx={2} />
                      <line x1={16} y1={2} x2={16} y2={6} strokeLinecap="round" />
                      <line x1={8} y1={2} x2={8} y2={6} strokeLinecap="round" />
                      <line x1={3} y1={10} x2={21} y2={10} />
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/plants" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Plantas">
                    <svg viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={1.75} className="w-6 h-6">
                      <path d="M12 2c1 0 2 1 2 2v4c0 1-1 2-2 2s-2-1-2-2V4c0-1 1-2 2-2zm0 10c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/diagnose" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Diagnose">
                    <svg viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={1.75} className="w-6 h-6">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/profile" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Perfil">
                    <svg viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={1.75} className="w-6 h-6">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx={12} cy={7} r={4} />
                    </svg>
                  </NavItem>
                )}
              </NavLink>

            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}

function NavItem({ label, icon, active, badge, children }: {
  label: string
  icon?: React.ReactNode
  active: boolean
  badge?: number
  children?: React.ReactNode
}) {
  return (
    <div className={clsx(
      'flex flex-col items-center pt-2.5 pb-2 gap-1 transition-colors duration-150',
      active ? 'text-brand-400' : 'text-ink-4'
    )}>
      <div className="relative">
        {children ?? icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 leading-none">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className={clsx(
        'text-[10px] font-semibold tracking-wide',
        active ? 'text-brand-400' : 'text-ink-4'
      )}>
        {label}
      </span>
      {active && <span className="w-1 h-1 rounded-full bg-brand-400" />}
    </div>
  )
}
