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

export interface Profile {
  id: string
  username: string | null
  push_token: string | null
  notification_time: string
  is_pro: boolean
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
  signUp: (data: SignUpData) => Promise<void>
  signIn: (credentials: AuthCredentials) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check auth state on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          setUser(data.session.user)
          const loadedProfile = await loadProfile(data.session.user.id)
          setProfile(loadedProfile)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser) => {
      setUser(authUser)
      if (authUser) {
        try {
          const loadedProfile = await loadProfile(authUser.id)
          setProfile(loadedProfile)
        } catch (error) {
          console.error('Failed to load profile:', error)
        }
      } else {
        setProfile(null)
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
    signUp: handleSignUp,
    signIn: handleSignIn,
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
