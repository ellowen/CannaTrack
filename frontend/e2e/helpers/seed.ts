import type { Page, BrowserContext } from '@playwright/test'

/**
 * Helpers de seeding para E2E hermeticos: sesion mock + estado de stores
 * inyectado en localStorage ANTES de que cargue la app, y red de Supabase
 * bloqueada para que los tests no dependan de (ni ensucien) produccion.
 *
 * IMPORTANTE: AuthContext, al iniciar, llama a loadPlantsFromSupabase /
 * loadTasksFromSupabase y hace setPlants(...)/setAllTasks(...) con lo que
 * el "servidor" responda — pisando lo que haya en localStorage. Por eso
 * blockSupabase mockea tambien /rest/v1/plants y /rest/v1/scheduled_tasks
 * con las MISMAS filas (en forma de fila de DB) que seedApp siembra en
 * localStorage (en forma de estado de store). Si solo se mockeara el auth,
 * el "servidor" devolveria implicitamente [] y borraria el seed local.
 */

const SUPABASE_REF = 'wpvvfroutebiwckrenmq'

/**
 * Postgres `date` (sin hora) SIEMPRE devuelve "YYYY-MM-DD" via REST, nunca
 * un timestamp completo. parseDateOnly() de la app espera exactamente ese
 * formato -- un timestamp completo (con "T...Z") la rompe silenciosamente
 * (produce un Invalid Date que despues explota en date-fns.format()).
 * Usar esto para start_date/flora_start_date/scheduled_date/log_date, NUNCA
 * .toISOString() directo, para que el mock refleje lo que Supabase real
 * devuelve.
 */
function toDateOnly(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

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

export interface MockProfileOptions {
  is_pro?: boolean
  /** ISO string. Por defecto, 30 dias adelante (trial recien empezado). */
  trial_ends_at?: string
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

function defaultProfile(): Record<string, unknown> {
  return {
    id: MOCK_USER.id,
    username: 'Tester',
    is_pro: false,
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    streak_days: 0,
    xp: 0,
    theme: 'system',
    notifications_enabled: true,
  }
}

interface MockState {
  profile: Record<string, unknown>
  plants: Record<string, unknown>[]
  tasks: Record<string, unknown>[]
  /** Si es true, /auth/v1/token responde 401 (simula sesion invalida/expirada sin refresh posible). */
  authShouldFail: boolean
  /** task_id de cada llamada a la RPC handle_task_completion (otorgado XP), para asserts. */
  xpAwardedCalls: string[]
}

type ContextWithMockState = BrowserContext & { __mockState?: MockState }

/**
 * Bloquea toda la red de Supabase: los tests no tocan produccion.
 * - /auth/v1/token responde una sesion valida (sin esto el SDK entra en
 *   backoff de reintentos y la app queda varios segundos en "Cargando...")
 * - /rest/v1/profiles, /plants y /scheduled_tasks responden datos mock,
 *   mutables via setMockProfile / seedApp durante el test.
 * - cualquier otro request a Supabase devuelve 503 (measurements, week_logs,
 *   storage: no hay tests que dependan de datos precargados ahi).
 */
export async function blockSupabase(context: BrowserContext): Promise<void> {
  const state: MockState = { profile: defaultProfile(), plants: [], tasks: [], authShouldFail: false, xpAwardedCalls: [] }
  ;(context as ContextWithMockState).__mockState = state

  await context.route(`**/${SUPABASE_REF}.supabase.co/**`, (route) => {
    const url = route.request().url()
    if (url.includes('/auth/v1/logout')) {
      return route.fulfill({ status: 204, body: '' })
    }
    if (url.includes('/auth/v1/token')) {
      if (state.authShouldFail) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh Token Not Found' }),
        })
      }
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
      if (state.authShouldFail) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"invalid token"}' })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) })
    }
    if (url.includes('/rest/v1/profiles')) {
      if (state.authShouldFail) {
        // Forma real observada contra Supabase con un JWT invalido/vencido.
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'PGRST301', details: null, hint: null, message: 'Expected 3 parts in JWT; got 1' }),
        })
      }
      const method = route.request().method()
      if (method === 'PATCH') {
        const patch = route.request().postDataJSON() as Record<string, unknown>
        state.profile = { ...state.profile, ...patch }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.profile) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.profile) })
    }
    if (url.includes('/rest/v1/plants')) {
      const method = route.request().method()
      if (method === 'PATCH') {
        const idMatch = url.match(/[?&]id=eq\.([^&]+)/)
        const patch = route.request().postDataJSON() as Record<string, unknown>
        if (idMatch) {
          const id = decodeURIComponent(idMatch[1])
          state.plants = state.plants.map((p) => (p.id === id ? { ...p, ...patch } : p))
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.plants) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.plants) })
    }
    if (url.includes('/rest/v1/scheduled_tasks')) {
      const method = route.request().method()
      const idMatch = url.match(/[?&]id=eq\.([^&]+)/)
      if (method === 'PATCH' && idMatch) {
        const id = decodeURIComponent(idMatch[1])
        const patch = route.request().postDataJSON() as Record<string, unknown>
        state.tasks = state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
        const task = state.tasks.find((t) => t.id === id)
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(task ?? null) })
      }
      // .single() (usado por completeTaskInSupabase antes de la RPC de XP)
      // pide un objeto, no un array — PostgREST real devuelve 406/objeto
      // segun el Accept header; acá alcanza con detectar el filtro id=eq.
      if (idMatch) {
        const id = decodeURIComponent(idMatch[1])
        const task = state.tasks.find((t) => t.id === id)
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(task ?? null) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.tasks) })
    }
    if (url.includes('/rest/v1/rpc/handle_task_completion')) {
      const body = route.request().postDataJSON() as { task_id_param: string; user_id_param: string }
      const task = state.tasks.find((t) => t.id === body.task_id_param)
      if (task) {
        task.completed = true
        task.completed_at = new Date().toISOString()
      }
      state.xpAwardedCalls.push(body.task_id_param)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ xp_gained: 15, new_streak: 1 }),
      })
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"e2e: red bloqueada"}' })
  })
}

