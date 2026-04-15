import { scaleDose } from '@/lib/nutrition-utils'
import type { ProductDose } from '@/types/plant'
import { clsx } from 'clsx'

interface DoseListProps {
  products: ProductDose[]
  liters: number
}

const lineColors: Record<string, string> = {
  BIO:  'text-green-700 bg-green-50 border-green-200',
  FUEL: 'text-blue-700 bg-blue-50 border-blue-200',
  LIFE: 'text-violet-700 bg-violet-50 border-violet-200',
  ECO:  'text-amber-700 bg-amber-50 border-amber-200',
}

export default function DoseList({ products, liters }: DoseListProps) {
  return (
    <ul className="space-y-2.5">
      {products.map((product) => {
        const scaled = scaleDose(product, liters)
        const isFixed = product.minDose === product.maxDose
        const rangeText = isFixed
          ? `${scaled.totalAmount} ${scaled.unit}`
          : `${product.minDose * liters}–${scaled.totalAmount} ${scaled.unit}`

        return (
          <li key={product.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={clsx(
                'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wide',
                lineColors[product.line] ?? 'text-ink-3 bg-app-elevated border-app-border'
              )}>
                {product.line}
              </span>
              <span className="text-sm text-ink-1 truncate">{product.name}</span>
            </div>
            <span className="text-sm font-bold text-ink-1 tabular shrink-0">{rangeText}</span>
          </li>
        )
      })}
    </ul>
  )
}
