import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  supabase,
  signUp,
  signIn,
  signOut,
  onAuthStateChange,
  loadProfile,
  type SignUpData,
  type AuthCredentials,
} from '@/lib/auth'
import {
  loadPlantsFromSupabase,
  loadTasksFromSupabase,
  loadMeasurementsFromSupabase,
  loadWeekLogsFromSupabase,
} from '@/lib/sync'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { useMeasurementStore } from '@/store/measurementStore'
import { useWeekLogStore } from '@/store/weekLogStore'

export interface Profile {
  id: string
  username: string | null
  push_token: string | null
  notification_time: string
  is_pro: boolean
  /** Fin del periodo de prueba (modelo comercial). Puede faltar hasta aplicar la migracion. */
  trial_ends_at?: string
  streak_days: number
  xp: number
  theme: 'system' | 'light' | 'dark'
  notifications_enabled: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isSignedIn: boolean
  /** true si la ultima carga de datos (plantas/tareas/etc) fallo -- el
   * cache local sigue intacto, pero las pantallas que muestran "no tenes
   * datos todavia" cuando el store esta vacio deben mostrar un error en
   * vez de la copia de estado vacio si esto esta en true. */
  dataLoadError: boolean
  signUp: (data: SignUpData) => Promise<void>
  signIn: (credentials: AuthCredentials) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Detecta si un error de carga de datos es en realidad un JWT invalido o
 * vencido (token corrupto, revocado, o de una sesion vieja incompatible)
 * — a diferencia de un error transitorio de red, que no debe forzar logout.
 * Firma observada: PostgREST "PGRST301" o un AuthApiError 401/403 con
 * codigos como "bad_jwt".
 */
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; status?: number; message?: string }
  if (e.code === 'PGRST301') return true
  if (e.status === 401 || e.status === 403) return true
  if (typeof e.code === 'string' && /jwt|bad_jwt/i.test(e.code)) return true
  return false
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dataLoadError, setDataLoadError] = useState(false)

  async function loadUserData(userId: string, userEmail?: string, profile?: Profile | null) {
    const [plants, tasks, measurements, weekLogs] = await Promise.all([
      loadPlantsFromSupabase(userId),
      loadTasksFromSupabase(userId),
      loadMeasurementsFromSupabase(userId),
      loadWeekLogsFromSupabase(userId),
    ])
    // null = la carga de ese recurso fallo -- se conserva lo que ya habia
    // en el store (cache local) en vez de pisarlo con un array vacio, que
    // se veria identico a "el usuario no tiene datos todavia".
    if (plants !== null) usePlantStore.getState().setPlants(plants)
    if (tasks !== null) useTaskStore.getState().setAllTasks(tasks)
    if (measurements !== null) useMeasurementStore.getState().setLogs(measurements)
    if (weekLogs !== null) useWeekLogStore.getState().setLogs(weekLogs)
    // Solo plantas/tareas gatean el estado de error de la pantalla
    // principal (Home) -- mediciones y diario son datos secundarios con su
    // propia seccion/estado, una falla ahi no debe mostrarse como si toda
    // la carga hubiera fallado.
    setDataLoadError(plants === null || tasks === null)
    if (userEmail || profile?.username) {
      useUserStore.getState().setUser(userId, userEmail ?? '', profile?.username ?? '')
    }
    // El plan (free/trial/pro) NO se duplica en userStore -- useSubscription()
    // (via @/lib/plan resolvePlanTier) es la unica fuente, derivada en vivo
    // de AuthContext.profile. Ver auditoria: tener el plan en dos lugares
    // (Zustand + profile) permitia que quedaran desincronizados.
    //
    // XP/racha: Supabase (profiles.xp / profiles.streak_days) es la fuente
    // de verdad — se sincroniza el cache local en cada carga/refresh/login
    // para que nunca quede desalineado entre dispositivos o pestañas.
    if (profile) {
      useUserStore.getState().syncGamificationFromProfile(profile.xp, profile.streak_days)
    }
  }

  // Check auth state on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          setUser(data.session.user)
          const loadedProfile = await loadProfile(data.session.user.id)
          setProfile(loadedProfile)
          await loadUserData(data.session.user.id, data.session.user.email, loadedProfile)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        // getSession() es local y no valida el JWT contra el servidor — si
        // el token quedo invalido/vencido/revocado, la primera llamada real
        // (loadProfile) lo detecta aca. Sin esto, el usuario queda "logueado"
        // con datos locales viejos, sin aviso de que su sesion ya no es valida.
        if (isAuthError(error)) {
          setUser(null)
          setProfile(null)
          void signOut().catch(() => {})
        }
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser, event) => {
      setUser(authUser)
      if (authUser) {
        // TOKEN_REFRESHED es rutinario (~cada hora en cualquier sesion
        // activa) para el MISMO usuario -- no debe disparar loadUserData(),
        // que reemplaza por completo plants/tasks/etc en el store local.
        // Sin este corte, cualquier cambio optimista todavia no confirmado
        // en Supabase (ver usePlants.ts) podia desaparecer silenciosamente
        // en el proximo refresh de token, sin que la escritura haya
        // fallado realmente -- solo por pisar el estado local con lo que
        // ya habia en el servidor antes de que la sync terminara.
        if (event === 'TOKEN_REFRESHED') return
        try {
          const loadedProfile = await loadProfile(authUser.id)
          setProfile(loadedProfile)
          await loadUserData(authUser.id, authUser.email, loadedProfile)
        } catch (error) {
          console.error('Failed to load profile:', error)
          if (isAuthError(error)) {
            setUser(null)
            setProfile(null)
            void signOut().catch(() => {})
          }
        }
      } else {
        setProfile(null)
        usePlantStore.getState().setPlants([])
        useTaskStore.getState().setAllTasks([])
        useMeasurementStore.getState().setLogs([])
        useWeekLogStore.getState().setLogs([])
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const handleSignUp = useCallback(async (data: SignUpData) => {
    try {
      await signUp(data)
      // For email confirmation flow, user will sign in after confirming email
    } catch (error) {
      throw error
    }
  }, [])

  const handleSignIn = useCallback(async (credentials: AuthCredentials) => {
    try {
      const { user: newUser, profile: newProfile } = await signIn(credentials)
      setUser(newUser)
      setProfile(newProfile)
    } catch (error) {
      throw error
    }
  }, [])

  const handleSignInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      throw error
    }
  }, [])

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isSignedIn: !!user,
    dataLoadError,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
