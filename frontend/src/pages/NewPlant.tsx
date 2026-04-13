import { useNavigate, Link } from 'react-router-dom'
import { usePlants } from '@/hooks/usePlants'
import { PlantForm } from '@/components/plant'
import type { PlantFormValues } from '@/components/plant'

export default function NewPlant() {
  const navigate = useNavigate()
  const { addPlant } = usePlants()

  function handleSubmit(values: PlantFormValues) {
    const [year, month, day] = values.startDate.split('-').map(Number)
    const plant = addPlant({
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
      status: 'active',
      notes: values.notes || undefined,
    })
    navigate(`/plants/${plant.id}`)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nueva planta</h1>
      </div>
      <PlantForm onSubmit={handleSubmit} />
    </div>
  )
}
