/**
 * CannaTrack — Custom SVG Icon Library
 * All icons are original designs built for the CannaTrack visual identity.
 * Viewbox: 24x24. Use `size` prop to scale.
 */
import React from 'react'
import Svg, {
  Path, Circle, Rect, Line, Polygon, G, Defs, LinearGradient as SvgGradient,
  Stop, ClipPath, Ellipse,
} from 'react-native-svg'

type IconProps = {
  size?: number
  color?: string
  filled?: boolean
}

// ─── Cannabis Leaf — the main brand icon ──────────────────────────────────────
export function LeafIcon({ size = 24, color = '#52CC64', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Stem */}
      <Path
        d="M12 22 L12 11"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Center top leaf */}
      <Path
        d="M12 3 C10.2 5.5 10 8.5 12 10.5 C14 8.5 13.8 5.5 12 3Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* Left big leaf */}
      <Path
        d="M12 11 C9.5 8.5 6 9 4.5 11.5 C3 14 5 15.5 7.5 14.5 C9.5 13.8 11 12.5 12 11Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* Right big leaf */}
      <Path
        d="M12 11 C14.5 8.5 18 9 19.5 11.5 C21 14 19 15.5 16.5 14.5 C14.5 13.8 13 12.5 12 11Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* Left small leaf */}
      <Path
        d="M7.5 14.5 C6.5 13 3.5 14 3 16.5 C5 16.5 7 16 7.5 14.5Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* Right small leaf */}
      <Path
        d="M16.5 14.5 C17.5 13 20.5 14 21 16.5 C19 16.5 17 16 16.5 14.5Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Pot Plant — for "Mis Plantas" ───────────────────────────────────────────
export function PlantPotIcon({ size = 24, color = '#52CC64', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Pot */}
      <Path
        d="M7 15 L8.5 21 L15.5 21 L17 15 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Pot rim */}
      <Rect
        x="6" y="13" width="12" height="2.5" rx="1.25"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Stem */}
      <Path
        d="M12 13 L12 8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Left leaf */}
      <Path
        d="M12 10 C10 8 7 9 6.5 11 C8.5 12 11 11.5 12 10Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* Right leaf */}
      <Path
        d="M12 8.5 C14 6.5 17 7.5 17.5 9.5 C15.5 10.5 13 9.5 12 8.5Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* Small top leaf */}
      <Path
        d="M12 8 C11 5.5 12 3 12 3 C13 5.5 13 8 12 8Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Home / Dashboard ─────────────────────────────────────────────────────────
export function HomeIcon({ size = 24, color = '#52CC64', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* House shell */}
      <Path
        d="M3 11 L12 3 L21 11 L21 21 L15 21 L15 15 L9 15 L9 21 L3 21 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Small leaf on rooftop */}
      <Path
        d="M12 3 C11 1 12 0 12 0 C13 1 13 3 12 3Z"
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Calendar ────────────────────────────────────────────────────────────────
export function CalendarIcon({ size = 24, color = '#52CC64', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Body */}
      <Rect
        x="3" y="4" width="18" height="18" rx="3"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
      />
      {/* Top bar divider */}
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={1.4} />
      {/* Hooks */}
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Day dots */}
      <Circle cx="8" cy="15" r="1.4" fill={filled ? '#0C1410' : color} />
      <Circle cx="12" cy="15" r="1.4" fill={color} />
      <Circle cx="16" cy="15" r="1.4" fill={filled ? '#0C1410' : color} />
    </Svg>
  )
}

// ─── Camera / Diagnose ────────────────────────────────────────────────────────
export function CameraIcon({ size = 24, color = '#52CC64', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Body */}
      <Path
        d="M2 8 C2 7 3 6 4 6 L7.5 6 L9.5 3.5 L14.5 3.5 L16.5 6 L20 6 C21 6 22 7 22 8 L22 18 C22 19 21 20 20 20 L4 20 C3 20 2 19 2 18 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* Lens ring */}
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.5} fill={filled ? '#0C1410' : 'none'} />
      {/* Lens center */}
      <Circle cx="12" cy="13" r="1.5" fill={color} />
      {/* Flash / top indicator */}
      <Rect x="17" y="9" width="2" height="1.5" rx="0.75" fill={color} />
    </Svg>
  )
}

