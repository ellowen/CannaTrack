# CannaTrack — Flow Diagrams & State Management

## TASK COMPLETION FLOW

```
START (User on Home/PlantDetail)
  |
  v
[Dashboard Task Card] OR [PlantDetail Task Button]
  |
  ├─ Icon: 🍃 Nutrición
  ├─ Label: "Nutrición"
  ├─ Plant: "Planta A"
  └─ Button: [Hecho]
  |
  v
[User taps "Hecho" button]
  |
  ├─ Haptic: hapticLight() (10ms)
  ├─ State: setCompletingTask(task)
  └─ Animation: page-enter-up (300ms ease-out)
  |
  v
[CompleteTaskSheet Modal opens]
  |
  ├─ Header: 🍃 Nutrición completada ✓
  ├─ Cycle badge: V4 (or F3)
  ├─ Targets: EC 0.8–1.0 · pH 5.5–6.0
  |
  ├─ [If products exist]
  │  └─ Recipe section (collapsible)
  │     ├─ BIO · Nutrición Base · 2ml/L
  │     ├─ BIO · Calcio · 1ml/L
  │     └─ [Show for total pot volume]
  |
  ├─ [If nutrition/irrigation task]
  │  └─ Measurement section (EC/pH inputs)
  │     ├─ EC input: [1.2] ✓ Ideal
  │     │  ├─ Real-time validation
  │     │  ├─ Status: ok/warn/bad
  │     │  └─ Color feedback: green/amber/red
  │     └─ pH input: [6.2] ✓ Ideal
  │        └─ Same validation logic
  |
  ├─ Notes textarea
  │  ├─ Placeholder: "Observaciones..." (context-aware)
  │  ├─ Auto-focus: after 250ms delay
  │  └─ Max rows: 2 (no scroll)
  |
  └─ Button row
     ├─ [Saltar] (flex-1)
     │  └─ On click: handleConfirm(true) → skip measurements
     └─ [Guardar EC/pH ✓] (flex-2)
        └─ On click: handleConfirm(false) → save all data
  |
  v
[User fills measurements (optional)]
  |
  ├─ EC: User types 1.2
  │  └─ Real-time: ecStatus() → "ok" → label changes to "✓ Ideal"
  |
  ├─ pH: User types 6.2
  │  └─ Real-time: phStatus() → "ok" → label changes to "✓ Ideal"
  |
  └─ Notes: User types "Hoja levemente amarilla"
  |
  v
[User taps "Guardar EC/pH ✓" button]
  |
  ├─ Haptic: hapticSuccess() (200ms heavy)
  ├─ State: setXpReward(reward)
  ├─ Store: addMeasurement() [if EC/pH valid]
  ├─ Store: addXP(baseXP) → returns { xpGained, streakBonus, newStreak }
  ├─ Callback: onConfirm(taskId, notes)
  └─ Timer: setTimeout(onClose, 1400ms)
  |
  v
[XP Reward Overlay appears]
  |
  ├─ Timeline:
  │  ├─ 0ms: Overlay fade-in (xp-reward-in 300ms)
  │  ├─ 200ms: Checkmark bounces (animate-bounce-once 500ms)
  │  ├─ 300ms: "+15 XP" scales pop (xp-pop 200ms spring)
  │  ├─ 500ms: Bounce complete
  │  ├─ 1400ms: Overlay fade-out, modal closes
  │  └─ Total lifespan: 1.4s
  |
  ├─ Content (stacked):
  │  ├─ ✅ (checkmark emoji, bounces)
  │  ├─ "Tarea completada" (text, fades in with overlay)
  │  ├─ "+15 XP" (bold, green, scales pop)
  │  ├─ [If streakBonus > 0]
  │  │  └─ "🔥 Bonus de racha +5 XP" (amber, fades in)
  │  └─ [🔥] 5 días seguidos (badge in app-elevated bg)
  |
  └─ Blocking: Modal not dismissible during reward animation
  |
  v
[Modal closes after 1.4s]
  |
  ├─ State: completingTask = null
  ├─ Animation: fade-out + slide-down (150ms)
  └─ Sheet removed from DOM
  |
  v
[Task card updated in background]
  |
  ├─ If today's task:
  │  └─ Card moves to "Completadas" section
  │     ├─ Icon: ✅
  │     ├─ Badge: "1 completada"
  │     └─ Original task card removed from pending list
  |
  ├─ If other day's task:
  │  └─ Card grayed out in upcoming
  │     ├─ Opacity: 60%
  │     ├─ Text color: ink-4
  │     └─ No longer tappable
  |
  ├─ Home page updates:
  │  ├─ Streak counter: +1
  │  ├─ XP counter: +15 (or +10)
  │  ├─ Level progress: recalculated
  │  └─ "Pendientes" count: -1
  |
  └─ All done?
     └─ Today's section changes to "¡Todo al día! ✓"
  |
  v
END (Return to Home/PlantDetail view)
```

