import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function AuthScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [mode, setMode]         = useState<'login' | 'register'>('login')

  async function handleAuth() {
    if (!email || !password) return
    setLoading(true)
    try {
      const { error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

      if (error) Alert.alert('Error', error.message)
      else router.replace('/(tabs)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: '#E4F2E7', fontSize: 32, fontWeight: '900', marginBottom: 8 }}>
          CannaTrack
        </Text>
        <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 40 }}>
          {mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta gratis'}
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#3A5040"
          keyboardType="email-address"
          autoCapitalize="none"
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

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={{
            backgroundColor: '#52CC64', borderRadius: 16,
            paddingVertical: 16, alignItems: 'center',
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{ marginTop: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#728C74', fontSize: 13 }}>
            {mode === 'login' ? 'No tenes cuenta? Registrate' : 'Ya tenes cuenta? Ingresa'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
