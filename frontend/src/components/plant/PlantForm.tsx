import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button, Badge } from '@/components/ui'
import { useNutritionTable } from '@/hooks/useNutritionTable'
import { useUserStore } from '@/store/userStore'
import type { GeneticType, PlantSex, NutritionTable, ProductDose, NutritionWeek } from '@/types/plant'
import { STAGE_LABELS } from '@/types/plant'
import { getLineColor, getLineName } from '@/lib/nutrition-utils'
import { clsx } from 'clsx'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProductsByLine(table: NutritionTable): Record<string, ProductDose[]> {
  const seen = new Set<string>()
  const groups: Record<string, ProductDose[]> = {}
  for (const week of [...table.vegeWeeks, ...table.floraWeeks]) {
    for (const p of week.products) {
      if (!seen.has(p.name)) {
        seen.add(p.name)
        if (!groups[p.line]) groups[p.line] = []
        groups[p.line].push(p)
      }
    }
  }
  return groups
}

function filterWeeks(weeks: NutritionWeek[], selected: string[] | undefined): NutritionWeek[] {
  if (!selected) return weeks
  return weeks.map((w) => ({ ...w, products: w.products.filter((p) => selected.includes(p.name)) }))
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PlantFormValues {
  name: string
  genetics: string
  geneticType: GeneticType
  sex: PlantSex
  startDate: string
  location: 'indoor' | 'outdoor'
  potCount: number
  potVolumeLiters: number
  nutritionTableId: string
  autoFlowerTotalDays: number
  availableProducts: string[] | undefined
  customProducts: ProductDose[]
  notes: string
}

interface PlantFormProps {
  onSubmit: (values: PlantFormValues) => void
  initialValues?: Partial<PlantFormValues>
  submitLabel?: string
  loading?: boolean
}

// ─── Primitivos UI ───────────────────────────────────────────────────────────

const fieldClass =
  'w-full rounded-xl border border-app-border bg-app-card text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border placeholder:text-ink-4 transition-colors shadow-card'

const labelClass = 'block text-xs font-medium text-ink-2 uppercase tracking-wide mb-2'

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  renderLabel: (v: T) => string
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={clsx(
            'flex-1 py-3 px-3 rounded-xl border text-sm font-medium transition-all tap-highlight-none active:scale-95',
            value === opt
              ? 'bg-brand-dim border-brand-subtle text-brand-400'
              : 'bg-app-card border-app-border text-ink-3 hover:border-app-border-strong shadow-card'
          )}
        >
          {renderLabel(opt)}
        </button>
      ))}
    </div>
  )
}

// ─── Indicador de pasos ───────────────────────────────────────────────────────

