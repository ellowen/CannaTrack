/**
 * Mobile Auth Module — Identical to frontend, uses same Supabase client
 */

import { supabase } from './supabase'

export interface AuthCredentials {
  email: string
  password: string
}

export interface SignUpData extends AuthCredentials {
  name: string
}

// Session timeout constants
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
let lastActivityTime = Date.now()
let inactivityCheckInterval: ReturnType<typeof setInterval> | null = null

/**
 * Log authentication event for audit trail
 * Logs timestamp, userId (if available), event type, and result
 * Never logs passwords or sensitive credentials
 */
function logAuthEvent(
  event: 'login' | 'logout' | 'signup' | 'biometric' | 'session_restore' | 'session_timeout',
  userId: string | null,
  success: boolean,
  details?: string
): void {
  const timestamp = new Date().toISOString()
  const logMessage = `[AUTH] ${timestamp} | Event: ${event} | UserId: ${userId || 'N/A'} | Success: ${success}${details ? ` | Details: ${details}` : ''}`

  if (success) {
    console.log(logMessage)
  } else {
    console.warn(logMessage)
  }
}

/**
 * Sign up a new user with email, password and name.
 * Trigger in Supabase automatically creates the profile.
 */
export async function signUp({ email, password, name }: SignUpData) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (error) throw error

    logAuthEvent('signup', data.user?.id || null, true)
    resetActivityTimer()
    return data.user
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logAuthEvent('signup', null, false, sanitizeErrorMessage(errorMessage))
    throw error
  }
}

/**
 * Sign in with email and password.
 * Returns user and profile data.
 */
export async function signIn({ email, password }: AuthCredentials) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('No user returned from sign in')

    // Load profile from profiles table
    const profile = await loadProfile(data.user.id)

    logAuthEvent('login', data.user.id, true)
    resetActivityTimer()
    startInactivityCheck()

    return { user: data.user, profile }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logAuthEvent('login', null, false, sanitizeErrorMessage(errorMessage))
    throw error
  }
}

/**
 * Load user profile from profiles table.
 */
export async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    stopInactivityCheck()
    logAuthEvent('logout', user?.id || null, true)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logAuthEvent('logout', null, false, sanitizeErrorMessage(errorMessage))
    throw error
  }
}

/**
 * Listen to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      logAuthEvent('session_restore', session?.user?.id || null, true)
      resetActivityTimer()
      startInactivityCheck()
    } else if (event === 'SIGNED_OUT') {
      logAuthEvent('session_restore', null, true)
      stopInactivityCheck()
    }
    callback(session?.user || null)
  })

  return data.subscription?.unsubscribe
}

/**
 * Get current session.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/**
 * Get current user.
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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (error) throw error
    resetActivityTimer()
    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logAuthEvent('login', userId, false, sanitizeErrorMessage(errorMessage))
    throw error
  }
}

/**
 * Sanitize error messages to prevent exposure of sensitive info
 * Removes stack traces, file paths, detailed error codes
 * Logs full error internally while returning user-friendly message
 */
function sanitizeErrorMessage(fullError: string): string {
  // Check for common patterns and return generic message
  if (fullError.includes('auth')) {
    return 'Authentication error'
  }
  if (fullError.includes('network') || fullError.includes('timeout')) {
    return 'Connection error'
  }
  if (fullError.includes('not found')) {
    return 'Resource not found'
  }
  // Default safe message
  return 'An error occurred'
}

/**
 * Reset activity timer - called on user action
 */
function resetActivityTimer(): void {
  lastActivityTime = Date.now()
}

/**
 * Start checking for inactivity timeout
 * Checks every 30 seconds if user has been inactive for 15+ minutes
 */
function startInactivityCheck(): void {
  if (inactivityCheckInterval) return

  inactivityCheckInterval = setInterval(async () => {
    const timeSinceLastActivity = Date.now() - lastActivityTime
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT_MS) {
      logAuthEvent('session_timeout', null, true, `Inactivity timeout after ${Math.floor(timeSinceLastActivity / 1000)}s`)
      stopInactivityCheck()
      try {
        await signOut()
      } catch (error) {
        console.error('[AUTH] Failed to sign out during inactivity timeout:', error)
      }
    }
  }, 30000) // Check every 30 seconds
}

/**
 * Stop checking for inactivity
 */
function stopInactivityCheck(): void {
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval)
    inactivityCheckInterval = null
  }
}

/**
 * Record user activity to prevent session timeout
 * Call this from critical user interactions (button clicks, navigation, etc)
 */
export function recordUserActivity(): void {
  resetActivityTimer()
}
