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
  const { notificationsEnabled, reminderHour } = useUserStore()

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
    notifyPendingTasks(pending.length, plantNames, reminderHour)
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
            <div className="grid grid-cols-5 safe-bottom">

              <NavLink to="/" end className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Inicio" badge={pendingCount}>
                    {/* House with door */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <path d="M9 22V12h6v10"/>
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/calendar" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Calendario">
                    {/* Calendar with day dots */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                      <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/>
                      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/>
                      <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/plants" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Plantas">
                    {/* Leaf — fan shape with stem */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/diagnose" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Fotos">
                    {/* Camera */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3L14.5 4z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                  </NavItem>
                )}
              </NavLink>

              <NavLink to="/profile" className="tap-highlight-none">
                {({ isActive }) => (
                  <NavItem active={isActive} label="Perfil">
                    {/* Person */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <circle cx="12" cy="7" r="4"/>
                      <path d="M4 21v-1a8 8 0 0116 0v1"/>
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
      'flex flex-col items-center pt-1.5 pb-2 gap-0.5 transition-colors duration-150',
      active ? 'text-brand-400' : 'text-ink-4'
    )}>
      <div className={clsx(
        'relative p-1.5 rounded-2xl transition-all duration-200',
        active ? 'bg-brand-400/[0.12]' : ''
      )}>
        {children ?? icon}
        {badge != null && badge > 0 && (
          <span className="absolute top-0 right-0 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 leading-none">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className={clsx(
        'text-[10px] tracking-wide transition-all duration-150',
        active ? 'font-bold text-brand-400' : 'font-medium text-ink-4'
      )}>
        {label}
      </span>
    </div>
  )
}