---

## PULL-TO-REFRESH FLOW

```
START (User on Home page, at top)
  |
  v
[User initiates touch]
  |
  ├─ Y position < 60px (top of list)
  └─ Attach handlers: onTouchStart, onTouchMove, onTouchEnd
  |
  v
[User drags down]
  |
  ├─ Calculate: pullProgress = (dy / 44px) → capped at 1.0
  ├─ Update state: pullProgress increases from 0 → 1
  |
  └─ Visual feedback (dynamic):
     ├─ Spinner circle appears above list
     ├─ Transform: rotate(pullProgress * 180deg)
     ├─ Opacity: pullProgress (0 → 1)
     └─ Position: marginTop -28px + marginBottom (pullProgress * 12px)
  |
  v
[User pulls past threshold (44px drag distance)]
  |
  ├─ pullProgress > 0.8 → ready to refresh
  ├─ Visual: Spinner fully opaque (opacity 1)
  └─ Spinner rotates 180° (half rotation)
  |
  v
[User releases touch (onTouchEnd)]
  |
  ├─ If pullProgress > 0.8:
  │  |
  │  ├─ Haptic: hapticSuccess() (200ms heavy)
  │  ├─ State: refreshing = true
  │  ├─ Spinner: Starts continuous rotation (animate-spin)
  │  │           Border-top becomes transparent
  │  |
  │  └─ Call: onRefresh()
  │     ├─ setRefreshKey((k) => k + 1)
  │     └─ Triggers re-calculation of "today"
  |
  └─ Else (pullProgress < 0.8):
     ├─ State: Reset pullProgress to 0
     ├─ Animation: Spinner fades out (300ms)
     └─ No refresh triggered
  |
  v
[Data fetch in progress]
  |
  ├─ Duration: Simulated 500ms (or actual network latency)
  ├─ Spinner: Continuous rotation loop
  └─ User can't dismiss (blocked by spinner state)
  |
  v
[Data fetch completes]
  |
  ├─ State: refreshing = false
  ├─ Spinner: Stops rotating
  ├─ Animation: Spinner fades out (300ms)
  ├─ Tasks: Re-rendered with fresh data
  └─ User: Can scroll again
  |
  v
END (Return to normal Home view)
```

**State variables:**
- `pullProgress: number` (0–1, indicates drag distance)
- `refreshing: boolean` (true while fetching, false after complete)

**Handlers:**
- `onTouchStart` — Record starting Y position
- `onTouchMove` — Calculate pullProgress, update visuals
- `onTouchEnd` — Check if refresh threshold met, trigger refresh if true
- `onRefresh` — Callback to refetch data

---

## WEEK VIEW DAY SELECTION FLOW

