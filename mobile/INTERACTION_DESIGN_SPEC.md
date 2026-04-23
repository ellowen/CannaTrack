# CannaTrack Mobile — Interaction Design Specification

**Version:** 1.0 | **Date:** April 2026 | **Scope:** React Native + Expo (iOS/Android) + Web

---

## OVERVIEW

This specification defines 10 core microinteractions that transform CannaTrack from "stiff" to "delightful." Each pattern includes:
- **Trigger:** What causes the interaction
- **Visual Response:** Screen/element behavior
- **Haptic Feedback:** Mobile vibration patterns
- **Timing:** Animation duration & easing curves
- **Web Adaptation:** CSS equivalent (no haptics)
- **Reference:** iOS Mail, Reminders, Health patterns

Tech Stack: `react-native-reanimated@4.1.1`, `expo-haptics@55.0.14`, `PanResponder`, `Animated`

---

## 1. SCROLL AFFORDANCE — Content Below Indicator

**Problem:** User doesn't know there's more content to scroll.

### Trigger
- ScrollView contains content taller than viewport
- User reaches content that extends beyond visible area
- Initial load if content overflows

### Visual Response

#### Bottom Gradient Fade
```
- Bottom 60px: gradient overlay from transparent to 20% background opacity
- Color: rgba(12, 20, 16, 0.7) fading from transparent at 40px height
- Appears only when content extends beyond viewport
- Fade in: 300ms on mount/scroll detection
```

#### Scroll Indicator Arrow (iOS Reminders style)
```
- Single chevron "▼" at bottom-right, 16px from bottom-safe-area
- Color: #52CC64 (primary green)
- Size: 14pt
- Animation: pulse up/down (slide 12px ↕) every 2s
  - Duration: 800ms
  - Easing: easeInOut
  - Repeats forever while content below exists
- Tap on arrow: scrollTo(contentEnd)
```

#### Implementation (React Native)
```typescript
<ScrollView
  scrollIndicatorInsets={{ bottom: 50 }}
  onContentSizeChange={(w, h) => {
    // If contentHeight > viewportHeight, show affordance
    setCanScrollMore(h > scrollViewHeight)
  }}
>
  {/* content */}
  
  {canScrollMore && (
    <Animated.View style={{
      position: 'absolute',
      bottom: 20,
      right: 16,
      opacity: pulseAnim, // Reanimated: useSharedValue(1)
      transform: [{ translateY: translateYAnim }],
    }}>
      <Text style={{ fontSize: 14, color: '#52CC64' }}>▼</Text>
    </Animated.View>
  )}
</ScrollView>
```

#### Web Adaptation
```css
/* CSS gradient indicator at bottom of scrollable container */
.scroll-affordance::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(
    to bottom,
    rgba(12, 20, 16, 0),
    rgba(12, 20, 16, 0.7)
  );
  pointer-events: none;
}

/* Chevron pulse */
.scroll-chevron {
  animation: chevronPulse 2s ease-in-out infinite;
}
@keyframes chevronPulse {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(12px); opacity: 0.7; }
}
```

### Reference
- **iOS Reminders:** Gradient fade at list bottom, subtle chevron in Notes app
- **Apple Health:** Smooth scroll affordance with fading overlay

---

## 2. TASK COMPLETION — Satisfying Pop & Check Animation

**Problem:** User presses "Hecho ✓" → button disappears, but screen feels empty. No confirmation they succeeded.

### Trigger
- User taps "Hecho ✓" or "Confirmar ✓" button in CompleteTaskSheet
- Data saved to Supabase

### Visual Response

#### Stage 1: Button Press Feedback (immediate)
```
- Scale down: 1.0 → 0.92 (95ms, easeOut)
- Haptic: Medium impact (Haptics.impactAsync(ImpactFeedbackStyle.Medium))
- User sees button "compress" under their finger
```

#### Stage 2: Checkmark Burst (concurrent with stage 1)
```
- After button press, overlay a large animated checkmark (✓)
- Checkmark: fontSize 72, color #52CC64
- Path: slides up from button center 40pt + rotates (0° → 360°)
- Duration: 500ms
- Easing: spring(damping: 0.6, mass: 1.2, tension: 200, friction: 26)
- Scale: 0 → 1.2 → 1.0 (bounce on arrival)
```

#### Stage 3: Content Fade Down (parallel)
```
- Sheet content (inputs, recipe, etc.) fades out
- Duration: 300ms starting at 200ms offset
- Opacity: 1 → 0
- At completion: Show XP reward overlay (existing)
```

