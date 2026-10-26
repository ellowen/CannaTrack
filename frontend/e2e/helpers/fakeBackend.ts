import type { BrowserContext, Route } from '@playwright/test'

/**
 * Backend Supabase simulado CON ESTADO para los E2E de punta a punta.
 *
 * blockSupabase() (seed.ts) alcanza para sembrar y leer, pero no persiste
 * altas, bajas ni cambios de plantas/tareas ni sabe nada de mediciones,
 * diario, fotos, RPC de floracion o borrado de cuenta. Este modulo agrega
 * una semantica PostgREST minima (eq/neq/in/is/not.is, order, limit, count,
 * single, upsert, patch, delete, return=representation) sobre arrays en
 * memoria, para que un reload de la pagina "vuelva" a leer lo que la app
 * escribio, igual que contra Supabase real.
 *
 * Uso: llamar blockSupabase(context) y DESPUES installFakeBackend(context).
 * Los handlers de Playwright se evaluan del ultimo al primero: este toma lo
 * que sabe resolver y deja pasar (route.fallback) auth, profiles y la RPC de
 * completado de tareas al handler de blockSupabase.
 */

type Row = Record<string, unknown>

interface MockStateShape {
  profile: Row
  plants: Row[]
  tasks: Row[]
  xpAwardedCalls: string[]
}

export interface FakeBackend {
  /** Tablas que no viven en el estado de blockSupabase (measurements, week_logs, ...). */
  tables: Record<string, Row[]>
  /** Paths de storage subidos (bucket/path). */
  storageObjects: Set<string>
  /** Llamadas a funciones edge: { name, body }. */
  functionCalls: { name: string; body: unknown }[]
  /** Cada request a /rest/v1 y /functions: "METHOD tabla-o-funcion". */
  log: string[]
  /** Simula que la funcion delete-account falla (para probar el mensaje de error). */
  failDeleteAccount: boolean
  /** Servidor inalcanzable: toda request a Supabase se aborta (ver setOffline). */
  offline: boolean
}

type ContextWithState = BrowserContext & { __mockState?: MockStateShape; __fake?: FakeBackend }

const USER_ID = 'e2e-user-0001'
// PNG 1x1 transparente
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

function json(route: Route, status: number, body: unknown, headers: Record<string, string> = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    // Supabase real expone content-range al navegador (necesario para los counts)
    headers: { 'access-control-expose-headers': 'content-range', ...headers },
    body: body === undefined ? '' : JSON.stringify(body),
  })
}

function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, raw] of params.entries()) {
    if (RESERVED_PARAMS.has(key)) continue
    const value = String(row[key] ?? 'null')
    if (raw.startsWith('eq.')) { if (value !== raw.slice(3)) return false }
    else if (raw.startsWith('neq.')) { if (value === raw.slice(4)) return false }
    else if (raw.startsWith('in.')) {
      const list = raw.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''))
      if (!list.includes(value)) return false
    }
    else if (raw === 'is.null') { if (row[key] != null) return false }
    else if (raw === 'not.is.null') { if (row[key] == null) return false }
    else if (raw.startsWith('is.')) { if (value !== raw.slice(3)) return false }
  }
  return true
}

function sortRows(rows: Row[], order: string | null): Row[] {
  if (!order) return rows
  const [col, dir] = order.split('.')
  const sign = dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = String(a[col] ?? '')
    const y = String(b[col] ?? '')
    return x < y ? -sign : x > y ? sign : 0
  })
}

function parseBody(route: Route): unknown {
  try { return route.request().postDataJSON() } catch { return undefined }
}

