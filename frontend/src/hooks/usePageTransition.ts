import { useLocation, useNavigationType } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

// Orden de los tabs en el nav (izquierda → derecha)
const TAB_ORDER = ['/', '/calendar', '/settings']

function tabIndex(path: string): number {
  return TAB_ORDER.indexOf(path)
}

function isDeep(path: string): boolean {
  return tabIndex(path) === -1
}

/**
 * Devuelve la clase CSS de animación para la página entrante,
 * basándose en la ruta anterior, la ruta actual y el tipo de navegación.
 */
export function usePageTransition() {
  const location      = useLocation()
  const navType       = useNavigationType()
  const prevPathRef   = useRef<string>(location.pathname)
  const [animClass, setAnimClass] = useState<string>('page-fade-in')

  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    prevPathRef.current = curr

    if (prev === curr) return

    const prevDeep = isDeep(prev)
    const currDeep = isDeep(curr)

    if (navType === 'POP') {
      // Navegación hacia atrás
      if (prevDeep && !currDeep) {
        setAnimClass('page-enter-down')   // volviendo desde detalle → baja
      } else {
        const pi = tabIndex(prev)
        const ci = tabIndex(curr)
        setAnimClass(ci < pi ? 'page-enter-right' : 'page-enter-left')
      }
    } else {
      // Navegación hacia adelante (PUSH / REPLACE)
      if (!currDeep) {
        // Navegación entre tabs
        const pi = tabIndex(prev)
        const ci = tabIndex(curr)
        if (pi === -1 || ci === -1) {
          setAnimClass('page-fade-in')
        } else {
          setAnimClass(ci > pi ? 'page-enter-left' : 'page-enter-right')
        }
      } else {
        // Entrando a una ruta deep (PlantDetail, NewPlant)
        setAnimClass('page-enter-up')
      }
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  return { animClass, locationKey: location.key }
}