// ─── Profile / Person ─────────────────────────────────────────────────────────
export function ProfileIcon({ size = 24, color = '#52CC64', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head */}
      <Circle
        cx="12" cy="8" r="4"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
      />
      {/* Body / shoulders */}
      <Path
        d="M4 21 C4 17 7.6 14 12 14 C16.4 14 20 17 20 21"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      {/* XP star accent */}
      <Path
        d="M18 5 L18.6 6.8 L20.5 6.8 L19 7.9 L19.6 9.8 L18 8.6 L16.4 9.8 L17 7.9 L15.5 6.8 L17.4 6.8 Z"
        fill={color}
        opacity={0.7}
      />
    </Svg>
  )
}

// ─── Droplet (irrigation) ────────────────────────────────────────────────────
export function DropIcon({ size = 24, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 C12 3 5 11 5 15.5 C5 19 8.1 22 12 22 C15.9 22 19 19 19 15.5 C19 11 12 3 12 3Z"
        fill={color}
        opacity={0.85}
      />
    </Svg>
  )
}

// ─── Nutrition / Flask ────────────────────────────────────────────────────────
export function FlaskIcon({ size = 24, color = '#22C55E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3 L9 10 L4 18 C3.2 19.5 4.2 21 6 21 L18 21 C19.8 21 20.8 19.5 20 18 L15 10 L15 3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
      <Line x1="8" y1="3" x2="16" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Bubbles */}
      <Circle cx="9" cy="16" r="1.5" fill={color} opacity={0.6} />
      <Circle cx="13" cy="18" r="1" fill={color} opacity={0.5} />
      <Circle cx="15" cy="15" r="1.2" fill={color} opacity={0.7} />
    </Svg>
  )
}

// ─── Observation / Eye ───────────────────────────────────────────────────────
export function EyeIcon({ size = 24, color = '#F59E0B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12 C1 12 5 5 12 5 C19 5 23 12 23 12 C23 12 19 19 12 19 C5 19 1 12 1 12Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx="12" cy="12" r="1.2" fill={color} />
    </Svg>
  )
}