```
START (User on PlantDetail, viewing week calendar)
  |
  v
[Week View Calendar displayed]
  |
  ├─ Layout: 7 buttons in a row (L M X J V S D)
  ├─ Days: 21 22 23 24 25 26 27 (example)
  |
  └─ Day states:
     ├─ Today (23): Blue border, bold text, icon: •
     ├─ Completed (21, 22): Gray text, icon: ✓
     ├─ Pending (24–27): Regular text, icon: empty
     └─ Overdue (if any): Red text, icon: ⚠️
  |
  v
[User taps a day (e.g., "J 24")]
  |
  ├─ Haptic: hapticLight() (10ms)
  ├─ State: setSelectedDay(new Date(24))
  ├─ Animation: Scale press (active:scale-95, 150ms)
  |
  └─ Update button styling:
     ├─ Previous selected day: Remove highlight
     ├─ New selected day: Blue border + bg-app-card
     └─ Other days: Revert to default state
  |
  v
[Task list below updates]
  |
  ├─ Label changes: "⚡ HOY" → "JUE 24 DE ABR" (dynamic format)
  |
  ├─ Get tasks for selected day:
  │  └─ selectedDayTasks = getTasksForDate(tasks, selectedDay)
  |
  └─ Render tasks:
     ├─ 🍃 Nutrición (nutrition card)
     ├─ 💧 Riego (irrigation card)
     ├─ 🌫️ Foliar (foliar card)
     ├─ 🔍 Observación (observation)
     └─ [Buttons to mark each complete]
  |
  v
[Scroll animation]
  |
  ├─ Task cards: Fade + slide up (250ms ease-out)
  ├─ Container: Smooth scroll to tasks section
  └─ Layout: Tasks appear below week view (no tab change)
  |
  v
[User taps different day]
  |
  ├─ Previous selection: Deselected
  ├─ New selection: Highlighted
  └─ Tasks: Swap out, re-animate with fade
  |
  v
END (User can complete tasks for any selected day)
```

**State variables:**
- `selectedDay: Date` (current day in focus, may not be today)
- `selectedDayTasks: ScheduledTask[]` (filtered tasks for selected day)
- `isSelectedToday: boolean` (selectedDay === today)

**Key logic:**
```typescript
const isSelectedToday = selectedDay.toDateString() === today.toDateString()
const selectedDayTasks = isSelectedToday ? todayTasks : getTasksForDate(tasks, selectedDay)
```

---

## FLORA PHASE PICKER FLOW

```
START (User on PlantDetail, plant in vege stage)
  |
  v
[Check: needsFlora = awaitingFloraStart(plant)]
  |
  ├─ Condition: plant.floraStageDays ≥ 42 days AND plant.floraStartDate === null
  └─ Result: true → Show flora alert section
  |
  v
[Flora Alert Card displays]
  |
  ├─ Header:
  │  ├─ Icon: 🌸
  │  ├─ Title: "¡Vegetativo completado!"
  │  └─ Description: "Ya pasaron 6 semanas. ¿Cuándo iniciaste la floración?"
  |
  └─ Button row (closed state):
     ├─ [Hoy] (flex-1, secondary style)
     │  └─ On click:
     │     ├─ Haptic: hapticLight()
     │     ├─ Call: startFlora(plant.id, new Date())
     │     └─ Refresh view (plant updates to flora stage)
     |
     └─ [🌸 Elegir fecha] (flex-2, primary style)
        └─ On click:
           ├─ State: setFloraPickerOpen(true)
           └─ Card transitions to open state (200ms ease-out)
  |
  v
[User taps "🌸 Elegir fecha"]
  |
  ├─ State: floraPickerOpen = true
  ├─ Animation: Card expands, input fades in
  |
  v
[Flora Picker Card (open state)]
  |
  ├─ Title: "📅 Fecha de inicio de floración"
  |
  ├─ Date input:
  │  ├─ Type: date
  │  ├─ Value: floraDateInput (initially today's date)
  │  ├─ Constraints:
  │  │  └─ max={new Date().toISOString().slice(0, 10)} (no future dates)
  │  |
  │  └─ On change:
  │     └─ State: setFloraDateInput(e.target.value)
  |
  ├─ Helper text: "Podés backdatear si ya cambiaste el fotoperiodo."
  |
  └─ Button row (open state):
     ├─ [Cancelar] (flex-1, secondary)
     │  └─ On click:
     │     ├─ State: setFloraPickerOpen(false)
     │     └─ Card collapses (200ms)
     |
     └─ [🌸 Confirmar floración] (flex-2, primary)
        └─ On click:
           ├─ Parse date: const [y, m, d] = floraDateInput.split('-')
           ├─ Call: startFlora(plant.id, new Date(y, m - 1, d))
           ├─ State: setFloraPickerOpen(false)
           ├─ Haptic: hapticLight()
           |
           └─ Update plant state:
              ├─ plant.floraStartDate = selected date
              ├─ plant.cycle = 'flora'
              ├─ plant.currentWeek = 1 (start of flora)
              └─ All views re-render with flora styling
  |
  v
[Card collapses/closes]
  |
  ├─ Animation: Fade out (200ms)
  ├─ State: floraPickerOpen = false
  ├─ Input cleared: floraDateInput reset to today
  |
  v
END (Plant now in flora stage, calendar and tasks updated)
```

