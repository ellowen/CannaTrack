/**
 * CannaTrack Mobile — Interaction Implementation Reference
 * Copy-paste ready components for the 10 microinteractions
 *
 * Dependencies: react-native-reanimated@4.1.1, expo-haptics@55.0.14
 */

import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Animated, Dimensions,
  PanResponder, TextInput, Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import Gesture from 'react-native-gesture-handler'

// =============================================================================
// 1. SCROLL AFFORDANCE
// =============================================================================

/**
 * ScrollView wrapper with bottom gradient + animated chevron
 * Appears when content extends below viewport
 */
export function ScrollWithAffordance({ children, ...props }) {
  const [canScroll, setCanScroll] = useState(false)
  const chevronY = useSharedValue(0)
  const chevronOpacity = useSharedValue(0.7)

  useEffect(() => {
    if (canScroll) {
      chevronY.value = withRepeat(
        withTiming(12, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
        -1,
        true
      )
    }
  }, [canScroll])

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chevronY.value }],
    opacity: chevronOpacity.value,
  }))

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        {...props}
        onContentSizeChange={(w, h) => {
          setCanScroll(h > Dimensions.get('window').height * 0.8)
        }}
      >
        {children}
      </ScrollView>

      {/* Gradient overlay + chevron */}
      {canScroll && (
        <>
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              background: 'linear-gradient(to bottom, transparent, rgba(12,20,16,0.7))',
              pointerEvents: 'none',
            }}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 20,
                right: 16,
              },
              chevronStyle,
            ]}
          >
            <Text style={{ fontSize: 14, color: '#52CC64' }}>▼</Text>
          </Animated.View>
        </>
      )}
    </View>
  )
}

// =============================================================================
// 2. TASK COMPLETION — Pop & Checkmark
// =============================================================================

/**
 * Animated button with checkmark burst on press
 * Use within modal/sheet for task completion
 */
export function CompletionButton({ onPress, label = 'Confirmar ✓' }) {
  const checkmarkScale = useSharedValue(0)
  const checkmarkRotate = useSharedValue(0)
  const contentOpacity = useSharedValue(1)
  const [showCheckmark, setShowCheckmark] = useState(false)

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}

    setShowCheckmark(true)

    // Checkmark burst
    checkmarkScale.value = withSpring(1, {
      damping: 0.6,
      mass: 1.2,
      tension: 200,
      friction: 26,
    })
    checkmarkRotate.value = withTiming(360, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    })

    // Fade content
    contentOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 300 })
    )

    setTimeout(() => {
      onPress?.()
    }, 300)
  }

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkmarkScale.value },
      { rotateZ: `${checkmarkRotate.value}deg` },
    ],
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  return (
    <View style={{ position: 'relative' }}>
      {showCheckmark && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 100,
              marginLeft: -36, // half of fontSize (72) / 2
              marginTop: -36,
            },
            checkmarkStyle,
          ]}
        >
          <Text style={{ fontSize: 72, color: '#52CC64' }}>✓</Text>
        </Animated.View>
      )}

      <Animated.View style={contentStyle}>
        <TouchableOpacity
          onPress={handlePress}
          style={{
            flex: 2,
            backgroundColor: '#52CC64',
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 14 }}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

// =============================================================================
// 3. LOADING SKELETON
// =============================================================================

/**
 * Skeleton placeholder with shimmer animation
 * Show before data loads
 */
export function SkeletonCard() {
  const shimmerX = useSharedValue(0)

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(400, { duration: 2000, easing: Easing.linear }),
      -1
    )
  }, [])

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value - 200 }],
  }))

  return (
    <View
      style={{
        height: 120,
        backgroundColor: '#1C2E1E',
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          },
          shimmerStyle,
        ]}
      />
    </View>
  )
}

// =============================================================================
// 4. MODAL SWIPE-TO-DISMISS with Enhanced Feedback
// =============================================================================