/** task_id de cada llamada real a la RPC handle_task_completion (otorgamiento de XP). */
export function getXpAwardedCalls(context: BrowserContext): string[] {
  const state = (context as ContextWithMockState).__mockState
  if (!state) throw new Error('getXpAwardedCalls: llamar blockSupabase(context) primero')
  return state.xpAwardedCalls
}

/** Simula una sesion invalida/expirada sin posibilidad de refresh (401 + refresh fallido). */
export function simulateAuthFailure(context: BrowserContext): void {
  const state = (context as ContextWithMockState).__mockState
  if (!state) throw new Error('simulateAuthFailure: llamar blockSupabase(context) primero')
  state.authShouldFail = true
}

/** Ajusta el profile mock (is_pro / trial_ends_at) para el resto del test. Llamar despues de blockSupabase. */
export function setMockProfile(context: BrowserContext, opts: MockProfileOptions): void {
  const state = (context as ContextWithMockState).__mockState
  if (!state) throw new Error('setMockProfile: llamar blockSupabase(context) primero')
  state.profile = { ...defaultProfile(), ...opts }
}

/** Navega dentro de la app autenticada y espera a que termine la carga de auth. */
/**
 * Navega y espera a que la app termine de cargar. "Cargando..." puede
 * aparecer en DOS fases secuenciales y separadas que comparten el mismo
 * texto: el auth-check de ProtectedRoute, y el fallback de <Suspense> del
 * chunk lazy de la ruta (code splitting por ruta). Un solo chequeo de
 * isVisible() antes de esperar puede perderse la segunda fase si arranca
 * justo despues de que la primera ya desaparecio -- carrera que Chromium
 * (mas rapido) casi nunca pierde pero WebKit si, de forma intermitente
 * (confirmado en CI: mismos tests, mismos datos, fallan solo a veces).
 * Loop acotado en vez de un chequeo unico: sin isVisible() racy, y usando
 * count() (no strict-mode-sensible) para tolerar 0, 1 o mas coincidencias.
 */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path)
  const loading = page.getByText('Cargando...')
  for (let i = 0; i < 3; i++) {
    if ((await loading.count()) === 0) break
    await loading.first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
  }
}

/**
 * Inyecta sesion + stores en localStorage antes de cargar la app, y
 * sincroniza el mock REST (plants/scheduled_tasks) con los mismos datos
 * para que AuthContext no los pise al montar. Requiere blockSupabase(context)
 * ya llamado en el mismo test/beforeEach.
 */
