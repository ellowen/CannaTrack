import { useState } from 'react'
import { useUserStore } from '@/store/userStore'
import { useAuth } from '@/contexts/AuthContext'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { supabase } from '@/lib/auth'
import { LogoMark } from '@/components/ui'

const STEPS: Step[] = ['welcome', 'name', 'ready']

const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: 'w-5 h-5' }

const FEATURES = [
  { text: 'Calendario nutricional automático', icon: <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg> },
  { text: 'Recordatorios de riego y nutrición', icon: <svg {...iconProps}><path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z" /></svg> },
  { text: 'Registro de EC y pH con tendencias', icon: <svg {...iconProps}><path d="M3 17l5-6 4 4 8-9" /></svg> },
  { text: 'Diario fotográfico semana a semana', icon: <svg {...iconProps}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg> },
]

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex justify-center gap-1.5 mb-10" aria-hidden="true">
      {STEPS.map((s) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-brand-400' : 'w-1.5 bg-app-border-strong'}`}
        />
      ))}
    </div>
  )
}

type Step = 'welcome' | 'name' | 'ready'

export default function Onboarding() {
  const { setName, setOnboarded } = useUserStore()
  const { user } = useAuth()
  const [step, setStep]       = useState<Step>('welcome')
  const [nameInput, setNameInput] = useState('')

  function goStep(next: Step) {
    hapticLight()
    setStep(next)
  }

  function handleFinish() {
    hapticSuccess()
    const trimmedName = nameInput.trim() || 'Cultivador'
    setName(trimmedName)
    // Sin esto, el nombre elegido en onboarding se pierde en el proximo
    // reload: AuthContext pisa userStore.name con profiles.username del
    // servidor (mismo problema y mismo fix que Settings.tsx handleSave).
    // Fire-and-forget (via .then) para no bloquear la transicion a
    // /plants/new -- el builder de supabase-js es lazy y no dispara el
    // fetch sin await/then.
    if (user) void supabase.from('profiles').update({ username: trimmedName }).eq('id', user.id).then(() => {})
    // Layout detecta el flag y navega a /plants/new
    localStorage.setItem('ct-redirect', '/plants/new')
    setOnboarded(true)
  }

  return (
    <div className="relative overflow-hidden min-h-screen min-h-dvh bg-app-bg flex flex-col items-center justify-center px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full opacity-60"
        style={{ background: 'radial-gradient(closest-side, var(--brand-400) 0%, transparent 70%)', filter: 'blur(60px)', opacity: 0.16 }}
      />
      <div className="relative w-full max-w-sm">
        <StepDots step={step} />

      {/* ── Step: Welcome ──────────────────────────────────────────────── */}
      {step === 'welcome' && (
        <div className="w-full max-w-sm text-center page-enter-up">
          <div className="flex justify-center mb-6">
            <LogoMark size={72} />
          </div>
          <h1 className="text-4xl text-ink-1 mb-3 leading-tight">
            Bienvenido a<br />CultiTrack
          </h1>
          <p className="text-sm text-ink-3 leading-relaxed mb-10 max-w-[280px] mx-auto">
            Tu asistente para llevar el cultivo al día — riegos, nutrientes,
            EC&amp;pH y el calendario automático.
          </p>

          {/* Features rápidos */}
          <div className="space-y-2 mb-10 text-left">
            {FEATURES.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-app-card border border-app-border rounded-2xl px-4 py-3">
                <span className="shrink-0 text-brand-400">{icon}</span>
                <span className="text-sm text-ink-2 font-medium">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => goStep('name')}
            className="w-full py-4 rounded-2xl bg-brand-400 text-brand-on font-bold text-base tap-highlight-none active:scale-[0.97] transition-all"
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

          <h2 className="text-3xl text-ink-1 mb-2">¿Cómo te llamás?</h2>
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
            className="w-full py-4 rounded-2xl bg-brand-400 text-brand-on font-bold text-base tap-highlight-none active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
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
          <div className="flex justify-center mb-6">
            <LogoMark size={72} />
          </div>
          <h2 className="text-3xl text-ink-1 mb-3">
            ¡Listo{nameInput.trim() ? `, ${nameInput.trim()}` : ''}!
          </h2>
          <p className="text-sm text-ink-3 leading-relaxed mb-10 max-w-[260px] mx-auto">
            Creá tu primera planta y generamos el calendario nutricional
            automáticamente.
          </p>

          <div className="bg-app-card border border-app-border rounded-2xl p-5 mb-8 text-left space-y-3">
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-2">En 30 segundos podés</p>
            {[
              'Elegir tu genética y tabla nutricional',
              'Ver el plan de riego semana a semana',
              'Registrar EC y pH de cada riego',
            ].map((item) => (
              <p key={item} className="text-sm text-ink-2 font-medium flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="w-4 h-4 shrink-0 text-brand-400" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {item}
              </p>
            ))}
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-2xl bg-brand-400 text-brand-on font-bold text-base tap-highlight-none active:scale-[0.97] transition-all"
          >
            Crear primera planta
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