/**
 * Enhanced swipe-to-dismiss with haptic checkpoints
 * Replace PanResponder in CompleteTaskSheet
 */
export function SwipeToDismissSheet({ visible, onClose, children }) {
  const SWIPE_THRESHOLD = 100
  const VELOCITY_THRESHOLD = 0.5

  const panY = useSharedValue(0)
  const handleScale = useSharedValue(1)
  const handleColor = useSharedValue(0) // 0 = gray, 1 = green
  const sheetOpacity = useSharedValue(1)
  const sheetScale = useSharedValue(1)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVerticalSwipe =
          Math.abs(gestureState.dy) > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        return isVerticalSwipe && gestureState.dy > 0
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.value = gestureState.dy
          handleScale.value = 1 + (Math.min(gestureState.dy, SWIPE_THRESHOLD) / SWIPE_THRESHOLD) * 0.2
          handleColor.value = Math.min(gestureState.dy / SWIPE_THRESHOLD, 1)

          // Haptic checkpoints
          if (gestureState.dy > 10 && gestureState.dy < 20) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            } catch {}
          }
          if (gestureState.dy > 50 && gestureState.dy < 60) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            } catch {}
          }
          if (gestureState.dy > SWIPE_THRESHOLD && gestureState.dy < SWIPE_THRESHOLD + 10) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            } catch {}
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const isFastSwipe = gestureState.vy > VELOCITY_THRESHOLD
        const passesThreshold = gestureState.dy > SWIPE_THRESHOLD

        if ((passesThreshold || isFastSwipe) && gestureState.dy > 0) {
          // Dismiss
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          } catch {}

          panY.value = withSpring(Dimensions.get('window').height, {
            damping: 0.7,
            mass: 1.0,
            tension: 120,
            friction: 20,
          })
          sheetScale.value = withSpring(0.95, {
            damping: 0.7,
            mass: 1.0,
            tension: 120,
            friction: 20,
          })
          sheetOpacity.value = withTiming(0, { duration: 350 })

          setTimeout(() => {
            onClose()
            panY.value = 0
            handleScale.value = 1
            handleColor.value = 0
            sheetOpacity.value = 1
            sheetScale.value = 1
          }, 350)
        } else {
          // Snap back
          panY.value = withSpring(0, { damping: 0.8, mass: 1.0, tension: 150 })
          handleScale.value = withSpring(1, { damping: 0.8 })
          handleColor.value = withSpring(0, { damping: 0.8 })
        }
      },
    })
  ).current

  const handleStyle = useAnimatedStyle(() => ({
    scaleX: handleScale.value,
    backgroundColor: interpolateColor(
      handleColor.value,
      [0, 1],
      ['#1C2E1E', '#52CC64']
    ),
  }))

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: panY.value },
      { scale: sheetScale.value },
    ],
    opacity: sheetOpacity.value,
  }))

  if (!visible) return null

  return (
    <Animated.View
      style={[
        {
          backgroundColor: '#131D14',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 20,
          paddingBottom: 40,
        },
        sheetStyle,
      ]}
      {...panResponder.panHandlers}
    >
      {/* Handle */}
      <Animated.View
        style={[
          {
            width: 40,
            height: 4,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 16,
          },
          handleStyle,
        ]}
      />

      {/* Content */}
      {children}
    </Animated.View>
  )
}

// =============================================================================
// 5. NAVIGATION TRANSITION (in app/_layout.tsx)
// =============================================================================

/**
 * Configure navigation stack with spring transitions
 * Add to root _layout.tsx
 */
export const navigationConfig = {
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        damping: 0.85,
        mass: 1.0,
        stiffness: 150,
        overshootClamping: false,
      },
    },
    close: {
      animation: 'spring',
      config: {
        damping: 0.8,
        mass: 1.0,
        stiffness: 150,
        overshootClamping: false,
      },
    },
  },
  cardStyleInterpolator: ({ current, next, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    }
  },
}

