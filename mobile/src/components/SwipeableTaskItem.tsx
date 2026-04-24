import { useRef, useState } from 'react'
import { View, Text, PanResponder, Animated, Dimensions } from 'react-native'
import type { ScheduledTask } from '@shared/types/plant'

const { width } = Dimensions.get('window')
const SWIPE_THRESHOLD = width * 0.3 // Swipe 30% of width to complete

interface SwipeableTaskItemProps {
  task: ScheduledTask
  plantName: string
  onComplete: (taskId: string) => void
  children?: React.ReactNode
}

export function SwipeableTaskItem({
  task,
  plantName,
  onComplete,
  children,
}: SwipeableTaskItemProps) {
  const pan = useRef(new Animated.ValueXY()).current
  const [isCompleted, setIsCompleted] = useState(false)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !task.completed,
      onMoveShouldSetPanResponder: (evt, { dx }) => Math.abs(dx) > 10,
      onPanResponderMove: (evt, { dx }) => {
        if (dx > 0) {
          pan.x.setValue(dx)
        }
      },
      onPanResponderRelease: (evt, { dx, vx }) => {
        if (dx > SWIPE_THRESHOLD || vx > 1) {
          // Swipe completed
          setIsCompleted(true)
          Animated.timing(pan.x, {
            toValue: width,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onComplete(task.id)
          })
        } else {
          // Snap back
          Animated.spring(pan.x, {
            toValue: 0,
            useNativeDriver: false,
          }).start()
        }
      },
    })
  ).current

  if (isCompleted) return null

  return (
    <View style={{ overflow: 'hidden', flexDirection: 'row' }}>
      {/* Swipe background (complete action) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: '#0D2010',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 14,
        }}
      >
        <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>
          ✓ Hecho
        </Text>
      </View>

      {/* Swipeable item */}
      <Animated.View
        style={[{ transform: [{ translateX: pan.x }] }, { flex: 1 }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  )
}
