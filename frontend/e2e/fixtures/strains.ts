/**
 * Variedades reales para E2E (datos de ficha de cada vendedor).
 *
 * Fuente unica de verdad para sembrar plantas con datos reales en los specs.
 * Datos extraidos y verificados contra el HTML de cada pagina el 2026-10-25.
 *
 * Reglas del archivo:
 * - `null` = la pagina NO lo especifica. Nunca se inventa un dato.
 * - Los valores del vendedor van en `seller`/`facts`; lo que la app necesita
 *   para crear la planta va en `plant` (mapeo explicito, ver `derivedFrom`).
 * - Precios: cambian. Usar solo como dato de referencia, no para asserts.
 * - Los datos de Mountain Seeds son "orientativos" segun su propia ficha.
 */

export type StrainGeneticType = 'autoflower' | 'feminized'

export interface StrainFixture {
  /** Slug estable para ids de planta en tests (`e2e-<slug>`). */
  slug: string
  name: string
  /** Quien vende (la pagina). */
  seller: { name: string; url: string }
  /** Breeder segun la pagina; null si la pagina no lo dice. */
  breeder: string | null
  seedType: 'autofloreciente feminizada' | 'fotoperiodica feminizada'
  genetics: string
  parents: [string, string]
  dominance: 'indica' | 'sativa' | 'hibrida 50/50'
  /** Familia/linea declarada por la pagina. */
  family: string | null
  facts: {
    thcPercent: string
    thcNote: string | null
    cbdPercent: string | null
    /** Altura en cm. null = la pagina no da cifra. */
    heightCm: { indoor: string | null; outdoor: string | null }
    heightClass: string | null
    /** Ciclo completo semilla -> cosecha (autoflorecientes). */
    seedToHarvest: { indoor: string | null; outdoor: string | null }
    /** Floracion (fotoperiodicas). */
    floweringTime: string | null
    yield: { indoorGPerM2: string | null; outdoorGPerM2: string | null; outdoorGPerPlant: string | null }
    aroma: string
    effect: string | null
    resin: string | null
    difficulty: string | null
    climate: string | null
    pack: { units: number; priceArsPerSeed: number | null; priceArsPack: number; priceCheckedAt: string; priceNote: string | null }
  }
  /** Recomendaciones de cultivo que la pagina SI da (el resto no se especifica). */
  growAdvice: {
    light: string | null
    medium: string | null
    pots: string | null
    training: string | null
    humidity: string | null
    other: string[]
  }
  /** Datos que pide el modelo Plant de la app (frontend/src/types/plant.ts). */
  plant: {
    geneticType: StrainGeneticType
    /** Solo autoflorecientes. Ver derivedFrom. */
    autoFlowerTotalDays: number | null
    /** Solo fotoperiodicas: dias de floracion segun la ficha. */
    floweringDays: number | null
    location: 'indoor'
    growMedium: 'soil'
    potCount: number
    potVolumeLiters: number
    notes: string
    /** De donde sale cada numero de `plant` (para que nadie lo tome por dato del vendedor). */
    derivedFrom: string
  }
  /**
   * `daysAgo` utiles para sembrar la planta en etapas distintas. Derivados de
   * las reglas de la app (autos: floracion automatica desde el dia 35) y del
   * ciclo de la ficha. No son datos del vendedor.
   */
  checkpoints: { daysAgo: number[]; floraDaysAgo: number[] }
  sourceUrl: string
  fetchedAt: '2026-10-25'
}

