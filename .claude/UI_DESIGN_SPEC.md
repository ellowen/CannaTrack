---
title: "CannaTrack UI/UX Specification"
subtitle: "Dashboard (Home) + PlantDetail + Task Completion Flow"
version: "1.0"
date: "2026-04-23"
---

# CannaTrack Visual + Interactive Specification

## DESIGN SYSTEM — BASE

**Colors:**
- Primary (brand): `#2D7C3D` (green, actions)
- Accent (flora): `#FF9800` (orange, flowering phase)
- Vege: `#4ADE80` (soft green)
- Flora: `#FF9500` (warm orange)
- Text ink-1: `#1A1A1A` (black)
- Text ink-3: `#666666` (medium gray)
- Text ink-4: `#999999` (light gray)
- Card bg: `#FFFFFF` (white, light mode) / `#1F1F1F` (dark mode)
- Border: `#E5E5E5` (light) / `#2A2A2A` (dark)
- Elevate: `#F5F5F5` (light) / `#252525` (dark)

**Typography:**
- Headings: -apple-system, SF Pro Display (bold, black 900)
- Body: -apple-system, SF Pro Text (regular 400, medium 500)
- Mono/Tabular: SF Mono (numbers, dosages)
- Sizes: H1 (32px), H2 (20px), H3 (16px), body (14px), small (12px), xs (10px)

**Spacing & Radii:**
- Grid: 4px base unit
- Padding: 8px, 12px, 16px, 20px, 24px
- Border radius: 12px (buttons), 16px (cards), 24px (containers)
- Safe area: bottom 20px (iPhone notch), left/right 16px

**Shadow:**
- Subtle: `0 1px 3px rgba(0,0,0,0.1)`
- Card: `0 2px 12px rgba(0,0,0,0.08)`
- Elevation: `0 4px 16px rgba(0,0,0,0.12)`

---

## 1. DASHBOARD (HOME) — COMPLETE WIREFRAME

### Viewport: iPhone SE (375×812) Mobile-first

```
┌─────────────────────────────────────────┐
│ ← Status Bar (16px top safe area)       │
├─────────────────────────────────────────┤
│ 16px margin                             │
│                                         │
│ MIÉRCOLES 23 DE ABRIL    [Streak badge]│
│ Buenos días, Ellowen    🔥 5 DÍAS      │
│                         border-amber   │
│ Cultivador Novato  [▓▓▓░░░] Principia  │
│ (XP progress bar to next level)         │
│                                         │
│ 24px gap ─────────────────────────────  │
│                                         │
│ ⚠️ VENCIDAS · 1                        │
│ ╔═════════════════════════════════════╗│
│ ║ 🍃 Nutrición              [Hecho]    ║│
│ ║ 19 abr · Planta A                    ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ⚡ HOY · 3 PENDIENTES                  │
│ ╔═════════════════════════════════════╗│
│ ║ [Plant A header — tappable]          ║│
│ ║ 🌿 Planta A          2 tareas →      ║│
│ ├─────────────────────────────────────┤│
│ ║ 💧 Riego              [Hecho]        ║│
│ ├─────────────────────────────────────┤│
│ ║ 🍃 Nutrición          [Hecho]        ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ [Plant B header — tappable]          ║│
│ ║ 🌿 Planta B          1 tarea →       ║│
│ ├─────────────────────────────────────┤│
│ ║ 🔍 Observación        [Hecho]        ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ 16px spacer ─────────────────────────  │
│ PLANTS · 2                             │
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ [Photo overlay or gradient]          ║│
│ ║ 🌱 (big emoji 30% opacity)          ║│
│ ║ VEGE S4                              ║│
│ ║ Planta A                            ║│
│ ║ Girl Scout Cookies                   ║│
│ ║ ───────────────────────────────────  ║│
│ ║ 🌱 S4 Prefloracion    8 días 🌸    ║│
│ ║ [Progress bar] 65%                   ║│
│ ║ Salud [green bar] 92%                ║│
│ ║ ✓ Al día                             ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ [Photo overlay or gradient — flora]  ║│
│ ║ 🌸 (big emoji 30% opacity)          ║│
│ ║ FLORA F3                             ║│
│ ║ Planta B                            ║│
│ ║ Blue Dream                           ║│
│ ║ ───────────────────────────────────  ║│
│ ║ 🌸 F3 Engorde          3 días 🌸   ║│
│ ║ [Progress bar] 85%                   ║│
│ ║ Salud [yellow bar] 78%               ║│
│ ║ ⚠️ 1 vencida                         ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ 16px · HISTORIAL · 1                  │
│ ╔═════════════════════════════════════╗│
│ ║ ✂️ Planta cosechada                 ║│
│ ║ Jack Herer               Cosechada   ║│
│ ║                          15 abr 26   ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ 20px safe area bottom ────────────────  │
├─────────────────────────────────────────┤
│ [Tab Bar]                               │
│ [🏠] [📅] [🎮] [⚙️]                     │
└─────────────────────────────────────────┘
```