#### Implementation (React Native + Reanimated)
```typescript
// In CompleteTaskSheet.tsx
const checkmarkScale = useSharedValue(0)
const checkmarkRotate = useSharedValue(0)
const contentOpacity = useSharedValue(1)

function handleConfirm() {
  // 1. Button press
  runOnJS(Haptics.impactAsync)(ImpactFeedbackStyle.Medium)
  
  // 2. Checkmark animation
  checkmarkScale.value = withSpring(
    1,
    { damping: 0.6, mass: 1.2, tension: 200, friction: 26 }
  )
  checkmarkRotate.value = withTiming(360, { duration: 500, easing: Easing.inOut(Easing.cubic) })
  
  // 3. Content fade (delayed)
  contentOpacity.value = withDelay(
    200,
    withTiming(0, { duration: 300 })
  )
  
  // Then onComplete() and show XP reward
  runOnJS(onComplete)(...)
}

return (
  <View>
    {/* Checkmark overlay */}
    <Animated.View style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      zIndex: 100,
      transform: [
        { scale: checkmarkScale },
        { rotate: `${checkmarkRotate}deg` },
      ],
    }}>
      <Text style={{ fontSize: 72, color: '#52CC64' }}>✓</Text>
    </Animated.View>
    
    {/* Fading content */}
    <Animated.View style={{ opacity: contentOpacity }}>
      {/* form inputs, buttons, etc. */}
    </Animated.View>
  </View>
)
```

