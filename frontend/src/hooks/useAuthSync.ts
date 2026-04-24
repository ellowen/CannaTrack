import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserStore } from '@/store/userStore'

/**
 * Sync auth state from AuthContext to Zustand userStore.
 * Call this once in a high-level component to keep user data in sync.
 */
export function useAuthSync() {
  const { user, profile } = useAuth()
  const { setUser } = useUserStore()

  useEffect(() => {
    if (user && profile) {
      setUser(user.id, user.email || '', profile.username || 'Cultivador')
    }
  }, [user, profile, setUser])
}
