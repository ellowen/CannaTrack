import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DiagnoseScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
        <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>Diagnose</Text>
        <Text style={{ color: '#728C74', fontSize: 14, marginTop: 8 }}>
          Placeholder para Semana 5
        </Text>
      </View>
    </SafeAreaView>
  )
}
