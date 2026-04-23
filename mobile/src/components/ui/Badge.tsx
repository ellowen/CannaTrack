import React from 'react'
import { View, Text, StyleSheet, type ViewStyle } from 'react-native'

// Colors
const COLORS = {
  bg: {
    default: '#E0E0E0',
    success: '#E8F5E9',
    warning: '#FFF3E0',
    danger: '#FFEBEE',
    info: '#E3F2FD',
  },
  text: {
    default: '#616161',
    success: '#2E7D32',
    warning: '#E65100',
    danger: '#C62828',
    info: '#0D47A1',
  },
}

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md'

interface BadgeProps {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
  children: React.ReactNode
  style?: ViewStyle
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  // Size: sm
  smBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Size: md
  mdBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  // Variant: default
  defaultBadge: {
    backgroundColor: COLORS.bg.default,
  },
  // Variant: success
  successBadge: {
    backgroundColor: COLORS.bg.success,
  },
  // Variant: warning
  warningBadge: {
    backgroundColor: COLORS.bg.warning,
  },
  // Variant: danger
  dangerBadge: {
    backgroundColor: COLORS.bg.danger,
  },
  // Variant: info
  infoBadge: {
    backgroundColor: COLORS.bg.info,
  },
  // Text
  text: {
    fontWeight: '600',
  },
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 14,
  },
  // Icon spacing
  iconSpacing: {
    marginRight: 6,
  },
})

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  children,
  style,
  testID,
}) => {
  const variantStyle = {
    default: styles.defaultBadge,
    success: styles.successBadge,
    warning: styles.warningBadge,
    danger: styles.dangerBadge,
    info: styles.infoBadge,
  }[variant]

  const sizeStyle = {
    sm: styles.smBadge,
    md: styles.mdBadge,
  }[size]

  const textSize = {
    sm: styles.smText,
    md: styles.mdText,
  }[size]

  const textColor = {
    default: COLORS.text.default,
    success: COLORS.text.success,
    warning: COLORS.text.warning,
    danger: COLORS.text.danger,
    info: COLORS.text.info,
  }[variant]

  return (
    <View
      style={[styles.container, variantStyle, sizeStyle, style]}
      testID={testID}
    >
      {icon && <View style={styles.iconSpacing}>{icon}</View>}
      <Text style={[styles.text, textSize, { color: textColor }]}>
        {children}
      </Text>
    </View>
  )
}
