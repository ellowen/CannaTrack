import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, updatePassword, humanizeAuthError } from '@/lib/auth'
import { LogoMark } from '@/components/ui'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  // supabase-js con detectSessionInUrl:true procesa el token del link de
  // recuperacion de forma asincrona apenas carga la pagina -- sin esperar
  // a que termine, un submit inmediato fallaria con "sesion no encontrada".
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) setSessionReady(true)
      else setSessionError(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true)
        setSessionError(false)
      }
    })
    return () => {
      cancelled = true
      sub.subscription?.unsubscribe()
    }
  }, [])

  const passwordsMatch = password.length > 0 && password === confirmPassword
  const isFormValid = password.length >= 8 && passwordsMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid) return
    setError('')
    setLoading(true)

    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(humanizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-app-bg px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/landing" className="mb-4">
            <LogoMark size={64} />
          </Link>
          <h1 className="text-xl font-black text-ink-1">CultiTrack</h1>
          <p className="text-sm text-ink-3 mt-1">Elegí tu nueva contraseña</p>
        </div>

        {done ? (
          <div className="p-4 bg-brand-dim border border-brand-subtle rounded-2xl text-center">
            <p className="text-ink-1 text-sm">Contraseña actualizada. Redirigiendo...</p>
          </div>
        ) : sessionError ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-2xl">
              <p className="text-red-300 text-sm leading-relaxed">
                El link de recuperación venció o ya se usó. Pedí uno nuevo.
              </p>
            </div>
            <Link to="/forgot-password" className="inline-block text-brand-400 font-semibold text-sm">
              Pedir un nuevo link
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-2 mb-2">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  disabled={!sessionReady}
                  className="w-full rounded-2xl border border-app-border bg-app-card text-ink-1 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border placeholder:text-ink-4 transition-colors disabled:opacity-50"
                />
                <p className="text-xs text-ink-4 mt-1.5">Mínimo 8 caracteres</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-2 mb-2">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={!sessionReady}
                  className="w-full rounded-2xl border border-app-border bg-app-card text-ink-1 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border placeholder:text-ink-4 transition-colors disabled:opacity-50"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-400 mt-1.5">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!sessionReady || loading || !isFormValid}
                className="w-full py-4 rounded-2xl bg-brand-400 text-white font-bold text-base shadow-glow-brand tap-highlight-none active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {!sessionReady ? 'Verificando link...' : loading ? 'Guardando...' : 'Guardar contraseña →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
