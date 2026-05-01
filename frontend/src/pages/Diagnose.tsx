import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/auth'
import { useUserStore } from '@/store/userStore'
import { usePlants } from '@/hooks/usePlants'
import { clsx } from 'clsx'

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

const SEVERITY_LABEL  = { alta: 'Alta', media: 'Media', baja: 'Baja' } as const
const SEVERITY_CLASS  = {
  alta:  'bg-red-500/10 border-red-500/25 text-red-400',
  media: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
  baja:  'bg-green-500/10 border-green-500/25 text-green-400',
} as const

const TIPS = [
  'Foto con buena iluminacion, sin sombras duras',
  'Enfoca las hojas con posibles problemas visibles',
  'Incluye la hoja entera, no solo el area afectada',
  'Imagen nitida, sin movimiento ni desenfoque',
]

const FREE_LIMIT = 1
const PRO_LIMIT  = 10

// ─── Hook: cuota mensual ─────────────────────────────────────────────────────

function useDiagnosisQuota(userId: string | null) {
  const [used, setUsed]       = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function refetch() {
    if (!userId) return
    setLoading(true)
    const month = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('ai_usage')
      .select('diagnosis_count')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle()
    setUsed(data?.diagnosis_count ?? 0)
    setLoading(false)
  }

  return { used, loading, refetch }
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function Diagnose() {
  const { plan, userId } = useUserStore()
  const { plants }        = usePlants()
  const isPro             = plan === 'pro'
  const limit             = isPro ? PRO_LIMIT : FREE_LIMIT

  const quota = useDiagnosisQuota(userId)

  const [selectedPlantId, setSelectedPlantId] = useState<string>(plants[0]?.id ?? '')
  const [imageFile, setImageFile]             = useState<File | null>(null)
  const [imagePreview, setImagePreview]       = useState<string | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [result, setResult]                   = useState<DiagnosisResult | null>(null)
  const [error, setError]                     = useState<string | null>(null)
  const [quotaLoaded, setQuotaLoaded]         = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar cuota una sola vez al montar
  if (!quotaLoaded && userId) {
    setQuotaLoaded(true)
    void quota.refetch()
  }

  const usedCount = quota.used ?? 0
  const isAtLimit = usedCount >= limit

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setResult(null)
    setError(null)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function analyze() {
    if (!imageFile || !userId) return
    if (isAtLimit) {
      setError(`Alcanzaste el limite mensual de ${limit} diagnosticos. El contador se reinicia el 1 del proximo mes.`)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const base64 = await fileToBase64(imageFile)

      const { data, error: fnError } = await supabase.functions.invoke('diagnose-plant', {
        body: { image: base64, plantId: selectedPlantId || null },
      })

      if (data?.limitReached) {
        setError(data.error ?? 'Limite mensual de diagnosticos alcanzado.')
        void quota.refetch()
        return
      }
      if (fnError) throw new Error(fnError.message)

      setResult(data as DiagnosisResult)
      void quota.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar al servicio de diagnostico.')
    } finally {
      setLoading(false)
    }
  }

  const activePlants = plants.filter(p => p.status === 'active')

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-20 space-y-6">

      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black text-ink-1">Diagnostico IA</h1>
          <span className="text-xs font-black tracking-widest px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-400">
            BETA
          </span>
        </div>
        <p className="text-sm text-ink-3">Analisis visual por Claude — detecta plagas, deficiencias y hongos</p>
      </header>

      {/* Banner plan free */}
      {!isPro && (
        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 flex items-start gap-3">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-400">Plan Free: {FREE_LIMIT} diagnostico/mes</p>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              Actualizate a Pro para {PRO_LIMIT} diagnosticos mensuales.{' '}
              <Link to="/profile" className="underline">Ver planes</Link>
            </p>
          </div>
        </div>
      )}

      {/* Selector de planta */}
      {activePlants.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-ink-3 uppercase tracking-widest mb-2">
            Planta a diagnosticar
          </label>
          <select
            value={selectedPlantId}
            onChange={e => setSelectedPlantId(e.target.value)}
            className="w-full bg-app-elevated border border-app-border rounded-xl px-4 py-3 text-ink-1 text-sm focus:outline-none focus:border-brand"
          >
            <option value="">Sin planta especifica</option>
            {activePlants.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {p.genetics}</option>
            ))}
          </select>
        </div>
      )}

      {/* Imagen seleccionada o zona de drop */}
      {imagePreview ? (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src={imagePreview}
              alt="Foto a diagnosticar"
              className="w-full h-56 object-cover"
            />
            {!loading && (
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-sm hover:bg-black/80 transition-colors"
                aria-label="Eliminar foto"
              >
                ✕
              </button>
            )}
          </div>

          {!result && !loading && (
            <button
              onClick={() => void analyze()}
              disabled={isAtLimit}
              className={clsx(
                'w-full rounded-2xl py-4 text-sm font-black tracking-wide transition-all',
                isAtLimit
                  ? 'bg-app-border text-ink-3 cursor-not-allowed'
                  : 'bg-brand text-bg-base active:scale-[0.98]'
              )}
            >
              {isAtLimit ? `Limite alcanzado (${usedCount}/${limit})` : 'Analizar con IA'}
            </button>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-app-border hover:border-brand/40 transition-colors p-10 text-center space-y-4 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-app-elevated border border-app-border mx-auto flex items-center justify-center text-3xl">
              📷
            </div>
            <div>
              <p className="font-bold text-ink-1">Subir foto de la planta</p>
              <p className="text-xs text-ink-3 mt-1">JPG, PNG o WEBP — maximo 10 MB</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl bg-app-elevated border border-app-border p-10 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
          <div>
            <p className="font-black text-ink-1">Analizando...</p>
            <p className="text-xs text-ink-3 mt-1">Claude esta revisando tu planta en busca de problemas</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-500/5 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Resultado */}
      {result && !loading && (
        <div className="space-y-4">

          {/* Health score */}
          <div className="rounded-2xl bg-app-elevated border border-app-border p-5">
            <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-4">Salud detectada</p>
            <div className="flex items-center gap-4">
              <HealthCircle score={result.healthScore} />
              <p className="text-sm text-ink-2 leading-relaxed flex-1">{result.summary}</p>
            </div>
          </div>

          {/* Problemas */}
          {result.issues.length > 0 && (
            <div className="rounded-2xl bg-app-elevated border border-app-border overflow-hidden">
              <div className="px-5 py-4 border-b border-app-border">
                <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">
                  Problemas detectados &middot; {result.issues.length}
                </p>
              </div>
              {result.issues.map((issue, i) => (
                <div
                  key={i}
                  className={clsx('p-5 space-y-3', i > 0 && 'border-t border-app-border')}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-ink-1 flex-1">{issue.name}</span>
                    <span className={clsx('text-xs font-black uppercase px-2.5 py-1 rounded-lg border', SEVERITY_CLASS[issue.severity])}>
                      {SEVERITY_LABEL[issue.severity]}
                    </span>
                  </div>
                  <p className="text-sm text-ink-3 leading-relaxed">{issue.description}</p>
                  <div className="rounded-xl bg-green-500/5 border border-green-500/15 px-4 py-3">
                    <p className="text-xs font-black text-green-400 uppercase tracking-wider mb-1">Solucion</p>
                    <p className="text-sm text-ink-2 leading-relaxed">{issue.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recomendaciones */}
          {result.recommendations.length > 0 && (
            <div className="rounded-2xl bg-app-elevated border border-app-border p-5 space-y-3">
              <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">Recomendaciones</p>
              <ul className="space-y-2.5">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-xs font-black mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-ink-2 leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Uso mensual */}
          {!quota.loading && (
            <p className="text-xs text-ink-3 text-center">
              {usedCount}/{limit} diagnosticos usados este mes
              {!isPro && (
                <> &middot; <Link to="/profile" className="text-brand underline">Actualizar a Pro</Link></>
              )}
            </p>
          )}

          <button
            onClick={clearImage}
            className="w-full rounded-2xl border border-app-border py-3.5 text-sm font-bold text-ink-2 hover:border-brand/40 transition-colors"
          >
            Nuevo diagnostico
          </button>
        </div>
      )}

      {/* Tips */}
      {!imagePreview && !loading && (
        <div className="rounded-2xl bg-app-elevated border border-app-border p-5 space-y-3">
          <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">
            Consejos para mejor diagnostico
          </p>
          <ul className="space-y-2.5">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                <span className="text-sm text-ink-3 leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}

// ─── Sub-componente ───────────────────────────────────────────────────────────

function HealthCircle({ score }: { score: number }) {
  const cls =
    score >= 75 ? 'text-green-400 border-green-400 bg-green-500/8' :
    score >= 45 ? 'text-amber-400 border-amber-400 bg-amber-500/8' :
                  'text-red-400   border-red-400   bg-red-500/8'

  return (
    <div className={clsx(
      'w-16 h-16 shrink-0 rounded-full border-[3px] flex items-center justify-center font-black text-lg',
      cls,
    )}>
      {score}%
    </div>
  )
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
