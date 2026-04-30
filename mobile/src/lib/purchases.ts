import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Nombre del entitlement en el dashboard de RevenueCat
export const ENTITLEMENT_PRO = 'pro'

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY     ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''
const APP_ENV     = process.env.EXPO_PUBLIC_APP_ENV ?? 'development'

let _initialized = false

/**
 * Inicializa RevenueCat. Llamar una vez al arranque de la app.
 * Si no hay API key configurada (dev sin cuenta RC), no hace nada.
 */
export function initPurchases(userId?: string) {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
  if (!apiKey) return

  if (APP_ENV !== 'production') {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }

  Purchases.configure({ apiKey, appUserID: userId ?? null })
  _initialized = true
}

/**
 * Vincula el usuario autenticado con RevenueCat.
 * Llamar despues de login exitoso.
 */
export async function identifyUser(userId: string) {
  if (!_initialized) return
  try {
    await Purchases.logIn(userId)
  } catch (e) {
    console.warn('[purchases] identifyUser error:', e)
  }
}

/**
 * Desvincula el usuario al hacer logout.
 */
export async function resetUser() {
  if (!_initialized) return
  try {
    await Purchases.logOut()
  } catch (e) {
    console.warn('[purchases] resetUser error:', e)
  }
}

/**
 * Devuelve true si el usuario tiene el entitlement Pro activo.
 */
export function hasPro(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_PRO] != null
}

/**
 * Obtiene el CustomerInfo actual. Puede lanzar si RC no esta inicializado.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!_initialized) return null
  try {
    return await Purchases.getCustomerInfo()
  } catch (e) {
    console.warn('[purchases] getCustomerInfo error:', e)
    return null
  }
}

/**
 * Inicia el flujo de compra del plan Pro.
 * Retorna true si la compra fue exitosa.
 */
export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
  if (!_initialized) return { success: false, error: 'Compras no disponibles en este entorno.' }
  try {
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.availablePackages[0]
    if (!pkg) return { success: false, error: 'No hay planes disponibles.' }

    const { customerInfo } = await Purchases.purchasePackage(pkg)
    if (hasPro(customerInfo)) {
      await syncProToSupabase(true)
      return { success: true }
    }
    return { success: false, error: 'La compra no activo el plan Pro.' }
  } catch (e: unknown) {
    // El usuario cancelo — no es un error real
    if (typeof e === 'object' && e !== null && 'userCancelled' in e && (e as { userCancelled: boolean }).userCancelled) {
      return { success: false }
    }
    const msg = e instanceof Error ? e.message : 'Error al procesar la compra.'
    console.error('[purchases] purchasePro error:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Restaura compras previas (requerido por App Store guidelines).
 * Retorna true si se restauro el plan Pro.
 */
export async function restorePurchases(): Promise<{ isPro: boolean; error?: string }> {
  if (!_initialized) return { isPro: false, error: 'Compras no disponibles en este entorno.' }
  try {
    const customerInfo = await Purchases.restorePurchases()
    const isPro = hasPro(customerInfo)
    await syncProToSupabase(isPro)
    return { isPro }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al restaurar compras.'
    console.error('[purchases] restorePurchases error:', msg)
    return { isPro: false, error: msg }
  }
}

/**
 * Sincroniza el estado Pro con Supabase para que las Edge Functions
 * (diagnose-plant) puedan verificar el plan sin llamar a RevenueCat.
 * Se llama silenciosamente — los errores no bloquean al usuario.
 */
export async function syncProToSupabase(isPro: boolean) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ is_pro: isPro }).eq('id', user.id)
  } catch (e) {
    console.warn('[purchases] syncProToSupabase error:', e)
  }
}
