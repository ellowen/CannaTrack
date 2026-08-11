import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledTask } from '@/types/plant'
import { dateReviver } from '@/lib/storage'
import { parseDateOnly } from '@/lib/date-utils'

// Fallback defensivo: scheduledDate deberia llegar siempre como Date (ya
// sea recien creado, o revivido desde localStorage por dateReviver, que
// espera ISO completo con "T"). Si por algun motivo llega como string
// "YYYY-MM-DD" puro (sin hora), parsearlo como fecha LOCAL -- new
// Date("YYYY-MM-DD") lo interpreta como medianoche UTC, corriendo la
// fecha un dia para husos horarios detras de UTC.
function toLocalDate(value: Date | string): Date {
  if (value instanceof Date) return value
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateOnly(value) : new Date(value)
}

type TaskFilter = 'all' | 'today' | 'overdue' | 'completed'

interface TaskStore {
  tasks: ScheduledTask[]
  filter: TaskFilter
  loading: boolean

  // Acciones
  addTask: (task: ScheduledTask) => void
  completeTask: (id: string, notes?: string) => void
  uncompleteTask: (id: string) => void
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
      completeTask: (id, notes) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: true,
                  completedAt: new Date(),
                  completionNotes: notes,
                  xpAwarded: true,
                }
              : t
          ),
        })),
      uncompleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, completed: false, completedAt: undefined, completionNotes: undefined }
              : t
          ),
        })),
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
          const scheduled = toLocalDate(t.scheduledDate)
          const mm = String(scheduled.getMonth() + 1).padStart(2, '0')
          const dd = String(scheduled.getDate()).padStart(2, '0')
          const dateStr = `${scheduled.getFullYear()}-${mm}-${dd}`
          return dateStr === today
        })
      },
      getOverdueTasks: () => {
        const now = new Date()
        return get().tasks.filter((t) => {
          const scheduled = toLocalDate(t.scheduledDate)
          return scheduled < now && !t.completed
        })
      },
      getCompletedCount: () => get().tasks.filter((t) => t.completed).length,
      getPendingCount: () => get().tasks.filter((t) => !t.completed).length,
    }),
    {
      name: 'cultitrack-tasks',
      partialize: (state) => ({ tasks: state.tasks }),
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
