import { useState } from 'react'
import { Button, Badge } from '@/components/ui'
import { useNutritionTable } from '@/hooks/useNutritionTable'
import { useUserStore } from '@/store/userStore'
import type { GeneticType, PlantSex } from '@/types/plant'

const stageLabels: Record<string, string> = {
  rooting: 'Enraizamiento',
  growth: 'Crecimiento',
  preflower: 'Prefloración',
  stretch: 'Estiramiento',
  bulking: 'Engorde',
  ripening: 'Maduración',
  flushing: 'Limpieza',
}

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
  notes: string
}

interface PlantFormProps {
  onSubmit: (values: PlantFormValues) => void
  loading?: boolean
}

const fieldClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200'

const toggleBase =
  'py-2 px-3 rounded-lg border text-sm font-medium transition-colors'
const toggleActive = 'border-brand-400 bg-brand-50 text-brand-600'
const toggleInactive = 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'

export default function PlantForm({ onSubmit, loading }: PlantFormProps) {
  const { availableTables } = useNutritionTable()
  const { potVolumeLiters } = useUserStore()

  const today = new Date().toISOString().slice(0, 10)
  const [showSchedule, setShowSchedule] = useState(false)

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
    notes: '',
  })

  function set<K extends keyof PlantFormValues>(field: K, value: PlantFormValues[K]) {
    setValues((v) => ({ ...v, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la planta *</label>
        <input
          type="text"
          required
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ej: White Widow #1"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Genética *</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de genética</label>
        <div className="grid grid-cols-3 gap-2">
          {(['feminized', 'autoflower', 'regular'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set('geneticType', type)}
              className={`${toggleBase} ${values.geneticType === type ? toggleActive : toggleInactive}`}
            >
              {type === 'feminized' ? 'Feminizada' : type === 'autoflower' ? 'Auto' : 'Regular'}
            </button>
          ))}
        </div>
      </div>

      {values.geneticType === 'autoflower' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Días totales (auto)</label>
          <input
            type="number"
            min={60}
            max={120}
            value={values.autoFlowerTotalDays}
            onChange={(e) => set('autoFlowerTotalDays', Number(e.target.value))}
            className={fieldClass}
          />
        </div>
      )}

      {values.geneticType === 'regular' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
          <div className="grid grid-cols-3 gap-2">
            {(['unknown', 'female', 'male'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('sex', s)}
                className={`${toggleBase} ${values.sex === s ? toggleActive : toggleInactive}`}
              >
                {s === 'unknown' ? 'Desconocido' : s === 'female' ? 'Hembra' : 'Macho'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio *</label>
        <input
          type="date"
          required
          value={values.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
        <div className="grid grid-cols-2 gap-2">
          {(['indoor', 'outdoor'] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => set('location', loc)}
              className={`${toggleBase} ${values.location === loc ? toggleActive : toggleInactive}`}
            >
              {loc === 'indoor' ? 'Indoor' : 'Outdoor'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Macetas</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Litros c/u</label>
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

      {availableTables.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tabla nutricional</label>
          <select
            value={values.nutritionTableId}
            onChange={(e) => set('nutritionTableId', e.target.value)}
            className={fieldClass}
          >
            {availableTables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <textarea
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Observaciones sobre esta planta..."
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* Nutrition table schedule preview */}
      {(() => {
        const table = availableTables.find((t) => t.id === values.nutritionTableId)
        if (!table) return null
        return (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSchedule((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-700">
                Cronograma nutricional — {table.name.split('—')[0].trim()}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`w-4 h-4 text-gray-400 transition-transform ${showSchedule ? 'rotate-180' : ''}`}
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showSchedule && (
              <div className="px-4 py-3 space-y-4 bg-white">
                {/* VEGE */}
                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
                    Vegetativo · {table.vegeWeeks.length} semanas
                  </p>
                  <div className="space-y-2">
                    {table.vegeWeeks.map((week) => (
                      <div key={week.week} className="flex gap-2 items-start">
                        <Badge variant="green" className="shrink-0 mt-0.5">V{week.week}</Badge>
                        <div className="min-w-0">
                          <span className="text-xs text-gray-500 capitalize">
                            {stageLabels[week.stage] ?? week.stage}
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {week.products.length > 0
                              ? week.products.map((p) => p.name).join(' · ')
                              : '—'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FLORA */}
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                    Floración · {table.floraWeeks.length} semanas
                  </p>
                  <div className="space-y-2">
                    {table.floraWeeks.map((week) => (
                      <div key={week.week} className="flex gap-2 items-start">
                        <Badge variant="amber" className="shrink-0 mt-0.5">F{week.week}</Badge>
                        <div className="min-w-0">
                          <span className="text-xs text-gray-500 capitalize">
                            {stageLabels[week.stage] ?? week.stage}
                          </span>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {week.products.length > 0
                              ? week.products.map((p) => p.name).join(' · ')
                              : 'Solo agua'}
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

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Creando...' : 'Crear planta'}
      </Button>
    </form>
  )
}
