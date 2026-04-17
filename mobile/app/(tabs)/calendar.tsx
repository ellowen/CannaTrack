import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function CalendarScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '700' }}>Calendario</Text>
      </View>
    </SafeAreaView>
  )
}