**Edge cases:**
- User selects date in the past (e.g., 1 week ago)
  → This allows backdating if phase change already happened
- User selects today but picker is already open
  → Just close picker, use selected date
- User never taps "Elegir fecha"
  → Alert stays visible, user can tap later

---

## MEASUREMENT INPUT & VALIDATION FLOW

```
START (User in CompleteTaskSheet, nutrition/irrigation task)
  |
  v
[Measurement section renders (EC/pH)]
  |
  ├─ Two input columns: EC and pH
  ├─ Labels: "EC" and "pH"
  ├─ Status display: (initially empty)
  |
  v
[User taps EC input field]
  |
  ├─ Keyboard: Numeric decimal (inputMode="decimal")
  ├─ Constraints: min=0, max=5, step=0.1
  ├─ Focus ring: 2px ring-brand-border, 300ms transition
  |
  v
[User types "1.2"]
  |
  ├─ State: setEc("1.2")
  ├─ Computed: const ecNum = parseFloat("1.2") → 1.2
  ├─ Validation: ecStatus() runs
  |
  └─ Status calculation:
     ├─ Check: task.ecMin (0.8) && task.ecMax (1.0)
     ├─ Compare: ecNum (1.2) vs range [0.8, 1.0]
     ├─ Distance: 1.2 - 1.0 = 0.2 (outside range by 0.2)
     |
     └─ Status result:
        ├─ If ecNum === 0.8 → 1.0: status = "ok"
        ├─ Else if distance < 0.3: status = "warn"
        ├─ Else: status = "bad"
        └─ In this case: status = "bad" (distance 0.2, not < 0.3... wait)
           └─ Actually: 1.2 - 1.0 = 0.2 < 0.3 → status = "warn"
  |
  v
[Label updates in real-time]
  |
  ├─ EC label element:
  │  ├─ Icon: ~ (warn icon)
  │  ├─ Status: "Cerca" (warn label)
  │  └─ Color: text-amber-500
  |
  └─ Visual: Field border remains app-border (not color-coded)
  |
  v
[User taps pH input field]
  |
  ├─ Similar flow as EC
  ├─ Keyboard: Numeric decimal
  ├─ Constraints: min=4, max=9, step=0.1
  |
  v
[User types "6.2"]
  |
  ├─ State: setPh("6.2")
  ├─ Computed: const phNum = parseFloat("6.2") → 6.2
  ├─ Validation: phStatus() runs
  |
  └─ Status calculation:
     ├─ Check: task.phMin (5.5) && task.phMax (6.0)
     ├─ Compare: phNum (6.2) vs range [5.5, 6.0]
     ├─ Distance: 6.2 - 6.0 = 0.2 < 0.3
     └─ Status: "warn" (close but outside)
  |
  v
[pH label updates]
  |
  ├─ Icon: ~ (warn icon)
  ├─ Status: "Cerca"
  └─ Color: text-amber-500
  |
  v
[User taps "Guardar EC/pH ✓"]
  |
  ├─ Check: const hasMeasure = !isNaN(ecNum) && ecNum > 0 && !isNaN(phNum) && phNum > 0
  │  └─ Result: true (both inputs valid)
  |
  ├─ Store: addMeasurement({ plantId, logDate: new Date(), ec: 1.2, ph: 6.2 })
  ├─ XP: const baseXP = XP.COMPLETE_WITH_MEASUREMENT (15 XP)
  ├─ Display: Button text: "Guardar EC/pH ✓"
  |
  └─ Confirm:
     ├─ Haptic: hapticSuccess()
     ├─ State: setXpReward(reward)
     ├─ Callback: onConfirm(taskId, notes)
     └─ Timer: setTimeout(onClose, 1400)
  |
  v
END (Task marked complete, measurements saved)
```

