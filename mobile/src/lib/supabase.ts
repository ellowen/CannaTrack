import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { encryptedAuthStorage } from './encryptedAuthStorage'
import 'react-native-url-polyfill/auto'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// En web: Supabase usa localStorage del browser (default cuando storage=undefined) --
// SecureStore no existe en web y encriptar contra localStorage no aporta nada real
// (cualquier extension del browser con acceso a la pagina ya puede leerlo).
// En mobile: AsyncStorage encriptado (ver encryptedAuthStorage.ts) -- misma
// confiabilidad que AsyncStorage plano (nunca tiene el limite de tamano/
// chunking que rompio SecureStore antes), pero el valor persistido esta cifrado.
const authStorage = Platform.OS === 'web' ? undefined : encryptedAuthStorage

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
