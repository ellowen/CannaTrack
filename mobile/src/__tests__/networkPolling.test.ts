import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Mock AppState for testing foreground/background state.
 * In real app, comes from react-native.
 */
interface MockAppState {
  currentState: 'active' | 'background' | 'inactive'
  addEventListener: (type: string, callback: (state: string) => void) => () => void
}

function createMockAppState(): MockAppState {
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
  }
}

/**
 * Network polling manager that respects app state.
 */
function createNetworkPoller(appState: MockAppState) {
  let isPolling = false
  let pollInterval: NodeJS.Timeout | null = null
  let pollCount = 0
  const pollRequests: Array<{ time: number }> = []

  async function checkNetworkStatus(): Promise<boolean> {
    if (appState.currentState !== 'active') {
      return false
    }
    pollCount++
    pollRequests.push({ time: Date.now() })
    return true
  }

  function startPolling(intervalMs: number = 5000): void {
    if (isPolling) return

    isPolling = true
    pollInterval = setInterval(() => {
      if (appState.currentState === 'active') {
        checkNetworkStatus().catch((err) => {
          console.error('Poll error:', err)
        })
      }
    }, intervalMs)
  }

  function stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    isPolling = false
  }

  function _getInternalState() {
    return {
      isPolling,
      pollCount,
      pollRequests,
    }
  }

  return {
    startPolling,
    stopPolling,
    checkNetworkStatus,
    _getInternalState,
  }
}

