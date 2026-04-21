import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '@/constants/theme'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
  padding?: number
}

export default function Card({ children, style, padding = spacing.md }: Props) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
})