**Real-time validation logic:**
```typescript
function ecStatus() {
  if (!hasMeasure || !task?.ecMin) return null
  const distance = ecNum < task.ecMin
    ? task.ecMin - ecNum
    : ecNum > (task.ecMax ?? 99)
    ? ecNum - (task.ecMax ?? 99)
    : 0
  
  return distance === 0 ? 'ok'
       : distance < 0.3 ? 'warn'
       : 'bad'
}

const statusColors = { ok: 'text-brand-400', warn: 'text-amber-500', bad: 'text-red-500' }
const statusIcons  = { ok: '✓', warn: '~', bad: '✕' }
```

---

## HOME → PLANT DETAIL NAVIGATION FLOW

```
START (User on Home page)
  |
  v
[User taps PlantCard]
  |
  ├─ Tap target: Entire card (active:scale-[0.987])
  ├─ Haptic: None (just visual feedback)
  ├─ Navigation: navigate(`/plants/${plant.id}`)
  |
  v
[React Router transition]
  |
  ├─ Route change: / → /plants/:id
  ├─ Animation: Fade transition (default)
  └─ Component: PlantDetail mounts
  |
  v
[PlantDetail page loads]
  |
  ├─ Get plant: const plant = getPlantById(id)
  ├─ Check: if (!plant) → show "not found" message
  |
  ├─ Fetch derived data:
  │  ├─ currentWeek = getCurrentWeek(plant, today)
  │  ├─ cycleProgress = getCycleProgress(plant, today)
  │  ├─ harvestDate = getEstimatedHarvestDate(plant)
  │  ├─ health = calculatePlantHealth(tasks)
  │  └─ isFlora = currentWeek?.cycle === 'flora'
  |
  └─ Render components:
     ├─ Hero header
     │  ├─ Background: photo or gradient (based on isFlora)
     │  ├─ Buttons: [← Back] [Edit ✏️]
     │  └─ Info: Stage, name, genetics, days to harvest
     |
     ├─ Info chips (date, location, pot size)
     |
     ├─ Progress ring + health bar
     |
     ├─ Measurement section (EC/pH sparkline)
     |
     ├─ [If needsFlora] Flora alert section
     |
     ├─ Week view calendar
     |
     ├─ Task list (today or selected day)
     |
     ├─ Upcoming tasks
     |
     ├─ Diary section
     |
     └─ [✂️ Finalizar cultivo] button
  |
  v
[User interacts on PlantDetail]
  |
  ├─ Tap task "Marcar completada"
  │  └─ CompleteTaskSheet opens (same flow as Home)
  |
  ├─ Tap day in week view
  │  └─ selectedDay state updates, tasks filter
  |
  ├─ Tap "[← Back]"
  │  └─ navigate(-1) → return to Home
  |
  ├─ Tap "[Edit ✏️]"
  │  └─ navigate(`/plants/${plant.id}/edit`) → EditPlant page
  |
  └─ Tap "[✂️ Finalizar cultivo]"
     └─ setHarvestSheetOpen(true) → HarvestSheet modal opens
  |
  v
END
```