// ─── Scissors / Harvest ───────────────────────────────────────────────────────
export function ScissorsIcon({ size = 24, color = '#EF4444' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="7" r="3" stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx="6" cy="17" r="3" stroke={color} strokeWidth={1.5} fill="none" />
      <Path d="M8.5 9 L20 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M8.5 15 L20 20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M20 4 L14 12 L20 20" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

// ─── Spray / Foliar ───────────────────────────────────────────────────────────
export function SprayIcon({ size = 24, color = '#A855F7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bottle */}
      <Path
        d="M8 14 L8 20 L16 20 L16 10 L14 8 L12 8 L12 6 L10 6 L10 8 L8 10 Z"
        stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill="none"
      />
      {/* Nozzle */}
      <Path d="M16 9 L19 9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Spray dots */}
      <Circle cx="20" cy="7" r="1" fill={color} opacity={0.7} />
      <Circle cx="21" cy="10" r="0.8" fill={color} opacity={0.5} />
      <Circle cx="19" cy="12" r="0.8" fill={color} opacity={0.4} />
      <Circle cx="22" cy="8" r="0.6" fill={color} opacity={0.3} />
    </Svg>
  )
}

// ─── Star / Achievement ──────────────────────────────────────────────────────
export function StarIcon({ size = 24, color = '#A78BFA', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 L15 9 L22 9 L16.5 13.5 L18.5 21 L12 16.5 L5.5 21 L7.5 13.5 L2 9 L9 9 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Bolt / XP ───────────────────────────────────────────────────────────────
export function BoltIcon({ size = 24, color = '#A78BFA', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2 L4 13 L11 13 L11 22 L20 11 L13 11 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Settings / Gear ─────────────────────────────────────────────────────────
export function GearIcon({ size = 24, color = '#728C74' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth={1.5} fill="none" />
      <Path
        d="M19.4 15 C19.7 14.4 20 13.7 20 13 L22 12.5 C22 11.5 21.8 10.5 21.4 9.6 L19.5 9.5 C19.2 8.9 18.8 8.4 18.3 8 L18.6 6 C17.9 5.4 17.1 4.9 16.2 4.6 L15 6.1 C14.4 5.9 13.7 5.8 13 5.8 L12.5 4 C11.5 4 10.5 4.2 9.6 4.6 L9.5 6.5 C8.9 6.8 8.4 7.2 8 7.7 L6 7.4 C5.4 8.1 4.9 8.9 4.6 9.8 L6.1 11 C5.9 11.6 5.8 12.3 5.8 13 L4 13.5 C4 14.5 4.2 15.5 4.6 16.4 L6.5 16.5 C6.8 17.1 7.2 17.6 7.7 18 L7.4 20 C8.1 20.6 8.9 21.1 9.8 21.4 L11 19.9 C11.6 20.1 12.3 20.2 13 20.2 L13.5 22 C14.5 22 15.5 21.8 16.4 21.4 L16.5 19.5 C17.1 19.2 17.6 18.8 18 18.3 L20 18.6 C20.6 17.9 21.1 17.1 21.4 16.2 Z"
        stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Back Arrow ──────────────────────────────────────────────────────────────
export function BackIcon({ size = 24, color = '#52CC64' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12 L5 12"
        stroke={color} strokeWidth={2} strokeLinecap="round"
      />
      <Path
        d="M10 7 L5 12 L10 17"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── CannaTrack Logo Mark ─────────────────────────────────────────────────────
// Geometric cannabis leaf coin — 5 pointed leaflets + stem inside a circle
export function LogoMark({ size = 48, primaryColor = '#52CC64', secondaryColor = '#3DAA50' }: {
  size?: number
  primaryColor?: string
  secondaryColor?: string
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <SvgGradient id="lgGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={primaryColor} />
          <Stop offset="1" stopColor={secondaryColor} />
        </SvgGradient>
      </Defs>

      {/* Coin circle */}
      <Circle cx="24" cy="24" r="22" fill={primaryColor} opacity={0.1} />
      <Circle cx="24" cy="24" r="22" stroke={primaryColor} strokeWidth={1.4} fill="none" opacity={0.6} />
      <Circle cx="24" cy="24" r="19" stroke={primaryColor} strokeWidth={0.6} fill="none" opacity={0.25} />

      {/* Stem */}
      <Path d="M24 41 L24 30" stroke="url(#lgGrad)" strokeWidth={2.2} strokeLinecap="round" />

      {/* Center leaflet — straight up */}
      <Path
        d="M24 30 C21.5 26 21.5 15 24 10 C26.5 15 26.5 26 24 30Z"
        fill="url(#lgGrad)"
      />
      {/* Left-inner leaflet — ~35° */}
      <Path
        d="M24 30 C21 27 14 22 11 17 C9 13 13 10 16 14 C19 18 22 25 24 30Z"
        fill="url(#lgGrad)"
      />
      {/* Right-inner leaflet — mirror */}
      <Path
        d="M24 30 C27 27 34 22 37 17 C39 13 35 10 32 14 C29 18 26 25 24 30Z"
        fill="url(#lgGrad)"
      />
      {/* Left-outer leaflet — ~62° */}
      <Path
        d="M24 30 C21 29 10 28 7 23 C5 19 9 16 13 20 C17 24 21 28 24 30Z"
        fill="url(#lgGrad)"
        opacity={0.75}
      />
      {/* Right-outer leaflet — mirror */}
      <Path
        d="M24 30 C27 29 38 28 41 23 C43 19 39 16 35 20 C31 24 27 28 24 30Z"
        fill="url(#lgGrad)"
        opacity={0.75}
      />
    </Svg>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
export function ProgressRing({ done, total, size = 80, color = '#52CC64' }: {
  done: number; total: number; size?: number; color?: string
}) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const progress = total > 0 ? Math.min(done / total, 1) : 0
  const dash = progress * circ

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={7}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color}
        strokeWidth={7}
        fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  )
}
