import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import CryptoJS from 'crypto-js'

// Guarda la sesion de Supabase encriptada en AsyncStorage en vez de en texto
// plano. IMPORTANTE: NO usar SecureStore para el valor en si -- ya se probo
// una vez (abril 2026, ver git log de supabase.ts) y rompio la persistencia
// del login. La sesion de Supabase (~3-4KB) supera el limite de 2048 bytes
// de SecureStore, y el chunking manual para sortearlo genero una condicion
// de carrera intermitente entre escrituras concurrentes durante el refresh
// automatico de token.
//
// Este enfoque evita el problema de raiz: SecureStore solo guarda una clave
// chica (~44 bytes, fija, nunca crece) UNA sola vez. AsyncStorage sigue
// siendo el backend real de lectura/escritura para Supabase -- exactamente
// el mismo camino que ya funciona hoy -- solo que ahora el valor que
// AsyncStorage persiste esta encriptado con esa clave.

const KEY_STORAGE_NAME = 'cultitrack_storage_key_v1'

let cachedKey: string | null = null
let keyPromise: Promise<string> | null = null

async function getOrCreateKey(): Promise<string> {
  if (cachedKey) return cachedKey
  if (keyPromise) return keyPromise

  keyPromise = (async () => {
    const existing = await SecureStore.getItemAsync(KEY_STORAGE_NAME)
    if (existing) {
      cachedKey = existing
      return existing
    }
    const randomBytes = await Crypto.getRandomBytesAsync(32)
    const key = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    await SecureStore.setItemAsync(KEY_STORAGE_NAME, key)
    cachedKey = key
    return key
  })()

  return keyPromise
}

function encrypt(plaintext: string, key: string): string {
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(key), { iv })
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.toString()}`
}

function decrypt(payload: string, key: string): string | null {
  const [ivHex, ciphertext] = payload.split(':')
  if (!ivHex || !ciphertext) return null
  try {
    const iv = CryptoJS.enc.Hex.parse(ivHex)
    const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), { iv })
    const text = decrypted.toString(CryptoJS.enc.Utf8)
    return text || null
  } catch {
    return null
  }
}

export const encryptedAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await AsyncStorage.getItem(key)
    if (!stored) return null
    const encKey = await getOrCreateKey()
    // Si viene de una version previa a este cambio, el valor todavia esta en
    // texto plano -- decrypt() devuelve null y tratamos esto como "no hay
    // sesion" (fuerza un re-login, no rompe la app).
    return decrypt(stored, encKey)
  },

  async setItem(key: string, value: string): Promise<void> {
    const encKey = await getOrCreateKey()
    await AsyncStorage.setItem(key, encrypt(value, encKey))
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
  },
}
