import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { humanizeAuthError } from '@/lib/auth'
import { track } from '@/lib/analytics'
import { LogoMark } from '@/components/ui'

const PASSWORD_MIN_LENGTH = 8

function getPasswordStrength(password: string): { strength: 'weak' | 'medium' | 'strong'; message: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { strength: 'weak', message: `Minimo ${PASSWORD_MIN_LENGTH} caracteres` }
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { strength: 'medium', message: 'Agrega mayusculas y numeros' }
  }
  return { strength: 'strong', message: 'Contraseña fuerte' }
}

export default function SignUp() {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof getPasswordStrength>>({
    strength: 'weak',
    message: '',
  })

  const isPasswordValid = password === confirmPassword && passwordStrength.strength !== 'weak'
  const isFormValid = email && name && password && confirmPassword && isPasswordValid

  function handlePasswordChange(newPassword: string) {
    setPassword(newPassword)
    setPasswordStrength(getPasswordStrength(newPassword))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isFormValid) {
      setError('Por favor completa el formulario correctamente')
      return
    }

    setLoading(true)

    try {
      await signUp({ email: email.trim(), password, name: name.trim() })
      track('signup_completed')
      // Show confirmation message and redirect to login
      navigate('/login', {
        state: { message: 'Revisa tu correo para confirmar tu cuenta' },
        replace: true,
      })
    } catch (err) {
      setError(humanizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-block mb-4">
            <LogoMark size={64} />
          </Link>
          <h1 className="text-3xl text-ink-1">CultiTrack</h1>
          <p className="text-sm text-ink-3 mt-1">Crea tu cuenta gratis</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink-1 mb-2">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full px-4 py-3 bg-app-card border border-app-border rounded-lg text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-1 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              required
              className="w-full px-4 py-3 bg-app-card border border-app-border rounded-lg text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-1 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-12 bg-app-card border border-app-border rounded-lg text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <p className={`text-xs mt-2 ${passwordStrength.strength === 'strong' ? 'text-brand-text' : 'text-ink-3'}`}>
                {passwordStrength.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-1 mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-12 bg-app-card border border-app-border rounded-lg text-ink-1 placeholder:text-ink-4 focus:outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-2">Las contrasenas no coinciden</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full py-3 bg-brand-400 hover:brightness-110 text-brand-on font-bold rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
          </button>

          <p className="text-center text-ink-3 text-xs mt-3 leading-relaxed">
            Al crear una cuenta aceptás nuestros{' '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-brand-text underline">
              Términos
            </a>{' '}
            y nuestra{' '}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-brand-text underline">
              Política de Privacidad
            </a>.
          </p>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-app-border" />
          <span className="text-ink-4 text-xs">o</span>
          <div className="flex-1 h-px bg-app-border" />
        </div>

        {/* Google */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 bg-app-card hover:bg-app-elevated border border-app-border rounded-2xl text-ink-1 font-medium transition"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        {/* Login Link */}
        <p className="text-center text-ink-3 text-sm mt-5">
          Ya tenes cuenta?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-brand-text font-medium"
          >
            Ingresa
          </button>
        </p>
      </div>
    </div>
  )
}
