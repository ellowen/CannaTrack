# CannaTrack — Responsive Grid System & Layout Breakdown

## GRID SYSTEM BASE

**Unit:** 4px (Tailwind spacing scale)
**Containers:** Flex + CSS Grid (no Bootstrap, pure Tailwind)
**Safe areas:** 16px (mobile), 24px (tablet/desktop)

---

## HOME (Dashboard) — Layout Comparison

### MOBILE (375px × 812px)

```
Full width: 375px
Safe area: 16px left + 16px right = 343px content width

┌─ 375px ──────────────────────────────┐
│                                      │
│ ← 16px safe margin ─→ ← 16px safe →│
│                                      │
│ [Header section]                     │ 32px height
│ Buenos días, Ellowen    [Streak]     │
│ (headline left) + (badge right)      │
│                                      │
│ [Progress bar]                       │ 16px height
│ Cultivador Novato ▓▓▓ Principiante   │
│                                      │
│ 24px gap                             │
│                                      │
│ ⚠️ VENCIDAS · 1                      │ 14px label
│ ┌─ 343px ─────────────────────────┐ │
│ │ ┌─ 16px pad ─┐                  │ │
│ │ │ 🍃 Nutrición    [Hecho]       │ │
│ │ │ 19 abr · Planta A             │ │
│ │ └─────────────────────────────┘ │ │
│ └──────────────────────────────────┘ │ 56px card height
│                                      │
│ ⚡ HOY · 3 PENDIENTES                │ 14px label
│ ┌─ 343px ─────────────────────────┐ │
│ │ ┌─ Plant A header ────────────┐ │ │ 40px header
│ │ │ 🌿 Planta A   2 tareas   →  │ │ │
│ │ └────────────────────────────┘ │ │
│ │ ├─ Task 1: 💧 Riego            │ │ 44px per task
│ │ ├─ Task 2: 🍃 Nutrición        │ │
│ │ └──────────────────────────────┘ │
│ │ ┌─ Plant B header ────────────┐ │ │
│ │ │ 🌿 Planta B   1 tarea    →  │ │ │
│ │ └────────────────────────────┘ │ │
│ │ ├─ Task 1: 🔍 Observación      │ │
│ │ └──────────────────────────────┘ │
│ └──────────────────────────────────┘ │
│                                      │
│ PLANTS · 2                           │ 14px label
│ ┌─ 343px ─────────────────────────┐ │
│ │ [PlantCard — 100% width]        │ │ 200px height
│ │ [photo or gradient]              │ │
│ │ VEGE S4 · Planta A               │ │
│ │ Girl Scout Cookies               │ │
│ │ ──────────────────────────────  │ │
│ │ 🌱 S4 Prefloracion  8d 🌸      │ │
│ │ [Progress bar] 65%               │ │
│ │ Salud [green bar] 92%            │ │
│ │ ✓ Al día                         │ │
│ └──────────────────────────────────┘ │ 
│ ┌─ 343px ─────────────────────────┐ │
│ │ [PlantCard — 100% width]        │ │ 200px height
│ │ [photo or gradient]              │ │
│ │ FLORA F3 · Planta B              │ │
│ │ Blue Dream                       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 20px bottom safe area ───────────────│
├──────────────────────────────────────┤
│ [Tab Bar — 56px height]              │
│ [🏠] [📅] [🎮] [⚙️]                   │
└──────────────────────────────────────┘
```

**Key measurements (mobile):**
- Content width: 343px (375 - 32 margin)
- Card padding: 16px (left/right)
- Gap between sections: 24px
- Card height (plant): 200px
- Task card height: 44–56px
- Header height: 32px
- Tab bar height: 56px (including safe area)
- Safe area bottom: 20px (iPhone notch)

**Stack order (vertical):**
1. Header + streak badge (52px)
2. Level progress bar (16px)
3. Gap (24px)
4. Overdue tasks section (if any)
5. Today tasks section
6. Stats row (if plants exist) — 3 columns
7. Plants grid (1 column)
8. Historial section (if any)
9. Gap to tab bar (20px)

---

### TABLET (768px × 1024px)