---

### STATES — HOME/DASHBOARD

#### State: IDLE (default)
- All sections visible
- Cards interactive: `active:scale-[0.987]`
- Haptic feedback on tap: light (feedback)
- Gesture: swipe down to pull-to-refresh (shows spinner)

#### State: LOADING (pull-to-refresh)
```
Pull indicator animation — spinner rotates, grows opacity
[circular spinner icon — 8px radius, border 2px brand]
```
- Duration: 300ms easing
- Opacity: 0 → 1 as pull progress 0 → 1

#### State: EMPTY (no plants)
```
┌─────────────────────────────────────────┐
│ Header: "Buenos días, Ellowen"          │
│                                         │
│ 60px spacing                            │
│                                         │
│           🌱                            │
│        (large emoji)                    │
│                                         │
│ Tu grow empieza acá                     │
│                                         │
│ Registrá tu primera planta en           │
│ 30 segundos y generamos el              │
│ calendario automáticamente              │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ + Agregar primera planta │           ││
│ │  (action: navigate to /plants/new)   ││
│ └─────────────────────────────────────┘│
│                                         │
│ 60px spacing                            │
└─────────────────────────────────────────┘
```

#### State: ERROR (no tasks could load)
```
┌─────────────────────────────────────────┐
│ ⚠️ Hubo un error                        │
│ Intenta recargar                        │
│                                         │
│ [Reintentar] [Volver a inicio]          │
└─────────────────────────────────────────┘
```

---

### RESPONSIVE — Web (1280×800)

**Layout shifts:**
- Padding: 24px (left/right, symmetric)
- Grid columns: 2-col layout for plants (side-by-side)
- Task cards: inline row layout (3-col: icon, label, button)
- Max-width container: 1200px (center aligned)

**Wireframe (web):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    24px margin                                               │
│  Buenos días, Ellowen           [Streak 5 DÍAS 🔥]                          │
│  (header left)                  (header right)                               │
│  Cultivador Novato [progress bar]                                            │
│                                                                              │
│  ⚡ HOY · 3 PENDIENTES                                                       │
│  ┌────────────────────┬────────────────────────────────────────────────────┐│
│  │ Task icon label    │ Plant A (header)                                   ││
│  │ 💧 Riego · Hoy    │ 🌿 Planta A    2 tareas                            ││
│  │ 🍃 Nutrición      │  ├─ 💧 Riego [✓]                                  ││
│  │                   │  ├─ 🍃 Nutrición [✓]                               ││
│  │ Plant B (header)  │                                                     ││
│  │ 🌿 Planta B      │ Plant B (header)                                     ││
│  │ 1 tarea          │  └─ 🔍 Observación [✓]                              ││
│  │ 🔍 Observación   │                                                      ││
│  └────────────────────┴────────────────────────────────────────────────────┘│
│                                                                              │
│  PLANTS · 2                                                                  │
│  ┌─────────────────────────────┬─────────────────────────────┐             │
│  │ PlantCard A (6x8 ratio)    │ PlantCard B (6x8 ratio)    │             │
│  │ [photo or gradient]         │ [photo or gradient]        │             │
│  │ VEGE S4 · Planta A          │ FLORA F3 · Planta B        │             │
│  │ Girl Scout Cookies          │ Blue Dream                 │             │
│  │                             │                            │             │
│  │ 🌱 S4 Prefloracion 8d 🌸  │ 🌸 F3 Engorde 3d 🌸       │             │
│  │ [Progress bar] 65%          │ [Progress bar] 85%         │             │
│  │ Salud [green bar] 92%       │ Salud [yellow bar] 78%     │             │
│  │ ✓ Al día                    │ ⚠️ 1 vencida               │             │
│  └─────────────────────────────┴─────────────────────────────┘             │
│                                                                              │
│  HISTORIAL · 1                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ✂️ Jack Herer  Cosechada  15 abr 26 · 72 días de grow                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### INTERACTIONS — DASHBOARD

**Tap Targets (minimum 44×44px):**
- Streak badge: no action (info)
- Level progress bar: tap → modal (next level info)
- Plant header (in tasks): tap → navigate to `/plants/:id`
- Task card (row): tap → opens CompleteTaskSheet
- "Hecho" button: tap → open CompleteTaskSheet (haptic.light)
- PlantCard: tap → navigate to `/plants/:id` (active scale 0.987)

