import { scaleDose } from '@/lib/nutrition-utils'
import type { ProductDose } from '@/types/plant'

interface DoseListProps {
  products: ProductDose[]
  liters: number
}

export default function DoseList({ products, liters }: DoseListProps) {
  return (
    <ul className="space-y-2">
      {products.map((product) => {
        const scaled = scaleDose(product, liters)
        const isFixed = product.minDose === product.maxDose
        const rangeText = isFixed
          ? `${scaled.totalAmount} ${scaled.unit}`
          : `${product.minDose * liters}–${scaled.totalAmount} ${scaled.unit}`

        return (
          <li key={product.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
              <span className="text-sm text-gray-700">{product.name}</span>
              <span className="text-xs text-gray-400 uppercase">{product.line}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 tabular-nums">
              {rangeText}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
