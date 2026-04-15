import { useEffect, useState } from 'react'

interface MeasurementSheetProps {
  isOpen: boolean
  /** Recommended ranges from current nutrition week — used as hints */
  ecMin?: number
  ecMax?: number
  phMin?: number
  phMax?: number
  onSave: (data: { ec: number; ph: number; tempCelsius?: number }) => void
  onClose: () => void
}

export default function MeasurementSheet({
  isOpen, ecMin, ecMax, phMin, phMax, onSave, onClose,
}: MeasurementSheetProps) {
  const [ec, setEc] = useState('')
  const [ph, setPh] = useState('')
  const [temp, setTemp] = useState('')
  const [showTemp, setShowTemp] = useState(false)

  useEffect(() => {
    if (isOpen) { setEc(''); setPh(''); setTemp(''); setShowTemp(false) }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const ecNum = parseFloat(ec)
  const phNum = parseFloat(ph)
  const canSave = !isNaN(ecNum) && ecNum > 0 && !isNaN(phNum) && phNum > 0

  function getEcStatus() {
    if (!ecMin || !ecMax || isNaN(ecNum)) return null
    return ecNum >= ecMin && ecNum <= ecMax ? 'ok' : ecNum < ecMin - 0.3 || ecNum > ecMax + 0.3 ? 'bad' : 'warn'
  }
  function getPhStatus() {
    if (!phMin || !phMax || isNaN(phNum)) return null
    return phNum >= phMin && phNum <= phMax ? 'ok' : phNum < phMin - 0.3 || phNum > phMax + 0.3 ? 'bad' : 'warn'
  }

  const statusColor = { ok: 'text-brand-400', warn: 'text-amber-500', bad: 'text-red-500' }
  const statusIcon  = { ok: '✓', warn: '~', bad: '✕' }

  function handleSave() {
    if (!canSave) return
    onSave({ ec: ecNum, ph: phNum, tempCelsius: temp ? parseFloat(temp) : undefined })
    onClose()
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="bg-app-card rounded-t-3xl shadow-card-lg">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-app-border" />
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-b border-app-border">
            <div>
              <p className="text-base font-bold text-ink-1">Registrar medición 💧</p>
              {ecMin && phMin && (
                <p className="text-xs text-ink-3 mt-0.5">
                  Rango actual — EC {ecMin}–{ecMax} · pH {phMin}–{phMax}
                </p>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-app-elevated flex items-center justify-center text-ink-3 tap-highlight-none active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* EC + pH inputs */}
            <div className="grid grid-cols-2 gap-3">
              {/* EC */}
              <div>
                <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>EC</span>
                  {getEcStatus() && (
                    <span className={`font-bold ${statusColor[getEcStatus()!]}`}>
                      {statusIcon[getEcStatus()!]} {getEcStatus() === 'ok' ? 'Ideal' : getEcStatus() === 'warn' ? 'Cerca' : 'Fuera'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number" step="0.1" min="0" max="5"
                    value={ec} onChange={(e) => setEc(e.target.value)}
                    placeholder="1.2"
                    className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-4 py-4 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border tabular"
                  />
                  <span className="absolute right-3 bottom-3 text-xs text-ink-4 font-semibold">mS/cm</span>
                </div>
              </div>

              {/* pH */}
              <div>
                <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>pH</span>
                  {getPhStatus() && (
                    <span className={`font-bold ${statusColor[getPhStatus()!]}`}>
                      {statusIcon[getPhStatus()!]} {getPhStatus() === 'ok' ? 'Ideal' : getPhStatus() === 'warn' ? 'Cerca' : 'Fuera'}
                    </span>
                  )}
                </label>
                <input
                  type="number" step="0.1" min="4" max="9"
                  value={ph} onChange={(e) => setPh(e.target.value)}
                  placeholder="6.2"
                  className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-4 py-4 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border tabular"
                />
              </div>
            </div>

            {/* Temperatura opcional */}
            {showTemp ? (
              <div>
                <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2 block">Temperatura del agua</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" step="0.5" min="10" max="40"
                    value={temp} onChange={(e) => setTemp(e.target.value)}
                    placeholder="20"
                    className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border tabular"
                  />
                  <span className="text-sm font-semibold text-ink-3 shrink-0">°C</span>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowTemp(true)} className="text-xs text-ink-4 hover:text-ink-2 transition-colors tap-highlight-none">
                + Agregar temperatura del agua
              </button>
            )}

            <div className="space-y-2 pb-2">
              <button
                type="button" onClick={handleSave} disabled={!canSave}
                className="w-full py-3.5 rounded-xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand disabled:opacity-40 disabled:pointer-events-none"
              >
                Guardar medición
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