**Gestures:**
- Pull to refresh: swipe down from top, release at 44px minimum
  - Visual feedback: circular spinner grows opacity + rotates
  - Duration: 300ms easing out
  - Auto-refresh on release: refetch tasks (200ms simulated delay)
  - Haptic: success (heavy haptic on release)
- Tap: scale transition 95-100% (active:scale-95)
- Long press: no special action (optional future)

**Transitions:**
- Card enter: fade + slide up (0-250ms, easing ease-out)
- Card exit: fade + slide down (150ms)
- Section collapse/expand (historial): 200ms, rotate chevron icon
- Navigation: fade + slide (React Router default)

**Toast/Notifications:**
- After task completion: overlay XP reward (1.4s lifespan)
  - Position: center, z-index 50
  - Content: `✅ Tarea completada · +10 XP · Streak: 5d`
  - Animation: bounce-in (keyframe: 0% scale 0.5 → 100% scale 1, 300ms)
  - Auto-dismiss: 1.4s

---

## 2. PLANT DETAIL — COMPLETE WIREFRAME

### Viewport: iPhone SE (375×812) Mobile-first

```
┌─────────────────────────────────────────┐
│ ← Status Bar (16px top safe area)       │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Hero Header — gradient or photo]   │ │
│ │ Noise overlay (8% opacity)          │ │
│ │ 🌱 (big emoji 20% opacity, right)   │ │
│ │                                     │ │
│ │ [←] Back button          [Edit] btn │ │
│ │ (40px circle, white/20 bg)          │ │
│ │                                     │ │
│ │ VEGE S4     [badge]                 │ │
│ │ Planta A                            │ │
│ │ Girl Scout Cookies                  │ │
│ │                                     │ │
│ │ 8 días para cosecha 🌸              │ │
│ │ (inline counter box)                │ │
│ └─────────────────────────────────────┘ │
│ 16px padding                            │
│                                         │
│ 📅 23 Abr 2026  │ 🏠 Indoor │ 🪴 2×10L │
│ (info chips, small, tight spacing)     │
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ Progress Ring (120px diam, center)  ║│
│ ║        65%                          ║│
│ ║     🌱 Prefloracion                 ║│
│ ║ Vegetativo (small label)            ║│
│ ║                                     ║│
│ ║ Salud:                              ║│
│ ║ [████████░░] 92% (green)            ║│
│ ║                                     ║│
│ ║ Cosecha est.                        ║│
│ ║ 3 de Mayo (bold)                    ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ 💧 Mediciones                       ║│
│ ║                                     ║│
│ ║ EC: [1.2] → ✓ Ideal                ║│
│ ║ pH: [6.3] → ✓ Ideal                ║│
│ ║                                     ║│
│ ║ [Sparkline chart EC/pH history]     ║│
│ ║ (small line chart, 200px wide)      ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ 🌸 ¡Vegetativo completado!          ║│
│ ║ Ya pasaron las 6 semanas.           ║│
│ ║ ¿Cuándo iniciaste la floración?     ║│
│ ║                                     ║│
│ ║ [Hoy] [🌸 Elegir fecha]             ║│
│ ║ (button row, equal width)           ║│
│ ╚═════════════════════════════════════╝│
│ OR if picker open:                      │
│ ╔═════════════════════════════════════╗│
│ ║ 📅 Fecha de inicio de floración     ║│
│ ║ [date input — interactive]          ║│
│ ║ Podés backdatear si ya cambiaste.   ║│
│ ║                                     ║│
│ ║ [Cancelar] [🌸 Confirmar floración]║
│ ╚═════════════════════════════════════╝│
│                                         │
│ 📅 ESTA SEMANA                         │
│ ╔═════════════════════════════════════╗│
│ ║ L  M  X  J  V  S  D  (week view)   ║│
│ ║ 21 22 23•24 25 26 27                ║│
│ ║ [✓] [✓] [●][✓] [ ] [ ] [ ]          ║│
│ ║                                     ║│
│ ║ Tap day to view tasks for that day  ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ⚡ HOY (or "MIÉ 23 DE ABR" if ≠ today) │
│ ╔═════════════════════════════════════╗│
│ ║ 🍃 Nutrición (task card)            ║│
│ ║ Objetivo: EC 0.8–1.0 · pH 5.5–6.0  ║│
│ ║                                     ║│
│ ║ [NutritionCard]                     ║│
│ ║ BIO line: Nutrición Base 2ml/L      ║│
│ ║           (16ml para 8L)             ║│
│ ║ [▼ Receta completa]                 ║│
│ ║                                     ║│
│ ║ [✓ Marcar completada]               ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ 💧 Riego (if exists for this day)  ║│
│ ║                                     ║│
│ ║ Para 8L (2 macetas × 4L c/u)        ║│
│ ║ ~2 L por maceta                      ║│
│ ║                                     ║│
│ ║ [💧 Riego completado]               ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ 📅 PRÓXIMAS TAREAS                     │
│ ╔═════════════════════════════════════╗│
│ ║ 24 abr · 🍃 Nutrición               ║│
│ ├─────────────────────────────────────┤│
│ ║ 25 abr · 💧 Riego                   ║│
│ ├─────────────────────────────────────┤│
│ ║ 26 abr · 🌫️ Foliar                  ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ ✂️ FINALIZAR CULTIVO                  │
│ (button: secondary style)               │
│                                         │
│ 📊 REVEGETAR — 8L por maceta           │
│ (footer, small text)                    │
│                                         │
│ 20px safe area bottom ────────────────  │
├─────────────────────────────────────────┤
│ [Tab Bar]                               │
│ [🏠] [📅] [🎮] [⚙️]                     │
└─────────────────────────────────────────┘
```

