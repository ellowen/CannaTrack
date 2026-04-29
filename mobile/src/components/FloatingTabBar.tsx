import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { HomeIcon, PlantPotIcon, CalendarIcon, CameraIcon, ProfileIcon } from './icons/AppIcons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const TAB_COUNT = 5
const PILL_PADDING = 20           // horizontal padding of the floating bar
const BAR_WIDTH = SCREEN_WIDTH - PILL_PADDING * 2
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT

type TabName = 'index' | 'plants' | 'tasks' | 'diagnose' | 'profile'

const TAB_ICON: Record<TabName, React.FC<{ size: number; color: string; filled: boolean }>> = {
  index:    HomeIcon,
  plants:   PlantPotIcon,
  tasks:    CalendarIcon,
  diagnose: CameraIcon,
  profile:  ProfileIcon,
}

const TAB_LABEL: Record<TabName, string> = {
  index:    'Inicio',
  plants:   'Plantas',
  tasks:    'Agenda',
  diagnose: 'Camara',
  profile:  'Perfil',
}

// Active color per tab
const TAB_COLOR: Record<TabName, string> = {
  index:    '#52CC64',
  plants:   '#52CC64',
  tasks:    '#52CC64',
  diagnose: '#A78BFA',
  profile:  '#A78BFA',
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const slideAnim = useRef(new Animated.Value(0)).current
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current
  const fadeAnims  = useRef(state.routes.map(() => new Animated.Value(0))).current

  // Init: show active tab label
  useEffect(() => {
    fadeAnims[state.index].setValue(1)
  }, [])

  useEffect(() => {
    // Slide the indicator pill
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start()

    // Bounce the active icon, fade out others
    state.routes.forEach((_, i) => {
      if (i === state.index) {
        Animated.sequence([
          Animated.timing(scaleAnims[i], { toValue: 1.2, duration: 120, useNativeDriver: true }),
          Animated.spring(scaleAnims[i], { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
        ]).start()
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 180, useNativeDriver: true }).start()
      } else {
        Animated.timing(scaleAnims[i], { toValue: 1, duration: 150, useNativeDriver: true }).start()
        Animated.timing(fadeAnims[i], { toValue: 0, duration: 150, useNativeDriver: true }).start()
      }
    })
  }, [state.index])

  const activeRoute = state.routes[state.index]
  const activeTabName = activeRoute?.name as TabName
  const activeColor = TAB_COLOR[activeTabName] ?? '#52CC64'

  return (
    <View style={{
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 28 : 16,
      left: PILL_PADDING,
      right: PILL_PADDING,
      height: 64,
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 20,
    }}>
      {/* Bar background */}
      <LinearGradient
        colors={['rgba(13,20,14,0.98)', 'rgba(8,14,9,0.99)']}
        style={{
          flex: 1,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Sliding active indicator */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: TAB_WIDTH,
            borderRadius: 14,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <LinearGradient
            colors={
              activeTabName === 'diagnose' || activeTabName === 'profile'
                ? ['rgba(139,92,246,0.18)', 'rgba(109,40,217,0.12)']
                : ['rgba(82,204,100,0.18)', 'rgba(61,170,80,0.12)']
            }
            style={{
              flex: 1,
              borderRadius: 14,
              borderWidth: 1,
              borderColor:
                activeTabName === 'diagnose' || activeTabName === 'profile'
                  ? 'rgba(167,139,250,0.25)'
                  : 'rgba(82,204,100,0.25)',
            }}
          />
        </Animated.View>

        {/* Tabs */}
        {state.routes.map((route, index) => {
          const tabName = route.name as TabName
          const isFocused = state.index === index
          const color = isFocused ? (TAB_COLOR[tabName] ?? '#52CC64') : '#2D4A30'
          const IconComponent = TAB_ICON[tabName]

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          function onLongPress() {
            navigation.emit({ type: 'tabLongPress', target: route.key })
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              <Animated.View style={{
                alignItems: 'center',
                transform: [{ scale: scaleAnims[index] }],
              }}>
                {IconComponent && (
                  <IconComponent
                    size={22}
                    color={color}
                    filled={isFocused}
                  />
                )}
                {/* Label in same column as icon - no absolute positioning */}
                <Animated.Text style={{
                  color,
                  fontSize: 9,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                  marginTop: 3,
                  opacity: fadeAnims[index],
                  textTransform: 'uppercase',
                }}>
                  {TAB_LABEL[tabName]}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          )
        })}
      </LinearGradient>

      {/* Glow line at top of bar */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 30,
        right: 30,
        height: 1,
        backgroundColor: activeColor,
        opacity: 0.3,
        borderRadius: 1,
      }} />
    </View>
  )
}
