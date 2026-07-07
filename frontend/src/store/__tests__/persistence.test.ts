// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { usePlantStore } from '../plantStore'
import { useUserStore } from '../userStore'
import { useTaskStore } from '../taskStore'
import { useSyncStore } from '../syncStore'

describe('Store Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should persist plants to localStorage', () => {
    const plant = {
      id: '1',
      name: 'Test Plant',
      genetics: 'OG Kush',
      geneticType: 'feminized' as const,
      sex: 'unknown' as const,
      startDate: new Date('2026-04-23'),
      location: 'indoor' as const,
      potCount: 1,
      potVolumeLiters: 11,
      nutritionTableId: 'revegetar',
      status: 'active' as const,
    }

    usePlantStore.setState({ plants: [plant] })
    const stored = localStorage.getItem('cultitrack-plants')
    expect(stored).toBeDefined()
    expect(stored).toContain('"name":"Test Plant"')
  })

  it('should persist user data with XP and streak', () => {
    useUserStore.setState({
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free',
      totalXP: 250,
      streak: 5,
      bestStreak: 10,
    })

    const stored = localStorage.getItem('cultitrack-user')
    expect(stored).toBeDefined()
    expect(stored).toContain('"totalXP":250')
    expect(stored).toContain('"streak":5')
  })

  it('should persist tasks with dates', () => {
    const task = {
      id: 'task-1',
      plantId: 'plant-1',
      type: 'irrigation' as const,
      scheduledDate: new Date('2026-04-24'),
      cycle: 'vege' as const,
      week: 1,
      stage: 'growth' as const,
      products: [],
      completed: false,
    }

    useTaskStore.setState({ tasks: [task] })
    const stored = localStorage.getItem('cultitrack-tasks')
    expect(stored).toBeDefined()
    expect(stored).toContain('2026-04-24')
  })

  it('should persist sync queue for offline support', () => {
    useSyncStore.setState({
      syncQueue: [
        {
          id: 'sync-1',
          type: 'addPlant',
          payload: { name: 'New Plant' },
          timestamp: new Date(),
        },
      ],
    })

    const stored = localStorage.getItem('cultitrack-sync')
    expect(stored).toBeDefined()
    expect(stored).toContain('"type":"addPlant"')
  })

  it('should calculate level from XP', () => {
    useUserStore.setState({ totalXP: 350 })
    const state = useUserStore.getState()
    const level = state.getLevel()
    expect(level.current.level).toBe(3) // Plántula a 300 XP
  })

  it('should return streak bonus XP', () => {
    useUserStore.setState({ streak: 7 })
    const state = useUserStore.getState()
    expect(state.getStreakBonusXP()).toBe(200)
  })

  it('should filter active plants', () => {
    const plants = [
      {
        id: '1',
        name: 'Active',
        genetics: 'OG',
        geneticType: 'feminized' as const,
        sex: 'unknown' as const,
        startDate: new Date(),
        location: 'indoor' as const,
        potCount: 1,
        nutritionTableId: 'revegetar',
        status: 'active' as const,
      },
      {
        id: '2',
        name: 'Harvested',
        genetics: 'OG',
        geneticType: 'feminized' as const,
        sex: 'unknown' as const,
        startDate: new Date(),
        location: 'indoor' as const,
        potCount: 1,
        nutritionTableId: 'revegetar',
        status: 'harvested' as const,
      },
    ]

    usePlantStore.setState({ plants })
    const state = usePlantStore.getState()
    const active = state.getActivePlants()
    expect(active).toHaveLength(1)
    expect(active[0].name).toBe('Active')
  })

  it('should count today tasks', () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasks = [
      {
        id: '1',
        plantId: 'p1',
        type: 'irrigation' as const,
        scheduledDate: today,
        cycle: 'vege' as const,
        week: 1,
        stage: 'growth' as const,
        products: [],
        completed: false,
      },
      {
        id: '2',
        plantId: 'p1',
        type: 'nutrition' as const,
        scheduledDate: tomorrow,
        cycle: 'vege' as const,
        week: 1,
        stage: 'growth' as const,
        products: [],
        completed: false,
      },
    ]

    useTaskStore.setState({ tasks })
    const state = useTaskStore.getState()
    const todayTasks = state.getTodayTasks()
    expect(todayTasks).toHaveLength(1)
  })
})