```
Full width: 768px
Safe area: 20px left + 20px right = 728px content width

┌─ 768px ─────────────────────────────────────────┐
│                                                 │
│ ← 20px safe margin ───→  ← 20px safe margin →│
│                                                 │
│ [Header row — horizontal layout]               │ 40px
│ Buenos días, Ellowen [large]                   │
│ ──────────────────── [Streak badge right]      │
│ Cultivador Novato [progress bar]               │
│                                                 │
│ 20px gap                                        │
│                                                 │
│ ⚡ HOY · 3 PENDIENTES                           │
│ ┌─ 728px ────────────────────────────────────┐│
│ │ [Horizontal list — 3 columns]              ││
│ │                                            ││
│ │ 🍃 Nutrición   | 🌿 Plant A | [✓ Hecho]   ││
│ │ 19 abr · Planta A                          ││
│ │ ───────────────────────────────────────────││
│ │ 💧 Riego       | 🌿 Plant B | [✓ Hecho]   ││
│ │ 20 abr                                     ││
│ │ ───────────────────────────────────────────││
│ │ 🔍 Observacion | 🌿 Plant C | [✓ Hecho]   ││
│ └────────────────────────────────────────────┘│
│                                                 │
│ PLANTS · 2                                      │
│ ┌──────────────────────┬──────────────────────┐│
│ │ PlantCard A (2-col)  │ PlantCard B (2-col)  ││
│ │ [200×200 grid view]  │ [200×200 grid view]  ││
│ │ VEGE S4              │ FLORA F3              ││
│ │ Planta A             │ Planta B              ││
│ │ 65% · 92% health     │ 85% · 78% health     ││
│ └──────────────────────┴──────────────────────┘│
│                                                 │
│ 20px bottom safe area ──────────────────────── │
├─────────────────────────────────────────────────┤
│ [Tab Bar]                                       │
└─────────────────────────────────────────────────┘
```

**Key measurements (tablet):**
- Content width: 728px (768 - 40 margin)
- Card width: 354px (2-col grid, gap 20px)
- Task card: Now inline (icon | label | plant | button) in single row
- Header: Horizontal flex layout
- Plants: 2-column grid (side-by-side)

---

### DESKTOP (1280px × 800px)

