import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledTask } from '@/types/plant'
import { dateReviver } from '@/lib/storage'

interface TaskStore {
  tasks: ScheduledTask[]
  setTasks: (plantId: string, tasks: ScheduledTask[]) => void
  completeTask: (id: string, notes?: string) => void
  resetTasksForPlant: (plantId: string) => void
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      setTasks: (plantId, newTasks) =>
        set((s) => ({
          tasks: [
            ...s.tasks.filter((t) => t.plantId !== plantId),
            ...newTasks,
          ],
        })),
      completeTask: (id, notes) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: true,
                  completedAt: new Date(),
                  completionNotes: notes,
                }
              : t
          ),
        })),
      resetTasksForPlant: (plantId) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.plantId !== plantId) })),
    }),
    {
      name: 'cannatrack-tasks',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) =>
          localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