export const STRAINS: StrainFixture[] = [
  {
    slug: 'auto-strawberry-soda',
    name: 'Auto Strawberry Soda',
    seller: { name: 'Dutch Passion Argentina', url: 'https://dutch-passion.ar' },
    breeder: 'Dutch Passion',
    seedType: 'autofloreciente feminizada',
    genetics: 'Strawberry Cough x Blue Auto Mazar',
    parents: ['Strawberry Cough', 'Blue Auto Mazar'],
    dominance: 'indica',
    family: 'Familia Blue',
    facts: {
      thcPercent: '15-20',
      thcNote: 'Categoria "Muy alto"; con condiciones perfectas puede promediar 20-22%',
      cbdPercent: null,
      heightCm: { indoor: null, outdoor: null },
      heightClass: 'Compacta (tamano pequeno o mediano segun fenotipo)',
      seedToHarvest: { indoor: '70-75 dias (10-11 semanas)', outdoor: 'puede alargarse 1-2 semanas segun clima' },
      floweringTime: null,
      yield: { indoorGPerM2: '450-500 (SOG experto: 500-600)', outdoorGPerM2: null, outdoorGPerPlant: '20-75 (clima favorable ~100; excepcional 125-150)' },
      aroma: 'Dulce y afrutado: frutilla, frutos rojos, gaseosa',
      effect: 'Hibrido, relajante y tranquilo, con componente mental euforico',
      resin: null,
      difficulty: 'Facil, apta para principiantes y expertos (sin categoria formal)',
      climate: 'Interior y exterior en climas secos y soleados',
      pack: { units: 3, priceArsPerSeed: 17475, priceArsPack: 52425, priceCheckedAt: '2026-10-25', priceNote: null },
    },
    growAdvice: {
      light: 'Interior: 18/6, 20/4 o 24/0',
      medium: 'Sustrato aireado; nutrientes organicos (Biotabs, Terra Aquatica)',
      pots: 'Macetas pequenas en SOG',
      training: 'No necesita entrenamiento; puede manicurarse como semibonsai',
      humidity: 'Menos de 50% durante la floracion; deshumidificador en interior',
      other: ['Evitar lluvia, rocio y frio en exterior'],
    },
    plant: {
      geneticType: 'autoflower',
      autoFlowerTotalDays: 75,
      floweringDays: null,
      location: 'indoor',
      growMedium: 'soil',
      potCount: 1,
      potVolumeLiters: 11,
      notes: 'Auto Strawberry Soda (Dutch Passion). Compacta, indica. Mantener humedad < 50% en flora.',
      derivedFrom: 'autoFlowerTotalDays=75: "75 dias (10-11 semanas) desde la semilla hasta la cosecha". potVolumeLiters=11: la pagina solo habla de "macetas pequenas"; valor tipico de la app (seed.ts).',
    },
    checkpoints: { daysAgo: [3, 20, 36, 68, 75], floraDaysAgo: [] },
    sourceUrl: 'https://dutch-passion.ar/semillas-de-cannabis/auto-strawberry-soda',
    fetchedAt: '2026-10-25',
  },
  {
    slug: 'auto-critical-orange-punch',
    name: 'Auto Critical Orange Punch',
    seller: { name: 'Dutch Passion Argentina', url: 'https://dutch-passion.ar' },
    breeder: 'Dutch Passion',
    seedType: 'autofloreciente feminizada',
    genetics: 'Orange Punch x Auto Kritical Bilbo XXL',
    parents: ['Orange Punch', 'Auto Kritical Bilbo XXL'],
    dominance: 'hibrida 50/50',
    family: null,
    facts: {
      thcPercent: '15-20',
      thcNote: 'Categoria "Muy alto"',
      cbdPercent: null,
      heightCm: { indoor: '70-100 (mejores condiciones: 100-125)', outdoor: null },
      heightClass: 'Media',
      seedToHarvest: { indoor: '~75 dias (ficha: 10-12 semanas)', outdoor: '85-90 dias (hasta 100 en fenotipos de mayor floracion)' },
      floweringTime: null,
      yield: { indoorGPerM2: '450-600 (>700 en condiciones optimas, requiere experiencia)', outdoorGPerM2: null, outdoorGPerPlant: null },
      aroma: 'Citrico (naranja, mandarina, limon), hachis afgano, a veces pino',
      effect: 'Euforico y energetico, varias horas; componente relajante secundario; puede aumentar el apetito',
      resin: null,
      difficulty: 'Facil, apta para primerizos',
      climate: 'Interior, exterior e invernadero; prefiere clima mediterraneo seco y soleado',
      pack: { units: 3, priceArsPerSeed: 12475, priceArsPack: 37425, priceCheckedAt: '2026-10-25', priceNote: null },
    },
    growAdvice: {
      light: 'Interior: 20 horas de luz al dia; lamparas potentes (LED)',
      medium: 'Hidroponia posible (RDWC/DWC con CO2)',
      pots: 'Minimo 30 L (hasta 50 L); germinar directo en la maceta o trasplantar justo tras germinar',
      training: 'SCROG, LST, poda apical, FIM, doblado, supercropping (la pagina tambien dice que SCROG no se recomienda por la complejidad de las autos)',
      humidity: null,
      other: ['Soporte para ramas hacia las semanas 9-10 (el peso de los cogollos las puede quebrar)', 'En exterior conviene techo para mantener las plantas secas al final'],
    },
    plant: {
      geneticType: 'autoflower',
      autoFlowerTotalDays: 75,
      floweringDays: null,
      location: 'indoor',
      growMedium: 'soil',
      potCount: 1,
      potVolumeLiters: 30,
      notes: 'Auto Critical Orange Punch (Dutch Passion). 50/50. Maceta >= 30 L. Soportar ramas en las ultimas semanas.',
      derivedFrom: 'autoFlowerTotalDays=75: "unos 75 dias desde la semilla hasta la cosecha" (indoor). potVolumeLiters=30: minimo recomendado por la pagina.',
    },
    checkpoints: { daysAgo: [3, 20, 36, 68, 75], floraDaysAgo: [] },
    sourceUrl: 'https://dutch-passion.ar/semillas-de-cannabis/auto-critical-orange-punch',
    fetchedAt: '2026-10-25',
  },
  {
    slug: 'blue-applez',
    name: 'Blue Applez',
    seller: { name: 'Dutch Passion Argentina', url: 'https://dutch-passion.ar' },
    breeder: null,
    seedType: 'fotoperiodica feminizada',
    genetics: 'Apples & Bananas x Purple OG Punch',
    parents: ['Apples & Bananas', 'Purple OG Punch'],
    dominance: 'indica',
    family: 'USA Special',
    facts: {
      thcPercent: '+20',
      thcNote: 'Ficha: "Extremadamente alto (+20%)"; la descripcion menciona "hasta el 25-30%"',
      cbdPercent: null,
      heightCm: { indoor: null, outdoor: null },
      heightClass: 'Media',
      seedToHarvest: { indoor: null, outdoor: null },
      floweringTime: '~9 semanas; la mayoria cosecha entre el dia 60 y el 70 de floracion segun fenotipo',
      yield: { indoorGPerM2: 'hasta 500 en condiciones optimas', outdoorGPerM2: null, outdoorGPerPlant: null },
      aroma: 'Manzana verde (Pink Lady) con notas cremosas, citricas y de menta; sabor cremoso, frutal, acido, dulce',
      effect: 'Hibrido: inicio lucido y edificante, luego efecto corporal indica relajante',
      resin: 'Cualidades "coloridas, potentes y resinosas" (Purple OG Punch)',
      difficulty: 'Facil, amigable para principiantes (sin categoria formal)',
      climate: 'Interior, exterior',
      pack: {
        units: 3,
        priceArsPerSeed: 17980,
        priceArsPack: 53940,
        priceCheckedAt: '2026-10-25',
        priceNote: 'La pagina muestra 22.475/17.980 por semilla y 67.425/53.940 el pack sin etiquetar; 17.980 y 53.940 son los vigentes (20% menos, y 3 x 17.980 = 53.940)',
      },
    },
    growAdvice: {
      light: null,
      medium: null,
      pots: null,
      training: 'Menciona tecnicas de entrenamiento y SOG para maxima eficiencia',
      humidity: null,
      other: ['Algunas plantas necesitan apoyo extra en la floracion tardia', 'Desarrolla colores en las etapas finales de floracion'],
    },
    plant: {
      geneticType: 'feminized',
      autoFlowerTotalDays: null,
      floweringDays: 63,
      location: 'indoor',
      growMedium: 'soil',
      potCount: 1,
      potVolumeLiters: 11,
      notes: 'Blue Applez (fotoperiodica). Floracion ~9 semanas. Dar soporte en flora tardia.',
      derivedFrom: 'floweringDays=63: "florece en aproximadamente 9 semanas" (9 x 7). La pagina tambien dice cosecha entre dia 60 y 70. potVolumeLiters=11: valor tipico de la app (la pagina no indica maceta).',
    },
    // floraDaysAgo: 0 = recien pasada a 12/12; 21 = semana 4; 56 = semana 9; 63 = fin segun ficha
    checkpoints: { daysAgo: [35, 49, 91, 98], floraDaysAgo: [0, 21, 56, 63] },
    sourceUrl: 'https://dutch-passion.ar/semillas-de-cannabis/blue-applez',
    fetchedAt: '2026-10-25',
  },
  {
    slug: 'flat-white-auto',
    name: 'Flat White Auto',
    seller: { name: 'Mountain Seeds', url: 'https://www.mountainseeds.com.ar' },
    breeder: 'Mountain Seeds',
    seedType: 'autofloreciente feminizada',
    genetics: 'Magnum x Girl Scout Cookies',
    parents: ['Magnum', 'Girl Scout Cookies'],
    dominance: 'sativa',
    family: null,
    facts: {
      thcPercent: '15',
      thcNote: 'Orientativo segun la ficha',
      cbdPercent: null,
      heightCm: { indoor: null, outdoor: null },
      heightClass: 'Estructura compacta y estable',
      seedToHarvest: { indoor: '9-10 semanas desde la germinacion (ciclo completo, no solo floracion)', outdoor: null },
      floweringTime: null,
      yield: { indoorGPerM2: '500', outdoorGPerM2: '600', outdoorGPerPlant: null },
      aroma: 'Tierra, especias, matices florales, frescura sutil. Terpenos: mirceno, cariofileno, linalool, terpinoleno (trazas)',
      effect: null,
      resin: 'Muy alta',
      difficulty: null,
      climate: null,
      pack: { units: 3, priceArsPerSeed: null, priceArsPack: 41000, priceCheckedAt: '2026-10-25', priceNote: null },
    },
    growAdvice: { light: null, medium: null, pots: null, training: null, humidity: null, other: ['Incluye Guia Digital de Cultivo (contenido no publicado en la pagina)'] },
    plant: {
      geneticType: 'autoflower',
      autoFlowerTotalDays: 70,
      floweringDays: null,
      location: 'indoor',
      growMedium: 'soil',
      potCount: 1,
      potVolumeLiters: 11,
      notes: 'Flat White Auto (Mountain Seeds). Ciclo rapido, compacta, resina muy alta.',
      derivedFrom: 'autoFlowerTotalDays=70: tope de "9-10 semanas" (10 x 7). Es ciclo completo desde la germinacion. potVolumeLiters=11: valor tipico de la app.',
    },
    checkpoints: { daysAgo: [3, 20, 36, 63, 70], floraDaysAgo: [] },
    sourceUrl: 'https://www.mountainseeds.com.ar/general/flat-white-auto-3-unidades',
    fetchedAt: '2026-10-25',
  },
  {
    slug: 'citric-lime-pie',
    name: 'Citric Lime Pie',
    seller: { name: 'Mountain Seeds', url: 'https://www.mountainseeds.com.ar' },
    breeder: 'Mountain Seeds',
    seedType: 'fotoperiodica feminizada',
    genetics: 'Citric Latte x Gummy Buns',
    parents: ['Citric Latte', 'Gummy Buns'],
    dominance: 'sativa',
    family: null,
    facts: {
      thcPercent: '28',
      thcNote: 'Orientativo segun la ficha',
      cbdPercent: '1',
      heightCm: { indoor: null, outdoor: null },
      heightClass: null,
      seedToHarvest: { indoor: null, outdoor: null },
      floweringTime: '65 dias',
      yield: { indoorGPerM2: '650', outdoorGPerM2: '720', outdoorGPerPlant: null },
      aroma: 'Cake cremoso, dulzor tipo Runtz, naranja intensa, fondo cremoso',
      effect: null,
      resin: null,
      difficulty: null,
      climate: null,
      pack: { units: 3, priceArsPerSeed: null, priceArsPack: 41000, priceCheckedAt: '2026-10-25', priceNote: null },
    },
    growAdvice: { light: null, medium: null, pots: null, training: null, humidity: null, other: ['Incluye Guia Digital de Cultivo (contenido no publicado en la pagina)'] },
    plant: {
      geneticType: 'feminized',
      autoFlowerTotalDays: null,
      floweringDays: 65,
      location: 'indoor',
      growMedium: 'soil',
      potCount: 1,
      potVolumeLiters: 11,
      notes: 'Citric Lime Pie (Mountain Seeds). Fotoperiodica, floracion 65 dias. THC 28% declarado.',
      derivedFrom: 'floweringDays=65: "Floracion: 65 dias" (dato directo de la ficha). potVolumeLiters=11: valor tipico de la app.',
    },
    checkpoints: { daysAgo: [35, 49, 91, 100], floraDaysAgo: [0, 21, 56, 65] },
    sourceUrl: 'https://www.mountainseeds.com.ar/general/citric-lime-pie-3-unidades',
    fetchedAt: '2026-10-25',
  },
  {
    slug: 'therian-auto',
    name: 'Therian Auto',
    seller: { name: 'Mountain Seeds', url: 'https://www.mountainseeds.com.ar' },
    breeder: 'Mountain Seeds',
    seedType: 'autofloreciente feminizada',
    genetics: 'Magnum x Flat White S1',
    parents: ['Magnum', 'Flat White S1'],
    dominance: 'sativa',
    family: null,
    facts: {
      thcPercent: '16',
      thcNote: 'Orientativo segun la ficha',
      cbdPercent: null,
      heightCm: { indoor: null, outdoor: null },
      heightClass: null,
      seedToHarvest: { indoor: '12 semanas desde la germinacion (ciclo completo)', outdoor: null },
      floweringTime: null,
      yield: { indoorGPerM2: '600', outdoorGPerM2: '700', outdoorGPerPlant: null },
      aroma: 'Pastel dulce, chocolate, nueces, limon, base kush intensa',
      effect: null,
      resin: 'Alta',
      difficulty: null,
      climate: null,
      pack: { units: 3, priceArsPerSeed: null, priceArsPack: 41000, priceCheckedAt: '2026-10-25', priceNote: null },
    },
    growAdvice: { light: null, medium: null, pots: null, training: null, humidity: null, other: ['Incluye Guia Digital de Cultivo (contenido no publicado en la pagina)'] },
    plant: {
      geneticType: 'autoflower',
      autoFlowerTotalDays: 84,
      floweringDays: null,
      location: 'indoor',
      growMedium: 'soil',
      potCount: 1,
      potVolumeLiters: 11,
      notes: 'Therian Auto (Mountain Seeds). Ciclo largo para auto (12 semanas), resina alta.',
      derivedFrom: 'autoFlowerTotalDays=84: "12 semanas desde la germinacion" (12 x 7). potVolumeLiters=11: valor tipico de la app.',
    },
    checkpoints: { daysAgo: [3, 20, 36, 77, 84], floraDaysAgo: [] },
    sourceUrl: 'https://www.mountainseeds.com.ar/general/therian-auto-3-unidades',
    fetchedAt: '2026-10-25',
  },
]

export const STRAIN_BY_SLUG: Record<string, StrainFixture> = Object.fromEntries(
  STRAINS.map((s) => [s.slug, s]),
)
