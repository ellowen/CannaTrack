import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

const SESSION_KEY = 'cannatrack_session_v1'
const MAX_BIOMETRIC_ATTEMPTS = 5
let failedAttempts = 0

export async function saveSessionForBiometric(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
  }))
}

export async function clearSavedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}

export async function hasSavedSession(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(SESSION_KEY)
  return val !== null
}

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync()
  const enrolled   = await LocalAuthentication.isEnrolledAsync()
  return compatible && enrolled
}

export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID'
  return 'Huella digital'
}

export async function restoreSessionWithBiometric(): Promise<Session | null> {
  if (failedAttempts >= MAX_BIOMETRIC_ATTEMPTS) {
    throw new Error('Demasiados intentos fallidos. Ingresa con tu contrasena.')
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirma tu identidad para ingresar',
      cancelLabel:   'Cancelar',
    })
    if (!result.success) {
      failedAttempts++
      return null
    }

    failedAttempts = 0
    const val = await SecureStore.getItemAsync(SESSION_KEY)
    if (!val) return null

    const { access_token, refresh_token } = JSON.parse(val) as { access_token: string; refresh_token: string }
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) return null
    return data.session
  } catch (e) {
    if (e instanceof Error && e.message.includes('Demasiados')) throw e
    return null
  }
}

export function resetBiometricAttempts(): void {
  failedAttempts = 0
}
