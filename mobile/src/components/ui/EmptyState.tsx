import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing } from '@/constants/theme'
import { Button } from './Button'

interface Props {
  emoji?: string
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ emoji = '🌱', title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing.lg }}>
          <Button onPress={onAction}>{actionLabel}</Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
