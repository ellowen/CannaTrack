import type { Plant, ScheduledTask } from '@/types/plant'
import type { WeekLog } from '@/types/weekLog'
import type { MeasurementLog } from '@/types/measurement'

export interface ExportInput {
  plants: Plant[]
  tasks: ScheduledTask[]
  weekLogs: WeekLog[]
  measurements: MeasurementLog[]
  profile: { name: string; language: string }
}

export interface DataExport extends ExportInput {
  app: 'CultiTrack'
  version: 1
  exportedAt: string
}

/**
 * Arma el archivo de exportacion de los datos del usuario (portabilidad).
 * Las fechas (Date) salen como ISO al serializar con JSON.stringify.
 */
export function buildExport(input: ExportInput, now: Date = new Date()): DataExport {
  return { app: 'CultiTrack', version: 1, exportedAt: now.toISOString(), ...input }
}

/** Nombre del archivo, con la fecha local para que no se pisen exportaciones de distintos dias. */
export function exportFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `cultitrack-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

/** Dispara la descarga del JSON en el navegador. */
export function downloadExport(data: DataExport, now: Date = new Date()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename(now)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
