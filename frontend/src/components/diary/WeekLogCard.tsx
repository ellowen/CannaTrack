import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { WeekLog } from '@/types/weekLog'

interface WeekLogCardProps {
  log: WeekLog
  onClick: () => void
}

/** Una entrada del diario: nota como protagonista y una miniatura si hay foto. */
export default function WeekLogCard({ log, onClick }: WeekLogCardProps) {
  const isFlora = log.weekLabel.startsWith('FLORA')
  const photo = log.photoDataUrl ?? log.photoUrl

  return (
    <div
      onClick={onClick}
      className="flex gap-3 px-3.5 py-3 cursor-pointer active:bg-app-elevated transition-colors tap-highlight-none"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
            isFlora ? 'bg-flora-bg text-flora-text' : 'bg-vege-bg text-vege-text'
          }`}>
            {log.weekLabel}
          </span>
          <span className="text-[11px] text-ink-4">{format(log.logDate, "EEE d 'de' MMM", { locale: es })}</span>
        </div>
        {log.notes ? (
          <p className="text-sm text-ink-2 leading-relaxed line-clamp-3">{log.notes}</p>
        ) : (
          <p className="text-sm text-ink-4 italic">Solo foto</p>
        )}
      </div>
      {photo && (
        <img
          src={photo}
          alt={`Foto ${log.weekLabel}`}
          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-app-elevated"
          loading="lazy"
        />
      )}
    </div>
  )
}
