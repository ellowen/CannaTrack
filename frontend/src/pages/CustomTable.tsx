import { useState, useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useNutritionStore } from '@/store/nutritionStore'
import { Button } from '@/components/ui'
import { hapticSuccess } from '@/lib/haptics'
import { STAGE_LABELS } from '@/types/plant'
import type {
  NutritionTable,
  NutritionLine,
  NutritionWeek,
  ProductDose,
  GeneticType,
  PlantStage,
  CyclePhase,
} from '@/types/plant'

// ─── Paleta de colores para líneas ──────────────────────────────────────────

const COLOR_PALETTE: { id: string; label: string; class: string }[] = [
  { id: 'green',  label: 'Verde',    class: 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-900/60' },
  { id: 'blue',   label: 'Azul',     class: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/60' },
  { id: 'violet', label: 'Violeta',  class: 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/40 dark:border-violet-900/60' },
  { id: 'amber',  label: 'Ámbar',    class: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/60' },
  { id: 'orange', label: 'Naranja',  class: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-900/60' },
  { id: 'pink',   label: 'Rosa',     class: 'text-pink-700 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-950/40 dark:border-pink-900/60' },
  { id: 'rose',   label: 'Rojo',     class: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900/60' },
  { id: 'teal',   label: 'Turquesa', class: 'text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950/40 dark:border-teal-900/60' },
  { id: 'indigo', label: 'Índigo',   class: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/60' },
  { id: 'slate',  label: 'Gris',     class: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-700/60' },
]

function colorClassFor(colorId: string): string {
  return COLOR_PALETTE.find((c) => c.id === colorId)?.class ?? COLOR_PALETTE[0].class
}

function inferColorId(colorClass: string): string {
  const match = COLOR_PALETTE.find((c) => c.class === colorClass)
  return match?.id ?? 'slate'
}

// ─── Estado interno del form ────────────────────────────────────────────────

interface LineDraft {
  id: string
  name: string
  colorId: string
}

interface ProductDraft {
  name: string
  line: string
  unit: 'ml' | 'gr'
  minDose: number
  maxDose: number
}

interface WeekDraft {
  cycle: CyclePhase
  week: number
  stage: PlantStage
  dayStart: number
  dayEnd: number
  ecMin: number
  ecMax: number
  phMin: number
  phMax: number
  products: ProductDraft[]
}

const STAGES: PlantStage[] = ['rooting', 'growth', 'preflower', 'stretch', 'bulking', 'ripening', 'flushing']

function emptyWeek(cycle: CyclePhase, index: number): WeekDraft {
  const baseStage: PlantStage =
    cycle === 'vege'
      ? index < 2 ? 'rooting' : index < 4 ? 'growth' : 'preflower'
      : index < 2 ? 'stretch' : index < 4 ? 'bulking' : index < 6 ? 'ripening' : 'flushing'
  return {
    cycle,
    week: cycle === 'vege' ? index : index + 1,
    stage: baseStage,
    dayStart: index * 7,
    dayEnd: (index + 1) * 7,
    ecMin: cycle === 'vege' ? 0.6 : 1.2,
    ecMax: cycle === 'vege' ? 0.8 : 1.4,
    phMin: cycle === 'vege' ? 5.5 : 6.0,
    phMax: cycle === 'vege' ? 6.0 : 6.5,
    products: [],
  }
}

function cloneWeek(w: NutritionWeek): WeekDraft {
  return {
    cycle: w.cycle,
    week: w.week,
    stage: w.stage,
    dayStart: w.dayStart,
    dayEnd: w.dayEnd,
    ecMin: w.ecMin,
    ecMax: w.ecMax,
    phMin: w.phMin,
    phMax: w.phMax,
    products: w.products.map((p) => ({
      name: p.name,
      line: p.line,
      unit: p.unit,
      minDose: p.minDose,
      maxDose: p.maxDose,
    })),
  }
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function CustomTable() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const returnTo = params.get('returnTo') ?? '/settings'

  const { tables, addTable, updateTable, removeTable } = useNutritionStore()
  const editing = editId ? tables.find((t) => t.id === editId) : undefined
  const isEditing = !!editing

  // ─── Estado ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(editing?.name ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [geneticTypes, setGeneticTypes] = useState<GeneticType[]>(
    editing?.geneticTypes ?? ['feminized', 'autoflower', 'regular'],
  )
  const [lines, setLines] = useState<LineDraft[]>(
    editing?.lines.map((l) => ({
      id: l.id,
      name: l.name,
      colorId: inferColorId(l.colorClass),
    })) ?? [{ id: 'GEN', name: 'Genérica', colorId: 'green' }],
  )
  const [vegeWeeks, setVegeWeeks] = useState<WeekDraft[]>(
    editing?.vegeWeeks.map(cloneWeek) ?? [emptyWeek('vege', 0)],
  )
  const [floraWeeks, setFloraWeeks] = useState<WeekDraft[]>(
    editing?.floraWeeks.map(cloneWeek) ?? Array.from({ length: 8 }, (_, i) => emptyWeek('flora', i)),
  )
  const [openWeek, setOpenWeek] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Derivados
  const lineIds = useMemo(() => lines.map((l) => l.id), [lines])

  // ─── Acciones ────────────────────────────────────────────────────────────
  function toggleGenetic(g: GeneticType) {
    setGeneticTypes((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    )
  }

  function cloneFrom(id: string) {
    const src = tables.find((t) => t.id === id)
    if (!src) return
    setName(`${src.name} (copia)`)
    setNotes(src.notes ?? '')
    setGeneticTypes([...src.geneticTypes])
    setLines(src.lines.map((l) => ({ id: l.id, name: l.name, colorId: inferColorId(l.colorClass) })))
    setVegeWeeks(src.vegeWeeks.map(cloneWeek))
    setFloraWeeks(src.floraWeeks.map(cloneWeek))
    setError(null)
  }

  function addLine() {
    const id = `L${lines.length + 1}`
    setLines([...lines, { id, name: `Línea ${lines.length + 1}`, colorId: COLOR_PALETTE[lines.length % COLOR_PALETTE.length].id }])
  }
  function updateLine(idx: number, changes: Partial<LineDraft>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...changes } : l)))
  }
  function removeLine(idx: number) {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== idx))
  }

  function addWeek(cycle: CyclePhase) {
    if (cycle === 'vege') setVegeWeeks([...vegeWeeks, emptyWeek('vege', vegeWeeks.length)])
    else setFloraWeeks([...floraWeeks, emptyWeek('flora', floraWeeks.length)])
  }
  function removeWeek(cycle: CyclePhase, idx: number) {
    if (cycle === 'vege') setVegeWeeks(vegeWeeks.filter((_, i) => i !== idx))
    else setFloraWeeks(floraWeeks.filter((_, i) => i !== idx))
  }
  function updateWeek(cycle: CyclePhase, idx: number, changes: Partial<WeekDraft>) {
    const list = cycle === 'vege' ? vegeWeeks : floraWeeks
    const setList = cycle === 'vege' ? setVegeWeeks : setFloraWeeks
    setList(list.map((w, i) => (i === idx ? { ...w, ...changes } : w)))
  }

  function addProduct(cycle: CyclePhase, weekIdx: number) {
    updateWeek(cycle, weekIdx, {
      products: [
        ...(cycle === 'vege' ? vegeWeeks[weekIdx].products : floraWeeks[weekIdx].products),
        { name: '', line: lineIds[0] ?? 'GEN', unit: 'ml', minDose: 1, maxDose: 2 },
      ],
    })
  }
  function updateProduct(cycle: CyclePhase, weekIdx: number, prodIdx: number, changes: Partial<ProductDraft>) {
    const list = cycle === 'vege' ? vegeWeeks : floraWeeks
    const week = list[weekIdx]
    const nextProducts = week.products.map((p, i) => (i === prodIdx ? { ...p, ...changes } : p))
    updateWeek(cycle, weekIdx, { products: nextProducts })
  }
  function removeProduct(cycle: CyclePhase, weekIdx: number, prodIdx: number) {
    const list = cycle === 'vege' ? vegeWeeks : floraWeeks
    const week = list[weekIdx]
    updateWeek(cycle, weekIdx, { products: week.products.filter((_, i) => i !== prodIdx) })
  }

  // ─── Validación + guardar ────────────────────────────────────────────────
  function handleSave() {
    if (!name.trim()) return setError('Ponele un nombre a la tabla')
    if (geneticTypes.length === 0) return setError('Elegí al menos una genética soportada')
    if (lines.length === 0) return setError('Definí al menos una línea de producto')
    if (lines.some((l) => !l.id.trim() || !l.name.trim())) return setError('Todas las líneas necesitan id y nombre')
    if (new Set(lines.map((l) => l.id)).size !== lines.length) return setError('Los IDs de línea deben ser únicos')
    if (vegeWeeks.length === 0 && floraWeeks.length === 0) return setError('Agregá al menos una semana')

    // Validar productos: si una semana tiene productos, que no tengan nombre vacío ni referencien una línea inexistente
    for (const w of [...vegeWeeks, ...floraWeeks]) {
      for (const p of w.products) {
        if (!p.name.trim()) return setError(`Hay un producto sin nombre en ${w.cycle === 'vege' ? 'V' : 'F'}${w.week}`)
        if (!lineIds.includes(p.line)) return setError(`El producto "${p.name}" referencia una línea que no existe`)
        if (p.minDose < 0 || p.maxDose < 0) return setError('Las dosis no pueden ser negativas')
        if (p.minDose > p.maxDose) return setError(`Dosis mínima > máxima en "${p.name}"`)
      }
      if (w.ecMin > w.ecMax) return setError(`EC mínimo > máximo en ${w.cycle === 'vege' ? 'V' : 'F'}${w.week}`)
      if (w.phMin > w.phMax) return setError(`pH mínimo > máximo en ${w.cycle === 'vege' ? 'V' : 'F'}${w.week}`)
    }

    const tableLines: NutritionLine[] = lines.map((l) => ({
      id: l.id.trim(),
      name: l.name.trim(),
      colorClass: colorClassFor(l.colorId),
    }))

    const draftToWeek = (d: WeekDraft): NutritionWeek => ({
      cycle: d.cycle,
      week: d.week,
      stage: d.stage,
      dayStart: d.dayStart,
      dayEnd: d.dayEnd,
      ecMin: d.ecMin,
      ecMax: d.ecMax,
      phMin: d.phMin,
      phMax: d.phMax,
      products: d.products.map<ProductDose>((p) => ({
        name: p.name.trim(),
        line: p.line,
        unit: p.unit,
        minDose: p.minDose,
        maxDose: p.maxDose,
      })),
    })

    const table: NutritionTable = {
      id: editing?.id ?? `custom-${crypto.randomUUID()}`,
      name: name.trim(),
      brandId: null,
      accessTier: 'free',
      isOfficial: false,
      geneticTypes,
      lines: tableLines,
      vegeWeeks: vegeWeeks.map(draftToWeek),
      floraWeeks: floraWeeks.map(draftToWeek),
      createdAt: editing?.createdAt ?? new Date(),
      notes: notes.trim() || undefined,
    }

    if (isEditing) updateTable(table.id, table)
    else addTable(table)

    hapticSuccess()
    navigate(returnTo)
  }

  function handleDelete() {
    if (!editing) return
    if (!confirm(`¿Eliminar la tabla "${editing.name}"? Esta acción no se puede deshacer.`)) return
    removeTable(editing.id)
    navigate(returnTo)
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-8 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to={returnTo}
          className="w-9 h-9 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-ink-2 tap-highlight-none active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-1 leading-tight">
            {isEditing ? 'Editar tabla' : 'Nueva tabla nutricional'}
          </h1>
          <p className="text-xs text-ink-3 mt-0.5">
            {isEditing ? 'Ajustá semanas, productos o dosis' : 'Armá tu propia tabla con productos y dosis'}
          </p>
        </div>
      </div>

      {/* Nombre + notas */}
      <section className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-ink-3 uppercase tracking-widest mb-1.5">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mi tabla casera"
            className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-border"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink-3 uppercase tracking-widest mb-1.5">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Descripción, fuente, ajustes propios..."
            className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-border"
          />
        </div>
      </section>

      {/* Genéticas */}
      <section>
        <label className="block text-xs font-bold text-ink-3 uppercase tracking-widest mb-2">Genéticas soportadas</label>
        <div className="flex flex-wrap gap-2">
          {(['feminized', 'autoflower', 'regular'] as GeneticType[]).map((g) => {
            const checked = geneticTypes.includes(g)
            const label = g === 'feminized' ? 'Feminizada' : g === 'autoflower' ? 'Autofloreciente' : 'Regular'
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenetic(g)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium tap-highlight-none active:scale-95 transition-all',
                  checked
                    ? 'bg-brand-400 text-white border-brand-400 shadow-glow-brand'
                    : 'bg-app-elevated text-ink-3 border-app-border',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Clonar (solo si no estamos editando) */}
      {!isEditing && tables.length > 0 && (
        <section className="bg-app-elevated rounded-2xl border border-app-border p-3.5">
          <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-2">Atajo: clonar una existente</p>
          <div className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => cloneFrom(t.id)}
                className="px-3 py-1.5 rounded-lg border border-app-border bg-app-card text-ink-2 text-xs font-medium tap-highlight-none active:scale-95 transition-all"
              >
                ↻ {t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Líneas */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-ink-3 uppercase tracking-widest">Líneas de producto</label>
          <button
            type="button"
            onClick={addLine}
            className="text-xs font-semibold text-brand-400 tap-highlight-none active:scale-95"
          >
            + Agregar
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-app-elevated rounded-xl border border-app-border p-2">
              <input
                value={l.id}
                onChange={(e) => updateLine(idx, { id: e.target.value.toUpperCase().slice(0, 8) })}
                placeholder="ID"
                className="w-20 rounded-lg border border-app-border bg-app-card text-ink-1 px-2 py-1.5 text-xs font-bold uppercase tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
              />
              <input
                value={l.name}
                onChange={(e) => updateLine(idx, { name: e.target.value })}
                placeholder="Nombre"
                className="flex-1 min-w-0 rounded-lg border border-app-border bg-app-card text-ink-1 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-border"
              />
              <select
                value={l.colorId}
                onChange={(e) => updateLine(idx, { colorId: e.target.value })}
                className="rounded-lg border border-app-border bg-app-card text-ink-1 px-2 py-1.5 text-xs focus:outline-none"
              >
                {COLOR_PALETTE.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded border', colorClassFor(l.colorId))}>
                {l.id || '—'}
              </span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="w-7 h-7 rounded-lg border border-app-border text-ink-4 flex items-center justify-center tap-highlight-none active:scale-95"
                  aria-label="Eliminar línea"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Ciclo vegetativo */}
      <WeekList
        title="Ciclo vegetativo"
        cycle="vege"
        weeks={vegeWeeks}
        lines={lines}
        openWeek={openWeek}
        setOpenWeek={setOpenWeek}
        onAdd={() => addWeek('vege')}
        onRemove={(idx) => removeWeek('vege', idx)}
        onUpdate={(idx, changes) => updateWeek('vege', idx, changes)}
        onAddProduct={(idx) => addProduct('vege', idx)}
        onUpdateProduct={(w, p, c) => updateProduct('vege', w, p, c)}
        onRemoveProduct={(w, p) => removeProduct('vege', w, p)}
      />

      {/* Ciclo floración */}
      <WeekList
        title="Ciclo floración"
        cycle="flora"
        weeks={floraWeeks}
        lines={lines}
        openWeek={openWeek}
        setOpenWeek={setOpenWeek}
        onAdd={() => addWeek('flora')}
        onRemove={(idx) => removeWeek('flora', idx)}
        onUpdate={(idx, changes) => updateWeek('flora', idx, changes)}
        onAddProduct={(idx) => addProduct('flora', idx)}
        onUpdateProduct={(w, p, c) => updateProduct('flora', w, p, c)}
        onRemoveProduct={(w, p) => removeProduct('flora', w, p)}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="sticky bottom-4 flex gap-2">
        {isEditing && (
          <Button variant="danger" onClick={handleDelete} className="px-4">
            Eliminar
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} className="flex-1">
          {isEditing ? 'Guardar cambios' : 'Crear tabla'}
        </Button>
      </div>
    </div>
  )
}

// ─── Subcomponente WeekList ─────────────────────────────────────────────────

interface WeekListProps {
  title: string
  cycle: CyclePhase
  weeks: WeekDraft[]
  lines: LineDraft[]
  openWeek: string | null
  setOpenWeek: (k: string | null) => void
  onAdd: () => void
  onRemove: (idx: number) => void
  onUpdate: (idx: number, changes: Partial<WeekDraft>) => void
  onAddProduct: (idx: number) => void
  onUpdateProduct: (weekIdx: number, prodIdx: number, changes: Partial<ProductDraft>) => void
  onRemoveProduct: (weekIdx: number, prodIdx: number) => void
}

function WeekList({
  title, cycle, weeks, lines,
  openWeek, setOpenWeek,
  onAdd, onRemove, onUpdate, onAddProduct, onUpdateProduct, onRemoveProduct,
}: WeekListProps) {
  const prefix = cycle === 'vege' ? 'V' : 'F'

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-ink-3 uppercase tracking-widest">{title}</label>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-semibold text-brand-400 tap-highlight-none active:scale-95"
        >
          + Agregar semana
        </button>
      </div>
      <div className="space-y-2">
        {weeks.length === 0 && (
          <p className="text-xs text-ink-4 italic">Sin semanas. Agregá al menos una si esta tabla aplica a este ciclo.</p>
        )}
        {weeks.map((w, idx) => {
          const key = `${cycle}-${idx}`
          const isOpen = openWeek === key
          const badge = `${prefix}${w.week}`
          return (
            <div key={key} className="bg-app-elevated rounded-2xl border border-app-border overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenWeek(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-3.5 py-3 tap-highlight-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    cycle === 'flora' ? 'bg-flora-bg text-flora-text' : 'bg-vege-bg text-vege-text',
                  )}>
                    {badge}
                  </span>
                  <span className="text-sm font-semibold text-ink-1">{STAGE_LABELS[w.stage] ?? w.stage}</span>
                  <span className="text-[11px] text-ink-4">· {w.products.length} prod · EC {w.ecMin}-{w.ecMax}</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-app-border p-3 space-y-3 bg-app-card">
                  {/* Stage + semana */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">Semana N°</p>
                      <input
                        type="number" min={0}
                        value={w.week}
                        onChange={(e) => onUpdate(idx, { week: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">Etapa</p>
                      <select
                        value={w.stage}
                        onChange={(e) => onUpdate(idx, { stage: e.target.value as PlantStage })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm focus:outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Day start/end */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">Día inicio</p>
                      <input
                        type="number" min={0}
                        value={w.dayStart}
                        onChange={(e) => onUpdate(idx, { dayStart: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">Día fin</p>
                      <input
                        type="number" min={1}
                        value={w.dayEnd}
                        onChange={(e) => onUpdate(idx, { dayEnd: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                  </div>
                  {/* EC/pH */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">EC min</p>
                      <input
                        type="number" step="0.1" min={0}
                        value={w.ecMin}
                        onChange={(e) => onUpdate(idx, { ecMin: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">EC max</p>
                      <input
                        type="number" step="0.1" min={0}
                        value={w.ecMax}
                        onChange={(e) => onUpdate(idx, { ecMax: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">pH min</p>
                      <input
                        type="number" step="0.1" min={0} max={14}
                        value={w.phMin}
                        onChange={(e) => onUpdate(idx, { phMin: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-ink-4 uppercase mb-1">pH max</p>
                      <input
                        type="number" step="0.1" min={0} max={14}
                        value={w.phMax}
                        onChange={(e) => onUpdate(idx, { phMax: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-app-border bg-app-elevated text-ink-1 px-2 py-1.5 text-sm tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                      />
                    </div>
                  </div>

                  {/* Productos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-ink-4 uppercase">Productos</p>
                      <button
                        type="button"
                        onClick={() => onAddProduct(idx)}
                        className="text-xs font-semibold text-brand-400 tap-highlight-none active:scale-95"
                      >
                        + Agregar
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {w.products.length === 0 && (
                        <p className="text-xs text-ink-4 italic">Sin productos — semana de agua / limpieza.</p>
                      )}
                      {w.products.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-1.5 bg-app-elevated rounded-lg border border-app-border p-1.5">
                          <input
                            value={p.name}
                            onChange={(e) => onUpdateProduct(idx, pIdx, { name: e.target.value })}
                            placeholder="Nombre"
                            className="flex-1 min-w-0 rounded border border-app-border bg-app-card text-ink-1 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-border"
                          />
                          <select
                            value={p.line}
                            onChange={(e) => onUpdateProduct(idx, pIdx, { line: e.target.value })}
                            className="rounded border border-app-border bg-app-card text-ink-1 px-1 py-1 text-xs focus:outline-none"
                          >
                            {lines.map((l) => (
                              <option key={l.id} value={l.id}>{l.id}</option>
                            ))}
                          </select>
                          <input
                            type="number" step="0.1" min={0}
                            value={p.minDose}
                            onChange={(e) => onUpdateProduct(idx, pIdx, { minDose: parseFloat(e.target.value) || 0 })}
                            className="w-14 rounded border border-app-border bg-app-card text-ink-1 px-1 py-1 text-xs tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                          />
                          <span className="text-[10px] text-ink-4">–</span>
                          <input
                            type="number" step="0.1" min={0}
                            value={p.maxDose}
                            onChange={(e) => onUpdateProduct(idx, pIdx, { maxDose: parseFloat(e.target.value) || 0 })}
                            className="w-14 rounded border border-app-border bg-app-card text-ink-1 px-1 py-1 text-xs tabular focus:outline-none focus:ring-1 focus:ring-brand-border"
                          />
                          <select
                            value={p.unit}
                            onChange={(e) => onUpdateProduct(idx, pIdx, { unit: e.target.value as 'ml' | 'gr' })}
                            className="rounded border border-app-border bg-app-card text-ink-1 px-1 py-1 text-xs focus:outline-none"
                          >
                            <option value="ml">ml</option>
                            <option value="gr">gr</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onRemoveProduct(idx, pIdx)}
                            className="w-6 h-6 rounded border border-app-border text-ink-4 flex items-center justify-center text-sm tap-highlight-none active:scale-95"
                            aria-label="Eliminar producto"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="w-full py-2 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold tap-highlight-none active:scale-95"
                  >
                    Eliminar semana
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
