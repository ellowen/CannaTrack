/* ============================================================================
 * NUTRITION LOOKUP — Búsqueda O(1) de semanas nutricionales
 * ============================================================================ */

import type { NutritionTable, NutritionWeek, CyclePhase } from "../types/domain";

/**
 * Índice de tablas nutricionales para búsqueda rápida
 */
export type NutritionIndex = Map<string, NutritionTable>;

/**
 * Clave compuesta para buscar una semana en la tabla
 * Formato: "tableId:cycle:week"
 */
type NutritionWeekKey = string;

/**
 * Cache de índices de semanas para búsqueda O(1)
 */
interface NutritionWeekIndex {
  vegeIndex: Map<NutritionWeekKey, NutritionWeek>;
  floraIndex: Map<NutritionWeekKey, NutritionWeek>;
}

/**
 * Crea un mapa de tablas nutricionales indexed por ID
 *
 * @param tables Array de tablas nutricionales
 * @returns Map<tableId, table> para búsqueda O(1)
 *
 * @example
 * const index = createNutritionIndex([REVEGETAR_TABLE])
 * const table = index.get('revegetar-official')
 */
export function createNutritionIndex(tables: NutritionTable[]): NutritionIndex {
  const index: NutritionIndex = new Map();
  for (const table of tables) {
    index.set(table.id, table);
  }
  return index;
}

/**
 * Crea un índice de semanas nutricionales para búsqueda O(1)
 *
 * @param table Tabla nutricional a indexar
 * @returns Índices de semanas vege y flora
 */
function createWeekIndex(table: NutritionTable): NutritionWeekIndex {
  const vegeIndex: Map<NutritionWeekKey, NutritionWeek> = new Map();
  const floraIndex: Map<NutritionWeekKey, NutritionWeek> = new Map();

  for (const week of table.vegeWeeks) {
    const key = `${table.id}:vege:${week.week}`;
    vegeIndex.set(key, week);
  }

  for (const week of table.floraWeeks) {
    const key = `${table.id}:flora:${week.week}`;
    floraIndex.set(key, week);
  }

  return { vegeIndex, floraIndex };
}

/**
 * Obtiene una semana nutricional de una tabla
 *
 * Búsqueda O(1) sin iterar. Si no existe, retorna undefined.
 *
 * @param tableIndex Mapa de tablas (creado con createNutritionIndex)
 * @param tableId ID de la tabla
 * @param cycle Fase del ciclo ('vege' o 'flora')
 * @param week Número de semana (0-indexed)
 * @returns NutritionWeek o undefined si no existe
 *
 * @throws Error si la tabla no existe en el índice
 *
 * @example
 * const index = createNutritionIndex([REVEGETAR_TABLE])
 * const week = getNutritionWeek(index, 'revegetar-official', 'vege', 0)
 * // => { cycle: 'vege', week: 0, stage: 'rooting', ... }
 */
export function getNutritionWeek(
  tableIndex: NutritionIndex,
  tableId: string,
  cycle: CyclePhase,
  week: number
): NutritionWeek | undefined {
  const table = tableIndex.get(tableId);
  if (!table) {
    throw new Error(`Nutrition table not found: ${tableId}`);
  }

  const weekIndex = createWeekIndex(table);
  const key: NutritionWeekKey = `${tableId}:${cycle}:${week}`;

  if (cycle === "vege") {
    return weekIndex.vegeIndex.get(key);
  } else {
    return weekIndex.floraIndex.get(key);
  }
}

/**
 * Valida que EC esté dentro del rango permitido
 *
 * @param ec Valor de EC a validar
 * @param ecMin Mínimo permitido
 * @param ecMax Máximo permitido
 * @returns true si EC está dentro del rango
 *
 * @example
 * isValidEC(0.5, 0.4, 0.6) // => true
 * isValidEC(0.7, 0.4, 0.6) // => false
 */
export function isValidEC(ec: number, ecMin: number, ecMax: number): boolean {
  return ec >= ecMin && ec <= ecMax;
}

/**
 * Valida que PH esté dentro del rango permitido
 *
 * @param ph Valor de PH a validar
 * @param phMin Mínimo permitido
 * @param phMax Máximo permitido
 * @returns true si PH está dentro del rango
 *
 * @example
 * isValidPH(5.8, 5.5, 6.0) // => true
 * isValidPH(6.1, 5.5, 6.0) // => false
 */
export function isValidPH(ph: number, phMin: number, phMax: number): boolean {
  return ph >= phMin && ph <= phMax;
}

/**
 * Valida EC y PH de una semana nutricional
 *
 * @param week Semana nutricional a validar
 * @param ec Valor de EC
 * @param ph Valor de PH
 * @returns Objeto con validaciones individuales
 *
 * @example
 * const validation = validateWeekMetrics(week, 0.5, 5.8)
 * if (validation.ec) console.log('EC dentro de rango')
 */
export function validateWeekMetrics(
  week: NutritionWeek,
  ec: number,
  ph: number
): { ec: boolean; ph: boolean } {
  return {
    ec: isValidEC(ec, week.ecMin, week.ecMax),
    ph: isValidPH(ph, week.phMin, week.phMax),
  };
}

/**
 * Obtiene rango de dosis de un producto en una semana
 *
 * @param week Semana nutricional
 * @param productName Nombre del producto
 * @returns Objeto con min/max dose o undefined si no existe
 *
 * @example
 * const dose = getDoseRange(week, 'Nutriente Base Vege')
 * // => { minDose: 2, maxDose: 3 }
 */
export function getDoseRange(week: NutritionWeek, productName: string) {
  const product = week.products.find((p) => p.name === productName);
  if (!product) return undefined;
  return { minDose: product.minDose, maxDose: product.maxDose };
}
