/**
 * Utilidades de feedback háptico.
 * Solo funciona en Android (navigator.vibrate). En iOS es no-op silencioso.
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

/** Toque ligero — confirmaciones menores, toggles */
export function hapticLight() { vibrate(8) }

/** Toque medio — botones primarios, guardado */
export function hapticMedium() { vibrate(15) }

/** Patrón de éxito — tarea completada, planta creada */
export function hapticSuccess() { vibrate([10, 40, 20]) }

/** Advertencia — acción destructiva */
export function hapticWarning() { vibrate([20, 60, 20, 60, 20]) }
