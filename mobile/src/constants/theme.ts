export const colors = {
  bg: {
    primary:  '#0C1410',
    surface:  '#131D14',
    elevated: '#1A2B1D',
    header:   '#1A3D1E',
  },
  border: {
    default: '#1C2E1E',
    focus:   '#52CC64',
    accent:  '#2A5A2E',
  },
  text: {
    primary:   '#E4F2E7',
    secondary: '#728C74',
    muted:     '#3A5040',
    green:     '#6DC278',
    brand:     '#52CC64',
  },
  brand: {
    green:     '#52CC64',
    greenDark: '#3DA64E',
    greenBg:   '#0D2010',
  },
  task: {
    nutrition:   '#22C55E',
    irrigation:  '#3B82F6',
    observation: '#F59E0B',
    foliar:      '#A855F7',
    harvest:     '#EF4444',
  },
  status: {
    error:   '#EF4444',
    warning: '#F59E0B',
    info:    '#3B82F6',
    success: '#22C55E',
  },
} as const

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
} as const

export const typography = {
  h1:    { fontSize: 32, fontWeight: '900' as const, color: '#E4F2E7' },
  h2:    { fontSize: 24, fontWeight: '800' as const, color: '#E4F2E7' },
  h3:    { fontSize: 18, fontWeight: '700' as const, color: '#E4F2E7' },
  body:  { fontSize: 15, fontWeight: '400' as const, color: '#E4F2E7' },
  small: { fontSize: 13, fontWeight: '400' as const, color: '#728C74' },
  label: { fontSize: 11, fontWeight: '700' as const, color: '#728C74', letterSpacing: 1.5, textTransform: 'uppercase' as const },
  brand: { fontSize: 15, fontWeight: '700' as const, color: '#52CC64' },
} as const

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const
