/**
 * Prompt de rating para App Store / Google Play.
 * Se muestra una sola vez, cuando el usuario completa su 5ta tarea.
 * Usa expo-store-review (no-op en simulador/Expo Go).
 */
import * as StoreReview from 'expo-store-review'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { track } from '@/lib/analytics'

const KEY_TASKS_COMPLETED = 'cannatrack:tasks_completed_count'
const KEY_RATING_SHOWN    = 'cannatrack:rating_shown'
const THRESHOLD           = 5   // mostrar despues de N tareas completadas

/**
 * Llamar cada vez que el usuario completa una tarea.
 * Muestra el rating prompt la primera vez que se alcanza el umbral.
 */
export async function maybeRequestRating(): Promise<void> {
  try {
    const alreadyShown = await AsyncStorage.getItem(KEY_RATING_SHOWN)
    if (alreadyShown) return

    const raw     = await AsyncStorage.getItem(KEY_TASKS_COMPLETED)
    const count   = parseInt(raw ?? '0', 10) + 1
    await AsyncStorage.setItem(KEY_TASKS_COMPLETED, String(count))

    if (count < THRESHOLD) return

    // Marcar antes de mostrar para evitar doble prompt si hay error
    await AsyncStorage.setItem(KEY_RATING_SHOWN, '1')

    const isAvailable = await StoreReview.isAvailableAsync()
    if (!isAvailable) return

    track('rating_prompt_shown', { tasks_completed: count })
    await StoreReview.requestReview()
  } catch {
    // No bloquear el flujo por errores de rating
  }
}
