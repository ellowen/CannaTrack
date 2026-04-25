import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// SecureStore tiene un limite de 2048 bytes. Las sesiones de Supabase (~3-4KB)
// superan ese limite. Dividir en chunks de 2000 bytes.
const CHUNK_SIZE = 2000

async function setChunked(key: string, value: string) {
  const chunks = Math.ceil(value.length / CHUNK_SIZE)
  await SecureStore.setItemAsync(`${key}_count`, String(chunks))
  for (let i = 0; i < chunks; i++) {
    await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
  }
}

async function getChunked(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}_count`)
  if (!countStr) return SecureStore.getItemAsync(key) // fallback a clave simple
  const chunks: string[] = []
  for (let i = 0; i < parseInt(countStr); i++) {
    const chunk = await SecureStore.getItemAsync(`${key}_${i}`)
    if (chunk === null) return null
    chunks.push(chunk)
  }
  return chunks.join('')
}

async function removeChunked(key: string) {
  const countStr = await SecureStore.getItemAsync(`${key}_count`)
  if (countStr) {
    for (let i = 0; i < parseInt(countStr); i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`)
    }
    await SecureStore.deleteItemAsync(`${key}_count`)
  } else {
    await SecureStore.deleteItemAsync(key)
  }
}

const secureStorage = {
  getItem: getChunked,
  setItem: setChunked,
  removeItem: removeChunked,
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Connection-Timeout': '10000',
      'Request-Timeout': '30000',
    },
  },
})
