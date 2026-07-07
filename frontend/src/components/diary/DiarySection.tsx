import { useState } from 'react'
import { useWeekLog } from '@/hooks/useWeekLog'
import { useAuth } from '@/contexts/AuthContext'
import {
  syncWeekLogToSupabase,
  updateWeekLogInSupabase,
  deleteWeekLogFromSupabase,
  uploadPhotoToStorage,
} from '@/lib/sync'
import type { WeekLog } from '@/types/weekLog'
import WeekLogCard from './WeekLogCard'
import WeekLogSheet from './WeekLogSheet'
import { PhotoLightbox, PhotoGallery } from '@/components/gallery'

interface DiarySectionProps {
  plantId: string
  currentWeekLabel: string
}

export default function DiarySection({ plantId, currentWeekLabel }: DiarySectionProps) {
  const { logs, addLog, updateLog, deleteLog } = useWeekLog(plantId)
  const { user } = useAuth()
  const [sheetOpen, setSheetOpen]         = useState(false)
  const [editing, setEditing]             = useState<WeekLog | undefined>(undefined)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Solo entradas con foto (local o remota), en orden cronológico ascendente
  const photosOnly = [...logs]
    .filter((l) => l.photoDataUrl || l.photoUrl)
    .sort((a, b) => a.logDate.getTime() - b.logDate.getTime())

  function openNew() {
    setEditing(undefined)
    setSheetOpen(true)
  }

  function openEdit(log: WeekLog) {
    setEditing(log)
    setSheetOpen(true)
  }

  function handleCardClick(log: WeekLog) {
    if (log.photoDataUrl || log.photoUrl) {
      // Abrir lightbox en la foto correspondiente
      const idx = photosOnly.findIndex((p) => p.id === log.id)
      if (idx !== -1) { setLightboxIndex(idx); return }
    }
    // Sin foto → abrir editor
    openEdit(log)
  }

  function handleSave(data: { notes: string; photoDataUrl?: string }) {
    if (editing) {
      updateLog(editing.id, { notes: data.notes, photoDataUrl: data.photoDataUrl })
      if (user) {
        void (async () => {
          let photoUrl: string | undefined
          if (data.photoDataUrl && data.photoDataUrl !== editing.photoDataUrl) {
            photoUrl = await uploadPhotoToStorage(user.id, plantId, editing.id, data.photoDataUrl) ?? undefined
            if (photoUrl) updateLog(editing.id, { photoUrl })
          }
          void updateWeekLogInSupabase(editing.id, {
            notes: data.notes,
            photoUrl: photoUrl ?? editing.photoUrl,
          })
        })()
      }
    } else {
      const newLog = addLog({
        plantId,
        weekLabel: currentWeekLabel,
        logDate: new Date(),
        notes: data.notes,
        photoDataUrl: data.photoDataUrl,
      })
      if (user) {
        void (async () => {
          let logToSync = newLog
          if (data.photoDataUrl) {
            const photoUrl = await uploadPhotoToStorage(user.id, plantId, newLog.id, data.photoDataUrl) ?? undefined
            if (photoUrl) {
              updateLog(newLog.id, { photoUrl })
              logToSync = { ...newLog, photoUrl }
            }
          }
          void syncWeekLogToSupabase(logToSync, user.id)
        })()
      }
    }
  }

  function handleAddPhoto(photoDataUrl: string, logDate?: Date) {
    const newLog = addLog({
      plantId,
      weekLabel: currentWeekLabel,
      logDate: logDate || new Date(),
      notes: '',
      photoDataUrl,
    })
    if (user) {
      void (async () => {
        const photoUrl = await uploadPhotoToStorage(user.id, plantId, newLog.id, photoDataUrl) ?? undefined
        let logToSync = newLog
        if (photoUrl) {
          updateLog(newLog.id, { photoUrl })
          logToSync = { ...newLog, photoUrl }
        }
        void syncWeekLogToSupabase(logToSync, user.id)
      })()
    }
  }

  function handleDeletePhoto(logId: string) {
    deleteLog(logId)
    void deleteWeekLogFromSupabase(logId)
  }

  return (
    <>
      <section className="space-y-8">
        {/* Diary entries */}
        <div>
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
                <WeekLogCard key={log.id} log={log} onClick={() => handleCardClick(log)} />
              ))}
            </div>
          )}
        </div>

        {/* Photo Gallery */}
        <PhotoGallery
          logs={logs}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
        />
      </section>

      <WeekLogSheet
        isOpen={sheetOpen}
        weekLabel={editing ? editing.weekLabel : currentWeekLabel}
        existing={editing}
        onSave={handleSave}
        onDelete={editing ? () => { deleteLog(editing.id); void deleteWeekLogFromSupabase(editing.id) } : undefined}
        onClose={() => setSheetOpen(false)}
      />

      {lightboxIndex !== null && photosOnly.length > 0 && (
        <PhotoLightbox
          photos={photosOnly}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onEdit={(log) => {
            setLightboxIndex(null)
            openEdit(log)
          }}
        />
      )}
    </>
  )
}
