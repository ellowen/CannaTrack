import { useState } from 'react'
import { useUserStore } from '@/store/userStore'
import { hapticSuccess, hapticLight } from '@/lib/haptics'

type Step = 'welcome' | 'name' | 'ready'

export default function Onboarding() {
  const { setName, setOnboarded } = useUserStore()
  const [step, setStep]       = useState<Step>('welcome')
  const [nameInput, setNameInput] = useState('')

  function goStep(next: Step) {
    hapticLight()
    setStep(next)
  }

  function handleFinish() {
    hapticSuccess()
    setName(nameInput.trim() || 'Cultivador')
    // Layout detecta el flag y navega a /plants/new
    localStorage.setItem('ct-redirect', '/plants/new')
    setOnboarded(true)
  }

  return (
    <div className="min-h-screen min-h-dvh bg-app-bg flex flex-col items-center justify-center px-6 py-12">

      {/* ── Step: Welcome ──────────────────────────────────────────────── */}
      {step === 'welcome' && (
        <div className="w-full max-w-sm text-center page-enter-up">
          <div className="text-8xl mb-6 select-none animate-bounce" style={{ animationDuration: '2s' }}>
            🌿
          </div>
          <h1 className="text-3xl font-black text-ink-1 mb-3 leading-tight">
            Bienvenido a<br />CannaTrack
          </h1>
          <p className="text-sm text-ink-3 leading-relaxed mb-10 max-w-[280px] mx-auto">
            Tu asistente para llevar el cultivo al día — riegos, nutrientes,
            EC&amp;pH y el calendario automático.
          </p>

          {/* Features rápidos */}
          <div className="space-y-3 mb-10 text-left">
            {[
              { icon: '📅', text: 'Calendario nutricional automático' },
              { icon: '💧', text: 'Recordatorios de riego y nutrición' },
              { icon: '🔬', text: 'Registro de EC y pH con tendencias' },
              { icon: '📷', text: 'Diario fotográfico semana a semana' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-app-card border border-app-border rounded-2xl px-4 py-3 shadow-card">
                <span className="text-xl shrink-0">{icon}</span>
                <span className="text-sm text-ink-2 font-medium">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => goStep('name')}
            className="w-full py-4 rounded-2xl bg-brand-400 text-white font-bold text-base shadow-glow-brand tap-highlight-none active:scale-[0.97] transition-all"
          >
            Empezar →
          </button>
        </div>
      )}

      {/* ── Step: Name ─────────────────────────────────────────────────── */}
      {step === 'name' && (
        <div className="w-full max-w-sm page-enter-up">
          <button
            onClick={() => goStep('welcome')}
            className="mb-8 text-ink-3 text-sm flex items-center gap-1.5 tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Atrás
          </button>

          <div className="text-5xl mb-5 select-none">👤</div>
          <h2 className="text-2xl font-black text-ink-1 mb-2">¿Cómo te llamás?</h2>
          <p className="text-sm text-ink-3 mb-8">
            Solo tu nombre o apodo — podés cambiarlo después.
          </p>

          <input
            type="text"
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && nameInput.trim() && goStep('ready')}
            placeholder="Ej: Lucas, El Profe, GrowMaster..."
            maxLength={30}
            className="w-full rounded-2xl border border-app-border bg-app-card text-ink-1 px-5 py-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border placeholder:text-ink-4 transition-colors mb-4"
          />

          <button
            onClick={() => goStep('ready')}
            disabled={!nameInput.trim()}
            className="w-full py-4 rounded-2xl bg-brand-400 text-white font-bold text-base shadow-glow-brand tap-highlight-none active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Continuar →
          </button>

          <button
            onClick={() => { setNameInput('Cultivador'); goStep('ready') }}
            className="w-full mt-3 text-sm text-ink-4 hover:text-ink-2 transition-colors tap-highlight-none py-2"
          >
            Saltar por ahora
          </button>
        </div>
      )}

      {/* ── Step: Ready ────────────────────────────────────────────────── */}
      {step === 'ready' && (
        <div className="w-full max-w-sm text-center page-enter-up">
          <div className="text-7xl mb-6 select-none">🚀</div>
          <h2 className="text-2xl font-black text-ink-1 mb-3">
            ¡Listo{nameInput.trim() ? `, ${nameInput.trim()}` : ''}!
          </h2>
          <p className="text-sm text-ink-3 leading-relaxed mb-10 max-w-[260px] mx-auto">
            Creá tu primera planta y generamos el calendario nutricional
            automáticamente.
          </p>

          <div className="bg-app-card border border-app-border rounded-2xl p-5 mb-8 text-left space-y-3 shadow-card">
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-2">En 30 segundos podés</p>
            {[
              '✓ Elegir tu genética y tabla nutricional',
              '✓ Ver el plan de riego semana a semana',
              '✓ Registrar EC y pH de cada riego',
            ].map((item) => (
              <p key={item} className="text-sm text-ink-2 font-medium">{item}</p>
            ))}
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-2xl bg-brand-400 text-white font-bold text-base shadow-glow-brand tap-highlight-none active:scale-[0.97] transition-all"
          >
            🌱 Crear primera planta
          </button>
        </div>
      )}
    </div>
  )
}
