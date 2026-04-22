import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { isBiometricAvailable, hasSavedSession, restoreSessionWithBiometric, getBiometricLabel } from '@/lib/biometric'

export default function AuthScreen() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
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
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) Alert.alert('Error', error.message)
        // _layout.tsx onAuthStateChange (SIGNED_IN) se encarga del redirect
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) {
          Alert.alert('Error', error.message)
        } else if (!data.session) {
          // Supabase requiere confirmacion de email
          Alert.alert(
            'Revisa tu correo',
            'Te enviamos un link de confirmacion. Una vez confirmado, ingresa con tu cuenta.',
            [{ text: 'OK' }]
          )
        }
        // Si hay session (auto-confirm activado), _layout.tsx maneja el redirect
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometric() {
    setLoading(true)
    try {
      const ok = await restoreSessionWithBiometric()
      if (!ok) Alert.alert('Error', 'No se pudo autenticar')
      // Si ok, _layout.tsx detecta la sesion y redirige
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🌿</Text>
            <Text style={{ color: '#E4F2E7', fontSize: 32, fontWeight: '900' }}>CannaTrack</Text>
            <Text style={{ color: '#728C74', fontSize: 14, marginTop: 6 }}>
              {mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta gratis'}
            </Text>
          </View>

          {/* Inputs */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#3A5040"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E',
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
              color: '#E4F2E7', fontSize: 15, marginBottom: 12,
            }}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor="#3A5040"
            secureTextEntry
            style={{
              backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E',
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
              color: '#E4F2E7', fontSize: 15, marginBottom: 24,
            }}
          />

          {/* Boton principal */}
          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading || !email.trim() || !password}
            style={{
              backgroundColor: '#52CC64', borderRadius: 16,
              paddingVertical: 16, alignItems: 'center',
              opacity: (loading || !email.trim() || !password) ? 0.5 : 1,
              marginBottom: 12,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 16 }}>
                  {mode === 'login' ? 'Ingresar →' : 'Crear cuenta →'}
                </Text>
            }
          </TouchableOpacity>

          {/* Biometrico */}
          {showBiometric && mode === 'login' && (
            <TouchableOpacity
              onPress={handleBiometric}
              disabled={loading}
              style={{
                backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E',
                paddingVertical: 14, alignItems: 'center', marginBottom: 12,
              }}
            >
              <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 14 }}>
                🔐 {biometricLabel}
              </Text>
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
