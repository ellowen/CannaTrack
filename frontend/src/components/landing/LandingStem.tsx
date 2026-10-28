import { useEffect, useRef, useState } from 'react'

/**
 * Hilo del ciclo: un tallo que recorre toda la landing y se dibuja con el scroll.
 * Brota una hoja en cada seccion marcada con `data-stem` y, de paso, publica en
 * `--lp-p` (0 a 1) cuanto se scrolleo, que la capa de color usa para pasar del
 * verde del vegetativo al dorado de la floracion.
 * Se monta dentro de `.lp-root` (position: relative) y mide a ese contenedor.
 */

const WIDTH = 28
const X = WIDTH / 2
const SEGMENT = 300

interface Geometry {
  height: number
  top: number
  nodes: number[]
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Curva suave que serpentea de `top` a `bottom` (cada tramo de ~300px alterna el lado). */
function buildPath(top: number, bottom: number): string {
  const total = Math.max(SEGMENT, bottom - top)
  const count = Math.max(1, Math.round(total / SEGMENT))
  const seg = total / count
  let d = `M ${X} ${top}`
  for (let i = 0; i < count; i++) {
    const y = top + i * seg
    const a = i % 2 === 0 ? 6 : -6
    d += ` C ${X + a} ${y + seg * 0.33}, ${X - a} ${y + seg * 0.66}, ${X} ${y + seg}`
  }
  return d
}

export function LandingStem() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [geo, setGeo] = useState<Geometry>({ height: 0, top: 0, nodes: [] })

  // Medir el contenedor y las secciones (cambia con el ancho, las fuentes y los acordeones).
  useEffect(() => {
    const root = wrapRef.current?.parentElement
    if (!root) return
    const measure = () => {
      const base = root.getBoundingClientRect().top + window.scrollY
      const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-stem]'))
        .map((el) => el.getBoundingClientRect().top + window.scrollY - base + 64)
      setGeo({ height: root.scrollHeight, top: nodes[0] ?? 120, nodes })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  // Una sola escucha de scroll: dibuja el tallo, abre las hojas y publica --lp-p.
  useEffect(() => {
    const wrap = wrapRef.current
    const root = wrap?.parentElement
    if (!wrap || !root || geo.height === 0) return
    const leaves = Array.from(wrap.querySelectorAll<SVGElement>('.lp-stem-leaf'))
    const still = reducedMotion()
    let raf = 0

    const update = () => {
      raf = 0
      const y = window.scrollY + window.innerHeight * 0.65
      const drawn = still ? 1 : clamp01((y - geo.top) / Math.max(1, geo.height - geo.top))
      pathRef.current?.style.setProperty('stroke-dashoffset', String(1 - drawn))
      leaves.forEach((el, i) => el.classList.toggle('on', still || y >= geo.nodes[i]))
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      root.style.setProperty('--lp-p', clamp01(window.scrollY / max).toFixed(3))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [geo])

  return (
    <div ref={wrapRef} className="lp-stem" style={{ height: geo.height }} aria-hidden="true" data-testid="lp-stem">
      {geo.height > 0 && (
        <svg width={WIDTH} height={geo.height} viewBox={`0 0 ${WIDTH} ${geo.height}`} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="lp-stem-grad" gradientUnits="userSpaceOnUse" x1="0" y1={geo.top} x2="0" y2={geo.height}>
              <stop offset="0" stopColor="#5CC76C" />
              <stop offset="0.55" stopColor="#5CC76C" />
              <stop offset="1" stopColor="#D9A441" />
            </linearGradient>
          </defs>
          <path
            ref={pathRef}
            d={buildPath(geo.top, geo.height)}
            pathLength={1}
            fill="none"
            stroke="url(#lp-stem-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset="1"
            opacity="0.7"
          />
          {geo.nodes.map((y, i) => (
            <g key={i} transform={`translate(${X} ${y})`}>
              <circle r="3.5" fill="#0D110C" stroke={y / geo.height > 0.55 ? '#D9A441' : '#5CC76C'} strokeWidth="1.5" />
              <path
                className="lp-stem-leaf"
                style={{ ['--r' as string]: i % 2 === 0 ? '62deg' : '-62deg' }}
                d="M 0 0 C -5 -7, -5 -17, 0 -24 C 5 -17, 5 -7, 0 0 Z"
                fill={y / geo.height > 0.55 ? '#D9A441' : '#5CC76C'}
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}