```
Full width: 1280px
Max content width: 1200px (centered)
Safe area: 40px left + 40px right

┌─ 1280px ────────────────────────────────────────────────┐
│                                                         │
│ 40px margin ←→ 1200px content ←→ 40px margin           │
│                                                         │
│ [Header horizontal — full width]                        │ 
│ Buenos días, Ellowen [large]     [Streak badge right]  │
│ Cultivador Novato [progress bar]                        │
│                                                         │
│ 20px gap                                                │
│                                                         │
│ ⚡ HOY · 3 PENDIENTES                                    │
│ ┌─ 1200px ──────────────────────────────────────────┐ │
│ │ [Table-like layout — 4 columns]                  │ │
│ │ Icon | Task Name          | Plant | [Button]     │ │
│ │────────────────────────────────────────────────── │ │
│ │ 🍃   Nutrición             Planta A  [Hecho]     │ │
│ │ 💧   Riego                 Planta B  [Hecho]     │ │
│ │ 🔍   Observacion           Planta A  [Hecho]     │ │
│ └──────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ 1200px ──────────────────────────────────────────┐ │
│ │ PLANTS · 2  [3-column layout]                    │ │
│ │ ┌──────────────┬──────────────┬──────────────┐  │ │
│ │ │ PlantCard A  │ PlantCard B  │ PlantCard C  │  │ │
│ │ │ [250×280]    │ [250×280]    │ [250×280]    │  │ │
│ │ │ VEGE S4      │ FLORA F3     │ VEGE S2      │  │ │
│ │ │ Planta A     │ Planta B     │ Planta C     │  │ │
│ │ │ 65%·92%      │ 85%·78%      │ 40%·95%      │  │ │
│ │ └──────────────┴──────────────┴──────────────┘  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                         │
│ HISTORIAL · 1                                          │
│ ┌─ 1200px ──────────────────────────────────────────┐ │
│ │ ✂️ Jack Herer | Cosechada | 15 abr | 72 días     │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key measurements (desktop):**
- Content width: 1200px (centered)
- Margins: 40px symmetric
- Task cards: Table-like row (icon 32px | label flex-1 | plant 120px | button 80px)
- Plant cards: 3-column grid (250px width, gap 20px)
- Card height: 280px
- Header: Horizontal flex with space-between

---

## PLANT DETAIL — Layout Comparison

### MOBILE (375px × 812px)

```
┌─ 375px ──────────────────────────────┐
│                                      │
│ ← Hero Header (100% width) ───────→ │
│ [gradient or photo] · Noise overlay  │ 240px height
│ 🌱 (big emoji 20% opacity)           │
│ [← Back] ───────────── [Edit ✏️]     │
│ VEGE S4 · Planta A                   │
│ Girl Scout Cookies                   │
│ 8 días para cosecha 🌸               │
│                                      │
│ 16px padding                         │
│                                      │
│ ┌─ 343px ─────────────────────────┐ │
│ │ 📅 23 Abr 2026 │ 🏠 Indoor │ 🪴 │ │ Info chips (1 row)
│ │ ──────────────────────────────  │ │
│ │ ┌─ Progress Ring (120px) ──────┐│ │
│ │ │        65%                   ││ │
│ │ │     🌱 Prefloracion          ││ │ Card height: 160px
│ │ │ Vegetativo (label)           ││ │
│ │ │                              ││ │
│ │ │ Salud:                       ││ │
│ │ │ [████████░░] 92%            ││ │
│ │ │                              ││ │
│ │ │ Cosecha est.                 ││ │
│ │ │ 3 de Mayo                    ││ │
│ │ └──────────────────────────────┘│ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ 343px ─────────────────────────┐ │
│ │ 💧 Mediciones                    │ │ Card height: 140px
│ │ EC: [1.2] ✓ Ideal               │ │
│ │ pH: [6.3] ✓ Ideal               │ │
│ │ [Sparkline chart EC/pH]          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ 343px ─────────────────────────┐ │
│ │ 🌸 ¡Vegetativo completado!      │ │ Card height: 120px
│ │ Ya pasaron 6 semanas.            │ │
│ │ ¿Cuándo iniciaste floración?     │ │
│ │ [Hoy] [🌸 Elegir fecha]          │ │
│ └──────────────────────────────────┘ │ (if needs flora)
│                                      │
│ 📅 ESTA SEMANA                       │ Label: 14px
│ ┌─ 343px ─────────────────────────┐ │
│ │ L  M  X  J  V  S  D             │ │ Card height: 80px
│ │ [●][✓][✓] [ ][ ][ ][ ]          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ⚡ HOY (or date label)                │
│ ┌─ 343px ─────────────────────────┐ │
│ │ 🍃 Nutrición                     │ │
│ │ EC 0.8–1.0 · pH 5.5–6.0         │ │ Card height: variable
│ │ [NutritionCard expandable]       │ │ (usually 160–200px)
│ │ [✓ Marcar completada]            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 📅 PRÓXIMAS TAREAS                   │
│ ┌─ 343px ─────────────────────────┐ │
│ │ 24 abr · 🍃 Nutrición           │ │
│ │ 25 abr · 💧 Riego               │ │ Card height: 120px
│ │ 26 abr · 🌫️ Foliar              │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ✂️ FINALIZAR CULTIVO                 │ Button: 44px
│                                      │
│ 20px bottom safe area ───────────────│
├──────────────────────────────────────┤
│ [Tab Bar — future]                   │
└──────────────────────────────────────┘
```

**Key measurements (mobile):**
- Content width: 343px
- Hero height: 240px (photo or gradient)
- Progress ring: 120px diameter
- Card padding: 16px (left/right)
- Cards: Full width (100%)
- Task card height: 44–60px per task
- Button height: 44px

---

### TABLET/DESKTOP (768px+ to 1280px+)

```
┌─ 1200px ────────────────────────────────────────────────┐
│                                                         │
│ ← Hero Header (100% width) ──────────────────────────→ │
│ [gradient or photo] · 280px height                      │
│ VEGE S4 · Planta A · Girl Scout Cookies · 8d 🌸        │
│ [← Back] ────────────────────────── [Edit ✏️]          │
│                                                         │
│ 20px padding                                            │
│                                                         │
│ [Info chips inline]                                     │
│ 📅 23 Abr 2026 · 🏠 Indoor · 🪴 2×10L                 │
│                                                         │
│ [3-Column Layout]                                       │
│ ┌───────────────┬──────────────────┬──────────────┐   │
│ │ Progress Ring │ Nutrition Tasks  │ Week View    │   │
│ │ + Health      │ + Measurements   │ + Upcoming   │   │
│ │ (200px width) │ (flex grow)      │ (250px width)│   │
│ │               │                  │              │   │
│ │ 120px ring    │ 🍃 Nutrición     │ L  M  X  J  │   │
│ │ Salud bar     │  EC 0.8–1.0      │ [●][✓][✓][] │   │
│ │ Cosecha est.  │  pH 5.5–6.0      │              │   │
│ │               │ [Nutrition card] │ 📅 PRÓXIMAS │   │
│ │ 💧 Mediciones│                  │ 24 abr · 🍃 │   │
│ │ EC/pH chart   │ 💧 Riego         │ 25 abr · 💧 │   │
│ │ (sparkline)   │  ~2L per pot     │ 26 abr · 🌫️│   │
│ │               │ [✓ Completado]   │              │   │
│ │ 🌸 Flora      │                  │              │   │
│ │ Picker        │ 🌫️ Foliar        │              │   │
│ │ [Hoy]         │  [✓ Completado]  │              │   │
│ │ [Elegir]      │                  │              │   │
│ └───────────────┴──────────────────┴──────────────┘   │
│                                                         │
│ ✂️ FINALIZAR CULTIVO [Button full-width or centered]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key measurements (desktop):**
- Hero height: 280px
- 3-column layout widths:
  - Left (sidebar): 200px (progress ring + measurements)
  - Center (main): flex-grow (nutrition cards)
  - Right (sidebar): 250px (week view + upcoming)
