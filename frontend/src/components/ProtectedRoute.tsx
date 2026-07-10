import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStore } from '@/store/userStore'
import Onboarding from '@/pages/Onboarding'
import Landing from '@/pages/Landing'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const onboarded = useUserStore((s) => s.onboarded)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌿</div>
          <p className="text-green-100">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Raiz -> landing renderizada en / (sin cambiar la URL).
    // Links profundos -> login (usuario que ya tiene cuenta).
    if (location.pathname === '/') return <Landing />
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Usuario logueado que todavia no paso por el wizard de bienvenida
  if (!onboarded) return <Onboarding />

  return <>{children}</>
}
