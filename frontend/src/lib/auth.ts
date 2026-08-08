import { createClient, type User } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export interface AuthCredentials {
  email: string
  password: string
}

export interface SignUpData extends AuthCredentials {
  name: string
}

/**
 * Sign up a new user with email, password and name.
 * Trigger in Supabase automatically creates the profile.
 */
export async function signUp({ email, password, name }: SignUpData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) throw error
  return data.user
}

/**
 * Sign in with email and password.
 * Returns user and profile data.
 */
export async function signIn({ email, password }: AuthCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  if (!data.user) throw new Error('No user returned from sign in')

  // Load profile from profiles table
  const profile = await loadProfile(data.user.id)

  return { user: data.user, profile }
}

/**
 * Load user profile from profiles table.
 */
export async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Listen to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // INITIAL_SESSION duplica la carga que ya hace initAuth() (getSession())
    // al montar — sin este filtro, cada carga inicial dispara loadUserData()
    // dos veces en paralelo (una desde initAuth, otra desde este listener).
    if (_event === 'INITIAL_SESSION') return
    callback(session?.user || null)
  })

  return data.subscription?.unsubscribe
}

/**
 * Get current session without awaiting.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Get current user without awaiting.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

/**
 * Update user metadata (e.g., name).
 */
export async function updateUserMetadata(updates: Record<string, any>) {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  })

  if (error) throw error
  return data.user
}

/**
 * Update user profile in profiles table.
 */
export async function updateProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Traduce errores de Supabase Auth (en ingles, a veces internos como
 * "Refresh Token Not Found") a mensajes en español que un usuario puede
 * entender y accionar. Sin esto, cualquier error se mostraba tal cual
 * vino del SDK -- confuso incluso cuando el usuario hizo todo bien
 * (ej. "Refresh Token Not Found" al intentar un login normal).
 */
export function humanizeAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const msg = raw.toLowerCase()

  if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('refresh token') || msg.includes('invalid refresh')) return 'Tu sesión expiró. Volvé a ingresar tus datos.'
  if (msg.includes('email not confirmed')) return 'Confirmá tu email antes de ingresar — revisá tu bandeja de entrada.'
  if (msg.includes('user already registered') || msg.includes('already been registered')) return 'Ya existe una cuenta con ese email. Intentá ingresar en vez de registrarte.'
  if (msg.includes('password should be at least') || msg.includes('password is too short')) return 'La contraseña es demasiado corta.'
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Demasiados intentos. Esperá un momento y volvé a intentar.'
  if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('failed to fetch')) return 'No pudimos conectar. Revisá tu conexión a internet e intentá de nuevo.'
  if (msg.includes('email address') && msg.includes('invalid')) return 'Ese email no parece válido.'

  return 'No pudimos completar la acción. Intentá de nuevo en un momento.'
}
