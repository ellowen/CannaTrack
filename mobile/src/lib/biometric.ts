import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

const SESSION_KEY = 'cannatrack_session_v1'

export async function isBiometricAvailable(): Promise<boolean> {
  const hardware = await LocalAuthentication.hasHardwareAsync()
  if (!hardware) return false
  const enrolled = await LocalAuthentication.isEnrolledAsync()
  return enrolled
}

export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Huella digital'
  }
  return 'Biometria'
}

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
  const stored = await SecureStore.getItemAsync(SESSION_KEY)
  return stored !== null
}

export async function restoreSessionWithBiometric(): Promise<Session | null> {
  const available = await isBiometricAvailable()
  if (!available) return null

  const stored = await SecureStore.getItemAsync(SESSION_KEY)
  if (!stored) return null

  const label = await getBiometricLabel()
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:         `Accede a CannaTrack con ${label}`,
    cancelLabel:           'Usar contrasena',
    disableDeviceFallback: false,
  })

  if (!result.success) return null

  try {
    const { access_token, refresh_token } = JSON.parse(stored)
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error || !data.session) return null
    return data.session
  } catch {
    await clearSavedSession()
    return null
  }
}
