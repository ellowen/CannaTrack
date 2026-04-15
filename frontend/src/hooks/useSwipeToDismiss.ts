import { useRef, useCallback } from 'react'

interface Options {
  onDismiss: () => void
  /** Vertical px needed to trigger dismiss (default 90) */
  threshold?: number
}

/**
 * Swipe-to-dismiss para bottom sheets.
 * Devuelve ref para el panel + handlers de touch.
 * El panel se traslada visualmente mientras el usuario arrastra hacia abajo.
 * Si supera el threshold, llama onDismiss. Si no, rebota al origen.
 */
export function useSwipeToDismiss({ onDismiss, threshold = 90 }: Options) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY   = useRef(0)
  const lastDelta = useRef(0)
  const active   = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current  = e.touches[0].clientY
    lastDelta.current = 0
    active.current  = true
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current) return
    const delta = e.touches[0].clientY - startY.current
    lastDelta.current = delta
    if (delta > 0 && sheetRef.current) {
      // Rubber-band leve cuando se jala hacia arriba
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    active.current = false
    if (sheetRef.current) sheetRef.current.style.transition = ''

    if (lastDelta.current >= threshold) {
      // Animar salida antes de llamar onDismiss
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(100%)`
      }
      setTimeout(onDismiss, 200)
    } else {
      // Rebotar al origen
      if (sheetRef.current) sheetRef.current.style.transform = ''
    }
    lastDelta.current = 0
  }, [onDismiss, threshold])

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd }
}
