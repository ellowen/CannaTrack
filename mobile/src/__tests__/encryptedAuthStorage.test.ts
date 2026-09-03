import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockAsyncStorage, createMockSecureStore } from './setup'

const mockAsyncStorage = createMockAsyncStorage()
const mockSecureStore = createMockSecureStore()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
}))
vi.mock('expo-secure-store', () => mockSecureStore)
vi.mock('expo-crypto', () => ({
  getRandomBytesAsync: vi.fn((count: number) => {
    const bytes = new Uint8Array(count)
    for (let i = 0; i < count; i++) bytes[i] = Math.floor(Math.random() * 256)
    return Promise.resolve(bytes)
  }),
}))

describe('encryptedAuthStorage', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockAsyncStorage._getInternalStore())) delete mockAsyncStorage._getInternalStore()[k]
    for (const k of Object.keys(mockSecureStore._getInternalStore())) delete mockSecureStore._getInternalStore()[k]
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('round-trips a value through setItem/getItem', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    const session = JSON.stringify({ access_token: 'abc.def.ghi', refresh_token: 'r-123', user: { id: 'u1' } })

    await encryptedAuthStorage.setItem('sb-session', session)
    const readBack = await encryptedAuthStorage.getItem('sb-session')

    expect(readBack).toBe(session)
  })

  it('never stores the plaintext value in AsyncStorage', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    const secret = 'super-secret-refresh-token-value'

    await encryptedAuthStorage.setItem('sb-session', secret)
    const rawStored = mockAsyncStorage._getInternalStore()['sb-session']

    expect(rawStored).toBeDefined()
    expect(rawStored).not.toContain(secret)
  })

  it('produces different ciphertext for the same plaintext on repeated writes (random IV)', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    const value = 'same-value-twice'

    await encryptedAuthStorage.setItem('k1', value)
    const first = mockAsyncStorage._getInternalStore()['k1']
    await encryptedAuthStorage.setItem('k1', value)
    const second = mockAsyncStorage._getInternalStore()['k1']

    expect(first).not.toBe(second)
  })

  it('returns null (not a crash) for a pre-existing plaintext value from before this change', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    mockAsyncStorage._getInternalStore()['legacy-key'] = JSON.stringify({ access_token: 'legacy' })

    const result = await encryptedAuthStorage.getItem('legacy-key')

    expect(result).toBeNull()
  })

  it('returns null for a missing key without touching the key store', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    const result = await encryptedAuthStorage.getItem('never-set')
    expect(result).toBeNull()
  })

  it('removeItem deletes from AsyncStorage', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    await encryptedAuthStorage.setItem('k2', 'value')
    expect(mockAsyncStorage._getInternalStore()['k2']).toBeDefined()

    await encryptedAuthStorage.removeItem('k2')
    expect(mockAsyncStorage._getInternalStore()['k2']).toBeUndefined()
  })

  it('generates the encryption key only once across multiple operations', async () => {
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')
    await encryptedAuthStorage.setItem('a', '1')
    await encryptedAuthStorage.setItem('b', '2')
    await encryptedAuthStorage.getItem('a')

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1)
  })

  it('reuses a key already saved in SecureStore instead of generating a new one', async () => {
    mockSecureStore._getInternalStore()['cultitrack_storage_key_v1'] = 'a'.repeat(64)
    const { encryptedAuthStorage } = await import('@/lib/encryptedAuthStorage')

    await encryptedAuthStorage.setItem('k3', 'hello')

    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled()
  })
})
