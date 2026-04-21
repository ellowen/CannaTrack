import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { signInWithGoogle } from '@/lib/google-auth'
import {
  isBiometricAvailable,
  getBiometricLabel,
  hasSavedSession,
  restoreSessionWithBiometric,
} from '@/lib/biometric'
import { colors, spacing, radius } from '@/constants/theme'

export default function AuthScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [biometricLabel, setBiometricLabel]     = useState<string | null>(null)
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable()
      const saved     = await hasSavedSession()
      if (available && saved) {
        const label = await getBiometricLabel()
        setBiometricLabel(label)
      }
    }
    checkBiometric()
  }, [])

  async function handleAuth() {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    try {
      const { error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password })
      if (error) Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) Alert.alert('Error', error)
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleBiometric() {
    setBiometricLoading(true)
    try {
      const session = await restoreSessionWithBiometric()
      if (!session) Alert.alert('Error', 'No se pudo verificar la identidad')
    } finally {
      setBiometricLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.container}>

        {/* Logo */}
        <View style={s.logoSection}>
          <Text style={s.logo}>🌿</Text>
          <Text style={s.appName}>CannaTrack</Text>
          <Text style={s.subtitle}>
            {mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta gratis'}
          </Text>
        </View>

        {/* Biometric shortcut */}
        {biometricLabel && mode === 'login' && (
          <TouchableOpacity
            onPress={handleBiometric}
            disabled={biometricLoading}
            style={s.biometricBtn}
          >
            {biometricLoading
              ? <ActivityIndicator color={colors.brand.green} size="small" />
              : <>
                  <Text style={s.biometricIcon}>
                    {biometricLabel === 'Face ID' ? '👤' : '👆'}
                  </Text>
                  <Text style={s.biometricText}>Entrar con {biometricLabel}</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* Divider */}
        {biometricLabel && mode === 'login' && (
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>o usa tu correo</Text>
            <View style={s.dividerLine} />
          </View>
        )}

        {/* Email */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.text.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={s.input}
        />

        {/* Password */}
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contrasena"
          placeholderTextColor={colors.text.muted}
          secureTextEntry
          style={[s.input, { marginBottom: spacing.lg }]}
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading || !email.trim() || !password.trim()}
          style={[s.primaryBtn, (loading || !email.trim() || !password.trim()) && { opacity: 0.5 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.primaryBtnText}>
                {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Text>
          }
        </TouchableOpacity>

        {/* Divider */}
        <View style={[s.divider, { marginVertical: spacing.md }]}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>o</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Google */}
        <TouchableOpacity
          onPress={handleGoogle}
          disabled={googleLoading}
          style={s.googleBtn}
        >
          {googleLoading
            ? <ActivityIndicator color={colors.text.primary} size="small" />
            : <>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleText}>Continuar con Google</Text>
              </>
          }
        </TouchableOpacity>

        {/* Toggle mode */}
        <TouchableOpacity
          onPress={() => setMode(m => m === 'login' ? 'register' : 'login')}
          style={{ marginTop: spacing.lg, alignItems: 'center' }}
        >
          <Text style={s.toggleText}>
            {mode === 'login'
              ? 'No tenes cuenta? Registrate'
              : 'Ya tenes cuenta? Ingresa'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg.primary },
  container:     { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  logoSection:   { alignItems: 'center', marginBottom: spacing.xl },
  logo:          { fontSize: 56, marginBottom: spacing.sm },
  appName:       { color: colors.text.primary, fontSize: 32, fontWeight: '900', marginBottom: spacing.xs },
  subtitle:      { color: colors.text.secondary, fontSize: 14 },

  biometricBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.elevated, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border.focus, paddingVertical: 16, marginBottom: spacing.md,
  },
  biometricIcon: { fontSize: 20 },
  biometricText: { color: colors.brand.green, fontWeight: '700', fontSize: 15 },

  divider:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  dividerLine:   { flex: 1, height: 1, backgroundColor: colors.border.default },
  dividerText:   { color: colors.text.muted, fontSize: 12 },

  input: {
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 14,
    color: colors.text.primary, fontSize: 15, marginBottom: spacing.sm,
  },

  primaryBtn:     { backgroundColor: colors.brand.green, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border.default, paddingVertical: 15,
  },
  googleIcon: { color: '#4285F4', fontWeight: '900', fontSize: 16 },
  googleText: { color: colors.text.primary, fontWeight: '600', fontSize: 15 },

  toggleText: { color: colors.text.secondary, fontSize: 13 },
})
