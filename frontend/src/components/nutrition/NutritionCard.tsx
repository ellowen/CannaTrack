import { useState } from 'react'
import { clsx } from 'clsx'
import type { ScheduledTask, NutritionTable } from '@/types/plant'
import { STAGE_LABELS, STAGE_EMOJIS } from '@/types/plant'
import { getLineColor, getLineName } from '@/lib/nutrition-utils'

interface NutritionCardProps {
  task: ScheduledTask
  potVolumeLiters: number
  potCount?: number
  table?: NutritionTable | null  // tabla de la planta para resolver colores de línea
}

function fmt(n: number): string {
  // Máximo 1 decimal, elimina .0
  return parseFloat(n.toFixed(1)).toString()
}

export default function NutritionCard({ task, potVolumeLiters, potCount = 1, table }: NutritionCardProps) {
  const defaultLiters = potVolumeLiters * potCount
  const [liters, setLiters] = useState(defaultLiters)

  const weekLabel = task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`
  const isFlora   = task.cycle === 'flora'
  const emoji     = STAGE_EMOJIS[task.stage] ?? '🌱'

  function adjustLiters(delta: number) {
    setLiters((v) => Math.max(1, parseFloat((v + delta).toFixed(1))))
  }

  function handleLiterInput(raw: string) {
    const n = parseFloat(raw)
    if (!isNaN(n) && n > 0) setLiters(n)
    else if (raw === '' || raw === '0') setLiters(1)
  }

  return (
    <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">

      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="px-4 pt-3.5 pb-3 flex items-center justify-between"
        style={{ background: isFlora ? 'var(--gradient-flora-card)' : 'var(--gradient-vege-card)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className={clsx(
              'text-xs font-black uppercase tracking-wide',
              isFlora ? 'text-flora-text' : 'text-brand-500'
            )}>
              Semana {weekLabel}
            </p>
            <p className="text-xs text-ink-3 mt-0.5">{STAGE_LABELS[task.stage] ?? task.stage}</p>
          </div>
        </div>

        {/* EC / pH target */}
        {task.ecMin !== undefined && (
          <div className="text-right bg-white/60 dark:bg-black/20 rounded-xl px-3 py-2">
            <p className="text-[11px] font-bold text-ink-1">EC {task.ecMin}–{task.ecMax}</p>
            <p className="text-[11px] text-ink-3">pH {task.phMin}–{task.phMax}</p>
          </div>
        )}
      </div>

      {/* ── Calculadora de litros ──────────────────────────── */}
      <div className="px-4 pt-3 pb-2 border-b border-app-border bg-app-elevated/60">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink-3">Preparar para</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => adjustLiters(-potVolumeLiters)}
              className="w-7 h-7 rounded-lg border border-app-border bg-app-card text-ink-2 flex items-center justify-center font-bold text-sm tap-highlight-none active:scale-90 transition-all"
            >
              −
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={liters}
                onChange={(e) => handleLiterInput(e.target.value)}
                className="w-14 text-center text-sm font-black text-ink-1 bg-app-card border border-app-border rounded-lg py-1 focus:outline-none focus:border-brand-border tabular"
              />
              <span className="text-sm font-semibold text-ink-3">L</span>
            </div>
            <button
              onClick={() => adjustLiters(potVolumeLiters)}
              className="w-7 h-7 rounded-lg border border-app-border bg-app-card text-ink-2 flex items-center justify-center font-bold text-sm tap-highlight-none active:scale-90 transition-all"
            >
              +
            </button>
          </div>
        </div>
        {potCount > 1 && (
          <p className="text-[11px] text-ink-4 mt-1 text-right">
            {potCount} macetas × {potVolumeLiters}L = {defaultLiters}L
          </p>
        )}
      </div>

      {/* ── Lista de productos ─────────────────────────────── */}
      <div className="px-4 py-3.5">
        {task.products.length > 0 ? (
          <ul className="space-y-3">
            {task.products.map((product) => {
              const total    = product.maxDose * liters
              const totalMin = product.minDose * liters
              const isFixed  = product.minDose === product.maxDose
              const totalText = isFixed
                ? `${fmt(total)} ${product.unit}`
                : `${fmt(totalMin)}–${fmt(total)} ${product.unit}`
              const perLiter = isFixed
                ? `${product.maxDose} ${product.unit}/L`
                : `${product.minDose}–${product.maxDose} ${product.unit}/L`

              return (
                <li key={product.name} className="flex items-center gap-3">
                  <span className={clsx(
                    'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wide',
                    getLineColor(product.line, table)
                  )}>
                    {getLineName(product.line, table)}
                  </span>
                  <span className="flex-1 text-sm text-ink-1 truncate">{product.name}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-ink-1 tabular">{totalText}</p>
                    <p className="text-[11px] text-ink-4 tabular">{perLiter}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-3 py-1 flex items-center gap-2">
            <span className="text-xl">💧</span>
            Solo agua — semana de limpieza
          </p>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      {task.products.length > 0 && (
        <div className="px-4 pb-3.5 flex items-center justify-between">
          <p className="text-[11px] text-ink-4">
            {liters !== defaultLiters
              ? `Calculado para ${liters}L`
              : potCount > 1
              ? `${potCount} macetas · ${liters}L total`
              : `${liters}L por maceta`}
          </p>
          {task.ecMin !== undefined && (
            <p className="text-[11px] font-semibold text-ink-3">
              EC {task.ecMin}–{task.ecMax} · pH {task.phMin}–{task.phMax}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
