import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useUserStore, type ThemePreference } from '@/store/userStore'
import { useTaskStore } from '@/store/taskStore'
import { usePlantStore } from '@/store/plantStore'
import { notifyPendingTasks } from '@/lib/notifications'
import { processSyncQueue } from '@/lib/syncQueue'
import { onOnline, onOffline, isOnline } from '@/lib/network'

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  if (preference === 'dark') {
    root.classList.add('dark')
  } else if (preference === 'light') {
    root.classList.remove('dark')
  } else {
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? root.classList.add('dark')
      : root.classList.remove('dark')
  }
}

export default function App() {
  const theme = useUserStore((s) => s.theme)
  const notificationsEnabled = useUserStore((s) => s.notificationsEnabled)
  const reminderHour = useUserStore((s) => s.reminderHour)
  const onboarded = useUserStore((s) => s.onboarded)
  const storedName = useUserStore((s) => s.name)
  const setOnboarded = useUserStore((s) => s.setOnboarded)
  const tasks = useTaskStore((s) => s.tasks)
  const plants = usePlantStore((s) => s.plants)

  // Migración síncrona: usuarios que ya tenían nombre guardado antes del campo onboarded
  if (!onboarded && storedName && storedName !== '') {
    setOnboarded(true)
  }

  // Aplicar tema
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Notificación de tareas pendientes hoy
  useEffect(() => {
    if (!notificationsEnabled) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const pending = tasks.filter(
      (t) => !t.completed && t.scheduledDate >= today && t.scheduledDate < tomorrow
    )
    if (pending.length === 0) return

    const activePlantIds = new Set(plants.filter((p) => p.status === 'active').map((p) => p.id))
    const plantNames = pending
      .filter((t) => activePlantIds.has(t.plantId))
      .map((t) => plants.find((p) => p.id === t.plantId)?.name ?? '')
      .filter(Boolean)

    notifyPendingTasks(pending.length, plantNames, reminderHour)
  }, [notificationsEnabled, tasks, plants])

  // Sincronización offline-first: procesar queue cuando vuelve conexión
  useEffect(() => {
    const cleanupOnline = onOnline(() => {
      console.log('[App] Conexión restaurada, iniciando sincronización')
      processSyncQueue().catch((err) => {
        console.error('[App] Error al sincronizar:', err)
      })
    })

    const cleanupOffline = onOffline(() => {
      console.log('[App] Conexión perdida, cambios se guardarán localmente')
    })

    // Intentar sincronizar al montar (por si estamos online y hay queue pendiente)
    if (isOnline()) {
      processSyncQueue().catch((err) => {
        console.error('[App] Error en sync inicial:', err)
      })
    }

    return () => {
      cleanupOnline()
      cleanupOffline()
    }
  }, [])

  // El onboarding se muestra dentro de ProtectedRoute (solo usuarios logueados):
  // las rutas publicas (landing, login, signup) nunca deben quedar tapadas por el wizard.
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  )
}
