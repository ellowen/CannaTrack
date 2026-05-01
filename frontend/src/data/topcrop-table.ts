import type { NutritionTable } from '../types/plant'

/**
 * Tabla nutricional Top Crop.
 * Adaptada de la tabla oficial topcropfert.com al modelo CannaTrack
 * (vege variable + flora 8 semanas). Los rangos EC/pH son estimativos
 * y siguen las recomendaciones generales; Top Crop no los especifica
 * en la tabla pública.
 *
 * Líneas:
 *   PRO   -> Gama profesional (base nutritiva: TopVeg, Top Bloom, Top Mega)
 *   MID   -> Gama complementaria (estimulantes: Big One, Top Candy, Top Bud, Maprics)
 *   BASIC -> Gama básica (Deeper Underground, Top Auto)
 */
export const TOPCROP_TABLE: NutritionTable = {
  id: 'topcrop-v1',
  name: 'Top Crop — Tabla de Cultivo',
  brandId: 'topcrop',
  accessTier: 'pro',
  isOfficial: true,
  geneticTypes: ['feminized', 'autoflower', 'regular'],
  lines: [
    { id: 'PRO',   name: 'Pro',   colorClass: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-900/60' },
    { id: 'MID',   name: 'Medio', colorClass: 'text-pink-700 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-950/40 dark:border-pink-900/60' },
    { id: 'BASIC', name: 'Básica', colorClass: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900/60' },
  ],
  createdAt: new Date('2024-01-01'),
  notes: 'Dosis orientativas — consultá con tu proveedor. Las semanas de crecimiento son repetibles: si alargás vege, mantené la dosis de la última semana.',

  // ─── CICLO VEGETATIVO ───────────────────────────────────────────────────
  vegeWeeks: [
    {
      cycle: 'vege',
      week: 0,
      dayStart: 0,
      dayEnd: 7,
      stage: 'rooting',
      ecMin: 0.4,
      ecMax: 0.6,
      phMin: 5.5,
      phMax: 6.0,
      products: [
        { name: 'Deeper Underground', line: 'BASIC', unit: 'ml', minDose: 0.67, maxDose: 1.33 },
      ],
    },
    {
      cycle: 'vege',
      week: 1,
      dayStart: 7,
      dayEnd: 14,
      stage: 'rooting',
      ecMin: 0.4,
      ecMax: 0.6,
      phMin: 5.5,
      phMax: 6.0,
      products: [
        { name: 'Deeper Underground', line: 'BASIC', unit: 'ml', minDose: 0.67, maxDose: 1.33 },
      ],
    },
    {
      cycle: 'vege',
      week: 2,
      dayStart: 14,
      dayEnd: 21,
      stage: 'growth',
      ecMin: 0.6,
      ecMax: 0.8,
      phMin: 5.5,
      phMax: 6.0,
      products: [
        { name: 'TopVeg', line: 'PRO', unit: 'ml', minDose: 2, maxDose: 4 },
      ],
    },
    {
      cycle: 'vege',
      week: 3,
      dayStart: 21,
      dayEnd: 28,
      stage: 'growth',
      ecMin: 0.6,
      ecMax: 0.8,
      phMin: 5.5,
      phMax: 6.0,
      products: [
        { name: 'TopVeg',  line: 'PRO', unit: 'ml', minDose: 2,   maxDose: 4 },
        { name: 'Big One', line: 'MID', unit: 'ml', minDose: 2,   maxDose: 2 },
        { name: 'Maprics', line: 'MID', unit: 'ml', minDose: 0.5, maxDose: 0.5 },
      ],
    },
    {
      cycle: 'vege',
      week: 4,
      dayStart: 28,
      dayEnd: 35,
      stage: 'preflower',
      ecMin: 0.8,
      ecMax: 1.0,
      phMin: 5.5,
      phMax: 6.0,
      products: [
        { name: 'TopVeg',  line: 'PRO', unit: 'ml', minDose: 2,   maxDose: 4 },
        { name: 'Maprics', line: 'MID', unit: 'ml', minDose: 0.5, maxDose: 0.5 },
      ],
    },
    {
      cycle: 'vege',
      week: 5,
      dayStart: 35,
      dayEnd: 42,
      stage: 'preflower',
      ecMin: 0.8,
      ecMax: 1.0,
      phMin: 5.5,
      phMax: 6.0,
      products: [
        { name: 'TopVeg',  line: 'PRO', unit: 'ml', minDose: 2, maxDose: 4 },
        { name: 'Big One', line: 'MID', unit: 'ml', minDose: 2, maxDose: 2 },
      ],
    },
  ],

  // ─── CICLO FLORACIÓN ────────────────────────────────────────────────────
  floraWeeks: [
    {
      cycle: 'flora',
      week: 1,
      dayStart: 0,
      dayEnd: 7,
      stage: 'stretch',
      ecMin: 1.0,
      ecMax: 1.2,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Top Bloom', line: 'PRO', unit: 'ml', minDose: 2, maxDose: 4 },
        { name: 'Big One',   line: 'MID', unit: 'ml', minDose: 2, maxDose: 2 },
      ],
    },
    {
      cycle: 'flora',
      week: 2,
      dayStart: 7,
      dayEnd: 14,
      stage: 'stretch',
      ecMin: 1.0,
      ecMax: 1.2,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Top Bloom', line: 'PRO', unit: 'ml', minDose: 2, maxDose: 4 },
        { name: 'Top Candy', line: 'MID', unit: 'ml', minDose: 1, maxDose: 2 },
      ],
    },
    {
      cycle: 'flora',
      week: 3,
      dayStart: 14,
      dayEnd: 21,
      stage: 'bulking',
      ecMin: 1.2,
      ecMax: 1.4,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Top Bloom', line: 'PRO', unit: 'ml', minDose: 2, maxDose: 4 },
        { name: 'Big One',   line: 'MID', unit: 'ml', minDose: 2, maxDose: 2 },
        { name: 'Top Candy', line: 'MID', unit: 'ml', minDose: 1, maxDose: 2 },
      ],
    },
    {
      cycle: 'flora',
      week: 4,
      dayStart: 21,
      dayEnd: 28,
      stage: 'bulking',
      ecMin: 1.2,
      ecMax: 1.4,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Top Bloom', line: 'PRO', unit: 'ml', minDose: 2,   maxDose: 4   },
        { name: 'Top Candy', line: 'MID', unit: 'ml', minDose: 1,   maxDose: 2   },
        { name: 'Maprics',   line: 'MID', unit: 'ml', minDose: 0.5, maxDose: 0.5 },
        { name: 'Top Bud',   line: 'MID', unit: 'ml', minDose: 0.5, maxDose: 1   },
      ],
    },
    {
      cycle: 'flora',
      week: 5,
      dayStart: 28,
      dayEnd: 35,
      stage: 'ripening',
      ecMin: 1.4,
      ecMax: 1.6,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Big One',   line: 'MID', unit: 'ml', minDose: 2,   maxDose: 2 },
        { name: 'Top Candy', line: 'MID', unit: 'ml', minDose: 1,   maxDose: 2 },
        { name: 'Top Bud',   line: 'MID', unit: 'ml', minDose: 0.5, maxDose: 1 },
      ],
    },
    {
      cycle: 'flora',
      week: 6,
      dayStart: 35,
      dayEnd: 42,
      stage: 'ripening',
      ecMin: 1.4,
      ecMax: 1.6,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Top Bud', line: 'MID', unit: 'ml', minDose: 0.5, maxDose: 1 },
        { name: 'Big One', line: 'MID', unit: 'ml', minDose: 2,   maxDose: 2 },
      ],
    },
    {
      cycle: 'flora',
      week: 7,
      dayStart: 42,
      dayEnd: 49,
      stage: 'flushing',
      ecMin: 0.0,
      ecMax: 0.4,
      phMin: 6.0,
      phMax: 6.5,
      products: [
        { name: 'Top Mega', line: 'PRO', unit: 'ml', minDose: 2, maxDose: 2 },
      ],
    },
    {
      cycle: 'flora',
      week: 8,
      dayStart: 49,
      dayEnd: 56,
      stage: 'flushing',
      ecMin: 0.0,
      ecMax: 0.4,
      phMin: 6.0,
      phMax: 6.5,
      products: [], // Solo agua base
    },
  ],
}
