import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, humanizeAuthError } from '@/lib/auth'
import { LogoMark } from '@/components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // resetPasswordForEmail de Supabase ya no revela si el email existe
      // (responde igual en ambos casos) -- un error aca es un problema
      // real (red, rate limit), no una pista de que el email no existe.
      await requestPasswordReset(email.trim())
      setSent(true)
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
          <p className="text-sm text-ink-3 mt-1">Recuperar contraseña</p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-brand-dim border border-brand-subtle rounded-2xl">
              <p className="text-ink-1 text-sm leading-relaxed">
                Si <strong>{email.trim()}</strong> está registrado, vas a recibir un email con instrucciones para restablecer tu contraseña.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block text-brand-400 font-semibold text-sm"
            >
              ← Volver a ingresar
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <p className="text-sm text-ink-3 mb-5 leading-relaxed">
              Ingresá el email de tu cuenta y te mandamos un link para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-2 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-app-border bg-app-card text-ink-1 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border placeholder:text-ink-4 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-4 rounded-2xl bg-brand-400 text-white font-bold text-base shadow-glow-brand tap-highlight-none active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperación →'}
              </button>
            </form>

            <p className="text-center text-ink-3 text-sm">
              <Link to="/login" className="text-brand-400 font-semibold">
                ← Volver a ingresar
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
