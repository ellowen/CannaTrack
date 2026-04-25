import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

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
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      // Show confirmation message and redirect to login
      navigate('/login', {
        state: { message: 'Revisa tu correo para confirmar tu cuenta' },
        replace: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-3xl font-bold text-green-100 mb-1">CannaTrack</h1>
          <p className="text-neutral-500">Crea tu cuenta gratis</p>
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
            <label htmlFor="name" className="block text-sm font-medium text-green-100 mb-2">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-green-100 placeholder-neutral-600 focus:outline-none focus:border-green-600"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-green-100 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-green-100 placeholder-neutral-600 focus:outline-none focus:border-green-600"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-green-100 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-green-100 placeholder-neutral-600 focus:outline-none focus:border-green-600"
            />
            {password && (
              <p className={`text-xs mt-2 ${passwordStrength.strength === 'strong' ? 'text-green-500' : 'text-neutral-500'}`}>
                {passwordStrength.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-green-100 mb-2">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-green-100 placeholder-neutral-600 focus:outline-none focus:border-green-600"
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-2">Las contrasenas no coinciden</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-neutral-950 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-neutral-500 text-sm">
          Ya tenes cuenta?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-green-600 hover:text-green-500 font-medium"
          >
            Ingresa
          </button>
        </p>
      </div>
    </div>
  )
}
