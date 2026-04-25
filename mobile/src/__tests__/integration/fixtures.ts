/**
 * Test fixtures and mock data for integration tests
 */

import type { Plant, ScheduledTask, NutritionTable } from '@shared/types/plant'

export const MOCK_NUTRITION_TABLE: NutritionTable = {
  id: 'revegetar-test',
  name: 'Revegetar - Test Table',
  brandId: null,
  accessTier: 'free',
  isOfficial: true,
  geneticTypes: ['feminized', 'autoflower', 'regular'],
  lines: [
    { id: 'BIO', name: 'BIO', colorClass: 'bg-green-500 text-white' },
    { id: 'FUEL', name: 'FUEL', colorClass: 'bg-blue-500 text-white' },
  ],
  vegeWeeks: [
    {
      cycle: 'vege',
      week: 1,
      dayStart: 0,
      dayEnd: 7,
      stage: 'rooting',
      products: [
        { name: 'BIO Root', line: 'BIO', unit: 'ml', minDose: 0.5, maxDose: 1 },
      ],
      ecMin: 0.4,
      ecMax: 0.6,
      phMin: 5.5,
      phMax: 6.0,
    },
    {
      cycle: 'vege',
      week: 2,
      dayStart: 8,
      dayEnd: 14,
      stage: 'growth',
      products: [
        { name: 'BIO Grow', line: 'BIO', unit: 'ml', minDose: 1, maxDose: 1.5 },
      ],
      ecMin: 0.6,
      ecMax: 0.8,
      phMin: 5.5,
      phMax: 6.0,
    },
  ],
  floraWeeks: [
    {
      cycle: 'flora',
      week: 1,
      dayStart: 0,
      dayEnd: 14,
      stage: 'stretch',
      products: [
        { name: 'FUEL Stretch', line: 'FUEL', unit: 'ml', minDose: 1, maxDose: 1.5 },
      ],
      ecMin: 1.0,
      ecMax: 1.2,
      phMin: 6.0,
      phMax: 6.5,
    },
    {
      cycle: 'flora',
      week: 3,
      dayStart: 15,
      dayEnd: 28,
      stage: 'bulking',
      products: [
        { name: 'FUEL Bloom', line: 'FUEL', unit: 'ml', minDose: 1.5, maxDose: 2 },
      ],
      ecMin: 1.2,
      ecMax: 1.4,
      phMin: 6.0,
      phMax: 6.5,
    },
  ],
  createdAt: new Date('2026-01-01'),
}

export const createMockPlant = (overrides?: Partial<Plant>): Plant => {
  const now = new Date()
  return {
    id: `plant-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Plant',
    genetics: 'Test Genetics',
    geneticType: 'feminized',
    sex: 'unknown',
    startDate: now,
    location: 'indoor',
    potCount: 1,
    potVolumeLiters: 10,
    nutritionTableId: 'revegetar-test',
    status: 'active',
    ...overrides,
  }
}

export const createMockTask = (
  plantId: string,
  overrides?: Partial<ScheduledTask>
): ScheduledTask => {
  const now = new Date()
  return {
    id: `task-${Math.random().toString(36).slice(2, 9)}`,
    plantId,
    type: 'nutrition',
    scheduledDate: now,
    cycle: 'vege',
    week: 1,
    stage: 'rooting',
    products: [{ name: 'BIO Root', line: 'BIO', unit: 'ml', minDose: 0.5, maxDose: 1 }],
    ecMin: 0.4,
    ecMax: 0.6,
    phMin: 5.5,
    phMax: 6.0,
    completed: false,
    ...overrides,
  }
}

export const createFeminizedPlant = (overrides?: Partial<Plant>): Plant =>
  createMockPlant({ geneticType: 'feminized', ...overrides })

export const createAutoflowerPlant = (overrides?: Partial<Plant>): Plant =>
  createMockPlant({
    geneticType: 'autoflower',
    autoFlowerTotalDays: 75,
    ...overrides,
  })

export const createRegularPlant = (overrides?: Partial<Plant>): Plant =>
  createMockPlant({ geneticType: 'regular', sex: 'unknown', ...overrides })

/**
 * Creates multiple plants with staggered start dates for testing multi-plant workflows
 */
export const createMultiplePlantsFixture = () => {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  return {
    plant1: createFeminizedPlant({
      id: 'plant-feminized',
      name: 'Feminized Plant',
      startDate: twoWeeksAgo,
    }),
    plant2: createAutoflowerPlant({
      id: 'plant-autoflower',
      name: 'Autoflower Plant',
      startDate: oneWeekAgo,
    }),
    plant3: createRegularPlant({
      id: 'plant-regular',
      name: 'Regular Plant',
      startDate: now,
    }),
  }
}