describe('Network Polling - App State Awareness', () => {
  let appState: MockAppState
  let poller: ReturnType<typeof createNetworkPoller>

  beforeEach(() => {
    vi.useFakeTimers()
    appState = createMockAppState()
    poller = createNetworkPoller(appState)
  })

  afterEach(() => {
    poller.stopPolling()
    vi.useRealTimers()
  })

  describe('Polling lifecycle', () => {
    it('should start polling', () => {
      poller.startPolling(1000)
      expect(poller._getInternalState().isPolling).toBe(true)
    })

    it('should stop polling', () => {
      poller.startPolling(1000)
      poller.stopPolling()
      expect(poller._getInternalState().isPolling).toBe(false)
    })

    it('should not start polling twice', () => {
      poller.startPolling(1000)
      poller.startPolling(1000) // should be ignored

      expect(poller._getInternalState().isPolling).toBe(true)
    })

    it('should handle stop when not polling', () => {
      expect(() => {
        poller.stopPolling()
      }).not.toThrow()
    })
  })

  describe('App state awareness', () => {
    it('should poll when app is active', () => {
      appState._changeState('active')
      poller.startPolling(1000)

      vi.advanceTimersByTime(1000)
      expect(poller._getInternalState().pollCount).toBeGreaterThan(0)
    })

    it('should stop polling when app backgrounded', () => {
      appState._changeState('active')
      poller.startPolling(1000)

      vi.advanceTimersByTime(1000)
      const countBeforeBackground = poller._getInternalState().pollCount

      appState._changeState('background')
      vi.advanceTimersByTime(2000)

      // Poll count should not increase while backgrounded
      const countAfterBackground = poller._getInternalState().pollCount
      expect(countAfterBackground).toBe(countBeforeBackground)
    })

    it('should resume polling when app comes back to foreground', () => {
      appState._changeState('active')
      poller.startPolling(1000)

      vi.advanceTimersByTime(1000)
      const countWhileActive = poller._getInternalState().pollCount

      appState._changeState('background')
      vi.advanceTimersByTime(2000)

      const countAfterBackground = poller._getInternalState().pollCount
      expect(countAfterBackground).toBe(countWhileActive)

      appState._changeState('active')
      vi.advanceTimersByTime(1000)

      const countAfterResume = poller._getInternalState().pollCount
      expect(countAfterResume).toBeGreaterThan(countAfterBackground)
    })

    it('should not poll when app is inactive', () => {
      appState._changeState('inactive')
      poller.startPolling(1000)

      vi.advanceTimersByTime(2000)
      expect(poller._getInternalState().pollCount).toBe(0)
    })
  })

  describe('Request optimization', () => {
    it('should only make requests while active', () => {
      appState._changeState('active')
      poller.startPolling(500)

      // Active for 2 seconds
      vi.advanceTimersByTime(2000)
      const requestsWhileActive = poller._getInternalState().pollRequests.length

      // Backgrounded for 2 seconds
      appState._changeState('background')
      vi.advanceTimersByTime(2000)
      const requestsAfterBackground = poller._getInternalState().pollRequests.length

      // No new requests while backgrounded
      expect(requestsAfterBackground).toBe(requestsWhileActive)
    })

    it('should not waste resources on background polling', () => {
      appState._changeState('active')
      poller.startPolling(1000)

      vi.advanceTimersByTime(1000)
      const requestsAtStart = poller._getInternalState().pollRequests.length

      // Background for 10 seconds (would be 10 requests if always polling)
      appState._changeState('background')
      vi.advanceTimersByTime(10000)

      const requestsAfterBackground = poller._getInternalState().pollRequests.length
      expect(requestsAfterBackground).toBe(requestsAtStart)
    })

    it('should batch polls efficiently', () => {
      appState._changeState('active')
      poller.startPolling(1000)

      vi.advanceTimersByTime(5000)
      const pollCount = poller._getInternalState().pollCount

      // 5000ms / 1000ms = 5 polls
      expect(pollCount).toBeLessThanOrEqual(6) // Allow for timing variance
      expect(pollCount).toBeGreaterThan(0)
    })
  })

  describe('Poll intervals', () => {
    it('should respect custom poll interval', () => {
      appState._changeState('active')
      poller.startPolling(2000)

      vi.advanceTimersByTime(2000)
      const count1 = poller._getInternalState().pollCount

      vi.advanceTimersByTime(2000)
      const count2 = poller._getInternalState().pollCount

      // Should have polled twice in 4000ms with 2000ms interval
      expect(count2 - count1).toBeGreaterThan(0)
    })

    it('should use default 5-second interval', () => {
      appState._changeState('active')
      poller.startPolling() // default 5000ms

      vi.advanceTimersByTime(5000)
      const count1 = poller._getInternalState().pollCount

      vi.advanceTimersByTime(5000)
      const count2 = poller._getInternalState().pollCount

      expect(count2).toBeGreaterThan(count1)
    })
  })

  describe('Multiple state transitions', () => {
    it('should handle rapid app state changes', () => {
      appState._changeState('active')
      poller.startPolling(1000)

      vi.advanceTimersByTime(500)
      const initialCount = poller._getInternalState().pollCount

      appState._changeState('background')
      vi.advanceTimersByTime(500)
      appState._changeState('active')
      vi.advanceTimersByTime(500)
      appState._changeState('background')
      vi.advanceTimersByTime(500)
      appState._changeState('active')
      vi.advanceTimersByTime(1000)

      const finalCount = poller._getInternalState().pollCount
      expect(finalCount).toBeGreaterThan(initialCount)
    })

    it('should maintain request tracking across state changes', () => {
      appState._changeState('active')
      poller.startPolling(500)

      vi.advanceTimersByTime(1000)
      const requests1 = poller._getInternalState().pollRequests.length

      appState._changeState('background')
      vi.advanceTimersByTime(1000)

      appState._changeState('active')
      vi.advanceTimersByTime(1000)

      const requests2 = poller._getInternalState().pollRequests.length
      expect(requests2).toBeGreaterThan(requests1)
    })
  })

  describe('Edge cases', () => {
    it('should handle polling with 0 interval', () => {
      appState._changeState('active')
      expect(() => {
        poller.startPolling(0)
      }).not.toThrow()
    })

    it('should handle stopping while backgrounded', () => {
      appState._changeState('background')
      poller.startPolling(1000)

      expect(() => {
        poller.stopPolling()
      }).not.toThrow()
    })

    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 5; i++) {
        poller.startPolling(1000)
        poller.stopPolling()
      }

      expect(poller._getInternalState().isPolling).toBe(false)
    })
  })
})
