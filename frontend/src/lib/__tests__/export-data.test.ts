import { describe, it, expect } from 'vitest'
import { buildExport, exportFilename } from '../export-data'

describe('export-data', () => {
  it('arma el archivo con marca de app, version y fecha ISO', () => {
    const out = buildExport(
      { plants: [], tasks: [], weekLogs: [], measurements: [], profile: { name: 'Lu', language: 'es' } },
      new Date('2026-10-28T12:00:00Z'),
    )
    expect(out.app).toBe('CultiTrack')
    expect(out.version).toBe(1)
    expect(out.exportedAt).toBe('2026-10-28T12:00:00.000Z')
    expect(out.profile.name).toBe('Lu')
  })

  it('las fechas de las plantas se serializan como ISO y vuelven a parsearse', () => {
    const startDate = new Date('2026-08-01T00:00:00Z')
    const out = buildExport({
      plants: [{ id: 'p1', startDate } as never],
      tasks: [], weekLogs: [], measurements: [], profile: { name: '', language: 'es' },
    })
    const json = JSON.parse(JSON.stringify(out)) as { plants: { startDate: string }[] }
    expect(json.plants[0].startDate).toBe('2026-08-01T00:00:00.000Z')
  })

  it('el nombre del archivo lleva la fecha local con ceros', () => {
    expect(exportFilename(new Date(2026, 0, 5))).toBe('cultitrack-export-2026-01-05.json')
  })
})