const STEPS = ['Planta', 'Setup', 'Nutrición'] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current

        return (
          <div key={label} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300',
                done
                  ? 'bg-brand-400 border-brand-400 text-app-bg'
                  : active
                  ? 'bg-brand-dim border-brand-subtle text-brand-400 shadow-glow-brand'
                  : 'bg-app-elevated border-app-border text-ink-4'
              )}>
                {done ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M13.707 4.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L7 9.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : num}
              </div>
              <span className={clsx(
                'text-[10px] font-semibold uppercase tracking-wide transition-colors',
                active ? 'text-brand-400' : done ? 'text-brand-600' : 'text-ink-4'
              )}>
                {label}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'w-12 h-px mx-2 mb-5 transition-all duration-300',
                done ? 'bg-brand-400/50' : 'bg-app-border'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlantForm({ onSubmit, initialValues, submitLabel, loading }: PlantFormProps) {
  const { availableTables } = useNutritionTable()
  const { potVolumeLiters } = useUserStore()
  const location = useLocation()

  const today = new Date().toISOString().slice(0, 10)
  const [step, setStep] = useState(1)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showProducts, setShowProducts] = useState(false)

  const [values, setValues] = useState<PlantFormValues>({
    name: '',
    genetics: '',
    geneticType: 'feminized',
    sex: 'unknown',
    startDate: today,
    location: 'indoor',
    potCount: 1,
    potVolumeLiters: potVolumeLiters,
    nutritionTableId: availableTables[0]?.id ?? '',
    autoFlowerTotalDays: 75,
    availableProducts: undefined,
    customProducts: [],
    notes: '',
    ...initialValues,
  })

  // Estado del formulario inline para nuevo producto personalizado
  const [newProduct, setNewProduct] = useState<{ name: string; dose: string; unit: 'ml' | 'gr' }>({
    name: '', dose: '', unit: 'ml',
  })
  const [addingProduct, setAddingProduct] = useState(false)

  function set<K extends keyof PlantFormValues>(field: K, value: PlantFormValues[K]) {
    setValues((v) => ({ ...v, [field]: value }))
  }

  function isStepValid(): boolean {
    if (step === 1) return values.name.trim().length > 0 && values.genetics.trim().length > 0
    if (step === 2) return !!values.startDate
    return true
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (step < 3) setStep((s) => s + 1)
    else onSubmit(values)
  }

  // ─── Paso 1: Identificación ──────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <div>
          <label className={labelClass}>Nombre de la planta *</label>
          <input
            type="text"
            required
            autoFocus
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: White Widow #1"
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Genética *</label>
          <input
            type="text"
            required
            value={values.genetics}
            onChange={(e) => set('genetics', e.target.value)}
            placeholder="Ej: White Widow"
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Tipo de genética</label>
          <ToggleGroup
            options={['feminized', 'autoflower', 'regular'] as const}
            value={values.geneticType}
            onChange={(v) => set('geneticType', v)}
            renderLabel={(v) =>
              v === 'feminized' ? 'Feminizada' : v === 'autoflower' ? 'Auto' : 'Regular'
            }
          />
        </div>

        {values.geneticType === 'autoflower' && (
          <div>
            <label className={labelClass}>Días totales del ciclo</label>
            <input
              type="number"
              min={60}
              max={120}
              value={values.autoFlowerTotalDays}
              onChange={(e) => set('autoFlowerTotalDays', Number(e.target.value))}
              className={fieldClass}
            />
            <p className="text-xs text-ink-4 mt-2">Típico: 70–80 días desde germinación</p>
          </div>
        )}

        {values.geneticType === 'regular' && (
          <div>
            <label className={labelClass}>Sexo</label>
            <ToggleGroup
              options={['unknown', 'female', 'male'] as const}
              value={values.sex}
              onChange={(v) => set('sex', v)}
              renderLabel={(v) =>
                v === 'unknown' ? 'Desconocido' : v === 'female' ? 'Hembra' : 'Macho'
              }
            />
          </div>
        )}

        <div>
          <label className={labelClass}>Notas (opcional)</label>
          <textarea
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder="Observaciones sobre esta planta..."
            className={`${fieldClass} resize-none`}
          />
        </div>
      </div>
    )
  }

  // ─── Paso 2: Setup ───────────────────────────────────────────────────────

  function renderStep2() {
    return (
      <div className="space-y-5">
        <div>
          <label className={labelClass}>Fecha de inicio *</label>
          <input
            type="date"
            required
            value={values.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            className={fieldClass}
          />
          <p className="text-xs text-ink-4 mt-2">
            Fecha en que germinó o se trasplantó
          </p>
        </div>

        <div>
          <label className={labelClass}>Ubicación</label>
          <ToggleGroup
            options={['indoor', 'outdoor'] as const}
            value={values.location}
            onChange={(v) => set('location', v)}
            renderLabel={(v) => (v === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Macetas</label>
            <input
              type="number"
              min={1}
              max={100}
              value={values.potCount}
              onChange={(e) => set('potCount', Number(e.target.value))}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Litros c/u</label>
            <input
              type="number"
              min={1}
              max={200}
              value={values.potVolumeLiters}
              onChange={(e) => set('potVolumeLiters', Number(e.target.value))}
              className={fieldClass}
            />
          </div>
        </div>

        {/* Resumen visual del setup */}
        <div className="bg-app-elevated rounded-xl border border-app-border p-4">
          <p className="text-xs text-ink-3 mb-3 uppercase tracking-wide font-semibold">Resumen</p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-ink-3">Planta</span>
            <span className="text-ink-1 font-medium truncate">{values.name || '—'}</span>
            <span className="text-ink-3">Genética</span>
            <span className="text-ink-1 font-medium">{values.genetics || '—'}</span>
            <span className="text-ink-3">Tipo</span>
            <span className="text-ink-1 font-medium">
              {values.geneticType === 'feminized' ? 'Feminizada'
                : values.geneticType === 'autoflower' ? `Auto (${values.autoFlowerTotalDays}d)`
                : 'Regular'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Paso 3: Nutrición ───────────────────────────────────────────────────

  function renderStep3() {
    const table = availableTables.find((t) => t.id === values.nutritionTableId)

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass}>Tabla nutricional</label>
            <Link
              to={`/nutrition/new?returnTo=${encodeURIComponent(location.pathname)}`}
              onClick={(e) => {
                if (values.name.trim() && !confirm('Vas a salir del formulario. Se perderán los datos ingresados. ¿Continuar?')) {
                  e.preventDefault()
                }
              }}
              className="text-xs font-semibold text-brand-400 tap-highlight-none active:scale-95"
            >
              + Crear propia
            </Link>
          </div>
          {availableTables.length > 1 ? (
            <select
              value={values.nutritionTableId}
              onChange={(e) => {
                set('nutritionTableId', e.target.value)
                set('availableProducts', undefined)
              }}
              className={fieldClass}
            >
              {availableTables.map((t) => (
                <option key={t.id} value={t.id} className="bg-app-elevated">
                  {t.name}{!t.isOfficial ? ' (custom)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-ink-3 px-3 py-2.5 rounded-xl bg-app-elevated border border-app-border">
              {availableTables[0]?.name ?? 'Sin tablas disponibles'}
            </p>
          )}
        </div>

        {/* Selector de productos */}
        {table && (() => {
          const productsByLine = getProductsByLine(table)
          const allProductNames = Object.values(productsByLine).flat().map((p) => p.name)
          const selected = values.availableProducts ?? allProductNames
          const allSelected = selected.length === allProductNames.length

          function toggleProduct(name: string) {
            const next = selected.includes(name)
              ? selected.filter((n) => n !== name)
              : [...selected, name]
            set('availableProducts', next.length === allProductNames.length ? undefined : next)
          }

          function toggleAll() {
            set('availableProducts', allSelected ? [] : undefined)
          }

          return (
            <div className="rounded-2xl border border-app-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowProducts((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-app-elevated tap-highlight-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    'w-2 h-2 rounded-full',
                    allSelected ? 'bg-brand-400' : 'bg-amber-400'
                  )} />
                  <span className="text-sm font-medium text-ink-1">Mis productos disponibles</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'text-xs font-semibold px-2 py-0.5 rounded-full border',
                    allSelected
                      ? 'text-brand-400 bg-brand-dim border-brand-subtle'
                      : 'text-amber-400 bg-amber-950/50 border-amber-900/50'
                  )}>
                    {allSelected ? 'Todos' : `${selected.length}/${allProductNames.length}`}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${showProducts ? 'rotate-180' : ''}`}>
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              {showProducts && (
                <div className="border-t border-app-border bg-app-card">
                  <label className="flex items-center gap-3 px-4 py-3.5 border-b border-app-border cursor-pointer">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded" />
                    <span className="text-sm font-semibold text-ink-1">Todos los productos</span>
                  </label>
                  <div className="px-4 py-3 space-y-4">
                    {Object.entries(productsByLine).map(([line, products]) => (
                      <div key={line}>
                        <span className={clsx(
                          'inline-flex text-[11px] font-bold px-2 py-0.5 rounded border mb-2.5',
                          getLineColor(line, table)
                        )}>
                          {getLineName(line, table)}
                        </span>
                        <div className="space-y-2">
                          {products.map((p) => (
                            <label key={p.name} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selected.includes(p.name)}
                                onChange={() => toggleProduct(p.name)}
                                className="w-4 h-4 rounded shrink-0"
                              />
                              <span className="text-sm text-ink-1 flex-1">{p.name}</span>
                              <span className="text-xs text-ink-4 tabular-nums">{p.maxDose} {p.unit}/L</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Productos propios del usuario */}
        <div className="rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 bg-app-elevated">
            <div className="flex items-center gap-2.5">
              <span className={clsx(
                'w-2 h-2 rounded-full',
                values.customProducts.length > 0 ? 'bg-brand-400' : 'bg-app-border-strong'
              )} />
              <span className="text-sm font-medium text-ink-1">Mis productos propios</span>
            </div>
            <span className="text-xs text-ink-4">
              {values.customProducts.length > 0 ? `${values.customProducts.length} agregado${values.customProducts.length > 1 ? 's' : ''}` : 'Opcional'}
            </span>
          </div>

          <div className="border-t border-app-border bg-app-card px-4 py-3 space-y-2">
            <p className="text-xs text-ink-4 leading-relaxed">
              Agregá productos de cualquier marca que no estén en la tabla. Se incluirán en todas las tareas de nutrición.
            </p>

            {/* Lista de productos ya agregados */}
            {values.customProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-app-elevated rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-1 truncate">{p.name}</p>
                  <p className="text-xs text-ink-3">{p.maxDose} {p.unit}/L</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('customProducts', values.customProducts.filter((_, j) => j !== i))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-4 hover:text-red-500 hover:bg-red-50 transition-colors tap-highlight-none"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Formulario inline para agregar */}
            {addingProduct ? (
              <div className="rounded-xl border border-brand-border bg-brand-subtle/40 p-3 space-y-2.5">
                <input
                  type="text"
                  placeholder="Nombre del producto *"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((v) => ({ ...v, name: e.target.value }))}
                  className={fieldClass}
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Dosis (por litro)"
                    min={0.1}
                    step={0.1}
                    value={newProduct.dose}
                    onChange={(e) => setNewProduct((v) => ({ ...v, dose: e.target.value }))}
                    className={clsx(fieldClass, 'flex-1')}
                  />
                  <div className="flex rounded-xl border border-app-border overflow-hidden shrink-0">
                    {(['ml', 'gr'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewProduct((v) => ({ ...v, unit: u }))}
                        className={clsx(
                          'px-3.5 text-sm font-semibold transition-colors tap-highlight-none',
                          newProduct.unit === u
                            ? 'bg-brand-400 text-white'
                            : 'bg-app-card text-ink-3'
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAddingProduct(false); setNewProduct({ name: '', dose: '', unit: 'ml' }) }}
                    className="flex-1 py-2 rounded-xl border border-app-border text-sm font-semibold text-ink-3 bg-app-card tap-highlight-none active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!newProduct.name.trim() || !newProduct.dose}
                    onClick={() => {
                      const dose = parseFloat(newProduct.dose)
                      if (!newProduct.name.trim() || isNaN(dose) || dose <= 0) return
                      const product: ProductDose = {
                        name: newProduct.name.trim(),
                        line: 'BIO',   // línea genérica para productos del usuario
                        unit: newProduct.unit,
                        minDose: dose,
                        maxDose: dose,
                      }
                      set('customProducts', [...values.customProducts, product])
                      setNewProduct({ name: '', dose: '', unit: 'ml' })
                      setAddingProduct(false)
                    }}
                    className="flex-[2] py-2 rounded-xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-95 transition-all disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingProduct(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-app-border-strong text-sm font-semibold text-ink-3 hover:border-brand-border hover:text-brand-400 tap-highlight-none active:scale-[0.98] transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Agregar producto propio
              </button>
            )}
          </div>
        </div>

        {/* Preview cronograma */}
        {table && (() => {
          const vegeWeeks = filterWeeks(table.vegeWeeks, values.availableProducts)
          const floraWeeks = filterWeeks(table.floraWeeks, values.availableProducts)

          return (
            <div className="rounded-2xl border border-app-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSchedule((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-app-elevated tap-highlight-none"
              >
                <span className="text-sm font-medium text-ink-1">Vista previa del cronograma</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${showSchedule ? 'rotate-180' : ''}`}>
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showSchedule && (
                <div className="border-t border-app-border bg-app-card px-4 py-4 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold text-brand-400 uppercase tracking-widest mb-3">
                      Vegetativo · {vegeWeeks.length} semanas
                    </p>
                    <div className="space-y-2.5">
                      {vegeWeeks.map((week) => (
                        <div key={week.week} className="flex gap-3 items-start">
                          <Badge variant="info" className="shrink-0 mt-0.5 text-[11px]">V{week.week}</Badge>
                          <div className="min-w-0">
                            <p className="text-xs text-ink-3 mb-0.5">{STAGE_LABELS[week.stage] ?? week.stage}</p>
                            <p className="text-xs text-ink-1 leading-relaxed">
                              {week.products.length > 0
                                ? week.products.map((p) => p.name).join(' · ')
                                : <span className="text-ink-4">—</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-3">
                      Floración · {floraWeeks.length} semanas
                    </p>
                    <div className="space-y-2.5">
                      {floraWeeks.map((week) => (
                        <div key={week.week} className="flex gap-3 items-start">
                          <Badge variant="warning" className="shrink-0 mt-0.5 text-[11px]">F{week.week}</Badge>
                          <div className="min-w-0">
                            <p className="text-xs text-ink-3 mb-0.5">{STAGE_LABELS[week.stage] ?? week.stage}</p>
                            <p className="text-xs text-ink-1 leading-relaxed">
                              {week.products.length > 0
                                ? week.products.map((p) => p.name).join(' · ')
                                : <span className="text-ink-4">Solo agua</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleNext} className="flex flex-col min-h-0">
      <StepIndicator current={step} />

      <div className="flex-1">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Navegación entre pasos */}
      <div className={clsx('flex gap-3 pt-8', step === 1 ? 'justify-end' : 'justify-between')}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-2 text-sm font-medium text-ink-2 hover:text-ink-1 tap-highlight-none transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver
          </button>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={!isStepValid() || loading}
          className={clsx(step === 1 ? 'w-full' : 'flex-1')}
        >
          {step < 3 ? (
            <>
              Continuar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          ) : loading ? 'Guardando...' : (submitLabel ?? 'Crear planta')}
        </Button>
      </div>
    </form>
  )
}