---

### TABS — PLANTDETAIL (Future implementation, shown as collapsed)

**Overview** (default, above)
- Hero + Progress Ring + Health + Harvest date
- Measurement section (EC/pH sparkline)
- Flora phase alert/picker
- Next critical action CTA

**Calendar** (tab 2)
- Week view grid
- Task list for selected day
- Historical view (completed ✓, missed ✕)

**Nutrition** (tab 3)
- Nutrition table details (EC/pH by stage)
- Product line breakdown
- Dosage calculator

**Measurements** (tab 4)
- EC/pH line chart (30-day history)
- Min/max reference ranges
- Export option (future)

**Diary** (tab 5)
- Weekly photo log
- Notes per week
- Growth timeline

---

### RESPONSIVE — Web (1280×800)

**Layout:**
- Hero header: 100% width, 280px height
- Content grid: 3-col layout
  - Col 1 (narrow): Progress Ring + Health (fixed width 200px)
  - Col 2 (wide): Tasks + Nutrition cards
  - Col 3 (sidebar): Week view + Upcoming tasks
- Max container: 1200px

**Wireframe (web):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Hero Header (100% width × 280px)                                             │
│ [gradient or photo] · VEGE S4 · Planta A · GSC · 8 días 🌸                   │
│ ← [Edit]                                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────┬──────────────────────┬────────────────────────────┐
│ Info Chips (100% width)│                      │                            │
│ 📅 23 Abr · 🏠 Indoor │                      │                            │
│ 🪴 2×10L              │                      │                            │
├────────────────────────┼──────────────────────┼────────────────────────────┤
│ Progress Ring + Health │ Nutrition Tasks      │ 📅 WEEK VIEW              │
│ (120px diameter)       │                      │ L M X J V S D             │
│ 65% · Prefloracion     │ 🍃 Nutrición        │ [✓][✓][●][✓][][]         │
│ Salud: 92% green       │  EC 0.8–1.0         │                            │
│ Cosecha 3 mayo         │  pH 5.5–6.0         │ 📅 PRÓXIMAS               │
│                        │  [NutritionCard]    │ 24 abr · 🍃               │
│ 💧 Mediciones         │                      │ 25 abr · 💧               │
│ EC/pH sparkline        │ 💧 Riego            │ 26 abr · 🌫️               │
│ (160×80px)             │  ~2L per pot         │                            │
│                        │  [✓ Completado]     │                            │
│ 🌸 Flora Picker       │                      │ ✂️ FINALIZAR CULTIVO       │
│ [Hoy][Elegir fecha]    │ 📅 PRÓXIMAS         │                            │
└────────────────────────┴──────────────────────┴────────────────────────────┘
```

---

### INTERACTIONS — PLANT DETAIL

**Tap Targets (44×44px minimum):**
- Back button: navigate(-1)
- Edit button: navigate to `/plants/:id/edit`
- Info chips: no action (display)
- Day in week view: click → select day, scroll to tasks for that day
- Nutrition card: no action (display)
- "Marcar completada" button: open CompleteTaskSheet
- "Hecho" button (in sheet): haptic success, close sheet
- Flora picker buttons: haptic light, trigger action

**Gestures:**
- Scroll: vertical scroll within sheet (tab bar sticky)
- Swipe left/right: future tab navigation (if implementing tabs)
- Long press: no special action

**Transitions:**
- Enter: fade + slide from bottom (250ms ease-out)
- Flora picker: expand in-place (200ms ease-out)
- Week day select: highlight changes with scale animation (150ms)
- Task completion: fade out + disappear (200ms)

---

## 3. TASK COMPLETION FLOW — WIREFRAME + ANNOTATIONS

### Before: Dashboard Task Card

```
┌─────────────────────────────────────────┐
│ 🍃 Nutrición              [Hecho] btn   │
│                                         │
│ Tap on "Hecho" or swipe card →          │
│ triggers CompleteTaskSheet modal         │
└─────────────────────────────────────────┘
```

**Tap target:** 52×32px button (minimum 44×44 with padding)
**Feedback:** `hapticLight()` immediately
**Latency:** 0ms (sheet appears instantly)

---

### Modal State: CompleteTaskSheet (OPEN)

```
┌─────────────────────────────────────────┐
│ Fixed overlay z=40                      │
│ Background: black/40 blur-2px           │
│ Animation: lightbox-in (fade 0→1, 250ms)│
├─────────────────────────────────────────┤
│                                         │
│ [Animated sheet: page-enter-up]         │
│ (slide from bottom, 300ms ease-out)     │
│                                         │
│ ╔═════════════════════════════════════╗│
│ ║ [drag handle — 40×4px, app-border] ║│
│ ║                                     ║│
│ ║ 🍃 Nutrición completada ✓           ║│
│ ║ [V4 badge] EC 0.8–1.0 · pH 5.5–6.0 ║│
│ ║                                     ║│
│ ║ 🧪 RECETA · 3 productos [▼]        ║│
│ ║ (collapsible section)               ║│
│ ║                                     ║│
│ ║ 💧 MEDICIÓN (opcional)              ║│
│ ║ ┌────────────┐  ┌────────────┐     ║│
│ ║ │ EC         │  │ pH         │     ║│
│ ║ │ [1.2] ✓OK │  │ [6.2] ~WARN│     ║│
│ ║ └────────────┘  └────────────┘     ║│
│ ║                                     ║│
│ ║ [textarea — placeholder:            ║│
│ ║  "Observaciones adicionales..."]    ║│
│ ║                                     ║│
│ ║ [Saltar] [Guardar EC/pH ✓]         ║│
│ ║ (gap-3, left button flex-1,         ║║
│ ║  right button flex-2)               ║│
│ ╚═════════════════════════════════════╝│
│                                         │
│ Bottom safe area: 20px padding         │
└─────────────────────────────────────────┘
```

**Layout Details:**
- Sheet max-width: 100% mobile, 448px desktop
- Padding: 20px (left/right), 16px (top), dynamic bottom (safe area aware)
- Backdrop click: closes sheet (onClick capture)
- Swipe-to-dismiss: upward swipe closes (from useSwipeToDismiss hook)

**Form Inputs:**
- EC input: `type="number"` step=0.1 min=0 max=5 inputMode="decimal"
- pH input: `type="number"` step=0.1 min=4 max=9 inputMode="decimal"
- Textarea: rows=2, placeholder context-aware (if EC/pH shown vs not)
- Focus: textarea auto-focused after 250ms delay (hapticLight on open)

**Measurement Feedback:**
- EC status: green (ok), amber (warn), red (bad)
  - ok: `ecNum >= task.ecMin && ecNum <= task.ecMax`
  - warn: within 0.3 of boundaries
  - bad: outside boundaries by >0.3
- pH status: same logic
- Icons: ✓ (ok), ~ (warn), ✕ (bad)
- Label: "Ideal" / "Cerca" / "Fuera" (dynamically set)

**Buttons:**
- "Saltar": Secondary style (border, app-card bg, ink-3 text)
  - Width: flex-1 (equal to 1 part)
  - Calls: `handleConfirm(true)` (skip measurements)
- "Guardar EC/pH ✓": Primary brand button
  - Width: flex-2 (takes 2x space of left button)
  - Dynamic text: "Guardar EC/pH" if EC/pH entered, else "Guardar nota" or "Confirmar"
  - Disabled state: none (always enabled, even if empty)

---

### Modal State: XP Reward Overlay (AFTER CONFIRM)

When user taps "Guardar EC/pH ✓", the sheet displays an XP reward screen overlaid:

```
╔═════════════════════════════════════╗
║ [Absolute overlay, covers sheet]    ║
║ bg-app-card, z-index 10             ║
║ Animation: xp-reward-in (fade)      ║
║ Duration: 1.4s total lifespan       ║
║                                     ║
║          ✅                         ║
║      (bounce animation)             ║
║                                     ║
║ Tarea completada                    ║
║                                     ║
║ +15 XP                              ║
║ (text: xp-pop class — scale bounce) ║
║                                     ║
║ 🔥 Bonus de racha +5 XP             ║
║ (if streak bonus applied)           ║
║                                     ║
║ [🔥] 5 días seguidos                ║
║ (badge in app-elevated bg)          ║
╚═════════════════════════════════════╝

