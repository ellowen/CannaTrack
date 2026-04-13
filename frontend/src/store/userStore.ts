import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccessTier } from '@/types/plant'

interface UserStore {
  name: string
  plan: AccessTier
  potVolumeLiters: number
  setName: (name: string) => void
  setPlan: (plan: AccessTier) => void
  setPotVolume: (liters: number) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      name: 'Cultivador',
      plan: 'free' as AccessTier,
      potVolumeLiters: 11,
      setName: (name) => set({ name }),
      setPlan: (plan) => set({ plan }),
      setPotVolume: (potVolumeLiters) => set({ potVolumeLiters }),
    }),
    { name: 'cannatrack-user' }
  )
)