// =============================================================================
// 6. TAP TARGET WITH FEEDBACK
// =============================================================================

/**
 * Reusable button component with 44pt minimum + haptic feedback
 */
export function TapButton({
  onPress,
  children,
  style,
  disabled = false,
  ...props
}) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  const handlePressIn = async () => {
    if (disabled) return
    scale.value = withTiming(0.95, { duration: 100 })
    opacity.value = withTiming(0.85, { duration: 100 })
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 0.7, mass: 1.0 })
    opacity.value = withSpring(1, { damping: 0.7, mass: 1.0 })
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[{ minHeight: 44, minWidth: 44 }, animStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={10}
        disabled={disabled}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  )
}

// =============================================================================
// 7. PULL-TO-REFRESH (custom spinner)
// =============================================================================

/**
 * Custom refresh spinner with color shift based on pull distance
 */
export function PullRefreshSpinner({ pullDistance = 0, isRefreshing = false }) {
  const spinnerRotate = useSharedValue(0)
  const spinnerColor = useSharedValue(0)

  useEffect(() => {
    if (isRefreshing) {
      spinnerRotate.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1
      )
      spinnerColor.value = withTiming(1, { duration: 300 })
    } else {
      spinnerColor.value = 0
    }
  }, [isRefreshing])

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotate.value}deg` }],
    color: interpolateColor(
      spinnerColor.value,
      [0, 1],
      ['#728C74', '#52CC64']
    ),
  }))

  return (
    <Animated.Text
      style={[
        {
          fontSize: 20,
          textAlign: 'center',
          marginVertical: 20,
        },
        spinnerStyle,
      ]}
    >
      ⟳
    </Animated.Text>
  )
}

// =============================================================================
// 8. INPUT FIELD WITH FOCUS GLOW
// =============================================================================

/**
 * TextInput wrapper with focus glow + validation feedback
 */
export function GlowInput({
  value,
  onChangeText,
  placeholder,
  status = null, // 'ok' | 'warn' | 'bad' | null
  errorText = null,
  ...props
}) {
  const borderColor = useSharedValue('#1C2E1E')
  const backgroundColor = useSharedValue(0)

  const handleFocus = async () => {
    borderColor.value = withTiming('#52CC64', { duration: 200 })
    backgroundColor.value = withTiming(1, { duration: 200 })
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }

  const handleBlur = () => {
    borderColor.value = withTiming('#1C2E1E', { duration: 150 })
    backgroundColor.value = withTiming(0, { duration: 150 })
  }

  useEffect(() => {
    if (status === 'bad') {
      borderColor.value = withTiming('#EF4444', { duration: 300 })
      backgroundColor.value = withTiming(0.5, { duration: 300 })
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
    } else if (status === 'warn') {
      borderColor.value = withTiming('#F59E0B', { duration: 300 })
    } else if (status === 'ok') {
      borderColor.value = withTiming('#52CC64', { duration: 200 })
    }
  }, [status])

  const inputStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
    backgroundColor: interpolateColor(
      backgroundColor.value,
      [0, 1],
      ['transparent', 'rgba(82, 204, 100, 0.05)']
    ),
  }))

  const statusColor =
    status === 'ok' ? '#52CC64' : status === 'warn' ? '#F59E0B' : '#EF4444'

  return (
    <View>
      <Animated.View
        style={[
          {
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            overflow: 'hidden',
          },
          inputStyle,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#3A5040"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            color: '#E4F2E7',
            fontSize: 15,
          }}
          {...props}
        />
      </Animated.View>

      {status && (
        <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800', marginTop: 4 }}>
          {status === 'ok' ? '✓ Ideal' : status === 'warn' ? '∼ Cerca' : '✕ Fuera'}
        </Text>
      )}
      {errorText && (
        <Text style={{ color: '#EF4444', fontSize: 10, marginTop: 4 }}>
          {errorText}
        </Text>
      )}
    </View>
  )
}

// =============================================================================
// 9. LEVEL-UP CELEBRATION
// =============================================================================

/**
 * Level-up modal with confetti effect
 */
export function LevelUpModal({ visible, level, emoji, name, xpToNext, onDismiss }) {
  const containerScale = useSharedValue(0)
  const containerOpacity = useSharedValue(0)
  const emojiScale = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      } catch {}

      containerScale.value = withSpring(1, {
        damping: 0.6,
        mass: 1.2,
        tension: 200,
        friction: 26,
      })
      containerOpacity.value = withTiming(1, { duration: 400 })
      emojiScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(1.05, { duration: 800 })
        ),
        -1,
        true
      )

      setTimeout(() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } catch {}
      }, 300)

      setTimeout(() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        } catch {}
      }, 600)

      setTimeout(() => {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch {}
      }, 900)

      setTimeout(() => {
        containerScale.value = withTiming(1.2, { duration: 300 })
        containerOpacity.value = withTiming(0, { duration: 300 })
        setTimeout(onDismiss, 300)
      }, 2000)
    }
  }, [visible])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
    opacity: containerOpacity.value,
  }))

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }))

  if (!visible) return null

  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            padding: 24,
          },
          containerStyle,
        ]}
      >
        <Animated.Text
          style={[
            { fontSize: 64, marginBottom: 16 },
            emojiStyle,
          ]}
        >
          {emoji}
        </Animated.Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#52CC64', marginBottom: 4 }}>
          LEVEL UP
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#E4F2E7', marginBottom: 8 }}>
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: '#728C74' }}>
          Próximo: {xpToNext} XP
        </Text>
      </Animated.View>
    </View>
  )
}

// =============================================================================
// 10. EC/pH STATUS INDICATOR (already mostly in CompleteTaskSheet)
// =============================================================================

/**
 * Refined status feedback for EC/pH inputs
 * Use within measurement section of CompleteTaskSheet
 */
export function MeasurementInput({
  label,
  value,
  onChangeText,
  min,
  max,
  placeholder,
}) {
  const [status, setStatus] = useState(null)
  const [hasShownError, setHasShownError] = useState(false)

  const getStatus = (val) => {
    if (!val) return null
    const num = parseFloat(val)
    if (isNaN(num)) return null
    if (num >= min && num <= max) return 'ok'
    if (Math.abs(num - (num < min ? min : max)) < 0.3) return 'warn'
    return 'bad'
  }

  const handleChange = (text) => {
    const newStatus = getStatus(text)
    setStatus(newStatus)

    if (newStatus === 'bad' && !hasShownError) {
      setHasShownError(true)
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
    }

    onChangeText(text)
  }

  const statusColor =
    status === 'ok' ? '#52CC64' : status === 'warn' ? '#F59E0B' : '#EF4444'
  const statusIcon = status === 'ok' ? '✓' : status === 'warn' ? '∼' : '✕'
  const statusLabel = status === 'ok' ? 'Ideal' : status === 'warn' ? 'Cerca' : 'Fuera'

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
          {label}
        </Text>
        {status && (
          <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>
            {statusIcon} {statusLabel}
          </Text>
        )}
      </View>
      <View
        style={{
          backgroundColor: '#0C1410',
          borderWidth: 1,
          borderColor: statusColor || '#1C2E1E',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#3A5040"
          style={{ color: '#E4F2E7', fontSize: 15 }}
        />
      </View>
    </View>
  )
}

// =============================================================================
// SPRING ANIMATION CONFIG CONSTANTS
// =============================================================================

export const SPRING_BOUNCY = {
  damping: 0.6,
  mass: 1.2,
  tension: 200,
  friction: 26,
}

export const SPRING_SMOOTH = {
  damping: 0.8,
  mass: 1.0,
  tension: 150,
  friction: 20,
}

export const SPRING_CRISP = {
  damping: 0.7,
  mass: 1.0,
  tension: 120,
  friction: 20,
}
