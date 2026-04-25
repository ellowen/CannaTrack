import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledTask } from '@shared/types/plant'
import { createAsyncStorage } from '@/lib/storage'

type TaskFilter = 'all' | 'today' | 'overdue' | 'completed'

interface TaskStore {
  tasks: ScheduledTask[]
  filter: TaskFilter
  loading: boolean

  // Acciones
  addTask: (task: ScheduledTask) => void
  completeTask: (id: string, notes?: string) => void
  updateTask: (id: string, changes: Partial<ScheduledTask>) => void
  removeTask: (id: string) => void
  setTasks: (plantId: string, tasks: ScheduledTask[]) => void
  setAllTasks: (tasks: ScheduledTask[]) => void
  resetTasksForPlant: (plantId: string) => void
  setFilter: (f: TaskFilter) => void
  setLoading: (v: boolean) => void

  // Selectors
  getTodayTasks: () => ScheduledTask[]
  getOverdueTasks: () => ScheduledTask[]
  getCompletedCount: () => number
  getPendingCount: () => number
}

const todayStr = (): string => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      filter: 'all',
      loading: false,

      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      completeTask: (id, notes) => {
        const state = get()
        const originalTask = state.tasks.find((t) => t.id === id)

        if (!originalTask) {
          console.error(`Task ${id} not found`)
          return
        }

        const completedTask: ScheduledTask = {
          ...originalTask,
          completed: true,
          completedAt: new Date(),
          completionNotes: notes,
        }

        // Update local state
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? completedTask : t)),
        }))

        // Sync will be handled in components/hooks
        console.log(`[TaskStore] Task ${id} completed locally`)
      },
      updateTask: (id, changes) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...changes } : t
          ),
        })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      setTasks: (plantId, newTasks) =>
        set((s) => ({
          tasks: [
            ...s.tasks.filter((t) => t.plantId !== plantId),
            ...newTasks,
          ],
        })),
      setAllTasks: (tasks) => set({ tasks }),
      resetTasksForPlant: (plantId) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.plantId !== plantId) })),
      setFilter: (filter) => set({ filter }),
      setLoading: (loading) => set({ loading }),

      getTodayTasks: () => {
        const today = todayStr()
        return get().tasks.filter((t) => {
          const scheduled = t.scheduledDate instanceof Date
            ? t.scheduledDate
            : new Date(t.scheduledDate)
          const mm = String(scheduled.getMonth() + 1).padStart(2, '0')
          const dd = String(scheduled.getDate()).padStart(2, '0')
          const dateStr = `${scheduled.getFullYear()}-${mm}-${dd}`
          return dateStr === today
        })
      },
      getOverdueTasks: () => {
        const now = new Date()
        return get().tasks.filter((t) => {
          const scheduled = t.scheduledDate instanceof Date
            ? t.scheduledDate
            : new Date(t.scheduledDate)
          return scheduled < now && !t.completed
        })
      },
      getCompletedCount: () => get().tasks.filter((t) => t.completed).length,
      getPendingCount: () => get().tasks.filter((t) => !t.completed).length,
    }),
    {
      name: 'cannatrack-tasks',
      partialize: (state) => ({ tasks: state.tasks }),
      storage: createAsyncStorage(),
    }
  )
)
