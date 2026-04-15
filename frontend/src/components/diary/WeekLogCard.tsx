import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { WeekLog } from '@/types/weekLog'

interface WeekLogCardProps {
  log: WeekLog
  onClick: () => void
}

export default function WeekLogCard({ log, onClick }: WeekLogCardProps) {
  const isFlora = log.weekLabel.startsWith('FLORA')

  return (
    <div
      onClick={onClick}
      className="rounded-2xl border border-app-border overflow-hidden cursor-pointer active:scale-[0.987] transition-all duration-150 tap-highlight-none shadow-card hover:shadow-card-md"
    >
      {/* Photo / placeholder */}
      {log.photoDataUrl ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={log.photoDataUrl}
            alt={`Semana ${log.weekLabel}`}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Expand hint */}
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-3.5 h-3.5 opacity-80">
              <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Week badge over photo */}
          <span
            className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
            style={{ background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)' }}
          >
            {log.weekLabel}
          </span>
          <span className="absolute bottom-2.5 right-3 text-[11px] text-white/80 font-medium">
            {format(log.logDate, "d MMM", { locale: es })}
          </span>
        </div>
      ) : (
        <div
          className="aspect-[4/3] flex flex-col items-center justify-center gap-2"
          style={{ background: isFlora ? 'var(--gradient-flora-card)' : 'var(--gradient-vege-card)' }}
        >
          <span className="text-4xl opacity-50">🌿</span>
          <span
            className="text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
            style={{ background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)' }}
          >
            {log.weekLabel}
          </span>
        </div>
      )}

      {/* Notes preview */}
      <div className="bg-app-card px-3 py-2.5">
        {log.notes ? (
          <p className="text-xs text-ink-2 line-clamp-2 leading-relaxed">{log.notes}</p>
        ) : (
          <p className="text-xs text-ink-4 italic">Sin notas</p>
        )}
        {log.photoDataUrl && (
          <p className="text-[11px] text-ink-4 mt-1">
            {format(log.logDate, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        )}
      </div>
    </div>
  )
}
