import { useNavigate, useParams, Link } from 'react-router-dom'
import { usePlants } from '@/hooks/usePlants'
import { PlantForm } from '@/components/plant'
import type { PlantFormValues } from '@/components/plant'
import { Button } from '@/components/ui'
import { useTranslation } from '@/i18n'

export default function EditPlant() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPlantById, editPlant } = usePlants()

  if (!id) return null
  const plant = getPlantById(id)

  if (!plant) {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-ink-3 mb-6">{t('editPlant.not_found')}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>{t('editPlant.back_home')}</Button>
      </div>
    )
  }

  // Mapear Plant → PlantFormValues para pre-llenar el formulario
  const initialValues: Partial<PlantFormValues> = {
    name:                plant.name,
    genetics:            plant.genetics,
    geneticType:         plant.geneticType,
    sex:                 plant.sex,
    startDate:           plant.startDate.toISOString().slice(0, 10),
    location:            plant.location,
    growMedium:          plant.growMedium ?? 'soil',
    potCount:            plant.potCount,
    potVolumeLiters:     plant.potVolumeLiters ?? 11,
    nutritionTableId:    plant.nutritionTableId,
    autoFlowerTotalDays: plant.autoFlowerTotalDays ?? 75,
    availableProducts:   plant.availableProducts,
    customProducts:      plant.customProducts ?? [],
    notes:               plant.notes ?? '',
  }

  const plantId = id!
  const savedFloraStart = plant.floraStartDate

  function handleSubmit(values: PlantFormValues) {
    const [year, month, day] = values.startDate.split('-').map(Number)
    editPlant(plantId, {
      name:                values.name,
      genetics:            values.genetics,
      geneticType:         values.geneticType,
      sex:                 values.sex,
      startDate:           new Date(year, month - 1, day),
      floraStartDate:      savedFloraStart,   // preservar fecha de flora
      location:            values.location,
      growMedium:          values.growMedium,
      potCount:            values.potCount,
      potVolumeLiters:     values.potVolumeLiters,
      nutritionTableId:    values.nutritionTableId,
      autoFlowerTotalDays: values.autoFlowerTotalDays,
      availableProducts:   values.availableProducts,
      customProducts:      values.customProducts.length > 0 ? values.customProducts : undefined,
      notes:               values.notes || undefined,
    })
    navigate(`/plants/${plantId}`, { replace: true })
  }

  return (
    <div className="px-4 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-7">
        <Link
          to={`/plants/${id}`}
          className="w-9 h-9 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-ink-2 tap-highlight-none active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-1 leading-tight">{t('editPlant.title')}</h1>
          <p className="text-xs text-ink-3 mt-0.5 truncate max-w-[220px]">{plant.name}</p>
        </div>
      </div>

      {/* Aviso: cambiar fecha o tabla regenera el calendario */}
      <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          {t('editPlant.warning')}
        </p>
      </div>

      <PlantForm
        initialValues={initialValues}
        submitLabel={t('editPlant.save')}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
