# CannaTrack — Interaction & Animation Details

## TASK COMPLETION FLOW — Step-by-Step

### Step 1: User taps "Hecho" button on task card

**Location:** Home.tsx line 240–245 (PlantCard task row)
```jsx
<button
  onClick={() => { hapticLight(); setCompletingTask(task) }}
  className="shrink-0 text-xs font-bold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
>
  Hecho
</button>
```

**Behavior:**
- Haptic: `hapticLight()` (10ms light tap)
- State: `setCompletingTask(task)` opens the sheet
- Active state: `scale-95` (visual press feedback)
- Transition: 200ms (all properties)

**Timing:**
- Haptic feedback: 0ms (instant)
- Sheet animation start: 0ms (page-enter-up)
- Sheet fully visible: 300ms

---

### Step 2: CompleteTaskSheet modal appears

**Location:** frontend/src/components/tasks/CompleteTaskSheet.tsx

**Animation:** `page-enter-up` (300ms ease-out)
```css
.page-enter-up {
  animation: pageEnterUp 300ms ease-out forwards;
}

@keyframes pageEnterUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Backdrop:** `lightbox-in` (250ms fade)
```css
.lightbox-in {
  animation: lightboxIn 250ms ease-out forwards;
}

@keyframes lightboxIn {
  from { opacity: 0; backdrop-filter: none; }
  to { opacity: 1; backdrop-filter: blur(2px); }
}
```

**Focus:** Textarea receives focus after 250ms delay
```jsx
useEffect(() => {
  if (task) {
    setNotes(''); setEc(''); setPh(''; setRecipeOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 250)
  }
}, [task?.id])
```

**Sheet Content (Layout in viewport order):**

1. **Drag handle** (4×40px, app-border color, centered)
   - Visual indicator to swipe-to-dismiss
   - Tap: no action (decorative)

2. **Header section** (icon + title + badges)
   ```jsx
   <div className="flex items-center gap-3 mb-5">
     <span className="text-2xl">{icon}</span>
     <div>
       <p className="text-base font-black text-ink-1">{label} completada ✓</p>
       <div className="flex items-center gap-2 mt-0.5">
         <span className="text-[10px] font-bold px-2 py-0.5 rounded-full [cycle-color-badge]">
           {weekBadge}
         </span>
         {task.ecMin && (
           <span className="text-[10px] text-ink-4">
             Objetivo: EC {task.ecMin}–{task.ecMax} · pH {task.phMin}–{task.phMax}
           </span>
         )}
       </div>
     </div>
   </div>
   ```

3. **Recipe section** (collapsible, if products exist)
   - Toggle: click on label to expand/collapse
   - Chevron icon: rotates 180° (200ms transition)
   - Content: appears with `task-in` animation (fade + scale)
   - Shows dosages per pot volume

4. **Measurement section** (EC/pH inputs, if nutrition/irrigation task)
   - Two columns: EC input + pH input
   - Status feedback: color + icon + label
     - EC: ✓ Ideal / ~ Cerca / ✕ Fuera
     - pH: same
   - Real-time validation as user types

5. **Notes textarea**
   - Placeholder: context-aware ("Observaciones adicionales..." if measurements shown)
   - Rows: 2 (auto-expand not supported in this design)
   - Auto-focus: after 250ms delay
   - Max height: 80px (no scroll)

6. **Button row**
   - Left: "Saltar" (secondary, flex-1)
     - On click: `handleConfirm(true)` → skip measurements
     - No XP reward shown (baseXP = 0)
   - Right: "Guardar EC/pH ✓" (brand, flex-2)
     - Dynamic text based on state
     - On click: `handleConfirm(false)` → save with data
     - Triggers XP reward overlay

---

### Step 3: User enters measurements (optional)

**EC Input:**
```jsx
<input
  type="number"
  inputMode="decimal"
  step="0.1"
  min="0"
  max="5"
  value={ec}
  onChange={(e) => setEc(e.target.value)}
  placeholder="1.2"
  className="[styling for focused state with ring]"
