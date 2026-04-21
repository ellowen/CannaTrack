import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const redirectTo = AuthSession.makeRedirectUri({ scheme: 'cannatrack' })

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

    // Extraer tokens de la URL de callback
    const url = result.url
    const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '')
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      // Supabase a veces usa el fragment como JSON
      const fragment = url.split('#')[1] ?? ''
      try {
        const parsed = JSON.parse(decodeURIComponent(fragment))
        if (parsed.access_token) {
          await supabase.auth.setSession({
            access_token:  parsed.access_token,
            refresh_token: parsed.refresh_token,
          })
          return {}
        }
      } catch {}
      // Si no hay tokens, igual puede haberse logueado via cookie/storage
      return {}
    }

    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    return {}
  } catch (e: unknown) {
    return { error: (e as Error)?.message ?? 'Error en Google Sign-In' }
  }
}
