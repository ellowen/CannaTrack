// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const insert = vi.fn(() => ({ then: (ok: () => void) => { ok(); return undefined } }))
vi.mock('@/lib/auth', () => ({ supabase: { from: vi.fn(() => ({ insert })) } }))

describe('track', () => {
  beforeEach(() => {
    vi.resetModules()
    insert.mockClear()
    vi.stubEnv('MODE', 'production')
    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true })
    Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true })
    sessionStorage.clear()
    document.documentElement.lang = 'es'
  })
  afterEach(() => { vi.unstubAllEnvs() })

  it('envia el evento con sesion anonima, ruta, idioma y props', async () => {
    const { track } = await import('../analytics')
    track('plant_created', { crop: 'cannabis' })
    expect(insert).toHaveBeenCalledTimes(1)
    const row = (insert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    expect(row).toMatchObject({ name: 'plant_created', lang: 'es', props: { crop: 'cannabis' } })
    expect(row.session_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(row).not.toHaveProperty('email')
    expect(row).not.toHaveProperty('user_id')
  })

  it('la sesion es la misma en toda la visita', async () => {
    const { track } = await import('../analytics')
    track('landing_view')
    track('landing_cta', { where: 'hero' })
    const ids = insert.mock.calls.map((c) => ((c as unknown[])[0] as { session_id: string }).session_id)
    expect(ids[0]).toBe(ids[1])
  })

  it('no mide con No rastrear ni con automatizacion', async () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true })
    let mod = await import('../analytics')
    mod.track('landing_view')
    Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true })
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
    vi.resetModules()
    mod = await import('../analytics')
    mod.track('landing_view')
    expect(insert).not.toHaveBeenCalled()
  })
})
