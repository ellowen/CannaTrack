import { useState } from 'react'
import { clsx } from 'clsx'
import type { Plant, ScheduledTask } from '@/types/plant'
import { useTaskStore } from '@/store/taskStore'
import { useMeasurementStore } from '@/store/measurementStore'
import { useUserStore } from '@/store/userStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { getRangesForDate, getLineColor } from '@/lib/nutrition-utils'
import { XP } from '@/lib/gamification'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface CompleteTaskSheetProps {
  isOpen: boolean
  task: ScheduledTask
  plant: Plant
  onClose: () => void
  onSave?: (ec?: number, ph?: number, temp?: number, notes?: string) => void
}

type ValidationStatus = 'ok' | 'warn' | 'error'

function getValidationStatus(value: number, min: number, max: number): ValidationStatus {
  if (value >= min && value <= max) return 'ok'
  const tolerance = 0.2
  if (value >= min - tolerance && value <= max + tolerance) return 'warn'
  return 'error'
}


function getValidationIcon(status: ValidationStatus): string {
  switch (status) {
    case 'ok':
      return '✓'
    case 'warn':
      return '≈'
    case 'error':
      return '⚠️'
  }
}

function getXPForTaskType(taskType: string): number {
  const xpMap: Record<string, number> = {
    nutrition: XP.COMPLETE_WITH_MEASUREMENT,
    irrigation: 5,
    foliar: 8,
    observation: 3,
    harvest: 100,
  }
  return xpMap[taskType] ?? 10
}

