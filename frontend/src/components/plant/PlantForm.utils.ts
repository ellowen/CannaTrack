import type { CropType, GeneticType, PlantSex, ProductDose } from '@/types/plant'

export interface PlantFormValues {
  name: string
  cropType: CropType
  genetics: string
  geneticType?: GeneticType
  sex?: PlantSex
  startDate: string
  location: 'indoor' | 'outdoor'
  growMedium: 'soil' | 'coco' | 'hydro'
  potCount: number
  potVolumeLiters: number
  nutritionTableId: string
  autoFlowerTotalDays: number
  availableProducts: string[] | undefined
  customProducts: ProductDose[]
  notes: string
}

// Los campos cannabis-only (geneticType/sex) se ocultan en la UI para
// otros cultivos, pero el estado interno del formulario conserva su
// ultimo valor concreto (para no perder lo ya elegido si el usuario
// vuelve a cannabis). Antes de enviar el resultado hay que limpiarlos
// explicitamente -- de lo contrario se persiste un valor cannabis
// inventado (ej: geneticType: 'feminized') en una planta que nunca lo pidio.
//
// Al volver a cannabis geneticType/sex pueden seguir en `undefined` (una
// planta que nunca fue cannabis, o que perdio el valor al pasar por un
// cultivo sin esos campos) aunque el ToggleGroup ya muestre "Feminizada"
// seleccionado -- ese fallback visual (`value={values.geneticType ?? 'feminized'}`)
// no escribe de vuelta al estado hasta que el usuario toca el control. Sin
// el `?? 'feminized'` aca, cannabis quedaria enviando geneticType:undefined
// y violaria el CHECK plants_cannabis_requires_genetic_type en Supabase.
export function normalizeFormValuesForSubmit(values: PlantFormValues): PlantFormValues {
  const isCannabis = values.cropType === 'cannabis'
  return {
    ...values,
    geneticType: isCannabis ? (values.geneticType ?? 'feminized') : undefined,
    sex: isCannabis ? (values.sex ?? 'unknown') : undefined,
  }
}