- Column gap: 24px
- Card padding: 20px

---

## COMPONENTS — SIZE SPECS

### PlantCard Dimensions

| Device     | Width  | Height | Ratio | Grid |
|-----------|--------|--------|-------|------|
| Mobile    | 343px  | 200px  | 1.7:1 | 1 col |
| Tablet    | 354px  | 200px  | 1.7:1 | 2 col |
| Desktop   | 250px  | 280px  | 0.9:1 | 3 col |

**Internal spacing:**
- Padding (header): 20px (left/right), 16px (top/bottom)
- Padding (body): 20px
- Margin between sections: 12px

### Task Card Dimensions

| Layout    | Width      | Height | Format          |
|-----------|-----------|--------|-----------------|
| Mobile    | 343px     | 48px   | Stacked (icon/label/button vertical) |
| Tablet    | 728px     | 44px   | Inline row (icon | label | plant | button) |
| Desktop   | 1200px    | 44px   | Table-like (icon | name | plant | button | date) |

---

## TYPOGRAPHY SIZES

| Element      | Size | Weight | Mobile | Tablet | Desktop |
|------------|------|--------|---------|--------|---------|
| H1 (greeting) | 28px | 900 black | 100%  | 100% | 100% |
| H2 (section) | 18px | 700 bold | 100%  | 100% | 100% |
| H3 (label) | 14px | 700 bold | 100%  | 100% | 100% |
| Body | 14px | 400 regular | 100%  | 100% | 100% |
| Small | 12px | 500 medium | 100%  | 100% | 100% |
| XS | 10px | 600 semibold | 100%  | 100% | 100% |
| Label | 11px | 700 bold | 100%  | 100% | 100% |

(Typography does NOT scale with viewport — fixed sizes across all breakpoints)

---

## SPACING SCALE (Tailwind)

| Rem | Px | Tailwind | Usage |
|----|-----|----------|-------|
| 0  | 0   | gap-0    | No gap |
| 0.25 | 4 | gap-1    | Tight spacing |
| 0.5 | 8 | gap-2    | Between list items |
| 0.75 | 12 | gap-3    | Card sections |
| 1 | 16 | gap-4    | Standard margin |
| 1.5 | 24 | gap-6    | Section spacing |
| 2 | 32 | gap-8    | Large gap |

**Safe areas (viewport margins):**
- Mobile: 16px left/right, 20px bottom (iPhone notch)
- Tablet: 20px left/right, 20px bottom
- Desktop: 40px left/right (or centered max-width 1200px)

---

## SAFE AREA IMPLEMENTATION

```css
/* CSS approach */
padding-left: max(1rem, env(safe-area-inset-left));
padding-right: max(1rem, env(safe-area-inset-right));
padding-bottom: max(1rem, env(safe-area-inset-bottom));

/* Tailwind approach */
<div className="px-4 md:px-6 lg:px-8" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
```

---

## BREAKPOINTS — Media Queries

```javascript
// tailwind.config.ts
screens: {
  sm: '640px',   // tablets (portrait)
  md: '768px',   // tablets (landscape)
  lg: '1024px',  // desktop (small)
  xl: '1280px',  // desktop (large)
  '2xl': '1536px' // desktop (wide)
}
```

**Usage in JSX:**
```jsx
// Mobile-first approach
<div className="
  grid grid-cols-1        /* mobile: 1 column */
  md:grid-cols-2          /* tablet: 2 columns */
  lg:grid-cols-3          /* desktop: 3 columns */
  gap-4 md:gap-6
">
  {/* content */}
</div>
```

---

## CONTAINER QUERIES (Future)

For component-level responsive design (when supported):

```css
@supports (container-type: inline-size) {
  .plant-card {
    container-type: inline-size;
  }

  @container (max-width: 300px) {
    .plant-card-title {
      font-size: 0.875rem;
    }
  }
}
```

---

**Last Updated:** 2026-04-23
**Tailwind Version:** v3.x
**CSS Grid:** CSS Grid Layout Level 2