#### Web Adaptation
```css
.task-completion-button {
  transition: transform 95ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.task-completion-button:active {
  transform: scale(0.92);
}

@keyframes checkmarkPop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  70% {
    opacity: 1;
    transform: scale(1.2) rotate(360deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(360deg);
  }
}

.checkmark-overlay {
  animation: checkmarkPop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

### Reference
- **iOS Mail:** Checkmark animation when archiving email
- **Apple Reminders:** Bounce-in checkmark when completing task
- **Slack:** Similar task completion celebrations

---

## 3. LOADING STATE — Skeleton + Haptic Poll

**Problem:** Screen loads data but user doesn't know what's happening.

### Trigger
- Initial mount of plant list / task list
- Pull-to-refresh initiated
- Data fetch in progress

### Visual Response

#### Skeleton Placeholders
```
- Before data loads, show faded gray boxes mimicking final layout
- Skeleton color: #1C2E1E (background, 40% opacity)
- Height: match final element heights
- Border radius: match final design
- Number: show N skeletons (e.g., 3 plant cards if expecting 3 plants)
- Fade in: immediate
```

#### Animated Shimmer (optional, iOS style)
```
- Gradient sweep left-to-right over skeletons
- Gradient: transparent → rgba(255,255,255,0.1) → transparent
- Duration: 2s, repeats while loading
- Speed: 600px/s
```

#### Haptic Feedback
```
- On data start: none (avoid annoying users)
- On data complete: Light impact (ImpactFeedbackStyle.Light)
- On error: 2x Medium impact (fail pattern)
```

#### Loading Message
```
- Below skeleton: centered text, faded
- Text: "Cargando..." (neutral)
- Color: #728C74
- Font: 12pt, regular weight
- Appears after 400ms (avoid flash for fast loads)
```

#### Implementation (React Native)
```typescript
function HomeScreen() {
  const { plants, loading } = usePlants()
  
  if (loading) {
    return (
      <ScrollView>
        {/* Skeleton cards */}
        {[1,2,3].map(i => (
          <Animated.View
            key={i}
            style={{
              height: 120,
              backgroundColor: '#1C2E1E',
              borderRadius: 20,
              marginBottom: 12,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: shimmerOpacity, // Reanimated loop
              }}
            />
          </Animated.View>
        ))}
      </ScrollView>
    )
  }
  
  return <PlantListView plants={plants} />
}
```

#### Web Adaptation
```css
.skeleton {
  background: linear-gradient(
    90deg,
    #1c2e1e 0%,
    #2a3a2e 50%,
    #1c2e1e 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Reference
- **iOS Mail:** Skeleton rows while loading inbox
- **Apple Health:** Loading placeholders with shimmer
- **Figma:** Skeleton UI while loading files

---

## 4. MODAL SWIPE-TO-DISMISS — Spring + Haptic Release

**Problem:** Modal feels trapped. User expects swipe-down to close (iOS pattern), but it doesn't work.

### Trigger
- User appears to swipe down on modal sheet
- Already implemented in CompleteTaskSheet but needs refinement

### Visual Response (Current + Enhanced)

#### Current Implementation (Good)
```
- PanResponder.onMoveShouldSetPanResponder: triggers on vertical swipe
- PanResponder.onPanResponderMove: tracks translateY in real-time
- Parallel opacity fade (1 → 0.8) as user drags down
```

#### Enhanced Additions

##### 1. Handle Visual Feedback
```
- Handle element (4pt gray line at top) animates based on drag:
  - At rest: opacity 50%, height 4pt
  - Dragging: opacity increases to 100%, scale 1.2 horizontally
  - At threshold (100pt): color shift to #52CC64 (confirm color)
  - Duration: 0ms (real-time tracking)
```

##### 2. Haptic Checkpoints
```
- Drag start (10pt): light haptic buzz (ImpactFeedbackStyle.Light)
  - Signals "I'm tracking your swipe"
- At 50% threshold (50pt): medium impact
  - User knows they're halfway
- At 100% threshold (SWIPE_THRESHOLD): heavy impact
  - "If you release now, I'll close"
- Release to dismiss: pattern haptic (2x light + 1x heavy)
```

##### 3. Spring Animation on Dismiss
```
- When user swipes past threshold and releases:
  - Sheet accelerates downward (spring, not linear)
  - Duration: 350ms
  - Spring config: damping 0.7, mass 1.0, tension 120, friction 20
  - Scale: sheet shrinks slightly as it exits (scale 1.0 → 0.95)
  - Opacity: fades out (1 → 0) concurrent with exit
- Result: "flung down" feeling, not just slid off
```

##### 4. Swipe Threshold Visual
```
- At 50pt dragged: show subtle 1pt line 100pt below current position
- Line color: #52CC64, alpha 0.3
- Disappears if user releases before threshold
- Acts as "release point" indicator
```

#### Implementation (React Native + Reanimated)
```typescript
const panY = useSharedValue(0)
const handleScale = useSharedValue(1)
const handleColor = useSharedValue(0) // 0 = gray, 1 = green

const handlePanGesture = Gesture.Pan()
  .onUpdate(event => {
    const dy = event.translationY
    if (dy > 0) {
      panY.value = dy
      
      // Handle feedback
      handleScale.value = 1 + (Math.min(dy, SWIPE_THRESHOLD) / SWIPE_THRESHOLD) * 0.2
      handleColor.value = Math.min(dy / SWIPE_THRESHOLD, 1)
      
      // Haptic checkpoints
      if (dy > 10 && dy < 20) {
        runOnJS(Haptics.impactAsync)(ImpactFeedbackStyle.Light)
      }
      if (dy > 50 && dy < 60) {
        runOnJS(Haptics.impactAsync)(ImpactFeedbackStyle.Medium)
      }
      if (dy > SWIPE_THRESHOLD && dy < SWIPE_THRESHOLD + 10) {
        runOnJS(Haptics.impactAsync)(ImpactFeedbackStyle.Heavy)
      }
    }
  })
  .onEnd(event => {
    const isFastSwipe = event.velocityY > VELOCITY_THRESHOLD
    const passesThreshold = panY.value > SWIPE_THRESHOLD
    
    if ((passesThreshold || isFastSwipe) && event.translationY > 0) {
      // Dismiss with spring
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success) // 2x light + 1x heavy
      
      panY.value = withSpring(
        Dimensions.get('window').height,
        { damping: 0.7, mass: 1.0, tension: 120, friction: 20 }
      )
      sheetScale.value = withSpring(0.95, { ...springConfig })
      sheetOpacity.value = withTiming(0, { duration: 350 })
      
      runOnJS(onClose)()
    } else {
      // Snap back
      panY.value = withSpring(0, { damping: 0.8, mass: 1.0, tension: 150 })
      handleScale.value = withSpring(1, { damping: 0.8 })
      handleColor.value = withSpring(0, { damping: 0.8 })
    }
  })

const handleAnimStyle = useAnimatedStyle(() => ({
  scaleX: handleScale.value,
  backgroundColor: interpolateColor(
    handleColor.value,
    [0, 1],
    ['#1C2E1E', '#52CC64']
  ),
}))
```

#### Web Adaptation (Mouse Drag)
```javascript
// CSS for handle feedback
.sheet-handle {
  transition: all 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sheet-handle.dragging {
  transform: scaleX(1.2);
  background-color: #52cc64;
}

// JavaScript for drag gesture
const sheet = document.querySelector('[data-sheet]')
let dragStart = 0

sheet.addEventListener('mousedown', e => {
  dragStart = e.clientY
})

document.addEventListener('mousemove', e => {
  if (dragStart === 0) return
  const dy = e.clientY - dragStart
  if (dy > 0) {
    sheet.style.transform = `translateY(${dy}px)`
    sheet.style.opacity = Math.max(0.2, 1 - dy / 200)
  }
})

document.addEventListener('mouseup', e => {
  const dy = e.clientY - dragStart
  if (dy > 100) {
    sheet.style.animation = 'slideOut 350ms cubic-bezier(.34,1.56,.64,1) forwards'
    setTimeout(() => sheet.remove(), 350)
  } else {
    sheet.style.animation = 'slideBack 300ms cubic-bezier(.34,1.56,.64,1) forwards'
  }
  dragStart = 0
})
```

### Reference
- **iOS Mail:** Swipe down on email detail to pop back to inbox (satisfying spring)
- **Apple Maps:** Swipe down on place card to minimize
- **Stripe Payments:** Card details sheet, swipe-to-dismiss
- **Figma:** Design file panels, gestural dismissal

---

## 5. NAVIGATION TRANSITION — Momentum Spring

**Problem:** Screen transitions are instant. Feels "teleported" not "navigated".

### Trigger
- User taps navigation button (plant card, tab bar item, etc.)
- Router.push() executes

### Visual Response

#### Screen Entry (from right, iOS style)
```
- New screen slides in from right edge
- Entry animation: translateX: 200pt → 0
- Duration: 400ms
- Easing: spring(damping: 0.85, mass: 1.0, tension: 150, friction: 22)
- Parallel: opacity fade-in (0.7 → 1.0) over first 200ms
- Previous screen fades back slightly (opacity 1 → 0.95)
```

#### Screen Exit (to left)
```
- Swiped back or nav back button tapped
- Current screen slides out left: translateX: 0 → -200pt
- Duration: 350ms
- Easing: spring config (damping 0.8, mass 1.0)
- Previous screen (beneath) returns to opacity 1.0
```

#### Tab Navigation (cross-fade, no slide)
```
- When switching tabs (bottom tab bar):
  - Current tab content fades out (opacity 1 → 0), duration 150ms
  - New tab content fades in (opacity 0 → 1), duration 200ms, delayed 75ms
  - Result: subtle cross-dissolve, not intrusive slide
```

#### Gesture Interception (iOS swipe-back)
```
- User begins swiping from left edge while on detail screen
- Screen starts translating following finger (parallax)
- Black background behind begins peeking through (opacity increases)
- Release past 1/3 width: completes spring animation to exit
- Release before 1/3: snaps back with spring
```

#### Implementation (React Native + Expo Router)

Note: Expo Router handles routing, but transitions need customization:

```typescript
// In app/_layout.tsx or wrapped screen component
import { withLayoutContext } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          // Custom screen transitions via reanimated
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
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
              },
            },
          },
        }}
      >
        {/* Stack screens */}
      </Stack>
    </GestureHandlerRootView>
  )
}

// For tab navigation (lighter transition)
<Tabs
  screenOptions={{
    animationEnabled: true,
    // Tab fade cross-dissolve instead of slide
    // (Tabs library default is cross-fade, keep it)
  }}
/>
```

#### Web Adaptation
```css
/* Page transition (CSS) */
.page {
  animation: pageEnter 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.page.exiting {
  animation: pageExit 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes pageEnter {
  from {
    opacity: 0.7;
    transform: translateX(200px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pageExit {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-200px);
  }
}

/* Tab cross-fade */
.tab-content {
  animation: tabCrossFade 200ms ease-out forwards;
}
@keyframes tabCrossFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Reference
- **iOS Mail:** Slide-in detail view from right, spring momentum
- **Apple Settings:** Hierarchical navigation with spring transitions
- **Stripe Dashboard:** Detail screens enter with spring animation
- **Figma:** Project navigation, momentum-based transitions

---

## 6. TAP TARGET & FEEDBACK — Minimum 44pt + Visual Pulse

**Problem:** Buttons and touch areas are too small (<44pt), hard to hit on mobile.

### Trigger
- User approaches any interactive element
- On press/active state

### Visual Response

#### Minimum Touch Target
```
- All buttons, cards, tappable areas: minimum 44pt × 44pt (iOS standard)
- If label is smaller, add padding to reach 44pt
- Applies to: buttons, checkbox targets, card touch areas, tab items
- Invisible padding acceptable (touch hitSlop in RN)
```

#### Visual Feedback on Press
```
- On touchDown:
  - Scale: 1.0 → 0.95 (compress feel)
  - Opacity: 1.0 → 0.85 (darken/dim)
  - Duration: 100ms, easeOut
  - Haptic: Light impact (ImpactFeedbackStyle.Light)
  
- On touchUp:
  - Scale: 0.95 → 1.0 (spring back)
  - Opacity: 0.85 → 1.0 (restore)
  - Duration: 150ms, spring (damping 0.7)
```

#### Press State Styling
```
- Button active state: background lightens or darkens slightly
  - Example: "#0D2010" → "#1A3D1E" (for green button)
  - Text may brighten slightly (subtle)
```

#### Disabled State
```
- Disabled buttons: opacity 0.4, no active feedback
- No haptic on press
- Cursor: "not-allowed" (web)
```

#### Implementation (React Native)
```typescript
// Wrapper component for consistent tap feedback
export function TapButton({ onPress, children, style, ...props }) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))
  
  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPressIn={() => {
          scale.value = withTiming(0.95, { duration: 100 })
          opacity.value = withTiming(0.85, { duration: 100 })
          Haptics.impactAsync(ImpactFeedbackStyle.Light)
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 0.7 })
          opacity.value = withSpring(1, { damping: 0.7 })
        }}
        onPress={onPress}
        hitSlop={10} // 10pt extra padding for touch
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  )
}
```

#### Web Adaptation
```css
button, [role="button"], a.button-like {
  min-width: 44px;
  min-height: 44px;
  transition: all 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

button:active {
  transform: scale(0.95);
  opacity: 0.85;
}

button:active:after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: inherit;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Reference
- **iOS HIG:** Minimum 44×44pt touch targets
- **Apple Reminders:** Button feedback with scale + opacity
- **Stripe Payments:** Consistent button press animations
- **Material Design 3:** Touch targets minimum 48dp (~ same as 44pt)

---

## 7. PULL-TO-REFRESH — Haptic + Spinner + Color Shift

**Problem:** Refresh feels mechanical. No satisfying feedback.

### Trigger
- User pulls ScrollView down from top (>50pt)
- Refresh completes

### Visual Response

#### Pull Gesture Feedback
```
- As user pulls (0 → 120pt):
  - Spinner icon rotates (starts at -90°, spins with pull)
  - Spinner color shifts: #728C74 (gray) → #52CC64 (green)
  - At 60pt: haptic light pulse (once)
  - At 120pt: haptic medium pulse (once)
  - Label text changes: "Suelta para actualizar" at threshold
  
- Release at threshold:
  - Spinner accelerates spin (spring animation)
  - Label: "Actualizando..."
  - Haptic: medium impact confirmation
```

#### Refresh In Progress
```
- Spinner spins continuously (1 rotation per 1.2s)
- Color: #52CC64
- Size: 20pt
- Appear below header, above ScrollView content
- Opacity: 0.9
```

#### Refresh Complete
```
- Spinner → checkmark (✓) animation
- Scale checkmark in: 0 → 1.0 over 300ms (spring)
- Color: #52CC64
- Hold for 800ms then fade out
- Content below snaps to top with slight bounce (spring)
```

#### Implementation (React Native)
```typescript
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        Haptics.impactAsync(ImpactFeedbackStyle.Medium)
        
        Promise.all([refetchPlants(), refetchTasks()]).then(() => {
          setRefreshing(false)
          Haptics.notificationAsync(NotificationFeedbackType.Success)
        })
      }}
      tintColor="#52CC64"
      title="Actualizando..."
      titleColor="#728C74"
    />
  }
>
  {/* content */}
</ScrollView>

// For custom refresh (if default is insufficient):
const spinnerRotate = useSharedValue(0)
const spinnerColor = useSharedValue(0) // 0 = gray, 1 = green

useEffect(() => {
  if (refreshing) {
    spinnerRotate.value = withRepeat(
      withTiming(360, { duration: 1200 }),
      -1
    )
  }
}, [refreshing])
```

#### Web Adaptation
```css
.refresh-spinner {
  animation: spin 1.2s linear infinite;
  color: #52cc64;
  transition: color 300ms ease-out;
}

.refresh-container.pulling .refresh-spinner {
  color: #728c74;
  animation: none;
  transform: rotate(var(--pull-angle));
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Reference
- **iOS Mail:** Haptic + spinner color shift on pull
- **Twitter/X:** Pull spinner with smooth acceleration
- **Apple Health:** Checkmark completion after refresh

---

## 8. INPUT FIELD FOCUS — Glow + Haptic

**Problem:** Input fields don't give tactile feedback when focused.

### Trigger
- User taps input field or taps and begins typing
- Field receives focus

### Visual Response

#### Focus Entry
```
- Border color animates: #1C2E1E → #52CC64
- Border width: 1pt → 1.5pt (subtle thickening)
- Background: slight lighten (transparent → rgba(82, 204, 100, 0.05))
- Duration: 200ms, easeOut
- Haptic: light buzz (ImpactFeedbackStyle.Light)
- Cursor: visible and blinking (default)
```

#### Focus Exit (blur)
```
- Border color animates back: #52CC64 → #1C2E1E
- Border width: 1.5pt → 1pt
- Background: fade out (rgba(..., 0.05) → transparent)
- Duration: 150ms, easeOut
- Haptic: none (avoid excessive buzzing)
```

#### Error State (if validation fails)
```
- Border color shifts: #52CC64 → #EF4444
- Background: rgba(239, 68, 68, 0.08)
- Haptic: 2x light pulses (fail pattern)
- Duration: 300ms
- Error message appears below: color #EF4444, font 11pt
```

#### Typing Feedback (optional)
```
- Each character typed: very subtle scale pulse (1.0 → 1.01 → 1.0)
- Duration: 80ms
- This reinforces "input is being received"
```

#### Implementation (React Native)
```typescript
<Animated.View style={focusAnimStyle}>
  <TextInput
    onFocus={() => {
      borderColor.value = withTiming('#52CC64', { duration: 200 })
      backgroundColor.value = withTiming(
        'rgba(82, 204, 100, 0.05)',
        { duration: 200 }
      )
      Haptics.impactAsync(ImpactFeedbackStyle.Light)
    }}
    onBlur={() => {
      borderColor.value = withTiming('#1C2E1E', { duration: 150 })
      backgroundColor.value = withTiming('transparent', { duration: 150 })
    }}
    onChangeText={text => {
      setInputValue(text)
      // Optional: scale pulse on type
      scale.value = withSequence(
        withTiming(1.01, { duration: 40 }),
        withTiming(1, { duration: 40 })
      )
    }}
    style={[inp, { borderColor: borderColor, backgroundColor: backgroundColor }]}
  />
</Animated.View>
```

#### Web Adaptation
```css
input, textarea {
  border: 1px solid #1c2e1e;
  background: transparent;
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

input:focus, textarea:focus {
  border: 1.5px solid #52cc64;
  background: rgba(82, 204, 100, 0.05);
  outline: none;
  box-shadow: 0 0 0 3px rgba(82, 204, 100, 0.1);
}

input:invalid, textarea:invalid {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

input[aria-invalid="true"]::after {
  content: attr(data-error);
  color: #ef4444;
  font-size: 11px;
  margin-top: 4px;
  display: block;
}
```

### Reference
- **iOS Contacts:** Input focus glow with haptic
- **Apple Notes:** Subtle border color on focus
- **Figma:** Input field focus state with shadow

---

## 9. LEVEL-UP ACHIEVEMENT — Confetti + Bell + Haptic Pattern

**Problem:** User gains a level but barely notices. Achievement feels hollow.

### Trigger
- User's XP reaches next level threshold
- `getLevelInfo(xp).current.level !== previousLevel`

### Visual Response

#### Center Overlay Popup
```
- Modal appears centered, semi-transparent background
- Content:
  - Emoji for level (e.g., 🌱 → 🌿 → 🔥)
  - Text: "LEVEL UP" in bright color (e.g., #52CC64)
  - New level name (e.g., "Seedling" → "Grower")
  - Subtitle: "Next: [level name] in X XP"
```

#### Animation Sequence
```
Stage 1 (0–400ms): Entry burst
  - Content scale: 0 → 1.1 → 1.0 (spring overshoot)
  - Opacity: 0 → 1.0
  - Spring: damping 0.6, mass 1.0, tension 200
  - Parallel: background blur appears (0 → 0.5)

Stage 2 (400–900ms): Idle with pulse
  - Emoji bounces subtly (scale 1.0 ↕ 1.05 over 800ms)
  - Repeat until stage 3

Stage 3 (900–1200ms): Exit bounce
  - Content scale: 1.0 → 1.2 (bounce upward)
  - Opacity: 1.0 → 0 (fade out)
  - Rotate slightly: 0° → 5° (playful exit)
  - Duration: 300ms
```

#### Haptic Pattern (Celebration)
```
- Entry (0ms): heavy impact (ImpactFeedbackStyle.Heavy)
- At 300ms: light impact (intermediate celebration tick)
- At 600ms: medium impact (second tick)
- Exit (900ms): pattern notification (Success) = rapid light-light-heavy sequence
```

#### Confetti Effect (Optional, enhance)
```
- Small particles (circles, stars) fall from top
- Color palette: #52CC64, #C084FC, #FB923C (primary greens, purples, oranges)
- Duration: 2s
- Physics: gravity acceleration, slight wind drift
- Count: 20–30 particles
- Fade out during fall
```

#### Implementation (React Native)
```typescript
// In home screen or user store
const { levelInfo: newLevelInfo } = getLevelInfo(newXP)
if (newLevelInfo.current.level > previousLevel) {
  setShowLevelUp({
    level: newLevelInfo.current.level,
    name: newLevelInfo.current.name,
    emoji: newLevelInfo.current.emoji,
    xpToNext: newLevelInfo.next?.totalXP ?? 0,
  })
  
  Haptics.impactAsync(ImpactFeedbackStyle.Heavy)
  setTimeout(() => Haptics.impactAsync(ImpactFeedbackStyle.Light), 300)
  setTimeout(() => Haptics.impactAsync(ImpactFeedbackStyle.Medium), 600)
  setTimeout(() => Haptics.notificationAsync(NotificationFeedbackType.Success), 900)
}

// Modal content
{showLevelUp && (
  <Animated.View style={{
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...levelUpContainerStyle, // scale + opacity anim
  }}>
    <View style={{ alignItems: 'center' }}>
      <Animated.Text style={{
        fontSize: 64,
        marginBottom: 16,
        ...emojiPulseStyle, // scale pulse
      }}>
        {showLevelUp.emoji}
      </Animated.Text>
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#52CC64', marginBottom: 4 }}>
        LEVEL UP
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#E4F2E7', marginBottom: 8 }}>
        {showLevelUp.name}
      </Text>
      <Text style={{ fontSize: 12, color: '#728C74' }}>
        Próximo: {showLevelUp.xpToNext} XP
      </Text>
    </View>
  </Animated.View>
)}
```

#### Web Adaptation
```css
.level-up-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  animation: fadeIn 400ms ease-out;
}

.level-up-content {
  animation: levelUpBurst 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes levelUpBurst {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  70% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.level-emoji {
  animation: emojiBounce 800ms ease-in-out infinite;
}

@keyframes emojiBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### Reference
- **Apple Reminders:** Level achievements with celebration
- **Duolingo:** Level-up confetti + emoji celebration
- **Ring Fitness:** Achievement popups with haptic pattern
- **Pokémon GO:** Level-up screen with confetti

---

## 10. VISUAL HIERARCHY & COLOR FEEDBACK — EC/pH Status Indicator

**Problem:** Input field colors don't clearly indicate validation status.

### Trigger
- User types in EC or pH field
- Real-time validation occurs (in CompleteTaskSheet)

### Visual Response (Refined from current implementation)

#### OK State (Green)
```
- Border color: #52CC64
- Border width: 1.5pt (thicker than unfocused)
- Background: rgba(82, 204, 100, 0.05)
- Checkmark icon (✓): appears right of label, color #52CC64
- Haptic: none
```

#### WARNING State (Amber)
```
- Border color: #F59E0B
- Border width: 1.5pt
- Background: rgba(245, 158, 11, 0.05)
- Icon (∼): appears right of label, color #F59E0B
- Haptic: none (avoid annoying during typing)
```

#### ERROR State (Red)
```
- Border color: #EF4444
- Border width: 1.5pt
- Background: rgba(239, 68, 68, 0.08)
- Icon (✕): appears right of label, color #EF4444
- Haptic: light pulse on first error (once, not repeating)
- Error message below field: "Fuera de rango (min–max)" in red, 10pt
```

#### Transition Animation
```
- State changes (e.g., blur → good): duration 200ms, easeOut
- Border color lerp smoothly
- Background opacity animates
- Icon fades in/out: opacity 0 → 1 over 150ms
```

#### Implementation (React Native)
```typescript
// Already mostly implemented in CompleteTaskSheet.tsx
// Refinement: ensure haptic only fires once per input, not on every keystroke

const [ecWarnedOnce, setEcWarnedOnce] = useState(false)

const ecStatus = () => {
  if (!ec || isNaN(ecNum) || !t.ecMin) return null
  if (ecNum >= t.ecMin && ecNum <= (t.ecMax ?? 99)) return 'ok'
  if (Math.abs(ecNum - (ecNum < t.ecMin ? t.ecMin : t.ecMax ?? t.ecMin)) < 0.3) return 'warn'
  return 'bad'
}

const status = ecStatus()
if (status === 'bad' && !ecWarnedOnce) {
  Haptics.impactAsync(ImpactFeedbackStyle.Light)
  setEcWarnedOnce(true)
}

const statusColor = { ok: '#52CC64', warn: '#F59E0B', bad: '#EF4444' }
const statusIcon = { ok: '✓', warn: '~', bad: '✕' }

<TextInput
  style={[
    inp,
    status === 'ok' && { borderColor: '#52CC64', backgroundColor: 'rgba(82, 204, 100, 0.05)' },
    status === 'warn' && { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)' },
    status === 'bad' && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' },
  ]}
/>

{status && (
  <Text style={{ color: statusColor[status], fontSize: 10, fontWeight: '800', marginTop: 4 }}>
    {statusIcon[status]} {status === 'ok' ? 'Ideal' : status === 'warn' ? 'Cerca' : 'Fuera'}
  </Text>
)}
```

#### Web Adaptation
```css
input[data-status="ok"] {
  border-color: #52cc64;
  background: rgba(82, 204, 100, 0.05);
}

input[data-status="warn"] {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

input[data-status="bad"] {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.input-status {
  font-size: 10px;
  font-weight: 800;
  margin-top: 4px;
}

.input-status[data-status="ok"] { color: #52cc64; }
.input-status[data-status="warn"] { color: #f59e0b; }
.input-status[data-status="bad"] { color: #ef4444; }
```

### Reference
- **Stripe Payments:** Real-time card validation with color feedback
- **Apple Notes:** Status indicators on checklist items
- **Figma:** Form validation colors

---

## IMPLEMENTATION ROADMAP

### Phase 1 (Week 1–2): Core Completions & Modals
- [ ] Task completion checkmark pop (1.2)
- [ ] Modal swipe-to-dismiss + haptic (1.4)
- [ ] Tap target sizing audit (1.6)

### Phase 2 (Week 3–4): Navigation & Navigation
- [ ] Scroll affordance gradient + chevron (1.1)
- [ ] Navigation spring transitions (1.5)
- [ ] Pull-to-refresh haptic + color (1.7)

### Phase 3 (Week 5): Polish & Accessibility
- [ ] Input focus glow (1.8)
- [ ] Level-up celebration + confetti (1.9)
- [ ] EC/pH status refinement (1.10)
- [ ] Loading skeleton + shimmer (1.3)

### Phase 4 (Week 6+): Testing & Iteration
- [ ] iOS device testing (haptics, spring easing)
- [ ] Android compatibility pass (haptics may differ)
- [ ] Web responsiveness check
- [ ] Accessibility audit (motion, contrast, tap targets)

---

## TESTING CHECKLIST

### Mobile (iOS + Android)
- [ ] Haptic feedback timing and intensity on real device
- [ ] Spring animation easing matches iOS Mail/Reminders
- [ ] Scroll affordance visible on various screen sizes
- [ ] Modal drag threshold feels natural (100pt)
- [ ] Navigation transitions don't feel janky on low-end devices

### Web
- [ ] CSS animations render smoothly (60fps)
- [ ] No haptic errors thrown (try/catch already in place)
- [ ] Swipe fallback to mouse drag works
- [ ] Touch targets are clickable (44pt rule holds)
- [ ] Keyboard navigation still works (focus indicators)

### Accessibility
- [ ] `reduceMotion` media query respected (disable animations if enabled)
- [ ] Color contrast: all text > 4.5:1 WCAG AA
- [ ] Touch targets: all > 44×44pt
- [ ] Haptics don't impede usability (optional enhancement)

---

## COLOR PALETTE REFERENCE

```
Primary Green:  #52CC64 (OK states, positive actions)
Warn Amber:     #F59E0B (Warning, threshold)
Error Red:      #EF4444 (Errors, invalid states)
BG Dark:        #0C1410 (App background)
BG Light:       #131D14 (Cards, modals)
Border:         #1C2E1E (Default borders)
Text Primary:   #E4F2E7 (Main text)
Text Secondary: #728C74 (Labels, hints)
Text Muted:     #3A5040 (Disabled, secondary)
Flora Purple:   #C084FC (Flora cycle)
Vege Green:     #52CC64 (Vege cycle)
```

---

## SPRING ANIMATION CONSTANTS

Use these configs consistently across interactions:

```typescript
// Spring for bouncy, delightful interactions (level-up, completion)
export const SPRING_BOUNCY = {
  damping: 0.6,
  mass: 1.2,
  tension: 200,
  friction: 26,
}

// Spring for smooth, natural returns (buttons, inputs)
export const SPRING_SMOOTH = {
  damping: 0.8,
  mass: 1.0,
  tension: 150,
  friction: 20,
}

// Spring for crisp, responsive interactions (modal dismiss, nav)
export const SPRING_CRISP = {
  damping: 0.7,
  mass: 1.0,
  tension: 120,
  friction: 20,
}

// Timing for haptics and quick feedback
export const TIMING_QUICK = 100
export const TIMING_NORMAL = 200
export const TIMING_SLOW = 300
```

---

## NOTES & CAVEATS

1. **Haptics Availability:** `expo-haptics` works on iOS and Android (with vibration permission). Wrapped in try/catch throughout.
2. **Performance:** Reanimated 4.x is performant, but test on mid-range devices (Pixel 4, iPhone 11) for jank.
3. **Accessibility:** Test with `prefers-reduced-motion` media query—disable animations for users who prefer reduced motion.
4. **Web Responsiveness:** CSS animations may differ slightly from native. Test cross-browser (Chrome, Firefox, Safari).
5. **Testing:** Use Expo's `expo-dev-client` for live reload. Test on actual devices before shipping.

---

## SUMMARY TABLE

| Interaction | Duration | Spring Config | Haptic | Priority |
|---|---|---|---|---|
| Scroll affordance | Infinite loop (2s) | N/A | None | Medium |
| Task completion pop | 500ms | SPRING_BOUNCY | Medium impact → Success | High |
| Modal dismiss spring | 350ms | SPRING_CRISP | Light → Heavy → Success | High |
| Navigation slide | 400ms | SPRING_SMOOTH | None | High |
| Tap feedback | 100–150ms | SPRING_SMOOTH | Light impact | High |
| Level-up burst | 1200ms total | SPRING_BOUNCY | Heavy + pattern | Medium |
| Pull-to-refresh | Continuous | SPRING_SMOOTH | 2x Light + Medium | Medium |
| Input focus glow | 200ms | SPRING_SMOOTH | Light impact | Low |
| EC/pH status | 200ms | SPRING_SMOOTH | Light (error only) | Low |
| Loading skeleton | 2s loop | N/A | None | Low |

---

**Document Version:** 1.0  
**Last Updated:** April 23, 2026  
**Status:** Ready for implementation  
**Owner:** Interaction Design (Claude)