export default function CompleteTaskSheet({
  isOpen,
  task,
  plant,
  onClose,
  onSave,
}: CompleteTaskSheetProps) {
  const completeTask = useTaskStore((s) => s.completeTask)
  const addLog = useMeasurementStore((s) => s.addLog)
  const addXP = useUserStore((s) => s.addXP)
  const tables = useNutritionStore((s) => s.tables)

  const [ecValue, setEcValue] = useState('')
  const [phValue, setPhValue] = useState('')
  const [tempValue, setTempValue] = useState('')
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [xpReward, setXpReward] = useState<{
    xpGained: number
    streakBonus: number
    newStreak: number
  } | null>(null)

  const table = tables.find((t: typeof tables[0]) => t.id === plant.nutritionTableId)
  const ranges = table ? getRangesForDate(plant, table, task.scheduledDate) : null

  const ecStatus =
    ecValue && ranges
      ? getValidationStatus(parseFloat(ecValue), ranges.ecMin, ranges.ecMax)
      : 'ok'
  const phStatus =
    phValue && ranges
      ? getValidationStatus(parseFloat(phValue), ranges.phMin, ranges.phMax)
      : 'ok'

  const hasError = (ecValue && !isValidNumber(ecValue)) || (phValue && !isValidNumber(phValue))

  function isValidNumber(val: string): boolean {
    return val === '' || (!isNaN(parseFloat(val)) && isFinite(parseFloat(val)))
  }

  function handleSkip() {
    completeTask(task.id, undefined)
    setSuccess(true)
    setTimeout(() => {
      onClose()
      setSuccess(false)
    }, 1400)
  }

  function handleSave() {
    if (hasError) {
      setError('Valores inválidos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const ec = ecValue ? parseFloat(ecValue) : undefined
      const ph = phValue ? parseFloat(phValue) : undefined
      const temp = tempValue ? parseFloat(tempValue) : undefined

      // Guardar mediciones si existen
      if (ec !== undefined && ph !== undefined) {
        addLog({
          plantId: plant.id,
          logDate: new Date(),
          ec,
          ph,
          tempCelsius: temp,
        })
      }

      // Completar tarea
      completeTask(task.id, notes || undefined)

      // Calcular y otorgar XP
      const baseXP = getXPForTaskType(task.type)
      const xpResult = addXP(baseXP)
      setXpReward(xpResult)
      setSuccess(true)

      // Llamar callback si existe
      if (onSave) {
        onSave(ec, ph, temp, notes || undefined)
      }

      setTimeout(() => {
        onClose()
        setSuccess(false)
        setXpReward(null)
      }, 1400)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className={clsx(
          'bg-white dark:bg-app-bg w-full md:w-full md:max-w-md rounded-t-3xl md:rounded-2xl',
          'shadow-xl dark:shadow-2xl overflow-hidden transition-all duration-300',
          'max-h-[90vh] overflow-y-auto'
        )}
      >
        {/* ── Drag Handle ─────────────────────────────────────────────────── */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1 w-12 bg-app-border rounded-full"></div>
        </div>

        {/* ── Content Wrapper ─────────────────────────────────────────────── */}
        <div className="p-6 md:p-8">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {task.type === 'nutrition'
                  ? '💧'
                  : task.type === 'irrigation'
                    ? '💧'
                    : task.type === 'foliar'
                      ? '🌿'
                      : task.type === 'observation'
                        ? '👁️'
                        : task.type === 'harvest'
                          ? '✂️'
                          : '📋'}
              </span>
              <h2 className="text-xl font-bold text-ink-1 dark:text-ink-1">
                {task.type === 'nutrition'
                  ? 'Nutrición'
                  : task.type === 'irrigation'
                    ? 'Riego'
                    : task.type === 'foliar'
                      ? 'Foliar'
                      : task.type === 'observation'
                        ? 'Observación'
                        : 'Cosecha'}{' '}
                completada
              </h2>
            </div>
            <p className="text-sm text-ink-3 dark:text-ink-3">
              {plant.name} · {task.stage.charAt(0).toUpperCase() + task.stage.slice(1)} · Semana{' '}
              {task.week}
            </p>
          </div>

          {/* ── Recipe Section (Collapsible) ─────────────────────────────── */}
          {table && task.products.length > 0 && (
            <Card className="mb-6 p-0 border dark:border-app-border">
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-app-elevated dark:hover:bg-app-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="font-semibold text-ink-1 dark:text-ink-1">
                    Nutrición - {table.name}
                  </span>
                </div>
                <span
                  className={clsx(
                    'text-ink-3 transition-transform duration-200',
                    expanded && 'rotate-180'
                  )}
                >
                  ▼
                </span>
              </button>

              {expanded && (
                <div className="px-4 pb-4 border-t dark:border-app-border space-y-2">
                  {task.products.map((product) => (
                    <div key={product.name} className="flex justify-between items-center text-sm">
                      <span className="text-ink-2 dark:text-ink-2">{product.name}</span>
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          getLineColor(product.line, table)
                        )}
                      >
                        {product.minDose}-{product.maxDose} {product.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── Measurements Section ────────────────────────────────────── */}
          <div className="space-y-4 mb-6">
            {/* EC Input */}
            <div>
              <label className="block text-sm font-semibold text-ink-1 dark:text-ink-1 mb-2">
                <span className="text-lg mr-1">💧</span>EC (mmhos/cm)
              </label>
              <div
                className={clsx(
                  'relative border rounded-xl px-4 py-3 transition-all',
                  ecStatus === 'ok' &&
                    'border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/40',
                  ecStatus === 'warn' &&
                    'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40',
                  ecStatus === 'error' &&
                    'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40'
                )}
              >
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={ecValue}
                  onChange={(e) => setEcValue(e.target.value)}
                  className={clsx(
                    'w-full bg-transparent text-ink-1 dark:text-ink-1 font-medium',
                    'focus:outline-none placeholder:text-ink-3'
                  )}
                />
                {ecValue && (
                  <span className="absolute right-4 top-3 text-lg">
                    {getValidationIcon(ecStatus)}
                  </span>
                )}
              </div>
              {ranges && (
                <p className="text-xs text-ink-3 dark:text-ink-3 mt-1">
                  Rango ideal: {ranges.ecMin}-{ranges.ecMax}
                </p>
              )}
            </div>

            {/* pH Input */}
            <div>
              <label className="block text-sm font-semibold text-ink-1 dark:text-ink-1 mb-2">
                <span className="text-lg mr-1">🌡️</span>pH
              </label>
              <div
                className={clsx(
                  'relative border rounded-xl px-4 py-3 transition-all',
                  phStatus === 'ok' &&
                    'border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/40',
                  phStatus === 'warn' &&
                    'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40',
                  phStatus === 'error' &&
                    'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40'
                )}
              >
                <input
                  type="number"
                  step="0.1"
                  min="4.0"
                  max="8.0"
                  placeholder="0.0"
                  value={phValue}
                  onChange={(e) => setPhValue(e.target.value)}
                  className={clsx(
                    'w-full bg-transparent text-ink-1 dark:text-ink-1 font-medium',
                    'focus:outline-none placeholder:text-ink-3'
                  )}
                />
                {phValue && (
                  <span className="absolute right-4 top-3 text-lg">
                    {getValidationIcon(phStatus)}
                  </span>
                )}
              </div>
              {ranges && (
                <p className="text-xs text-ink-3 dark:text-ink-3 mt-1">
                  Rango ideal: {ranges.phMin}-{ranges.phMax}
                </p>
              )}
            </div>

            {/* Water Temp Input (optional) */}
            <div>
              <label className="block text-sm font-semibold text-ink-1 dark:text-ink-1 mb-2">
                <span className="text-lg mr-1">🌡️</span>Temperatura agua (°C)
              </label>
              <div className="border border-app-border rounded-xl px-4 py-3 dark:bg-app-elevated bg-app-elevated">
                <input
                  type="number"
                  step="0.5"
                  placeholder="20"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className={clsx(
                    'w-full bg-transparent text-ink-1 dark:text-ink-1 font-medium',
                    'focus:outline-none placeholder:text-ink-3'
                  )}
                />
              </div>
            </div>
          </div>

          {/* ── Notes Section ───────────────────────────────────────────── */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-ink-1 dark:text-ink-1 mb-2">
              <span className="text-lg mr-1">📝</span>Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Algo especial? Plant looks healthy, EC was high..."
              className={clsx(
                'w-full px-4 py-3 rounded-xl border border-app-border dark:border-app-border',
                'bg-white dark:bg-app-elevated text-ink-1 dark:text-ink-1',
                'placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
                'resize-none min-h-20'
              )}
            />
          </div>

          {/* ── Error Message ───────────────────────────────────────────── */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleSkip}
              disabled={loading as boolean}
              className="flex-1"
            >
              Saltar
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={loading || hasError ? true : undefined}
              className="flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* ── XP Reward Overlay ───────────────────────────────────────────── */}
        {success && xpReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none md:max-w-md">
            <div className="relative">
              {/* Checkmark */}
              <div className="animate-bounce text-6xl mb-4 text-center">✅</div>

              {/* XP Gained */}
              <div className="text-center">
                <p className="text-4xl font-bold text-brand-400 animate-pulse">
                  +{xpReward.xpGained} XP
                </p>

                {/* Streak Badge */}
                {xpReward.streakBonus > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900/60">
                    <span className="text-xl">🔥</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {xpReward.newStreak} días seguidos
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
