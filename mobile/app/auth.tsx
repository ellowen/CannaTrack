import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { signIn, signUp } from '@/lib/auth'
import { isBiometricAvailable, hasSavedSession, restoreSessionWithBiometric, getBiometricLabel } from '@/lib/biometric'

export default function AuthScreen() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [name, setName]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [mode, setMode]           = useState<'login' | 'register'>('login')
  const [showBiometric, setShowBiometric] = useState(false)
  const [biometricLabel, setBiometricLabel] = useState('Biometrico')

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable()
      const saved     = await hasSavedSession()
      if (available && saved) {
        setShowBiometric(true)
        setBiometricLabel(await getBiometricLabel())
      }
    }
    checkBiometric()
  }, [])

  async function handleAuth() {
    if (!email.trim() || !password) return
    if (mode === 'register' && !name.trim()) return

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn({ email: email.trim(), password })
      } else {
        await signUp({ email: email.trim(), password, name: name.trim() })
        Alert.alert(
          'Revisa tu correo',
          'Te enviamos un link de confirmacion. Una vez confirmado, ingresa con tu cuenta.',
          [{ text: 'OK' }]
        )
        setMode('login')
        setEmail('')
        setPassword('')
        setName('')
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Ocurrio un error')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometric() {
    setLoading(true)
    try {
      const ok = await restoreSessionWithBiometric()
      if (!ok) Alert.alert('Error', 'No se pudo autenticar')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!email.trim() && !!password && (mode === 'login' || !!name.trim())

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <LinearGradient
              colors={['#1A3D1E', '#0F2412']}
              style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#2A5A2E' }}
            >
              <Text style={{ fontSize: 44 }}>🌿</Text>
            </LinearGradient>
            <Text style={{ color: '#E4F2E7', fontSize: 32, fontWeight: '900' }}>CannaTrack</Text>
            <Text style={{ color: '#728C74', fontSize: 14, marginTop: 6 }}>
              {mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta gratis'}
            </Text>
          </View>

          {/* Campo nombre (solo registro) */}
          {mode === 'register' && (
            <LinearGradient
              colors={name ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#080E09']}
              style={{ borderRadius: 16, padding: 1, marginBottom: 12 }}
            >
              <View style={{ borderRadius: 15, borderWidth: 1, borderColor: name ? '#52CC64' : '#1C2E1E', overflow: 'hidden' }}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre"
                  placeholderTextColor="#3A5040"
                  autoCapitalize="words"
                  style={{
                    backgroundColor: 'transparent',
                    paddingHorizontal: 16, paddingVertical: 14,
                    color: '#E4F2E7', fontSize: 15,
                  }}
                />
              </View>
            </LinearGradient>
          )}

          {/* Campo email */}
          <LinearGradient
            colors={email ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#080E09']}
            style={{ borderRadius: 16, padding: 1, marginBottom: 12 }}
          >
            <View style={{ borderRadius: 15, borderWidth: 1, borderColor: email ? '#52CC64' : '#1C2E1E', overflow: 'hidden' }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#3A5040"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: 'transparent',
                  paddingHorizontal: 16, paddingVertical: 14,
                  color: '#E4F2E7', fontSize: 15,
                }}
              />
            </View>
          </LinearGradient>

          {/* Campo contrasena */}
          <LinearGradient
            colors={password ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#080E09']}
            style={{ borderRadius: 16, padding: 1, marginBottom: 24 }}
          >
            <View style={{ borderRadius: 15, borderWidth: 1, borderColor: password ? '#52CC64' : '#1C2E1E', overflow: 'hidden' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Contrasena"
                placeholderTextColor="#3A5040"
                secureTextEntry
                style={{
                  backgroundColor: 'transparent',
                  paddingHorizontal: 16, paddingVertical: 14,
                  color: '#E4F2E7', fontSize: 15,
                }}
              />
            </View>
          </LinearGradient>

          {/* Boton principal */}
          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading || !canSubmit}
            activeOpacity={0.85}
            style={{ marginBottom: 12, opacity: (loading || !canSubmit) ? 0.4 : 1 }}
          >
            <LinearGradient
              colors={['#52CC64', '#3DAA50']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
            >
              {loading
                ? <ActivityIndicator color="#080E09" />
                : <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 16 }}>
                    {mode === 'login' ? 'Ingresar ->' : 'Crear cuenta ->'}
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Biometrico */}
          {showBiometric && mode === 'login' && (
            <TouchableOpacity
              onPress={handleBiometric}
              disabled={loading}
              activeOpacity={0.85}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={['#1A3D1E', '#0F2412']}
                style={{ borderRadius: 16, borderWidth: 1, borderColor: '#2A5A2E', paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 14 }}>
                  🔐 {biometricLabel}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Toggle modo */}
          <TouchableOpacity
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#728C74', fontSize: 13 }}>
              {mode === 'login' ? 'No tenes cuenta? Registrate' : 'Ya tenes cuenta? Ingresa'}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
