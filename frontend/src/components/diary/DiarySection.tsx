import { useState } from 'react'
import { useWeekLog } from '@/hooks/useWeekLog'
import type { WeekLog } from '@/types/weekLog'
import WeekLogCard from './WeekLogCard'
import WeekLogSheet from './WeekLogSheet'

interface DiarySectionProps {
  plantId: string
  currentWeekLabel: string
}

export default function DiarySection({ plantId, currentWeekLabel }: DiarySectionProps) {
  const { logs, addLog, updateLog, deleteLog } = useWeekLog(plantId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<WeekLog | undefined>(undefined)

  function openNew() {
    setEditing(undefined)
    setSheetOpen(true)
  }

  function openEdit(log: WeekLog) {
    setEditing(log)
    setSheetOpen(true)
  }

  function handleSave(data: { notes: string; photoDataUrl?: string }) {
    if (editing) {
      updateLog(editing.id, data)
    } else {
      addLog({
        plantId,
        weekLabel: currentWeekLabel,
        logDate: new Date(),
        notes: data.notes,
        photoDataUrl: data.photoDataUrl,
      })
    }
  }

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">
            📖 Diario de cultivo
          </p>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nueva entrada
          </button>
        </div>

        {logs.length === 0 ? (
          <button
            onClick={openNew}
            className="w-full rounded-2xl border-2 border-dashed border-app-border p-6 text-center tap-highlight-none active:scale-[0.98] transition-all hover:border-brand-border group"
          >
            <p className="text-3xl mb-2">📸</p>
            <p className="text-sm font-semibold text-ink-3 group-hover:text-ink-2 transition-colors">
              Agregá tu primera entrada
            </p>
            <p className="text-xs text-ink-4 mt-1">Foto + notas de la semana actual</p>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {logs.map((log) => (
              <WeekLogCard key={log.id} log={log} onClick={() => openEdit(log)} />
            ))}
          </div>
        )}
      </section>

      <WeekLogSheet
        isOpen={sheetOpen}
        weekLabel={editing ? editing.weekLabel : currentWeekLabel}
        existing={editing}
        onSave={handleSave}
        onDelete={editing ? () => deleteLog(editing.id) : undefined}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
