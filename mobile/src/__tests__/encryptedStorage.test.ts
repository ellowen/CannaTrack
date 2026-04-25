import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'crypto'

/**
 * Simple encryption function for testing sensitive data storage.
 * In production, use expo-secure-store which handles encryption automatically.
 */
function createEncryptedStorage() {
  const encryptedData: Map<string, string> = new Map()

  function encrypt(plaintext: string, key: string = 'default-key'): string {
    // In real implementation, use proper AES encryption
    // This is a simple XOR-based demo for testing
    const iv = crypto.randomBytes(16).toString('hex')
    const cipher = Buffer.from(plaintext)
      .toString('hex')
      .split('')
      .map((char, idx) => {
        const keyChar = key.charCodeAt(idx % key.length)
        const charCode = parseInt(char, 16)
        return (charCode ^ keyChar).toString(16)
      })
      .join('')

    return `${iv}:${cipher}`
  }

  function decrypt(encrypted: string, key: string = 'default-key'): string {
    const [_iv, cipher] = encrypted.split(':')
    const plaintext = cipher
      .split('')
      .map((char, idx) => {
        const keyChar = key.charCodeAt(idx % key.length)
        const charCode = parseInt(char, 16)
        return String.fromCharCode(charCode ^ keyChar)
      })
      .join('')

    return plaintext
  }

  return {
    setEncrypted: (key: string, plaintext: string, encKey?: string) => {
      const encrypted = encrypt(plaintext, encKey)
      encryptedData.set(key, encrypted)
    },
    getDecrypted: (key: string, encKey?: string): string | null => {
      const encrypted = encryptedData.get(key)
      if (!encrypted) return null
      return decrypt(encrypted, encKey)
    },
    getEncrypted: (key: string): string | null => {
      return encryptedData.get(key) || null
    },
    clear: (key: string) => {
      encryptedData.delete(key)
    },
    clearAll: () => {
      encryptedData.clear()
    },
  }
}

