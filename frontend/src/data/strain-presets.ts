import type { GeneticType } from '@/types/plant'

/**
 * Variedades reales con el ciclo que declara cada vendedor. Sirven para
 * precargar genetica, tipo y duracion del ciclo al crear una planta; todo
 * queda editable. Datos de ficha (vendedor/breeder), no mediciones propias.
 *
 * - `floraDays` de las autos = autoFlowerTotalDays - autoFloraStartDay: asi el
 *   cronograma de floracion termina el dia de cosecha de la ficha.
 * - `floraDays` de las fotoperiodicas = duracion de floracion de la ficha.
 *
 * Fuente completa y verificada: e2e/fixtures/strains.ts (hay un test que
 * exige que ambos archivos coincidan).
 */
export interface StrainPreset {
  id: string
  name: string
  breeder: string | null
  genetics: string
  geneticType: Extract<GeneticType, 'autoflower' | 'feminized'>
  /** Solo autoflorecientes. */
  autoFlowerTotalDays?: number
  /** Solo autoflorecientes. */
  autoFloraStartDay?: number
  floraDays: number
}

export const STRAIN_PRESETS: StrainPreset[] = [
  {
    id: 'auto-strawberry-soda',
    name: 'Auto Strawberry Soda',
    breeder: 'Dutch Passion',
    genetics: 'Strawberry Cough x Blue Auto Mazar',
    geneticType: 'autoflower',
    autoFlowerTotalDays: 75,
    autoFloraStartDay: 35,
    floraDays: 40,
  },
  {
    id: 'auto-critical-orange-punch',
    name: 'Auto Critical Orange Punch',
    breeder: 'Dutch Passion',
    genetics: 'Orange Punch x Auto Kritical Bilbo XXL',
    geneticType: 'autoflower',
    autoFlowerTotalDays: 75,
    autoFloraStartDay: 35,
    floraDays: 40,
  },
  {
    id: 'blue-applez',
    name: 'Blue Applez',
    breeder: null,
    genetics: 'Apples & Bananas x Purple OG Punch',
    geneticType: 'feminized',
    floraDays: 63,
  },
  {
    id: 'flat-white-auto',
    name: 'Flat White Auto',
    breeder: 'Mountain Seeds',
    genetics: 'Magnum x Girl Scout Cookies',
    geneticType: 'autoflower',
    autoFlowerTotalDays: 70,
    autoFloraStartDay: 35,
    floraDays: 35,
  },
  {
    id: 'citric-lime-pie',
    name: 'Citric Lime Pie',
    breeder: 'Mountain Seeds',
    genetics: 'Citric Latte x Gummy Buns',
    geneticType: 'feminized',
    floraDays: 65,
  },
  {
    id: 'therian-auto',
    name: 'Therian Auto',
    breeder: 'Mountain Seeds',
    genetics: 'Magnum x Flat White S1',
    geneticType: 'autoflower',
    autoFlowerTotalDays: 84,
    autoFloraStartDay: 35,
    floraDays: 49,
  },
]