export async function installFakeBackend(context: BrowserContext): Promise<FakeBackend> {
  const ctx = context as ContextWithState
  const state = ctx.__mockState
  if (!state) throw new Error('installFakeBackend: llamar blockSupabase(context) primero')

  const fake: FakeBackend = {
    tables: {}, storageObjects: new Set(), functionCalls: [], log: [], failDeleteAccount: false, offline: false,
  }
  ctx.__fake = fake

  const table = (name: string): Row[] => {
    if (name === 'plants') return state.plants
    if (name === 'scheduled_tasks') return state.tasks
    return (fake.tables[name] ??= [])
  }
  const setTable = (name: string, rows: Row[]) => {
    if (name === 'plants') state.plants = rows
    else if (name === 'scheduled_tasks') state.tasks = rows
    else fake.tables[name] = rows
  }

  await context.route(/\/(rest|storage|functions)\/v1\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname

    // ── Storage ────────────────────────────────────────────────────────────
    if (path.includes('/storage/v1/')) {
      const sign = path.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/)
      if (sign && method === 'POST') {
        return json(route, 200, { signedURL: `/object/sign/${sign[1]}/${sign[2]}?token=e2e` })
      }
      if (sign && method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
      }
      const upload = path.match(/\/storage\/v1\/object\/([^/]+)\/(.+)$/)
      if (upload && (method === 'POST' || method === 'PUT')) {
        fake.storageObjects.add(`${upload[1]}/${decodeURIComponent(upload[2])}`)
        fake.log.push(`UPLOAD ${upload[1]}`)
        return json(route, 200, { Key: `${upload[1]}/${upload[2]}`, Id: 'e2e-object' })
      }
      if (method === 'DELETE') {
        const body = parseBody(route) as { prefixes?: string[] } | undefined
        for (const p of body?.prefixes ?? []) fake.storageObjects.delete(`plant-photos/${p}`)
        fake.log.push('DELETE storage')
        return json(route, 200, [])
      }
      return route.fallback()
    }

    // ── Funciones edge ─────────────────────────────────────────────────────
    const fn = path.match(/\/functions\/v1\/([^/]+)/)
    if (fn) {
      const name = fn[1]
      const body = parseBody(route)
      fake.functionCalls.push({ name, body })
      fake.log.push(`FUNCTION ${name}`)
      if (name === 'delete-account') {
        if (fake.failDeleteAccount) return json(route, 500, { error: 'e2e: fallo simulado' })
        return json(route, 200, { success: true })
      }
      return json(route, 404, { error: `e2e: funcion no simulada (${name})` })
    }

    // ── RPC ────────────────────────────────────────────────────────────────
    const rpc = path.match(/\/rest\/v1\/rpc\/([^/]+)/)
    if (rpc) {
      if (rpc[1] === 'start_flora_phase' && method === 'POST') {
        const body = parseBody(route) as { p_plant_id: string; p_flora_start_date: string; p_tasks: Row[] }
        fake.log.push('RPC start_flora_phase')
        state.plants = state.plants.map((p) =>
          p.id === body.p_plant_id ? { ...p, flora_start_date: body.p_flora_start_date } : p,
        )
        state.tasks = state.tasks.filter((t) => !(t.plant_id === body.p_plant_id && t.cycle === 'flora'))
        for (const t of body.p_tasks) {
          state.tasks.push({
            id: crypto.randomUUID(), plant_id: body.p_plant_id, user_id: USER_ID,
            completed: false, completed_at: null, completion_notes: null, xp_awarded: false,
            created_at: new Date().toISOString(), ...t,
          })
        }
        return json(route, 200, null)
      }
      if (rpc[1] === 'handle_task_completion' && method === 'POST') {
        // Efecto del RPC real: otorga XP una sola vez por tarea y actualiza el perfil.
        const body = parseBody(route) as { task_id_param: string }
        const task = state.tasks.find((t) => t.id === body.task_id_param)
        fake.log.push('RPC handle_task_completion')
        state.xpAwardedCalls.push(body.task_id_param)
        if (task) { task.completed = true; task.completed_at = new Date().toISOString(); task.xp_awarded = true }
        const streak = Math.max(1, Number(state.profile.streak_days ?? 0))
        state.profile = {
          ...state.profile,
          xp: Number(state.profile.xp ?? 0) + 15,
          streak_days: streak,
        }
        return json(route, 200, { xp_gained: 15, new_streak: streak })
      }
      return route.fallback()
    }

    // ── Tablas ─────────────────────────────────────────────────────────────
    const m = path.match(/\/rest\/v1\/([a-z_]+)$/)
    if (!m) return route.fallback()
    const name = m[1]
    // profiles y todo lo no listado lo resuelve blockSupabase.
    const MANAGED = new Set([
      'plants', 'scheduled_tasks', 'measurements', 'week_logs', 'push_subscriptions', 'ai_usage',
    ])
    if (!MANAGED.has(name)) return route.fallback()
    fake.log.push(`${method} ${name}`)

    const params = url.searchParams
    const rows = table(name)
    const prefer = request.headers()['prefer'] ?? ''
    const wantsRepresentation = prefer.includes('return=representation')

    if (method === 'GET' || method === 'HEAD') {
      let result = rows.filter((r) => matches(r, params))
      result = sortRows(result, params.get('order'))
      const limit = params.get('limit')
      if (limit) result = result.slice(0, Number(limit))
      const range = result.length ? `0-${result.length - 1}/${rows.filter((r) => matches(r, params)).length}` : '*/0'
      const headers = { 'content-range': range }
      if (method === 'HEAD') {
        return route.fulfill({ status: 200, headers: { ...headers, 'access-control-expose-headers': 'content-range' }, body: '' })
      }
      if ((request.headers()['accept'] ?? '').includes('vnd.pgrst.object')) {
        if (result.length !== 1) {
          return json(route, 406, { code: 'PGRST116', details: `${result.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' })
        }
        return json(route, 200, result[0], headers)
      }
      return json(route, 200, result, headers)
    }

    if (method === 'POST') {
      const body = parseBody(route)
      const incoming = (Array.isArray(body) ? body : [body]) as Row[]
      const upsert = prefer.includes('resolution=merge-duplicates')
      const saved: Row[] = []
      const now = new Date().toISOString()
      for (const item of incoming) {
        const existing = upsert && item.id ? rows.find((r) => r.id === item.id) : undefined
        if (existing) {
          Object.assign(existing, item, { updated_at: now })
          saved.push(existing)
        } else {
          const row = { id: crypto.randomUUID(), created_at: now, ...item }
          rows.push(row)
          saved.push(row)
        }
      }
      setTable(name, rows)
      return wantsRepresentation ? json(route, 201, saved) : route.fulfill({ status: 201, body: '' })
    }

    if (method === 'PATCH') {
      const patch = parseBody(route) as Row
      const touched: Row[] = []
      for (const r of rows) if (matches(r, params)) { Object.assign(r, patch); touched.push(r) }
      return wantsRepresentation ? json(route, 200, touched) : route.fulfill({ status: 204, body: '' })
    }

    if (method === 'DELETE') {
      const removed = rows.filter((r) => matches(r, params))
      setTable(name, rows.filter((r) => !matches(r, params)))
      return wantsRepresentation ? json(route, 200, removed) : route.fulfill({ status: 204, body: '' })
    }

    return route.fallback()
  })

  // Se registra al final => se evalua primero: sin conexion, ninguna request llega a
  // los handlers (context.setOffline NO alcanza: los handlers de route las responden igual).
  await context.route(/supabase\.co\//, (route) =>
    fake.offline ? route.abort('internetdisconnected') : route.fallback(),
  )

  return fake
}

/**
 * Corta o restablece la conexion: el navegador (navigator.onLine y eventos
 * online/offline) y el "servidor" simulado a la vez.
 */
export async function setOffline(context: BrowserContext, offline: boolean): Promise<void> {
  getFakeBackend(context).offline = offline
  await context.setOffline(offline)
}

/** Accede al backend simulado de un context (instalado con installFakeBackend). */
export function getFakeBackend(context: BrowserContext): FakeBackend {
  const fake = (context as ContextWithState).__fake
  if (!fake) throw new Error('getFakeBackend: llamar installFakeBackend(context) primero')
  return fake
}

/** Filas actuales de plants (forma de fila de DB) para asserts de persistencia. */
export function dbPlants(context: BrowserContext): Row[] {
  const s = (context as ContextWithState).__mockState
  if (!s) throw new Error('dbPlants: blockSupabase primero')
  return s.plants
}

export function dbTasks(context: BrowserContext): Row[] {
  const s = (context as ContextWithState).__mockState
  if (!s) throw new Error('dbTasks: blockSupabase primero')
  return s.tasks
}

/** Fila actual de profiles (para asserts de lo que la app guardo en el servidor). */
export function dbProfile(context: BrowserContext): Row {
  const s = (context as ContextWithState).__mockState
  if (!s) throw new Error('dbProfile: blockSupabase primero')
  return s.profile
}