export async function seedApp(page: Page, context: BrowserContext, opts: SeedOptions = {}): Promise<void> {
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
    startDate: toDateOnly(now - (p.daysAgo ?? 20) * day),
    ...(p.floraDaysAgo != null
      ? { floraStartDate: toDateOnly(now - p.floraDaysAgo * day) }
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
          scheduledDate: toDateOnly(now),
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
          scheduledDate: toDateOnly(now),
          cycle: 'vege',
          week: 3,
          stage: 'growth',
          products: [],
          phMin: 5.5, phMax: 6,
          completed: false,
        },
      ])
    : []

  // Sincronizar el mock REST con lo mismo que se siembra en localStorage
  // (en forma de fila de DB), asi AuthContext no las pisa con [].
  const state = (context as ContextWithMockState).__mockState
  if (!state) throw new Error('seedApp: llamar blockSupabase(context) primero')
  // El plan efectivo (free/trial/pro) se resuelve en el frontend a partir
  // de is_pro + trial_ends_at (ver src/lib/plan.ts) — NO alcanza con tocar
  // is_pro solo. defaultProfile() trae trial_ends_at a 30 dias (trial
  // vigente) por defecto, asi que pedir `plan: 'free'` sin tambien limpiar
  // el trial seguiria dando acceso Pro-equivalente. Salvo que el test ya
  // haya fijado is_pro/trial_ends_at explicitamente via setMockProfile
  // (p.ej. para probar plan!==is_pro a proposito, como en subscription.spec.ts).
  //
  // 'free' de test = usuario SIN trial nunca (trial_ends_at null), no un
  // trial vencido -- eso es un escenario DISTINTO (bloqueo duro, ver
  // subscription.spec.ts "trial vencido"). Con trial_ends_at ausente,
  // useSubscription() da isBlocked:false (estado 'unknown') pero
  // resolvePlanTier() igual da 'free' -- exactamente lo que estas pruebas
  // de gates necesitan: limites Free visibles, sin la pantalla de bloqueo.
  if (opts.plan !== undefined) {
    state.profile = {
      ...state.profile,
      is_pro: plan === 'pro',
      trial_ends_at: plan === 'pro' ? state.profile.trial_ends_at : null,
    }
  }
  // AuthContext tambien llama setUser(..., profile.username), que repuebla
  // userStore.name. Si el test simula un usuario sin onboarding (name=''
  // a proposito, ver mas abajo), el profile mock no puede traer un username
  // no vacio o revierte el name y dispara la migracion legacy de App.tsx.
  if (!onboarded) {
    state.profile = { ...state.profile, username: null }
  }
  state.plants = plantRows.map((p) => ({
    id: p.id,
    user_id: MOCK_USER.id,
    name: p.name,
    genetics: p.genetics,
    genetic_type: p.geneticType,
    sex: p.sex,
    start_date: p.startDate,
    flora_start_date: (p as { floraStartDate?: string }).floraStartDate ?? null,
    auto_flower_total_days: 75,
    location: p.location,
    grow_medium: p.growMedium,
    pot_count: p.potCount,
    pot_volume_liters: p.potVolumeLiters,
    nutrition_table_id: p.nutritionTableId,
    available_products: [],
    status: p.status,
    notes: null,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  }))
  state.tasks = taskRows.map((t) => ({
    id: t.id,
    plant_id: t.plantId,
    user_id: MOCK_USER.id,
    type: t.type,
    scheduled_date: t.scheduledDate,
    cycle: t.cycle,
    week: t.week,
    stage: t.stage,
    products: t.products,
    ec_min: (t as { ecMin?: number }).ecMin ?? null,
    ec_max: (t as { ecMax?: number }).ecMax ?? null,
    ph_min: t.phMin,
    ph_max: t.phMax,
    completed: t.completed,
    completed_at: null,
    completion_notes: null,
    xp_awarded: false,
    created_at: new Date(now).toISOString(),
  }))

  const session = {
    access_token: 'e2e-mock-token',
    refresh_token: 'e2e-mock-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(now / 1000) + 365 * 24 * 3600,
    user: MOCK_USER,
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

/**
 * Lista los botones/links/switches visibles mas chicos que `min` px en
 * cualquier dimension. Umbral practico de 38px (Apple recomienda 44,
 * Material 48) para no marcar falsos positivos en pills bien diseñados.
 */
export async function getSmallTouchTargets(page: Page, min = 38): Promise<{ text: string; w: number; h: number }[]> {
  return page.evaluate((minPx) => {
    const out: { text: string; w: number; h: number }[] = []
    document.querySelectorAll('button, a, [role="button"], [role="switch"]').forEach((el) => {
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') return
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return
      if (r.width < minPx || r.height < minPx) {
        out.push({ text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) })
      }
    })
    return out
  }, min)
}
