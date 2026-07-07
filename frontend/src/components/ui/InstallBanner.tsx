import { useEffect, useState } from 'react'

// Tipo mínimo para el evento no-estándar
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // No mostrar si ya está instalada como PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Ya fue descartada
    if (localStorage.getItem('ct-install-dismissed')) return

    // Incrementar conteo de visitas
    const visits = parseInt(localStorage.getItem('ct-visits') ?? '0', 10) + 1
    localStorage.setItem('ct-visits', String(visits))

    // iOS Safari — el beforeinstallprompt no existe en iOS
    const ua = navigator.userAgent
    const isIosDevice = /iphone|ipad|ipod/i.test(ua)
    const isSafariBrowser = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
    if (isIosDevice && isSafariBrowser && visits >= 2) {
      setIsIos(true)
      setVisible(true)
    }

    // Android Chrome — capturar el evento estándar
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (visits >= 2) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem('ct-install-dismissed', '1')
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    dismiss()
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 max-w-lg mx-auto page-enter-up">
      <div className="bg-app-card border border-app-border rounded-2xl shadow-card-lg px-4 py-3.5 flex items-center gap-3">
        <span className="text-2xl shrink-0 select-none">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-1">Instalá CultiTrack</p>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            {isIos
              ? 'Tocá  compartir → "Agregar a pantalla de inicio"'
              : 'Guardala en tu pantalla de inicio para acceso rápido sin el browser'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isIos && (
            <button
              onClick={install}
              className="text-xs font-bold bg-brand-400 text-white px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all shadow-glow-brand"
            >
              Instalar
            </button>
          )}
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-4 hover:text-ink-2 tap-highlight-none active:scale-90 transition-all"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
