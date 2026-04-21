import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius } from '@/constants/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: ViewStyle
}

export default function Button({ label, onPress, variant = 'primary', loading, disabled, fullWidth, style }: Props) {
  const containerStyle = {
    primary:   s.primary,
    secondary: s.secondary,
    ghost:     s.ghost,
    danger:    s.danger,
  }[variant]

  const textStyle = {
    primary:   s.primaryText,
    secondary: s.secondaryText,
    ghost:     s.ghostText,
    danger:    s.dangerText,
  }[variant]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.base, containerStyle, fullWidth && s.full, (disabled || loading) && s.dimmed, style]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.brand.green} size="small" />
        : <Text style={[s.label, textStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  base:          { borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  full:          { alignSelf: 'stretch' },
  dimmed:        { opacity: 0.5 },
  label:         { fontSize: 15, fontWeight: '700' },
  primary:       { backgroundColor: colors.brand.green },
  primaryText:   { color: '#ffffff' },
  secondary:     { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border.accent },
  secondaryText: { color: colors.text.brand },
  ghost:         { backgroundColor: 'transparent' },
  ghostText:     { color: colors.text.secondary },
  danger:        { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.status.error },
  dangerText:    { color: colors.status.error },
})
