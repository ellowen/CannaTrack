/**
 * Exportacion de historial de cultivo en CSV.
 * Feature exclusivo del plan Pro.
 * Genera un CSV con todos los datos de una planta y lo comparte via Share Sheet.
 */
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Plant, ScheduledTask } from '@shared/types/plant'

export interface ExportData {
  plant:       Plant
  tasks:       ScheduledTask[]
  weekLogs:    WeekLogExport[]
  diagnoses:   DiagnosisExport[]
}

export interface WeekLogExport {
  date:      string
  weekLabel: string
  notes:     string
  photoUrl:  string | null
}

export interface DiagnosisExport {
  date:        string
  healthScore: number
  summary:     string
  issues:      string
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function row(...cols: (string | number | null | undefined)[]): string {
  return cols.map(escapeCsv).join(',')
}

/**
 * Genera y comparte un CSV con el historial completo de la planta.
 */
export async function exportPlantHistory(data: ExportData): Promise<void> {
  const { plant, tasks, weekLogs, diagnoses } = data
  const lines: string[] = []

  const fmt = (d: Date) => format(d, 'd MMM yyyy', { locale: es })

  // ── Informacion general ────────────────────────────────────────────────
  lines.push('INFORMACION GENERAL')
  lines.push(row('Nombre', plant.name))
  lines.push(row('Genetica', plant.genetics))
  lines.push(row('Tipo', plant.geneticType))
  lines.push(row('Ubicacion', plant.location))
  lines.push(row('Inicio', fmt(plant.startDate)))
  if (plant.floraStartDate) lines.push(row('Inicio Flora', fmt(plant.floraStartDate)))
  lines.push(row('Macetas', plant.potCount))
  lines.push(row('Volumen por maceta', `${plant.potVolumeLiters}L`))
  lines.push(row('Estado', plant.status))
  lines.push('')

  // ── Tareas completadas ─────────────────────────────────────────────────
  lines.push('TAREAS COMPLETADAS')
  lines.push(row('Fecha', 'Tipo', 'Semana', 'Etapa', 'EC Min', 'EC Max', 'PH Min', 'PH Max'))
  const completedTasks = tasks
    .filter(t => t.completed)
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
  for (const t of completedTasks) {
    lines.push(row(
      fmt(t.scheduledDate),
      t.type,
      t.week ?? '',
      t.stage ?? '',
      t.ecMin ?? '',
      t.ecMax ?? '',
      t.phMin ?? '',
      t.phMax ?? '',
    ))
  }
  lines.push('')

  // ── Diario semanal ─────────────────────────────────────────────────────
  if (weekLogs.length > 0) {
    lines.push('DIARIO SEMANAL')
    lines.push(row('Fecha', 'Semana', 'Notas', 'Foto'))
    for (const log of weekLogs) {
      lines.push(row(log.date, log.weekLabel, log.notes, log.photoUrl ?? ''))
    }
    lines.push('')
  }

  // ── Diagnosticos IA ────────────────────────────────────────────────────
  if (diagnoses.length > 0) {
    lines.push('DIAGNOSTICOS IA')
    lines.push(row('Fecha', 'Puntaje de Salud', 'Resumen', 'Problemas'))
    for (const d of diagnoses) {
      lines.push(row(d.date, d.healthScore, d.summary, d.issues))
    }
    lines.push('')
  }

  // ── Escribir y compartir ───────────────────────────────────────────────
  const filename  = `cannatrack_${plant.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  const filepath  = FileSystem.cacheDirectory + filename
  const content   = '﻿' + lines.join('\n')  // BOM para que Excel lo abra bien

  await FileSystem.writeAsStringAsync(filepath, content, { encoding: FileSystem.EncodingType.UTF8 })

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) throw new Error('La funcion de compartir no esta disponible en este dispositivo.')

  await Sharing.shareAsync(filepath, {
    mimeType: 'text/csv',
    dialogTitle: `Exportar historial de ${plant.name}`,
    UTI: 'public.comma-separated-values-text',
  })
}
