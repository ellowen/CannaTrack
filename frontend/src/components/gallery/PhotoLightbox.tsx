import { useEffect, useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import type { WeekLog } from '@/types/weekLog'

interface PhotoLightboxProps {
  photos: WeekLog[]           // solo entradas con photoDataUrl
  initialIndex: number
  onClose: () => void
  onEdit: (log: WeekLog) => void
}

const SWIPE_THRESHOLD = 60
const RUBBER_BAND_MAX = 80

export default function PhotoLightbox({ photos, initialIndex, onClose, onEdit }: PhotoLightboxProps) {
  const [index, setIndex]         = useState(initialIndex)
  const [infoVisible, setInfo]    = useState(true)
  const [slideDir, setSlideDir]   = useState<'left' | 'right' | null>(null)
  const [dragX, setDragX]         = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isDragging  = useRef(false)

  const current = photos[index]
  const isFlora = current.weekLabel.startsWith('FLORA')

  // ── Body scroll lock ──────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Keyboard navigation ───────────────────────────────────
  const goTo = useCallback((next: number, dir: 'left' | 'right') => {
    if (next < 0 || next >= photos.length) return
    setSlideDir(dir)
    setIndex(next)
    setTimeout(() => setSlideDir(null), 250)
  }, [photos.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowRight')  goTo(index + 1, 'left')
      if (e.key === 'ArrowLeft')   goTo(index - 1, 'right')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose, goTo])

  // ── Touch handlers ────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current  = false
    setDragX(0)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    // Si el movimiento es más vertical que horizontal, no interferir
    if (!isDragging.current && Math.abs(dy) > Math.abs(dx) + 5) {
      touchStartX.current = null
      return
    }

    isDragging.current = true
    // Rubber-band at edges
    const atStart = index === 0 && dx > 0
    const atEnd   = index === photos.length - 1 && dx < 0
    if (atStart || atEnd) {
      setDragX(dx * 0.25 > RUBBER_BAND_MAX ? RUBBER_BAND_MAX
        : dx * 0.25 < -RUBBER_BAND_MAX ? -RUBBER_BAND_MAX
        : dx * 0.25)
    } else {
      setDragX(dx)
    }
  }

  function handleTouchEnd() {
    if (!isDragging.current || touchStartX.current === null) {
      setDragX(0)
      return
    }
    if (dragX < -SWIPE_THRESHOLD)      goTo(index + 1, 'left')
    else if (dragX > SWIPE_THRESHOLD)  goTo(index - 1, 'right')
    touchStartX.current = null
    isDragging.current  = false
    setDragX(0)
  }

  // ── Slide animation class ─────────────────────────────────
  const slideClass = slideDir === 'left'  ? 'cal-slide-left'
                   : slideDir === 'right' ? 'cal-slide-right'
                   : ''

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black lightbox-in"
      style={{ touchAction: 'pan-y' }}
    >
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-black/70 to-transparent"
        style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white tap-highlight-none active:scale-90 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <span className="text-white/70 text-sm font-semibold tabular">
          {index + 1} / {photos.length}
        </span>

        <button
          onClick={() => { onClose(); onEdit(current) }}
          className="text-[13px] font-bold text-white bg-white/15 border border-white/20 px-3.5 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
        >
          Editar
        </button>
      </div>

      {/* ── Image area ──────────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setInfo((v) => !v)}
      >
        {/* Image */}
        <img
          key={current.id}
          src={current.photoDataUrl ?? current.photoUrl}
          alt={`Semana ${current.weekLabel}`}
          className={clsx(
            'max-w-full max-h-full object-contain select-none',
            slideClass,
            { 'transition-transform duration-75': isDragging.current }
          )}
          style={{
            transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          draggable={false}
        />

        {/* Left / right nav arrows — only on non-touch */}
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goTo(index - 1, 'right') }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white tap-highlight-none active:scale-90 transition-all hidden sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goTo(index + 1, 'left') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white tap-highlight-none active:scale-90 transition-all hidden sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Bottom info panel ───────────────────────────── */}
      <div
        className={clsx(
          'absolute bottom-0 inset-x-0 transition-all duration-300',
          infoVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        )}
      >
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mb-3">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i, i > index ? 'left' : 'right') }}
              className={clsx(
                'rounded-full transition-all duration-200 tap-highlight-none',
                i === index
                  ? 'w-4 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/40'
              )}
            />
          ))}
        </div>

        {/* Info card */}
        <div
          className="bg-black/70 backdrop-blur-md px-5 pt-4"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Week badge */}
              <span
                className="inline-block text-[11px] font-bold text-white px-2.5 py-1 rounded-full mb-2"
                style={{ background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)' }}
              >
                {current.weekLabel}
              </span>
              {/* Date */}
              <p className="text-white/60 text-[12px] font-medium mb-1.5 capitalize">
                {format(current.logDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </p>
              {/* Notes */}
              {current.notes ? (
                <p className="text-white/85 text-sm leading-relaxed line-clamp-3">
                  {current.notes}
                </p>
              ) : (
                <p className="text-white/35 text-sm italic">Sin notas</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