Timeline:
- 0ms: overlay appears (fade in 300ms)
- 250ms: checkmark bounces
- 300ms: "+15 XP" scales pop (spring animation)
- 1.4s: fade out, close sheet
```

**CSS Animations:**
- `animate-bounce-once`: single bounce cycle (500ms)
- `xp-pop`: scale 0 → 1.2 → 1 (200ms, cubic-bezier spring)
- `xp-reward-in`: fade 0 → 1 (300ms ease-out)

---

### After: Task Card State (COMPLETED)

Once sheet closes:

```
┌─────────────────────────────────────────┐
│ 🍃 Nutrición                            │
│ ✅ Completada                           │
│ "Observaciones guardadas si las hay..." │
│                                         │
│ (Card grayed out, no longer tappable)   │
│ Opacity: 60%, text-ink-4                │
│                                         │
│ No "Hecho" button, replaced by badge    │
└─────────────────────────────────────────┘

Home.tsx line 274-280:
{doneTasks.length > 0 && (
  <div className="px-4 py-3 flex items-center gap-2 bg-app-elevated border-t border-app-border">
    <span className="text-base">✅</span>
    <span className="text-xs text-ink-3 font-medium">
      {doneTasks.length} completada{doneTasks.length > 1 ? 's' : ''}
    </span>
  </div>
)}
```

---

### Undo Flow (Optional)

User can tap on completed task again to open a "Deshacer" button:

```
Sheet reopens with:
╔═════════════════════════════════════╗
║ 🍃 Nutrición completada ✓           ║
║                                     ║
║ Completada hace 2 minutos           ║
║ Notas: "Hoja levemente amarilla"    ║
║                                     ║
║ [Deshacer] [Mantener]               ║
║                                     ║
║ Tap "Deshacer" → removes completion ║
║ Task reappears in pending section   ║
╚═════════════════════════════════════╝
```

(Not yet implemented, planned for v2)

---

## 4. COMPONENT SPECS — REUSABLE ELEMENTS

### ProgressRing Component

**Props:**
```typescript
interface ProgressRingProps {
  progress: number           // 0–1
  size: number             // diameter in px
  strokeWidth: number      // 8–12 recommended
  color: string            // hex or var()
  bgColor: string          // hex or var()
  centerEmoji: string      // "🌱", "🌸", etc
  label: string            // "65%"
}
```

**Render:**
- SVG circle (background) + animated circle (progress)
- Center text (emoji) + percentage label below
- Animation: smooth transition on progress change (700ms cubic-bezier)
- Example: 120×120px, stroke-width 9, color flora (#FF9500)

---

### NutritionCard Component

**Props:**
```typescript
interface NutritionCardProps {
  task: ScheduledTask
  potVolumeLiters: number
  potCount: number
  table?: NutritionTable
}
```

**Render:**
- Product list (line badge + name + dosage)
- Collapsible "Receta" section (shows all products)
- Visual: card with bg-app-card, border, rounded-2xl
- Each product row: small line badge (colored), name (truncate), bold dosage (right-aligned)

---

### PlantCard Component

**Props:**
```typescript
interface PlantCardProps {
  plant: Plant
}
```

**Render:**
- Header: background image or gradient (latestPhoto or gradient)
- Overlay: scrim (if photo) or noise (if gradient)
- Content: name, genetics, stage + harvest days
- Bars: cycle progress + health progress (stacked)
- Badges: overdue, pending today, needs flora, or "Al día"
- Interactive: click → navigate to `/plants/:plant.id`
- Active state: scale 0.987, shadow elevation

---

### CompleteTaskSheet Component

(Already detailed in section 3 above)

---

## 5. RESPONSIVE BREAKPOINTS

| Viewport       | Max-width | Padding | Layout                  |
|----------------|-----------|---------|-------------------------|
| Mobile (375px) | 100%      | 16px    | Stacked (1-col tasks)   |
| Tablet (768px) | 90%       | 24px    | 2-col plants, 3-col web |
| Desktop (1280+)| 1200px    | 24px    | 3-col grid (sidebar)    |

**Mobile-first approach:** Base styles for 375px, media queries for larger screens.

---

## 6. ANIMATION LIBRARY

**Global Duration Presets:**
- Micro: 150ms (scale, opacity tweaks)
- Short: 250–300ms (card enters, modals open)
- Medium: 500–700ms (progress bar updates, transitions)
- Long: 1.4s (XP reward lifespan)

**Easing Curves:**
- ease-out: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy close)
- ease-in: `cubic-bezier(0.7, 0, 0.84, 0)` (relaxed open)
- spring: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce)

**Predefined Classes (Tailwind/custom):**
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

.lightbox-in {
  animation: lightboxIn 250ms ease-out forwards;
}

@keyframes lightboxIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.xp-reward-in {
  animation: xpRewardIn 300ms ease-out forwards;
}

@keyframes xpRewardIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.xp-pop {
  animation: xpPop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes xpPop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.animate-bounce-once {
  animation: bounceOnce 500ms ease-out forwards;
}

@keyframes bounceOnce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}
```

