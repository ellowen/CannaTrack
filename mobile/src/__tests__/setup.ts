/**
 * Test setup file for CannaTrack mobile tests.
 * Shared mocks and utilities for all test files.
 */

import { vi } from 'vitest'

/**
 * Mock console methods to reduce noise in test output.
 * Re-enable for debugging specific tests.
 */
export function setupConsoleMocks() {
  const originalConsoleLog = console.log
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn

  // Mock console methods
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  return {
    restoreConsole: () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    },
  }
}

/**
 * Mock Zustand store for testing.
 * Zustand stores need to be reset between tests to avoid state leakage.
 */
export function resetZustandStore<T extends { setState: Function }>(
  store: T
) {
  store.setState({} as any)
}

/**
 * Helper to wait for async operations in tests.
 */
export function waitFor(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock Supabase client with common methods.
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(),
      setSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  }
}

/**
 * Mock AsyncStorage.
 */
export function createMockAsyncStorage() {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) =>
      Promise.resolve(store[key] || null)
    ),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
      return Promise.resolve()
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Object.keys(store))),
    _getInternalStore: () => store,
  }
}

/**
 * Mock Secure Store for biometric session storage.
 */
export function createMockSecureStore() {
  const store: Record<string, string> = {}

  return {
    setItemAsync: vi.fn((key: string, value: string) => {
      store[key] = value
      return Promise.resolve()
    }),
    getItemAsync: vi.fn((key: string) =>
      Promise.resolve(store[key] || null)
    ),
    deleteItemAsync: vi.fn((key: string) => {
      delete store[key]
      return Promise.resolve()
    }),
    _getInternalStore: () => store,
  }
}

/**
 * Mock AppState for testing foreground/background behavior.
 */
export function createMockAppState() {
  let listeners: Array<(state: string) => void> = []
  let currentState: 'active' | 'background' | 'inactive' = 'active'

  return {
    get currentState() {
      return currentState
    },
    addEventListener: (type: string, callback: (state: string) => void) => {
      if (type === 'change') {
        listeners.push(callback)
      }
      return () => {
        listeners = listeners.filter((l) => l !== callback)
      }
    },
    _changeState(newState: 'active' | 'background' | 'inactive') {
      currentState = newState
      listeners.forEach((cb) => cb(newState))
    },
    _reset() {
      listeners = []
      currentState = 'active'
    },
  }
}

/**
 * Create a spy that tracks all calls and their arguments.
 * Useful for verifying complex async flows.
 */
export function createCallTracker() {
  const calls: Array<{
    timestamp: number
    args: any[]
  }> = []

  const fn = vi.fn((...args: any[]) => {
    calls.push({
      timestamp: Date.now(),
      args,
    })
  })

  return {
    fn,
    getCalls: () => calls,
    getCallCount: () => calls.length,
    getLastCall: () => calls[calls.length - 1],
    getCallArguments: (index: number) => calls[index]?.args,
    getTimingBetweenCalls: () => {
      if (calls.length < 2) return []
      return calls.slice(1).map((call, idx) => call.timestamp - calls[idx].timestamp)
    },
    reset: () => {
      calls.length = 0
    },
  }
}

/**
 * Test helper to simulate network delay.
 */
export async function simulateNetworkDelay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Test helper to create a plant object for testing.
 */
export function createMockPlant(overrides = {}) {
  return {
    id: 'plant-123',
    userId: 'user-123',
    name: 'Test Plant',
    genetics: 'feminized' as const,
    plantingDate: new Date('2026-04-01'),
    status: 'active' as const,
    stage: 'S2',
    tableId: 'revegetar',
    currentMeasurements: {
      height: 20,
      ph: 6.5,
      ec: 0.8,
    },
    ...overrides,
  }
}

/**
 * Test helper to create a task object for testing.
 */
export function createMockTask(overrides = {}) {
  return {
    id: 'task-123',
    plantId: 'plant-123',
    type: 'water' as const,
    scheduledFor: new Date('2026-04-25'),
    completed: false,
    title: 'Water plant',
    description: 'Check soil moisture and water if needed',
    ...overrides,
  }
}

/**
 * Test helper to create a sync action for testing.
 */
export function createMockSyncAction(overrides = {}) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    type: 'updatePlant' as const,
    payload: {
      plantId: 'plant-123',
      status: 'active' as const,
    },
    timestamp: new Date(),
    ...overrides,
  }
}
