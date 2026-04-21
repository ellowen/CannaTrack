import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    // Linking.createURL devuelve exp://... en Expo Go o cannatrack:// en builds
    const redirectTo = Linking.createURL('/')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) return { error: error?.message ?? 'No se pudo iniciar Google OAuth' }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

    if (result.type !== 'success') return {}

    // Extraer tokens de la URL de callback (Supabase los pone en el fragment)
    const url      = result.url
    const fragment = url.split('#')[1] ?? ''
    const query    = url.split('?')[1]?.split('#')[0] ?? ''
    const params   = new URLSearchParams(fragment || query)

    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    }

    return {}
  } catch (e: unknown) {
    return { error: (e as Error)?.message ?? 'Error en Google Sign-In' }
  }
}
