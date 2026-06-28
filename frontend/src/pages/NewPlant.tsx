import { useNavigate, Link } from 'react-router-dom'
import { usePlants } from '@/hooks/usePlants'
import { PlantForm } from '@/components/plant'
import type { PlantFormValues } from '@/components/plant'
import { hapticSuccess } from '@/lib/haptics'

export default function NewPlant() {
  const navigate = useNavigate()
  const { addPlant } = usePlants()

  async function handleSubmit(values: PlantFormValues) {
    hapticSuccess()
    const [year, month, day] = values.startDate.split('-').map(Number)
    const plant = await addPlant({
      name: values.name,
      genetics: values.genetics,
      geneticType: values.geneticType,
      sex: values.sex,
      startDate: new Date(year, month - 1, day),
      location: values.location,
      potCount: values.potCount,
      potVolumeLiters: values.potVolumeLiters,
      nutritionTableId: values.nutritionTableId,
      autoFlowerTotalDays: values.autoFlowerTotalDays,
      availableProducts: values.availableProducts,
      customProducts: values.customProducts.length > 0 ? values.customProducts : undefined,
      status: 'active',
      notes: values.notes || undefined,
    })

    navigate(`/plants/${plant.id}`)
  }

  return (
    <div className="px-4 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-7">
        <Link
          to="/"
          className="w-9 h-9 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-ink-2 tap-highlight-none active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-1 leading-tight">Nueva planta</h1>
          <p className="text-xs text-ink-3 mt-0.5">Completá los datos para generar el calendario</p>
        </div>
      </div>

      <PlantForm onSubmit={handleSubmit} />
    </div>
  )
}
