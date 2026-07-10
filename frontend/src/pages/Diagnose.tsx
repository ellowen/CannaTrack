import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'
import { supabase } from '@/lib/auth'
import { useUserStore } from '@/store/userStore'
import { usePlants } from '@/hooks/usePlants'
import { useWeekLogStore } from '@/store/weekLogStore'
import { resizeImageFile } from '@/lib/image-utils'
import { syncWeekLogToSupabase } from '@/lib/sync'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DiagnosisIssue {
  name:        string
  severity:    'alta' | 'media' | 'baja'
  description: string
  solution:    string
}

interface DiagnosisResult {
  summary:         string
  issues:          DiagnosisIssue[]
  healthScore:     number
  recommendations: string[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEVERITY_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' } as const

const SEVERITY_CLASS = {
  alta:  'bg-red-500/10 border-red-500/25 text-red-400',
  media: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
  baja:  'bg-green-500/10 border-green-500/25 text-green-400',
} as const

const FREE_LIMIT = 1
const PRO_LIMIT  = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function weekLabelColor(label: string): string {
  return label.toUpperCase().includes('F') ? '#F59E0B' : '#52CC64'
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function HealthCircle({ score }: { score: number }) {
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const offset = circ * (1 - score / 100)
  const color  =
    score >= 75 ? '#52CC64' :
    score >= 45 ? '#F59E0B' :
                  '#EF4444'

  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx={36} cy={36} r={radius} fill="none" stroke="currentColor"
          strokeWidth={6} className="text-app-border" />
        <circle cx={36} cy={36} r={radius} fill="none" stroke={color}
          strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function Diagnose() {
  const { plan, userId } = useUserStore()
  const { plants }       = usePlants()
  const { logs, addLog } = useWeekLogStore()

  const isPro         = plan === 'pro'
  const limit         = isPro ? PRO_LIMIT : FREE_LIMIT
  const activePlants  = plants.filter(p => p.status === 'active')

  // Plant selector
  const [selectedPlantId, setSelectedPlantId] = useState<string>('')

  // Photo upload
  const [uploading, setUploading]     = useState(false)
  const [lightboxId, setLightboxId]   = useState<string | null>(null)

  // AI diagnosis
  const [showDiagnosis, setShowDiagnosis]       = useState(false)
  const [diagFile, setDiagFile]                 = useState<File | null>(null)
  const [diagPreview, setDiagPreview]           = useState<string | null>(null)
  const [diagLoading, setDiagLoading]           = useState(false)
  const [diagResult, setDiagResult]             = useState<DiagnosisResult | null>(null)
  const [diagError, setDiagError]               = useState<string | null>(null)
  const [usedQuota, setUsedQuota]               = useState(0)
  const [quotaLoaded, setQuotaLoaded]           = useState(false)

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const diagRef    = useRef<HTMLInputElement>(null)

  // Auto-select first plant
  useEffect(() => {
    if (activePlants.length > 0 && !selectedPlantId) {
      setSelectedPlantId(activePlants[0].id)
    }
  }, [activePlants.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load AI quota once
  useEffect(() => {
    if (!quotaLoaded && userId) {
      setQuotaLoaded(true)
      void refreshQuota()
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Photos for selected plant (newest first)
  const plantPhotos = logs
    .filter(l => l.plantId === selectedPlantId && !!(l.photoDataUrl || l.photoUrl))
    .slice()
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  const lightboxPhoto = lightboxId ? logs.find(l => l.id === lightboxId) ?? null : null
  const isAtLimit     = usedQuota >= limit

  // ─── Upload photo ────────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedPlantId) return
    if (file.size > 10 * 1024 * 1024) { alert('La foto no puede superar 10MB'); return }

    const plant = activePlants.find(p => p.id === selectedPlantId)
    if (!plant) return

    setUploading(true)
    try {
      const dataUrl  = await resizeImageFile(file)
      const isFlora  = !!plant.floraStartDate
      const base     = isFlora ? plant.floraStartDate!.getTime() : plant.startDate.getTime()
      const weekNum  = Math.max(1, Math.ceil((Date.now() - base) / (7 * 24 * 60 * 60 * 1000)))
      const weekLabel = `Semana ${isFlora ? 'F' : 'V'}${weekNum}`

      const log = addLog({
        plantId:    selectedPlantId,
        weekLabel,
        logDate:    new Date(),
        notes:      '',
        photoDataUrl: dataUrl,
      })
      if (userId) void syncWeekLogToSupabase(log, userId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir la foto')
    } finally {
      setUploading(false)
      if (cameraRef.current)  cameraRef.current.value  = ''
      if (galleryRef.current) galleryRef.current.value = ''
    }
  }

  // ─── AI diagnosis ────────────────────────────────────────────────────────────

  function handleDiagFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDiagFile(file)
    setDiagResult(null)
    setDiagError(null)
    setDiagPreview(URL.createObjectURL(file))
  }

  async function refreshQuota() {
    if (!userId) return
    const month = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('ai_usage')
      .select('diagnosis_count')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle()
    setUsedQuota(data?.diagnosis_count ?? 0)
  }

  async function runDiagnosis() {
    if (!diagFile || !userId) return
    if (isAtLimit) {
      setDiagError(`Alcanzaste el limite mensual de ${limit} diagnosticos.`)
      return
    }
    setDiagLoading(true)
    setDiagError(null)
    setDiagResult(null)
    try {
      const base64 = await fileToBase64(diagFile)
      const { data, error: fnError } = await supabase.functions.invoke('diagnose-plant', {
        body: { image: base64, plantId: selectedPlantId || null },
      })
      if (data?.limitReached) {
        setDiagError(data.error ?? 'Limite mensual de diagnosticos alcanzado.')
        void refreshQuota()
        return
      }
      if (fnError) throw new Error(fnError.message)
      setDiagResult(data as DiagnosisResult)
      void refreshQuota()
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : 'Error de diagnostico.')
    } finally {
      setDiagLoading(false)
    }
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────

  if (activePlants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
        <div className="text-6xl mb-5 float">📷</div>
        <h2 className="text-xl font-black text-ink-1 mb-2">Sin plantas activas</h2>
        <p className="text-sm text-ink-3 max-w-xs leading-relaxed">
          Crea una planta para empezar a documentar el crecimiento
        </p>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="px-4 pt-8 pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-black text-ink-1 leading-tight">Diario visual</h1>
        <span className="ml-auto text-[10px] font-black px-2.5 py-1 rounded-full bg-brand-subtle border border-brand-border text-brand-400 tracking-wider">
          FOTOS
        </span>
      </div>

      {/* Plant selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {activePlants.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlantId(p.id)}
            className={clsx(
              'shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-all tap-highlight-none active:scale-[0.96]',
              selectedPlantId === p.id
                ? 'bg-brand-400 border-brand-400 text-white shadow-glow-brand'
                : 'bg-app-card border-app-border text-ink-2'
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Upload row — solo Pro */}
      {!isPro ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
          <span className="text-xl shrink-0">🔒</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-400">Fotos del cultivo — Plan Pro</p>
            <p className="text-xs text-ink-3 mt-0.5">Actualizate a Pro para subir fotos desde la camara o galeria.</p>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 glass-card rounded-2xl py-3.5 font-bold text-sm text-ink-2 active:scale-[0.97] transition-all tap-highlight-none disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-4 h-4 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
          ) : (
            <span className="text-xl">📷</span>
          )}
          Camara
        </button>

        <button
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 glass-card rounded-2xl py-3.5 font-bold text-sm text-ink-2 active:scale-[0.97] transition-all tap-highlight-none disabled:opacity-50"
        >
          <span className="text-xl">🖼️</span>
          Galeria
        </button>

        <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>
      )}

      {/* Photo grid */}
      {plantPhotos.length === 0 ? (
        <div className="bg-app-card border border-app-border rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">🌿</p>
          <p className="text-sm font-semibold text-ink-2 mb-1">Sin fotos todavia</p>
          <p className="text-xs text-ink-4">Agrega la primera foto de esta planta</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {plantPhotos.map(photo => (
            <button
              key={photo.id}
              onClick={() => setLightboxId(photo.id)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-app-card border border-app-border tap-highlight-none active:scale-[0.97] transition-all"
            >
              <img
                src={photo.photoDataUrl ?? photo.photoUrl}
                alt={photo.weekLabel}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pt-5 pb-2">
                <p
                  className="text-xs font-black leading-none"
                  style={{ color: weekLabelColor(photo.weekLabel) }}
                >
                  {photo.weekLabel}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  {format(photo.logDate, 'd MMM', { locale: es })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* AI Diagnosis section */}
      <div className="space-y-3 pt-1">
        <button
          onClick={() => setShowDiagnosis(v => !v)}
          className="w-full rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 flex items-center gap-3 tap-highlight-none active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-xl shrink-0">
            🤖
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-black text-sm text-violet-300">Diagnostico por IA</p>
            <p className="text-xs text-violet-600 mt-0.5">Detecta plagas, deficiencias y hongos</p>
          </div>
          {!isPro && (
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-300 shrink-0">
              PRO
            </span>
          )}
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className={clsx('w-4 h-4 text-violet-400 transition-transform shrink-0', showDiagnosis && 'rotate-90')}
          >
            <path d="M9 18l6-6-6-6" strokeLinecap="round" />
          </svg>
        </button>

        {showDiagnosis && (
          <div className="space-y-3 task-in">

            {/* Pro gate */}
            {!isPro && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-center">
                <p className="text-sm font-bold text-violet-300 mb-1">Funcion Pro</p>
                <p className="text-xs text-violet-500 leading-relaxed">
                  Activa el plan Pro para diagnosticar plagas, deficiencias y enfermedades con IA.
                </p>
              </div>
            )}

            {/* Quota badge */}
            {isPro && (
              <p className="text-xs text-ink-3 text-center">
                {usedQuota}/{limit} diagnosticos usados este mes
              </p>
            )}

            {/* Image picker */}
            <button
              onClick={() => diagRef.current?.click()}
              className="w-full rounded-2xl border border-dashed border-app-border bg-app-card p-5 flex flex-col items-center gap-2 tap-highlight-none active:scale-[0.98] transition-all"
            >
              {diagPreview ? (
                <img
                  src={diagPreview}
                  alt="Preview"
                  className="w-full max-h-48 object-contain rounded-xl"
                />
              ) : (
                <>
                  <span className="text-3xl">🔬</span>
                  <p className="text-sm font-semibold text-ink-3">Seleccionar foto para analizar</p>
                  <p className="text-xs text-ink-4">JPG, PNG hasta 10MB</p>
                </>
              )}
            </button>
            <input ref={diagRef} type="file" accept="image/*" className="hidden" onChange={handleDiagFileChange} />

            {/* Analyze button */}
            <button
              onClick={() => void runDiagnosis()}
              disabled={!diagFile || diagLoading || isAtLimit}
              className={clsx(
                'w-full py-4 rounded-2xl font-black text-sm transition-all tap-highlight-none active:scale-[0.98]',
                diagFile && !diagLoading && !isAtLimit
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'bg-app-card border border-app-border text-ink-4 cursor-not-allowed'
              )}
            >
              {diagLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Analizando...
                </span>
              ) : isAtLimit
                ? `Limite alcanzado (${usedQuota}/${limit})`
                : 'Analizar con IA'
              }
            </button>

            {/* Error */}
            {diagError && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{diagError}</p>
              </div>
            )}

            {/* Results */}
            {diagResult && (
              <div className="space-y-3">
                {/* Health score */}
                <div className="glass-card rounded-2xl p-5 text-center">
                  <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Salud de la planta</p>
                  <HealthCircle score={diagResult.healthScore} />
                  <p className="text-xs text-ink-3 mt-3 leading-relaxed max-w-xs mx-auto">
                    {diagResult.summary}
                  </p>
                </div>

                {/* Issues */}
                {diagResult.issues.length > 0 && (
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <p className="text-xs font-bold text-ink-3 uppercase tracking-widest px-4 py-3 border-b border-app-border">
                      Problemas detectados &middot; {diagResult.issues.length}
                    </p>
                    {diagResult.issues.map((issue, i) => (
                      <div
                        key={i}
                        className={clsx('p-4 space-y-2', i < diagResult.issues.length - 1 && 'border-b border-app-border')}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-ink-1 flex-1">{issue.name}</p>
                          <span className={clsx('text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border', SEVERITY_CLASS[issue.severity])}>
                            {SEVERITY_LABEL[issue.severity]}
                          </span>
                        </div>
                        <p className="text-xs text-ink-3">{issue.description}</p>
                        <div className="rounded-xl bg-green-500/5 border border-green-500/15 px-3 py-2">
                          <p className="text-xs font-black text-green-400 uppercase tracking-wider mb-0.5">Solucion</p>
                          <p className="text-xs text-ink-2 leading-relaxed">{issue.solution}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {diagResult.recommendations.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-2">Recomendaciones</p>
                    {diagResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-brand-400 text-xs font-black mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-ink-2 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reset */}
                <button
                  onClick={() => { setDiagFile(null); setDiagPreview(null); setDiagResult(null); setDiagError(null); if (diagRef.current) diagRef.current.value = '' }}
                  className="w-full rounded-2xl border border-app-border py-3.5 text-sm font-bold text-ink-2 active:scale-[0.97] transition-all tap-highlight-none"
                >
                  Nuevo diagnostico
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>

    {/* Lightbox */}
    {lightboxPhoto && (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={() => setLightboxId(null)}
      >
        <img
          src={lightboxPhoto.photoDataUrl ?? lightboxPhoto.photoUrl}
          alt={lightboxPhoto.weekLabel}
          className="max-w-full max-h-full object-contain rounded-2xl"
          onClick={e => e.stopPropagation()}
        />
        <button
          className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white text-lg"
          onClick={() => setLightboxId(null)}
        >
          &#x2715;
        </button>
        {lightboxPhoto.weekLabel && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 rounded-xl px-4 py-2 text-center pointer-events-none">
            <p
              className="font-bold text-sm"
              style={{ color: weekLabelColor(lightboxPhoto.weekLabel) }}
            >
              {lightboxPhoto.weekLabel}
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {format(lightboxPhoto.logDate, "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        )}
      </div>
    )}
    </>
  )
}