---

## 7. HAPTIC FEEDBACK MAPPING

| Event                  | Type      | Duration | Platform     |
|------------------------|-----------|----------|--------------|
| Tap button             | Light     | 10ms     | iOS/Android  |
| Task complete confirm  | Success   | 200ms    | iOS/Android  |
| Pull-to-refresh release| Heavy     | 100ms    | iOS/Android  |
| Input validation       | Medium    | 50ms     | iOS (only)   |
| Error state            | Warning   | 200ms    | iOS/Android  |

**Implementation:**
```typescript
hapticLight()      // UIImpactFeedbackGenerator style=.light
hapticSuccess()    // UIImpactFeedbackGenerator style=.heavy
hapticMedium()     // UIImpactFeedbackGenerator style=.medium
```

---

## 8. ACCESSIBILITY NOTES

**WCAG 2.1 AA Compliance:**

- **Color Contrast:** All text ≥7:1 on backgrounds (exceeds AA)
- **Touch Targets:** Minimum 44×44px (iOS) / 48×48dp (Android)
- **Labels:** All inputs have visible labels or ARIA labels
- **Focus:** Keyboard navigation supported (tab order, focus rings)
- **Semantics:** Semantic HTML (`<button>`, `<input>`, etc.)
- **Motion:** Reduced motion preference respected (`prefers-reduced-motion`)
- **Language:** `lang="es"` on root, Spanish localization

