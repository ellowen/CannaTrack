import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock encadenable minimo para el patron `.from(...).select(...).eq(...).single()`
// y `.from(...).update(...).eq(...)` que usa completeTaskInSupabase.
function createChain(result: { data?: any; error?: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
  }
  // update(...).eq(...) resuelve directo sin pasar por single()
  chain.eq.mockImplementation(() => {
    const p: any = Promise.resolve(result)
    p.select = chain.select
    p.single = chain.single
    p.eq = chain.eq
    return p
  })
  return chain
}

const mockRpc = vi.fn()
let fromResults: Record<string, { data?: any; error?: any }> = {}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => createChain(fromResults[table])),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}))

describe('completeTaskInSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromResults = {}
  })

  it('calls handle_task_completion and returns the real reward when the task was not awarded yet', async () => {
    fromResults.scheduled_tasks = { data: { xp_awarded: false, user_id: 'u1' } }
    mockRpc.mockResolvedValue({ data: { xp_gained: 25, new_streak: 3 }, error: null })

    const { completeTaskInSupabase } = await import('@/lib/sync')
    const reward = await completeTaskInSupabase('task-1', 'nota')

    expect(mockRpc).toHaveBeenCalledWith('handle_task_completion', {
      task_id_param: 'task-1',
      user_id_param: 'u1',
    })
    expect(reward).toEqual({ xpGained: 25, newStreak: 3 })
  })

  it('does not call the RPC again if the task already awarded XP (idempotencia)', async () => {
    fromResults.scheduled_tasks = { data: { xp_awarded: true, user_id: 'u1' } }

    const { completeTaskInSupabase } = await import('@/lib/sync')
    const reward = await completeTaskInSupabase('task-1')

    expect(mockRpc).not.toHaveBeenCalled()
    expect(reward).toEqual({ xpGained: null, newStreak: null })
  })

  it('throws if the RPC itself fails, instead of silently returning an empty reward', async () => {
    fromResults.scheduled_tasks = { data: { xp_awarded: false, user_id: 'u1' } }
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not_authorized' } })

    const { completeTaskInSupabase } = await import('@/lib/sync')
    await expect(completeTaskInSupabase('task-1')).rejects.toBeTruthy()
  })
})