/>
```

**Real-time validation:**
```typescript
const ecNum = parseFloat(ec)
const hasMeasure = !isNaN(ecNum) && ecNum > 0 && !isNaN(phNum) && phNum > 0

function ecStatus() {
  if (!hasMeasure || !task?.ecMin) return null
  return ecNum >= task.ecMin && ecNum <= (task.ecMax ?? 99)  ? 'ok'
       : Math.abs(ecNum - (ecNum < task.ecMin ? task.ecMin : task.ecMax ?? task.ecMin)) < 0.3 ? 'warn'
       : 'bad'
}
```

**Status colors:**
```javascript
const statusColors = { ok: 'text-brand-400', warn: 'text-amber-500', bad: 'text-red-500' }
const statusIcons  = { ok: '✓', warn: '~', bad: '✕' }
```

**Visual feedback (example):**
- EC 1.2 (if range 0.8–1.0) → `~ Cerca` (amber)
- EC 0.9 → `✓ Ideal` (green)
- EC 0.5 (outside range by >0.3) → `✕ Fuera` (red)

---

### Step 4: User taps "Guardar EC/pH ✓"

**Confirm handler:**
```typescript
function handleConfirm(skipAll = false) {
  if (!task) return
  hapticSuccess()  // Heavy haptic feedback (200ms)

  if (!skipAll && hasMeasure) {
    addMeasurement({ plantId: task.plantId, logDate: new Date(), ec: ecNum, ph: phNum })
  }

  const baseXP = !skipAll && hasMeasure ? XP.COMPLETE_WITH_MEASUREMENT : XP.COMPLETE_TASK
  const reward = addXP(baseXP)  // Returns { xpGained, streakBonus, newStreak }
  setXpReward(reward)

  onConfirm(task.id, skipAll ? undefined : (notes.trim() || undefined))

  // Close after showing XP reward
  setTimeout(onClose, 1400)
}
```

**XP calculation (from userStore):**
```typescript
const XP = {
  COMPLETE_TASK: 10,
  COMPLETE_WITH_MEASUREMENT: 15,
  STREAK_BONUS: 1,  // per day of streak
}

