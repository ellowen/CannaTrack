import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMeasurements } from '@/hooks/useMeasurements'
import MeasurementSheet from './MeasurementSheet'

interface MeasurementSectionProps {
  plantId: string
  ecMin?: number
  ecMax?: number
  phMin?: number
  phMax?: number
}

type RangeStatus = 'ok' | 'warn' | 'bad'

function getRangeStatus(value: number, min: number, max: number): RangeStatus {
  if (value >= min && value <= max) return 'ok'
  const slack = (max - min) * 0.3
  return Math.abs(value < min ? min - value : value - max) <= slack ? 'warn' : 'bad'
}

const statusClasses: Record<RangeStatus, string> = {
  ok:   'bg-brand-subtle text-brand-400 border-brand-border',
  warn: 'bg-amber-50 text-amber-600 border-amber-200',
  bad:  'bg-red-50 text-red-500 border-red-200',
}
// Dark-mode-friendly overrides handled via CSS vars — amber/red are static Tailwind colors
// and acceptable here for status indicators (same pattern as task colors)

export default function MeasurementSection({ plantId, ecMin, ecMax, phMin, phMax }: MeasurementSectionProps) {
  const { logs, addLog, deleteLog } = useMeasurements(plantId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? logs : logs.slice(0, 5)

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">💧 EC / pH</p>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Registrar
          </button>
        </div>

        {visible.length === 0 ? (
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-app-border p-4 flex items-center gap-3 text-left tap-highlight-none active:scale-[0.98] transition-all hover:border-brand-border group"
          >
            <span className="text-2xl">🔬</span>
            <div>
              <p className="text-sm font-semibold text-ink-3 group-hover:text-ink-2 transition-colors">
                Sin mediciones aún
              </p>
              <p className="text-xs text-ink-4 mt-0.5">
                {ecMin ? `Ideal: EC ${ecMin}–${ecMax} · pH ${phMin}–${phMax}` : 'Registrá EC y pH de cada riego'}
              </p>
            </div>
          </button>
        ) : (
          <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
            {visible.map((log, i) => {
              const ecStatus = ecMin ? getRangeStatus(log.ec, ecMin, ecMax!) : null
              const phStatus = phMin ? getRangeStatus(log.ph, phMin!, phMax!) : null

              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < visible.length - 1 ? 'border-b border-app-border' : ''}`}
                >
                  {/* Date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-2 capitalize">
                      {format(log.logDate, "EEE d MMM", { locale: es })}
                    </p>
                    {log.tempCelsius && (
                      <p className="text-[11px] text-ink-4">{log.tempCelsius}°C</p>
                    )}
                  </div>

                  {/* EC badge */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border tabular ${ecStatus ? statusClasses[ecStatus] : 'bg-app-elevated text-ink-2 border-app-border'}`}>
                    EC {log.ec.toFixed(1)}
                  </span>

                  {/* pH badge */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border tabular ${phStatus ? statusClasses[phStatus] : 'bg-app-elevated text-ink-2 border-app-border'}`}>
                    pH {log.ph.toFixed(1)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="w-7 h-7 rounded-lg bg-app-elevated flex items-center justify-center text-ink-4 hover:text-red-400 transition-colors tap-highlight-none active:scale-90 shrink-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}

            {logs.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-3 text-xs font-semibold text-ink-3 hover:text-ink-2 transition-colors border-t border-app-border tap-highlight-none"
              >
                {showAll ? 'Ver menos' : `Ver las ${logs.length - 5} anteriores`}
              </button>
            )}
          </div>
        )}
      </section>

      <MeasurementSheet
        isOpen={sheetOpen}
        ecMin={ecMin} ecMax={ecMax}
        phMin={phMin} phMax={phMax}
        onSave={(data) => addLog({ ...data, plantId, logDate: new Date() })}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