---

## STATE TRANSITIONS — HOME DASHBOARD

```
Home component state:

┌─ Plant list loaded ────────────────────────────────────┐
│                                                        │
│ Initial state:                                         │
│  plants: [ {id, name, genetics, ...}, ... ]           │
│  tasks: [ {id, plantId, type, ...}, ... ]             │
│  user: { name, streak, totalXP }                       │
│                                                        │
│ Derived state:                                         │
│  todayTasks = tasks.filter(t => t.scheduledDate === today)
│  overdueTasks = tasks.filter(t => t.scheduledDate < today && !t.completed)
│  pendingTasks = todayTasks.filter(t => !t.completed)  │
│  doneTasks = todayTasks.filter(t => t.completed)      │
│                                                        │
└────────────────────────────────────────────────────────┘

User action: Tap "Hecho" on task
  ↓
setCompletingTask(task)  [local state: completingTask = task]
  ↓
CompleteTaskSheet renders (modal overlay)
  ↓
User fills form + taps "Guardar EC/pH ✓"
  ↓
onConfirm(taskId, notes) callback
  ↓
completeTask(taskId, notes) [from taskStore]
  ↓
Task store updates:
  tasks[index].completed = true
  tasks[index].completedAt = now
  tasks[index].completionNotes = notes
  ↓
User store updates:
  userStore.addXP(15) → returns { xpGained, streakBonus, newStreak }
  userStore.streak += 1
  userStore.totalXP += 15
  ↓
Derived state recalculates:
  pendingTasks count -1
  doneTasks count +1
  levelInfo = getLevelInfo(totalXP)
  ↓
Component re-renders:
  Task card moved from "HOY" section to "Completadas" section
  Streak badge updated (+1)
  Level progress bar updated
  XP counter updated
  ↓
setCompletingTask(null)  [close sheet]
  ↓
Back to normal dashboard view
```

---

## ANIMATION TIMING DIAGRAM

```
Task Completion Flow (total 1.4s):

0ms ─┬─ Sheet: page-enter-up starts (fade + slide)
     │  Backdrop: lightbox-in starts (fade)
     │  Haptic: none yet
     │
100ms┤ Sheet + backdrop animations mid-way
     │
200ms┤ Sheet slides fully into view (300ms total)
     │ Backdrop fully opaque
     │ Haptic: hapticLight() (if user action)
     │
250ms┤ Textarea auto-focuses (and gains keyboard focus)
     │
300ms┼─ Sheet animation complete (page-enter-up done)
     │  Backdrop animation complete (lightbox-in done)
     │
(User fills form and taps confirm button)
     │
X00ms┤ Haptic: hapticSuccess() triggered
      │ XP Reward overlay: xp-reward-in starts (fade)
      │
X100ms┤ Overlay fade mid-way
      │
X200ms┤ Checkmark: animate-bounce-once starts (500ms)
      │ Checkmark at peak (translateY -16px)
      │ Text: "+15 XP" fades in fully
      │
X300ms┤ "+15 XP": xp-pop starts (scale pop 200ms)
      │ Scale animation: 0 → 1.2 → 1
      │
X400ms┤ Checkmark bounce continuing
      │ "+15 XP" scale pop complete
      │
X500ms┤ Checkmark bounce complete (animate-bounce-once done)
      │ All text visible and stable
      │
X700ms┤ Mid-way through reward lifespan
      │
X1400ms┤ Total 1.4s elapsed
       │ Overlay fades out (150ms)
       │ Sheet fades out (150ms)
       │ Modal closes
       │
X1550ms└─ Animation complete, back to normal view
```

---

**Last Updated:** 2026-04-23
**Diagram Version:** 1.0
**Tool:** ASCII Flow Diagrams