addXP(xpAmount) {
  const newTotalXP = totalXP + xpAmount
  const streakBonus = Math.floor(streak / 7) * STREAK_BONUS  // 7 days = +1 bonus
  const finalXP = xpAmount + streakBonus
  
  return {
    xpGained: xpAmount,
    streakBonus,
    newStreak: streak + 1
  }
}
```

**Haptic feedback:**
- Type: `hapticSuccess()` (200ms heavy impact)
- Triggers: sheet press, XP reward shows

---

### Step 5: XP Reward overlay displays

**Animation layers:**
1. **Backdrop:** Absolute overlay covers entire sheet (z-index 10)
   - Background: `bg-app-card`
   - Animation: `xp-reward-in` (fade 300ms)

2. **Content (vertical stack):**
   - **Checkmark emoji** `✅`
     - Animation: `animate-bounce-once` (500ms)
     - Transform: translateY -16px at 50%
   - **Title text** "Tarea completada"
     - Animation: fade in with overlay (300ms)
   - **XP gained** "+15 XP" or "+10 XP"
     - Class: `xp-pop` (scale bounce 200ms)
     - Animation: 0% scale(0) → 50% scale(1.2) → 100% scale(1)
     - Color: brand-400 (green)
   - **Streak bonus** (if applicable) "🔥 Bonus de racha +5 XP"
     - Animation: fade with overlay
     - Color: amber-500
   - **Streak badge** [🔥] 5 días seguidos
     - Background: app-elevated
     - Border: app-border
     - Animation: fade with overlay

**Timeline (ms):**
```
0ms    → overlay appears (fade in 300ms)
200ms  → checkmark bounces (peak at 250ms)
300ms  → "+15 XP" scales pop (0 → 1.2 → 1)
500ms  → checkmark bounce complete
1400ms → fade out, close sheet
```

**CSS for animations:**
```css
.xp-pop {
  animation: xpPop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes xpPop {
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bounce-once {
  animation: bounceOnce 500ms ease-out forwards;
}

@keyframes bounceOnce {
  0% { transform: translateY(0); }
  25% { transform: translateY(-8px); }
  50% { transform: translateY(-16px); }
  75% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}

.xp-reward-in {
  animation: xpRewardIn 300ms ease-out forwards;
}

@keyframes xpRewardIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

### Step 6: Sheet closes (after 1.4s)

**Close sequence:**
```typescript
setTimeout(onClose, 1400)  // 1.4s lifespan
```

**Animation:**
- Overlay + sheet fade out (150ms)
- Backdrop fade out (150ms)
- Sheet slides down (optional, not in current code)

**State after close:**
```
Home.tsx:
- task state: null
- completingTask → renders null
- Task card now shows as "completada" with checkmark badge
- If in same day, moves to "Completadas" section at bottom
- Streak count incremented if first task today
```

---

## PULL-TO-REFRESH INTERACTION

**Hook:** `usePullToRefresh` (Home.tsx line 46–47)

```typescript
const { containerRef, onTouchStart, onTouchMove, onTouchEnd, pullProgress, refreshing } =
  usePullToRefresh({ onRefresh: handleRefresh })
```

**Trigger:**
- Start: Touch down at top of list (y < 60px)
- Drag down: Pull progress increases (0 → 1 at 44px drag distance)
- Release: If progress > 0.8, trigger refresh
- Animation: Spinner rotates + opacity increases

**Visual feedback:**
```jsx
{(pullProgress > 0 || refreshing) && (
  <div
    className="flex justify-center transition-all duration-200"
    style={{ marginBottom: refreshing ? 12 : `${(pullProgress * 12)}px`, marginTop: -28 }}
  >
    <div className={`w-8 h-8 rounded-full border-2 border-brand-400 flex items-center justify-center transition-all ${
      refreshing ? 'animate-spin border-t-transparent' : ''
    }`}
      style={{ opacity: pullProgress, transform: `rotate(${pullProgress * 180}deg)` }}
    >
      {!refreshing && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-brand-400">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  </div>
)}
```

**Refresh handler:**
```typescript
const handleRefresh = useCallback(() => {
  hapticSuccess()  // Heavy haptic (200ms)
  setRefreshKey((k) => k + 1)  // Force recalculation of "today"
}, [])
```

**Timing:**
- Pull down animation: Fluid (follows touch, no delay)
- Refresh spinner: 300ms rotation loop
- Complete: 500ms (auto-close spinner after fetch)
- Haptic: success on release

---

## WEEK VIEW INTERACTION (PlantDetail)

**Component:** WeekView.tsx

```jsx
<WeekView
  tasks={tasks}
  weekStart={weekStart}
  today={today}
  selectedDate={selectedDay}
  onDayClick={(d) => setSelectedDay(d)}
/>
```

**Layout (7 days):**
```
L  M  X  J  V  S  D
21 22 23•24 25 26 27

[✓] [✓] [●] [✓] [ ] [ ] [ ]
(completed) (today) (pending)
```

**Day states:**
- **Today** (•): Highlighted border + bold text
- **Completed** (✓): Check icon, muted color
- **Pending** ( ): Empty circle
- **Overdue** (X): Red warning icon

**Interaction:**
- Tap day: `onDayClick(date)` → updates `selectedDay` state
- Selected day: Highlight changes, tasks scroll into view
- Animation: Scale 0.95 → 1.0 (150ms) on tap

```jsx
<button
  onClick={() => onDayClick(day)}
  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
    isSelected ? 'bg-app-card border border-brand-400' : 'hover:bg-app-elevated'
  } active:scale-95`}
>
  <span className="text-xs font-semibold">{formatDate(day)}</span>
  {getTaskStatus(day)} {/* Icon or check */}
</button>
```

---

## FLORA PHASE PICKER (PlantDetail)

**Trigger:** When `awaitingFloraStart(plant)` is true

**State:**
```typescript
const [floraPickerOpen, setFloraPickerOpen] = useState(false)
const [floraDateInput, setFloraDateInput] = useState(() => new Date().toISOString().slice(0, 10))
```

**Closed state (alert):**
```
🌸 ¡Vegetativo completado!
Ya pasaron las 6 semanas. ¿Cuándo iniciaste la floración?

[Hoy] [🌸 Elegir fecha]
```

**Buttons:**
- **"Hoy":** `startFlora(plant.id, new Date())`
  - Triggers immediately
  - Haptic: light feedback
  - Animation: Scale press (active:scale-95)

- **"🌸 Elegir fecha":** `setFloraPickerOpen(true)`
  - Opens date input
  - Transition: Expand 200ms ease-out

**Open state (date picker):**
```
📅 Fecha de inicio de floración
[date input field]
Podés backdatear si ya cambiaste el fotoperiodo.

[Cancelar] [🌸 Confirmar floración]
```

**Input details:**
```jsx
<input
  type="date"
  value={floraDateInput}
  max={new Date().toISOString().slice(0, 10)}  // Can't pick future dates
  onChange={(e) => setFloraDateInput(e.target.value)}
  className="w-full rounded-xl border border-flora-border bg-app-card text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-flora-border transition-colors shadow-card"
/>
```

**Confirm handler:**
```typescript
onClick={() => {
  const [y, m, d] = floraDateInput.split('-').map(Number)
  startFlora(plant.id, new Date(y, m - 1, d))
  setFloraPickerOpen(false)  // Close picker
  hapticLight()  // Light feedback
}}
```

**Animation:**
- Picker expand: 200ms ease-out, fade + scale
- Close: 150ms fade + slide up
- Confirmation: Haptic success + navigate or refresh view

---

## MEASUREMENT INPUT & VALIDATION

**Real-time feedback (EC/pH):**

```typescript
function ecStatus() {
  if (!hasMeasure || !task?.ecMin) return null
  const dist = ecNum < task.ecMin 
    ? task.ecMin - ecNum 
    : ecNum > (task.ecMax ?? 99)
    ? ecNum - (task.ecMax ?? 99)
    : 0
  
  return dist === 0 ? 'ok'
       : dist < 0.3 ? 'warn'
       : 'bad'
}
```

**Status display (label):**
```jsx
<span className={`font-bold ${statusColors[ec_st]}`}>
  {statusIcons[ec_st]} {ec_st === 'ok' ? 'Ideal' : ec_st === 'warn' ? 'Cerca' : 'Fuera'}
</span>
```

**Visual hierarchy:**
- Input width: 100% (column flex)
- Label: 12px, semibold, ink-2 color, flex between (label name + status on right)
- Input field: 20px font, bold, tabular numbers, center-aligned
- Focus ring: 2px ring-brand-border, 300ms transition

**Input constraints:**
- EC: min=0, max=5, step=0.1
- pH: min=4, max=9, step=0.1
- inputMode="decimal" (keyboard: numbers + decimal point)

---

## RESPONSIVE DESIGN — BREAKPOINTS

### Mobile (375px — iPhone SE)

- **Padding:** 16px (left/right), 20px bottom safe area
- **Card spacing:** 12px gap between sections
- **Font sizes:** H1 28px, H2 18px, body 14px, small 12px
- **Button height:** 44px minimum
- **Task cards:** Single column (100% width)
- **Plants grid:** Single column stacked

**Media query:**
```css
@media (max-width: 640px) {
  /* Mobile styles — default */
}
```

### Tablet (768px)

- **Padding:** 20px (left/right)
- **Max-width:** 90% (centered)
- **Plants grid:** 2 columns side-by-side
- **Task cards:** Inline row (icon + label + button)
- **Cards:** Wider padding (24px)

**Media query:**
```css
@media (min-width: 641px) and (max-width: 1024px) {
  .grid-plants { grid-template-columns: repeat(2, 1fr); }
  .task-row { display: flex; gap: 1rem; }
}
```

### Desktop (1280px+)

- **Padding:** 24px symmetric
- **Max-width:** 1200px centered
- **Layout:** 3-column (sidebar + main + week view)
- **Plants grid:** 2–3 columns
- **Task cards:** Horizontal row (icon | label | button | date)

**Media query:**
```css
@media (min-width: 1025px) {
  .layout-3col { display: grid; grid-template-columns: 200px 1fr 250px; gap: 2rem; }
  .grid-plants { grid-template-columns: repeat(3, 1fr); }
}
```

---

## ACCESSIBILITY REQUIREMENTS

### Touch Targets
- Minimum: 44×44px (iOS) / 48×48dp (Android)
- Safe zone: 8px padding around interactive elements
- Labels: Visible text (no hidden labels)

### Keyboard Navigation
- Tab order: Left-to-right, top-to-bottom
- Focus visible: 2px ring, brand-400 color, 200ms transition
- Escape key: Close modal/sheet
- Enter key: Submit forms/buttons

### Color Contrast
- Text on background: ≥7:1 (WCAG AAA)
- Link text: ≥4.5:1 (WCAG AA)
- Status icons: Color + icon (not color-only)

### Dark Mode
- All colors: CSS custom properties or Tailwind `dark:` prefix
- Backgrounds: white (light) / #1F1F1F (dark)
- Borders: #E5E5E5 (light) / #2A2A2A (dark)
- Text: #1A1A1A (light) / white (dark)

### Screen Reader Support
- Labels: `<label for="inputId">` or `aria-label`
- Buttons: Descriptive text (not just icons)
- Images: `alt` text or `role="presentation"` if decorative
- Landmarks: `<nav>`, `<main>`, `<section>` with `aria-label`

---

## ANIMATION PERFORMANCE

### GPU-accelerated properties
- Use: `transform`, `opacity` (hardware-accelerated)
- Avoid: `top`, `left`, `width`, `height` (force repaints)

**Good:**
```css
@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

**Bad (forces repaints):**
```css
@keyframes slideInBad {
  from { left: -100%; opacity: 0; }
  to { left: 0; opacity: 1; }
}
```

### Will-change declaration
```css
.xp-pop {
  will-change: transform, opacity;
  animation: xpPop 200ms cubic-bezier(...) forwards;
}
```

### Frame budget
- Target: 60fps (16.67ms per frame)
- Animations: Keep to 300ms or less for snappy feel
- Transitions: 200–500ms for smooth feel
- Avoid: Simultaneous animations (stagger by 50–100ms)

---

## TESTING CHECKLIST

### Visual Tests
- [ ] Mobile (375×812) — all screens
- [ ] Tablet (768×1024) — responsive layout
- [ ] Desktop (1280×800) — 3-col layout
- [ ] Dark mode — all screens
- [ ] Light mode — all screens

### Interaction Tests
- [ ] Pull-to-refresh: drag + haptic + spinner + refetch
- [ ] Task completion: sheet open → input → confirm → XP → close
- [ ] Flora date picker: open/close, backdating, submit
- [ ] Week view day selection: scroll tasks into view
- [ ] Navigation: back button, plant links, tab bar

### Accessibility Tests
- [ ] Keyboard only: Tab through all interactive elements
- [ ] Screen reader: NVDA/JAWS/VoiceOver reads labels
- [ ] Color contrast: aChecker passes AA level
- [ ] Focus visible: 2px ring on all focusable elements
- [ ] Dark mode: Readable text in both modes

### Performance Tests
- [ ] FCP <1.5s (mobile)
- [ ] LCP <2.5s (mobile)
- [ ] CLS <0.1
- [ ] No jank during animations (60fps)
- [ ] Sheet animation smooth (no frame drops)

---

**Last Updated:** 2026-04-23
**Design System Version:** 1.0
