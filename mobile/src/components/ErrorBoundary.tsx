import { Component, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Updates from 'expo-updates'

interface Props {
  children: ReactNode
}

interface State {
  error:     Error | null
  errorInfo: string | null
}

/**
 * Captura errores JS no manejados en el arbol de componentes.
 * Muestra una pantalla de recuperacion en lugar de crashear la app.
 * En produccion reporta a Sentry via el wrapper de _layout.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ errorInfo: info.componentStack })
    // Sentry lo captura automaticamente via Sentry.wrap en _layout.tsx
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  handleReload = async () => {
    try {
      // Intentar OTA update y recargar
      const update = await Updates.checkForUpdateAsync()
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync()
        await Updates.reloadAsync()
        return
      }
    } catch {
      // Si falla el check de updates, recargar igual
    }
    await Updates.reloadAsync()
  }

  handleDismiss = () => {
    this.setState({ error: null, errorInfo: null })
  }

  render() {
    const { error, errorInfo } = this.state

    if (!error) return this.props.children

    const isDev = process.env.EXPO_PUBLIC_APP_ENV !== 'production'

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Icono */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 56 }}>🌿</Text>
          </View>

          {/* Titulo */}
          <Text style={{
            color: '#E4F2E7', fontSize: 22, fontWeight: '900',
            textAlign: 'center', marginBottom: 8,
          }}>
            Algo salio mal
          </Text>
          <Text style={{
            color: '#6D8C74', fontSize: 14, textAlign: 'center',
            lineHeight: 20, marginBottom: 32,
          }}>
            La app encontro un error inesperado.{'\n'}
            Tus datos estan seguros — recarga para continuar.
          </Text>

          {/* Acciones */}
          <TouchableOpacity
            onPress={this.handleReload}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#52CC64', borderRadius: 14,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
            }}
          >
            <Text style={{ color: '#080E09', fontSize: 15, fontWeight: '800' }}>
              Recargar app
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={this.handleDismiss}
            activeOpacity={0.7}
            style={{
              borderRadius: 14, paddingVertical: 15,
              alignItems: 'center', marginBottom: 32,
              borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)',
            }}
          >
            <Text style={{ color: '#52CC64', fontSize: 15, fontWeight: '700' }}>
              Intentar continuar
            </Text>
          </TouchableOpacity>

          {/* Stack trace en dev */}
          {isDev && (
            <View style={{
              backgroundColor: '#0C1A0E', borderRadius: 12,
              padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
            }}>
              <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                ERROR (solo visible en desarrollo)
              </Text>
              <Text style={{ color: '#F87171', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 }}>
                {error.message}
              </Text>
              {errorInfo && (
                <Text style={{
                  color: '#6D8C74', fontSize: 10, fontFamily: 'monospace',
                  lineHeight: 14, marginTop: 8,
                }}>
                  {errorInfo.trim().slice(0, 800)}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }
}