describe('Encrypted Storage', () => {
  let storage: ReturnType<typeof createEncryptedStorage>

  beforeEach(() => {
    storage = createEncryptedStorage()
  })

  describe('Encryption', () => {
    it('should encrypt sensitive data', () => {
      const sensitive = 'secret-api-key-12345'
      storage.setEncrypted('apiKey', sensitive)

      const encrypted = storage.getEncrypted('apiKey')
      expect(encrypted).not.toBeNull()
      expect(encrypted).not.toBe(sensitive)
      expect(encrypted).not.toContain('secret-api-key')
    })

    it('should create different ciphertexts for same plaintext', () => {
      const plaintext = 'same-secret'

      storage.setEncrypted('key1', plaintext)
      const encrypted1 = storage.getEncrypted('key1')

      storage.clearAll()

      storage.setEncrypted('key2', plaintext)
      const encrypted2 = storage.getEncrypted('key2')

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should not expose plaintext in storage', () => {
      const credentials = 'user:password123'
      storage.setEncrypted('credentials', credentials)

      const encrypted = storage.getEncrypted('credentials')
      expect(encrypted).not.toContain('user')
      expect(encrypted).not.toContain('password123')
    })
  })

  describe('Decryption', () => {
    it('should decrypt data correctly', () => {
      const plaintext = 'decryption-test-value'
      storage.setEncrypted('testKey', plaintext)

      const decrypted = storage.getDecrypted('testKey')
      expect(decrypted).toBe(plaintext)
    })

    it('should handle empty strings', () => {
      storage.setEncrypted('empty', '')
      const decrypted = storage.getDecrypted('empty')
      expect(decrypted).toBe('')
    })

    it('should handle special characters', () => {
      const special = 'test!@#$%^&*()\'"<>?'
      storage.setEncrypted('special', special)

      const decrypted = storage.getDecrypted('special')
      expect(decrypted).toBe(special)
    })

    it('should handle unicode characters', () => {
      const unicode = 'Contraseña: 密码 🔐'
      storage.setEncrypted('unicode', unicode)

      const decrypted = storage.getDecrypted('unicode')
      expect(decrypted).toBe(unicode)
    })

    it('should return null for non-existent key', () => {
      const decrypted = storage.getDecrypted('nonexistent')
      expect(decrypted).toBeNull()
    })
  })

  describe('Key-based encryption', () => {
    it('should use different keys for different ciphertexts', () => {
      const plaintext = 'secret'

      storage.setEncrypted('key1', plaintext, 'encryption-key-1')
      const encrypted1 = storage.getEncrypted('key1')

      storage.clearAll()

      storage.setEncrypted('key2', plaintext, 'encryption-key-2')
      const encrypted2 = storage.getEncrypted('key2')

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should require correct key to decrypt', () => {
      const plaintext = 'sensitive-data'
      const key = 'secret-key-abc'

      storage.setEncrypted('data', plaintext, key)

      const decrypted = storage.getDecrypted('data', key)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce garbage with wrong key', () => {
      const plaintext = 'important'
      storage.setEncrypted('data', plaintext, 'correct-key')

      const wrongDecrypt = storage.getDecrypted('data', 'wrong-key')
      expect(wrongDecrypt).not.toBe(plaintext)
    })
  })

  describe('Sensitive data types', () => {
    it('should encrypt API tokens', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.xyz'
      storage.setEncrypted('supabaseToken', token)

      const encrypted = storage.getEncrypted('supabaseToken')
      expect(encrypted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
      expect(encrypted).not.toContain('abc')
    })

    it('should encrypt user session data', () => {
      const session = JSON.stringify({
        userId: 'user-123',
        email: 'user@example.com',
        permissions: ['read', 'write'],
      })

      storage.setEncrypted('session', session)

      const encrypted = storage.getEncrypted('session')
      expect(encrypted).not.toContain('user@example.com')
      expect(encrypted).not.toContain('user-123')

      const decrypted = storage.getDecrypted('session')
      expect(JSON.parse(decrypted!)).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
        permissions: ['read', 'write'],
      })
    })

    it('should encrypt biometric session tokens', () => {
      const biometricSession = JSON.stringify({
        access_token: 'access_abc123def456',
        refresh_token: 'refresh_xyz789uvw',
        expiresIn: 3600,
      })

      storage.setEncrypted('biometricSession', biometricSession)

      const encrypted = storage.getEncrypted('biometricSession')
      expect(encrypted).not.toContain('access_abc123def456')
      expect(encrypted).not.toContain('refresh_xyz789uvw')

      const decrypted = storage.getDecrypted('biometricSession')
      const parsed = JSON.parse(decrypted!)
      expect(parsed.access_token).toBe('access_abc123def456')
    })
  })

  describe('Storage lifecycle', () => {
    it('should clear individual entries', () => {
      storage.setEncrypted('key1', 'value1')
      storage.setEncrypted('key2', 'value2')

      storage.clear('key1')

      expect(storage.getDecrypted('key1')).toBeNull()
      expect(storage.getDecrypted('key2')).toBe('value2')
    })

    it('should clear all entries', () => {
      storage.setEncrypted('key1', 'value1')
      storage.setEncrypted('key2', 'value2')
      storage.setEncrypted('key3', 'value3')

      storage.clearAll()

      expect(storage.getDecrypted('key1')).toBeNull()
      expect(storage.getDecrypted('key2')).toBeNull()
      expect(storage.getDecrypted('key3')).toBeNull()
    })

    it('should allow overwriting encrypted values', () => {
      const key = 'changingValue'
      storage.setEncrypted(key, 'first')
      expect(storage.getDecrypted(key)).toBe('first')

      storage.setEncrypted(key, 'second')
      expect(storage.getDecrypted(key)).toBe('second')

      const encrypted1 = storage.getEncrypted(key)
      storage.setEncrypted(key, 'second') // same value
      const encrypted2 = storage.getEncrypted(key)

      // Different IVs mean different ciphertexts even for same plaintext
      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('Large data encryption', () => {
    it('should encrypt large JSON objects', () => {
      const largeData = {
        plants: Array.from({ length: 100 }, (_, i) => ({
          id: `plant-${i}`,
          name: `Plant ${i}`,
          stage: 'vegetative',
          measurements: {
            height: 10 + i,
            ph: 6.5,
            ec: 0.8,
          },
        })),
      }

      const json = JSON.stringify(largeData)
      storage.setEncrypted('largeData', json)

      const encrypted = storage.getEncrypted('largeData')
      expect(encrypted).not.toContain('plant-')
      expect(encrypted).not.toContain('Plant 1')

      const decrypted = storage.getDecrypted('largeData')
      const parsed = JSON.parse(decrypted!)
      expect(parsed.plants).toHaveLength(100)
      expect(parsed.plants[0].name).toBe('Plant 0')
    })
  })
})