**Dark Mode:** Full support via `@media (prefers-color-scheme: dark)` and Tailwind `dark:` prefix.

---

## 9. PERFORMANCE TARGETS

- **First Contentful Paint (FCP):** <1.5s (mobile)
- **Largest Contentful Paint (LCP):** <2.5s (mobile)
- **Cumulative Layout Shift (CLS):** <0.1
- **Time to Interactive (TTI):** <3.5s (mobile)

**Optimizations:**
- Image lazy-loading (Intersection Observer)
- Virtual scroll for long task lists (React Window)
- Memoization of PlantCard (React.memo)
- Code splitting: `/plants/:id` → separate bundle
- CSS-in-JS pruning: Tailwind JIT (zero unused styles)

---

## 10. TESTING CHECKLIST

### Visual Regression
- [ ] Home (idle, loading, empty, error states)
- [ ] PlantDetail (vege vs flora, hero gradient, measurements)
- [ ] CompleteTaskSheet (with/without measurements, XP reward)
- [ ] Responsive (375px, 768px, 1280px viewports)

### Interaction
- [ ] Tap targets all 44×44px minimum
- [ ] Pull-to-refresh animates and triggers refetch
- [ ] Task completion flow: sheet → XP → close
- [ ] Flora date picker works (backdating allowed)
- [ ] Navigation (back button, links)

### Accessibility
- [ ] Keyboard navigation (tab, enter, escape)
- [ ] Screen reader labels (NVDA, JAWS, VoiceOver)
- [ ] Color contrast passes aChecker
- [ ] Focus visible on all interactive elements

### Dark Mode
- [ ] Text colors readable (ink-1 white, ink-3 lighter gray)
- [ ] Cards have border (not just shadow)
- [ ] Gradients remain visible

---

## 11. FILE STRUCTURE — COMPONENTS TO BUILD/UPDATE

