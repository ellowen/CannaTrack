import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'

// Colors
const COLORS = {
  bg: '#FFFFFF',
  border: '#E0E0E0',
  highlight: {
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#EF5350',
    none: 'transparent',
  },
  shadow: '#000000',
}

type Variant = 'default' | 'elevated' | 'outlined'
type Padding = 'sm' | 'md' | 'lg'
type Highlight = 'none' | 'success' | 'warning' | 'danger'

interface CardProps {
  variant?: Variant
  padding?: Padding
  highlight?: Highlight
  children: React.ReactNode
  style?: ViewStyle
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Variant: default
  defaultCard: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Variant: elevated
  elevatedCard: {
    backgroundColor: COLORS.bg,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Variant: outlined
  outlinedCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Padding: sm
  smPadding: {
    padding: 12,
  },
  // Padding: md
  mdPadding: {
    padding: 16,
  },
  // Padding: lg
  lgPadding: {
    padding: 20,
  },
  // Highlight
  successHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.highlight.success,
  },
  warningHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.highlight.warning,
  },
  dangerHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.highlight.danger,
  },
})

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  highlight = 'none',
  children,
  style,
  testID,
}) => {
  const variantStyle = {
    default: styles.defaultCard,
    elevated: styles.elevatedCard,
    outlined: styles.outlinedCard,
  }[variant]

  const paddingStyle = {
    sm: styles.smPadding,
    md: styles.mdPadding,
    lg: styles.lgPadding,
  }[padding]

  const highlightStyle = {
    none: {},
    success: styles.successHighlight,
    warning: styles.warningHighlight,
    danger: styles.dangerHighlight,
  }[highlight]

  return (
    <View
      style={[styles.container, variantStyle, paddingStyle, highlightStyle, style]}
      testID={testID}
    >
      {children}
    </View>
  )
}
