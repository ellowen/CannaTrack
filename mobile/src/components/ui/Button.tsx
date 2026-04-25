import React from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native'

// Colors
const COLORS = {
  primary: '#2D7C3D',
  primaryLight: '#4CAF50',
  secondary: '#7B68EE',
  danger: '#EF5350',
  ghost: 'transparent',
  text: {
    primary: '#FFFFFF',
    secondary: '#2D7C3D',
    danger: '#FFFFFF',
    ghost: '#2D7C3D',
  },
  border: {
    secondary: '#2D7C3D',
    ghost: '#E0E0E0',
  },
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
  onPress: () => void
  disabled?: boolean
  style?: ViewStyle
  testID?: string
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  // Variant: primary
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  // Variant: secondary
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.border.secondary,
  },
  // Variant: ghost
  ghostButton: {
    backgroundColor: COLORS.ghost,
    borderWidth: 1,
    borderColor: COLORS.border.ghost,
  },
  // Variant: danger
  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  // Size: sm
  smButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  // Size: md
  mdButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    width: '100%',
  },
  // Size: lg
  lgButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
    width: '100%',
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
  // Disabled
  disabledButton: {
    opacity: 0.5,
  },
  // Icon spacing
  iconSpacing: {
    marginRight: 8,
  },
})

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  onPress,
  disabled = false,
  style,
  testID,
}) => {
  const variantStyle = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    ghost: styles.ghostButton,
    danger: styles.dangerButton,
  }[variant]

  const sizeStyle = {
    sm: styles.smButton,
    md: styles.mdButton,
    lg: styles.lgButton,
  }[size]

  const textSize = {
    sm: styles.smText,
    md: styles.mdText,
    lg: styles.lgText,
  }[size]

  const textColor = {
    primary: COLORS.text.primary,
    secondary: COLORS.text.secondary,
    ghost: COLORS.text.ghost,
    danger: COLORS.text.danger,
  }[variant]

  const isDisabled = disabled || isLoading

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyle,
        sizeStyle,
        isDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} size={size === 'sm' ? 'small' : 'large'} />
      ) : (
        <>
          {icon && <View style={styles.iconSpacing}>{icon}</View>}
          <Text style={[styles.text, textSize, { color: textColor }]}>
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}
