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
  /** Duracion de floracion en dias. undefined = por defecto (56). */
  floraDays?: number
  /** Autos: dia de entrada en floracion. undefined = por defecto (35). */
  autoFloraStartDay?: number
  /** Fotoperiodicas: duracion del vegetativo en dias. undefined = por defecto (42). */
  vegeDays?: number
  /** Riegos por semana (1-7). undefined = patron por defecto (2). */
  irrigationPerWeek?: number
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
    // El ciclo de floracion es biologia de cannabis; el dia de floracion
    // automatica solo aplica a autoflorecientes.
    floraDays: isCannabis ? values.floraDays : undefined,
    autoFloraStartDay:
      isCannabis && (values.geneticType ?? 'feminized') === 'autoflower' ? values.autoFloraStartDay : undefined,
    // las autos florecen solas (autoFloraStartDay): no tienen un vegetativo configurable
    vegeDays: isCannabis && (values.geneticType ?? 'feminized') !== 'autoflower' ? values.vegeDays : undefined,
    irrigationPerWeek: isCannabis ? values.irrigationPerWeek : undefined,
  }
}
