import { useRef, useState, useCallback } from 'react'

interface Options {
  onRefresh: () => void
  /** Px a bajar para disparar el refresh (default 64) */
  threshold?: number
}

/**
 * Pull-to-refresh para contenedores scrolleables.
 * Retorna ref para el contenedor, handlers de touch, y estado visual.
 * Solo activa si el contenedor está en el tope del scroll.
 */
export function usePullToRefresh({ onRefresh, threshold = 64 }: Options) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startY       = useRef(0)
  const pulling      = useRef(false)
  const [pullProgress, setPullProgress] = useState(0) // 0–1
  const [refreshing, setRefreshing]     = useState(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current
    if (!el || el.scrollTop > 4) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return
    const el = containerRef.current
    if (el && el.scrollTop > 4) {
      pulling.current = false
      setPullProgress(0)
      return
    }
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      e.preventDefault()
      const clamped = Math.min(delta * 0.45, threshold + 16)
      setPullProgress(clamped / threshold)
    }
  }, [refreshing, threshold])

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return
    pulling.current = false

    if (pullProgress >= 1 && !refreshing) {
      setRefreshing(true)
      setPullProgress(0)
      // Pequeño delay visual antes de llamar al callback
      setTimeout(() => {
        onRefresh()
        setRefreshing(false)
      }, 700)
    } else {
      setPullProgress(0)
    }
    startY.current = 0
  }, [pullProgress, refreshing, onRefresh])

  return { containerRef, onTouchStart, onTouchMove, onTouchEnd, pullProgress, refreshing }
}
