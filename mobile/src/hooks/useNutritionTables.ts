import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { NutritionTable, NutritionLine, ProductDose, NutritionWeek, PlantStage } from '@shared/types/plant'

export function useNutritionTables() {
  const [tables, setTables] = useState<NutritionTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: tablesData, error: tableError } = await supabase
        .from('nutrition_tables')
        .select('*')

      if (tableError) throw tableError

      // Cargar TODAS las líneas, semanas y productos de una sola vez
      const { data: allLines } = await supabase.from('nutrition_lines').select('*')
      const { data: allWeeks } = await supabase.from('nutrition_weeks').select('*')
      const { data: allProducts } = await supabase.from('nutrition_products').select('*')

      const enriched: NutritionTable[] = []

      for (const t of tablesData ?? []) {
        const lines = (allLines ?? []).filter((l: Record<string, unknown>) => l.table_id === t.id)
        const weeks = (allWeeks ?? []).filter((w: Record<string, unknown>) => w.table_id === t.id)
        const products = (allProducts ?? []).filter((p: Record<string, unknown>) => {
          // Producto pertenece a esta tabla si su week_id está en una semana de esta tabla
          return weeks.some((w: Record<string, unknown>) => w.id === p.week_id)
        })

        const parsedLines: NutritionLine[] = lines.map((l: Record<string, unknown>) => ({
          id: l.line_code as string,
          name: l.line_name as string,
          colorClass: l.color_class ?? ''
        }))

        const vegeWeeks: NutritionWeek[] = weeks
          .filter((w: Record<string, unknown>) => w.cycle === 'vege')
          .map((w: Record<string, unknown>) => ({
            cycle: 'vege' as const,
            week: w.week as number,
            stage: w.stage as any as PlantStage,
            dayStart: w.day_start as number,
            dayEnd: w.day_end as number,
            ecMin: (w.ec_min as number) ?? 0,
            ecMax: (w.ec_max as number) ?? 0,
            phMin: (w.ph_min as number) ?? 6,
            phMax: (w.ph_max as number) ?? 6,
            products: products
              .filter((p: Record<string, unknown>) => p.week_id === w.id)
              .map((p: Record<string, unknown>) => ({
                name: p.product_name as string,
                line: p.line_code as string,
                unit: p.unit as 'ml' | 'gr',
                minDose: parseFloat(p.min_dose as string),
                maxDose: parseFloat(p.max_dose as string)
              }))
          }))

        const floraWeeks: NutritionWeek[] = weeks
          .filter((w: Record<string, unknown>) => w.cycle === 'flora')
          .map((w: Record<string, unknown>) => ({
            cycle: 'flora' as const,
            week: w.week as number,
            stage: w.stage as any as PlantStage,
            dayStart: w.day_start as number,
            dayEnd: w.day_end as number,
            ecMin: (w.ec_min as number) ?? 0,
            ecMax: (w.ec_max as number) ?? 0,
            phMin: (w.ph_min as number) ?? 6,
            phMax: (w.ph_max as number) ?? 6,
            products: products
              .filter((p: Record<string, unknown>) => p.week_id === w.id)
              .map((p: Record<string, unknown>) => ({
                name: p.product_name as string,
                line: p.line_code as string,
                unit: p.unit as 'ml' | 'gr',
                minDose: parseFloat(p.min_dose as string),
                maxDose: parseFloat(p.max_dose as string)
              }))
          }))

        enriched.push({
          id: t.id as string,
          name: t.name as string,
          brandId: (t.brand_id as string) ?? null,
          isOfficial: t.is_official as boolean,
          accessTier: t.access_tier as 'free' | 'pro',
          geneticTypes: [],
          lines: parsedLines,
          vegeWeeks,
          floraWeeks,
          createdAt: new Date(t.created_at as string)
        })
      }

      setTables(enriched)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error cargando tablas nutricionales'
      setError(message)
      console.error('Error cargando tablas nutricionales:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  function getTableById(id: string): NutritionTable | undefined {
    return tables.find(t => t.id === id)
  }

  return { tables, loading, error, getTableById, refetch: fetch }
}
