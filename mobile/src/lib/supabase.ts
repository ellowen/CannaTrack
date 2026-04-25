import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Tokens almacenados en SecureStore (cifrado en el dispositivo)
const secureStorage = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    async (key: string, value: string) => { await SecureStore.setItemAsync(key, value) },
  removeItem: async (key: string) => { await SecureStore.deleteItemAsync(key) },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