```
frontend/src/
├── components/
│   ├── plant/
│   │   ├── PlantCard.tsx        ← EXISTS (no changes needed)
│   │   ├── ProgressRing.tsx     ← EXISTS
│   │   └── HarvestSheet.tsx     ← EXISTS
│   ├── tasks/
│   │   ├── CompleteTaskSheet.tsx ← EXISTS (review XP reward overlay)
│   │   ├── TaskItem.tsx          ← EXISTS
│   │   ├── NutritionCard.tsx     ← EXISTS
│   │   ├── IrrigationCard.tsx    ← EXISTS
│   │   └── FoliarCard.tsx        ← EXISTS
│   ├── calendar/
│   │   ├── WeekView.tsx         ← EXISTS
│   │   └── TaskItem.tsx         ← EXISTS (audit spacing)
│   ├── nutrition/
│   │   └── NutritionCard.tsx    ← EXISTS (audit spacing)
│   ├── measurements/
│   │   └── MeasurementSection.tsx ← EXISTS (add sparkline)
│   ├── diary/
│   │   └── DiarySection.tsx     ← EXISTS
│   └── ui/
│       ├── Button.tsx           ← EXISTS
│       ├── Card.tsx             ← EXISTS
│       └── Badge.tsx            ← EXISTS
├── pages/
│   ├── Home.tsx                 ← EXISTS (review responsive layout)
│   ├── PlantDetail.tsx          ← EXISTS (review Hero header, tab structure)
│   └── NewPlant.tsx             ← EXISTS
├── hooks/
│   ├── usePullToRefresh.ts      ← EXISTS
│   ├── useSwipeToDismiss.ts     ← EXISTS
│   └── useTasks.ts              ← EXISTS
├── store/
│   ├── taskStore.ts             ← EXISTS (review complete task logic)
│   └── userStore.ts             ← EXISTS (review XP reward calc)
└── lib/
    ├── gamification.ts          ← EXISTS (getLevelInfo, XP constants)
    └── haptics.ts               ← EXISTS (hapticLight, hapticSuccess)
```

---

## 12. COLOR PALETTE — TAILWIND CONFIG

```javascript
// tailwind.config.ts — Add if not present
const colors = {
  app: {
    card:     'var(--app-card)',      // white / #1F1F1F dark
    border:   'var(--app-border)',    // #E5E5E5 / #2A2A2A dark
    elevated: 'var(--app-elevated)',  // #F5F5F5 / #252525 dark
  },
  ink: {
    '1': '#1A1A1A',  // primary text
    '2': '#333333',  // secondary text
    '3': '#666666',  // tertiary text (label, hint)
    '4': '#999999',  // quaternary text (disabled, meta)
  },
  brand: {
    '400': '#2D7C3D',  // primary action
    '500': '#26672F',  // darker for hover
    'subtle': 'rgba(45, 124, 61, 0.1)',  // light bg
    'border': 'rgba(45, 124, 61, 0.3)',  // light border
  },
  vege: {
    'bg': 'rgba(74, 222, 128, 0.15)',
    'text': '#16A34A',
    'border': 'rgba(74, 222, 128, 0.3)',
  },
  flora: {
    'bg': 'rgba(255, 149, 0, 0.15)',
    'text': '#FF8C00',
    'border': 'rgba(255, 149, 0, 0.3)',
  },
}

// CSS Custom Properties in root
const cssVariables = {
  '--gradient-vege': 'linear-gradient(135deg, #4ADE80 0%, #86EFAC 100%)',
  '--gradient-flora': 'linear-gradient(135deg, #FF9500 0%, #FBBF24 100%)',
  '--gradient-vege-bar': 'linear-gradient(90deg, #4ADE80, #22C55E)',
  '--gradient-flora-bar': 'linear-gradient(90deg, #FF9500, #FCD34D)',
}
```

---

## 13. SUMMARY — KEY DECISIONS

1. **Mobile-first design** with responsive web fallback
2. **Pull-to-refresh** on Home, no refresh button
3. **Sheet modals** for task completion (swipe-to-dismiss)
4. **XP reward overlay** (1.4s lifespan, then closes)
5. **Hero gradient headers** (or photo if available)
6. **Week view calendar** (7-day grid, click to filter)
7. **Progress rings** for cycle phase visualization
8. **Measurement feedback** (EC/pH status icons)
9. **Dark mode support** (Tailwind dark: prefix)
10. **Haptic feedback** (light on tap, success on confirm)
11. **WCAG 2.1 AA accessibility** (44px touch targets, color contrast)
12. **Tailwind CSS + custom CSS** for animations
13. **Responsive breakpoints** (375px / 768px / 1280px)

---

**Design System Last Updated:** 2026-04-23
**Implementation Status:** Ready for development
**Next Phase:** Build responsive web layout, audit mobile SafeArea
