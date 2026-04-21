import { View, Text, StyleSheet } from 'react-native'
import { colors, radius } from '@/constants/theme'

type Variant = 'vege' | 'flora' | 'harvest' | 'default'

interface Props {
  label: string
  variant?: Variant
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border: string }> = {
  vege:    { bg: '#0D2010', text: '#52CC64', border: '#1A3D1E' },
  flora:   { bg: '#1A0D2E', text: '#A855F7', border: '#3D1A5A' },
  harvest: { bg: '#2E0D0D', text: '#EF4444', border: '#5A1A1A' },
  default: { bg: colors.bg.elevated, text: colors.text.secondary, border: colors.border.default },
}

export default function Badge({ label, variant = 'default' }: Props) {
  const v = VARIANT_STYLES[variant]
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
})
