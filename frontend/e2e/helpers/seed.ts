import type { Page, BrowserContext } from '@playwright/test'

/**
 * Helpers de seeding para E2E hermeticos: sesion mock + estado de stores
 * inyectado en localStorage ANTES de que cargue la app, y red de Supabase
 * bloqueada para que los tests no dependan de (ni ensucien) produccion.
 *
 * Las claves de localStorage replican el shape de zustand/persist
 * ({ state, version }) y los nombres exactos de cada store.
 */

const SUPABASE_REF = 'wpvvfroutebiwckrenmq'

export interface SeedPlantOptions {
  id?: string
  name?: string
  location?: 'indoor' | 'outdoor'
  growMedium?: 'soil' | 'coco' | 'hydro'
  daysAgo?: number
  floraDaysAgo?: number
}

export interface SeedOptions {
  plan?: 'free' | 'pro'
  language?: 'es' | 'en'
  theme?: 'system' | 'light' | 'dark'
  onboarded?: boolean
  plants?: SeedPlantOptions[]
  /** Tareas simples de nutricion para hoy, por planta */
  tasksToday?: boolean
}

const MOCK_USER = {
  id: 'e2e-user-0001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e@cultitrack.test',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

/**
 * Bloquea toda la red de Supabase: los tests no tocan produccion.
 * El endpoint de refresh de token responde una sesion valida — sin esto,
 * el SDK entra en un loop de reintentos con backoff y la app queda varios
 * segundos en "Cargando...".
 */
export async function blockSupabase(context: BrowserContext): Promise<void> {
  await context.route(`**/${SUPABASE_REF}.supabase.co/**`, (route) => {
    const url = route.request().url()
    if (url.includes('/auth/v1/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-mock-token',
          refresh_token: 'e2e-mock-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
          user: MOCK_USER,
        }),
      })
    }
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"e2e: red bloqueada"}' })
  })
}

/** Navega dentro de la app autenticada y espera a que termine la carga de auth. */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path)
  const loading = page.getByText('Cargando...')
  if (await loading.isVisible().catch(() => false)) {
    await loading.waitFor({ state: 'hidden', timeout: 15_000 })
  }
}

/** Inyecta sesion + stores en localStorage antes de cargar la app. */
export async function seedApp(page: Page, opts: SeedOptions = {}): Promise<void> {
  const {
    plan = 'free',
    language = 'es',
    theme = 'dark',
    onboarded = true,
    plants = [],
    tasksToday = false,
  } = opts

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const plantRows = plants.map((p, i) => ({
    id: p.id ?? `e2e-plant-${i + 1}`,
    name: p.name ?? `Planta E2E ${i + 1}`,
    genetics: 'Northern Lights',
    geneticType: 'feminized',
    sex: 'unknown',
    startDate: new Date(now - (p.daysAgo ?? 20) * day).toISOString(),
    ...(p.floraDaysAgo != null
      ? { floraStartDate: new Date(now - p.floraDaysAgo * day).toISOString() }
      : {}),
    location: p.location ?? 'indoor',
    growMedium: p.growMedium ?? 'soil',
    potCount: 2,
    potVolumeLiters: 11,
    nutritionTableId: 'revegetar-v1',
    status: 'active',
  }))

  const taskRows = tasksToday
    ? plantRows.flatMap((pl) => [
        {
          id: `e2e-task-nut-${pl.id}`,
          plantId: pl.id,
          type: 'nutrition',
          scheduledDate: new Date(now).toISOString(),
          cycle: 'vege',
          week: 3,
          stage: 'growth',
          products: [
            { name: 'Rootproof', line: 'BIO', unit: 'ml', minDose: 3, maxDose: 5 },
            { name: 'Growth', line: 'FUEL', unit: 'ml', minDose: 2, maxDose: 2 },
          ],
          ecMin: 0.6, ecMax: 0.8, phMin: 5.5, phMax: 6,
          completed: false,
        },
        {
          id: `e2e-task-irr-${pl.id}`,
          plantId: pl.id,
          type: 'irrigation',
          scheduledDate: new Date(now).toISOString(),
          cycle: 'vege',
          week: 3,
          stage: 'growth',
          products: [],
          phMin: 5.5, phMax: 6,
          completed: false,
        },
      ])
    : []

  const session = {
    access_token: 'e2e-mock-token',
    refresh_token: 'e2e-mock-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(now / 1000) + 365 * 24 * 3600,
    user: {
      id: 'e2e-user-0001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@cultitrack.test',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }

  const userState = {
    userId: 'e2e-user-0001',
    email: 'e2e@cultitrack.test',
    // App.tsx tiene una migracion legacy: si hay name y !onboarded, marca
    // onboarded=true. Para testear el wizard el nombre debe ir vacio.
    name: onboarded ? 'Tester' : '',
    plan,
    potVolumeLiters: 11,
    theme,
    notificationsEnabled: false,
    reminderHour: 9,
    onboarded,
    language,
    streak: 0,
    bestStreak: 0,
    lastActivityDate: null,
    totalXP: 0,
  }

  await page.addInitScript(
    ({ ref, sess, user, plantsJson, tasksJson }) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess))
      localStorage.setItem('cultitrack-user', JSON.stringify({ state: user, version: 0 }))
      localStorage.setItem(
        'cultitrack-plants',
        JSON.stringify({ state: { plants: plantsJson, selectedPlantId: null, filter: 'active' }, version: 0 })
      )
      localStorage.setItem(
        'cultitrack-tasks',
        JSON.stringify({ state: { tasks: tasksJson, filter: 'all', loading: false }, version: 0 })
      )
    },
    { ref: SUPABASE_REF, sess: session, user: userState, plantsJson: plantRows, tasksJson: taskRows }
  )
}

/** Visitante sin sesion (limpia todo el storage). */
export async function seedAnonymous(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.clear())
}

/** Assert utilitario: la pagina no debe tener scroll horizontal. */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
}
